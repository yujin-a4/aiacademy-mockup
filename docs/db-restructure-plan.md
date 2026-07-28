# 스캐폴딩 DB 재설계 — 실행 계획 (v4)

**최종 갱신:** 2026-07-28 · **진단 근거:** [`docs/db-audit-0728.md`](./db-audit-0728.md)
**상태:** 착수 전. STEP 0부터 시작하면 됨.

---

## 0. 이 문서를 처음 읽는 사람에게

이 문서 하나로 작업을 이어받을 수 있게 썼다. 순서대로 읽어라.

### 0-1. 무엇을 하려는 일인가

콘텐츠팀이 **개발자 없이 스캐폴딩(수업 진행 방식)을 바꿔가며 실험**할 수 있게 만드는 것. 그리고 강의가 수만 개로 늘어도 **최소 장치로 돌아가는 구조**를 만드는 것.

목표 구조는 3층이다.

```
스캐폴딩 단계 S1~S7   ← 최소 단위. 안 늘어난다
      ↓ 모여서
문항 유형의 수업 방식  ← 유형마다 "어떤 단계를 어떤 순서로"
      ↓ 문항이 모여서
강의 (커리큘럼 42강)
```

### 0-2. 용어 (이 문서 전용. 헷갈리면 여기로 돌아올 것)

| 용어 | 뜻 | 테이블 |
|---|---|---|
| **단계** | S1~S7. 교육적 의도 = *무엇을 시키는가* | `scaffolding_steps` |
| **상호작용** | 화면 동작 = *어떻게 시키는가* (AI 진행·선택 응답·필기 인식 …) | `interactions` |
| **변종** | 단계 × 상호작용의 조합. **실행 단위** (예: `S6-a` = S6를 선택 응답으로) | `step_variants` |
| **유형** | 문항 유형 (표·양식형 / 장문 독해형 …) | `question_types` |
| **레일** | 유형 하나를 푸는 절차 = 변종의 순서 목록 | `type_rails` |
| **아이템** | **레일이 한 바퀴 도는 단위.** P1·P5는 문항 1개, P6·P7은 지문 1개(하위문제 N) | `lecture_items` |
| **강의** | 커리큘럼 42강. 아이템의 순서 있는 목록 | `lectures` |
| **회차** | 같은 유형이 한 강의에서 몇 번째로 나오는가. Fading의 근거. **컬럼 아님, 계산값** | — |

> ⚠️ 이전 문서·커밋에 나오는 **"부품"은 "변종"의 옛 이름**이다. 테이블 `rail_steps`·`rail_compositions`도 옛 이름(§4 매핑표 참조).

### 0-3. 사실 확인하는 법 (추측 금지)

DB에 직접 붙어서 확인할 것. 자격증명은 `.env.local`의 `SUPABASE_DB_URL`.

```bash
# 레포 루트에서. pg는 node_modules에 이미 있다.
cd /c/Users/YBM/Desktop/aiacademy-mockup
NODE_PATH="$PWD/node_modules" node -e "
const fs=require('fs');const{Client}=require('pg');const env={};
for(const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){
  const m=l.match(/^([A-Z_]+)=(.*)\$/); if(m) env[m[1]]=m[2].replace(/^[\"']|[\"']\$/g,'');
}
(async()=>{const c=new Client({connectionString:env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});
await c.connect(); console.table((await c.query('select * from lectures limit 5')).rows); await c.end();})()
"
```

`anon` 키 권한을 확인할 땐 **행을 쓰지 말고** NOT NULL 위반 payload를 던져라:

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/<table>" -H "apikey: $ANON" \
  -H "Content-Type: application/json" -d '{}'
# 42501 = RLS가 막음(정상) / 23502 = 권한 통과(구멍)
```

### 0-4. 지금 어디까지 와 있나

| | 상태 |
|---|---|
| 문항 | **83개** (Part 1·5·6·7만). Part 2·3·4는 **0개** — 담을 스키마가 없어서 |
| 강의 | 43개 중 **28개가 문항 0개** |
| 레일 | `lecture_steps` 965행(강의별) · `rail_compositions` 112행(Part5만 변종화) |
| 화면 | `/lecture/[code]` 가 정본 진입점. Part 1·5·6·7 4개 강의만 DB로 돎 |
| 실험 로그 | **불가능** — 어떤 레일로 학습했는지 기록이 없음 |

---

## 1. 핵심 그림 — 변종 매트릭스

**"단계가 최소 단위"** 라는 목표는 유지된다. 변종은 *같은 단계를 화면에서 다르게 시키는 방법*일 뿐이다.

이도윤 레일 364턴 전수 실측 (숫자 = 사용 횟수):

```
          AI진행   선택응답  주관식   필기인식  쉐도잉   매칭   필수응답
