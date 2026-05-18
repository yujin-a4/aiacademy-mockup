# YBM AI 어학원 온보딩 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** STEP 0~4 온보딩 플로우 전체 구현 (스플래시 → 이름/퀴즈/목표 → 로딩 → 강사선택 → 커리큘럼)

**Architecture:** `src/app/onboarding/page.tsx`가 `currentStep` state로 화면 전환을 제어. 각 스텝 컴포넌트는 `onNext`/`onComplete` 콜백을 받아 독립적으로 작동. onboardingStore(Zustand)에 사용자 데이터를 저장.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand

---

## 파일 맵

| 파일 | 역할 |
|------|------|
| `src/app/page.tsx` | `/onboarding` 리다이렉트 |
| `src/app/onboarding/page.tsx` | 스텝 컨트롤러 (step 0~6) |
| `src/components/onboarding/SplashScreen.tsx` | STEP 0 |
| `src/components/onboarding/NameInput.tsx` | STEP 1-A |
| `src/components/onboarding/QuizCard.tsx` | STEP 1-B (3문항) |
| `src/components/onboarding/GoalSetting.tsx` | STEP 1-C |
| `src/components/onboarding/LoadingScreen.tsx` | STEP 2 |
| `src/components/onboarding/InstructorSelect.tsx` | STEP 3 |
| `src/components/onboarding/CurriculumConfirm.tsx` | STEP 4 |
| `src/app/globals.css` | Pretendard 폰트 + fade-in 애니메이션 |
| `tailwind.config.ts` | animate-fade-in 키프레임 추가 |
| `public/fonts/PretendardVariable.ttf` | 폰트 파일 이동 |

---

## Task 1: 기반 설정 (폰트 + 리다이렉트 + 애니메이션)

**Files:**
- Move: `PretendardVariable.ttf` → `public/fonts/PretendardVariable.ttf`
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 폰트 파일을 public/fonts/로 이동**

```bash
mkdir -p public/fonts
# Windows PowerShell
Move-Item PretendardVariable.ttf public/fonts/PretendardVariable.ttf
```

- [ ] **Step 2: globals.css에 @font-face + fade-in 클래스 추가**

`src/app/globals.css` 전체를 다음으로 교체:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: 'Pretendard';
  src: url('/fonts/PretendardVariable.ttf') format('truetype');
  font-weight: 100 900;
  font-style: normal;
}

:root {
  --dark-navy: #0A1628;
  --lavender: #8B7CF6;
  --lavender-light: #B8AFFD;
}

