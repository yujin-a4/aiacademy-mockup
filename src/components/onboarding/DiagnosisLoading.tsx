'use client'
import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const STEPS = [
  '학습 성향을 분석하고 있습니다',
  '목표 점수와 학습 패턴을 계산하고 있습니다',
  '최적의 학습 유형을 도출하고 있습니다',
]

function DotLoader() {
  return (
    <span className="inline-flex gap-[3px] ml-1 align-middle">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
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
      setTimeout(() => { setDone(true); setTimeout(onNext, 3000) }, 4200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onNext])

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFF]">
      <header className="flex items-center px-6 md:px-12 py-4 md:py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <img src="/logo.svg" alt="YBM" className="w-4 h-4 brightness-0 invert"
              onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
          </div>
          <span className="text-[#374151] text-[13px] font-bold hidden sm:block">YBM AI 어학원</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pb-10">
        <div className="w-full max-w-[560px] space-y-8">

          {/* 타이틀 */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-[12px] font-black px-4 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AI 진단 중
            </div>
            <h2 className="text-[#0F172A] text-[26px] md:text-[32px] font-black leading-tight">
              {userName}님의<br />학습 유형을 분석 중이에요
            </h2>
          </div>

          {/* 진행 카드 */}
          <div className="bg-white border-2 border-[#E5E7EB] rounded-2xl p-6 space-y-4">
            {STEPS.map((text, i) => {
              if (current <= i) return null
              const isActive = current === i + 1 && !done
              const isCompleted = current > i + 1 || done
              return (
                <div key={i} className="flex items-center gap-3 animate-fade-in">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isCompleted ? 'bg-emerald-500' : 'bg-[#EEF2FF]'
                  }`}>
                    {isCompleted ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <p className={`text-[14px] leading-snug flex-1 ${isCompleted ? 'text-[#64748B]' : 'text-[#0F172A] font-medium'}`}>
                    {text}
                    {isActive && <DotLoader />}
                    {isCompleted && <span className="ml-1.5 text-emerald-500 font-semibold text-[12px]">완료</span>}
                  </p>
                </div>
              )
            })}

            {done && (
              <div className="flex items-center gap-3 pt-4 border-t border-[#F1F5F9] animate-fade-in">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <p className="text-[#0F172A] font-bold text-[14px]">학습 유형 분석 완료!</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
