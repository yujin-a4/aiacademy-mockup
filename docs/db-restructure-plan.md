# 스캐폴딩 DB 재설계 — 실행 계획 (v4)

**최종 갱신:** 2026-07-28 · **진단 근거:** [`docs/db-audit-0728.md`](./db-audit-0728.md)
**상태:** STEP 0~6 + LC 화면 완료. **다음은 STEP 7**(정리·인계).
미완: STEP 1의 GCP 배포분 · STEP 5의 `TUTOR_RAILS` 이관(FGI 이후) · `lecture_steps` 삭제 ·
STEP 6의 브라우저 클릭 검증과 Fading 실효화(D11).

> **레일이 어디까지 접혔나:** `lecture_steps` **965행**은 강의마다 레일을 따로 적어놨기 때문이다
> (강의 43 × 강사 3 × 턴 7~12). STEP 5에서 **429행(-56%)** 으로 접었고, 정본 화면이 보는
> Part 1·5·6·7은 `type_rails` **325행**으로 돈다. **강의가 500개로 늘어도 이 표는 안 늘어난다.**
> LC(P2·3·4)는 접으면 강의별 내용이 사라져서 일부러 남겼다(아래 STEP 5 참조).

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

| | 상태 (STEP 3 반영) |
|---|---|
| 문항 | **93개** — Part 1·5·6·7 83 + **Part 2·3·4 10**(STEP 3에서 스키마가 생겨 들어감) |
| 지문 | `passages` **10개**(이관 6 + LC 실증 4) · 문장 52행. 이관 전에는 문항마다 통째로 중복 |
| 유형 | `question_types` **17종** — 레일 뼈대 수 기준 |
| 강의 | 43개 중 **24개가 문항 0개** |
| 레일 | `lecture_steps` 965행(강의별) · `rail_compositions` 112행(Part5만 변종화) |
| 화면 | `/lecture/[code]` 가 정본 진입점. Part 1·5·6·7 4개 강의만 DB로 돎. **LC 화면은 미지원(D7 대기)** |
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

- [x] **`scripts/check-rail-sync.js` 신설** — 읽기 전용 정합 검사. ①드리프트(이식본 ≠ 원본) ②이식 누락 ③덤프 신선도. 불일치면 **종료코드 1**
- [x] **`scripts/sync-rails.js` 신설** — 2단계를 한 명령으로. `--go` 없이는 검사만. 1단계 실패 시 2단계로 안 넘어가고, 끝나면 반드시 검증
- [x] **덤프 파일명 복원력** — `import-instructor-rails.js`가 `CONFIG.dump`를 못 찾으면 같은 강사 접두사 중 **가장 최근 덤프**로 대체하고 경고. (기존 진단에서 "옛 덤프를 가리킨다"고 했으나 **사실이 아니었다** — 파일은 존재했다. 진짜 위험은 시트 탭명이 바뀐 뒤 재덤프할 때라 그쪽을 막았다)
- [x] **`load-toeic-*.js` 5개 실행 차단** — DB 직접 쓰기는 새벽 크론에 덮인다. 배너 + `--force-direct-db` 없이는 종료코드 1. 파일은 "어떤 교재 문항을 어떻게 매핑했는지" 기록으로 남김
- [ ] **레일 동기화를 `gcp/sync-questions-fn`에 합치기** — 문항과 레일이 같은 시각·같은 방식으로. **GCP 배포 권한 필요라 미완**. 그때까지는 사람이 `sync-rails.js --go`를 돌린다
- [ ] 밀린 7칸(이도윤 `LC-P1-01`·`02`의 `student_prompt`) 당겨오기 — **구글 토큰 만료로 미완**(§13). 시트 작업 끝났는지 콘텐츠팀 확인 후

**측정 결과 (2026-07-28)**

```
node scripts/check-rail-sync.js
  [1] 드리프트  ✓ P5 / lee_doyun — 112행 일치
  [2] 이식 누락 ! P5 / common(112행) · yun_daeun(96행) — 이 파트는 이식됐는데 두 강사만 빠짐
  [3] 덤프 신선도 ✓ 덤프 6개 모두 DB보다 오래됨
```

> **⚠️ 진단 수정:** "콘텐츠팀이 Part5 레일을 고쳐도 화면에 안 닿는다"는 **현재 발생 중인 버그가 아니다.**
> 지금은 112행이 정확히 일치한다. 2단계가 수동이라 **다음에 시트를 고치면 어긋나는 잠재 위험**이었다.
> 이제 `check-rail-sync.js`가 그 어긋남을 종료코드 1로 알린다.

**완료 조건**
- 시트에서 Part5 문구 한 칸 수정 → `node scripts/sync-rails.js --go` → `/lecture/RC-P5-08` 화면에 반영 (눈으로 확인)
- `node scripts/check-rail-sync.js` 종료코드 0

---

### 🔴 STEP 2 — 어휘 고정 · 2~3일

