-- FGI(포커스 그룹 인터뷰)용 설문 시스템
-- 앱 내 여러 위치에 설문을 삽입할 수 있도록 설계
-- location 태그로 위치를 구분하며, 위치마다 다른 문항 세트를 가질 수 있음

-- 설문 세트 (위치 단위로 1개)
create table fgi_surveys (
  id          text primary key,            -- 예: 'login-ab', 'onboarding-end', 'lesson-part1'
  title       text not null,               -- 예: '로그인 화면 A/B 설문'
  location    text not null,               -- 화면 경로 또는 위치 태그 예: '/login', 'after-lesson'
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 설문 문항 (한 설문에 여러 문항)
create table fgi_survey_questions (
  id            bigint generated always as identity primary key,
  survey_id     text not null references fgi_surveys(id) on delete cascade,
  order_num     smallint not null,          -- 문항 순서
  question_text text not null,             -- 문항 내용
  question_type text not null              -- 'scale5' | 'text' | 'choice'
    check (question_type in ('scale5', 'text', 'choice')),
  options       jsonb,                     -- choice일 때만 사용: ["매우 그렇다", "그렇다", ...]
  required      boolean not null default true,
  unique (survey_id, order_num)
);

-- 응답 (한 세션의 모든 응답을 session_id로 묶음)
create table fgi_responses (
  id          bigint generated always as identity primary key,
  survey_id   text not null references fgi_surveys(id),
  question_id bigint not null references fgi_survey_questions(id),
  session_id  text not null,               -- 같은 응답 세션 묶기 (crypto.randomUUID로 생성)
  user_id     uuid,                        -- nullable: 비로그인 게스트도 허용
  variant     text,                        -- A/B 테스트 중인 경우 'A' | 'B' 기록
  answer      text not null,               -- scale5: '1'~'5', text: 자유입력, choice: 선택지 값
  answered_at timestamptz not null default now()
);

create index idx_fgi_responses_survey on fgi_responses(survey_id);
create index idx_fgi_responses_session on fgi_responses(session_id);
create index idx_fgi_responses_user on fgi_responses(user_id);
create index idx_fgi_survey_questions_survey on fgi_survey_questions(survey_id);

-- RLS: 누구나 응답 삽입 가능, 읽기는 인증된 사용자만
alter table fgi_surveys enable row level security;
alter table fgi_survey_questions enable row level security;
alter table fgi_responses enable row level security;

create policy "설문 공개 조회" on fgi_surveys for select using (true);
create policy "문항 공개 조회" on fgi_survey_questions for select using (true);
create policy "응답 삽입 허용" on fgi_responses for insert with check (true);
create policy "응답 본인 조회" on fgi_responses for select using (auth.uid() = user_id);

-- 샘플 설문 데이터 (로그인 화면 A/B용)
insert into fgi_surveys (id, title, location, description) values
  ('login-ab', '로그인 화면 첫인상 설문', '/login', 'A/B 카피 안 비교용 FGI 설문');

insert into fgi_survey_questions (survey_id, order_num, question_text, question_type) values
  ('login-ab', 1, '이 화면을 봤을 때 앱이 어떤 서비스인지 바로 이해됐나요?', 'scale5'),
  ('login-ab', 2, '화면에서 가장 눈에 띈 요소는 무엇인가요?', 'text'),
  ('login-ab', 3, '이 앱을 사용해보고 싶다는 생각이 드셨나요?', 'scale5');
