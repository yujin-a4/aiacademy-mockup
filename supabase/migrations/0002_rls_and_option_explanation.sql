-- 0002: 보안(RLS) + 스키마 보완
--
-- (A) RLS 활성화 및 정책
--   문제: RLS가 꺼져 있으면 브라우저에 노출되는 anon key만으로 누구나 모든 테이블을
--   읽고/쓰고/지울 수 있다 (PostgREST가 anon 역할로 전체 권한을 그대로 통과시킴).
--   방침:
--     - 마스터/콘텐츠 테이블: 누구나 읽기(select)만 가능, 쓰기는 정책 없음 → 차단.
--       (관리용 스크립트는 postgres 역할로 직접 접속하므로 RLS를 우회 — 영향 없음)
--     - learner_answer_log: 학생 답안 기록용이므로 insert/select 허용.
--       아직 로그인(auth) 기능이 없는 목업 단계라 anon에 허용하되,
--       auth 도입 시 learner_id = auth.uid() 조건으로 좁힐 것 (TODO).
--
-- (B) question_options.option_explanation 추가
--   시트의 문항 DB 필드 설계("보기별 오답 이유: 오답 선택지마다 이유 + 표준 오답태그")에서
--   태그는 option_error_tag_id로 반영했지만 "이유 텍스트"를 담을 컬럼이 없었다.
--   정답 행에는 correct_evidence가 있듯, 오답 행에는 option_explanation이 필요하다.

-- (B) 컬럼 추가
alter table question_options
  add column if not exists option_explanation text;

comment on column question_options.option_explanation is
  '이 선택지가 왜 오답(또는 정답)인지에 대한 문항별 설명 — 시트의 "보기별 오답 이유". AI는 이 텍스트를 인용만 하고 즉석 생성하지 않는다.';

-- (A) RLS 활성화
alter table step_types enable row level security;
alter table diagnostic_categories enable row level security;
alter table lectures enable row level security;
alter table wrong_answer_tags enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table learner_answer_log enable row level security;
alter table subject_choices enable row level security;

-- 읽기 전용 정책 (마스터/콘텐츠 테이블)
create policy "read for all" on step_types for select using (true);
create policy "read for all" on diagnostic_categories for select using (true);
create policy "read for all" on lectures for select using (true);
create policy "read for all" on wrong_answer_tags for select using (true);
create policy "read for all" on questions for select using (true);
create policy "read for all" on question_options for select using (true);
create policy "read for all" on subject_choices for select using (true);

-- 답안 로그: 기록 + 조회 허용 (목업 단계, auth 도입 시 좁힐 것)
create policy "insert for all" on learner_answer_log for insert with check (true);
create policy "read for all" on learner_answer_log for select using (true);
