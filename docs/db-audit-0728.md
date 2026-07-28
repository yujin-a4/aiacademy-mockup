# 스캐폴딩 DB 점검 — 비판적 분석 + 체크리스트

**작성:** 2026-07-28 · **대상:** Supabase `public` 스키마 15테이블 · **방법:** 실 DB 직접 접속(pg) + anon 키 권한 실증 + 쿼리 플랜 측정

---

## 0. 한 줄 결론

> 원하는 구조는 **`S단계 → 문항유형 → 강의`** 3층인데, DB에는 **가운데 층(문항유형)이 없고**, 맨 위층(S단계)은 **테이블은 있으나 아무도 참조하지 않는 장식**이다.
> 그래서 레일이 유형이 아니라 **강의에 붙어 있고**, 강의가 늘면 레일도 같이 는다. "강의 수만 개, 최소 장치"의 정반대.

지금 실제 구조:

```
lectures(42) ──< questions(83) ──< question_options(332)
     ↑
     ├── lecture_steps(965)            ← 강의×강사 레일 (구)
     └── rail_compositions(112) ─> rail_steps(13)   ← 부품 레일 (신, Part5만)

step_types(7)  ← 참조하는 FK 0개. 고아.
```

---

## 1. 구조 결함 (서비스기획 관점)

### 1-1. 🔴 "문항 유형"이라는 엔티티가 DB에 없다

원하는 3층 중 가운데가 통째로 없다. 유형 정보가 **네 군데에 흩어져** 있다.

| 어디 | 무엇 | 문제 |
|---|---|---|
| `src/app/type-lesson/[typeId]/page.tsx` | `t01~t15` + `DB_ANCHOR` 4개 | 코드 하드코딩. 유형 추가 = 배포 |
| `questions.content` jsonb | `photo_type` / `blank_type` / `passage_type` | 자유 텍스트, part마다 키 이름 다름 |
| `lectures.title` | "RC21강 — 광고·홍보문" | 문자열 |
| `rail_steps.name` | "S2 유형·역할 판별" | 라벨 |

실측 — Part7 유형 값: `광고·홍보문` 6건 / `광고` 2건 / `null` 1건. **같은 유형이 세 가지 표기.**
Part1: `인물 중심 사진(1인 등장)` / `인물 중심 사진(2인 이상 등장)` / `사물·풍경 사진` / `사물·상태 사진(사물/풍경)` — 뒤 둘은 같은 것으로 보이나 별개 문자열.

→ **"이 유형 문항 전부 가져와", "이 유형 레일 바꿔"가 쿼리로 불가능하다.** 유형을 강의(`lectures`)가 대신 떠맡고 있는데, 강의는 커리큘럼 42강 단위라 유형과 1:1이 아니다(RC-P7-03 한 강의 안에 지문 2개·유형표기 2종).

### 1-2. 🔴 S1~S7이 실제 구동 단위가 아니다

`step_types` 7행은 있는데 **참조하는 외래키가 하나도 없다.** `lecture_steps.step_code`는 자유 텍스트:

| 지표 | 값 |
|---|---|
| 전체 스텝 행 | 965 |
| `step_types`에 없는 값 | **692 (72%)** |
| distinct step_code | **151종** |
| S코드 2개 이상 섞인 행 | 187 |
| S코드가 아예 없는 행 | 56 |

`wrong_answer_tags.default_step_sequence`(text[])에는 **`'S1/S2'`** 라는 토큰까지 들어 있다(배열 요소 하나로).

→ 질문 "최소한의 스캐폴딩 단계에 따라 돌아가는가?" 에 대한 답: **아니오. 지금은 151개 자유 라벨에 따라 돈다.** "S6 오답제거 방식을 전 강의에서 바꿔보자"를 SQL로 못 한다.

### 1-3. 🔴 레일이 두 벌 살아있고, 어느 쪽을 쓸지는 코드가 정한다

Part5 `lee_doyun` 레일은 **두 테이블에 동시에** 존재한다:

| 소스 | 강사 | 행수 | 강의 |
|---|---|---|---|
| `rail_compositions` | lee_doyun | 112 | 16 |
| `lecture_steps` | lee_doyun | 112 | 16 |
| `lecture_steps` | common | 112 | 16 |
| `lecture_steps` | yun_daeun | 96 | 16 |

`useDbLectureSteps`는 composition을 먼저 본다. 그런데 시트 임포터 `import-instructor-rails.js`는 **`lecture_steps`만 갱신**한다.

