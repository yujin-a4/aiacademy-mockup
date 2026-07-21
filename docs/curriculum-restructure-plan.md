# 커리큘럼 기준 재편 계획 (유형학습 → 정규 강의)

작성 2026-07-21. 이 문서는 **작업 순서서**다. 배경 설명은 최소로 하고, "무엇을 어느 파일에서 어떻게"에 집중한다.
정본 시트는 `AI어학원 콘텐츠`(`1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8`).

---

## ⏱ 현재 위치 (2026-07-21 마지막 갱신)

**Phase 1 완료.** Phase 2는 미착수. Phase 3은 **결정 D1**이 막고 있음.

### 이어서 할 때 첫 3가지

1. **dev 서버 복구** — 재부팅 전 `next dev`가 웹팩 캐시 gzip 버퍼 할당 실패(`RangeError: Array buffer
   allocation failed`)로 죽었다. **코드 문제 아님.** 재부팅으로 RAM은 회복되지만 캐시는 그대로다:
   ```powershell
   Remove-Item .next -Recurse -Force
   $env:NODE_OPTIONS="--max-old-space-size=4096"; npm run dev
   ```
   원인·상세는 이 문서 5장.
2. **결정 D1 확정** (아래 3장) — Phase 3 규모를 직접 결정한다.
3. Phase 2 착수 여부 판단 — D1과 무관하게 진행 가능.

### 커밋 안 된 작업물 (전부 디스크에 있음, 브랜치 `feat/part1-split-view-and-instructor-agent`)

| 파일 | 상태 |
|---|---|
| `docs/curriculum-restructure-plan.md` | 신규 (이 문서) |
| `supabase/migrations/0010_lecture_steps_turn_detail.sql` | 신규 — **DB에는 이미 적용됨** |
| `scripts/import-instructor-rails.js` | 수정 — **이미 실행 완료, DB 반영됨** |
| `scripts/dump/[윤다은 ver] …수정완료(0713).json` | 신규 덤프 (gitignore 대상) |
| `scripts/dump/[이도윤 ver] …수정 완료(0713).json` | 신규 덤프 (gitignore 대상) |

⚠️ DB 변경은 **이미 반영이 끝났다.** 재부팅 후 임포터를 다시 돌릴 필요 없음
(돌려도 delete-insert라 안전하지만 불필요).

---

## 0. 현재 상태 (2026-07-21 실측)

### 0-1. 이미 맞게 서 있는 것

| 대상 | 상태 |
|---|---|
| `lectures` 테이블 | **43행 = 커리큘럼 시트 W열 정규수업과 1:1 일치** (LC1~16강, RC1~26강 = 42강 + 데모용 `RC-P7-99`) |
| `lecture_steps` (common) | 43강 전부 이관 완료 (강당 6~7스텝) |
| `/api/tutor` sheetRail 엔진 | 정상 동작. S5/S6 게이팅으로 "정답 미리 말하기" 차단됨 |

### 0-2. 틀어져 있는 것

| 문제 | 실측 |
|---|---|
| `/type-lesson` 15유형이 가짜 강의 단위 | 커리큘럼에 없는 UI 발명품. 로컬 TS 137턴(`lessonsLC` 59 + `lessonsRC` 78) 하드코딩 |
| `/type-lesson`이 sheetRail 엔진을 안 씀 | `/api/tutor` 호출 0건. 로컬 `directiveOf()`로 자체 진행 |
| 강사 레일이 구버전 | `yun_daeun`·`lee_doyun` 모두 **P1 2강만**. 임포터가 보는 탭 이름이 개명되어 사라짐 |
| 문항 부족 | `questions` 35개, 13개 강의에만. **42강 중 29강이 문항 0개** |
| 레벨 축 없음 | 커리큘럼 Z/AA/AB(600+/750+/850+)가 `lectures`에 없음 |
| 특강 트랙 없음 | 시험 직전 특강 12강(AE~AK), 문법/어휘 특강 8강(AM~AR) 미반영 |
| 학습자유형(G/T) 자리 없음 | `lecture_steps`에 `instructor_code`만. `유형학습_T` 탭 넣을 곳 없음 |

