'use client'
import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const STEPS = [
  '학습 성향 분석 완료',
  '목표 점수 · 기간 계산 완료',
  '최적 학습 순서 설계 완료',
  '맞춤 커리큘럼 생성 완료!',
]

export default function CurriculumLoading({ onNext }: { onNext: () => void }) {
  const userName = useOnboardingStore(s => s.userName)
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timers = [
      setTimeout(() => setCurrent(1), 600),
      setTimeout(() => setCurrent(2), 1400),
      setTimeout(() => setCurrent(3), 2300),
      setTimeout(() => { setCurrent(4); setDone(true) }, 3200),
      setTimeout(() => onNext(), 4000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onNext])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F4F6] px-4">
      <div className="w-full max-w-[390px] space-y-8">

        {/* 아이콘 + 메인 텍스트 */}
        <div className="text-center space-y-5">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center animate-bounce-in">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/><path d="M18.4 9.4L11 16.8l-3.5-3.5L4 16.8"/>
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

          <div className="space-y-2">
            <h2 className="text-[#111318] text-[22px] font-bold leading-snug">
              {userName}님에게 맞는<br />
              커리큘럼을 생성해서<br />
              제안하고 있습니다
            </h2>
            {!done && (
              <div className="flex items-center justify-center gap-1 mt-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 진행 스텝 */}
        <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-5 space-y-3">
          {STEPS.map((step, i) =>
            current > i ? (
              <div key={i} className="flex items-center gap-2.5 animate-fade-in">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i === STEPS.length - 1 ? 'bg-[#10B981]' : 'bg-primary'}`}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className={`text-sm ${i === STEPS.length - 1 ? 'text-[#111318] font-semibold' : 'text-[#374151]'}`}>{step}</p>
              </div>
            ) : null
          )}
          {!done && (
            <div className="flex gap-1.5 pt-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
