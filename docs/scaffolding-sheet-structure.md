# 스캐폴딩 시트 구조 정리 (스냅샷: 2026-07-05)

> 이 문서는 Google Sheets(`AI어학원 콘텐츠`, spreadsheetId: `1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8`)의 스캐폴딩 관련 탭을 정리한 **스냅샷**입니다.
> 시트는 계속 수정되므로 실시간 반영은 되지 않습니다. 내용이 바뀌면 `scripts/dump-sheet.js`로 다시 받아서 이 문서를 수동으로 갱신하세요.
>
> ```
> node scripts/dump-sheet.js "<탭 이름>"
> ```
> → `scripts/dump/<탭 이름>.json` 에 원본 셀 값 + 병합(merge) 정보가 저장됩니다.

## 정본으로 확인된 탭

- **`[공통] 스케폴딩 기본 설계 (유형학습)`** (gid 556513163) — 유형학습(문제 풀이 코칭) 공통 설계. 995행 x 41열
- **`[공통] 스케폴딩 기본 설계 (실전문제) 수정중`** (gid 641089156) — 실전문제 공통 설계, 수정 중. 995행 x 85열
- `[윤다은 ver]`, `[이도윤 ver]` 스케폴딩 탭은 강사별 변형(수정 중) — 참고용, 정본 아님
- `스캐폴딩 설계(초안)` 탭은 다른 세대의 설계 문서("750+ 가이드학습형/실전코칭형")로, 현재 정본과 별개의 초안. DB 설계 기준에서 제외.

## `[공통] 스케폴딩 기본 설계 (유형학습)` 구조

시트는 **Part별로 5개 열씩 좌→우로 나열**되어 있습니다: LC Part1, Part2, Part3, Part4, RC Part5, Part6, Part7.

한 시트 안에 세로로 아래 표들이 순서대로 이어집니다.

### 1. 개념 정의표 (맨 위)
"AI가 따라야 할 규칙 / 문항마다 달라지는 정보(DB 참조) / AI가 자유롭게 표현 가능한 부분"이 각각 무엇을 뜻하는지 설명. Part별 유형 소개 텍스트 포함.

- **AI가 따라야 할 규칙**: 문제가 무엇이든 항상 동일 — 고정 지시문
- **문항마다 달라지는 정보 (DB 참조)**: 문제 DB에 미리 저장된 정답/근거/오답이유 — AI는 인용만 함 (할루시네이션 방지 목적)
- **AI가 자유롭게 표현 가능한 부분**: 말투/표현만 변형 가능, 내용(사실·판정기준) 자체는 불변

### 2. S1~S7 기능 유형 코드표 (전 Part 공통, 시트에 딱 1벌)

| 코드 | 기능 유형 | 역할 |
|---|---|---|
| S1 | 핵심 단서 찾기 | 사진/질문 첫 단어/빈칸 앞뒤/지문 제목 등 가장 먼저 볼 단서를 찾게 함 |
| S2 | 유형·역할 판별 | 사진유형/질문유형/빈칸유형/지문유형 등을 분류하게 함 |
| S3 | 개념 코칭 | 문제 풀이에 필요한 문법·표현·구조 개념을 짧게 설명 + 판단기준 제공 |
| S4 | 구조·흐름 파악 | 문장구조/대화흐름/지문구조/시간순서를 단계적으로 파악하게 함 |
| S5 | 정답 근거 연결 | 사진·음원·문장·지문 속 근거와 정답 선택지를 연결하게 함 |
| S6 | 오답 제거·진단 | 틀린 선택지를 제거하고 오답 원인을 표준 태그로 분류 |
| S7 | 표현 정리·전략 요약 | 빈출 표현/정답 패턴/오답 함정 정리 |

### 3. Part별 "문항 DB 필드" 표 (필드명 / 설명 / 예시)

Part마다 필드가 완전히 다름 — DB 스키마 설계 시 Part별 분기가 필요한 핵심 근거.

