-- 0008: lecture_steps에 강사(instructor) 차원 추가.
--
-- 시트 "[윤다은 ver]/[이도윤 ver] 스케폴딩 (유형학습)"처럼 같은 강의라도 강사별로
-- 단계 시퀀스·규칙·말투가 다르다. 기존 공통 레일(유형학습_G 이관분)은 'common'으로 두고,
-- 강사별 레일을 instructor_code로 구분해 함께 저장한다. (id는 온보딩 InstructorSelect와 동일)
--   · 'common'     = 공통 기본 설계 (박혜원은 당분간 이걸 사용 — 추후 별도 이관 예정)
--   · 'yun_daeun'  = 윤다은 ver
--   · 'lee_doyun'  = 이도윤 ver
-- 엔진(loadLectureSteps)은 요청 강사 행이 없으면 'common'으로 폴백한다.
-- import-instructor-rails.js가 (lecture_id, instructor_code) 단위 delete 후 insert로 재실행 가능.

alter table lecture_steps
  add column if not exists instructor_code text not null default 'common';

-- 기존 유니크(강의+순서) → (강의+강사+순서)로 확장. 같은 강의를 강사별로 각각 담을 수 있게.
alter table lecture_steps
  drop constraint if exists lecture_steps_lecture_id_step_order_key;

alter table lecture_steps
  add constraint lecture_steps_lecture_instructor_order_key
  unique (lecture_id, instructor_code, step_order);

create index if not exists idx_lecture_steps_lecture_instructor
  on lecture_steps(lecture_id, instructor_code);