→ **콘텐츠팀이 시트에서 Part5 이도윤 레일을 고치면 화면에 반영되지 않는다. 경고도 없이.**
"개발자 없이 스캐폴딩 실험" 목표를 정면으로 깨는 자리. 부품화의 대가로 생긴 부작용이 아직 안 닫혔다.

### 1-4. 🔴 실험 결과를 스캐폴딩에 붙일 수 없다 (가장 큰 기획 결함)

`learner_answer_log` 전체 컬럼:

```
id, learner_id, question_id, selected_option_label, is_correct, answered_at
```

**없는 것:** 어떤 강사로 / 어떤 레일로 / 몇 번째 턴에서 / 어떤 S단계 스캐폴딩을 받고 그 답을 냈는지.
게다가 `lecture_steps`·`rail_steps`·`rail_compositions`·`questions` 어디에도 `updated_at`/`version`이 없고, 임포터는 **delete + insert**로 갈아엎는다.

→ 시트를 한 번 고치는 순간, **과거 로그가 어떤 레일에 대한 것이었는지 영구 소실**된다.
이 레포의 존재 이유가 H3(스캐폴딩이 실제로 작동하는가) 검증인데, **그 검증에 필요한 최소 데이터가 스키마에 없다.** 나머지 항목은 리팩터링이지만 이건 목적 미달이다.

부수 문제: `normalizeLearnerId()`가 비로그인 세션을 전부 `11111111-…-111111111111` 하나로 뭉갠다. 로그 1,200행 / 학습자 9명인데 그 중 하나가 이 데모 UUID(auth.users에 없는 유일한 1건).

### 1-5. 🟡 부품화가 절반만 됐다

| 항목 | 실측 |
|---|---|
| `rail_steps` 부품 | 13개 (Part5만) |
| 그 중 `tutor_directive` 채워진 것 | **0개** |
| 그 중 `student_prompt` 채워진 것 | 8개 |
| `rail_compositions` 112행 중 `tutor_directive_seed`(강의별 손글씨) | **112행 전부** |
| `student_prompt_override` | 0 (👍 이건 좋음) |

→ **강사 지시문은 부품 공유 이득이 0.** 112행 전부 강의별 손글씨로 돈다. 부품이 껍데기이고 내용은 여전히 강의마다 따로다.

추가로:
- `P5-07` "S2 유형·역할 판별" vs `P5-08` "S2 유형 판별" — 상호작용 동일(주관식 응답), 이름만 다른 같은 부품. `name`이 자유 텍스트라 이런 중복이 계속 생긴다.
- `rail_steps.part`가 NOT NULL → **파트 간 부품 공유가 구조적으로 불가능.** "S3 개념 코칭"은 파트 무관하게 같은 일인데 7번 복제될 설계. "모든 걸 포괄하는 최소 단계"와 반대 방향.

### 1-6. 🟡 분기 조건이 데이터에 없다 (RC-P6-01은 단발 버그가 아니다)

`lecture_steps.interaction` 값 19종 중 **"또는"이 들어간 행이 66개**:

| 값 | 행수 |
|---|---|
| `선택 응답 또는 AI 진행` | **49** |
| `필수 수행 / 필기 인식 또는 주관식 응답` | 8 |
| `필수 수행 / 필기 인식 또는 선택 응답` | 6 |
| `필수 응답 / 주관식 입력 또는 음성 응답` | 4 |
| 기타 | 3 |

`fromSteps.ts:168`은 `raw.split(/또는/)[0]` — **무조건 앞것을 고른다.** 무엇을 보고 갈라야 하는지(학생 정답 여부? 반복 오답? 레벨?)가 DB 어디에도 없다.

→ 이전에 잡은 RC-P6-01 오기입은 **이 구조가 만들어낸 66개짜리 클래스의 첫 번째 사례**다. 시트를 고쳐도 나머지 65개가 남는다.

표기 흔들림도 같은 원인(enum/룩업 테이블 부재):

| 같은 뜻 | 표기 A | 표기 B |
|---|---|---|
| 쉐도잉 | `필수 수행 / 쉐도잉` (19) | `필수 수행(쉐도잉)` (15) |
| 필기 인식 | `필수 수행 / 필기 인식` (44) | `필수 수행(필기 인식)` (5) |

→ `interaction`은 **테이블로 빼야 할 1순위.**

---

## 2. SQL/인프라 결함

### 2-1. 🔴 보안: `rail_steps` / `rail_compositions`는 RLS가 꺼져 있다 — 실증 완료

`pg_class.relrowsecurity` = **false** (다른 13개 테이블은 true).
그리고 **모든 테이블이 `anon`에게 `SELECT,INSERT,UPDATE,DELETE,TRUNCATE`를 그랜트**하고 있다(Supabase 기본값, revoke 안 됨). 즉 RLS가 유일한 방어선인데 이 둘만 꺼져 있다.