| Part | 주요 필드 예시 |
|---|---|
| LC P1 (사진묘사) | 사진유형, 핵심요소, 정답보기, 정답근거, 보기별 오답이유 |
| LC P2 (질문-응답) | 질문유형, 질문원문, 정답보기, 정답근거, 보기별 오답이유 |
| LC P3 (대화) | 대화초반/중반/후반 정보, 정답보기, 정답근거, 보기별 오답이유 |
| LC P4 (담화) | 담화시작/중반/후반 정보, 정답보기, 정답근거, 보기별 오답이유 |
| RC P5 (단문빈칸) | 빈칸문장, 빈칸유형, 정답보기, 정답근거(문법), 보기별 오답이유, 문법유형(강의코드 매칭) |
| RC P6 (장문빈칸) | 지문문맥, 빈칸유형, 정답보기, 정답근거(논리연결), 보기별 오답이유 |
| RC P7 (독해) | 지문유형, 지문구조정보, 정답보기, 정답근거문장, 보기별 오답이유 |

### 4. Part별 "표준 오답 태그" 표 (태그 / 의미)

오답 선택지를 표준화된 이름으로 분류. **목적: (1) AI가 오답 이유를 즉석에서 지어내지 못하게 막음 (2) 학습자별 약점 진단 데이터 축적** (동일 오류를 다른 이름으로 기록하면 패턴 분석 불가 → 태그 통일 필수).

예시: 주체혼동형, 단서미확인형, 동작-상태혼동형, 유사발음혼동형, 시점혼동형, 구조불일치형, 논리관계불일치형, 콜로케이션불일치형, 과도한추론형 등 (Part별로 세부 태그 다름)

### 5. 강의(강의별 실제 스캐폴딩 시퀀스) 표

예: `LC1강 — 인물중심 vs 사물·상태중심 vs 혼합 사진 판별 [유형코드: LC-P1-01]`, `LC3강 — 의문사 의문문 [유형코드: LC-P2-01]`, `LC7강 — 고객·직원 대화 [유형코드: LC-P3-01]`, `LC12강 — 안내방송·공지 [유형코드: LC-P4-01]`, `RC1강 — 문장구조 [유형코드: RC-P5-01]`, `RC17강 — 문맥문법 [유형코드: RC-P6-01]`, `RC19강 — 이메일·편지지문 [유형코드: RC-P7-01]` 등.

각 강의마다: **단계(S코드, 복수조합 가능 예: "S2+S3") / AI가 따라야 할 규칙(고정 텍스트) / 문항마다 달라지는 정보(DB 필드명 참조) / AI가 자유롭게 표현 가능한 부분** 4열 표.

→ 이 표가 실제 "AI 튜터가 이 강의에서 따라야 할 진행 로직" 그 자체.

## `[공통] 스케폴딩 기본 설계 (실전문제) 수정중` 구조

`유형학습` 탭과 설계 축이 다릅니다. 유형학습은 "강의 진행 순서"가 중심이고, 실전문제는 **"오답 선택 → 태그 조회 → 필요 단계만 실행"** 이 중심입니다.

핵심 원리 (시트 맨 위 문구): "문항 DB에 선택지별 오답 태그를 미리 달아두고 → 학생이 고른 오답 선택지의 태그를 불러와 → AI가 자동으로 S1/S3/S4/S5/S6/S7 중 필요한 흐름을 실행"

### 1. Part별 "오답태그별 진단 매핑" 표 (7개 Part, 옆으로 나열)

컬럼: **오답 태그 / 태그 의미 / 세부 오답 태그 / 진단 카테고리 / 학습자가 놓친 지점(진단 문구) / 필요 스캐폴딩 단계(순서) / 각 단계 제공 내용 요약 / 반복 오답 시 추가 단계**

예 (Part1): "주체·대상 불일치형" → 진단카테고리 "①핵심요소 미확인형" → 필요단계 "S1→S6→S5" → 각단계 요약 → "반복 시 S2 재학습 추가"

