-- 스캐폴딩 시스템 DB 스키마
-- 참고 문서: docs/scaffolding-sheet-structure.md
--
-- 테이블은 두 그룹으로 나뉜다.
-- (1) 마스터/참조 테이블: [공통] 스케폴딩 기본 설계 시트에서 가져오는, 거의 안 바뀌는 "규칙" 데이터
-- (2) 실제 콘텐츠 테이블: 문항입력 시트에서 계속 채워지는, 실제로 늘어나는 "문항" 데이터

-- =========================================================
-- (1) 마스터 테이블
-- =========================================================

-- S1~S7: AI가 수업/코칭 중 밟는 "기능 단계" 마스터. Part 상관없이 공통.
create table step_types (
  code text primary key,        -- 'S1' ~ 'S7'
  name text not null,            -- 예: '핵심 단서 찾기'
  role text not null             -- 예: '사진, 질문 첫 단어... 가장 먼저 봐야 할 단서를 찾게 한다.'
);

-- 진단 카테고리 7종: 오답 태그들을 묶는 상위 분류. 7개 Part 전부에 공통 적용.
create table diagnostic_categories (
  code text primary key,             -- 'D1' ~ 'D7'
  name text not null,                 -- 예: '핵심요소 미확인형'
  definition text not null,           -- 이 카테고리가 뜻하는 취약점 설명
  default_step_sequence text[] not null, -- 예: ARRAY['S1','S6','S5']
  key_weakness text                   -- 예: '단서 포착'
);

-- 강의 마스터: LC1강, RC19강 등 실제 커리큘럼 단위
create table lectures (
  id bigint generated always as identity primary key,
  lecture_code text not null unique,  -- 예: 'LC-P1-01'
  part smallint not null check (part between 1 and 7),
  lc_rc text not null check (lc_rc in ('LC', 'RC')),
  title text not null                 -- 예: 'LC1강 — 인물 중심 vs 사물·상태 중심 vs 혼합 사진 판별'
);

-- Part별 오답 태그 마스터: 각 Part에서 쓰이는 오답 태그 정의 + 기본 코칭 단계
create table wrong_answer_tags (
  id bigint generated always as identity primary key,
  part smallint not null check (part between 1 and 7),
  tag_name text not null,                -- 예: '주체·대상 불일치형'
  tag_meaning text not null,
  sub_tags text[],                        -- 세부 오답 태그 목록 (있으면)
  diagnostic_category_code text references diagnostic_categories(code),
  missed_point text,                      -- '학습자가 놓친 지점' 진단 문구
  default_step_sequence text[] not null,  -- 예: ARRAY['S1','S6','S5']
  step_summary text,                      -- 각 단계 제공 내용 요약
  repeat_extra_step text,                 -- 반복 오답 시 추가되는 단계 설명
  unique (part, tag_name)
);

-- =========================================================
-- (2) 실제 콘텐츠 테이블
-- =========================================================

-- 문항: 실제 토익 문제 1개
create table questions (
  id bigint generated always as identity primary key,
  question_code text not null unique,     -- 예: 'LC-P1-01-Q001' (문항입력 시트의 question_id)
  lecture_id bigint not null references lectures(id),
  part smallint not null check (part between 1 and 7),
  difficulty text,                        -- '상' / '중' / '하' 등, 선택值
  content jsonb not null default '{}'::jsonb, -- Part별로 달라지는 필드(사진유형, 대화정보, 빈칸문장 등)를 유연하게 저장
  created_at timestamptz not null default now()
);

-- 선택지: 문항 하나당 2~4개 행. 오답 선택지는 오답 태그를 참조한다.
create table question_options (
  id bigint generated always as identity primary key,
  question_id bigint not null references questions(id) on delete cascade,
  option_label text not null,             -- 'A' / 'B' / 'C' / 'D'
  option_text text not null,
  is_correct boolean not null default false,
  option_error_tag_id bigint references wrong_answer_tags(id), -- 정답이면 null
  correct_evidence text,                  -- 정답 근거 (보통 정답 행에만 채움)
  notes text,
  unique (question_id, option_label)
);

-- 학습자 답안 로그: 반복 오답 판정 + 문항별 정답률 통계의 기반 데이터
create table learner_answer_log (
  id bigint generated always as identity primary key,
  learner_id uuid not null,               -- Supabase auth.users.id 참조 예정 (인증 붙기 전엔 임시 UUID로 사용)
  question_id bigint not null references questions(id),
  selected_option_label text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index idx_question_options_question_id on question_options(question_id);
create index idx_question_options_error_tag on question_options(option_error_tag_id);
create index idx_learner_answer_log_learner_question on learner_answer_log(learner_id, question_id);
create index idx_questions_lecture_id on questions(lecture_id);