> **왜:** 변종 dedup을 막는 건 `step_code` **151종**이다. 여기가 안 풀리면 뒤 단계가 파편화된 데이터를 옮긴다.
> **⚠️ 함정:** `interaction`만 정규화하면 변종이 **한 개도 안 줄어든다**(89 → 89). `S단계` 열이 핵심이다.

> **방침 변경(2026-07-28):** 이 목업에서는 **시트 자동 연동이 목표가 아니다**(콘텐츠팀 검수용 별도
> 툴 프로젝트에서 필요할 일). 그래서 "콘텐츠팀이 시트에 `S단계` 열을 만들어줄 때까지 대기"를 없애고,
> **DB에서 별칭표로 해결**했다. 시트 정리는 나중에 별칭표를 보고 하면 된다.

**작업 — DB** `supabase/migrations/0013_vocabulary.sql` ✅ 적용 완료

- [x] `step_types`에 **`S0`(듣기·자력 선택) 추가** — 데이터에 42행 있는데 마스터에 없었다(0006이 도입만 하고 누락)
- [x] `instructors` 룩업(6종: common + 로스터 5명) + `has_rail` 플래그
- [x] `interactions` 룩업(8코드). `ui_kind`는 `fromSteps.ts`의 `Kind`와 1:1
- [x] `interaction_aliases` — 시트 원문 20종 → 코드. **현행 정규식 판정을 그대로 옮겨 회귀 0**
- [x] `step_code_aliases` — S코드 없는 원문 10종 → S코드. 정의와 대조되는 6종만 매핑, **근거 없는 4종은 `needs_review`**
- [x] `step_variants` 신설 (`scope`·`fade_policy`·`min_level` 칸 포함, 아직 런타임 미연결)

**작업 — 스크립트** ✅

- [x] `scripts/build-step-variants.js` — `lecture_steps` 전수 → 변종 도출 + 커버리지 리포트. dry run 기본

**측정 결과 (2026-07-28)**

```
전체 965행 → 변종 20개 · 커버리지 358/364 = 98.4% (상호작용 열 있는 레일 기준)
```

| 단계 | 변종 | 상호작용 |
|---|---|---|
| S3 개념 코칭 | **1** | AI 진행 |
| S6 오답 제거 | **1** | 선택 응답 |
| S7 표현 정리 | **1** | AI 진행 |
| S0 듣기·자력 선택 | 2 | 필수 응답 · 필기 인식 |
| S1 핵심 단서 | 3 | 필기 인식 · 주관식 · AI 진행 |
| S4 구조·흐름 | 3 | 필기 인식 · 선택 · 주관식 |
| S2 유형 판별 | 4 | 선택 · AI 진행 · 주관식 · 필기 인식 |
| S5 근거 연결 | 5 | 쉐도잉 · AI 진행 · 선택 · 필기 인식 · 매칭 |

**8단계 중 3개는 변종이 1개뿐이다.** 갈리는 건 S2·S5뿐.

**🔴 새로 드러난 제약 — 변종화가 이도윤 레일에서만 가능하다**

```
상호작용 열 자체가 없음 — 601행 (yun_daeun 302 · common 299)
```

시트에서 '상호작용 방식' 열이 있는 건 **이도윤 레일뿐**이다(9열/7열 구성. 윤다은은 4열).
즉 다른 강사 레일은 **화면 동작이 지정돼 있지 않아** 변종으로 접을 수 없다. → **D9**

**남은 것**

- [ ] `step_types` → `scaffolding_steps` 개명 — **STEP 5로 미룸.** `src/lib/tutorDb.ts`의 `loadStepTypes()`가 이 이름을 참조한다. 코드와 함께 바꿔야 안전
- [ ] `rail_steps` → `step_variants` 통합 — STEP 5(`type_rails` 도입)에서
- [ ] `fromSteps.ts:166~182` 정규식 → 별칭표 조회로 교체 — STEP 5에서 런타임 전환과 함께
- [ ] `needs_review` 14건 사람 확인 (D1·D3·D9)

**완료 조건**
- [x] 변종 사전이 상호작용 열 있는 레일의 98% 이상을 덮는다
- [ ] `fromSteps` 해석 실패 0, RailInspector 경고 0 (STEP 5 런타임 전환 후)

---

### 🔴 STEP 3 — 콘텐츠 모델 · 1.5~2주 · **최대 작업**

> **왜:** 코드 `PassageDoc`(`src/data/typeLearning/types.ts`)은 표·채팅·이메일 메타·문장 단위를 표현하는데, DB `questions.content`가 가진 건 `passage_text` **문자열 하나**다.
> → **"표 보고 푸는 유형"을 DB가 못 담는다. Part 2·3·4 문항이 DB에 0개인 것도 이 때문이다** — 안 넣은 게 아니라 넣을 데가 없다.

**작업 — DB** `supabase/migrations/0014_content_model.sql` ✅ 적용 완료

