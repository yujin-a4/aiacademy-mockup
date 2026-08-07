-- 0027: 지문 세트 (이중·삼중 지문) — 0014 콘텐츠 모델의 빈 구멍을 메운다
--
-- 문제:
--   Part 7 은 8강 중 2강(RC-P7-07 이중 · RC-P7-08 삼중)이 **지문 여러 개를 한 세트**로 푼다.
--   그런데 0014 는 `questions.passage_id` 하나뿐이라 지문 2·3번을 어디에도 붙일 수 없었다.
--   실제로 교재 적재기(scripts/load-rc-questions.js)가 그 두 강의만 못 넣고 있었다.
--
--   화면은 이미 준비돼 있다 — ContentView 의 PassageTabs 가 지문 여러 개를 탭으로 그린다.
--   막힌 건 DB 와 어댑터뿐이었다.
--
-- 무엇을 하나
--   지문 행은 그대로 **지문 하나당 한 행**으로 두고(문장·메타가 각자 있어야 하므로),
--   같은 세트라는 사실만 `set_code` 로 묶는다. 문항은 세트의 **첫 지문**을 가리킨다.
--     RC-P7-07-PSG1-1  set_code=RC-P7-07-SET1  set_seq=1   ← questions.passage_id 는 여기
--     RC-P7-07-PSG1-2  set_code=RC-P7-07-SET1  set_seq=2
--
--   왜 join 테이블(question_passages)이 아닌가: 문항은 세트 전체를 보고 푸는 것이지
--   지문을 골라 붙이는 게 아니다. 연계 문항은 애초에 두 지문을 다 본다.
--   조인표를 두면 "이 문항은 지문 1·2 둘 다" 를 매번 써 넣어야 하고, 화면은 결국 세트 전체를 그린다.
--
-- 읽는 쪽: src/data/db/questionStore.ts 가 `set_code` 로 형제 지문을 한 번 더 읽어 붙인다.

begin;

alter table passages
  add column if not exists set_code text,
  add column if not exists set_seq  smallint not null default 1;

comment on column passages.set_code is
  '이중·삼중 지문 묶음 키. 단일 지문은 null. 같은 값을 가진 행들이 한 세트다(순서는 set_seq).';
comment on column passages.set_seq is
  '세트 안 순서(지문 1·2·3). 단일 지문은 1. questions.passage_id 는 set_seq=1 인 행을 가리킨다.';

create index if not exists passages_set_idx on passages (set_code, set_seq);

commit;
