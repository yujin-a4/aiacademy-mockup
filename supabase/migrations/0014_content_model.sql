-- 0014: 콘텐츠 모델 (STEP 3) — docs/db-restructure-plan.md §7 STEP 3
--
-- 문제(실측 2026-07-28):
--   questions.content 가 지문에 대해 가진 건 문자열 하나뿐이다.
--     Part6 → content.passage_context (장문 1덩어리)
--     Part7 → content.passage_text    (지문 1덩어리)
--   그래서 표·대화·이메일 메타·문장 단위를 담을 자리가 없다.
--   → Part 2·3·4 문항이 DB에 0개인 건 "안 넣은" 게 아니라 **넣을 데가 없어서**다.
--     P2는 질문 발화 + 응답 3개 음원, P3·P4는 화자 있는 스크립트 N문장 + 시각자료(표)가 필요하다.
--   그리고 같은 지문이 문항 수만큼 중복 저장돼 있다 (17행 → 실제 지문 6개).
--
-- 이 마이그레이션이 하는 일
--   (A) passages / passage_sentences — 지문을 문장 단위로. 표·대화·메타는 jsonb
--   (B) passage_type_aliases         — 시트 원문 표기 흔들림 → kind (STEP 2와 같은 방식)
--   (C) question_types + 17종 시드   — **레일 뼈대 수 기준**(강의 수 아님). 실측 근거는 아래
--   (D) questions/question_options 컬럼 추가 + 크론 생존용 트리거
--
-- ⚠️ 크론과의 관계 — 이게 이 파일의 설계 제약이다.
--    매일 03:00 KST gcp/sync-questions-fn 이 시트에서 questions 를 upsert 한다.
--    그 upsert 의 SET 절은 lecture_id·part·difficulty·content 뿐이라
--    여기서 추가하는 컬럼(passage_id·question_type_id·display_order)은 **덮이지 않는다**.
--    단 question_options 는 매번 delete+insert 라 display_order 가 밤마다 날아간다.
--    → 트리거로 채운다(§D). 함수 배포 권한 없이도 값이 유지되게.
--    같은 이유로 content 의 표기 흔들림(광고·홍보문/광고)은 **DB에서 고치지 않는다**.
--    고쳐도 다음 새벽에 되돌아간다. 별칭표로 해석한다(§B).

begin;

-- =========================================================
-- (A) 지문 — passages / passage_sentences
-- =========================================================
-- kind 는 src/data/typeLearning/types.ts 의 PassageDoc['kind'] 와 1:1이어야 한다.
-- 거기에 LC 3종(utterance·dialogue·talk)을 더한다. Part 2·3·4를 담는 게 이번 STEP의 목적이라
-- 그 셋이 없으면 목적이 달성되지 않는다. (types.ts 도 같은 커밋에서 확장한다)
create table if not exists passages (
  id           bigserial primary key,
  passage_code text unique,                -- 'RC-P7-03-PSG1'. 시트 지문 탭의 키가 될 자리
  kind         text not null
    check (kind in ('text','email','notice','ad','article','chat','table','form',
                    'utterance','dialogue','talk')),
  title        text,
  meta         jsonb,                      -- 이메일 To/From/Subject 등 [{k,v}]
  body         jsonb,                      -- 문장형이 아닌 것: {table:{headers,rows}} / {chat:[...]}
  created_at   timestamptz not null default now()
);

comment on table passages is
  '지문 1개 = 표·대화·이메일·장문 하나. 문장 단위는 passage_sentences. 문항은 questions.passage_id 로 붙는다.';
comment on column passages.kind is
  'PassageDoc[kind] + LC 3종. utterance=P2 질의 발화 / dialogue=P3 대화 / talk=P4 담화';
comment on column passages.body is
  '문장으로 안 쪼개지는 것만. 표는 {"table":{"headers":[],"rows":[[]]}}, 채팅은 {"chat":[{speaker,time,text}]}';

create table if not exists passage_sentences (
  id         bigserial primary key,
  passage_id bigint not null references passages(id) on delete cascade,
  seq        smallint not null,
  en         text not null,
  ko         text,                          -- 직독직해. 지금은 전부 null (DB에 문장 해석이 없다)
  speaker    text,                           -- LC 화자 'W'/'M'/'M2'
  blank_no   smallint,                       -- P6: 이 문장에 든 빈칸 번호
  audio_url  text,                            -- 문장 구간 재생용 mp3
  unique (passage_id, seq)
);

