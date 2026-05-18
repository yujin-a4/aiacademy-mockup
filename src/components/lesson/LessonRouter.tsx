'use client'

import { useOnboardingStore } from '@/store/onboardingStore'
import { useLessonStore } from '@/store/lessonStore'
import Screen0 from './Screen0'
import Screen1 from './Screen1'
import Screen2 from './Screen2'
import Screen3 from './Screen3'
import Screen4 from './Screen4'
import Screen5 from './Screen5'

interface LessonRouterProps {
  onEnd: () => void
}

export default function LessonRouter({ onEnd }: LessonRouterProps) {
  const currentScreen = useLessonStore((s) => s.currentScreen)
  const nextScreen    = useLessonStore((s) => s.nextScreen)
  const targetScore   = useOnboardingStore((s) => s.targetScore)

  /* 목표 점수 기준으로 학습 모드 결정 */
  const learnerMode: 600 | 750 = (targetScore !== null && targetScore >= 750) ? 750 : 600

  switch (currentScreen) {
    case 0:
      return <Screen0 onComplete={nextScreen} />

    case 1:
      return learnerMode === 750
        ? <Screen2 onComplete={nextScreen} onEnd={onEnd} />
        : <Screen1 onComplete={nextScreen} onEnd={onEnd} />

    case 2:
      return <Screen3 onComplete={nextScreen} onEnd={onEnd} />

    case 3:
      return <Screen4 onComplete={nextScreen} onEnd={onEnd} />

    case 4:
      return <Screen5 onComplete={nextScreen} />

    case 5:
      return (
        <div className="h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-[#0B1E40] to-[#1A2B4B] text-white text-center px-6 gap-6">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-bold">수업이 끝났어요!</h1>
          <p className="text-white/70 text-sm leading-relaxed">
            오늘 배운 수동태 내용을 꼭 복습해 보세요.<br />MY PAGE에 요약 노트가 저장됐어요.
          </p>
          <button
            onClick={onEnd}
            className="mt-4 px-8 py-3.5 rounded-2xl bg-[#2277F0] text-white font-bold text-base hover:bg-[#1a66d4] active:scale-95 transition-all"
          >
            홈으로 →
          </button>
        </div>
      )

    default:
      return null
  }
}
