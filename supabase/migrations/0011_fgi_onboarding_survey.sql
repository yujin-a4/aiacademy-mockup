-- 온보딩 시작 시 FGI 설문
insert into fgi_surveys (id, title, location, description) values
  ('onboarding-start', '온보딩 시작 전 설문', '/onboarding', 'FGI 참가자 온보딩 진입 시 첫인상 설문');

insert into fgi_survey_questions (survey_id, order_num, question_text, question_type) values
  ('onboarding-start', 1, '토익 공부할 때 가장 어려운 점은 무엇인가요?', 'text'),
  ('onboarding-start', 2, '지금 이 앱을 처음 봤을 때 어떤 느낌인가요?', 'scale5'),
  ('onboarding-start', 3, '앱이 나를 도와줄 것 같다는 느낌이 드나요?', 'scale5');