### 0-3. 목표 구조

```
강의 (커리큘럼 정규수업 1강)        ← lectures            ✅ 이미 있음
 └ 문항 N개                          ← questions           ⚠️ 29강 비어 있음
     ├ UI 화면 (문항 유형이 결정)     ← questions.ui_type   ❌ 신설 필요
     └ 스캐폴딩 레일 (강사 × 학습자유형) ← lecture_steps     ⚠️ 강사분 구버전
```

**핵심 전환:** 지금의 15개 "유형학습"은 강의가 아니라 **문항 렌더러 프리셋**이다.
화면 자산은 버리지 않고 문항 단위로 재배치한다.

---

## 1. 시트 → DB → 런타임 파이프라인 (현행, 참고용)

바꾸기 전에 지금 어떻게 도는지. 재편 후에도 이 골격은 유지한다.

**① 덤프**
```bash
node scripts/dump-sheet.js "<탭 제목>"
# → scripts/dump/<탭 제목>.json  (병합셀 펼친 2차원 rows)
```

**② 임포트** — `scripts/import-instructor-rails.js`
파트별 **4열 묶음**을 세로로 훑어 `LC1강 —` 헤더에서 강의를 끊고 S코드 행을 스텝으로 쌓는다.

| 시트 열 | DB 컬럼 |
|---|---|
| 단계 | `lecture_steps.step_code` |
| AI가 따라야 할 규칙 | `fixed_rule` |
| DB 참조 | `db_fields` |
| 자유 표현 / 말투 예시 | `free_expression` |

`(lecture_id, instructor_code)` 단위 delete-insert라 재실행 안전.

**③ 런타임** — `src/app/api/tutor/route.ts`
`action:'start'` + `lessonType:'lesson'` → `loadLectureSteps()` (`src/lib/tutorDb.ts:145`, 강사 없으면 `common` 폴백)
→ `sheetStepDirective()` (`route.ts:263`)가 스텝 1개를 지시문으로 조립:

```
지금 단계: {step_code} — {fixed_rule}
이 단계에서 참조할 문항 정보: {db_fields} — 해당 값만 인용하고 새로 지어내지 마라.
[S5] 근거 공개 허용. 정답 {label}) {text} 와 근거를 연결해라: "{evidence}"
[S6] 보기별 오답 이유(DB 원문 인용만): A) "..." [태그] / C) "..."
[그 외] 정답·근거는 아직 말하지 마라.
(말투·표현만 자유: {free_expression})
한두 문장만 말하고 멈춰서 학생 반응을 기다려라.
```
→ `contextual` 반환 → 클라이언트가 `sendContextualUpdate`로 주입 → 에이전트는 **말투만 입혀 발화**.
→ `next_step`마다 `stepIdx++`.

**설계 원칙: DB가 뇌, 에이전트는 입.** 재편 후 `/type-lesson` 계열도 반드시 이 경로를 타야 한다.

---

## 2. 작업 순서

> **의존 관계:** Phase 1은 독립(지금 바로 가능). Phase 2는 Phase 1 완료 후.
> Phase 3은 **결정 D1(FGI 범위) 확정 후** 착수. Phase 4는 Phase 3과 병행 가능.

---

### Phase 1 — 강사 레일 최신화 ✅ 완료 (2026-07-21)

재편을 어떻게 하든 `lecture_steps`는 그대로 쓰는 자산이라 **버려지는 작업이 아니다.**

**결과**

| 강사 | 강의 | 스텝 | 비고 |
|---|---|---|---|
| `lee_doyun` | **42강 (전체)** | 364 | 턴 단위. 음원·스크립트·상호작용 열까지 무손실 |
| `yun_daeun` | **40강** | 302 | LC11·LC16 시트에 없음 → `common` 폴백 |
| `common` | 42강 | 299 | 변경 없음 |