comment on column passage_sentences.ko is
  '직독직해 해석. 지금 전부 null — 시트에 해석 열이 생기면 여기로 들어온다(fromDb.ts 한계 주석과 같은 자리).';

-- =========================================================
-- (B) 지문 종류 별칭 — 시트 원문 → kind
-- =========================================================
-- 실측: passage_type 이 '광고·홍보문' 6 / '광고' 2 / null 1 로 갈려 있다.
-- content 는 크론이 매일 덮으므로 DB에서 값을 통일하지 않는다. 읽을 때 이 표로 해석한다.
create table if not exists passage_type_aliases (
  raw          text primary key,            -- 시트 원문 그대로
  kind         text not null,
  needs_review boolean not null default false,
  note         text
);

insert into passage_type_aliases (raw, kind, needs_review, note) values
  ('광고·홍보문', 'ad',      false, '6행. 시트 표준 표기로 이것을 권장'),
  ('광고',        'ad',      true,  '2행. 같은 강의(RC-P7-03) 안에서 표기가 갈렸다 → 시트에서 통일할 것'),
  ('이메일',      'email',   false, null),
  ('편지',        'email',   false, null),
  ('공지문',      'notice',  false, null),
  ('안내문',      'notice',  false, null),
  ('회람',        'notice',  false, null),
  ('기사',        'article', false, null),
  ('보도문',      'article', false, null),
  ('문자',        'chat',    false, null),
  ('채팅',        'chat',    false, null),
  ('메시지',      'chat',    false, null),
  ('양식',        'form',    false, null),
  ('일정표',      'form',    false, null),
  ('영수증',      'form',    false, null),
  ('대화',        'dialogue',false, 'Part3'),
  ('담화',        'talk',    false, 'Part4'),
  ('질의응답',    'utterance',false,'Part2')
on conflict (raw) do update
  set kind = excluded.kind, needs_review = excluded.needs_review, note = excluded.note;

-- =========================================================
-- (C) 문항 유형 — 레일 뼈대 수 기준 시드
-- =========================================================
-- 시드 근거(실측 쿼리): lecture_steps 에서 instructor_code='lee_doyun' 인 강의별
-- step_code 순서열을 만들어 distinct 를 센다. 강의 43개 → 뼈대 17종.
--   P1 2 · P2 2 · P3 1 · P4 1 · P5 6 · P6 1 · P7 4
-- Part5 가 16강인데 6종인 것이 계획서 §7 STEP 3 이 말한 그 숫자다.
--
-- ※ S코드로 정규화하면(별칭 적용) 17 → 13으로 더 줄어든다. 그래도 17로 시드한다.
--    계획서 §8: "레일 뼈대 수로 시드하고 나중에 합쳐 나간다". 합치는 건 UPDATE 한 줄이지만
--    쪼개는 건 데이터 재배정이라 비싸다.
create table if not exists question_types (
  id            bigserial primary key,
  part          smallint not null,
  type_code     text not null unique,
  name          text not null,
  description   text,
  -- STEP 4에서 lecture_items 가 생기면 그쪽이 정본이 된다. 그때까지 문항 배정용 임시 매핑.
  lecture_codes text[] not null default '{}'
);

comment on column question_types.lecture_codes is
  '임시. STEP 4의 lecture_items(question_type_id)가 정본이 되면 제거한다. 지금은 questions 배정 트리거가 이걸 본다.';

