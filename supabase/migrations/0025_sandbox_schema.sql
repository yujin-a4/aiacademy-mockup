-- 0025: 스캐폴딩 실험용 sandbox 스키마 — docs/rail-editor-plan.md
--
-- ── 왜 스키마를 통째로 나누나 ────────────────────────────────────
-- 드래프트 방식(draft_id + 뷰 필터)은 **한 표씩** 격리한다. 그런데 콘텐츠팀이 하고 싶은 건
--   · 스캐폴딩 단계 추가·편집·삭제
--   · 변종(step_variants) 을 새로 만들어보기
--   · 그 변종들을 조합해 **문항 유형 자체를 새로 정의**해보기
-- 라서, 격리해야 할 표가 계속 늘어난다(step_variants·question_types·lecture_items…).
-- 게다가 그 표들은 전역 사전이라 draft_id 를 붙여도 UNIQUE 제약과 계속 부딪힌다
--   예) step_variants 의 UNIQUE (step_code, interaction_code) — 같은 조합을 둘 만들 수 없다
--
-- 스키마를 나누면 **격리 장치가 아예 필요 없다.** 물리적으로 분리돼 있어서
-- sandbox 안에서는 뭘 하든 public(정본)에 닿지 않는다. 가드도, draft_id 도, 뷰 필터도 없다.
--
-- ── 무엇을 복제하고 무엇을 안 하나 ──────────────────────────────
-- 복제(자유 편집)  : step_types · interactions · step_variants · question_types
--                    type_rails · lecture_items · item_questions
-- 복제 안 함(참조) : lectures · questions · question_options · passages · passage_sentences
--   → 교재에서 뽑은 **내용**은 실험 대상이 아니다. 복제하면 동기화 부채만 생긴다.
--     sandbox 의 아이템은 public 의 문항을 그대로 가리킨다(교차 스키마 FK).
--
-- ── 되돌리기 ─────────────────────────────────────────────────────
--   select sandbox.reset();   ← public 기준으로 통째 초기화. 한 줄이다.
--
-- ※ id 기본값은 public 의 시퀀스를 그대로 쓴다(LIKE INCLUDING ALL).
--   sandbox 에 INSERT 하면 public 시퀀스가 같이 증가하지만 **id 가 겹치지 않아 오히려 안전**하고,
--   public 의 데이터에는 영향이 없다.

begin;

drop schema if exists sandbox cascade;
create schema sandbox;

-- ── 표 골격 복제 (컬럼·기본값·CHECK·인덱스까지) ──
create table sandbox.step_types     (like public.step_types     including all);
create table sandbox.interactions   (like public.interactions   including all);
create table sandbox.step_variants  (like public.step_variants  including all);
create table sandbox.question_types (like public.question_types including all);
create table sandbox.type_rails     (like public.type_rails     including all);
create table sandbox.lecture_items  (like public.lecture_items  including all);
create table sandbox.item_questions (like public.item_questions including all);

-- 실험을 막는 제약은 풀어준다 --------------------------------------------------
-- 같은 (단계 × 상호작용) 조합의 변종을 여러 개 만들어볼 수 있어야 한다.
alter table sandbox.step_variants drop constraint if exists step_variants_step_code_interaction_code_key;
-- 드래프트 개념이 없으므로 draft_id 도 필요 없다.
alter table sandbox.type_rails drop column if exists draft_id;

-- ── 관계 (sandbox 안에서 닫히는 것) ──
alter table sandbox.step_variants
  add foreign key (step_code)        references sandbox.step_types(code),
  add foreign key (interaction_code) references sandbox.interactions(code);
alter table sandbox.type_rails
  add foreign key (question_type_id) references sandbox.question_types(id) on delete cascade,
  add foreign key (variant_id)       references sandbox.step_variants(id);
alter table sandbox.lecture_items
  add foreign key (question_type_id) references sandbox.question_types(id);
alter table sandbox.item_questions
  add foreign key (item_id)          references sandbox.lecture_items(id) on delete cascade;

-- ── 관계 (public 을 참조하는 것 — 내용은 정본을 그대로 본다) ──
alter table sandbox.lecture_items
  add foreign key (lecture_id)  references public.lectures(id)  on delete cascade,
  add foreign key (passage_id)  references public.passages(id);
alter table sandbox.item_questions
  add foreign key (question_id) references public.questions(id) on delete cascade;

