-- 0011: 스캐폴딩 레일을 "부품 사전 + 조합표"로 분리.
--
-- 배경: lecture_steps는 강의마다 레일 한 벌을 통째로 들고 있다. 그런데 실측해 보면
-- Part5 16강 112행이 서로 다른 게 아니라 **부품 13개의 반복**이었다 (S3 개념 코칭·S5 정답 근거
-- 연결·S7 표현 정리는 16강 전부가 동일). 이 구조에서는 "오답 제거 방식을 바꿔보자"를 하려면
-- 16개 강의 행을 손으로 다 고쳐야 해서, 스캐폴딩 실험의 단위가 강의에 묶인다.
--
-- 그래서 레일을 둘로 나눈다.
--   rail_steps        = 부품 사전 (무엇을 시키는 턴인가)
--   rail_compositions = 유형(강의)이 부품을 어떤 순서로 조합하는가
-- 부품 하나를 고치면 그 부품을 쓰는 모든 강의가 같이 바뀐다 → 실험 단위가 부품으로 내려간다.
--
-- lecture_steps는 **그대로 둔다.** 아직 이식 안 된 파트(1·2·3·4·6·7)는 거기서 계속 읽고,
-- 런타임은 rail_compositions가 있으면 그걸, 없으면 lecture_steps로 폴백한다
-- (src/data/db/lectureStepStore.ts).
--
-- 문구 정책: 학생 문구를 강의마다 손으로 써두면 강의가 늘 때 사람이 따라 써야 해서 확장이 안 된다.
-- 그래서 문구는 부품 + 문항 사실로 **매번 생성**하고(/api/rail-prompts), DB 값은 폴백으로만 쓴다.
--   student_prompt_override : 진짜 예외. 값이 있으면 생성분이 이걸 못 덮는다. 목표는 비어 있기.
--   student_prompt_seed     : lecture_steps에서 이식해 온 손글씨. 말투 예시 + 오프라인 폴백.

create table if not exists rail_steps (
  id              bigserial primary key,
  part            smallint not null,
  code            text     not null,          -- 'P5-02'
  name            text     not null,          -- 'S6 오답 제거' (시트 원문 단계 라벨)
  interaction     text,                       -- '선택 응답' — 화면 상호작용을 정하는 값
  audio_mode      text,
  script_mode     text,
  student_prompt  text,                       -- 부품 공통 기본 문구 (없으면 null)
  tutor_directive text,                       -- 부품 공통 강사 지시문 (에이전트에 전달)
  note            text,
  created_at      timestamptz not null default now(),
  unique (part, code)
);

comment on table rail_steps is
  '스캐폴딩 부품 사전 — 파트별 최소 실행 단위. lecture_steps(강의별 레일)를 중복 제거한 것.';
comment on column rail_steps.interaction is
  '이 값이 화면 상호작용을 정한다. 쓸 수 있는 표현: AI 진행 / 선택 응답 / 필수 응답 / 주관식 응답 / 필수 수행(필기 인식·쉐도잉·매칭). 해석은 src/data/typeLearning/fromSteps.ts.';

create table if not exists rail_compositions (
  id                        bigserial primary key,
  lecture_id                bigint   not null references lectures(id) on delete cascade,
  instructor_code           text     not null,
  step_order                smallint not null,
  rail_step_id              bigint   not null references rail_steps(id),
  student_prompt_override   text,
  tutor_directive_override  text,
  student_prompt_seed       text,
  tutor_directive_seed      text,
  created_at                timestamptz not null default now(),
  unique (lecture_id, instructor_code, step_order)
);

comment on table rail_compositions is
  '유형(강의)이 부품을 어떤 순서로 조합하는지. override가 비면 부품 기본값을 쓴다(= 공유).';
comment on column rail_compositions.student_prompt_override is
  '진짜 예외일 때만 채운다. 값이 있으면 LLM 생성을 막고 이걸 쓴다. 목표: 비어 있기.';
comment on column rail_compositions.student_prompt_seed is
  '이식된 손글씨 문구. 화면 1순위 아님 — LLM 참고 예시 + 생성 실패 시 폴백.';

create index if not exists rail_compositions_lecture_idx
  on rail_compositions (lecture_id, instructor_code, step_order);