- [x] `passages`·`passage_sentences` 신설 + `scripts/build-passages.js` 로 지문 이관
- [x] **`question_types` 17종 시드 — 레일 뼈대 수 기준**(강의 수 아님). 아래 실측 참조
- [x] `content` 표기 흔들림은 **DB에서 고치지 않고 `passage_type_aliases`(별칭표)로 해석** —
      `광고·홍보문` 6 / `광고` 2 는 크론이 매일 시트에서 덮으므로 DB에서 통일해도 되돌아간다.
      STEP 2가 상호작용에 쓴 방식과 같다. 시트 통일은 `needs_review = true` 로 남겨 뒀다
- [x] `display_order` 추가 + 어댑터가 **정답 위치를 label에서 계산**하도록 (`answerIndex()`)
- [x] `TypeLesson` 형판 의존 축소 — `fromDb.ts` 가 지문을 `passages` 에서 읽는다(`passageDocOf`).
      DB에 지문이 없으면 예전처럼 문자열을 쪼개는 폴백이 남아 있다
- [x] **`question_options.display_order` 트리거** — 이 컬럼은 밤마다 날아간다(§13 참조). 트리거로 막았다

**작업 — 시트 경로 (D4)** ✅ 설계·구현 완료 · 탭 개설은 콘텐츠팀

- [x] `지문입력` 탭 규격 확정 + `scripts/sync-questions.js`·`gcp/sync-questions-fn` 양쪽에 구현.
      탭이 없으면 조용히 건너뛴다(지금 상태). **탭만 만들면 바로 돈다**

```
passage_code | lecture_code | kind | title | meta | row_kind | seq | speaker | en | ko | blank_no | audio_url
```

- **문장 한 줄 = 행 하나.** 지문 단위 값(kind·title·meta)은 그 지문 첫 행에만 —
  문항입력 탭이 "보기 한 줄 = 행 하나"인 것과 같은 규칙이라 콘텐츠팀이 새로 배울 게 없다
- `meta` = `To=All Managers | From=Jennifer Walsh`
- `row_kind` 를 `표머리`/`표행` 으로 두면 `en` 을 `Item | Price` 로 나눠 **표**가 된다 (P3·P4 시각자료)
- 문항입력_P* 탭에 **`passage_code` 열 하나**를 추가하면 문항이 지문에 붙는다

**측정 결과 (2026-07-28)**

```
node scripts/build-passages.js --go
  문항 83행 · 지문 6개 · 문장 35행 · 문항 링크 17건
    RC-P6-01-PSG1  email   문장 8 · 빈칸 4 · meta 3   ← To/From/Subject 가 본문에서 분리됐다
    RC-P6-01-PSG2  email   문장 10 · 빈칸 4
    RC-P7-03-PSG1  ad      문장 9
    RC-P7-03-PSG2  ad      문장 1     ← 원문에 줄바꿈이 없어 한 덩어리. 시트에서 쪼개야 문장 단위가 산다
    RC-P7-03-PSG3  ad      문장 5
    RC-P7-99-PSG1  notice  문장 2
```

| | 이관 전 | 이관 후 |
|---|---|---|
| 지문 저장 | 문항마다 통째로 중복 (17행) | **6개** + 문장 35행 |
| 이메일 머리(To/From) | 본문 문자열에 섞여 있음 | `passages.meta` |
| 빈칸 위치 | 화면이 정규식으로 매번 추출 | `passage_sentences.blank_no` |
| 표·화자 | **담을 자리 없음** | `body.table` · `sentences.speaker` |

**`question_types` 시드 근거 — 뼈대 17종** (`lecture_steps` 의 `lee_doyun` 레일 순서열 distinct)

| 파트 | 강의 | 뼈대 |
|---|---|---|
| P1 | 2 | 2 |
| P2 | 4 | 2 |
| P3 | 5 | **1** |
| P4 | 5 | **1** |
| P5 | 16 | **6** ← 계획서가 말한 그 숫자 |
| P6 | 2 | 1 |
| P7 | 8 | **4** |

> ⚠️ **진단 수정:** 계획서 원문은 "Part7은 8강 8유형(1:1)"이라고 했으나 **실측은 4다.**
> RC-P7-01~05(이메일·공지·광고·기사·채팅)가 **레일이 완전히 같다.** 지문 종류가 다를 뿐이고,
> 그건 `passages.kind` 가 들고 있다. 갈리는 건 양식(06)·이중(07)·삼중(08) 셋뿐이다.
> S코드로 정규화하면 17 → 13까지 더 줄어든다. 그래도 **17로 시드했다** — §8 "나중에 합쳐 나간다".
> 합치는 건 `UPDATE` 한 줄이고 쪼개는 건 데이터 재배정이라 비싸다.

**완료 조건**

- [x] **Part 2·3·4 문항을 DB에 넣을 수 있게 된다** — `scripts/seed-lc-sample.js --go` 로 실증

