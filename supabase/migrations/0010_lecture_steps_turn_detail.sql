-- 0010: lecture_steps에 턴 상세 열 추가 (0713 완료본 시트 반영).
--
-- 배경: 강사 스캐폴딩 시트가 0713 완료본으로 개정되면서 열 구성이 확장됐다.
-- 특히 [이도윤 ver]은 스텝이 "턴" 단위로 쪼개지고, 각 턴마다 음원 재생 방식·스크립트 노출·
-- 상호작용 방식·학생에게 보여줄 문구까지 지정한다. 기존 4열(단계/규칙/DB참조/자유표현)만으로는
-- 원본이 손실되고, Phase 3(문항 렌더러 재편)에서 다시 임포트해야 한다. 그래서 미리 무손실로 받는다.
--
-- 전부 nullable — 시트에 해당 열이 없는 강사(윤다은 4열 구성)·common 레일은 null로 남는다.
-- 런타임(sheetStepDirective)은 아직 이 열들을 읽지 않는다. Phase 3에서 렌더러가 사용할 예정.

alter table lecture_steps
  add column if not exists turn_label     text,  -- '턴' 열 (Turn 1, Turn 2 …)
  add column if not exists section         text,  -- '── Q1 상황/주제/목적형 ──' 구분선 → 이후 스텝에 상속
  add column if not exists audio_mode      text,  -- '음원 재생/정지 방식'
  add column if not exists script_mode     text,  -- '스크립트' (노출 방식)
  add column if not exists interaction     text,  -- '상호작용 방식' (필수 수행/주관식 응답/선택 응답 …)
  add column if not exists student_prompt  text;  -- '학생에게 보여줄 질문/선택지'

comment on column lecture_steps.section is
  'P3/P4/P7 레일은 하위문제(Q1/Q2/Q3)별로 반복된다. 시트의 구분선 행을 여기에 상속시켜 그룹을 보존한다.';