- 마이그레이션 `0010_lecture_steps_turn_detail.sql` 적용 (아래 1-7)
- `scripts/import-instructor-rails.js` 전면 개편 — 재실행 안전 유지
- 검증: 7개 파트 전부 커버, `LC-P1-01`(이도윤) 레일이 기존 하드코딩 T1(선택지 A~D 순차 청취)과 구조 일치

#### 1-1. 임포터 탭 이름 교체
`scripts/import-instructor-rails.js` `CONFIG` — 현재 참조 중인 탭 2개가 **개명되어 존재하지 않음**.

| 현재 코드 | 실제 탭 |
|---|---|
| `[윤다은 ver] 스케폴딩 (유형학습) 수정중` | `[윤다은 ver] 스케폴딩 (유형학습_G) 수정완료(0713)` |
| `[이도윤 ver] 스케폴딩 (유형학습) 수정중` | `[이도윤 ver] 스케폴딩 (유형학습_G)_초안 수정 완료(0713)` |

#### 1-2. 7개 파트 전부로 열 그룹 확장 (윤다은)
새 윤다은 탭은 42열 / 헤더행 r2. `단계` 컬럼 위치 **실측 완료**:

| 파트 | 열 그룹 [단계, 규칙, DB참조, 말투] | 수록 강의 |
|---|---|---|
| PART 1 | 8, 9, 10, 11 | LC1, LC2 |
| PART 2 | 13, 14, 15, 16 | LC3~LC6 |
| PART 3 | 18, 19, 20, 21 | LC7~LC10 |
| PART 4 | 23, 24, 25, 26 | LC12~LC15 |
| PART 5 | 28, 29, 30, 31 | RC1~RC16 |
| PART 6 | 33, 34, 35, 36 | RC17, RC18 |
| PART 7 | 38, 39, 40, 41 | RC19~RC26 |

→ 총 **40강**. 예상 입력량 300행 내외.

#### 1-3. 강의 헤더 파서 수정 ⚠️ 필수
현 정규식이 `/^LC(\d+)강/` 뿐이라 **RC 26강을 통째로 놓친다.** 또 새 탭 헤더에는 `[유형코드: ...]` 괄호가 없어 기존 폴백(`LC-P1-{n}`)도 못 쓴다.
→ `lectures.title`의 `LCn강` / `RCn강` 접두어로 매핑하도록 교체.

#### 1-4. 누락 강의 확인 ⚠️ 콘텐츠팀 문의 필요 — 유일한 미해결 항목
윤다은 탭에 **LC11강(주문·배송, `LC-P3-05`), LC16강(연설·소개, `LC-P4-05`)** 없음.
이도윤 탭에는 둘 다 있어서 **시트 미완일 가능성이 높다.**
방치하면 그 2강만 `common` 폴백을 타서 윤다은 톤이 튄다. 시트가 채워지면 임포터 재실행만 하면 됨.

#### 1-5. 이도윤 탭 재파싱 ✅
이도윤 탭(76열)은 윤다은과 열 구성이 다를 뿐 아니라 **정보량이 더 많다.**

| 파트 | 열 수 | 구성 |
|---|---|---|
| P1~P4 (LC) | 9열 | 턴 / 단계 / **음원 재생·정지 방식** / **스크립트** / 규칙 / **상호작용 방식** / **학생 문구** / DB참조 / 자유표현 |
| P5~P7 (RC) | 7열 | 턴 / 단계 / 규칙 / **상호작용 방식** / **학생 문구** / DB참조 / 자유표현 |

임포터를 강사별 **열 이름 맵**(`CONFIG[].parts`) 구조로 바꿔서 둘 다 수용하게 했다.

#### 1-6. 임포트 실행 + 검증 ✅
```bash
node scripts/dump-sheet.js "<탭 제목>"        # 시트 수정 시
node scripts/import-instructor-rails.js
```
```sql
select instructor_code, count(distinct lecture_id) lectures, count(*) steps
from lecture_steps group by 1;
```

