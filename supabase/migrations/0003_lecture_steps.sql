-- 0003: lecture_steps — 강의별 유형학습 스캐폴딩 레일 (시트 "[공통] 스케폴딩 기본 설계 (유형학습_G)" 이관)
--
-- 시트의 강의 블록 표를 그대로 옮긴다:
--   단계(S코드) / AI가 따라야 할 규칙(고정) / 문항마다 달라지는 정보(DB 필드 참조) / AI가 자유롭게 표현 가능한 부분
-- 시트가 계속 수정되므로 import-lecture-rails.js가 upsert(강의 단위 delete 후 insert)로 재실행 가능해야 한다.
-- ※ 코드의 TUTOR_RAILS(손질 레일: keywords/hints/branches 포함)와 별개 —
--   여기는 채점 장치 없는 "진행 지시" 수준이라 엔진에서 별도 모드로 사용한다.

create table if not exists lecture_steps (
  id bigint generated always as identity primary key,
  lecture_id bigint not null references lectures(id) on delete cascade,
  step_order smallint not null,          -- 배열 순서 = 실제 진행 순서 (1부터)
  step_code text not null,               -- 'S2' (복합 표기 'S2+S3' 등은 원문 유지)
  fixed_rule text not null,              -- AI가 따라야 할 규칙 (고정 텍스트)
  db_fields text,                        -- 문항마다 달라지는 정보 — 참조할 DB 필드 설명 (시트 원문)
  free_expression text,                  -- AI가 자유롭게 표현 가능한 부분 (시트 원문)
  created_at timestamptz not null default now(),
  unique (lecture_id, step_order)
);

create index if not exists idx_lecture_steps_lecture_id on lecture_steps(lecture_id);

alter table lecture_steps enable row level security;
drop policy if exists "read for all" on lecture_steps;
create policy "read for all" on lecture_steps for select using (true);