브라우저에 노출되는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`로 실제 확인(행은 쓰지 않고 NOT NULL 위반으로 되돌린 프로브):

```
POST /rest/v1/rail_steps         {}  → 23502 null value in column "part"   ← 권한 통과
POST /rest/v1/rail_compositions  {}  → 23502 null value in column "lecture_id" ← 권한 통과
POST /rest/v1/questions          {}  → 42501 violates row-level security  [401] ← 차단(정상)
POST /rest/v1/lecture_steps      {}  → 42501 violates row-level security  [401] ← 차단(정상)
```

→ **누구나 스캐폴딩 레일 전체를 수정·삭제·TRUNCATE 할 수 있다.** FGI 시연 중 사고 나면 수동 재임포트.

### 2-2. 🟠 `learner_answer_log`는 남의 답안을 전부 읽을 수 있다

정책이 `read for all USING (true)`. anon 키로 조회 확인함. FGI 참가자 응답 데이터다.
`learner_id`에 `auth.users` FK도 없다.

### 2-3. 🟠 마이그레이션이 스키마 정본이 아니다

DB에 있는데 `supabase/migrations/`에 없는 테이블 **4개**: `fgi_surveys`, `fgi_survey_questions`, `fgi_responses`, `subject_choices`.
(0002가 `subject_choices`에 RLS를 거는데 그 테이블을 만드는 마이그레이션이 없다 = 손으로 만든 것.)

`user_profiles`는 컬럼 `ordinal_position`에 구멍(8·10·12 없음) = 드롭된 컬럼이 있고, 정책이 **4개 중복**:

```
'본인 프로필만 접근'  (ALL)
'Users can insert own profile'  (INSERT)
'users can insert own profile'  (INSERT)   ← 대소문자만 다른 중복
'Users can update own profile'  (UPDATE)
```

→ **마이그레이션만으로 이 DB를 재구축할 수 없다.** 캐치잇에 넘길 때 그대로 문제가 된다.

### 2-4. 🟠 조회 로직이 SQL이 아니라 브라우저 JS로 돈다

| 함수 | 지금 방식 | 문제 |
|---|---|---|
| `fetchLecturesWithQuestions` | **questions 전건**을 받아 JS `Map`으로 카운트 | 문항 수를 세려고 전체를 내려받음. 플랜 확인: `Seq Scan on questions`. 83행이라 안 보일 뿐 |
| `fetchCurriculumLectures` | 위 함수를 **또** 호출 | 전건 스캔 2회 |
| `countPriorTagWrongs` | 오답 로그 전건 → `question_id` 배열 → `question_options .in()` → **JS Map 조인** | 3 round-trip + 클라 조인. 반복오답 판정이라 문항마다 실행 |
| `fetchQuestionsBySamePassage` | **지문 전문(text)을 equality 조건**으로 그룹핑 | `passages` 테이블이 없어서 생긴 우회 |

`countPriorTagWrongs`는 SQL 조인 한 방이면 끝난다. 로그에 태그를 안 남긴 정규화 결정 때문에 생긴 비용이다.

### 2-5. 🟠 지문(passage)이 테이블이 아니라 문항의 복제 필드다

`passage_text` 보유 9행 / distinct 지문 **4개** — 즉 같은 지문이 평균 2.25회 복제 저장.
지문 오타 하나 고치려면 관련 행을 전부 고쳐야 하고, **하나라도 놓치면 그룹이 조용히 쪼개진다**(equality 조건이니까).

### 2-6. 🟡 정답이 배열 인덱스로 화면에 넘어간다

```ts
answer: q.options.findIndex((o) => o.correct)   // toP6Passage / toP7Passage / toP5Questions
```

`question_options`에 정렬 컬럼이 없어 클라이언트 `localeCompare(option_label)`로 정렬한 뒤 인덱스를 쓴다.
→ 보기 라벨 체계가 A~D를 벗어나거나 순서가 바뀌면 **정답이 바뀐다.**

### 2-7. 🟡 폴백이 데이터 오류를 삼킨다

`fetchQuestionsByCodes`는 요청 코드 중 **하나라도 없으면 `null`** 을 반환하고, 화면은 하드코딩 데이터로 조용히 되돌아간다. DB가 비어도, 틀려도, 시트 동기화가 실패해도 **화면은 멀쩡해 보인다.**
데모 안전장치로는 맞는 선택이지만 지금은 "이 화면이 DB로 도는지"를 사람이 눈으로 구분할 수 없다. (레일 쪽은 RailInspector가 커버, 문항 쪽은 무방비)

### 2-8. 🟡 제약·타입 잡다

- `questions.part`가 `lectures.part`와 중복 저장(지금 불일치 0건이지만 이를 강제하는 제약 없음)
- `stage`(수업/실전 구분)가 jsonb 안에 있음 — 인덱스도 제약도 없음. 코드 접미사 `-Q###`/`-P###`가 의미를 이중으로 나름
- `content` jsonb에 스키마 검증 없음 — Part7 `passage_structure` 8/9, `evidence_sentence` 8/9로 1건씩 빠짐
- `RC-P7-99` "데모 시뮬레이션용" 강의가 커리큘럼 테이블에 그대로 섞여 있음(`is_demo` 플래그 없음)
- `instructor_code`가 자유 텍스트, **강사 마스터 테이블 없음**. DB에는 common/yun_daeun/lee_doyun 3종뿐이고 `park`/`seo_jian`/`oh_jungja`는 TS에만 존재
- 강의 43개 중 **28개가 문항 0개**, 레일이 아예 없는 강의 1개
- `question_options.notes` — 미사용 컬럼