S1           1        ·        ·       36        ·       ·       4
S2          18       30       15        8        ·       ·       ·
S3          33        ·        ·        ·        ·       ·       ·   ← 변종 1개
S4           ·        2        1       15        ·       ·       ·
S5          17       18        ·        6       30       2       ·
S6           ·       36        ·        ·        ·       ·       ·   ← 변종 1개
S7          42        ·        ·        ·        ·       ·       ·   ← 변종 1개
```

**채워진 칸 = 변종 25개.** 축(단계 7 + 상호작용 7)은 이미 최소다. 25는 그 두 축이 실제로 만나는 조합 수일 뿐, "최소화 실패"가 아니다.

**7개 단계 중 3개(S3·S6·S7)는 변종이 하나뿐이다.** 실제로 갈리는 건 S1·S2·S4·S5 넷이고, 심하게 흩어진 건 S2·S5 둘이다. → **콘텐츠팀 정리 작업은 이 넷에만 필요하다.**

> **왜 단계 7개만으로는 안 되는가:** `"S6 오답 제거"`만 알면 화면에 뭘 띄울지 모른다. 보기 버튼인지, 필기 캔버스인지, AI가 그냥 말하는지. **상호작용이 있어야 화면이 결정된다.**

### 정리하면 25 → 18칸 안팎

| 정리 대상 | 현황 |
|---|---|
| 1~2회짜리 칸 | S2×선택지표시 1 · S4×주관식 1 · S5×매칭 2 → 흡수 가능한지 확인 |
| `(S없음)` 30회 | S코드 부여 필요 (D3) |
| 섞인 상호작용 | `AI 진행 + 필기 인식`(15) · `조건부 AI 진행`(2) · `필수 응답 / 주관식 입력`(4) → 하나로 확정 |

### 변종 수는 정의에 따라 이렇게 달라진다 (실측)

| 정의 | 개수 |
|---|---|
| 지금 임포터 키 (`step_code` 원문 + `interaction` 원문) | **89** |
| 위 + 어휘 정규화만 | **89** ← **안 줄어든다** |
| 단계 × 상호작용, 파트별 | **51** |
| 단계 × 상호작용, **파트 공용 허용** | **25** |
| 위 + 음원 지시까지 변종 속성에 포함 | **77** |

**⚠️ 여기서 두 가지가 확정된다.**

1. **어휘(interaction) 정규화만으로는 변종이 한 개도 안 줄어든다.** dedup을 막는 건 `step_code` 151종이다. → **`S단계` 열 신설(D2)이 STEP 2의 전부이고 나머지는 곁가지다.**
2. **음원·스크립트 지시를 변종 속성에 넣으면 25 → 77로 폭증한다.** 그래서 이 문서는 **음원 지시를 변종이 아니라 `type_rails`(조합)에 붙이는 안**으로 작성했다(D8). `"선택지 A 음원만 재생"`은 *그 턴이 무엇을 시키는가*가 아니라 *이 유형의 이 순서에서 무엇을 트는가*이기 때문이다.

---

## 2. 목표 스키마

```
   scaffolding_steps (S1~S7)      interactions        instructors
            ↑ FK                       ↑ FK                ↑ FK
            └────── step_variants (변종 · 실행 단위) ──────┐
                              ↑                            │
                              │ 조합                  variant_checks
   question_types ──< type_rails ┘                   (채점·힌트·분기)
      (문항 유형)   유형 × 강사 × 버전 × 순서
            ↑          (+ 음원·스크립트 지시)
            │
            │  ★ 1 : N — 강의 하나에 유형 여러 개 (지금은 1개여도 구조는 N)
            │
   lectures ──< lecture_items ──< item_questions
   (커리큘럼 42강)   (아이템)          (아이템 안의 문항)
                                            ↓
                         passages ──< questions ──< question_options
                       (지문·표·대화)              (보기)
                              ↑
                       passage_sentences (문장 단위)

   learning_events (턴 로그)        learner_progress (진도·Fading 상태)
