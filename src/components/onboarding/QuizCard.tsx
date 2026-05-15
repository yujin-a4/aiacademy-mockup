'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'

const QUESTIONS = [
  {
    label: 'Q1. 학습 스타일',
    left: { text: '꼼꼼하게 이해하며', value: '꼼꼼' },
    right: { text: '빠르게 많이 풀며', value: '빠르게' },
    reaction: '좋아요! 학습 스타일 파악 완료 😊',
    key: 'learningStyle' as const,
  },
  {
    label: 'Q2. 관리 강도',
    left: { text: '스스로 계획하는 편', value: '스스로' },
    right: { text: '강하게 밀어붙여 줬으면', value: '강하게' },
    reaction: '완벽해요! 관리 스타일 체크 완료 💪',
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-onboarding px-6 relative overflow-hidden">
      <div className="w-full max-w-sm space-y-10 animate-fade-in z-10">
        {/* 진행 바 */}
        <div className="flex gap-2 px-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                i <= idx ? 'bg-waong-lavender' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* 와옹이 말풍선 */}
        <div className="text-center space-y-6">
          <div className="relative w-28 h-28 mx-auto animate-bounce-in">
            <Image
              src={showReaction ? "/img/와옹이_기쁨.png" : "/img/와옹이_궁금.png"}
              alt="와옹이"
              fill
              className="object-contain"
            />
          </div>
          <div className="bg-white rounded-2xl px-5 py-4 text-dark-navy text-base font-bold leading-relaxed shadow-high relative min-h-[60px] flex items-center justify-center">
             {/* 말풍선 꼬리 */}
             <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-bottom-[10px] border-white" />
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
              className={`w-full h-16 rounded-xl px-6 text-base font-bold transition-all duration-200 shadow-low ${
                picked === opt.value
                  ? 'bg-waong-lavender text-dark-navy scale-[1.02]'
                  : picked
                  ? 'bg-white/5 text-white/20 border border-white/10'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/40'
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
