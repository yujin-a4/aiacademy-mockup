# YBM AI 어학원 온보딩 플로우 설계

Date: 2026-05-15  
Branch: taeja  
Stack: Next.js 14 App Router + TypeScript + Tailwind + Zustand

---

## 범위

STEP 0~4 온보딩 전체. STEP 5 이후(수업 화면)는 별도 스펙.

---

## 파일 구조

```
src/app/onboarding/page.tsx           ← 스텝 컨트롤러 (currentStep state)
src/components/onboarding/
  SplashScreen.tsx                    ← STEP 0
  NameInput.tsx                       ← STEP 1-A
  QuizCard.tsx                        ← STEP 1-B (3문항)
  GoalSetting.tsx                     ← STEP 1-C
  LoadingScreen.tsx                   ← STEP 2
  InstructorSelect.tsx                ← STEP 3
  CurriculumConfirm.tsx               ← STEP 4
```

`src/app/page.tsx`는 `/onboarding`으로 리다이렉트.

---

## 스텝별 명세

### STEP 0 — 스플래시
- Dark Navy 배경 (`#0A1628`)
- "YBM AI 어학원" 텍스트 페이드인
- 와옹이 마스코트: 🐱 emoji + bounce CSS 애니메이션
- 2.5초 후 `useEffect` setTimeout으로 STEP 1 자동 진입
- 재방문자 판별 없음 (MVP)

### STEP 1-A — 이름 입력
- 와옹이 말풍선: "안녕하세요! 저는 AI 매니저 와옹이에요."
- 텍스트 입력 → onboardingStore.setUserName
- 입력 후 와옹이 반응 텍스트 변경
- CTA: '시작하기'

### STEP 1-B — 성향 퀴즈 (3문항)
- 상단 진행 바 (1/3, 2/3, 3/3)
- 카드 2개 버튼 선택 방식

| Q | 왼쪽 | 오른쪽 | store key |
|---|------|--------|-----------|
| Q1 | 꼼꼼하게 이해하며 | 빠르게 많이 풀며 | learningStyle |
| Q2 | 스스로 계획하는 편 | 강하게 밀어붙여 줬으면 | managementStyle |
| Q3 | 점수 숫자가 오르는 게 동기 | 성취감·칭찬이 동기 | motivationType |

- 선택 시 와옹이 리액션 텍스트 (문항별 고정 텍스트)
- store 값: `learningStyle: '꼼꼼' | '빠르게'`, `managementStyle: '스스로' | '강하게'`, `motivationType: '점수' | '성취감'`

### STEP 1-C — 목표 설정
- 3항목 순차 선택 (버튼 그리드)
- targetScore: 600 / 700 / 750 / 800 / 900+
- studyPeriod: 1개월 / 2개월 / 3개월 / 6개월
- dailyTime: 15분 / 30분 / 1시간 / 1시간 이상
- 각 선택 시 와옹이 코멘트 (고정 텍스트 맵)

### STEP 2 — 로딩
- Dark Navy 배경
- 순차 타이핑 애니메이션 (CSS keyframes + delay)
- 줄 1: "{userName}님의 프로필이 스타 강사에게 전달되었습니다..."
- 줄 2~4: 강사 3명 순차 등장 (0.8s 간격)
- 4.5초 후 CTA 버튼 등장: '제안서 확인하기' (Lavender, pulse)

### STEP 3 — 강사 선택
카드 3장 세로 배치:

| 강사 | emoji | 배지 | 한줄 |
|------|-------|------|------|
| 드릴러 | 🔥 | 단기 목표 전문 | "이거 또 틀렸네. 패턴 외워." |
| 멘토 | 🤝 | 꼼꼼 관리형 | "헷갈릴 수 있어, 같이 보자." |
| 리얼리스트 | 💼 | 균형 코칭형 | "틀렸어, 근데 이건 잘하고 있어." |

- 카드 탭 → 선택 상태(border highlight)
- '이 선생님으로 시작하기' CTA → onboardingStore.setSelectedInstructor

### STEP 4 — 커리큘럼 확인
- 선택 강사 + 목표 점수 + 기간 기반 주차별 타임라인 (정적 생성)
- 강사 한마디 (강사별 고정 텍스트)
- CTA: '이 과정으로 시작하기' (Dark Navy)
- 보조: '커리큘럼 수정하기' (Ghost)
- '이 과정으로 시작하기' → `/` (홈, 추후 교체)

---

## 상태 관리

- `currentStep`: onboarding/page.tsx 로컬 state (0~6, STEP 1 서브스텝 포함)
- 온보딩 데이터: `useOnboardingStore` (기존 store 그대로)

## 스타일
- 색상: dark-navy / lavender / lavender-light (tailwind.config 기존 토큰)
- 폰트: PretendardVariable.ttf → @font-face 등록
- 애니메이션: CSS transition / keyframes (Framer Motion 미사용)