insert into question_types (part, type_code, name, description, lecture_codes) values
  -- Part 1 — 뼈대 2 (S3 코칭 대상이 갈린다: 사진 유형별 / 문제별)
  (1, 'P1-PHOTO-SUBJECT', '인물·사물 중심 판별',
      '레일: S1 관찰영역 → S3 사진 유형별 표현 → 선택지 4개 청취(S6/S5) → S7', '{LC-P1-01}'),
  (1, 'P1-PHOTO-ACTION',  '동작·상태 표현 구분',
      '레일: S1 관찰영역 → S3 문제별 표현 → 선택지 4개 청취(S6/S5) → S7', '{LC-P1-02}'),
  -- Part 2 — 뼈대 2 (첫 청취 대상이 질문이냐 발화냐)
  (2, 'P2-QUESTION',  '의문사·일반·기타 의문문',
      '레일: 질문 1차 청취(S0) → S1 → 질문 쉐도잉 → S3 응답 예측 → 선택지 청취 → S6×3 → S7',
      '{LC-P2-01,LC-P2-02,LC-P2-03}'),
  (2, 'P2-STATEMENT', '평서문·간접 의문문·우회 응답',
      '레일: 발화 1차 청취(S0) → S1 → 발화 쉐도잉 → S3 응답 예측 → 선택지 청취 → S6×3 → S7',
      '{LC-P2-04}'),
  -- Part 3·4 — 각 뼈대 1 (강의 5개가 같은 레일)
  (3, 'P3-DIALOGUE', '대화 3문항 세트',
      '레일: S1 → S2 → S3 → 전체 음원+학생 풀이(S0) → 정답·스크립트 공개(S5) → Q별 S2+S5 ×3 → S7',
      '{LC-P3-01,LC-P3-02,LC-P3-03,LC-P3-04,LC-P3-05}'),
  (4, 'P4-TALK', '담화 3문항 세트',
      '레일: P3와 동일 뼈대. 화자가 1명이라는 점만 다르다',
      '{LC-P4-01,LC-P4-02,LC-P4-03,LC-P4-04,LC-P4-05}'),
  -- Part 5 — 뼈대 6
  (5, 'P5-STRUCTURE-FIRST', '구조 먼저 · 유형·역할 판별',
      '레일: S1 → S3 → S4 구조 파악 → S2 유형·역할 판별 → S6 → S5 → S7',
      '{RC-P5-01,RC-P5-02,RC-P5-03,RC-P5-04,RC-P5-05,RC-P5-06,RC-P5-07,RC-P5-08}'),
  (5, 'P5-PATTERN', '패턴 단서형',
      '레일: S1 → S3 → S1 패턴 단서 → S2 → S6 → S5 → S7 (to부정사·동명사)',
      '{RC-P5-09}'),
  (5, 'P5-TYPE-CRITERIA', '유형별 기준 이중 코칭',
      '레일: S1 → S3 → S2 → S3 유형별 기준 → S6 → S5 → S7 (분사·분사구문)',
      '{RC-P5-10}'),
  (5, 'P5-TYPE-FIRST', '유형 판별 먼저 · 구조 확인',
      '레일: S1 → S3 → S2 유형 판별 → S4 구조 파악 → S6 → S5 → S7',
      '{RC-P5-11,RC-P5-12,RC-P5-14,RC-P5-15}'),
  (5, 'P5-STRUCTURE-FIRST-REL', '구조 먼저 · 유형 판별(관계사)',
      'P5-STRUCTURE-FIRST 와 S2 표기만 다르다(유형·역할 판별 / 유형 판별) → **D6 병합 후보**',
      '{RC-P5-13}'),
  (5, 'P5-VOCAB', '어휘형 빈칸',
      '레일: S2 → S3 → S1 → S4 구조·문맥 파악 → S6 → S5 → S7 (유일하게 S2로 시작)',
      '{RC-P5-16}'),
  -- Part 6 — 뼈대 1
  (6, 'P6-CLOZE', '장문 빈칸',
      '레일: S4 지문 읽기 → 빈칸 4개 각각 (S2+S3+S1 / S5+S6) → 미확정 빈칸 회수 → S7. 아이템 = 지문 1개',
      '{RC-P6-01,RC-P6-02}'),
  -- Part 7 — 뼈대 4
  (7, 'P7-SINGLE', '단일 지문',
      '레일: S1 질문 먼저 → S2+S3 지문 유형 → S4 직독직해 → Q별 S5①/S5②+S6 → S7',
      '{RC-P7-01,RC-P7-02,RC-P7-03,RC-P7-04,RC-P7-05}'),
  (7, 'P7-FORM', '양식·일정표',
      'P7-SINGLE 과 S4만 다르다: 직독직해가 아니라 "정보 위치 스캔 + 직독직해"',
      '{RC-P7-06}'),
  (7, 'P7-DOUBLE', '이중 지문',
      '레일: 지문마다 S4 → 해당 지문 근거 문제 처리 를 반복하고, 마지막에 연계 문항',
      '{RC-P7-07}'),
  (7, 'P7-TRIPLE', '삼중 지문',
      'P7-DOUBLE 과 같은 구조가 3바퀴',
      '{RC-P7-08}')