```
LC-P2-01  utterance 문장1        문항 1 · 보기 3    (질문 발화)
LC-P3-01  dialogue  문장8 화자8  문항 3 · 보기 12   (대화)
LC-P3-05  dialogue  문장5 화자5 + 표(Item|Price)  문항 3 · 보기 12   (시각자료형)
LC-P4-01  talk      문장4        문항 3 · 보기 12   (담화)
```

> 콘텐츠 출처는 `src/data/typeLearning/lessonsLC.ts` 의 T2~T5다. 지어낸 게 아니라 레포에 이미
> 있던 것을 옮긴 것이고, 이건 "로컬 TS 형판 의존 축소"와 같은 방향이다.
> 시트에 같은 `question_id` 가 생기면 그쪽이 이긴다(크론이 upsert 하므로 그게 맞다).

**남은 것**

- [ ] **콘텐츠팀: 시트에 `지문입력` 탭 개설** (규격은 위. 코드는 준비돼 있음) — D4
- [x] **LC 화면**(Part 2·3·4) — D7 해소로 착수·완료. 아래 참조
- [ ] `RC-P7-03-PSG2` 처럼 줄바꿈 없는 지문은 문장 1개로 잡힌다. 문장 단위 기능(구간 재생·직독직해)이
      안 걸리므로 시트에서 줄을 나눠야 한다
- [ ] `passage_sentences.ko`(직독직해)가 **전부 null** — 시트에 해석 열이 없다. P7 레일이 '문장 탭해서
      해석' 대신 '근거 문장 표시'로 도는 이유가 이것(`fromDb.ts` 머리 주석)
- [ ] `questions.content` 의 지문 문자열은 **아직 안 지웠다.** 시트가 정본이라 지워도 새벽에 돌아온다.
      `지문입력` 탭으로 옮긴 뒤 문항 탭에서 지문 열을 빼는 게 순서다

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

- [x] `content->>'stage'` → `phase` 이관. **jsonb에서는 못 지운다** — 지워도 새벽 크론이 시트에서 되돌린다.
      정본은 `lecture_items.phase`, jsonb는 잔존. 시트 문항 탭에서 stage 열을 빼는 게 먼저다
- [x] `RC-P7-99`(데모 시뮬레이션용) → `is_demo = true` · `lectures.seq` 1~42 부여
- [x] **`v_lecture_program` 뷰 생성**
- [x] **`/lecture/[code]`가 아이템을 순회** (`fromItems.ts` 신설)
- [x] 런타임에 회차(`occurrence`) 전달 — `Turn.occurrence` · `TypeLesson.items`
- [x] 아이템이 넘어갈 때 `sendContextualUpdate` 재주입

> **뷰에 대해 — 데이터가 아니다.** `v_lecture_program` 은 저장 행이 **0개**인 저장된 쿼리다.
> 발화 문구도 안 들어간다(문구는 `railPrompts.ts` 가 LLM으로 매번 만든다).
> 만든 이유는 하나: 지금 화면이 레일을 읽으려면 원시 테이블 두 개(`rail_compositions` 먼저,
> 없으면 `lecture_steps`)와 강사 폴백 규칙을 알아야 하는데, STEP 5에서 그게 `type_rails` 하나로
> 바뀐다. 뷰를 끼워두면 **그때 뷰 안쪽만 고치고 화면은 안 고친다.** 부담되면 걷어내도 된다(클라이언트 20줄).

**측정 결과 (2026-07-28) — 계획서 완료 조건 그대로**

```
node scripts/build-lecture-items.js --go     → 아이템 76개 · 문항 링크 93건

LC-P1-01  21턴 (기대 21) ✓  아이템 3 · 레일 DB · 회차 1,2,3  · 경고 0
RC-P5-08  35턴 (기대 35) ✓  아이템 5 · 레일 DB(변종 조합) · 회차 1~5 · 경고 0
RC-P6-01  11턴 (기대 11) ✓  아이템 1 · 레일 DB · 회차 1 · 경고 1
RC-P7-03  14턴 (기대 14) ✓  아이템 2 · 레일 DB · 회차 1,2 · 경고 0
```

**턴 수는 저장한 값이 아니라 계산값이다.** 21 = 레일 7단계 × 사진 3장.
사진이 5장으로 늘어도 레일 행은 그대로 7행이고 35턴이 된다. 그게 이 구조의 목적이다.

> 🔴 **점검 중 발견 — 정본 화면이 DB 레일을 안 읽고 있었다.**
> `/lecture/[code]`(정본)는 문항만 DB에서 읽고 **레일은 코드 생성분을 썼다.** DB 레일을 읽는 건
> `/type-lesson`(문항 렌더러 프리셋, 07-21에 격하된 쪽)뿐이었다.
> → **콘텐츠팀이 시트에서 레일을 고쳐도 정본 화면에는 안 닿았다.** STEP 1의 진단("2단계가 안 돎")은
> 유입 경로만 봤기 때문에 이걸 못 잡았다. 이번에 연결했고, RailInspector도 정본에서 뜬다.

**남은 것**

