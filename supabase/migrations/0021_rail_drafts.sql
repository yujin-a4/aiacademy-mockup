-- 0021: 레일 드래프트 격리 장치 — docs/rail-editor-plan.md STEP 1
--
-- ── 무엇을 하나 ──────────────────────────────────────────────────
-- 콘텐츠팀이 스캐폴딩 단계를 직접 짜볼 수 있게 하되, **지금 돌아가는 레일은 한 행도 안 건드린다.**
-- 그 격리를 코드가 아니라 **스키마와 뷰**로 보장한다.
--
--   type_rails.draft_id = null        →  정본. 지금 650행. 학생 화면이 보는 것
--   type_rails.draft_id = 'kim-0729'  →  드래프트. 편집기가 만드는 사본
--
-- 핵심은 **뷰에 `where draft_id is null` 을 박는 것**이다.
-- 이러면 화면 코드를 안 믿어도 되고, 편집기에 버그가 있어도 드래프트가 학생에게 샐 경로가 없다.
--
-- ── 왜 instructor_code 에 'sandbox' 를 넣지 않았나 (기각 사유) ────
--   (1) tutorAgentFor() 는 매칭 실패 시 조용히 기본 에이전트로 떨어진다(instructorData.ts:76).
--       → 레일을 평가하려고 열었는데 **강사 목소리가 다른 사람이 된다.**
--   (2) 어느 강사 레일에서 갈라져 나온 건지 알 수 없어진다.
--   그래서 축을 분리한다 — instructor_code 는 강사(목소리), draft_id 는 레일 네임스페이스.
--
-- ── 안전성 ───────────────────────────────────────────────────────
--   · 컬럼은 default null 이라 기존 650행이 **자동으로 정본**이 된다. UPDATE 없음.
--   · 적용 전 기준선: v_lecture_program 1733행 md5 7e93cdeefff09f06ce719605b5f1c59e
--                     type_rails         650행 md5 c9c3d11ca033bcd2cdc67f0ed530d5e5
--     적용 후 두 값이 그대로여야 한다.
--
-- 뷰는 0020 과 같고 **draft_id 필터 두 줄만** 더해진다.

begin;

-- =========================================================
-- (A) type_rails.draft_id — 정본/드래프트 구분
-- =========================================================
alter table type_rails add column if not exists draft_id text default null;

comment on column type_rails.draft_id is
  'null = 정본(학생 화면이 보는 것). 값이 있으면 레일 편집기의 드래프트. '
  'v_lecture_program 이 draft_id is null 만 내주므로 드래프트는 학생 화면에 절대 안 나온다. '
  '승격은 draft_id=null + version+1 로 새로 INSERT (기존 행은 지우지 않는다).';

-- 드래프트 조회는 (draft_id, 유형, 강사, 단계) 로 들어온다
create index if not exists type_rails_draft_idx
  on type_rails (draft_id, question_type_id, instructor_code, step_order);

-- 정본 조회 경로는 draft_id 가 null 인 것만 본다 — 부분 인덱스로 정본 조회를 가볍게
create index if not exists type_rails_live_idx
  on type_rails (question_type_id, instructor_code, version, step_order)
  where draft_id is null;

-- =========================================================
-- (B) rail_drafts — 드래프트 목록·메타
-- =========================================================
create table if not exists rail_drafts (
  draft_id        text primary key,          -- 'kim-0729' 처럼 사람이 읽는 이름
  title           text not null,
  base_instructor text not null,             -- 어느 강사 레일에서 복사해 왔나
  note            text,
  created_by      text,
  created_at      timestamptz not null default now(),
  promoted_at     timestamptz                -- 승격되면 기록. null 이면 작업 중
);

comment on table rail_drafts is
  '레일 편집기 드래프트 목록. 실제 단계는 type_rails 에 draft_id 로 들어간다. '
  '드래프트는 정본 레일을 통째로 복사해서 시작한다(빈 상태가 아니다).';

-- =========================================================
-- (C) 권한 — 0012·0016 과 같은 방침: 브라우저는 읽기만
-- =========================================================
alter table rail_drafts enable row level security;
drop policy if exists "read for all" on rail_drafts;
create policy "read for all" on rail_drafts for select using (true);

revoke insert, update, delete, truncate on rail_drafts from anon, authenticated;
grant select on rail_drafts to anon, authenticated;

-- type_rails 의 권한은 그대로 둔다 (0016:139 에서 이미 브라우저 쓰기가 막혀 있다).
-- 편집기의 쓰기는 서버 라우트(/api/rail-draft)만 할 수 있다 — 쓰기 길목이 하나라
-- 거기서 "draft_id 가 비면 거부"(계획서 R4)를 강제할 수 있다.