#### 1-7. 마이그레이션 `0010` — 턴 상세 열 (Phase 2에서 앞당김) ✅
이도윤 시트의 추가 4열을 버리면 Phase 3에서 재임포트해야 하므로, **무손실로 미리 받았다.**
전부 nullable이라 `common`·윤다은 레일은 null로 남는다.

| 컬럼 | 출처 | Phase 3에서의 쓸모 |
|---|---|---|
| `turn_label` | '턴' | 턴 단위 진행 |
| `section` | `── Q1 상황/주제/목적형 ──` 구분선 | **하위문제 그룹 보존** (3-5의 문항 루프) |
| `audio_mode` | '음원 재생/정지 방식' | 음원 큐 (`AudioCue` 대체) |
| `script_mode` | '스크립트' | 스크립트 점진 공개 (`RevealState` 대체) |
| `interaction` | '상호작용 방식' | **`ui_type` 도출의 1차 근거** |
| `student_prompt` | '학생에게 보여줄 질문/선택지' | 화면 문구 |

**중요:** 지금까지 로컬 TS 137턴이 들고 있던 정보(음원 큐·공개 범위·상호작용 종류)가
**이제 DB에 원본으로 존재한다.** Phase 3의 렌더러 작업은 이 열들을 읽는 것으로 시작하면 된다.
런타임(`sheetStepDirective`)은 아직 이 열들을 읽지 않는다.

---

### Phase 2 — 스키마 확장

#### 2-1. `lecture_steps.learner_type` 추가
```sql
alter table lecture_steps add column learner_type text not null default 'G';
-- 유니크 키: (lecture_id, instructor_code, learner_type, step_order)
```
- `유형학습_G`(가이드 학습형) / `유형학습_T` 두 벌이 존재. 지금은 T를 넣을 자리가 없다.
- `loadLectureSteps()`(`src/lib/tutorDb.ts:145`) 시그니처에 `learnerType` 추가, 폴백 순서는
  `(강사, 학습자유형)` → `(common, 학습자유형)` → `(common, 'G')`.
- ⚠️ `_T` 탭은 아직 "수정중" 상태 — 컬럼만 먼저 뚫고 데이터는 완성 후.

#### 2-2. `lectures` 레벨·트랙 컬럼 추가
```sql
alter table lectures add column levels text[];   -- ['600','750','850']
alter table lectures add column track text not null default 'regular';
                                                  -- regular | pre_exam | grammar_voca
```
커리큘럼 시트 매핑:
- 정규수업 = W~AC열 (LC r5~r20, RC r30~r55)
- 레벨 = Z/AA/AB (RC) · Z/AA/AB (LC) 의 `O` 표시
- 시험 직전 특강 = AE~AK (12강) / 문법·어휘 특강 = AM~AR (8강, "출시 후")

#### 2-3. 커리큘럼 임포터 신설
`scripts/import-curriculum.js` (신규) — `scripts/dump/커리큘럼.json` → `lectures` upsert.
`lecture_code`가 이미 일치하므로 **행 추가가 아니라 레벨·트랙 컬럼 채우기**가 주 목적.
특강 트랙 20강은 신규 행으로 추가(별도 `lecture_code` 체계 필요 — 예: `SP-P1-01`).

#### 2-4. `questions.ui_type` 추가
```sql
alter table questions add column ui_type text;
```
문항을 어떤 화면으로 그릴지 결정하는 키. `part`만으로는 부족하다
(P7 이중/삼중지문, 양식·일정표형, LC 표 시각자료형이 전부 다른 화면).
초기 값 목록은 지금 15유형에서 도출 — 아래 3-1 참조.

---

### Phase 3 — 화면 재편 (⚠️ 결정 D1 확정 후 착수)