- [ ] **경고 1건 — `RC-P6-01` 1번 턴 `S4 지문 읽기 시작`.** 상호작용이 `선택 응답 또는 AI 진행`이라
      화면이 뭘 할지 못 정한다(**D1**, 66행짜리 문제). 지문 읽기 시작이니 `AI 진행`이 맞아 보이지만
      기획이 정할 일이다. 지금은 현행대로 앞것(선택 응답)을 취해 정답 고르기로 떨어진다
- [ ] `/type-lesson/[typeId]` 는 **아직 앵커 1문항 방식**이다. 정본이 아니라 그대로 뒀다(t01 = 7턴).
      정본(`/lecture/LC-P1-01` = 21턴)과 턴 수가 다른 건 이 때문이고, 의도된 것이다
- [ ] `lecture_steps` **965행은 아직 그대로다.** 뼈대 17종 × 7단계 ≈ 120행이면 덮인다. 걷어내는 건 STEP 5

---

### 🟢 LC 화면 (Part 2·3·4) — D7 해소로 착수 · 완료

> **왜 여기 있나:** STEP 3에서 DB는 담게 됐지만 화면 형판이 1·5·6·7뿐이었다.
> 2026-07-28 기획 결정으로 **FGI에서 LC도 시연**하기로 해서 붙였다. 쉐도잉은 범위 밖(D10).

**작업** ✅

- [x] `fromDb.ts` `buildLc()` — P2(질문 발화 청취 → 보기별 판단) · P3·P4(문제 먼저 → 전체 청취 → 문항별 근거)
- [x] LC는 지문을 눈으로 읽는 게 아니라 **음원 스크립트**를 듣는다 → `content.audioScript`(문장 단위 =
      구간 재생 단위) · 표는 `content.visual` · P2는 `optionAudio`. 재료는 전부 `passage_sentences`(0014)
- [x] **같은 지문 묶는 기준을 `passages` 로 교체** — LC는 `content` 에 지문 문자열이 아예 없어서
      예전 기준(`passage_text`/`passage_context`)으로는 대화 3문항이 안 묶였다
- [x] `fromItems` 가 음원 스크립트·시각자료도 아이템 접두어 붙여 병합
- [x] `TEMPLATE_BY_PART` 에 2·3·4 추가
- [x] **쉐도잉 턴은 상호작용 해석 직후에 버린다** — 음원·스크립트를 먼저 해석하면 *버릴 턴에 대한*
      경고가 쌓인다(Part3에서 3건씩). 검토 패널이 시끄러워지면 진짜 문제가 안 보인다

**측정 결과 (2026-07-28)**

```
LC-P2-01   8턴 · 아이템 1 · 문항 1 · 스크립트 1문장        · 레일 DB · 경고 0
LC-P3-01   9턴 · 아이템 1 · 문항 3 · 스크립트 8문장        · 레일 DB · 경고 6
LC-P3-05   9턴 · 아이템 1 · 문항 3 · 스크립트 5문장 + 표   · 레일 DB · 경고 6
LC-P4-01   9턴 · 아이템 1 · 문항 3 · 스크립트 4문장        · 레일 DB · 경고 6
```

레일은 12단계인데 9턴인 이유: **쉐도잉 3턴을 건너뛴다**(FGI 결정).

**남은 경고 6건은 전부 기획 결정 대기 — 코드로 풀 수 없다**

| 건수 | 내용 | 결정 |
|---|---|---|
| 3 | `Qn-S2+S4` 음원 지시가 조건부 — *"Q1 예상 타이밍을 안내하고, **근거가 명확하면** 해당 지점에서 멈추거나 표시한다. **근거가 불명확하면** Q1을 보류하고 Q2로 이동한다"*. 화면은 '근거가 명확한지'를 판단할 수 없다 | **D5** |
| 3 | `선택 응답 또는 AI 진행` — 무엇을 보고 가를지 정의된 적이 없다 | **D1** |

> **D5에 실물 근거가 생겼다.** "규격화 / 튜터 위임 / 단순화" 중 고르려면 실제 문장이 필요했는데,
> 이제 어느 강의 몇 번째 턴인지까지 나온다(위 표). 셋 중 **튜터 위임**이 제일 가까워 보인다 —
> "근거가 명확한지"는 에이전트가 학생 답을 듣고 판단할 수 있고, 화면은 못 한다. 다만 기획 결정이다.

**남은 것**

- [ ] **문장 mp3가 없다** — `passage_sentences.audio_url` 전부 null. 지금은 브라우저 TTS로 읽는다.
      수업은 돌지만 성우 음원이 아니다. **FGI 시연 전에 채워야 한다**
- [ ] LC 세션 정리(recap)는 로컬 형판 그대로 — 문장 해석(`ko`)이 DB에 없다
- [ ] LC는 실전(practice) 문항이 아직 없다 (수업 문항만 넣었다)

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

**작업** ✅ `0016_rails_unified.sql` · `0017_program_view_type_rails.sql`