```

| 층 | 늘어나는 조건 |
|---|---|
| `scaffolding_steps` | **안 늘어남** (7개 고정) |
| `step_variants` | 새 상호작용 조합이 생길 때만 (~25개) |
| `type_rails` | 유형이 늘 때 |
| `lecture_items` | **강의가 늘 때 (여기만)** |

**강의를 500개 추가해도 레일 행은 안 늘어난다.** 이게 이 설계의 목적이다.

---

## 3. 작동 원리 3개

### 원리 1 — 아이템 = 레일 한 바퀴

문항 수로 곱하면 파트마다 깨진다 (실측):

| 강의 | 수업문항 | 아이템 | 레일 | 총 턴 |
|---|---|---|---|---|
| LC-P1-01 | 3 | **3** (사진 3장) | 7 | 21 |
| RC-P5-08 | 5 | **5** (문장 5개) | 7 | 35 |
| RC-P6-01 | 4 | **1** (지문 1개·빈칸 4) | 11 | **11** |
| RC-P7-03 | 6 | **2** (지문 2개) | 7 | 14 |

Part6 레일 11턴은 **이미 빈칸 4개를 훑는다.** 문항 수로 곱하면 44턴 = 4배 중복.

### 원리 2 — 반복 규칙은 코드가 아니라 `step_variants.scope`

```
'item'    → 매 바퀴          ← 기본값. 지금은 전부 이것 (= "다 반복")
'type'    → 같은 유형 첫 아이템에서만   (예: S3 개념 코칭)
'lecture' → 강의 첫 아이템에서만        (예: 도입/마무리)
```

나중에 바꾸려면 **`UPDATE` 한 줄**이다. 코드도 스키마도 안 건드린다.

```sql
update step_variants set scope = 'type' where step_code = 'S3';
```

시트에 `반복범위` 열을 두면 콘텐츠팀이 직접 바꾼다.

### 원리 3 — 확장은 전부 `WHERE` 한 줄

| 나중에 | 추가 | 쿼리 변경 |
|---|---|---|
| **Fading** | `step_variants.fade_policy` | `and (v.fade_policy is null or it.occurrence = 1 or v.fade_policy <> 'first_only')` |
| **레일 A/B** | `type_rails.version` | `order by … version desc` → 배정 버전 |
| **강의에 유형 여러 개** | 없음 | **이미 됨** |
| **실전 세트** | 없음 | `phase = 'practice'` 로 호출 |
| **레벨 분기** | `step_variants.min_level` | `and (v.min_level is null or v.min_level <= $4)` |

---

## 4. 정본 쿼리 — 강의 하나의 전체 진행표

화면은 이 결과를 순서대로 그리기만 한다. **뷰 `v_lecture_program`으로 고정하고 화면은 원시 테이블을 모르게 한다.**

```sql
with items as (
  select li.id, li.seq, li.question_type_id,
         row_number() over (partition by li.question_type_id order by li.seq) as occurrence
  from lecture_items li
  join lectures l on l.id = li.lecture_id
  where l.lecture_code = $1 and li.phase = $3          -- 'lesson' | 'practice'
),
rail as (                                              -- 유형 × 강사, 최신 버전만
  select distinct on (tr.question_type_id, tr.step_order)
         tr.question_type_id, tr.step_order,
         tr.audio_mode, tr.script_mode,                -- ★ 음원 지시는 조합에 붙는다 (D8)
         v.id variant_id, v.step_code, v.scope, v.fade_policy,
         i.ui_kind,
         coalesce(tr.student_prompt_override,  v.student_prompt,  tr.student_prompt_seed)  student_prompt,
         coalesce(tr.tutor_directive_override, v.tutor_directive, tr.tutor_directive_seed) tutor_directive
  from type_rails tr
  join step_variants v on v.id = tr.variant_id
  left join interactions i on i.code = v.interaction_code
  where tr.instructor_code = $2
  order by tr.question_type_id, tr.step_order, tr.version desc
)
select it.seq as item_seq, it.occurrence, r.*,
       (select json_agg(json_build_object('question_id', iq.question_id,
                                          'sub_order',   iq.sub_order)
                        order by iq.sub_order)
          from item_questions iq where iq.item_id = it.id) as questions
from items it
join rail r on r.question_type_id = it.question_type_id
where  r.scope = 'item'                             -- 매 바퀴          ← 기본값
   or (r.scope = 'type'    and it.occurrence = 1)   -- 유형 첫 등장에만
   or (r.scope = 'lecture' and it.seq = 1)          -- 강의 첫 아이템에만
