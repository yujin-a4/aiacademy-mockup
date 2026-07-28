-- 0019: 진행표 뷰에 variant_id 추가 (STEP 6) — docs/db-restructure-plan.md §7 STEP 6
--
-- 왜: STEP 6 의 완료 조건 쿼리가 이렇게 생겼다.
--       select v.step_code, e.occurrence, avg(e.is_correct::int)
--         from learning_events e join step_variants v on v.id = e.variant_id
--     즉 학습 로그가 **변종 id** 를 들고 있어야 한다. 뷰는 variant_code(텍스트)만 내주고 있었다.
--     화면이 코드→id 를 다시 조회하지 않게 뷰가 id 를 같이 준다.
--
-- 0017 과 같은 정의에 variant_id 한 칸만 더한 것이다. LC(lecture_steps 원천)는 변종이 안 붙으므로 null.

begin;

-- create or replace 는 **컬럼을 중간에 끼울 수 없다**(뒤에 붙이는 것만 된다).
-- variant_id 를 variant_code 옆에 두려고 drop 후 재생성한다. 뷰라서 데이터 손실은 없다.
drop view if exists v_lecture_program;

create view v_lecture_program as
with rail_type as (
  select distinct on (tr.question_type_id, tr.instructor_code, tr.step_order)
         tr.question_type_id, tr.instructor_code, tr.step_order,
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
    left join step_variants v on v.id = tr.variant_id
    left join interactions  i on i.code = v.interaction_code
   order by tr.question_type_id, tr.instructor_code, tr.step_order, tr.version desc
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
  '레일 원천: type_rails(유형 단위, Part 1·5·6·7) → 없으면 lecture_steps(강의별, LC).';

grant select on v_lecture_program to anon, authenticated;

commit;