- [x] **`type_rails` 신설 + 레일의 소유자를 강의 → 유형으로** (`scripts/build-type-rails.js`)
- [x] **유형 17 → 19 재시드** — 유형 안에서 레일이 갈리는 2강을 분리해 "유형 = 레일"을 1:1로
- [x] 임포트를 **delete+insert → version append**로 (과거 로그가 어느 레일이었는지 되짚을 수 있게)
- [x] **`v_lecture_program` 의 rail CTE 교체** — 화면 코드는 **한 줄도 안 고쳤다.** 0015에서 뷰를 미리
      만들어 둔 이유가 이거다

**측정 결과 (2026-07-28)**

```
node scripts/build-type-rails.js --go
  lecture_steps 965행 → type_rails 429행 (56% 감소)
    강사          레일(유형)   단계 행   변종 미매핑
    common              19       132         132     ← D9: 상호작용 열이 없다
    lee_doyun           19       159           4
    yun_daeun           19       138         138     ← D9
  반영: Part 1·5·6·7 — 325행 (LC 104행은 접지 않음)
```

**이관 전후 화면 무변화 확인** — 이게 이 단계의 진짜 완료 조건이다.

```
LC-P1-01 21턴 · RC-P5-08 35턴 · RC-P6-01 11턴 · RC-P7-03 14턴   (경고 0/0/1/0)
LC-P2-01  8턴 · LC-P3-01  9턴 · LC-P3-05  9턴 · LC-P4-01  9턴   (경고 0/6/6/6)
→ 턴 수·경고 수 모두 이관 전과 동일. 레일 원천만 바뀌었다.
```

| 파트 | 레일 원천 (지금) |
|---|---|
| 1·5·6·7 | **`type_rails`** (유형 단위) |
| 2·3·4 | `lecture_steps` (강의별) — 아래 이유 |

> **🔴 LC(P2·3·4)는 접지 않았다 — 실측 근거.**
> 접으면서 값이 버려지는 자리 **17곳이 전부 LC**였다. LC의 음원 지시가 순수한 진행 지시가 아니라
> **강의별 내용**을 담고 있기 때문이다:
> ```
> P3-DIALOGUE 8단계 — 강의 5개를 하나로 접으면
>   남김: "Q1 이후 흐름 또는 Q2 근거 직전부터 재생한다…"
>   버림: "수량·파손·누락·조건 정보가 나오면 멈추거나 표시한다"   (LC-P3-05)
>   버림: "이유·원인·조건 표현이 나오면 멈추거나 표시한다"        (LC-P3-03)
> ```
> 계획서 §8의 "Part3·4 변종화 하지 말 것(D5 미결)" 판단이 실측으로 확인됐고, **P2도 같았다.**

> **⚠️ 접으면서 한 번 잘못했고, 검증으로 걸렀다.**
> 처음에 `step_code` 를 변종 이름으로 대체했더니 RC-P6-01 경고가 1 → 4로 늘었다.
> 원문 단계명에 **Qn 지목**(`Q2 근거 확인` → 2번 문항)과 **의미 단서**(`오답 제거` → 정답이 아니라
> 오답을 고르게)가 들어 있고 화면 해석이 그 문자열을 읽기 때문이다.
> → `type_rails.step_label` 로 원문을 보존한다. **접을 때 무엇이 의미를 지고 있는지 먼저 봐야 한다.**

**🔴 계획서 진단 수정 — `TUTOR_RAILS`는 변종 단위로 못 옮긴다**

계획서는 "`TUTOR_RAILS` 371줄 → `variant_checks`(변종 단위) 이관"이라고 썼다. 실측하니

- `TUTOR_RAILS`가 덮는 건 **문항 2개뿐**이다 (`RC-P7-03-Q006` · `RC-P5-08-Q002`). 371줄이지만 커버리지는 2문항
- 내용(`keywords`·`hints`·`branches`)이 전부 **그 문항 고유**다. 변종 단위로 옮기면 같은 변종을 쓰는
  다른 문항이 엉뚱한 키워드로 채점된다

→ `rail_checks(question_code, step_order, …)` **문항 단위**로 표만 만들어 뒀다(0016). 변종 단위
기본값이 필요해지면 `question_code` 를 null 로 두는 행을 더하면 된다 — 지금 만들면 추측이 스키마로
굳는다(§8).

**남은 것**

- [ ] **`TUTOR_RAILS` 이관은 안 했다.** `/api/tutor` 는 ElevenLabs 음성 수업이 실제로 도는 경로라
      FGI 직전에 건드리기에 위험이 크다. 계획서도 "STEP 5~6은 FGI 이후 가능"이라고 했다.
      표(`rail_checks`)와 설계는 준비돼 있다
- [ ] **`lecture_steps` 965행은 아직 못 지운다.** 정본 화면(`/lecture`)은 `type_rails` 를 보지만
      `/type-lesson` 과 `/api/tutor` 가 아직 원시 테이블을 직접 읽는다. 그 둘을 뷰로 옮겨야 지울 수 있다
