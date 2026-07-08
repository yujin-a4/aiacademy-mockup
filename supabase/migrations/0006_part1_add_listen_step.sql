-- 0006: Part1 유형학습에 "듣기+자력선택" 단계(S0)를 S5 앞에 추가.
--   기존: S2→S3→S1→S5(듣기+근거연결 겸함)→S6→S7  — S5가 듣기와 정답공개를 다 떠안아 강사가 정답을 조기 공개함.
--   변경: S2→S3→S1→S0(음원 들려주고 학생이 스스로 고름, 정답 X)→S5(고른 뒤 근거연결)→S6→S7
--   · 음원은 S0 단계에서 재생 — fixed_rule에 '음원'이 들어가면 엔진(stepWantsAudio)이 playAudio 신호를 준다.
--   · S5의 '들으며'를 빼서 S5에서는 재생 안 되게 하고, 학생이 고른 뒤 근거를 연결하게 함.
--   · (LC-P1-02는 원래 어느 단계에도 듣기 키워드가 없어 음원이 안 나왔는데, S0 추가로 같이 해결됨.)
-- 재실행 안전: 해당 강의 lecture_steps 전체 삭제 후 재삽입.

begin;

delete from lecture_steps where lecture_id in (select id from lectures where lecture_code in ('LC-P1-01','LC-P1-02'));

insert into lecture_steps (lecture_id, step_order, step_code, fixed_rule, db_fields, free_expression) values
-- ── LC-P1-01 (사람 중심 vs 사물·상태) ──
((select id from lectures where lecture_code='LC-P1-01'), 1, 'S2', '제시된 사진이 인물 중심 / 사물·상태 중심 / 혼합 사진 중 어디에 해당하는지 학습자가 먼저 판별하게 묻는다.', '사진유형', '질문 문구, 강사 말투'),
((select id from lectures where lecture_code='LC-P1-01'), 2, 'S3', 'Part1 사진은 인물 중심 · 사물·상태 중심 · 혼합 사진으로 나뉜다는 기준을 설명한다.', '(없음 — 유형 차원 고정 설명)', '설명 표현 (반복 학습자에게는 축약)'),
((select id from lectures where lecture_code='LC-P1-01'), 3, 'S1', '인물 사진이면 인원수·자세·물건·시선·동작을, 사물·풍경 사진이면 중심사물·배치·상태·주변사물을, 혼합 사진이면 동작의 중심이 사람인지 사물인지를 확인하게 한다.', '사진 유형(이 중 하나에 맞춰 적용), 핵심요소', '코칭 멘트'),
((select id from lectures where lecture_code='LC-P1-01'), 4, 'S0', '보기 A부터 D까지 음원을 들려주고, 학생이 스스로 사진에 맞는 답을 하나 골라보게 한다. 이 단계에서는 정답을 아직 알려주지 않는다.', '보기 음원', '들어보자고 안내하는 말투'),
((select id from lectures where lecture_code='LC-P1-01'), 5, 'S5', '학생이 고른 답과 정답 근거를 연결해 왜 그 표현이 사진과 맞는지 확인해준다.', '정답 보기, 정답 근거', '연결을 설명하는 말투'),
((select id from lectures where lecture_code='LC-P1-01'), 6, 'S6', '선택지 중 사진 속 요소와 맞지 않는 표현을 표준 오답태그 기준으로 제거하게 한다.', '보기별 오답 이유 (표준 오답 태그)', '설명 말투만 — 이유 자체는 생성하지 않음'),
((select id from lectures where lecture_code='LC-P1-01'), 7, 'S7', '이 사진 유형의 빈출 표현을 정리한다.', '유형 차원 빈출 표현 누적 리스트', '정리 멘트 표현'),
-- ── LC-P1-02 (동작 표현 vs 상태 표현) ──
((select id from lectures where lecture_code='LC-P1-02'), 1, 'S2', '사진이 동작이 진행 중인 장면인지, 이미 완료된 상태인지 학습자가 먼저 판별하게 묻는다.', '사진 유형(동작 중심/상태 중심)', '질문 문구, 강사 말투'),
((select id from lectures where lecture_code='LC-P1-02'), 2, 'S3', '인물이 등장하면 wearing·holding·sitting·standing은 상태 표현, putting on·placing·picking up은 동작 표현이라는 기준을, 사물이 등장하면 be p.p.=상태 / be being p.p.=진행 중 동작 / have been p.p.=완료 상태라는 차이를 설명한다.', '(없음 — 유형 차원 고정 설명)', '설명 표현 (반복 학습자에게는 축약)'),
((select id from lectures where lecture_code='LC-P1-02'), 3, 'S1', '인물 사진이면 자세·손 위치·시선에서 동작/상태 신호를, 사물 사진이면 수동태 표현과 어울리는 상태 단서를 찾게 한다.', '사진 유형(이 중 하나에 맞춰 적용), 핵심 요소', '코칭 멘트'),
((select id from lectures where lecture_code='LC-P1-02'), 4, 'S0', '보기 A부터 D까지 음원을 들려주고, 학생이 스스로 사진에 맞는 답을 하나 골라보게 한다. 이 단계에서는 정답을 아직 알려주지 않는다.', '보기 음원', '들어보자고 안내하는 말투'),
((select id from lectures where lecture_code='LC-P1-02'), 5, 'S5', '학생이 고른 답과 사진 속 동작·상태 근거를 연결해 왜 맞는지 확인해준다.', '정답 보기, 정답 근거', '연결을 설명하는 말투'),
((select id from lectures where lecture_code='LC-P1-02'), 6, 'S6', '선택지 중 동작·상태가 사진과 맞지 않는 표현을 표준 오답태그 기준으로 제거하게 한다.', '보기별 오답 이유 (표준 오답 태그)', '설명 말투만 — 이유 자체는 생성하지 않음'),
((select id from lectures where lecture_code='LC-P1-02'), 7, 'S7', '헷갈리는 동작·상태 표현을 짝으로 정리한다.', '유형 차원 빈출 표현 누적 리스트', '정리 멘트 표현');

commit;