---

## 3. 목표 스키마 (제안)

핵심 이동 하나: **레일을 `lectures`가 아니라 `question_types`에 붙인다.**

```
step_types (S1~S7)              ← 진짜 마스터. 아래가 전부 FK로 참조
interactions (룩업)             ← '선택 응답' / 'AI 진행' / '필기 인식' … 자유 텍스트 금지
instructors (룩업)
        ↓
rail_steps (부품)               ← step_code FK, interaction_id FK, part는 NULL 허용(공용 부품)
        ↓
question_types (유형)  ← ★ 빠진 층. part + type_code + name
        ↓
type_rails (유형 × 강사 × 순서 → 부품)   ← 레일이 여기 붙는다. 강의가 늘어도 안 늘어남
        │
        └── version 컬럼 필수 (실험 결과와 묶기 위해)

lectures (커리큘럼 42강)
   └─< lecture_types (강의 = 유형들의 조합, 순서 포함)

passages ─< questions ─< question_options
questions.question_type_id → question_types    ← 유형이 쿼리 가능해짐

learning_events (턴 단위 로그)
   learner_id, question_id, type_rail_id, rail_version, step_code,
   instructor_code, turn_order, response, is_correct, latency_ms, at
```

이 구조에서 얻는 것:

| 지금 못 하는 질문 | 바뀐 뒤 |
|---|---|
| "S6 오답제거를 쓰는 모든 레일 보여줘" | `where step_code='S6'` |
| "이 유형 문항 전부" | `where question_type_id=?` |
| "강의 500개 추가" | `lecture_types` 행만 늘어남. 레일은 그대로 |
| "이 스캐폴딩 받은 학생과 안 받은 학생 정답률 차이" | `learning_events` group by |
| "지문 오타 수정" | `passages` 1행 |

---

## 4. 점검 체크리스트

### A. 구조 (기획)
- [ ] A1. `question_types` 테이블 신설 — 유형이 1급 엔티티인가 🔴
- [ ] A2. 레일의 소유자를 `lecture` → `question_type`으로 이동 🔴
- [ ] A3. `lectures` = 유형의 조합(`lecture_types`)으로 재정의 🔴
- [ ] A4. `step_types` FK 강제 — 모든 부품이 S1~S7 중 하나를 가리키는가 🔴
- [ ] A5. 한 턴에 S가 여러 개 섞인 187행을 어떻게 쪼갤지 콘텐츠팀 결정 🟠
- [ ] A6. `interactions` 룩업 테이블 + 시트 드롭다운 강제 🔴
- [ ] A7. "또는" 66행 — 분기 조건을 데이터로 표현할지, 단일값으로 확정할지 결정 🔴
- [ ] A8. `instructors` 마스터 테이블 + FK (TS 로스터와 정합) 🟠
- [ ] A9. `rail_steps.part`를 nullable로 — 파트 공용 부품 허용 🟠
- [ ] A10. 부품 `name` 자유텍스트 → `step_code` + `variant`로 분해 (P5-07/08 중복 제거) 🟡

### B. 실험 가능성 (이 레포의 존재 이유)
- [ ] B1. `learning_events` — 턴 단위 로그(레일·단계·강사·턴순서 포함) 🔴
- [ ] B2. 레일 테이블에 `version` + `updated_at`, 임포터를 delete+insert → 버전 append로 🔴
- [ ] B3. 로그 ↔ 레일 버전 조인 가능한가 (H3 검증 가능 여부) 🔴
- [ ] B4. `learner_id`를 `auth.users` FK로, DEMO UUID 뭉침 제거 🟠
- [ ] B5. 오답 태그를 로그에 직접 남길지 결정(`countPriorTagWrongs` 3-round-trip 제거) 🟠