- [ ] **`common`·`yun_daeun` 레일 274행은 변종에 못 붙었다** — 시트에 상호작용 열이 없다(**D9**).
      유형 단위로 접히긴 했으나(각 19벌) 변종 사전을 안 쓰므로 화면 동작이 지정돼 있지 않다
- [ ] `type_rails.tutor_directive` 기본값 채우기 — 지금은 강의별 seed만 있다

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

**작업** ✅ `0018_learner_state.sql` · `0019_program_view_variant_id.sql`

- [x] **`learning_events` 신설** — 턴 단위 로그. 문항 정오답만이 아니라 **`variant_id`(어느 변종)** 와
      **`occurrence`(몇 번째 바퀴)** 를 남긴다. 기존 `learner_answer_log`로는 못 하던 것
- [x] **변종 id 배선** — 뷰 → `lectureProgramStore` → `Turn` → 이벤트.
      뷰에 `variant_id` 칸을 더했다(0019). 화면이 코드→id를 다시 조회하지 않게
- [x] `src/data/db/learningEventStore.ts` + `TypeLessonPlayer` 배선 — 턴 진입·응답·완료를 기록.
      **fire-and-forget이고 실패는 삼킨다** (로그 한 줄이 비는 게 수업이 죽는 것보다 낫다)
- [x] `/api/tutor`의 in-memory `mastery` Map → `learner_progress`.
      Map은 캐시로 격하하고 정본은 표. 인스턴스가 새로 뜨면 표에서 채운다
- [x] `learner_progress` 신설

**측정 결과 (2026-07-28)** — anon 키 REST로 실증(브라우저가 쓰는 것과 같은 경로)

```
anon INSERT(learning_events)  → 201   통과
anon UPSERT(learner_progress) → 201   통과
anon SELECT(본인·데모 행)      → 200   통과
anon SELECT(남의 행)          → 200 · 0건   ← 남의 학습 기록은 못 읽는다

── 완료 조건 쿼리 ──
step_code  interaction  occurrence  응답  정답률
S6         choice       1           1     1.00
S6         choice       2           1     0.00
S6         choice       3           1     1.00   ← "S6를 받은 회차별 정답률"이 나온다
```

> 위 숫자는 진행표(35행)를 그대로 따라간 **모의 응답**이다. 확인 후 지웠다(현재 0행).
> 확인한 것은 값이 아니라 **경로가 뚫려 있다는 것** — 권한·RLS·조인이 실제로 동작한다.

**남은 것**

- [ ] **브라우저 클릭 검증** — 코드 경로는 타입 통과·빌드 통과지만 실제 수업을 눌러서
      행이 쌓이는 건 아직 못 봤다(로그인이 걸려 있어 헤드리스로 못 들어간다). **FGI 전 필수**
- [ ] **`countPriorTagWrongs` 복구** — STEP 0에서 읽기를 좁힌 뒤 실계정에서 **항상 0**을 돌려준다
      (반복 오답 시 추가 단계가 안 붙음). `learning_events`로 옮기거나 `service_role` 키 도입
- [ ] **Fading을 정본 레일에도 적용** — 아래 §Fading 참조. 지금은 코드 레일(문항 2개)에서만 돈다
- [ ] `normalizeLearnerId()`의 DEMO UUID 뭉침 제거 — 비로그인 학습자가 한 UUID로 합쳐진다
- [ ] `learner_answer_log` → `_archive` 리네임 — `profile.ts`·`tutorDb.ts`를 옮긴 뒤에.
      그때까지 로그 두 벌(계획서 §9가 인정한 것)
- [ ] **개인정보 고지·동의** — 학습 기록을 계정에 붙여 남기는 것이라 FGI 참여자 동의 문구가 필요하다.
      스키마와 별개로 반드시 먼저 정리할 것

### Fading — 지금 실제로 이렇게 돈다

```
판정 입력:  이 학습자가 이 강의를 몇 번 끝냈나 (그것 하나뿐)
   0~2회 → full      레일 전부
   3~4회 → reduced   checkpoint 단계만 남긴다
   5회~  → minimal   S6 하나만 (없으면 마지막 checkpoint 하나)
```

**한계 — 정직하게.**

| | |
|---|---|
| 도는 곳 | `/api/tutor`의 `rail` 모드 = 코드 레일(`TUTOR_RAILS`). **문항 2개뿐** |
| 안 도는 곳 | 정본 화면 `/lecture`, 유형학습 레일 — Fading이 **안 붙어 있다** |
| 판정 근거 | **완료 횟수뿐.** 정답률도 오답 내용도 안 본다 |
| `step_variants.fade_policy` | 칸은 0013에서 뚫었지만 **전부 null이고 아무도 안 읽는다** |

이번 STEP 6에서 고친 건 **로직이 아니라 기억**이다 — 판정 상태가 서버 메모리에 있어 인스턴스가
바뀌면 사라지던 것을 표로 옮겼다. 판정 방식 자체는 그대로다.

