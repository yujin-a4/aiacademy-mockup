'use client'
import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const STEPS = [
  { text: '학습 성향을 분석하고 있습니다' },
  { text: '목표 점수와 학습 패턴을 계산하고 있습니다' },
  { text: '최적의 학습 유형을 도출하고 있습니다' },
]

function DotLoader() {
  return (
    <span className="inline-flex gap-[3px] ml-1 align-middle">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-[#9CA3AF] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

export default function DiagnosisLoading({ onNext }: { onNext: () => void }) {
  const userName = useOnboardingStore(s => s.userName)
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timers = [
      setTimeout(() => setCurrent(1), 500),
      setTimeout(() => setCurrent(2), 1800),
      setTimeout(() => setCurrent(3), 3000),
      setTimeout(() => {
        setDone(true)
        setTimeout(onNext, 600)
      }, 4200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onNext])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F4F6] px-4">
      <div className="w-full max-w-[420px] space-y-6">

        {/* 아이콘 + 타이틀 */}
        <div className="text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-lg animate-bounce-in">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
            {!done && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-5 w-5 bg-white border-2 border-primary items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                </span>
              </span>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[#6B7280] text-xs font-semibold uppercase tracking-[0.15em]">AI 진단 중</p>
            <h2 className="text-[#111318] text-[22px] font-bold leading-snug">
              {userName}님의 학습 유형을<br />분석하고 있어요
            </h2>
          </div>
        </div>

        {/* 진행 단계 카드 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5 shadow-sm">
          {STEPS.map((step, i) => {
            if (current <= i) return null
            const isActive = current === i + 1 && !done
            const isCompleted = current > i + 1 || done
            return (
              <div key={i} className="flex items-center gap-3 animate-fade-in">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isCompleted ? 'bg-emerald-500' : 'bg-primary/10'
                }`}>
                  {isCompleted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
                <p className="text-[#374151] text-[13px] leading-snug flex-1">
                  {step.text}
                  {isActive && <DotLoader />}
                  {isCompleted && (
                    <span className="ml-1 text-emerald-500 font-semibold text-[12px]">완료 ✓</span>
                  )}
                </p>
              </div>
            )
          })}

          {done && (
            <div className="flex items-center gap-3 pt-3 border-t border-[#F3F4F6] animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-[#111318] font-bold text-[14px]">
                학습 유형 분석이 완료되었습니다! ✨
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