### C. 보안
- [ ] C1. `rail_steps` / `rail_compositions` RLS 즉시 활성화 🔴 **오늘 처리**
- [ ] C2. `anon`/`authenticated`에서 INSERT/UPDATE/DELETE/TRUNCATE **revoke** (RLS 단일 방어선 해소) 🔴
- [ ] C3. `learner_answer_log` SELECT를 `auth.uid() = learner_id`로 좁히기 🟠
- [ ] C4. `user_profiles` 중복 정책 4개 → 1개로 정리 🟡
- [ ] C5. 새 테이블 생성 시 RLS 강제 규칙(마이그레이션 템플릿/CI 체크) 🟠

### D. 스키마 위생
- [ ] D1. DB에만 있는 4개 테이블(`fgi_*`, `subject_choices`)을 마이그레이션으로 역추출 🟠
- [ ] D2. 마이그레이션만으로 빈 프로젝트 재구축 되는지 검증 🟠
- [ ] D3. `passages` 테이블 분리, `questions.passage_id` FK 🟠
- [ ] D4. `stage`를 jsonb → 컬럼 + CHECK 🟡
- [ ] D5. `question_options.display_order` 추가, 정답을 인덱스 대신 label로 전달 🟠
- [ ] D6. `questions.part` 제거(또는 `lectures.part`와 일치 강제 트리거) 🟡
- [ ] D7. `content` jsonb 필수 키를 part별 CHECK 또는 뷰로 검증 🟡
- [ ] D8. `RC-P7-99` 등 데모 데이터에 `is_demo` 플래그 분리 🟡
- [ ] D9. 미사용 컬럼 정리(`question_options.notes`) 🟢

### E. 쿼리
- [ ] E1. `fetchLecturesWithQuestions` — 전건 스캔 → `count()` 집계 뷰/RPC 🟠
- [ ] E2. `fetchCurriculumLectures` 중복 호출 제거 🟠
- [ ] E3. `countPriorTagWrongs` — 3 round-trip + JS 조인 → SQL 1회 🟠
- [ ] E4. `fetchQuestionsBySamePassage` — 지문 전문 equality → `passage_id` 🟠
- [ ] E5. 정렬/그룹핑을 클라 `localeCompare`에서 DB `order by`로 🟡
- [ ] E6. 조회 계층을 뷰(`v_lecture_catalog`, `v_type_rail`)로 고정해 화면이 원시 테이블을 모르게 🟠

### F. 운영·동기화
- [ ] F1. **Part5 이도윤 레일 이중 소스 해소** — 시트 수정이 화면에 반영 안 되는 상태 🔴
- [ ] F2. 시트 → DB 임포터의 대상 테이블을 하나로 통일 🔴
- [ ] F3. 폴백 무음 실패 가시화 — DB로 도는지/폴백인지 화면 표시 또는 상태 페이지 🟠
- [ ] F4. `import-instructor-rails.js`의 `CONFIG.dump` 파일명 옛 탭 이름 수정 🟡
- [ ] F5. 시트↔DB 정합 검증 쿼리를 크론에 붙이기(어긋난 칸 알림) 🟠
- [ ] F6. 문항 0개 강의 28건 — 커리큘럼에 노출할지 정책 결정 🟡

---

## 5. 처리 순서 제안

| 순서 | 무엇 | 이유 |
|---|---|---|
| **0. 오늘** | C1, C2 | 브라우저 키로 레일 삭제 가능. 5분 작업 |
| **1. 이번 주** | F1, F2 | 콘텐츠팀 수정이 반영 안 되는 상태 = 실험 자체가 막힘 |
| **2. 이번 주** | B1, B2 | 지금 쌓이는 로그는 나중에 못 쓴다. 늦을수록 손해 |
| **3. 다음 스프린트** | A1~A4, A6 | 구조 재편. 여기서 D3·E1~E4가 자연히 딸려옴 |
| **4. 그 다음** | A7, A5 | 콘텐츠팀 의사결정 선행 필요 |
| **5. 정리** | D1·D2 | 캐치잇 인계 전 필수 |

---

## 6. 이 문서의 근거

전부 실 DB 실측(2026-07-28). 재현용 쿼리는 §1~§2 각 표에 인라인. 권한 프로브는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`로 PostgREST에 NOT NULL 위반 payload를 보내 **행을 쓰지 않고** 권한 통과 여부만 확인한 것.
