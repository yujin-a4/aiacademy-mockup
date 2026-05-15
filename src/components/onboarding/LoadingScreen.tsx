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
    <div className="flex flex-col items-center justify-center min-h-screen bg-onboarding px-6 relative overflow-hidden">
      <div className="w-full max-w-sm space-y-8 z-10">
        <div className="text-center space-y-6">
          <div className="relative w-32 h-32 mx-auto animate-float">
            <Image src="/img/와옹이_궁금.png" alt="와옹이" fill className="object-contain" />
            {/* 선글라스 번쩍이는 효과 느낌의 오버레이 (추후 고도화 가능) */}
            <div className="absolute inset-0 bg-waong-lavender/20 rounded-full animate-pulse blur-xl"></div>
          </div>
          
          <div className="space-y-2">
            <p className="text-waong-lavender text-xs font-bold uppercase tracking-[0.2em]">Analyzing Profile</p>
            <h2 className="text-white text-xl font-bold">맞춤 제안서를 생성하고 있어요</h2>
          </div>
        </div>

        <div className="space-y-4 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          {visible >= 1 && (
            <p className="text-white/60 text-sm animate-fade-in flex items-center gap-2">
              <span className="text-waong-lavender">●</span> 
              <span><span className="text-white font-bold">{userName}님</span>의 프로필 전달 완료</span>
            </p>
          )}

          {LINES.map((line, i) =>
            visible >= i + 2 ? (
              <div key={line.name} className="flex items-center gap-3 animate-fade-in">
                <span className="text-xl">{line.emoji}</span>
                <p className="text-white/50 text-sm">
                  <span className="text-white font-medium">{line.name} 쌤</span>이 {line.action}
                </p>
              </div>
            ) : null
          )}
        </div>

        {showCTA && (
          <button
            onClick={onNext}
            className="w-full bg-waong-lavender text-dark-navy rounded-xl h-[56px] font-bold text-lg animate-fade-in shadow-high transition-all active:scale-95"
          >
            제안서 확인하기
          </button>
        )}
      </div>
    </div>
  )
}
