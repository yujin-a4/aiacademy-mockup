# AI 튜터링 엔진 — 설계 정리 (part7-convai)

> 대상: `/part7-convai` 화면의 ElevenLabs 음성 코칭에 붙은 스캐폴딩 엔진.
> 기획 정본은 manyfast 프로젝트 "AI 토익 코칭 학습 앱 전체 기능"(`4fafb4fd-…`)이며, 이 문서는 그 스펙을 목업에 구현한 내용을 정리한 것이다.

## 1. 핵심 원칙: 역할 분담 (하이브리드)

```
┌─────────────┐   학생 발화    ┌──────────────────┐   directive   ┌─────────────┐
│  학생(음성)  │ ────────────▶ │  백엔드 /api/tutor │ ───────────▶ │ ElevenLabs   │
│             │ ◀──────────── │  (레일·판정·전진·   │              │ 에이전트     │
└─────────────┘   음성 발화     │   힌트·Fading 소유) │              │ (말투만 렌더) │
                               └──────────────────┘              └─────────────┘
```

- **백엔드 = 두뇌**: 수업 흐름(레일), 정오판정, 단계 전진, 힌트, Fading을 **전부 소유**. 정답·근거는 DB 원문만 사용.
- **에이전트 = 입**: 백엔드가 준 `directive`(지시)를 박혜원 말투로 발화만 한다. **사실(정답·근거·해설)을 스스로 생성하지 않는다** → 할루시네이션 차단.
- **클라이언트 = 중계**: 학생 발화를 엔진에 보내고, 받은 `directive`를 `sendContextualUpdate`로 에이전트에 주입한다.

## 2. 파일 구조

| 파일 | 역할 |
|---|---|
| `src/data/tutorContent.ts` | 문항 **구조 데이터** + 유형별 **레일(rail)** |
| `src/app/api/tutor/route.ts` | 엔진 — 세션·채점·전진·힌트·Fading |
| `src/components/part7/ElevenLabsConvAIPanel.tsx` | 학생발화 → `/api/tutor` → directive 주입 |

## 3. 데이터 모델

**문항(`TutorQuestion`)** — 대본이 아니라 구조 데이터로 등록한다(S-TEIRZE):

```
번호 / 유형 / 지문 / 보기[정답여부·오답이유] / 정답 / 정답근거(DB원문) / 난이도 / rail
```

**레일(rail)** = *우리 시나리오*. "8단계"는 골격(skeleton)일 뿐이며 **실제 길이는 유형마다 다르다**. 각 단계(`TutorStep`):

```
id / kind(progress|checkpoint) / objective(끌어낼 목표) /
keywords(채점용) / hints[3단계] / reveal(근거 원문) / branches(오개념 분기)
```

- `progress` = 따라오게만 하는 단계 (채점 없이 통과)
- `checkpoint` = 채점하고 분기하는 단계

> 핵심: `objective`는 "에이전트가 이 턴에 학생에게서 끌어낼 목표"이지 **대사가 아니다**. 에이전트가 자기 말로 질문을 생성한다.

## 4. 엔진 동작 (`/api/tutor`, 3개 액션)

| 액션 | 입력 | 동작 |
|---|---|---|
| `start` | studentId, questionNumber | Fading 레벨 조회 → 레일 선별 → 세션 생성 → `지문+정답+근거+턴규칙+1단계 목표`를 directive로 반환 |
| `answer` | sessionId, text | 현재 체크포인트 채점 후 분기 (5번 참조) |
| `hint` | sessionId, level | 요청형 단계별 힌트 반환 (S-PKUSSP) |

세션 상태(인메모리): `stepIdx`, `attempts`, `correctCount`, 선별된 `steps`, `fadingLevel`.

## 5. 분기 로직 — 학생 입력 판정으로 3갈래 (핵심)

```
학생 답
 ├─ 정답 (키워드 매칭)         → "맞아" + 다음 단계로 전진
 ├─ 특정 오답 (branches 매칭)   → 그 오개념 콕 집어 교정 → 같은 단계 재시도
 │     예) 히터 고름 → "그건 차 상태 설명이지 파는 이유가 아냐"
 └─ 막힘 (키워드 0개)
       ├─ 1회: 힌트 1단계 (풀이 방향)
       ├─ 2회: 힌트 2단계 (근거 위치)
       └─ 3회: 정답 근거 공개(DB 원문 인용) → 다음 단계로 전진
```