order by it.seq, r.step_order;
```

**규칙은 `WHERE` 3줄이 전부다.** 나머지는 조인이다.

---

## 5. 지금 반드시 뚫어둘 컬럼

나중에 값만 바꾸려면 컬럼이 지금 있어야 한다. 안 뚫으면 그때 **코드를** 고쳐야 한다.

| 컬럼 | 지금 값 | 나중에 |
|---|---|---|
| `step_variants.scope` | **전부 `'item'`** (= 다 반복) | S3·S7만 `'type'`/`'lecture'` |
| `step_variants.fade_policy` | **전부 `null`** (= Fading 없음) | `'first_only'` 등 |
| `step_variants.min_level` | `null` | 레벨 분기 |
| `type_rails.version` | 전부 `1` | 실험 버전 append |
| `lecture_items.phase` | `'lesson'`/`'practice'` | 그대로 |
| 회차(`occurrence`) | **컬럼 안 만듦** | `row_number()`로 계산 — 공짜 |

> **원칙:** "나중에 바꿀 것"은 전부 nullable 컬럼 + 안전한 기본값으로 지금 뚫고, 런타임은 그 컬럼만 읽는다. 그러면 모든 변경이 `UPDATE` 한 줄이다.

---

## 6. 현재 → 목표 매핑

| 지금 | 목표 | 처리 |
|---|---|---|
| `step_types` (참조 FK 0개) | `scaffolding_steps` | **FK 강제** |
| (없음) | `interactions` | 신설 — 자유 텍스트 12종 → 7코드 |
| (없음) | `instructors` | 신설 — TS 로스터와 정합 |
| (없음) | **`question_types`** | 신설 — **레일 뼈대 수 기준 시드** (강의 수 아님) |
| (없음) | **`passages`·`passage_sentences`** | 신설 — 표·대화·문장 |
| `questions.content` 지문류 | `passages` | 이관. 파트 고유 필드는 jsonb 잔존 |
| (없음) | **`lecture_items`·`item_questions`** | 신설 |
| `content->>'stage'` | `lecture_items.phase` | jsonb 탈출 |
| **`rail_steps`** (옛 "부품") | **`step_variants`** | **개명** + `scope`·`fade_policy`·`min_level` 추가, `part` nullable |
| **`rail_compositions`** | **`type_rails`** | 개명 + 소유자 강의 → 유형, `audio_mode`·`script_mode` 이동 |
| `lecture_steps` (965행) | (폐기) | 이관 후 삭제. Part3·4만 잔존(D5) |
| **`TUTOR_RAILS`** (코드 371줄) | `variant_checks` | 채점·힌트·분기를 DB로 |
| `mastery` Map (메모리) | `learner_progress` | 서버리스에서 소실되던 것 |
| `learner_answer_log` | `learning_events` | 신규만. 기존은 `_archive`로 리네임 |
| `subject_choices` | **삭제** | Part5 실험 잔재 |
| `survey_responses` (**DB에 없음**) | 신설 | 지금 설문이 저장 안 되고 있음 |
| `load-toeic-*.js` 5개 | **폐기** | DB 직접 쓰기 — 시트 크론과 경쟁 중 |

---

## 7. 단계별 실행

각 STEP은 **작업 → 완료 조건 → 검증** 순이다. 완료 조건을 못 채우면 다음으로 넘어가지 않는다.

---

### 🔴 STEP 0 — 지혈 · 반나절 · **최우선**

> **왜 지금:** `rail_steps`·`rail_compositions`가 **RLS가 꺼져 있고** 모든 테이블이 `anon`에게 DELETE/TRUNCATE 권한을 준다. 브라우저 키로 레일을 통째로 지울 수 있다(실증 완료). 그리고 설문 응답이 저장되지 않고 있다.

**작업** — `supabase/migrations/0012_rls_hardening.sql`

- [ ] `rail_steps`·`rail_compositions` RLS 활성화 + `read for all` 정책
- [ ] **모든 테이블에서 `anon`·`authenticated`의 INSERT/UPDATE/DELETE/TRUNCATE `revoke`**
      → RLS를 유일 방어선으로 두지 않는다. 새 테이블에 RLS를 잊어도 안 뚫린다
- [ ] `learner_answer_log` SELECT 정책 → `auth.uid() = learner_id`
- [ ] `user_profiles` 중복 정책 4개 → `ALL` 하나로
- [ ] **`survey_responses` 테이블 생성** — `src/components/survey/CallSurvey.tsx:40`이 없는 테이블에 insert 중

**완료 조건**
- anon 키 프로브: `rail_steps`·`rail_compositions`·`questions`·`lecture_steps` 전부 **`42501`**
- 관리 스크립트(postgres 역할)는 영향 없음 — `node scripts/import-rail-components.js` dry run 정상

---

### 🔴 STEP 1 — 유입 경로 일원화 · 1일

> **왜:** 문항은 크론으로 자동인데 **레일만 수동**이고, 2단계가 안 돌아서 **콘텐츠팀이 Part5 레일을 고쳐도 화면에 안 닿는다.** 게다가 DB에 직접 쓰는 스크립트가 크론과 경쟁 중이다.

**실측된 현재 경로**

```
PDF(LC/RC 1000) → load-toeic-*.js → DB 직접 ──┐ ← 크론과 경쟁. 다음 새벽에 되돌아감
                                              ↓