-- =========================================================
-- (D) 뷰 — 정본만 내준다 (격리의 핵심)
-- =========================================================
drop view if exists v_lecture_program;

create view v_lecture_program as
with rail_latest as (
  select tr.question_type_id, tr.instructor_code, max(tr.version) as version
    from type_rails tr
   where tr.draft_id is null                       -- ★ 0021: 정본만
   group by tr.question_type_id, tr.instructor_code
),
rail_type as (
  select tr.question_type_id, tr.instructor_code, tr.step_order,
         coalesce(tr.step_label, v.name, '')                    as step_code,
         i.label                                                as interaction,
         tr.audio_mode, tr.script_mode,
         coalesce(tr.student_prompt_override,  v.student_prompt,  tr.student_prompt_seed)  as student_prompt,
         coalesce(tr.tutor_directive_override, v.tutor_directive, tr.tutor_directive_seed) as tutor_directive,
         null::text as section, null::text as fixed_rule, null::text as db_fields,
         v.code     as variant_code,
         v.id       as variant_id,
         'type_rails'::text as rail_source
    from type_rails tr
    join rail_latest rl
      on rl.question_type_id = tr.question_type_id
     and rl.instructor_code  = tr.instructor_code
     and rl.version          = tr.version
    left join step_variants v on v.id = tr.variant_id
    left join interactions  i on i.code = v.interaction_code
   where tr.draft_id is null                       -- ★ 0021: 같은 version 의 드래프트 행이 섞이지 않게
),
rail_lecture as (
  select ls.lecture_id, ls.instructor_code, ls.step_order,
         ls.step_code, ls.interaction, ls.audio_mode, ls.script_mode,
         ls.student_prompt, ls.free_expression as tutor_directive,
         ls.section, ls.fixed_rule, ls.db_fields,
         null::text   as variant_code,
         null::bigint as variant_id,
         'lecture_steps'::text as rail_source
    from lecture_steps ls
),
items as (
  select li.*,
         row_number() over (
           partition by li.lecture_id, li.phase, li.question_type_id order by li.seq) as occurrence
    from lecture_items li
),
resolved as (
  select li.id as item_id, li.lecture_id, li.phase, li.seq, li.question_type_id, li.passage_id,
         li.occurrence,
         r.instructor_code, r.step_order, r.step_code, r.interaction,
         r.audio_mode, r.script_mode, r.student_prompt, r.tutor_directive,
         r.section, r.fixed_rule, r.db_fields, r.variant_code, r.variant_id, r.rail_source
    from items li
    join rail_type r on r.question_type_id = li.question_type_id
  union all
  select li.id, li.lecture_id, li.phase, li.seq, li.question_type_id, li.passage_id,
         li.occurrence,
         r.instructor_code, r.step_order, r.step_code, r.interaction,
         r.audio_mode, r.script_mode, r.student_prompt, r.tutor_directive,
         r.section, r.fixed_rule, r.db_fields, r.variant_code, r.variant_id, r.rail_source
    from items li
    join rail_lecture r on r.lecture_id = li.lecture_id
   where not exists (
     select 1 from rail_type t
      where t.question_type_id = li.question_type_id
        and t.instructor_code = r.instructor_code)
)
select
  l.lecture_code,
  l.part,
  x.phase,
  x.seq                as item_seq,
  x.item_id,
  x.question_type_id,
  qt.type_code,
  x.passage_id,
  x.occurrence,
  x.instructor_code,
  x.step_order,
  x.step_code,
  x.interaction,
  x.audio_mode,
  x.script_mode,
  x.student_prompt,
  x.tutor_directive,
  x.section,
  x.fixed_rule,
  x.db_fields,
  x.variant_code,
  x.variant_id,
  x.rail_source,
  (select json_agg(json_build_object(
            'question_id',   q.id,
            'question_code', q.question_code,
            'sub_order',     iq.sub_order) order by iq.sub_order)
     from item_questions iq join questions q on q.id = iq.question_id
    where iq.item_id = x.item_id) as questions
from resolved x
join lectures l           on l.id  = x.lecture_id
left join question_types qt on qt.id = x.question_type_id;

comment on view v_lecture_program is
  '강의 하나의 전체 진행표 = 아이템 × 레일. 화면은 이것만 본다. '
  '레일 원천: type_rails(유형 단위, Part 1·5·6·7) → 없으면 lecture_steps(강의별, LC). '
  '버전은 (유형,강사)별 최신 한 벌을 통째로 고른다(0020). '
  '**정본(draft_id is null)만 내준다(0021)** — 편집기 드래프트는 여기로 절대 안 나온다.';

grant select on v_lecture_program to anon, authenticated;

commit;
