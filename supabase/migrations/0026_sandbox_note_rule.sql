-- 0026: sandbox 진행표가 단계 설명(note)을 화면까지 나르게 — docs/rail-editor-plan.md
--
-- 시트 "스캐폴딩 입력"의 [설명] 열("제시된 사진 속 정보를 파악하게 한다")은
-- sandbox.type_rails.note 에 저장된다. 그런데 0025 의 뷰는 fixed_rule 을 null 로 내보내
-- 화면(레일 검토 패널)과 발화 생성이 이 설명을 못 봤다.
-- fixed_rule 자리로 note 를 내보내면 기존 배선(toStep → fixedRule)이 그대로 받는다.

begin;

create or replace view sandbox.v_lecture_program as
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
         null::text as section,
         tr.note    as fixed_rule,          -- ★ 0026: 시트 [설명] → 단계 규칙으로 노출
         null::text as db_fields,
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

commit;
