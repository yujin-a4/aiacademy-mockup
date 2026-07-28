-- 0016: 레일 통합 (STEP 5) — docs/db-restructure-plan.md §7 STEP 5
--
-- 문제: 레일이 **강의마다 한 벌씩** 있다.
--   lecture_steps 965행 = 강의 43 × 강사 3 × 턴 7~12.
--   강의가 500개로 늘면 레일도 500벌이 된다. 스캐폴딩을 한 군데서 고칠 수가 없다.
--
-- 실측(lee_doyun 42강, 0013 별칭표로 정규화한 "변종 순서" 기준):
--   42강 → **19벌**. 즉 강의별로 적어놨을 뿐 실제로는 19가지밖에 없다.
--   유형(question_types)은 17종이므로 유형 안에서 갈리는 곳이 **딱 2군데**다:
--     · RC-P5-02  1단계가 S1-mark 가 아니라 **S1-next** (나머지 7강과 다름)
--     · RC-P6-02  3단계가 S5-choice 가 아니라 **S5-next** (RC-P6-01과 다름)
--   → 그 둘을 별도 유형으로 떼면 유형 = 레일 이 정확히 1:1이 된다 (17 → 19).
--
-- 이 마이그레이션이 하는 일
--   (A) 유형 2종 추가 + 소속 강의 재배정 — "유형 = 레일이 같은 것들"이 실측과 맞게
--   (B) type_rails    — 레일의 소유자를 **강의 → 유형**으로. 여기가 965행을 걷어내는 자리
--   (C) rail_checks   — 채점·힌트·분기 (코드에 있던 TUTOR_RAILS 자리). §아래 주석의 진단 수정 참조
--
-- ⚠️ 이 파일은 **표만 만든다.** 값 이관은 scripts/build-type-rails.js,
--    화면 전환은 v_lecture_program 의 rail CTE 교체(0017)에서 한다. 지금은 아무것도 안 깨진다.

begin;

-- =========================================================
-- (A) 유형 19종 — 유형 = 레일
-- =========================================================
insert into question_types (part, type_code, name, description, lecture_codes) values
  (5, 'P5-STRUCTURE-FIRST-AI', '구조 먼저 · 단서 코칭형',
      'P5-STRUCTURE-FIRST 와 1단계만 다르다: 학생이 짚는 게 아니라(S1-mark) AI가 단서를 짚어준다(S1-next). '
      '"품사 구분·빈칸 자리 판별"이라 첫 강의에서 시범을 보이는 것으로 보인다 — 병합 후보(D6)',
      '{RC-P5-02}'),
  (6, 'P6-CLOZE-B', '장문 빈칸 · 첫 빈칸 시범형',
      'P6-CLOZE 와 3단계만 다르다: 첫 빈칸의 S5를 학생이 고르지 않고(S5-choice) AI가 연결해 보인다(S5-next). '
      '병합 후보(D6)',
      '{RC-P6-02}')
on conflict (type_code) do update
  set part = excluded.part, name = excluded.name,
      description = excluded.description, lecture_codes = excluded.lecture_codes;

-- 원래 유형에서 그 강의를 뺀다 (한 강의가 두 유형에 속하면 배정 트리거가 아무거나 고른다)
update question_types set lecture_codes = array_remove(lecture_codes, 'RC-P5-02')
 where type_code = 'P5-STRUCTURE-FIRST';
update question_types set lecture_codes = array_remove(lecture_codes, 'RC-P6-02')
 where type_code = 'P6-CLOZE';

-- 기존 문항 재배정
update questions q
   set question_type_id = t.id
  from lectures l, question_types t
 where l.id = q.lecture_id
   and l.lecture_code = any(t.lecture_codes)
   and q.question_type_id is distinct from t.id;

update lecture_items li
   set question_type_id = t.id
  from lectures l, question_types t
 where l.id = li.lecture_id
   and l.lecture_code = any(t.lecture_codes)
   and li.question_type_id is distinct from t.id;