시트 문항입력_P1~P7 → gcp/sync-questions-fn → DB   (매일 03:00 KST · 가동 확인됨)
시트 스캐폴딩 탭 → dump → lecture_steps → rail_*   (전부 수동 · 2단계가 안 돎)
```

**작업**

- [ ] **레일 동기화를 `gcp/sync-questions-fn`에 합친다** — 문항과 레일이 같은 시각·같은 방식으로 내려오게. 별도 스크립트보다 낫다
- [ ] **정합 가드**: 변종화된 파트인데 재이식이 안 됐으면 **에러로 죽인다** (조용한 미반영을 구조적으로 불가능하게)
- [ ] `scripts/import-instructor-rails.js`의 `CONFIG.dump` 파일명을 현재 시트 탭명(`_초안(0713)`)으로 수정 — **지금 옛 덤프를 가리키고 있다**
- [ ] **`load-toeic-*.js` 5개 폐기** 또는 "시트 기입용"으로 전환. DB 직접 쓰기 금지
- [ ] 밀린 7칸(이도윤 `LC-P1-01`·`02`의 `student_prompt`) 당겨오기 — 시트 작업 끝났는지 콘텐츠팀 확인 후

**완료 조건**
- 시트에서 Part5 문구 한 칸 수정 → 다음 동기화 → `/lecture/RC-P5-08` 화면에 반영 (눈으로 확인)

---

### 🔴 STEP 2 — 어휘 고정 · 2~3일

> **왜:** 변종 dedup을 막는 건 `step_code` **151종**이다. 여기가 안 풀리면 뒤 단계가 파편화된 데이터를 옮긴다.
> **⚠️ 함정:** `interaction`만 정규화하면 변종이 **한 개도 안 줄어든다**(89 → 89). `S단계` 열이 핵심이다.

**작업 — DB** `supabase/migrations/0013_vocabulary.sql`

- [ ] `interactions` 룩업 신설(7코드) + `step_variants.interaction_code` FK
- [ ] `instructors` 룩업 신설 + FK. TS 로스터(`park`/`yun_daeun`/`lee_doyun`/`seo_jian`/`oh_jungja`)와 정합
- [ ] `step_types` → `scaffolding_steps` 개명 + `step_variants.step_code` **FK 강제**
- [ ] `rail_steps` → `step_variants` 개명, `rail_compositions` → `type_rails` 개명

**작업 — 코드**

- [ ] **`src/data/typeLearning/fromSteps.ts:166~182`의 정규식 사전을 룩업 조인으로 교체**
      → 해석 실패·오해석이 구조적으로 0이 된다. 지금은 `split('또는')[0]`으로 앞것을 무조건 고른다

**작업 — 콘텐츠팀 시트 (병행. 리드타임 있음)**

- [ ] **`S단계` 열 신설** (드롭다운 S1~S7, 필수) ← **이게 전부다**
- [ ] 한 턴에 S 여러 개(187행) → **대표 S 하나**로 접기. 쪼개지 않는다
- [ ] `(S없음)` 30행에 S코드 부여
- [ ] **"또는" 66행 단일값 확정** (`선택 응답 또는 AI 진행` 49행 포함)
- [ ] 표기 통일 드롭다운: `필수 수행 / 쉐도잉` ↔ `필수 수행(쉐도잉)`, `필수 수행 / 필기 인식` ↔ `필수 수행(필기 인식)`
- [ ] **`반복범위` 열 신설** (`item`/`type`/`lecture`, 기본 `item`)

**완료 조건**
- 변종 수 **89 → 51 이하** (파트별) / 공용 허용 시 **25 이하**
- `fromSteps` 해석 실패 0, RailInspector 경고 0

---

### 🔴 STEP 3 — 콘텐츠 모델 · 1.5~2주 · **최대 작업**

> **왜:** 코드 `PassageDoc`(`src/data/typeLearning/types.ts`)은 표·채팅·이메일 메타·문장 단위를 표현하는데, DB `questions.content`가 가진 건 `passage_text` **문자열 하나**다.
> → **"표 보고 푸는 유형"을 DB가 못 담는다. Part 2·3·4 문항이 DB에 0개인 것도 이 때문이다** — 안 넣은 게 아니라 넣을 데가 없다.

**작업 — DB** `0014_content_model.sql`

```sql
create table passages (
  id bigserial primary key, passage_code text unique,
  kind text not null,        -- text|email|notice|ad|article|chat|table|form
  title text, meta jsonb,    -- 이메일 To/From/Subject
  body jsonb                 -- table{headers,rows} / chat[] — 문장형이 아닌 것
);
create table passage_sentences (
  id bigserial primary key,
  passage_id bigint not null references passages(id) on delete cascade,
  seq smallint not null, en text not null, ko text,
  speaker text, blank_no smallint, audio_url text,
  unique (passage_id, seq)
);
create table question_types (
  id bigserial primary key, part smallint not null,
  type_code text not null unique, name text not null, description text
);
alter table questions
  add column question_type_id bigint references question_types(id),
  add column passage_id       bigint references passages(id),
  add column display_order    smallint;
alter table question_options add column display_order smallint;
```

- [ ] `passages`·`passage_sentences` 신설, 지문 이관 (지금 9행 중 distinct 4 = 중복 저장)
- [ ] **`question_types` 시드는 레일 뼈대 수 기준** — 강의 수가 아니다. Part5는 16강이지만 뼈대 6종. Part7은 8강 8유형(1:1)이어도 **테이블은 거친다**(나중에 한 강의에 유형이 섞일 때 구조가 안 바뀌게)
- [ ] `content` 표기 흔들림 정리 후 `question_type_id` 배정 — `광고·홍보문` 6 / `광고` 2 / `null` 1 → 하나로
- [ ] `display_order` 추가 → **정답을 배열 인덱스가 아니라 label로** 전달하도록 `questionStore.ts`의 어댑터 4개(`toP6Passage`·`toP7Passage`·`toP5Questions`·`toPart7Set`) 수정
- [ ] `TypeLesson` 형판 의존 축소 — `/lecture/[code]`의 `TEMPLATE_BY_PART`가 담던 지문 구조를 `passages`에서 읽게

**작업 — 콘텐츠팀 (D4. 최대 난관)**

- [ ] **시트에 지문 입력 탭 신설** — 평면 시트에 정규화 테이블(지문 1 : 문장 N)을 어떻게 넣을지 설계 필요

**완료 조건**
- **Part 2·3·4 문항을 DB에 넣을 수 있게 된다** (실제로 1강 분량 넣어서 확인)

---

### 🟠 STEP 4 — 커리큘럼 구조 · 1주

**작업** `0015_curriculum.sql`

```sql
alter table lectures add column seq smallint, add column is_demo boolean default false;

