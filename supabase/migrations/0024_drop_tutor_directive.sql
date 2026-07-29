-- 0024: 강사 발화 칸 제거 — docs/rail-editor-plan.md
--
-- ── 왜 지우나 ────────────────────────────────────────────────────
-- 강사 발화는 **DB에 없다.** 문항 사실 + 단계 지시를 받아 LLM 이 매번 만든다.
-- 그런데 시트 이관 때 넘어온 "강사 말투 예시" 가 컬럼에 남아 있었다.
--
--   type_rails.tutor_directive_seed        755행에 값 (그중 3행은 틀린 정답을 단정)
--   type_rails.tutor_directive_override      0행
--   step_variants.tutor_directive            0행
--
-- 아무도 안 읽는다(아래 실측). 그런데 레일 편집기에서 표를 보면 콘텐츠팀 눈에는
-- **"여기가 강사 대사구나"** 로 보인다. 열심히 써도 아무 일도 안 일어난다.
-- 죽은 칸을 남겨두는 비용이 지우는 비용보다 크다.
--
-- ── 아무도 안 읽는다는 근거 (2026-07-29 실측) ────────────────────
--   화면  : src/data/typeLearning/fromSteps.ts:269 — 이 값을 버리고 중립 문구를 쓴다
--   음성  : src/app/api/tutor/route.ts:291 — 프롬프트 주입 라인을 제거했다(같은 날)
--   생성  : src/data/typeLearning/railPrompts.ts:77 — seed 를 LLM 에 보내지 않는다
--           (보냈더니 다른 문항의 내용어가 새어 생성이 오염됐다)
--   ※ lecture_steps.free_expression 은 **다른 표**다. 이 마이그레이션과 무관하며 그대로 둔다.
--
-- ── 안 지우는 것 ─────────────────────────────────────────────────
--   student_prompt_seed / student_prompt_override / step_variants.student_prompt 는 **남긴다.**
--   학생에게 던지는 질문은 LLM 이 말투 참고로 쓰는 설계가 살아 있다.
--
-- ── 안전성 ───────────────────────────────────────────────────────
--   뷰에서 tutor_directive 컬럼이 사라진다 → lectureProgramStore 의 select 목록도 같이 고친다.
--   적용 전 기준선: v_lecture_program 1733행 (tutor_directive 제외 시 해시 불변이어야 한다)

begin;

-- 뷰가 컬럼을 참조하므로 먼저 내린다
drop view if exists v_lecture_program;
drop view if exists v_lecture_program_draft;

alter table type_rails    drop column if exists tutor_directive_seed;
alter table type_rails    drop column if exists tutor_directive_override;
alter table step_variants drop column if exists tutor_directive;

-- ── 정본 뷰 재생성 (0021 과 같고 tutor_directive 만 빠짐) ──
create view v_lecture_program as
with rail_latest as (
  select tr.question_type_id, tr.instructor_code, max(tr.version) as version
    from type_rails tr
   where tr.draft_id is null
   group by tr.question_type_id, tr.instructor_code
),
rail_type as (
  select tr.question_type_id, tr.instructor_code, tr.step_order,
         coalesce(tr.step_label, v.name, '')                    as step_code,
         i.label                                                as interaction,
         tr.audio_mode, tr.script_mode,
         coalesce(tr.student_prompt_override, v.student_prompt, tr.student_prompt_seed) as student_prompt,
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
   where tr.draft_id is null
),
rail_lecture as (
  select ls.lecture_id, ls.instructor_code, ls.step_order,
         ls.step_code, ls.interaction, ls.audio_mode, ls.script_mode,
         ls.student_prompt,
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
         r.audio_mode, r.script_mode, r.student_prompt,
         r.section, r.fixed_rule, r.db_fields, r.variant_code, r.variant_id, r.rail_source
    from items li
    join rail_type r on r.question_type_id = li.question_type_id
  union all
  select li.id, li.lecture_id, li.phase, li.seq, li.question_type_id, li.passage_id,
         li.occurrence,
         r.instructor_code, r.step_order, r.step_code, r.interaction,
         r.audio_mode, r.script_mode, r.student_prompt,
         r.section, r.fixed_rule, r.db_fields, r.variant_code, r.variant_id, r.rail_source
    from items li
    join rail_lecture r on r.lecture_id = li.lecture_id
   where not exists (
     select 1 from rail_type t
      where t.question_type_id = li.question_type_id
        and t.instructor_code = r.instructor_code)
)
select
  l.lecture_code, l.part, x.phase, x.seq as item_seq, x.item_id, x.question_type_id,
  qt.type_code, x.passage_id, x.occurrence, x.instructor_code, x.step_order, x.step_code,
  x.interaction, x.audio_mode, x.script_mode, x.student_prompt,
  x.section, x.fixed_rule, x.db_fields, x.variant_code, x.variant_id, x.rail_source,
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
  '버전은 (유형,강사)별 최신 한 벌을 통째로(0020). 정본(draft_id is null)만 내준다(0021). '
  '강사 발화 칸은 없다(0024) — 발화는 문항 사실을 보고 LLM 이 만든다.';

grant select on v_lecture_program to anon, authenticated;

-- ── 드래프트 뷰 재생성 (0023 과 같고 tutor_directive 만 빠짐) ──
create view v_lecture_program_draft as
with rail_latest as (
  select tr.draft_id, tr.question_type_id, tr.instructor_code, max(tr.version) as version
    from type_rails tr
   where tr.draft_id is not null
   group by tr.draft_id, tr.question_type_id, tr.instructor_code
),
rail_type as (
  select tr.draft_id, tr.question_type_id, tr.instructor_code, tr.step_order,
         coalesce(tr.step_label, v.name, '')                    as step_code,
         i.label                                                as interaction,
         tr.audio_mode, tr.script_mode,
         coalesce(tr.student_prompt_override, v.student_prompt, tr.student_prompt_seed) as student_prompt,
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
  r.draft_id, l.lecture_code, l.part, li.phase, li.seq as item_seq, li.id as item_id,
  li.question_type_id, qt.type_code, li.passage_id, li.occurrence,
  r.instructor_code, r.step_order, r.step_code, r.interaction,
  r.audio_mode, r.script_mode, r.student_prompt,
  r.section, r.fixed_rule, r.db_fields, r.variant_code, r.variant_id, r.rail_source,
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
  '레일 편집기 드래프트의 진행표. 클라이언트가 draft_id 로 필터한다. '
  'lecture_steps 폴백 없음. 강사 발화 칸 없음(0024).';

grant select on v_lecture_program_draft to anon, authenticated;

commit;