-- =========================================================
-- (B) type_rails — 레일의 소유자가 강의가 아니라 유형
-- =========================================================
-- 강의가 500개 늘어도 이 표는 안 늘어난다. 그게 전부다.
create table if not exists type_rails (
  id               bigserial primary key,
  question_type_id bigint   not null references question_types(id) on delete cascade,
  instructor_code  text     not null references instructors(code),
  version          smallint not null default 1,          -- 실험은 append. 과거 로그가 어느 레일이었는지 남는다
  step_order       smallint not null,
  variant_id       bigint   references step_variants(id),-- 변종(단계 × 상호작용)
  -- ★ 레일 원문 단계명. 변종 이름으로 대체하면 안 된다 —
  --   여기에 **Qn 지목**('Q2 근거 확인' → 2번 문항을 다루는 턴)과 **의미 단서**('오답 제거' →
  --   정답 고르기가 아니라 오답 고르기)가 들어 있고, 화면 해석(fromSteps)이 이 문자열을 읽는다.
  --   실제로 이걸 빼고 접었더니 RC-P6-01 경고가 1 → 4로 늘었다(실측으로 걸렀다).
  step_label       text,
  -- ★ 음원·스크립트 지시는 변종이 아니라 조합에 붙는다 (계획서 D8).
  --   "선택지 A 음원만 재생"은 *그 턴이 무엇을 시키는가*가 아니라
  --   *이 유형의 이 순서에서 무엇을 트는가*이기 때문. 변종에 넣으면 25 → 77로 폭증한다.
  audio_mode       text,
  script_mode      text,
  -- 문구: override(고정) > 변종 기본값 > seed(이식된 손글씨). 실제 화면 문구는 LLM이 매번 만든다
  student_prompt_override  text,
  tutor_directive_override text,
  student_prompt_seed      text,
  tutor_directive_seed     text,
  -- 이관 추적용 — 이 행이 원래 어느 강의에서 왔나 (이관 검증·되돌리기)
  source_lecture_code text,
  note             text,
  unique (question_type_id, instructor_code, version, step_order)
);

create index if not exists type_rails_lookup_idx
  on type_rails (question_type_id, instructor_code, version, step_order);

comment on table type_rails is
  '레일 = 유형 × 강사 × 버전 × 순서. lecture_steps(강의별 965행)를 대체한다. '
  '강의가 늘어도 안 늘어난다 — 늘어나는 건 lecture_items 뿐이다.';
comment on column type_rails.version is
  '레일 A/B 실험용. 임포트는 delete+insert 가 아니라 version append 여야 과거 로그의 레일을 되짚을 수 있다.';

-- =========================================================
-- (C) 채점 장치 — 코드에 있던 TUTOR_RAILS 자리
-- =========================================================
-- 🔴 계획서 진단 수정:
--   계획서 §7 STEP 5는 "TUTOR_RAILS 371줄 → variant_checks(변종 단위) 이관"이라고 썼다.
--   실측하니 TUTOR_RAILS 가 덮는 건 **문항 2개뿐**이고(RC-P7-03-Q006 · RC-P5-08-Q002),
--   내용(keywords·hints·branches)은 전부 **그 문항 고유**다.
--   변종 단위로 옮기면 같은 변종을 쓰는 다른 문항이 엉뚱한 키워드로 채점된다.
--   → 문항 단위(rail_checks)로 둔다. 변종 단위 기본값이 필요해지면 question_code 를 null 로
--     두는 행을 추가하는 식으로 나중에 확장한다(지금 만들면 추측이 스키마로 굳는다 — §8).
create table if not exists rail_checks (
  id            bigserial primary key,
  question_code text not null references questions(question_code) on delete cascade,
  step_order    smallint not null,
  keywords      text[],                 -- 학생 답을 정답으로 인정할 표현
  hints         text[],                 -- 단계별 힌트 (점점 구체적으로)
  quick_replies text[],                 -- 화면 버튼
  branches      jsonb,                  -- [{ keywords: [], directive: '' }]
  fade_policy   text,                   -- 이 단계를 언제 줄일까
  unique (question_code, step_order)
);

comment on table rail_checks is
  '채점·힌트·분기. 지금은 코드(src/data/tutorContent.ts TUTOR_RAILS)에 있고 문항 2개만 덮는다. '
  '이 표로 옮기면 /api/tutor 의 "코드 레일 우선" 분기를 지울 수 있다.';

-- =========================================================
-- (D) RLS — 0012 방침과 동일
-- =========================================================
alter table type_rails  enable row level security;
alter table rail_checks enable row level security;

drop policy if exists "read for all" on type_rails;
create policy "read for all" on type_rails for select using (true);
drop policy if exists "read for all" on rail_checks;
create policy "read for all" on rail_checks for select using (true);

revoke insert, update, delete, truncate on type_rails, rail_checks from anon, authenticated;
grant select on type_rails, rail_checks to anon, authenticated;

commit;