→ Part마다 오답 태그 이름은 다르지만 **컬럼 구조는 동일** → `wrong_answer_tags` 테이블 하나로 통합 가능 (Part를 구분 컬럼으로).

### 2. S1~S7 코드표 (유형학습과 동일, 공통 1벌)

### 3. 공통 진단 카테고리 — 7가지 (Part 무관 공통, 오답태그를 묶는 상위 분류)

| 카테고리 | 정의 | 기본 단계 패턴 | 핵심 취약점 |
|---|---|---|---|
| ① 핵심요소 미확인형 | 가장 먼저 봐야 할 단서 자체를 놓침 | S1→S6→S5 | 단서 포착 |
| ② 구조·흐름 파악 부족형 | 단서는 봤지만 전체 구조/시간순서/문단흐름 속 위치를 놓침 | S4→S6→S5 | 구조/흐름 추적 |
| ③ 개념·규칙 이해 부족형 | 판단 기준이 되는 문법·논리 규칙 자체를 모름 | S3→S4/S1→S6→S5 | 규칙 이해 |
| ④ 표면 일치 함정형 (표현일치함정형) | 발음·형태·일부 단어만 일치하는 오답에 낚임 | S6→S5 | 의미 연결 |
| ⑤ 과잉 추론형 | 지문·담화에 없는 내용을 확대 해석 | S4→S6→S5 | 명시정보 vs 추론 구분 |
| ⑥ 문맥근거 연결 실패형 | 근거는 봤으나 선택지 표현과 연결 못함 | S1→S6→S5 | 의미 연결 |
| ⑦ 연계정보 누락형 | 두 개 이상 근거(그래픽/이중·삼중지문)를 결합 못함 | S1→S4→S6→S5 | 정보 결합 |

→ **이 7개 카테고리가 사실상 Part 전체를 관통하는 마스터 분류**입니다. Part별 세부 오답태그는 전부 이 7개 중 하나에 매핑됨.

### 4. 문항/선택지 스키마 초안 (시트에 이미 예시로 제시되어 있음)

시트가 직접 제안한 컬럼 구조 (Part7 RC19강 예시):

```
question_id | option_label | is_correct | option_error_tag | 진단카테고리 | 필요스캐폴딩단계
Q001        | A            | TRUE       | 정답_직접근거      | 정답        | 정답 처리
Q001        | B            | FALSE      | 동작_오답형        | ①핵심요소미확인형 | S1→S6→S5
Q001        | C            | FALSE      | 동작_상태_혼동형    | ③개념·규칙이해부족형 | S3→S1→S6→S5
Q001        | D            | FALSE      | 동작_오답형        | ①핵심요소미확인형 | S1→S6→S5
```

→ **"한 문항 = 정답 1개 + 오답 2~3개, 각 오답 선택지마다 option_error_tag를 개별로 단다"**가 명시된 원칙. `question_options` 테이블에서 오답 선택지별로 태그를 다는 구조가 그대로 정답.

### 5. 정답 선택 시 처리 (별도 분기)

오답과 다르게 정답을 고르면 축약된 플로우: `S0(자력 풀이) → 정답 선택 → S5(근거 연결)만 축약 제시 → 종료` (S1~S4, S6, S7 생략). 단, 문항의 오답률이 높으면 S5 뒤에 S7이 선택적으로 붙는 "정답시_공통규칙"이 언급됨 → 문항별 오답률 통계가 필요하다는 뜻 (→ `question_stats` 또는 집계 뷰 필요).

### 6. 반복 오답 로직

"동일 태그 반복 시 S2/S3/S7 등 추가 단계"가 태그마다 다르게 정의되어 있음 → 학습자의 과거 오답 태그 이력을 조회해서 반복 횟수를 세야 함 → `learner_wrong_tag_log`(learner_id, question_id, option_error_tag, answered_at)가 반드시 필요.

## DB 설계 방향 (두 탭 종합, 확정 아님)

