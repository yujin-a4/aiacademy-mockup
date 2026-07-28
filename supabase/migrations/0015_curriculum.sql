-- 0015: 커리큘럼 구조 (STEP 4) — docs/db-restructure-plan.md §7 STEP 4
--
-- 문제: **레일 한 바퀴가 도는 단위가 DB에 없다.**
--   지금 화면은 강의의 앵커 문항(-Q001) 하나만 잡고 레일을 한 번 돌린다.
--   그래서 LC-P1-01 은 사진이 3장인데 1장만 수업하고 끝난다. RC-P5-08 도 문장 5개 중 1개만.
--   반대로 문항 수로 곱하면 Part6·7이 깨진다 — Part6 레일 11턴은 이미 빈칸 4개를 훑기 때문에
--   문항 수로 곱하면 44턴 = 4배 중복이 된다.
--   → 필요한 건 "문항"도 "강의"도 아닌 **아이템**(= 레일이 한 바퀴 도는 단위)이다.
--     P1·P2·P5 는 문항 1개, P3·P4·P6·P7 은 지문 1개.
--
-- 이 마이그레이션이 하는 일
--   (A) lectures.seq / is_demo   — 커리큘럼 순서와 데모용 강의 구분
--   (B) lecture_items            — 아이템. **강의가 늘 때 늘어나는 유일한 레일 관련 테이블**
--   (C) item_questions           — 아이템 안의 문항 (P6 지문 1개 : 빈칸 4문항)
--   (D) v_lecture_program        — 화면이 볼 단 하나의 진행표
--
-- ⚠️ phase 는 content->>'stage' 에서 온다. content 는 매일 크론이 시트에서 덮으므로
--    **jsonb 에서 stage 를 지우지 않는다**(지워도 새벽에 돌아온다).
--    계획서 §6은 "jsonb 탈출"이라고 썼지만, 실제로 가능한 건 "정본은 phase, jsonb는 잔존"이다.
--    시트 문항 탭에서 stage 열을 빼는 게 먼저다.

begin;

-- =========================================================
-- (A) lectures — 커리큘럼 순서 · 데모 구분
-- =========================================================
alter table lectures
  add column if not exists seq     smallint,
  add column if not exists is_demo boolean not null default false;

-- 제목이 'LC1강 — …' / 'RC17강 — …' 형태다. LC 16강 다음에 RC 26강이 온다 (합 42강)
update lectures
   set seq = case when lc_rc = 'LC' then m.n else 16 + m.n end
  from (select id, (regexp_match(title, '(?:LC|RC)(\d+)강'))[1]::smallint n from lectures) m
 where m.id = lectures.id and m.n is not null;

-- RC-P7-99 는 커리큘럼 강의가 아니라 데모 시뮬레이션용이다 (/part7-convai 가 쓴다)
update lectures set is_demo = true, seq = null where lecture_code = 'RC-P7-99';

comment on column lectures.seq is '커리큘럼 42강 순서. LC 1~16 → RC 17~42. 데모 강의는 null';

-- =========================================================
-- (B) 아이템 — 레일이 한 바퀴 도는 단위
-- =========================================================
create table if not exists lecture_items (
  id               bigserial primary key,
  lecture_id       bigint not null references lectures(id) on delete cascade,
  seq              smallint not null,
  question_type_id bigint references question_types(id),
  passage_id       bigint references passages(id),          -- 지문 단위 아이템(P3·P4·P6·P7)
  phase            text not null default 'lesson'
                     check (phase in ('lesson','practice')),
  unique (lecture_id, phase, seq)
);

comment on table lecture_items is
  '아이템 = 레일이 한 바퀴 도는 단위. P1·P2·P5는 문항 1개, P3·P4·P6·P7은 지문 1개. '
  '강의가 500개 늘어도 레일(type_rails) 행은 안 늘고 여기만 는다.';
comment on column lecture_items.phase is
  'lesson=수업 / practice=실전. content->>''stage'' 에서 도출한다(크론이 content를 덮으므로 원본은 시트).';

create table if not exists item_questions (
  item_id     bigint not null references lecture_items(id) on delete cascade,
  question_id bigint not null references questions(id) on delete cascade,
  sub_order   smallint not null,
  primary key (item_id, question_id)
);

create index if not exists lecture_items_lecture_idx on lecture_items (lecture_id, phase, seq);
create index if not exists item_questions_item_idx    on item_questions (item_id, sub_order);

