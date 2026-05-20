'use client'
import { useState, useEffect } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const LINES = [
  { name: '박혜원', action: 'Study Plan을 작성 중입니다...' },
  { name: '장연지', action: '목표 기간을 검토 중입니다...' },
  { name: '김토익', action: '학습 성향을 분석하고 있습니다...' },
]

export default function LoadingScreen({ onNext }: { onNext: () => void }) {
  const userName = useOnboardingStore((s) => s.userName)
  const [visible, setVisible] = useState(0)
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F4F6] px-4">
      <div className="w-full max-w-[390px] space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-primary rounded-2xl animate-bounce-in">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M18.4 9.4L11 16.8l-3.5-3.5L4 16.8"/></svg>
          </div>
          <div className="space-y-1">
            <p className="text-[#6B7280] text-xs font-semibold uppercase tracking-[0.15em]">맞춤 분석 중</p>
            <h2 className="text-[#111318] text-[22px] font-bold">Study Plan을 생성하고 있어요</h2>
          </div>
        </div>

        <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-5 space-y-3">
          {visible >= 1 && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <p className="text-[#374151] text-sm">
                <span className="text-[#111318] font-semibold">{userName}님</span>의 프로필 전달 완료
              </p>
            </div>
          )}
          {LINES.map((line, i) =>
            visible >= i + 2 ? (
              <div key={line.name} className="flex items-center gap-2.5 animate-fade-in">
                <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                <p className="text-[#374151] text-sm">
                  <span className="text-[#111318] font-semibold">{line.name} 쌤</span>이 {line.action}
                </p>
              </div>
            ) : null
          )}
          {!showCTA && (
            <div className="flex gap-1.5 pt-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>

        {showCTA && (
          <button
            onClick={onNext}
            className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-11 font-semibold text-[15px] animate-fade-in transition-colors active:scale-[0.98]"
          >
            Study Plan 확인하기
          </button>
        )}
      </div>
    </div>
  )
}
