-- 0020: 레일 버전을 "단계 칸마다"가 아니라 "레일 통째로" 고르게 — docs/rail-editor-plan.md STEP 0
--
-- ── 문제 (실측 2026-07-29) ──────────────────────────────────────
-- 0017~0019 의 rail_type CTE 는 이렇게 생겼다.
--     select distinct on (tr.question_type_id, tr.instructor_code, tr.step_order) ...
--      order by ..., tr.version desc
-- 버전을 **step_order 칸마다 따로** 고른다. 그래서 새 버전의 단계 수가 줄면
-- 새 버전에 없는 칸은 **옛 버전 것이 그대로 딸려 나온다.**
--
--   예) v1 = 7단계, v2 = 5단계(6·7번을 지웠다)
--       → 화면에는 1~5(v2) + 6·7(v1) = 7단계가 뜬다. **삭제가 반영되지 않는다.**
--
-- 지금 데이터에서는 드러나지 않는다 — 45개 (유형,강사) 조합 전부 v1·v2 의 단계 구성이 같아서다
-- (build-type-rails.js 가 매번 전량 재생성하므로). 하지만 레일 편집기에서 콘텐츠팀이
-- **단계를 지우는 순간** 조용히 틀린 결과가 나온다. 편집기보다 이걸 먼저 고치는 이유다.
--
-- ── 고치는 법 ────────────────────────────────────────────────────
-- (유형, 강사)별 최신 버전을 **먼저 하나 정하고**, 그 버전의 모든 단계를 가져온다.
-- 이러면 버전이 레일 한 벌의 단위가 되어, 단계 삭제가 그대로 반영된다.
--
-- ── 안전성 (적용 전 실측) ────────────────────────────────────────
--   · 한 버전 안의 step_order 중복: 0건    → distinct on 을 걷어내도 행이 안 늘어난다
--   · v1 과 v2 의 단계 구성이 다른 조합: 0건 → 현재 데이터에서 결과가 바뀌지 않는다
--   · 기준선: v_lecture_program 1733행 md5 7e93cdeefff09f06ce719605b5f1c59e
--             type_rails         650행 md5 c9c3d11ca033bcd2cdc67f0ed530d5e5
--     적용 후 두 값이 그대로여야 한다.
--
-- 0019 와 같은 정의이고 **rail_type CTE 하나만** 바뀐다. 나머지는 그대로 옮겨 적은 것이다.
-- (뷰는 create or replace 로 컬럼 순서를 못 바꾸므로 관례대로 drop 후 재생성 — 데이터 손실 없음)

begin;

drop view if exists v_lecture_program;

create view v_lecture_program as
-- ★ 0020: (유형, 강사)별 최신 버전을 먼저 하나 정한다.
--   STEP 1(레일 편집기 드래프트)에서 여기에 `where draft_id is null` 이 붙는다 —
--   그래야 학생 화면이 드래프트를 구조적으로 볼 수 없다.
with rail_latest as (
  select tr.question_type_id, tr.instructor_code, max(tr.version) as version
    from type_rails tr
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
  '버전은 (유형,강사)별 최신 한 벌을 통째로 고른다(0020) — 단계 삭제가 반영되도록.';

grant select on v_lecture_program to anon, authenticated;

commit;