create table lecture_items (
  id bigserial primary key,
  lecture_id bigint not null references lectures(id) on delete cascade,
  seq smallint not null,
  question_type_id bigint not null references question_types(id),   -- ★ 유형 1:N
  phase text not null default 'lesson' check (phase in ('lesson','practice')),
  unique (lecture_id, seq)
);
create table item_questions (
  item_id bigint not null references lecture_items(id) on delete cascade,
  question_id bigint not null references questions(id),
  sub_order smallint not null,
  primary key (item_id, question_id)
);
```

- [ ] `content->>'stage'` → `phase` 이관, jsonb에서 제거
- [ ] `RC-P7-99`(데모 시뮬레이션용) → `is_demo = true`
- [ ] **`v_lecture_program` 뷰 생성** (§4 쿼리)
- [ ] **`/lecture/[code]`가 아이템을 순회** — Part1·5가 앵커 1문항만 수업하던 문제 해소
- [ ] 런타임에 회차(`occurrence`) 전달 — Fading의 전제
- [ ] 아이템이 넘어갈 때 `sendContextualUpdate` 재주입 (지금은 세션 시작 시 1회뿐)

**완료 조건**
- `/lecture/LC-P1-01` = **21턴**(7×3), `/lecture/RC-P5-08` = **35턴**(7×5), `/lecture/RC-P6-01` = **11턴**, `/lecture/RC-P7-03` = **14턴**

---

### 🟠 STEP 5 — 레일 통합 · 1주

> **왜:** 지금 레일이 **세 벌**이다.
> **(a)** `TUTOR_RAILS` (`src/data/tutorContent.ts` 371줄) — 채점·keywords·hints·branches·quickReplies·**Fading 보유**
> **(b)** `lecture_steps`/`rail_*` (DB) — 진행 지시만, **채점 장치 없음**
> **(c)** `wrong_answer_tags.default_step_sequence` (DB) — 오답 후 코칭
> `/api/tutor/route.ts:311`은 (a)가 있으면 그걸 쓰고 없을 때만 (b)로 간다.
> **(b)에 채점이 없어서 (a)를 대체 못 하는 것이, 변종화하고도 코드 레일이 안 사라진 이유다.**

**작업** `0016_rails_unified.sql`

```sql
create table type_rails (
  id bigserial primary key,
  question_type_id bigint not null references question_types(id),
  instructor_code text not null references instructors(code),
  version smallint not null default 1,
  step_order smallint not null,
  variant_id bigint not null references step_variants(id),
  audio_mode text, script_mode text,          -- ★ 음원 지시는 여기 (D8)
  student_prompt_override text,  tutor_directive_override text,
  student_prompt_seed text,      tutor_directive_seed text,
  unique (question_type_id, instructor_code, version, step_order)
);
create table variant_checks (
  variant_id bigint primary key references step_variants(id),
  keywords text[], hints text[], quick_replies text[], branches jsonb
);
alter table step_variants
  alter column part drop not null,                     -- 파트 공용 변종 허용
  add column scope text not null default 'item'
      check (scope in ('item','type','lecture')),
  add column fade_policy text,
  add column min_level smallint;