**공통/마스터 (Part 무관)**
- `step_types`: S1~S7 마스터
- `diagnostic_categories`: 진단카테고리 7종 (핵심요소미확인형 등) — 정의/기본단계패턴/핵심취약점
- `lectures`: 강의명, 유형코드(LC-P1-01 등), part, lc/rc구분

**유형학습(수업 진행) 관련**
- `lecture_steps`: 강의별 진행 단계 순서, step_type 참조(복수조합 가능, 예 "S2+S3"), 고정 규칙 텍스트, 참조 DB필드명, 자유표현 가이드

**실전문제(오답 코칭) 관련 — 이쪽이 훨씬 구체적인 스키마 예시를 이미 제공함**
- `wrong_answer_tags`: part, 오답태그명, 태그의미, 세부오답태그, diagnostic_category_id(FK), 학습자가놓친지점 문구, 기본 스캐폴딩단계 시퀀스, 각단계요약, 반복시추가단계
- `questions`: question_id, lecture_id(FK), part, 문항 원본 내용(Part별로 달라서 JSONB 유력 — 사진/음원/지문/빈칸문장 등)
- `question_options`: question_id(FK), option_label, is_correct, option_error_tag(FK → wrong_answer_tags, 정답인 경우 null 또는 "정답_직접근거")
- `learner_answer_log`: learner_id, question_id, selected_option_label, answered_at — 반복오답 판정 + 오답률 통계 집계의 기반
- 문항별 오답률 통계는 테이블이 아니라 `learner_answer_log` 기반 뷰(view)로 계산하는 게 더 정확 (정답 시 S7 추가 여부 판단용)

**Part별 필드 다양성 처리**: `questions.content JSONB`로 유연하게 가되, 최소한 `part`, `lecture_id`, `correct_option_label`은 정규 컬럼으로 고정 — 검색/조인 성능과 일관성 확보.

## 신규 "문항 입력" 시트 설계 (콘텐츠팀이 실제 문항을 채우는 용도, 주기적 동기화 대상)

Part별 7개 탭(`문항입력_P1`~`문항입력_P7`), **한 행 = 문항 1개의 선택지 1개**로 설계.

### 공통 컬럼 (7개 탭 전부 동일, 항상 앞쪽)

| 컬럼명 | 설명 |
|---|---|
| `question_id` | 문항 고유 ID (예: `LC-P1-01-Q001`) |
| `lecture_code` | 강의 유형코드 (예: `LC-P1-01`) |
| `difficulty` | 난이도 (선택, 상/중/하) |
| `option_label` | 선택지 라벨 (A/B/C/D) |
| `option_text` | 선택지 원문 |
| `is_correct` | 정답 여부 (TRUE/FALSE) |
| `option_error_tag` | 오답 태그명 (정답 행은 공란) — `wrong_answer_tags` 마스터의 태그명과 일치해야 함 |
| `option_explanation` | 보기별 오답 이유 텍스트 (오답 행에 채움) — 시트 설계의 "보기별 오답 이유". AI는 이걸 인용만 함 |
| `correct_evidence` | 정답 근거 (정답 행에만 채움) |
| `notes` | 비고 (선택) |

### Part별 전용 컬럼 (문항 단위 정보, 선택지 행마다 반복 입력)

| Part | 전용 컬럼 |
|---|---|
| P1 사진묘사 | `photo_type`, `key_elements`, `image_url`, `audio_url`, `stage`, `question_number` |
| P2 질문응답 | `question_type`, `question_text` |
| P3 대화 | `dialogue_open`, `dialogue_mid`, `dialogue_end` |
| P4 담화 | `talk_open`, `talk_mid`, `talk_end` |
| P5 단문빈칸 | `blank_sentence`, `blank_type`, `grammar_point` |
| P6 장문빈칸 | `passage_context`, `blank_type` |
| P7 독해 | `passage_type`, `passage_structure`, `evidence_sentence` |