**제대로 하려면 필요한 것:** `occurrence`(같은 유형 몇 번째 바퀴)와 `learning_events`의 정답률로
"이 학생이 S1을 두 바퀴 연속 맞췄으니 S1을 뺀다" 같은 판정을 하는 것. 데이터는 이제 생겼다.
다만 **언제 무엇을 줄일지는 교육 판단**이라 기획이 정해야 한다(§10에 **D11**로 올림).

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
| **D4** | ~~시트 지문 입력 탭을 어떻게 설계하나~~ → **규격 확정·코드 구현 완료(STEP 3).** 남은 건 콘텐츠팀이 `지문입력` 탭을 실제로 만드는 것 | 콘텐츠팀 | STEP 3 (해소) |
| **D5** | Part3·4 `audio_mode` 조건부 — 규격화 / 튜터 위임 / 단순화. **실물 근거 확보됨**: LC 화면에서 강의당 3턴씩 경고로 뜬다(위 LC 절). 화면은 "근거가 명확한지"를 판단 못 한다 → **튜터 위임이 유력** | 기획+콘텐츠 | **LC 시연 품질** |
| **D6** | 병합 후보 2건 — `P5-STRUCTURE-FIRST-AI`(RC-P5-02, 1단계만 `S1-next` vs `S1-mark`) · `P6-CLOZE-B`(RC-P6-02, 3단계만 `S5-next` vs `S5-choice`). **의도된 차이인가 오기입인가.** 병합하면 유형 19 → 17 | 콘텐츠팀 | 정리(막지 않음) |
| ~~D7~~ | **해소(2026-07-28): FGI에서 LC도 시연한다.** → LC 화면(Part 2·3·4) 착수 | 기획 | 완료 |
| **D8** | 음원 지시를 변종 속성으로 둘까 조합에 둘까 (25 vs 77) | 기획 | STEP 5 — **본 문서는 "조합" 안으로 작성됨** |
| **D9** | **윤다은·common 레일에 상호작용 열을 채울까?** 지금은 이도윤 레일만 화면 동작이 지정돼 있어 그 둘은 변종화가 안 된다(601행) | 콘텐츠팀 | STEP 5 (강사별 레일 확장) |
| ~~D10~~ | **해소(2026-07-28): FGI에서 쉐도잉은 안 한다.** 안 쓰니 어느 단계로 볼지 정할 필요가 없다. 시트 레일의 쉐도잉 턴(`lecture_steps` 48행)은 **지우지 않고** 화면에서 건너뛴다 — 정본은 시트고, 결정이 뒤집히면 `fromSteps.ts`의 `SKIP_SHADOW` 한 줄만 되돌리면 된다 | 기획 | 완료 |

| **D11** | **Fading을 무엇으로 판정할까.** 지금은 "이 강의를 몇 번 끝냈나"뿐이고 정답률을 안 본다. `learning_events`가 생겨 근거는 만들 수 있게 됐다 — 예: "같은 유형 2바퀴 연속 S1 정답 → 다음 바퀴에서 S1 생략". 무엇을 언제 줄일지는 교육 판단 | 기획+콘텐츠 | Fading 실효화 |

**D1~D3은 한 번에 던져야 한다.** 시트 작업이라 리드타임이 있고 STEP 2가 전부 여기 걸린다.
**D7이 일정을 가른다** — LC를 시연 안 하면 STEP 3이 1.5주 → 5일.

---

## 11. 일정

| 주차 | 단계 | 산출물 |
|---|---|---|
| 7/28 ✅ | STEP 0 | `0012` 보안 + `survey_responses` |
| 7/28 | D1~D3 전달 | 콘텐츠팀 시트 요청 |
| 7/28 ✅ | STEP 1 | 유입 경로 일원화 (GCP 배포분 미완) |
| 7/28 ✅ | STEP 2 | `0013` 어휘 확정 (변종 20종·커버리지 98.4%) |
| 7/28 ✅ | STEP 3 | `0014` 지문 모델 + 유형 17종 + Part 2·3·4 실증 |
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
- **크론이 무엇을 덮고 무엇을 안 덮는지** (STEP 3에서 실측. 새 컬럼 추가할 때 반드시 볼 것)
  - `questions` 는 **upsert**고 SET 절이 `lecture_id·part·difficulty·content·passage_id·display_order` 뿐이다
    → 그 밖의 컬럼(`question_type_id` 등)은 안 덮인다. 시트에 없는 문항도 안 지워진다
  - `question_options` 는 **매번 delete + insert** 다 → 여기 붙인 컬럼은 밤마다 사라진다.
    `display_order` 는 트리거 `trg_option_display_order` 로 막았다. 새 컬럼도 같은 방식이 필요하다
  - `content` 의 표기 흔들림은 **DB에서 고쳐도 새벽에 되돌아간다.** 별칭표(`*_aliases`)로 해석할 것
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