on conflict (type_code) do update
  set part = excluded.part, name = excluded.name,
      description = excluded.description, lecture_codes = excluded.lecture_codes;

-- =========================================================
-- (D) questions / question_options 확장
-- =========================================================
alter table questions
  add column if not exists question_type_id bigint references question_types(id),
  add column if not exists passage_id       bigint references passages(id),
  add column if not exists display_order    smallint;   -- 지문 안에서 몇 번째 문항인가

alter table question_options
  add column if not exists display_order    smallint;   -- 화면에 그릴 순서 (A=1,B=2…)

create index if not exists questions_passage_idx on questions (passage_id, display_order);
create index if not exists questions_type_idx    on questions (question_type_id);

comment on column questions.display_order is
  '지문 내 문항 순서. content->>''question_number'' 는 교재 원문 번호(147 같은 값)라 정렬 키로 못 쓴다.';
comment on column question_options.display_order is
  '보기 표시 순서. 정답을 "배열 인덱스"로 전달하던 화면 어댑터를 label 기준으로 바꾸기 위한 근거.';

-- 기존 행 채우기 --------------------------------------------------
-- 보기 순서: option_label 알파벳 순 (지금 화면 어댑터가 하던 정렬과 동일 → 회귀 없음)
update question_options o
   set display_order = s.rn
  from (select id, row_number() over (partition by question_id order by option_label) rn
          from question_options) s
 where s.id = o.id and o.display_order is distinct from s.rn;

-- 문항 유형: 강의코드 매핑으로 일괄 배정
update questions q
   set question_type_id = t.id
  from lectures l, question_types t
 where l.id = q.lecture_id
   and l.lecture_code = any(t.lecture_codes)
   and q.question_type_id is distinct from t.id;

-- 크론 생존 트리거 -------------------------------------------------
-- question_options 는 매일 delete+insert 된다. 시트/함수가 값을 안 주더라도 여기서 채운다.
-- (gcp 함수도 같은 커밋에서 display_order 를 명시적으로 넣도록 고쳤다. 배포되면 이 트리거는 안전망.)
create or replace function fill_option_display_order() returns trigger
language plpgsql as $$
begin
  if new.display_order is null then
    select coalesce(max(display_order), 0) + 1 into new.display_order
      from question_options where question_id = new.question_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_option_display_order on question_options;
create trigger trg_option_display_order
  before insert on question_options
  for each row execute function fill_option_display_order();

-- questions 는 upsert 라 기존 행의 question_type_id 는 살아남지만, 새 강의 문항은 null 로 들어온다.
create or replace function fill_question_type() returns trigger
language plpgsql as $$
begin
  if new.question_type_id is null then
    select t.id into new.question_type_id
      from question_types t
      join lectures l on l.id = new.lecture_id
     where l.lecture_code = any(t.lecture_codes)
     limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_question_type on questions;
create trigger trg_question_type
  before insert or update on questions
  for each row execute function fill_question_type();

-- =========================================================
-- (E) RLS — 0012 방침과 동일: 읽기만 공개, 쓰기는 postgres 역할만
-- =========================================================
alter table passages             enable row level security;
alter table passage_sentences    enable row level security;
alter table passage_type_aliases enable row level security;
alter table question_types       enable row level security;

drop policy if exists "read for all" on passages;
create policy "read for all" on passages for select using (true);
drop policy if exists "read for all" on passage_sentences;
create policy "read for all" on passage_sentences for select using (true);
drop policy if exists "read for all" on passage_type_aliases;
create policy "read for all" on passage_type_aliases for select using (true);
drop policy if exists "read for all" on question_types;
create policy "read for all" on question_types for select using (true);

revoke insert, update, delete, truncate on
  passages, passage_sentences, passage_type_aliases, question_types
  from anon, authenticated;
grant select on
  passages, passage_sentences, passage_type_aliases, question_types
  to anon, authenticated;

commit;