예) `문항입력_P1` 헤더 행: `question_id, lecture_code, difficulty, photo_type, key_elements, image_url, audio_url, stage, question_number, question_text, option_label, option_text, is_correct, option_error_tag, option_explanation, correct_evidence, notes`

이 탭들이 실제로 "주기적 동기화" 파이프라인의 소스가 됨. 마스터 데이터(`[공통]` 탭)는 자주 안 바뀌므로 1회성 import로 처리.

> **사진/음원 문항 지원 (2026-07-07 추가)**: `sync-questions.js`는 공통 컬럼을 제외한 모든 컬럼을 `content` JSONB에 그대로 넣으므로, 시트에 `image_url`·`audio_url`·`stage`(실전=`practice`)·`question_number` 컬럼만 추가하면 코드 수정 없이 그 값들이 content에 반영된다. 단 **음원 mp3 파일 생성은 별도**(`scripts/gen_part1_practice_audio.js`) — 시트엔 경로 문자열만 넣는다. Part1 12문항(LC-P1-01/02, 유형 Q001~3 + 실전 P001~3)은 이 컬럼들로 시트에 backfill되어 시트가 정본 소스가 됨.

**별도 스프레드시트로 생성함** (원본 `AI어학원 콘텐츠` 시트는 건드리지 않음):
- URL: https://docs.google.com/spreadsheets/d/1VUGfsCvqvg1QNN9QTISfJWMUtPPim2Cz04KHO190fpY/edit
- spreadsheetId: `1VUGfsCvqvg1QNN9QTISfJWMUtPPim2Cz04KHO190fpY`
- 생성 스크립트: `scripts/create-question-sheet.js` (재실행 시 새 시트가 또 생기므로 주의 — 필요하면 스크립트 수정해서 기존 ID에 탭만 추가하는 방식으로 바꿀 것)

## 구현 현황 및 주의사항 (2026-07-05 검토 완료)

### 적용된 마이그레이션
- `supabase/migrations/0001_scaffolding_schema.sql` — 테이블 7개 생성
- `supabase/migrations/0002_rls_and_option_explanation.sql` — RLS 활성화 + `question_options.option_explanation` 추가

### RLS 정책 (검증 완료)
- 마스터/콘텐츠 테이블: anon은 **읽기만** 가능. 쓰기/삭제는 차단 (curl로 실증 확인).
- `learner_answer_log`: anon insert/select 허용 — **auth 도입 시 `learner_id = auth.uid()` 조건으로 좁힐 것 (TODO)**.
- 관리 스크립트(`scripts/*.js`)는 postgres 역할 직접 접속이라 RLS 우회 — 영향 없음.

### 데이터 주의사항
- **복합 단계 표기**: 시트 원문에 "S1/S2", "S4/S1" 같은 "둘 중 하나" 표기가 있음. DB에도 그대로 저장됨
  (P3 "의도·패러프레이징 불일치형"의 `S1/S2`, D3 카테고리의 `S4/S1`).
  → **스캐폴딩 실행 코드는 `/`가 포함된 단계를 만나면 문맥에 맞는 쪽을 선택하도록 처리해야 함.**
- 샘플 문항 `LC-P1-01-Q001`의 선택지 D는 시트에 없는 테스트용 placeholder (notes에 명시됨).
- Part6 강의가 2개뿐인 것은 시트가 "수정중"이라 그런 것 — 시트 갱신 시 `import-master-data.js` 재실행.

### 스크립트 목록
| 스크립트 | 용도 |
|---|---|
| `scripts/dump-sheet.js "<탭이름>"` | 원본 시트 탭을 JSON으로 덤프 |
| `scripts/run-migration.js <sql파일>` | 마이그레이션 실행 (`SUPABASE_DB_URL` 필요) |
| `scripts/import-master-data.js` | 마스터 데이터 upsert (시트 갱신 시 재실행 가능) |
| `scripts/seed-sample-question.js` | 샘플 문항 시드 |
| `scripts/update-question-sheet-headers.js` | 문항입력 시트 헤더 갱신 |
| `scripts/populate-question-sheets.js` | 앱(rcData.ts)에 있던 실제 문항을 문항입력 시트에 기입 (1회성 이관용) |
| `scripts/sync-questions.js` | **문항입력 시트 → DB 동기화** (검증 포함, 재실행 안전. 이후 Cloud Function화 대상) |
| `scripts/verify-tables.js` | 테이블 목록 확인 |

