'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'

const LINES = [
  { emoji: '🔥', name: '박혜원', action: '제안서를 작성 중입니다...' },
  { emoji: '🤝', name: '김토익', action: '목표 기간을 검토 중입니다...' },
  { emoji: '💼', name: '이선생', action: '학습 성향을 분석하고 있습니다...' },
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ybm-onboarding px-6 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-[-80px] right-[-60px] w-72 h-72 rounded-full bg-ybm-blue/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-40px] w-52 h-52 rounded-full bg-ybm-blue/10 blur-2xl pointer-events-none" />

      <div className="w-full max-w-sm space-y-8 z-10">
        <div className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center animate-float">
            <div className="absolute inset-0 bg-slate-100 rounded-full animate-pulse blur-xl" />
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg">
              <span className="text-3xl">📊</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">맞춤 분석 중</p>
            <h2 className="text-slate-900 text-xl font-bold">제안서를 생성하고 있어요</h2>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          {visible >= 1 && (
            <p className="text-slate-500 text-sm animate-fade-in flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ybm-blue shrink-0" />
              <span><span className="text-slate-900 font-bold">{userName}님</span>의 프로필 전달 완료</span>
            </p>
          )}

          {LINES.map((line, i) =>
            visible >= i + 2 ? (
              <div key={line.name} className="flex items-center gap-3 animate-fade-in">
                <span className="text-xl shrink-0">{line.emoji}</span>
                <p className="text-slate-500 text-sm">
                  <span className="text-slate-900 font-bold">{line.name} 쌤</span>이 {line.action}
                </p>
              </div>
            ) : null
          )}

          {/* 진행 중 점 애니메이션 */}
          {!showCTA && (
            <div className="flex gap-1.5 pt-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {showCTA && (
          <button
            onClick={onNext}
            className="w-full bg-ybm-blue text-white rounded-2xl h-[56px] font-bold text-lg animate-fade-in shadow-lg transition-all active:scale-95 hover:opacity-90"
          >
            제안서 확인하기
          </button>
        )}
      </div>
    </div>
  )
}