#### 3-1. 15유형 → `ui_type` 프리셋으로 격하
`src/data/typeLearning/lessonsLC.ts`·`lessonsRC.ts`의 T1~T15를 **강의가 아니라 렌더러 정의**로 재해석.
콘텐츠(사진·음원·지문·보기)는 `questions`로, 레일은 `lecture_steps`로 빠지고,
**남는 것은 "이 문항을 어떻게 그리는가" 뿐이다.**

| 현재 | → `ui_type` (초안) |
|---|---|
| T1 사진+음성보기 | `p1_photo_audio` |
| T2 질의응답 | `p2_qa_audio` |
| T3/T4 대화(+표 시각자료) | `p3_dialog`, `p3_dialog_table` |
| T5/T6 담화(+표) | `p4_talk`, `p4_talk_table` |
| T7 빈칸 | `p5_blank` |
| T8 장문 빈칸 | `p6_cloze` |
| T9~T15 지문형 | `p7_single`, `p7_form`, `p7_double`, `p7_triple` … |

※ 최종 목록은 실제 문항을 채우면서 확정. 처음부터 15개를 다 만들지 말고 **D1 범위에 해당하는 것만.**

#### 3-2. 라우트 재편 `/type-lesson/[typeId]` → `/lecture/[lectureCode]`
- 강의 진입 → 문항 리스트 → 문항 선택 → `ui_type` 렌더러 + `lecture_steps` 레일 진행
- 기존 `/type-lesson`은 당분간 유지(폐기는 3-4에서)

#### 3-3. `TypeLessonPlayer` 분해 ⭐ 이번 재편의 핵심
현재 `src/components/type-lesson/TypeLessonPlayer.tsx` 한 파일에 화면·진행엔진·에이전트 배선이 섞여 있다.

- **화면 부분** → `ui_type`별 문항 렌더러 컴포넌트로 분리 (사진 패널, 표 시각자료, 지문 탭, 근거연결, 빈칸 등)
- **진행 엔진** → 로컬 `directiveOf()` **폐기**하고 `/api/tutor` sheetRail로 교체
  - 이게 1장에서 말한 "잘 만든 엔진 재사용". S5/S6 게이팅·DB 원문 인용이 공짜로 따라온다
  - 지난 논의의 "에이전트가 근거를 지어내는 문제"가 이 교체 하나로 해소됨
- **에이전트 배선** → `DbLessonScreen.tsx`의 `sendContextualUpdate` 패턴으로 통일

#### 3-4. 로컬 TS 폐기
`src/data/typeLearning/*.ts` 137턴 제거. 콘텐츠는 `questions`, 레일은 `lecture_steps`로 완전 이관된 뒤.

#### 3-5. 신설 레일 단계 대응 (0713 시트 반영)
새 강사 시트에 기존 플레이어가 표현하지 못하는 구조가 있다:
- **S0 신설** — "코칭 없이 원본 1회 그대로 제시, 개입 금지". 지금은 첫 턴부터 강사가 말함 → 무발화 턴 상태 필요
- **하위문제 반복** — P3/P4는 `S1[되짚기] 하위문제1/2`, `S5+S6 하위문제1/2`처럼 **문제별로 레일이 돈다**.
  현 `Turn.focusQ`로는 표현 불가 → 문항 루프 개념 필요
- **쉐도잉이 정식 단계** — P1/P2 레일 말미에 스텝으로 존재

---

### Phase 4 — 콘텐츠 채우기 (Phase 3과 병행)

#### 4-1. 문항 입력
D1에서 정한 강의들의 `questions` + `question_options` 채우기.
`db_fields`가 요구하는 값(정답 근거, 보기별 오답 이유, 표준 오답태그)이 **반드시 있어야** S5/S6 단계가 작동한다.
→ 관련: 실전토익 PDF 문항 입력 파일럿(보류 중) 재개 검토

#### 4-2. 강사 음성·페르소나 정합
`instructorData.ts` ↔ `api/tts` ↔ `tutorAgentFor()` 강사 id 일치 확인.
윤다은 전용 에이전트가 없으면 박혜원 폴백 → FGI에서 목소리가 안 갈린다.