-- ── 초기화 함수 — public 기준으로 통째 리셋 ──
create or replace function sandbox.reset() returns text
language plpgsql as $$
declare n_rails int; n_items int;
begin
  -- 자식부터 비운다
  delete from sandbox.item_questions;
  delete from sandbox.lecture_items;
  delete from sandbox.type_rails;
  delete from sandbox.step_variants;
  delete from sandbox.question_types;
  delete from sandbox.interactions;
  delete from sandbox.step_types;

  insert into sandbox.step_types     select * from public.step_types;
  insert into sandbox.interactions   select * from public.interactions;
  insert into sandbox.step_variants  select * from public.step_variants;
  insert into sandbox.question_types select * from public.question_types;

  -- 정본의 **최신 버전만** 가져온다 (public 은 v1·v2 두 벌이 쌓여 있다)
  insert into sandbox.type_rails
    select tr.id, tr.question_type_id, tr.instructor_code, tr.version, tr.step_order, tr.variant_id,
           tr.audio_mode, tr.script_mode, tr.student_prompt_override, tr.student_prompt_seed,
           tr.source_lecture_code, tr.note, tr.step_label
      from public.type_rails tr
      join (select question_type_id, instructor_code, max(version) v
              from public.type_rails where draft_id is null group by 1,2) l
        on l.question_type_id = tr.question_type_id
       and l.instructor_code  = tr.instructor_code
       and l.v = tr.version
     where tr.draft_id is null;

  insert into sandbox.lecture_items  select * from public.lecture_items;
  insert into sandbox.item_questions select * from public.item_questions;

  select count(*) into n_rails from sandbox.type_rails;
  select count(*) into n_items from sandbox.lecture_items;
  return format('sandbox 초기화 — 레일 %s행 · 아이템 %s행', n_rails, n_items);
end $$;

-- ── 진행표 뷰 (public 의 v_lecture_program 과 같은 모양) ──
create view sandbox.v_lecture_program as
with rail_latest as (
  select tr.question_type_id, tr.instructor_code, max(tr.version) as version
    from sandbox.type_rails tr group by 1, 2
),
rail_type as (
  select tr.question_type_id, tr.instructor_code, tr.step_order,
         coalesce(tr.step_label, v.name, '')                    as step_code,
         i.label                                                as interaction,
         tr.audio_mode, tr.script_mode,
         coalesce(tr.student_prompt_override, v.student_prompt, tr.student_prompt_seed) as student_prompt,
         null::text as section, null::text as fixed_rule, null::text as db_fields,
         v.code as variant_code, v.id as variant_id,
         'type_rails'::text as rail_source
    from sandbox.type_rails tr
    join rail_latest rl
      on rl.question_type_id = tr.question_type_id
     and rl.instructor_code  = tr.instructor_code
     and rl.version          = tr.version
    left join sandbox.step_variants v on v.id = tr.variant_id
    left join sandbox.interactions  i on i.code = v.interaction_code
),
items as (
  select li.*,
         row_number() over (
           partition by li.lecture_id, li.phase, li.question_type_id order by li.seq) as occurrence
    from sandbox.lecture_items li
)
select
  l.lecture_code, l.part, li.phase, li.seq as item_seq, li.id as item_id,
  li.question_type_id, qt.type_code, li.passage_id, li.occurrence,
  r.instructor_code, r.step_order, r.step_code, r.interaction,
  r.audio_mode, r.script_mode, r.student_prompt,
  r.section, r.fixed_rule, r.db_fields, r.variant_code, r.variant_id, r.rail_source,
  (select json_agg(json_build_object(
            'question_id',   q.id,
            'question_code', q.question_code,
            'sub_order',     iq.sub_order) order by iq.sub_order)
     from sandbox.item_questions iq join public.questions q on q.id = iq.question_id
    where iq.item_id = li.id) as questions
from items li
join rail_type r            on r.question_type_id = li.question_type_id
join public.lectures l      on l.id  = li.lecture_id
left join sandbox.question_types qt on qt.id = li.question_type_id;

comment on schema sandbox is
  '스캐폴딩 실험장. public(정본)과 물리적으로 분리돼 있어 여기서는 뭘 하든 학생 화면에 안 닿는다. '
  '문항·지문·강의는 복제하지 않고 public 을 참조한다. 초기화: select sandbox.reset();';

-- 브라우저에는 열지 않는다 — 편집기는 서버 라우트(/api/sandbox)로만 접근한다
revoke all on schema sandbox from anon, authenticated;

commit;

-- 초기 적재
select sandbox.reset();
