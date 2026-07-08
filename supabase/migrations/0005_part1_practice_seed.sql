-- 0005: Part 1 실전 문제 시드 (content.stage='practice')
--   LC-P1-01 실전 P001~P003 (사람 중심 vs 사물·상태)
--   LC-P1-02 실전 P001~P003 (동작 vs 상태 표현)
-- 이미지: public/part1/part1_1_p{1..3}.jpg, part1_2_p{1..3}.jpg
-- 듣기 음원: public/part1/…_p{n}.mp3 (보기 A~D 내레이션). scripts/gen_part1_practice_audio.js 로 생성.
--   audio_url을 여기 시드에 박아 재시드해도 유지되게 함(생성기는 mp3 파일만 다시 만들면 됨).
-- 화면: DbLessonScreen PracticeView가 stage='practice' 문항을 실전 세트로 사용.
--   (유형학습 문항 0004는 stage 없음 → 그대로 유형학습으로 유지)
-- 재실행 안전: 문항 upsert, 선택지 삭제 후 재삽입.

begin;

insert into questions (question_code, lecture_id, part, difficulty, content) values
('LC-P1-01-P001', (select id from lectures where lecture_code='LC-P1-01'), 1, '하',
 '{"stage":"practice","photo_type":"인물 중심 사진","image_url":"/part1/part1_1_p1.jpg","audio_url":"/part1/part1_1_p1.mp3","key_elements":"회의실에서 남자가 스크린(발표 자료)을 손으로 가리키며 발표, 청중 착석","question_number":"1","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-01-P002', (select id from lectures where lecture_code='LC-P1-01'), 1, '중',
 '{"stage":"practice","photo_type":"사물·상태 사진","image_url":"/part1/part1_1_p2.jpg","audio_url":"/part1/part1_1_p2.mp3","key_elements":"빈 회의실, 의자들이 테이블 둘레에 가지런히 배치, 화이트보드에 글씨, 사람 없음","question_number":"2","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-01-P003', (select id from lectures where lecture_code='LC-P1-01'), 1, '중',
 '{"stage":"practice","photo_type":"혼합 사진","image_url":"/part1/part1_1_p3.jpg","audio_url":"/part1/part1_1_p3.mp3","key_elements":"야외 청과 가판, 과일이 상자에 진열, 남자가 사과를 고르며 장바구니를 듦","question_number":"3","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-02-P001', (select id from lectures where lecture_code='LC-P1-02'), 1, '하',
 '{"stage":"practice","photo_type":"동작 vs 상태","image_url":"/part1/part1_2_p1.jpg","audio_url":"/part1/part1_2_p1.mp3","key_elements":"정원에서 남자아이가 물뿌리개로 화분에 물을 주는 중","question_number":"1","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-02-P002', (select id from lectures where lecture_code='LC-P1-02'), 1, '중',
 '{"stage":"practice","photo_type":"소지 상태 vs 동작","image_url":"/part1/part1_2_p2.jpg","audio_url":"/part1/part1_2_p2.mp3","key_elements":"창고에서 여자 작업자가 상자(FRAGILE)를 두 손으로 들고 있음, 선반·팔레트잭","question_number":"2","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-02-P003', (select id from lectures where lecture_code='LC-P1-02'), 1, '상',
 '{"stage":"practice","photo_type":"진행 수동 (고난도)","image_url":"/part1/part1_2_p3.jpg","audio_url":"/part1/part1_2_p3.mp3","key_elements":"세차장에서 여자 직원이 호스로 차에 물을 뿌려 세차하는 중","question_number":"3","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb)
on conflict (question_code) do update
  set content = excluded.content, difficulty = excluded.difficulty, lecture_id = excluded.lecture_id;

delete from question_options where question_id in (
  select id from questions where question_code in
    ('LC-P1-01-P001','LC-P1-01-P002','LC-P1-01-P003','LC-P1-02-P001','LC-P1-02-P002','LC-P1-02-P003')
);

-- 1강 P001 남자 발표 (인물)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-01-P001'),'A','A man is pointing at a screen.', true, null, '남자가 스크린(발표 자료)을 손으로 가리키는 현재 동작과 일치', null),
((select id from questions where question_code='LC-P1-01-P001'),'B','The chairs are being stacked.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '의자를 쌓는 중이 아니라 사람들이 앉아 사용 중 — 동작·상태 혼동'),
((select id from questions where question_code='LC-P1-01-P001'),'C','A screen is being installed.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '스크린을 설치하는 중이 아니라 이미 발표에 사용 중'),
((select id from questions where question_code='LC-P1-01-P001'),'D','Some documents are scattered on the floor.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '바닥에 흩어진 서류가 사진에 없음 — 없는 대상');

-- 1강 P002 빈 회의실 (사물·상태)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-01-P002'),'A','Chairs have been arranged around a table.', true, null, '의자들이 테이블 둘레에 가지런히 놓인 완료 상태와 일치', null),
((select id from questions where question_code='LC-P1-01-P002'),'B','People are sitting at the table.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '테이블에 앉은 사람이 없음(빈 회의실) — 없는 주체'),
((select id from questions where question_code='LC-P1-01-P002'),'C','A man is writing on a whiteboard.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '화이트보드에 글씨는 있으나 쓰는 사람이 없음'),
((select id from questions where question_code='LC-P1-01-P002'),'D','The table is being cleaned.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '테이블을 닦는 동작이 진행 중이 아님');

-- 1강 P003 남자 과일 고르기 (혼합)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-01-P003'),'A','A man is choosing some fruit.', true, null, '남자가 가판에서 과일(사과)을 고르는 현재 동작과 일치', null),
((select id from questions where question_code='LC-P1-01-P003'),'B','Fruit is being delivered to the stall.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '과일을 배달하는 중이 아니라 이미 진열되어 있음'),
((select id from questions where question_code='LC-P1-01-P003'),'C','The stall is closed.', false, (select id from wrong_answer_tags where part=1 and tag_name='상태·배치·관계 불일치형'), null, '가판이 닫힌 게 아니라 열려 영업 중'),
((select id from questions where question_code='LC-P1-01-P003'),'D','Some boxes are being stacked.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '상자를 쌓는 동작이 진행 중이 아님');

-- 2강 P001 남자아이 물주기 (동작 vs 상태)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-02-P001'),'A','A boy is watering the plants.', true, null, '남자아이가 물뿌리개로 화분에 물을 주는 진행 동작과 일치', null),
((select id from questions where question_code='LC-P1-02-P001'),'B','The plants have been watered.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '이미 물을 준 완료 상태가 아니라 지금 물을 주는 중 — 시점 불일치'),
((select id from questions where question_code='LC-P1-02-P001'),'C','A boy is trimming the plants.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작 불일치형'), null, '가지치기(자르는) 동작이 아니라 물을 주는 중'),
((select id from questions where question_code='LC-P1-02-P001'),'D','Flowerpots are being moved.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '화분을 옮기는 동작이 진행 중이 아님');

-- 2강 P002 여자 상자 들기 (소지 상태 vs 동작)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-02-P002'),'A','A woman is holding a box.', true, null, '여자가 상자를 두 손으로 들고 있는 상태와 일치', null),
((select id from questions where question_code='LC-P1-02-P002'),'B','A woman is placing a box on a shelf.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '선반에 놓는 동작이 아니라 들고 있는 상태 — 동작/상태 혼동'),
((select id from questions where question_code='LC-P1-02-P002'),'C','Boxes are being unloaded from a truck.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '트럭에서 상자를 내리는 장면이 사진에 없음'),
((select id from questions where question_code='LC-P1-02-P002'),'D','A woman is opening a box.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작 불일치형'), null, '상자를 여는 동작이 아니라 들고 있음');

-- 2강 P003 여자 세차 (is being p.p.)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-02-P003'),'A','A car is being washed.', true, null, '차가 지금 물로 세차되는 진행 수동(be being p.p.)과 일치', null),
((select id from questions where question_code='LC-P1-02-P003'),'B','A car has been washed and parked.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '이미 세차를 마친 완료 상태가 아니라 진행 중 — 시점 불일치'),
((select id from questions where question_code='LC-P1-02-P003'),'C','A woman is repairing an engine.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작 불일치형'), null, '엔진을 수리하는 게 아니라 세차하는 중'),
((select id from questions where question_code='LC-P1-02-P003'),'D','Some cars are lined up for sale.', false, (select id from wrong_answer_tags where part=1 and tag_name='상태·배치·관계 불일치형'), null, '판매용으로 늘어선 차들이 아님');

commit;
