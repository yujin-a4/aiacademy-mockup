-- 0023: 드래프트 진행표 뷰 — docs/rail-editor-plan.md STEP 2
--
-- ── 왜 뷰를 따로 두나 ────────────────────────────────────────────
-- 정본 뷰(v_lecture_program)는 `draft_id is null` 로 **드래프트를 구조적으로 차단**한다(0021).
-- 그 차단을 조건부로 풀면 격리가 무너진다 — 실수 한 번이면 학생 화면에 드래프트가 샌다.
-- 그래서 **읽는 쪽을 아예 다른 뷰로 나눈다.** 정본 뷰는 영원히 정본만 내준다.
--
-- ── 정본 뷰와 다른 점 세 가지 ────────────────────────────────────
--   (1) `draft_id is not null` 만 본다 (정확히 반대)
--   (2) `draft_id` 를 컬럼으로 내준다 → 클라이언트가 .eq('draft_id', 'kim-0729') 로 고른다
--       (뷰는 인자를 못 받으므로 컬럼으로 내주고 필터하게 하는 방식)
--   (3) **lecture_steps 폴백이 없다.** 드래프트는 정본 레일을 통째로 복사한 것이라
--       복사되지 않은 유형은 애초에 이 드래프트의 관심사가 아니다. 폴백을 넣으면
--       "내가 안 건드린 단계가 왜 나오지?" 라는 혼란만 생긴다.
--
-- 버전 해석은 정본과 같다 — (드래프트, 유형, 강사)별 최신 한 벌을 통째로(0020 과 같은 규칙).

begin;

drop view if exists v_lecture_program_draft;

create view v_lecture_program_draft as
with rail_latest as (
  select tr.draft_id, tr.question_type_id, tr.instructor_code, max(tr.version) as version
    from type_rails tr
   where tr.draft_id is not null                   -- ★ 드래프트만 (정본 뷰와 정확히 반대)
   group by tr.draft_id, tr.question_type_id, tr.instructor_code
),
rail_type as (
  select tr.draft_id, tr.question_type_id, tr.instructor_code, tr.step_order,
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
      on  rl.draft_id         = tr.draft_id
     and  rl.question_type_id = tr.question_type_id
     and  rl.instructor_code  = tr.instructor_code
     and  rl.version          = tr.version
    left join step_variants v on v.id = tr.variant_id
    left join interactions  i on i.code = v.interaction_code
   where tr.draft_id is not null
),
items as (
  select li.*,
         row_number() over (
           partition by li.lecture_id, li.phase, li.question_type_id order by li.seq) as occurrence
    from lecture_items li
)
select
  r.draft_id,
  l.lecture_code,
  l.part,
  li.phase,
  li.seq               as item_seq,
  li.id                as item_id,
  li.question_type_id,
  qt.type_code,
  li.passage_id,
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
  r.variant_id,
  r.rail_source,
  (select json_agg(json_build_object(
            'question_id',   q.id,
            'question_code', q.question_code,
            'sub_order',     iq.sub_order) order by iq.sub_order)
     from item_questions iq join questions q on q.id = iq.question_id
    where iq.item_id = li.id) as questions
from items li
join rail_type r          on r.question_type_id = li.question_type_id
join lectures l           on l.id  = li.lecture_id
left join question_types qt on qt.id = li.question_type_id;

comment on view v_lecture_program_draft is
  '레일 편집기 드래프트의 진행표. v_lecture_program 과 같은 컬럼 + draft_id. '
  '클라이언트가 draft_id 로 필터해서 한 드래프트만 본다. '
  'lecture_steps 폴백 없음 — 드래프트에 복사된 유형만 나온다.';

grant select on v_lecture_program_draft to anon, authenticated;

commit;
