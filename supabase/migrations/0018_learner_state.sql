-- 0018: 학습자 상태 (STEP 6) — docs/db-restructure-plan.md §7 STEP 6
--
-- 문제: **지금 FGI를 돌리면 데이터가 하나도 안 남는다.**
--   · 어떤 레일(변종)로 배웠는지 기록이 없다 → H3(스캐폴딩이 통하는가) 검증 근거가 안 생긴다
--   · Fading 판정 상태(`mastery`)가 /api/tutor 의 **in-memory Map** 이라 서버리스에서 사라진다
--   · 진도·오답노트가 전부 Zustand(브라우저)에만 있어 새로고침하면 없어진다
--
-- 이 마이그레이션이 하는 일
--   (A) learning_events   — 턴 하나하나의 로그. **variant_id 와 occurrence 가 핵심이다**
--   (B) learner_progress  — 진도·Fading 상태. in-memory Map 의 대체물
--
-- 왜 variant_id·occurrence 가 핵심인가:
--   "S6(오답 제거)를 선택 응답으로 받은 학생이, 같은 유형 2번째 바퀴에서 정답률이 올랐나"
--   — 이게 스캐폴딩이 통하는지 보는 질문이다. 그러려면 턴마다 **어느 변종이었는지**와
--   **몇 번째 바퀴였는지**가 있어야 한다. 문항 정오답만 남기면 이 질문에 답할 수 없다.
--   기존 learner_answer_log 가 그랬다(문항·선택지·정오답만 있다).
--
-- ⚠️ 로그가 두 벌이 된다 — 계획서 §9가 인정한 것이다.
--    learner_answer_log 는 그대로 두고(profile.ts·tutorDb.ts 가 아직 쓴다) 신규만 여기 쌓는다.
--    리네임은 그 두 파일을 옮긴 뒤에 한다.

begin;

-- =========================================================
-- (A) 턴 로그
-- =========================================================
create table if not exists learning_events (
  id             bigserial primary key,
  learner_id     uuid not null,
  session_id     uuid,                    -- 한 번의 수업(=한 번 들어와서 끝낼 때까지)

  -- 무엇을 배웠나
  lecture_code   text,
  phase          text,                    -- lesson | practice
  item_seq       smallint,                -- 몇 번째 아이템(= 레일 몇 바퀴째)
  occurrence     smallint,                -- ★ 같은 유형 몇 번째 바퀴 — Fading·학습효과의 축
  question_code  text,

  -- 어떤 스캐폴딩으로 배웠나
  question_type_id bigint references question_types(id),
  variant_id     bigint references step_variants(id),   -- ★ 단계 × 상호작용
  step_order     smallint,
  step_label     text,                    -- 레일 원문 단계명 (변종이 안 붙은 LC 대비)
  instructor_code text,
  rail_source    text,                    -- type_rails | lecture_steps — 어느 구조로 돌았나

  -- 무슨 일이 있었나
  event_type     text not null,           -- turn_shown | response | hint | complete
  response       text,
  is_correct     boolean,
  latency_ms     integer,

  at             timestamptz not null default now()
);

create index if not exists learning_events_learner_idx on learning_events (learner_id, at desc);
create index if not exists learning_events_variant_idx on learning_events (variant_id, occurrence);
create index if not exists learning_events_lecture_idx on learning_events (lecture_code, phase);

comment on table learning_events is
  '턴 단위 학습 로그. 문항 정오답만이 아니라 **어느 변종을 몇 번째 바퀴에 받았는지**를 남긴다. '
  '그게 있어야 "S6를 받은 회차별 정답률" 같은 질문에 답할 수 있다.';
comment on column learning_events.occurrence is
  '같은 유형이 이 강의에서 몇 번째로 나왔나. v_lecture_program 이 계산해 주는 값.';
comment on column learning_events.rail_source is
  '이관 과도기 추적용. type_rails(새 구조) / lecture_steps(옛 구조, LC). 둘의 결과를 갈라 볼 수 있다.';

-- =========================================================
-- (B) 진도 · Fading 상태
-- =========================================================
-- /api/tutor 의 `const mastery = new Map()` 을 대체한다.
-- 키를 그때와 같게(학습자 × 강의) 두어 그대로 갈아끼울 수 있게 했다.
create table if not exists learner_progress (
  learner_id       uuid not null,
  lecture_code     text not null,
  question_type_id bigint references question_types(id),
  completed_count  smallint not null default 0,   -- 연속 완료 누적 (Fading 판정의 입력)
  mastery          smallint not null default 0,
  fading_level     text,                          -- full | reduced | minimal
  last_at          timestamptz not null default now(),
  primary key (learner_id, lecture_code)
);

comment on table learner_progress is
  'Fading 판정 상태. 이전에는 /api/tutor 의 in-memory Map 이라 서버리스에서 소실됐다.';

-- =========================================================
-- (C) RLS
-- =========================================================
-- 읽기는 본인 것만. 쓰기는 열어둔다 —
--   · 브라우저(수업 화면)와 서버(/api/tutor, anon 키)가 둘 다 기록한다
--   · 0012 방침(권한 자체를 읽기 전용으로)에서 이 두 표만 예외로 insert 를 연다
--   · survey_responses 와 같은 수준의 절충이다. 남의 행을 **읽을 수는 없다**
alter table learning_events  enable row level security;
alter table learner_progress enable row level security;

drop policy if exists "insert for all" on learning_events;
create policy "insert for all" on learning_events for insert with check (true);
drop policy if exists "read own" on learning_events;
create policy "read own" on learning_events for select
  using (auth.uid() = learner_id
         or learner_id = '11111111-1111-4111-8111-111111111111'::uuid);

drop policy if exists "insert for all" on learner_progress;
create policy "insert for all" on learner_progress for insert with check (true);
drop policy if exists "update for all" on learner_progress;
create policy "update for all" on learner_progress for update using (true) with check (true);
drop policy if exists "read own" on learner_progress;
create policy "read own" on learner_progress for select
  using (auth.uid() = learner_id
         or learner_id = '11111111-1111-4111-8111-111111111111'::uuid);

grant select, insert on learning_events to anon, authenticated;
grant usage, select on sequence learning_events_id_seq to anon, authenticated;
grant select, insert, update on learner_progress to anon, authenticated;

commit;