→ **정해진 대본을 따라가는 게 아니라, 무엇을 답했느냐에 따라 다른 길로 간다.**

채점 방식: 현재 단계의 `keywords`를 학생 답(음성→텍스트 변환)에 부분 문자열로 매칭 (S-XXPUSD, MVP 방식 A).

## 6. Fading (스캐폴딩 점진 감소)

유형별 **연속 정답 누적**으로 레일을 줄인다 (F-ZBZTSD 표 / S-ESQCOF):

| 누적 정답(동일 유형) | 레벨 | 제공 단계 |
|---|---|---|
| 0–2회 | `full` | 전체 레일 (progress 포함) |
| 3–4회 | `reduced` | 체크포인트만 (진행용 스텝 제거) |
| 5회+ | `minimal` | 정답 선택 1개 (문제+즉시채점에 근접) |
| 정답률 하락 | — | 이전 단계로 복원 *(미구현, Post-MVP)* |

판정은 `mastery` 카운터(=`${studentId}:${type}`)로 하며, 회차를 끝까지 완주할 때마다 +1 된다.

## 7. 일레븐랩스 기능 바인딩 (manyfast S-SGUUMH)

| 역할 | 일레븐랩스 기능 | 비고 |
|---|---|---|
| 세션 부트스트랩(프로필·greeting) | **Dynamic Variables** | `startSession`의 `dynamicVariables` |
| 매 턴 단계 목표·근거 주입 | **Contextual Updates** | 현재 목업이 이걸로 구동 |
| 채점/전진/힌트 요청 | **Server Tools** | 운영 전환 시 에이전트가 직접 호출 |
| 전략·문법 근거 | **Knowledge Base** | 정답키·해설 원문은 제외 |
| 대화 흐름 그래프(FSM) | ❌ **Workflow 미사용** | FSM은 백엔드 단일 소유 (이중화 방지) |
| 재사용 플레이북 | △ **Procedures(Alpha) 보류** | 핵심 로직 의존 금지 |

### 두 가지 구동 모드
- **(현재 — 목업/프로토타입)** 클라이언트가 `/api/tutor`를 직접 호출하고 directive를 Contextual Update로 주입. 일레븐랩스 대시보드 Tool 설정 불필요.
- **(운영)** 동일 엔드포인트를 일레븐랩스 Server Tools로 등록 → 에이전트가 직접 호출. 단일 소스·지연 최소.

## 8. manyfast 스펙 매핑

| 구현 | 스펙 |
|---|---|
| 역할분담(서버=판정, AI=대화) | S-CKLHED |
| 키워드 채점 (방식 A) | S-XXPUSD |
| ⑦ 피드백 분기 | S-XTAZHH |
| 3단계 힌트 | S-PKUSSP |
| Fading / 난이도 조절 | F-ZBZTSD 표 · S-ESQCOF |
| 할루시네이션 가드(DB 원문만) | S-CHNXPN |
| 문항 구조 데이터 등록 | S-TEIRZE |
| 일레븐랩스 바인딩 | **S-SGUUMH** (신규) |

## 9. 현재 한계

- **채점 = 키워드 매칭만** → 표현이 키워드를 벗어나면 오판. 운영은 하이브리드(키워드 1차 + LLM 보정, S-PWCPHF) 필요. `/api/gemini`가 이미 있어 보정 레이어를 얹을 수 있다.
- **세션 = 인메모리 Map** → dev 단일 프로세스용. 운영은 DB 저장 필요.
- **콘텐츠 = 148번 1문항** → 레일 1개만 등록됨. 다른 유형은 rail 추가 등록 필요.
- **구동 = 클라이언트 중계** → "학생 발화 1회 = 1턴" 가정. 운영은 ElevenLabs Server Tools로 전환.

## 10. 새 문항/유형 추가하는 법

1. `src/data/tutorContent.ts`에 `TutorQuestion` 추가 (지문·보기·정답·정답근거·난이도).
2. 그 유형의 **레일**을 작성: 단계별 `objective` + 체크포인트의 `keywords`/`hints`/`branches`.
3. 끝. 엔진 코드는 수정하지 않는다 — 레일이 곧 시나리오다.
