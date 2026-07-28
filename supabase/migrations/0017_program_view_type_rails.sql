-- 0017: 진행표 뷰의 레일 원천을 type_rails 로 (STEP 5) — docs/db-restructure-plan.md §7 STEP 5
--
-- **이 파일이 0015에서 뷰를 미리 만들어 둔 이유다.**
-- 화면(src/data/db/lectureProgramStore.ts · /lecture/[code])은 이 커밋에서 한 줄도 안 바뀐다.
-- 뷰 안쪽의 rail CTE 만 갈아끼운다.
--
-- 레일 원천 우선순위
--   (1) type_rails      — 유형 단위. Part 1·5·6·7 이 여기로 왔다 (325행)
--   (2) rail_compositions — 옛 변종 조합(Part5 lee_doyun). type_rails 가 덮으므로 사실상 (1)에 밀린다
--   (3) lecture_steps   — 강의별 원본. **LC(P2·3·4)는 여기 남는다**
--
-- LC를 왜 안 접었나 (실측):
--   접으면서 값이 버려지는 자리 17곳이 전부 LC였다. LC의 음원 지시는 순수 진행 지시가 아니라
--   강의별 내용을 담고 있다 — "문의 목적·품목 근거가 명확하면 멈추고"(P3-01) vs
--   "수량·파손·누락·조건 정보가 나오면"(P3-05). 유형 하나로 접으면 그 내용이 사라진다.
--   계획서 §8의 "Part3·4 변종화 하지 말 것(D5 미결)" 판단이 실측으로 확인됐고, P2도 같았다.

begin;

create or replace view v_lecture_program as
with rail_type as (
  -- (1) 유형 단위 레일 — 최신 버전만
  select distinct on (tr.question_type_id, tr.instructor_code, tr.step_order)
         tr.question_type_id, tr.instructor_code, tr.step_order,
         -- 원문 단계명이 정본이다. 변종 이름은 원문이 없을 때만 (Qn 지목·의미 단서가 원문에 있다)
         coalesce(tr.step_label, v.name, '')                    as step_code,
         i.label                                                as interaction,
         tr.audio_mode, tr.script_mode,
         coalesce(tr.student_prompt_override,  v.student_prompt,  tr.student_prompt_seed)  as student_prompt,
         coalesce(tr.tutor_directive_override, v.tutor_directive, tr.tutor_directive_seed) as tutor_directive,
         null::text as section, null::text as fixed_rule, null::text as db_fields,
         v.code     as variant_code,
         'type_rails'::text as rail_source
    from type_rails tr
    left join step_variants v on v.id = tr.variant_id
    left join interactions  i on i.code = v.interaction_code
   order by tr.question_type_id, tr.instructor_code, tr.step_order, tr.version desc
),
rail_lecture as (
  -- (3) 강의별 원본 — 아직 안 접은 것 (LC)
  select ls.lecture_id, ls.instructor_code, ls.step_order,
         ls.step_code, ls.interaction, ls.audio_mode, ls.script_mode,
         ls.student_prompt, ls.free_expression as tutor_directive,
         ls.section, ls.fixed_rule, ls.db_fields,
         null::text as variant_code,
         'lecture_steps'::text as rail_source
    from lecture_steps ls
),
items as (
  -- 회차는 레일을 조인하기 전에 센다 (조인 뒤에 세면 레일 턴 수만큼 부풀어 63 같은 값이 된다)
  select li.*,
         row_number() over (
           partition by li.lecture_id, li.phase, li.question_type_id order by li.seq) as occurrence
    from lecture_items li
),
-- 아이템마다 레일을 고른다: 유형 레일이 있으면 그것, 없으면 강의별 원본
resolved as (
  select li.id as item_id, li.lecture_id, li.phase, li.seq, li.question_type_id, li.passage_id,
         li.occurrence,
         r.instructor_code, r.step_order, r.step_code, r.interaction,
         r.audio_mode, r.script_mode, r.student_prompt, r.tutor_directive,
         r.section, r.fixed_rule, r.db_fields, r.variant_code, r.rail_source
    from items li
    join rail_type r on r.question_type_id = li.question_type_id
  union all
  select li.id, li.lecture_id, li.phase, li.seq, li.question_type_id, li.passage_id,
         li.occurrence,
         r.instructor_code, r.step_order, r.step_code, r.interaction,
         r.audio_mode, r.script_mode, r.student_prompt, r.tutor_directive,
         r.section, r.fixed_rule, r.db_fields, r.variant_code, r.rail_source
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
