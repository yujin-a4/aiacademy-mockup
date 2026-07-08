-- 0004: Part 1 유형학습 2강 시드
--   LC-P1-01 (사람 중심 vs 사물·상태 사진) — Q001~Q003
--   LC-P1-02 (동작 vs 상태 표현 구분)     — Q001~Q003
-- 이미지는 public/part1/*.jpg 를 content.image_url 로 연결.
-- 듣기 음원(content.audio_url): 보기 A~D 내레이션 mp3. scripts/gen_part1_practice_audio.js 로 생성.
--   유형학습 수업에서 강사(에이전트)가 play_audio tool로 재생. audio_url을 시드에 박아 재시드해도 유지.
-- 오답 태그(option_error_tag_id)는 기존 wrong_answer_tags(part=1) 이름으로 참조.
-- 재실행 안전(idempotent): 문항은 upsert, 선택지는 삭제 후 재삽입.

begin;

-- 강의 마스터 (이미 있으면 제목 유지) — 자기완결성 위해 upsert
insert into lectures (lecture_code, part, lc_rc, title) values
  ('LC-P1-01', 1, 'LC', 'LC1강 — 인물 중심 vs 사물·상태 중심 vs 혼합 사진 판별'),
  ('LC-P1-02', 1, 'LC', 'LC2강 — 동작 표현 vs 상태 표현 구분')
on conflict (lecture_code) do nothing;

-- ── 문항 6개 upsert ──
insert into questions (question_code, lecture_id, part, difficulty, content) values
('LC-P1-01-Q001', (select id from lectures where lecture_code='LC-P1-01'), 1, '하',
 '{"photo_type":"인물 중심 사진","image_url":"/part1/part1_1_1.jpg","audio_url":"/part1/part1_1_1.mp3","key_elements":"여자(바리스타) 1명, 커피잔을 두 손으로 들고 미소, 뒤 메뉴판·에스프레소 머신·페이스트리","question_number":"1","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-01-Q002', (select id from lectures where lecture_code='LC-P1-01'), 1, '하',
 '{"photo_type":"사물·상태 사진","image_url":"/part1/part1_1_2.jpg","audio_url":"/part1/part1_1_2.mp3","key_elements":"거리 거치대에 자전거 여러 대가 한 줄로 주차, 사람 없음, 상점가 배경","question_number":"2","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-01-Q003', (select id from lectures where lecture_code='LC-P1-01'), 1, '중',
 '{"photo_type":"혼합 사진","image_url":"/part1/part1_1_3.jpg","audio_url":"/part1/part1_1_3.mp3","key_elements":"공항 대합실, 사람들 의자에 앉아 대기(스마트폰), 여행가방들이 바닥에 놓임, 창밖 비행기","question_number":"3","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-02-Q001', (select id from lectures where lecture_code='LC-P1-02'), 1, '중',
 '{"photo_type":"동작 vs 상태","image_url":"/part1/part1_2_1.jpg","audio_url":"/part1/part1_2_1.mp3","key_elements":"남자 1명 책상에서 노트북 타이핑, 화면 켜짐, 머그컵·노트·화분·책장","question_number":"1","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-02-Q002', (select id from lectures where lecture_code='LC-P1-02'), 1, '중',
 '{"photo_type":"착용 상태 vs 동작","image_url":"/part1/part1_2_2.jpg","audio_url":"/part1/part1_2_2.mp3","key_elements":"여성 엔지니어 1명, 안전모·안전조끼 이미 착용, 한 손에 장갑·태블릿, 뒤 건설현장·크레인","question_number":"2","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb),
('LC-P1-02-Q003', (select id from lectures where lecture_code='LC-P1-02'), 1, '상',
 '{"photo_type":"진행 수동 (고난도)","image_url":"/part1/part1_2_3.jpg","audio_url":"/part1/part1_2_3.mp3","key_elements":"건설현장, 크레인이 강철빔을 공중에서 들어올리는 중, 상부 데크 작업자 2명 수신호, 아직 지붕 미설치","question_number":"3","question_text":"사진을 가장 잘 묘사한 보기를 고르시오."}'::jsonb)
on conflict (question_code) do update
  set content = excluded.content, difficulty = excluded.difficulty, lecture_id = excluded.lecture_id;

-- ── 선택지 재삽입(멱등) ──
delete from question_options where question_id in (
  select id from questions where question_code in
    ('LC-P1-01-Q001','LC-P1-01-Q002','LC-P1-01-Q003','LC-P1-02-Q001','LC-P1-02-Q002','LC-P1-02-Q003')
);

-- 헬퍼 참조: 문항 id / 태그 id 는 서브쿼리로 조회
-- (정답: correct_evidence 채움 / 오답: option_error_tag_id + option_explanation 채움)

-- Q001 카페 여성 (인물)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-01-Q001'),'A','A woman is pouring coffee into a cup.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작 불일치형'), null, '커피를 붓는 동작이 아니라 이미 잔을 든 상태 — 동작 불일치'),
((select id from questions where question_code='LC-P1-01-Q001'),'B','A woman is holding a cup.', true, null, '여자가 컵을 두 손으로 들고 있는 현재 동작과 일치', null),
((select id from questions where question_code='LC-P1-01-Q001'),'C','Some cups are being washed.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '컵을 씻는 진행 수동 장면이 아님 — 사물 동작·상태 혼동 함정'),
((select id from questions where question_code='LC-P1-01-Q001'),'D','A woman is reading a menu.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작 불일치형'), null, '메뉴판은 사진에 있으나 읽는 동작은 아님 — 사물 미끼 함정');

-- Q002 자전거 거치대 (사물·상태)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-01-Q002'),'A','Some bicycles have been parked in a row.', true, null, '자전거들이 거치대에 한 줄로 세워진 완료 상태(현재완료 수동)와 일치', null),
((select id from questions where question_code='LC-P1-01-Q002'),'B','A man is riding a bicycle.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '자전거를 타는 사람이 사진에 없음 — 없는 주체'),
((select id from questions where question_code='LC-P1-01-Q002'),'C','People are walking down the street.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '거리를 걷는 사람이 보이지 않음 — 없는 주체'),
((select id from questions where question_code='LC-P1-01-Q002'),'D','The bikes are leaning against a wall.', false, (select id from wrong_answer_tags where part=1 and tag_name='상태·배치·관계 불일치형'), null, '벽이 아니라 거치대에 세워져 있음 — 위치·배치 오류');

-- Q003 공항 대합실 (혼합)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-01-Q003'),'A','People are boarding the plane.', false, (select id from wrong_answer_tags where part=1 and tag_name='장면 과잉추론형'), null, '창밖에 비행기는 있으나 탑승 장면은 아님(대합실 대기 중) — 장면 과잉추론'),
((select id from questions where question_code='LC-P1-01-Q003'),'B','A woman is pushing a cart.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작 불일치형'), null, '카트를 미는 동작이 사진에 없음 — 동작 불일치'),
((select id from questions where question_code='LC-P1-01-Q003'),'C','Some luggage has been placed on the floor.', true, null, '여행가방들이 바닥에 놓인 완료 상태와 일치 — 사람이 아니라 사물 상태가 정답', null),
((select id from questions where question_code='LC-P1-01-Q003'),'D','Travelers are standing in line.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작 불일치형'), null, '줄 서 있지 않고 의자에 앉아 있음 — 동작 불일치');

-- 2강 Q001 남자 노트북 (동작 vs 완료 상태)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-02-Q001'),'A','A man is typing on a laptop.', true, null, '남자가 노트북 자판을 치는 현재 진행 동작과 일치', null),
((select id from questions where question_code='LC-P1-02-Q001'),'B','A laptop has been turned off.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, '화면이 켜진 사용 중 상태 — 완료 상태(꺼짐)와 불일치'),
((select id from questions where question_code='LC-P1-02-Q001'),'C','Documents are scattered on the floor.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '바닥에 흩어진 서류가 사진에 없음 — 없는 대상'),
((select id from questions where question_code='LC-P1-02-Q001'),'D','A man is standing by the desk.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작 불일치형'), null, '서 있지 않고 앉아 있음 — 동작 불일치');

-- 2강 Q002 여성 건설현장 (wearing vs putting on)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-02-Q002'),'A','A woman is wearing a hard hat.', true, null, '안전모를 이미 착용한 상태(wear=착용 상태)와 일치', null),
((select id from questions where question_code='LC-P1-02-Q002'),'B','A woman is putting on a hard hat.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, 'put on=쓰는 동작인데 이미 착용을 마친 상태 — 동작/상태 혼동(핵심 함정)'),
((select id from questions where question_code='LC-P1-02-Q002'),'C','A woman is taking off her gloves.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작 불일치형'), null, '장갑을 벗는 동작이 아니라 손에 들고 있음 — 동작 불일치'),
((select id from questions where question_code='LC-P1-02-Q002'),'D','Safety vests are being handed out.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '조끼를 나눠주는 동작·대상이 사진에 없음 — 없는 대상');

-- 2강 Q003 크레인 강철빔 (is being p.p. vs have been p.p.)
insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation) values
((select id from questions where question_code='LC-P1-02-Q003'),'A','A steel beam is being lifted by a crane.', true, null, '강철빔이 크레인에 의해 지금 들어올려지는 진행 수동(be being p.p.)과 일치', null),
((select id from questions where question_code='LC-P1-02-Q003'),'B','A steel beam has been lifted onto the roof.', false, (select id from wrong_answer_tags where part=1 and tag_name='동작·상태 혼동형'), null, 'have been p.p.=이미 지붕에 올려진 완료 상태 — 아직 공중이라 시점 불일치'),
((select id from questions where question_code='LC-P1-02-Q003'),'C','Some workers are climbing a ladder.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '사다리를 오르는 작업자가 사진에 없음 — 없는 동작'),
((select id from questions where question_code='LC-P1-02-Q003'),'D','Building materials have been unloaded from a truck.', false, (select id from wrong_answer_tags where part=1 and tag_name='주체·대상 불일치형'), null, '트럭에서 자재를 내린 장면이 사진에 없음 — 없는 대상');

commit;