### 현재 DB에 들어있는 실제 문항 (2026-07-05)

| Part | 문항 수 | 출처 |
|---|---|---|
| P1 | 1 (LC-P1-01-Q001) | 스캐폴딩 시트 예시 문항 |
| P5 | 8 (수동태·시제·품사·전치사·어휘·접속사·수일치·관계대명사 각 1) | 앱 rcData.ts P5_QUESTIONS |
| P6 | 4 (재택근무 정책 메모 지문, 빈칸 4개) | 앱 rcData.ts P6_PASSAGES |
| P7 | 4 (Greenwood 광고 지문) | 앱 rcData.ts P7_PASSAGES |

**주의**: 오답 선택지의 태그 배정은 초기 배정(Claude 판단)이므로 콘텐츠팀 검수 필요. 문항의 원천 데이터는 문항입력 시트이며, 시트 수정 후 `sync-questions.js` 재실행하면 DB에 반영됨.

## TODO

- [x] `[공통] 스케폴딩 기본 설계 (실전문제) 수정중` 탭 구조 파악
- [x] 신규 문항 입력 시트 컬럼 구조 설계 + 탭 7개 생성 (option_explanation 포함)
- [x] Supabase 마이그레이션 — 스키마(0001) + RLS/보완(0002)
- [x] 마스터 데이터 import (S1~S7 7건, 진단카테고리 7건, 강의 42건, 오답태그 42건)
- [x] 샘플 문항 1건 + 선택지 4건, 오답→태그→카테고리→단계 조인 검증
- [x] 문항 입력 시트 → Supabase 동기화 스크립트 (`sync-questions.js`)
- [x] 실제 문항 20건(P1/P5/P6/P7) 시트 기입 + DB 동기화 + 코칭 조인 검증
- [x] **튜터 엔진(/api/tutor) DB 전환** — AI 강사(ElevenLabs)가 말하는 사실은 전부 DB에서 옴
- [x] 태그 기반 실전 코칭 모드 구현 (S0 자력풀이 → 오답 태그 조회 → 단계 시퀀스, 반복 오답 시 추가 단계) — e2e 검증 완료
- [x] learner_answer_log 실제 기록 연동
- [x] 복합 단계 표기("S1/S2") 처리 (앞 코드로 step_types 조회, 표기는 원문 유지)
- [x] 화면 UI DB 전환 — 문항 표시 화면 8개 라우트가 DB에서 렌더 (하단 참고)
- [x] sync-questions.js를 GCP Cloud Function + Cloud Scheduler로 이전 (주기적 자동 동기화, 하단 참고)
- [ ] 손질 레일(TUTOR_RAILS)을 lecture_steps 테이블로 이관 (유형학습 설계 확정 후)
- [ ] 오답 태그 초기 배정 콘텐츠팀 검수
- [ ] auth 도입 시 learner_answer_log RLS 정책 강화

## GCP 자동 동기화 파이프라인 (2026-07-05)

```
Cloud Scheduler (매일 03:00 KST, job: sync-questions-daily)
      ↓ OIDC 인증 (scheduler-invoker 서비스 계정)
Cloud Function "sync-questions" (asia-northeast3, gen2, node20)
      ↓ Sheets API 읽기 (id-sheet-sync 서비스 계정 — 문항입력 시트에 뷰어로 공유해둠)
문항입력 시트 (7개 탭)
      ↓ scripts/sync-questions.js와 동일 로직으로 검증 후 upsert
Supabase DB (questions / question_options)
```