-- =========================================================
-- (C) v_lecture_program — 화면이 보는 단 하나의 진행표
-- =========================================================
-- 계획서 §4의 정본 쿼리다. 다만 **레일 원천이 아직 type_rails 가 아니다**(STEP 5에서 생긴다).
-- 그래서 지금은 현행 원천 위에 얹는다:
--     rail_compositions(변종 조합) 우선 → 없으면 lecture_steps(강의별 원본)
-- STEP 5에서 바꿀 곳은 아래 `rail` CTE 하나뿐이고, 화면은 이 뷰만 보므로 안 바뀐다.
-- 그게 뷰를 지금 만드는 이유다.
--
-- ⚠️ 강사 폴백(전용 레일 없으면 common)은 뷰에 안 넣었다.
--    뷰는 있는 강사 행을 그대로 내보내고, 폴백은 화면(lectureStepStore)이 이미 하고 있다.
--    한 자리에서만 하는 게 맞고, 그 자리는 STEP 5에서 뷰로 옮긴다.
create or replace view v_lecture_program as
with rail as (
  -- (1) 변종 조합 — 지금은 Part5 lee_doyun 만 이식돼 있다
  select rc.lecture_id, rc.instructor_code, rc.step_order,
         rs.name                                                          as step_code,
         rs.interaction, rs.audio_mode, rs.script_mode,
         coalesce(rc.student_prompt_override,  rs.student_prompt,  rc.student_prompt_seed)  as student_prompt,
         coalesce(rc.tutor_directive_override, rs.tutor_directive, rc.tutor_directive_seed) as tutor_directive,
         null::text as section, null::text as fixed_rule, null::text as db_fields,
         rs.code    as variant_code,
         'composition'::text as rail_source
    from rail_compositions rc
    join rail_steps rs on rs.id = rc.rail_step_id
  union all
  -- (2) 강의별 원본 — 위에 이식본이 있는 (강의,강사)는 제외
  select ls.lecture_id, ls.instructor_code, ls.step_order,
         ls.step_code, ls.interaction, ls.audio_mode, ls.script_mode,
         ls.student_prompt, ls.free_expression as tutor_directive,
         ls.section, ls.fixed_rule, ls.db_fields,
         null::text as variant_code,
         'lecture_steps'::text as rail_source
    from lecture_steps ls
   where not exists (
     select 1 from rail_compositions rc
      where rc.lecture_id = ls.lecture_id and rc.instructor_code = ls.instructor_code)
),
items as (
  -- 회차는 **레일을 조인하기 전에** 센다. 조인 뒤에 세면 레일 턴 수만큼 부풀어서
  -- occurrence 가 63 같은 값이 된다 (실측으로 걸렀다).
  select li.*,
         row_number() over (
           partition by li.lecture_id, li.phase, li.question_type_id order by li.seq) as occurrence
    from lecture_items li
)
select
  l.lecture_code,
  l.part,
  li.phase,
  li.seq                                        as item_seq,
  li.id                                         as item_id,
  li.question_type_id,
  qt.type_code,
  li.passage_id,
  -- 회차: 같은 유형이 이 강의(같은 phase)에서 몇 번째로 나오는가. Fading 의 근거 (컬럼 아님, 계산값)
  li.occurrence,
  r.instructor_code,
  r.step_order,
  r.step_code,
  r.interaction,
  r.audio_mode,
  r.script_mode,
  r.student_prompt,
  r.tutor_directive,
  r.section,
  r.fixed_rule,
  r.db_fields,
  r.variant_code,
  r.rail_source,
  (select json_agg(json_build_object(
            'question_id',   q.id,
            'question_code', q.question_code,
            'sub_order',     iq.sub_order) order by iq.sub_order)
     from item_questions iq join questions q on q.id = iq.question_id
    where iq.item_id = li.id)                   as questions
from items li
join lectures l          on l.id  = li.lecture_id
left join question_types qt on qt.id = li.question_type_id
join rail r              on r.lecture_id = li.lecture_id;

comment on view v_lecture_program is
  '강의 하나의 전체 진행표 = 아이템 × 레일. 화면은 이것만 보고 원시 테이블을 모른다. '
  'STEP 5에서 rail CTE 를 type_rails 로 바꿔도 화면은 안 바뀐다.';

-- =========================================================
-- (D) RLS — 0012 방침과 동일
-- =========================================================
alter table lecture_items  enable row level security;
alter table item_questions enable row level security;

drop policy if exists "read for all" on lecture_items;
create policy "read for all" on lecture_items for select using (true);
drop policy if exists "read for all" on item_questions;
create policy "read for all" on item_questions for select using (true);

revoke insert, update, delete, truncate on lecture_items, item_questions from anon, authenticated;
grant select on lecture_items, item_questions to anon, authenticated;
grant select on v_lecture_program to anon, authenticated;

commit;