---

### Phase 5 — 에이전트 실시간 관찰 (별건, 재편 후)

지난 논의분. 재편과 독립이지만 재편 후에 붙이는 게 싸다.

1. **화면 이벤트 → 에이전트 채널** — 단어 탭·근거 연결·보기 선택·무행동을 디바운스(300~500ms)해서 `sendContextualUpdate`로 push
2. **필기 좌표 → 의미 변환** — `DrawingOverlay`의 스트로크를 hit-test해 "학생이 'putting on'에 밑줄" 같은 semantic 이벤트로. 진짜 손글씨 인식(vision)은 FGI엔 과잉
3. **개입 판정은 클라이언트에서** — 컨텍스트 주입만으로는 즉시 반응이 안 온다. 오답 탭·N초 정지 같은 트리거는 클라이언트가 판정해 push

---

## 3. 결정이 필요한 것

### D1. FGI에서 실제로 돌릴 강의 범위 ⚠️ Phase 3 착수 전 필수
42강 문항을 다 채우는 건 불가능하다. **4~6강**을 골라 그것만 문항 완비 + 강사 2명 레일 완비로 간다.
- 후보: `LC-P1-01`·`LC-P1-02`(이미 문항 6개씩 있음), `RC-P5-08`(5개), `RC-P7-03`(6개), `RC-P6-01`(4개)
- 이 범위가 곧 Phase 3의 `ui_type` 구현 범위 = 재편 규모를 직접 결정한다

### D2. 특강 트랙을 MVP0에 포함할지
시험 직전 특강 12강 + 문법/어휘 특강 8강. 문법/어휘는 시트에 "출시 후"로 명시됨.
→ **FGI 범위에서 제외 권장.** 제외하면 Phase 2-2/2-3이 크게 줄어든다.

### D3. `_T`(학습자유형 T) 레일을 언제 넣을지
시트가 아직 "수정중". 컬럼만 뚫고(2-1) 데이터는 완성 후로 미루는 것을 권장.

---

## 4. 검증

이 레포에는 테스트 스위트가 없다. **`npm run build`가 사실상의 테스트**(strict TS + noEmit).
데이터·타입을 건드린 뒤에는 반드시 돌린다.

```bash
npm run build
```

DB 작업은 별도로 위 Phase 1-6 검증 쿼리 + 실제 화면 1회 플레이로 확인.

---

## 5. 개발 환경 메모 — dev 서버 메모리

2026-07-21 `next dev`가 반복 크래시했다. **코드가 아니라 환경 문제.**

```
Gunzip / Gzip → allocUnsafe → RangeError: Array buffer allocation failed
  at .../next/dist/compiled/webpack/bundle5.js
```

웹팩 파일시스템 캐시 팩을 gzip으로 읽고 쓰다가 연속 버퍼 할당에 실패. 당시 조건:

| 항목 | 값 |
|---|---|
| Node 힙 상한 | 2,096 MB (`NODE_OPTIONS` 미설정 = 기본값) |
| 여유 RAM | 2.3 GB / 13.9 GB (브라우저 탭 누적이 대부분 점유) |
| `.next/cache` | 365 MB (production 팩 285 MB는 `next dev`가 쓰지 않는 잔재 → 삭제함) |

**복구 절차**
```powershell
Remove-Item .next -Recurse -Force
$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run dev
```

`public/`이 116 MB지만 정적 자산이라 번들·캐시와 무관하다 (원인 아님).

**재발 시**: 매번 env를 치기 싫으면 `package.json`의 dev 스크립트를 아래로 바꾼다 (미적용 — 레포에
남는 변경이라 보류 중).
```json
"dev": "node --max-old-space-size=4096 node_modules/next/dist/bin/next dev",
```
캐시 삭제 + 힙 증량으로도 재발하면 캐시 손상이 아니므로 `next.config`의 `webpack.cache`를 봐야 한다.