- 프로젝트: `aiacademy-496323` (Alacademy)
- 함수 소스: `gcp/sync-questions-fn/index.js` (scripts/sync-questions.js의 클라우드 버전 — 인증만 로컬 OAuth 대신 서비스 계정 ADC 사용)
- 함수 URL: `https://asia-northeast3-aiacademy-496323.cloudfunctions.net/sync-questions` (인증 필요, `--no-allow-unauthenticated`)
- 서비스 계정 2개 (역할 분리):
  - `id-sheet-sync@aiacademy-496323.iam.gserviceaccount.com` — 함수 실행 신원, 시트 읽기 권한(시트 공유로 부여, GCP IAM 아님)
  - `scheduler-invoker@aiacademy-496323.iam.gserviceaccount.com` — 스케줄러가 함수를 호출할 때 쓰는 신원 (run.invoker 역할만 보유)
- 환경변수(`SUPABASE_DB_URL`, `QUESTION_SPREADSHEET_ID`)는 `gcp/sync-questions-fn/env.yaml`로 배포 시 주입, 이 파일은 gitignore 처리됨 (레포에 없음 — 재배포 시 새로 만들어야 함)
- 수동 실행: `gcloud functions call sync-questions --region=asia-northeast3` 또는 `gcloud scheduler jobs run sync-questions-daily --location=asia-northeast3`
- 로그 확인: `gcloud functions logs read sync-questions --region=asia-northeast3 --gen2`

## 화면 UI DB 전환 (2026-07-05)

`src/data/db/questionStore.ts` — 클라이언트용 문항 스토어. DB 행을 각 화면의 기존 데이터 모양(Part7Set / P6Passage / P7Passage / P5Question / words+blankIndex)으로 변환하는 어댑터 + `useDbQuestions` 훅. **DB 로드 실패 시 기존 하드코딩 데이터로 폴백** (데모 안전).

전환된 화면: `part5-blank`(수업+실전 4문항), `part6-reading`, `part7-ai`, `part7-reading`(수업 세트+실전 지문), `part7-convai`, `part7-typecast`, `my-learning/part/p5·p6·p7`. 스크립트 수업(Screen0~5, Part7Screen의 P7_TURNS 대사)은 대본 기반이라 문항만 DB, 대사는 코드 유지.

DB 문항 현황: 23문항 (P1 1개 / P5 13개: 유형별 8 + 수동태 수업 1 + 실전 3 + Q001 / P6 4개 / P7 6개: Greenwood 4 + 자동차광고 147·148). `question_number`(표시용 번호)가 content JSONB에 포함됨.

## 튜터 엔진 DB 연동 구조 (2026-07-05)

```
학생 발화 → ElevenLabs 에이전트(음성/말투만 담당)
              ↕ contextual update
         /api/tutor (튜터 엔진 — 흐름·채점·단계 소유)
              ↕
         Supabase DB (문항·보기·정답·근거·오답태그·코칭단계·답안로그)
```

- `src/lib/tutorDb.ts`: DB 로더 (문항+선택지+태그+진단카테고리 조인, 답안 기록, 동일태그 반복 카운트)
- `/api/tutor` 두 모드:
  - **rail 모드**: `TUTOR_RAILS`(tutorContent.ts)에 손질 레일이 있는 문항 (RC-P7-03-Q006, RC-P5-08-Q002). 사실은 DB, 진행 순서·힌트·채점 키워드는 코드.
  - **tag 모드**: 그 외 모든 DB 문항. 시트 실전문제 설계 그대로 — S0 자력풀이 → 정답: S5 축약 종료 / 오답: 태그의 default_step_sequence 실행, 동일 태그 반복 시 repeat_extra_step 단계 추가(S2/S3는 앞에, 나머지는 뒤에).
- legacy questionNumber(148, 5008)는 서버에서 question_code로 자동 매핑. DB 접근 불가 시 기존 하드코딩 폴백.
- 학생 답안은 tag 모드에서 learner_answer_log에 자동 기록 (demo 학생은 고정 UUID 사용).