body {
  background-color: var(--dark-navy);
  color: white;
  font-family: 'Pretendard', 'Inter', sans-serif;
}
```

- [ ] **Step 3: tailwind.config.ts에 fade-in 애니메이션 추가**

`tailwind.config.ts`의 `theme.extend`에 추가:

```ts
animation: {
  'fade-in': 'fadeIn 0.5s ease-out forwards',
},
keyframes: {
  fadeIn: {
    '0%': { opacity: '0', transform: 'translateY(8px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
},
```

- [ ] **Step 4: page.tsx를 /onboarding 리다이렉트로 교체**

`src/app/page.tsx` 전체:

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/onboarding')
}
```

- [ ] **Step 5: 커밋**

```bash
git add public/fonts src/app/globals.css tailwind.config.ts src/app/page.tsx
git commit -m "feat: Pretendard 폰트 설정 + 홈 → 온보딩 리다이렉트"
```

---

## Task 2: 온보딩 페이지 컨트롤러

**Files:**
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: 파일 생성**

`src/app/onboarding/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SplashScreen from '@/components/onboarding/SplashScreen'
import NameInput from '@/components/onboarding/NameInput'
import QuizCard from '@/components/onboarding/QuizCard'
import GoalSetting from '@/components/onboarding/GoalSetting'
import LoadingScreen from '@/components/onboarding/LoadingScreen'
import InstructorSelect from '@/components/onboarding/InstructorSelect'
import CurriculumConfirm from '@/components/onboarding/CurriculumConfirm'

// step 0=Splash 1=Name 2=Quiz 3=Goal 4=Loading 5=Instructor 6=Curriculum
export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const router = useRouter()
  const next = () => setStep((s) => s + 1)

  return (
    <>
      {step === 0 && <SplashScreen onComplete={next} />}
      {step === 1 && <NameInput onNext={next} />}
      {step === 2 && <QuizCard onComplete={next} />}
      {step === 3 && <GoalSetting onNext={next} />}
      {step === 4 && <LoadingScreen onNext={next} />}
      {step === 5 && <InstructorSelect onNext={next} />}
      {step === 6 && <CurriculumConfirm onComplete={() => router.push('/')} />}
    </>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: 온보딩 페이지 컨트롤러 (step 0~6)"
```

---

## Task 3: STEP 0 — SplashScreen

**Files:**
- Create: `src/components/onboarding/SplashScreen.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
'use client'
import { useEffect } from 'react'

interface Props {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-navy">
      <div className="text-center space-y-6 animate-fade-in">
        <p className="text-6xl animate-bounce">🐱</p>
        <h1 className="text-3xl font-bold text-white">YBM AI 어학원</h1>
        <p className="text-lavender text-sm">AI 강사와 함께하는 토익 코칭</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저 확인**

`npm run dev` 후 `http://localhost:3000` 접속 → 스플래시 2.5초 표시 후 다음 화면으로 자동 전환 확인

- [ ] **Step 3: 커밋**

```bash
git add src/components/onboarding/SplashScreen.tsx
git commit -m "feat: STEP 0 스플래시 화면"
```

---

## Task 4: STEP 1-A — NameInput

**Files:**
- Create: `src/components/onboarding/NameInput.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

interface Props {
  onNext: () => void
}

export default function NameInput({ onNext }: Props) {
  const setUserName = useOnboardingStore((s) => s.setUserName)
  const [input, setInput] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    if (!input.trim()) return
    setUserName(input.trim())
    setConfirmed(true)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-navy px-6">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <p className="text-5xl">🐱</p>
          <div className="bg-white/10 rounded-2xl px-4 py-3 text-white text-sm leading-relaxed">
            {confirmed
              ? `${input}님, 반가워요! 딱 맞는 선생님을 찾아드릴게요 🎯`
              : '안녕하세요! 저는 AI 매니저 와옹이에요. 선생님을 연결해드릴게요'}
          </div>
        </div>

        {!confirmed ? (
          <div className="space-y-4">
            <p className="text-white/70 text-center text-sm">먼저 이름을 알려주세요</p>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              placeholder="이름 입력"
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-lavender transition-colors"
            />
            <button
              onClick={handleConfirm}
              disabled={!input.trim()}
              className="w-full bg-lavender text-white rounded-xl py-3 font-medium disabled:opacity-40 transition-opacity"
            >
              확인
            </button>
          </div>
        ) : (
          <button
            onClick={onNext}
            className="w-full bg-lavender text-white rounded-xl py-3 font-medium animate-fade-in"
          >
            시작하기
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저 확인**

스플래시 후 이름 입력 → 확인 → 와옹이 반응 문구 변경 → '시작하기' 버튼 등장 확인

- [ ] **Step 3: 커밋**

```bash
git add src/components/onboarding/NameInput.tsx
git commit -m "feat: STEP 1-A 이름 입력"
```

---

## Task 5: STEP 1-B — QuizCard

**Files:**
- Create: `src/components/onboarding/QuizCard.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const QUESTIONS = [
  {
    label: 'Q1. 학습 스타일',
    left: { text: '꼼꼼하게 이해하며', value: '꼼꼼' },
    right: { text: '빠르게 많이 풀며', value: '빠르게' },
    reaction: '좋아요! 학습 스타일 파악했어요 😊',
    key: 'learningStyle' as const,
  },
  {
    label: 'Q2. 관리 강도',
    left: { text: '스스로 계획하는 편', value: '스스로' },
    right: { text: '강하게 밀어붙여 줬으면', value: '강하게' },
    reaction: '완벽해요! 관리 스타일 알겠어요 💪',
    key: 'managementStyle' as const,
  },
  {
    label: 'Q3. 동기 유형',
    left: { text: '점수 숫자가 오르는 게 동기', value: '점수' },
    right: { text: '성취감·칭찬이 동기', value: '성취감' },
    reaction: '알겠어요! 딱 맞는 선생님 찾을게요 🎯',
    key: 'motivationType' as const,
  },
]

interface Props {
  onComplete: () => void
}

export default function QuizCard({ onComplete }: Props) {
  const store = useOnboardingStore()
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [showReaction, setShowReaction] = useState(false)

  const q = QUESTIONS[idx]

  const handlePick = (value: string) => {
    if (picked) return
    setPicked(value)

    if (q.key === 'learningStyle') store.setLearningStyle(value)
    else if (q.key === 'managementStyle') store.setManagementStyle(value)
    else store.setMotivationType(value)

    setShowReaction(true)
    setTimeout(() => {
      if (idx < 2) {
        setIdx(idx + 1)
        setPicked(null)
        setShowReaction(false)
      } else {
        onComplete()
      }
    }, 900)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-navy px-6">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        {/* 진행 바 */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                i <= idx ? 'bg-lavender' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* 와옹이 말풍선 */}
        <div className="text-center space-y-3">
          <p className="text-5xl">🐱</p>
          <div className="bg-white/10 rounded-2xl px-4 py-3 text-white text-sm leading-relaxed min-h-[52px] flex items-center justify-center">
            {showReaction ? q.reaction : q.label}
          </div>
        </div>

        {/* 선택지 */}
        <div className="space-y-3">
          {[q.left, q.right].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePick(opt.value)}
              disabled={!!picked}
              className={`w-full border-2 rounded-xl py-4 px-4 text-sm font-medium transition-all duration-200 ${
                picked === opt.value
                  ? 'bg-lavender border-lavender text-white'
                  : picked
                  ? 'bg-white/5 border-white/10 text-white/40'
                  : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-lavender/50'
              }`}
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저 확인**

3문항 선택 → 진행 바 업데이트 → 와옹이 리액션 → 자동 다음 질문 진행 확인

- [ ] **Step 3: 커밋**

```bash
git add src/components/onboarding/QuizCard.tsx
git commit -m "feat: STEP 1-B 성향 퀴즈 3문항"
```

---

## Task 6: STEP 1-C — GoalSetting

**Files:**
- Create: `src/components/onboarding/GoalSetting.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const SCORE_OPTIONS = [
  { label: '600점', value: 600 },
  { label: '700점', value: 700 },
  { label: '750점', value: 750 },
  { label: '800점', value: 800 },
  { label: '900점 이상', value: 900, full: true },
]

const PERIOD_OPTIONS = ['1개월', '2개월', '3개월', '6개월']
const TIME_OPTIONS = ['15분', '30분', '1시간', '1시간 이상']

const COMMENTS: Record<string | number, string> = {
  600: '600점! 충분히 가능해요 💪',
  700: '700점! 딱 적당한 목표예요 🎯',
  750: '750점! 조금 더 집중하면 돼요 ✨',
  800: '800점! 열심히 하면 분명 가능해요 🔥',
  900: '900점! 최고 목표네요! 함께 해봐요 🌟',
  '1개월': '1개월 집중 코스로 가볼게요 ⚡',
  '2개월': '2개월이면 충분히 가능해요 💪',
  '3개월': '3개월! 탄탄하게 쌓아가요 📚',
  '6개월': '6개월! 꾸준히 하면 반드시 달성해요 🏆',
  '15분': '15분도 매일 하면 달라져요! 👍',
  '30분': '30분! 딱 좋은 양이에요 ✅',
  '1시간': '1시간! 정말 열심히 하시겠네요 🔥',
  '1시간 이상': '1시간 이상! 완전 적극적이네요 💯',
}

const PROMPTS = [
  '목표 점수를 선택해주세요 🎯',
  '학습 기간을 선택해주세요 📅',
  '하루 학습 시간을 선택해주세요 ⏰',
]

interface Props {
  onNext: () => void
}

export default function GoalSetting({ onNext }: Props) {
  const { setTargetScore, setStudyPeriod, setDailyTime } = useOnboardingStore()
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  const [comment, setComment] = useState(PROMPTS[0])

  const pick = (value: string | number, next: () => void) => {
    setComment(COMMENTS[value] ?? '')
    setTimeout(() => {
      next()
    }, 900)
  }

  const handleScore = (value: number) => {
    setTargetScore(value)
    pick(value, () => {
      setComment(PROMPTS[1])
      setStage(1)
    })
  }

  const handlePeriod = (value: string) => {
    setStudyPeriod(value)
    pick(value, () => {
      setComment(PROMPTS[2])
      setStage(2)
    })
  }

  const handleTime = (value: string) => {
    setDailyTime(value)
    pick(value, onNext)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-navy px-6">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <p className="text-5xl">🐱</p>
          <div className="bg-white/10 rounded-2xl px-4 py-3 text-white text-sm leading-relaxed min-h-[52px] flex items-center justify-center">
            {comment}
          </div>
        </div>

        {stage === 0 && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-white/50 text-xs text-center uppercase tracking-wider">목표 점수</p>
            <div className="grid grid-cols-2 gap-3">
              {SCORE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleScore(opt.value)}
                  className={`${opt.full ? 'col-span-2' : ''} bg-white/5 border border-white/20 rounded-xl py-3 text-white text-sm hover:bg-white/10 hover:border-lavender/50 transition-all`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 1 && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-white/50 text-xs text-center uppercase tracking-wider">학습 기간</p>
            <div className="grid grid-cols-2 gap-3">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriod(p)}
                  className="bg-white/5 border border-white/20 rounded-xl py-3 text-white text-sm hover:bg-white/10 hover:border-lavender/50 transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-white/50 text-xs text-center uppercase tracking-wider">하루 학습 시간</p>
            <div className="grid grid-cols-2 gap-3">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => handleTime(t)}
                  className="bg-white/5 border border-white/20 rounded-xl py-3 text-white text-sm hover:bg-white/10 hover:border-lavender/50 transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저 확인**

점수 → 기간 → 시간 순서로 와옹이 코멘트와 함께 단계 전환 확인

- [ ] **Step 3: 커밋**

```bash
git add src/components/onboarding/GoalSetting.tsx
git commit -m "feat: STEP 1-C 목표 설정"
```

---

## Task 7: STEP 2 — LoadingScreen

**Files:**
- Create: `src/components/onboarding/LoadingScreen.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const LINES = [
  { emoji: '🔥', name: '박혜원', action: '제안서를 작성 중입니다...' },
  { emoji: '🤝', name: '김토익', action: '목표 기간을 검토 중입니다...' },
  { emoji: '💼', name: '이선생', action: '학습 성향을 분석하고 있습니다...' },
]

interface Props {
  onNext: () => void
}

export default function LoadingScreen({ onNext }: Props) {
  const userName = useOnboardingStore((s) => s.userName)
  const [visible, setVisible] = useState(0) // 0=nothing, 1=intro, 2~4=instructors, 5=CTA
  const [showCTA, setShowCTA] = useState(false)

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisible(1), 400),
      setTimeout(() => setVisible(2), 1200),
      setTimeout(() => setVisible(3), 2200),
      setTimeout(() => setVisible(4), 3200),
      setTimeout(() => setShowCTA(true), 4400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-navy px-6">
      <div className="w-full max-w-sm space-y-5">
        {visible >= 1 && (
          <p className="text-white/80 text-sm animate-fade-in">
            📬 <span className="text-lavender font-semibold">{userName}님</span>의 프로필이 스타 강사에게 전달되었습니다...
          </p>
        )}

        {LINES.map((line, i) =>
          visible >= i + 2 ? (
            <div key={line.name} className="flex items-center gap-3 animate-fade-in">
              <span className="text-2xl">{line.emoji}</span>
              <p className="text-white/70 text-sm">
                <span className="text-white font-medium">{line.name} 쌤</span>이 {line.action}
              </p>
            </div>
          ) : null
        )}

        {showCTA && (
          <div className="space-y-5 animate-fade-in pt-4">
            <p className="text-white text-sm text-center">
              🎉 <span className="text-lavender font-semibold">{userName}님</span>께 딱 맞는 3개의 제안서가 도착했습니다!
            </p>
            <button
              onClick={onNext}
              className="w-full bg-lavender text-white rounded-xl py-3 font-medium animate-pulse"
            >
              제안서 확인하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저 확인**

순차 텍스트 등장 → 4.4초 후 CTA pulse 버튼 등장 확인

- [ ] **Step 3: 커밋**

```bash
git add src/components/onboarding/LoadingScreen.tsx
git commit -m "feat: STEP 2 강사 제안서 로딩 연출"
```

---

## Task 8: STEP 3 — InstructorSelect

**Files:**
- Create: `src/components/onboarding/InstructorSelect.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const INSTRUCTORS = [
  {
    id: 'driller',
    emoji: '🔥',
    name: '드릴러',
    badge: '단기 목표 전문',
    desc: '빠르고 집중적인 반복 훈련으로 단기 점수 상승',
    quote: '"이거 또 틀렸네. 패턴 외워."',
    activeBorder: 'border-orange-400',
    badgeCls: 'bg-orange-400/20 text-orange-300',
  },
  {
    id: 'mentor',
    emoji: '🤝',
    name: '멘토',
    badge: '꼼꼼 관리형',
    desc: '친근하고 꼼꼼한 1:1 코칭, 개념부터 탄탄하게',
    quote: '"헷갈릴 수 있어, 같이 보자."',
    activeBorder: 'border-lavender',
    badgeCls: 'bg-lavender/20 text-lavender-light',
  },
  {
    id: 'realist',
    emoji: '💼',
    name: '리얼리스트',
    badge: '균형 코칭형',
    desc: '현실적인 목표와 균형 잡힌 피드백',
    quote: '"틀렸어, 근데 이건 잘하고 있어."',
    activeBorder: 'border-blue-400',
    badgeCls: 'bg-blue-400/20 text-blue-300',
  },
]

interface Props {
  onNext: () => void
}

export default function InstructorSelect({ onNext }: Props) {
  const { userName, setSelectedInstructor } = useOnboardingStore()
  const [selected, setSelected] = useState<string | null>(null)

  const handleConfirm = () => {
    if (!selected) return
    setSelectedInstructor(selected)
    onNext()
  }

  return (
    <div className="flex flex-col min-h-screen bg-dark-navy px-6 py-8">
      <div className="max-w-sm mx-auto w-full flex-1 space-y-5 animate-fade-in">
        <div className="text-center space-y-1 pb-2">
          <h2 className="text-white font-bold text-xl">{userName}님을 위한 제안서</h2>
          <p className="text-white/50 text-sm">강사를 선택해주세요</p>
        </div>

        {INSTRUCTORS.map((inst) => (
          <button
            key={inst.id}
            onClick={() => setSelected(inst.id)}
            className={`w-full bg-white/5 border-2 rounded-2xl p-4 text-left transition-all duration-200 ${
              selected === inst.id ? inst.activeBorder : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{inst.emoji}</span>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold">{inst.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inst.badgeCls}`}>
                    {inst.badge}
                  </span>
                </div>
                <p className="text-white/60 text-sm">{inst.desc}</p>
                <p className="text-white/35 text-xs italic">{inst.quote}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="max-w-sm mx-auto w-full pt-4">
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="w-full bg-lavender text-white rounded-xl py-3 font-medium disabled:opacity-40 transition-opacity"
        >
          이 선생님으로 시작하기
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저 확인**

카드 3장 표시, 탭 시 border highlight, CTA 활성화 확인

- [ ] **Step 3: 커밋**

```bash
git add src/components/onboarding/InstructorSelect.tsx
git commit -m "feat: STEP 3 강사 선택 카드"
```

---

## Task 9: STEP 4 — CurriculumConfirm

**Files:**
- Create: `src/components/onboarding/CurriculumConfirm.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
'use client'
import { useOnboardingStore } from '@/store/onboardingStore'

const INST_INFO: Record<string, { emoji: string; name: string; msg: (n: string, s: number | null, p: string | null) => string }> = {
  driller: {
    emoji: '🔥',
    name: '드릴러',
    msg: (n, s, p) => `${n}님이라면 ${p ?? '2개월'} 안에 ${s ?? 700}점 넘을 수 있어요. 포기하지 마세요!`,
  },
  mentor: {
    emoji: '🤝',
    name: '멘토',
    msg: (n, s, p) => `${n}님이라면 ${p ?? '2개월'} 안에 ${s ?? 700}점 넘을 수 있어요. 저만 믿으세요!`,
  },
  realist: {
    emoji: '💼',
    name: '리얼리스트',
    msg: (n, s, p) => `${p ?? '2개월'} 플랜이면 ${s ?? 700}점 충분히 가능해요, ${n}님.`,
  },
}

const CURRICULUM: Record<string, string[]> = {
  '1개월': ['1주차: Part 5 문법 기초', '2주차: 어휘 집중 훈련', '3주차: 실전 풀이 연습', '4주차: 모의고사 + 총정리'],
  '2개월': ['1~2주차: Part 5 문법 기초', '3~4주차: 시제·조동사·어휘', '5~6주차: 실전 유형 훈련', '7주차: 모의고사 풀이', '8주차: 최종 점검'],
  '3개월': ['1~2주차: 문법 기초', '3~4주차: 어휘 전략', '5~7주차: Part 5 실전', '8~10주차: Part 6 도입', '11주차: 모의고사', '12주차: 최종 점검'],
  '6개월': ['1~4주차: 문법·어휘 기초', '5~8주차: Part 5·6 완성', '9~12주차: Part 7 전략', '13~16주차: 실전 모의고사', '17~20주차: 약점 보완', '21~24주차: 최종 점검 + 실전'],
}

interface Props {
  onComplete: () => void
}

export default function CurriculumConfirm({ onComplete }: Props) {
  const { userName, selectedInstructor, targetScore, studyPeriod } = useOnboardingStore()
  const inst = INST_INFO[selectedInstructor ?? 'mentor']
  const curriculum = CURRICULUM[studyPeriod ?? '2개월'] ?? CURRICULUM['2개월']

  return (
    <div className="flex flex-col min-h-screen bg-dark-navy px-6 py-8">
      <div className="max-w-sm mx-auto w-full flex-1 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <p className="text-5xl">{inst.emoji}</p>
          <h2 className="text-white font-bold text-xl">{userName}님의 맞춤 커리큘럼</h2>
          <p className="text-lavender-light text-sm">
            {inst.name} 선생님 · {studyPeriod} · {targetScore}점 목표
          </p>
        </div>

        <div className="bg-white/10 rounded-2xl px-4 py-3 text-white/80 text-sm leading-relaxed">
          💬 {inst.msg(userName, targetScore, studyPeriod)}
        </div>

        <div className="space-y-3">
          {curriculum.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-lavender mt-1.5 shrink-0" />
              <p className="text-white/70 text-sm">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-sm mx-auto w-full space-y-3 pt-6">
        <button
          onClick={onComplete}
          className="w-full bg-lavender text-white rounded-xl py-3 font-medium"
        >
          이 과정으로 시작하기
        </button>
        <button className="w-full border border-white/20 text-white/50 rounded-xl py-3 text-sm">
          커리큘럼 수정하기
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저 확인**

선택 강사·목표 점수·기간 기반 커리큘럼 타임라인 표시 확인. '이 과정으로 시작하기' → 홈 이동 확인.

- [ ] **Step 3: 최종 커밋**

```bash
git add src/components/onboarding/CurriculumConfirm.tsx
git commit -m "feat: STEP 4 커리큘럼 확인"
```

---

## 체크리스트 (전체 플로우)

- [ ] `npm run dev` 실행 후 전체 플로우 처음부터 끝까지 통과
- [ ] Pretendard 폰트 적용 확인
- [ ] onboardingStore 값이 각 스텝에서 올바르게 저장되는지 확인 (React DevTools)
- [ ] 모바일 뷰포트(375px) 레이아웃 확인