```

- [ ] `rail_compositions` → `type_rails` 이관 (소유자 강의 → 유형)
- [ ] **`TUTOR_RAILS` 371줄 → `variant_checks` 이관.** `/api/tutor:311`의 "코드 레일 우선" 분기 제거
- [ ] **임포터 보강** — 지금 `rail_steps.tutor_directive`가 **13개 전부 null**이다(임포터가 아예 안 채움). 최빈 문구를 변종 기본값으로, 나머지를 seed로. **안 고치면 변종화가 명목뿐이다**
- [ ] 임포트를 **delete+insert → version append**로 (과거 로그 보존)
- [ ] 이관 끝난 파트의 `lecture_steps` 행 삭제. **Part3·4만 잔존**(D5 미결)

**완료 조건**
- `src/data/tutorContent.ts`의 `TUTOR_RAILS`가 코드에서 사라진다
- 4개 강의 재생 + RailInspector 경고 0

---

### 🟠 STEP 6 — 학습자 상태 · 4~5일

> **왜:** Fading이 이미 `/api/tutor/route.ts:160~171`에 구현돼 있는데(`full`/`reduced`/`minimal`), 판정 상태가 **in-memory `Map`** 이라 서버리스에서 소실된다. 그리고 진도·오답노트가 전부 Zustand(브라우저)에만 있어 새로고침하면 사라진다.

**작업** `0017_learner_state.sql`

```sql
create table learning_events (
  id bigserial primary key,
  learner_id uuid not null references auth.users(id),
  lecture_id bigint, item_id bigint, question_id bigint,
  question_type_id bigint, type_rail_id bigint, rail_version smallint,
  variant_id bigint, step_code text, turn_order smallint,
  occurrence smallint,                       -- 같은 유형 몇 번째 (Fading 근거)
  instructor_code text, event_type text,     -- turn_shown|response|hint|complete
  response text, is_correct boolean, latency_ms int,
  at timestamptz not null default now()
);
create table learner_progress (
  learner_id uuid, lecture_id bigint, question_type_id bigint,
  completed_count smallint, mastery smallint, fading_level text, last_at timestamptz,
  primary key (learner_id, lecture_id, question_type_id)
);
```

- [ ] `/api/tutor`의 in-memory `mastery` Map → `learner_progress`
- [ ] **Fading을 유형학습 레일에도 적용** — `fade_policy` + `occurrence`, §3 원리 3의 `WHERE` 한 줄
- [ ] `normalizeLearnerId()`의 DEMO UUID 뭉침 제거
- [ ] `learner_answer_log` → `learner_answer_log_archive` 리네임 (1,200행 보존)

**완료 조건**
```sql
select v.step_code, e.occurrence, avg(e.is_correct::int)
from learning_events e join step_variants v on v.id = e.variant_id
group by 1,2;    -- "S6를 받은 회차별 정답률"이 나오면 성공
```

---

### 🟡 STEP 7 — 정리·인계 · 3일

- [ ] `0018_baseline.sql` — DB에만 있던 `fgi_surveys`·`fgi_survey_questions`·`fgi_responses` 역추출
- [ ] `subject_choices` 삭제 (Part5 실험 잔재)
- [ ] **빈 Supabase 프로젝트에 마이그레이션만 돌려 재구축되는지 실증** — 지금은 불가능
- [ ] 전건 스캔 쿼리 정리 — `fetchLecturesWithQuestions`(questions 전건을 브라우저로 받아 JS로 카운트) · `fetchCurriculumLectures`(그걸 또 호출)
- [ ] **캐치잇 인계 문서** — ERD + §9 "안 깔끔한 채로 남는 것"

---

## 8. 하지 말 것 (의도적으로)

| 항목 | 이유 |
|---|---|
| **조건 분기(`branch_on`) 설계** | `"선택 응답 또는 AI 진행"`에서 무엇을 보고 가를지가 **정의된 적이 없다.** 지금 만들면 추측이 스키마로 굳는다 |
| **처음부터 정교한 유형 정의** | 레일 뼈대 수로 시드하고 **나중에 합쳐 나간다.** Part5 16강이 실은 13변종이었듯 |
| **Part3·4 변종화** | `audio_mode` 조건부 문장 미결(D5). 결정 전 이식은 부채 |
| **15유형 UI 부활** | 07-21 결정(문항 렌더러로 격하) 유지. 유형은 **데이터 층에서만** |
| **Zustand 7종 전부 DB화** | 진도·오답노트만. 북마크·단어장은 MVP1 |
| **`part7*` 변종 화면 정리** | CLAUDE.md — 의도적 중복. DB 정리와 분리 |
| **`questions.content` jsonb 완전 제거** | 지문류만 빠지면 남는 건 파트 고유 필드 5~6개. 컬럼으로 빼면 NULL 컬럼만 는다 |

---

## 9. 이대로 해도 안 깔끔한 채로 남는 것 (정직하게)

| 남는 것 | 이유 |
|---|---|
| `questions.content` jsonb 일부 | 위 참조. 의도적 |
| 로그 두 벌 (한동안) | `learner_answer_log_archive` 보존 + 신규는 `learning_events` |
| Part3·4 `lecture_steps` | D5 결정 전까지 |
| `part7*` 변종 화면 하드코딩 | CLAUDE.md가 금지 |
| 로컬 TS 형판 완전 제거 | STEP 3은 **의존 축소**까지. 완전 제거는 MVP1 |

**그리고 진짜 관문은 DB가 아니라 입력 경로다.** D4(지문을 평면 시트에 어떻게 넣나)에서 막히면 스키마가 아무리 깔끔해도 데이터가 안 들어온다.

---

## 10. 사람이 정해야 진행되는 것

| # | 결정 | 누가 | 막는 단계 |
|---|---|---|---|
| **D1** | "또는" 66행 단일값 확정 | 콘텐츠팀 | STEP 2 |
| **D2** | **시트 `S단계` 열 + 드롭다운 신설** | 콘텐츠팀 | **STEP 2 (핵심)** |
| **D3** | 한 턴에 S 여러 개(187행) → 대표 S 하나 / `(S없음)` 30행 부여 | 콘텐츠팀 | STEP 2 |
| **D4** | **시트 지문(표·대화·문장) 입력 탭** | 콘텐츠팀+기획 | **STEP 3 (최대 난관)** |
| **D5** | Part3·4 `audio_mode` 조건부 — 규격화 / 튜터 위임 / 단순화 | 기획+콘텐츠 | STEP 5 |
| **D6** | `P5-07`(S2 유형·역할 판별) · `P5-08`(S2 유형 판별) 같은 변종인가 | 콘텐츠팀 | STEP 5 |
| **D7** | **FGI에서 LC(Part2·3·4) 시연하나?** | 기획 | **STEP 3 규모** |
| **D8** | 음원 지시를 변종 속성으로 둘까 조합에 둘까 (25 vs 77) | 기획 | STEP 5 — **본 문서는 "조합" 안으로 작성됨** |

**D1~D3은 한 번에 던져야 한다.** 시트 작업이라 리드타임이 있고 STEP 2가 전부 여기 걸린다.
**D7이 일정을 가른다** — LC를 시연 안 하면 STEP 3이 1.5주 → 5일.

---

## 11. 일정

| 주차 | 단계 | 산출물 |
|---|---|---|
| 7/28 (반나절) | STEP 0 | `0012` 보안 + `survey_responses` |
| 7/28 | D1~D3 전달 | 콘텐츠팀 시트 요청 |
| 7/29~7/30 | STEP 1 | 유입 경로 일원화 |
| 7/31~8/5 | STEP 2 | `0013` 어휘 확정 (변종 89→51) |
| 8/6~8/18 | STEP 3 | `0014` 지문 모델 |
| 8/19~8/25 | STEP 4 | `0015` 아이템 + `v_lecture_program` |
| 8/26~9/1 | STEP 5 | `0016` 레일 3벌 → 1벌 |
| 9/2~9/6 | STEP 6 | `0017` 이벤트 로그 + Fading |
| 9/8~9/10 | STEP 7 | `0018` + 인계 |

**FGI(8~9월)와 겹친다.**
- **STEP 0~2는 밀 수 없다** — 사고 방지 + 콘텐츠팀 실험 가능성
- **STEP 3~4가 본체**
- **STEP 5~6은 FGI 이후 가능** — 단 6을 미루면 그 사이 로그는 못 쓴다(레일 버전 미상)

---

## 12. 검증 (모든 STEP 공통)

```bash
npm run build                                   # strict TS 게이트 = 이 레포의 테스트
node scripts/import-rail-components.js          # dry run — 이식 무손실 확인
```

브라우저 **정본 진입점은 `/lecture/*`** (`/type-lesson/t*` 아님):

```
/lecture/LC-P1-01    /lecture/RC-P5-08    /lecture/RC-P6-01    /lecture/RC-P7-03
```

- 4강 전부 재생 + **RailInspector(우하단 🧩) 경고 0**
- 에이전트 연결 시 첫 마디 정상 + 문항 사실 주입

> 경고가 0이 아니면 그 단계는 안 끝난 것이다. RC-P6-01 오기입은 이 장치 덕에 잡혔다.

---

## 13. 인수인계 메모 (작업 중 걸릴 것들)

- **`next dev`가 도는 중에 `npm run build`를 돌리면 `.next`가 덮여 dev 서버가 깨진다.** 코드 문제가 아니다 → `rm -rf .next && NODE_OPTIONS="--max-old-space-size=4096" npm run dev`
- **문항 DB를 직접 수정하지 마라.** 매일 03:00 KST 크론이 시트에서 덮는다. 시트(`1VUGfsCvqvg1QNN9QTISfJWMUtPPim2Cz04KHO190fpY`)에서 고칠 것
- **구글 시트 토큰**: `scripts/token.json`은 만료(`invalid_grant`). `scripts/token_sheets_rw.json`은 살아 있으나 Python 형식이라 Node에서는 `OAuth2` + `setCredentials({refresh_token})`으로 붙여야 한다. `scripts/google-auth.js`는 `token.json`만 본다
- **Gemini**: `gemini-2.5-flash`는 신규 사용자에게 폐기됨 → `gemini-3.5-flash` 사용 중. thinking이 기본 on이라 `maxOutputTokens`를 넉넉히(4000). 키 없으면 `/api/rail-prompts`가 조용히 빈 값을 주고 화면은 폴백 문구로 정상 동작
- **폴백이 오류를 삼킨다**: `fetchQuestionsByCodes`는 코드 하나라도 없으면 `null` → 화면이 하드코딩 데이터로 조용히 되돌아간다. DB가 비어도 화면은 멀쩡해 보인다

---

## 14. 에이전트 경계 (이 재설계로 안 바뀜)

```
DB(문항·지문·레일) → turns → directiveOf(turn) → ElevenLabs 에이전트가 자기 말투로 (낭독 금지)
                          → buildLessonFacts() → sendContextualUpdate (사실 주입, 창작 금지)
   tutorAgentFor(instructor) → 강사별 agentId
   화면 UI 문구(배너·버튼) → React가 그림 (에이전트는 못 만듦)
```

**에이전트 쪽은 손대지 않는다.** DB가 바뀌면 말하는 내용이 바뀔 뿐이다.
단 STEP 4 이후 **아이템이 넘어갈 때 `sendContextualUpdate` 재주입**이 필요하다.

---

## 15. 관련 문서

| | 위치 |
|---|---|
| **DB 진단(문제 목록·실측)** | `docs/db-audit-0728.md` |
| 스캐폴딩 레일 이전 진행상황 | `docs/scaffolding-rail-plan.md` (v1 — 용어 "부품" 사용) |
| 커리큘럼 재편 | `docs/curriculum-restructure-plan.md` |
| 튜터 엔진 설계 | `docs/tutor-engine.md` |
| 스캐폴딩 설계 정본 | 구글시트 **AI어학원 콘텐츠** `1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8` |
| 문항 콘텐츠 정본 | 구글시트 **AI어학원 문항 입력** `1VUGfsCvqvg1QNN9QTISfJWMUtPPim2Cz04KHO190fpY` |
