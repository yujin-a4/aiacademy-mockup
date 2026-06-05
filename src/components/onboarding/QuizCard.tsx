'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const QUESTIONS = [
  {
    label: 'Q1. 토익 공부, 나에게 맞는 방식은?',
    left:  { text: '여러 파트를 고루 풀며 전체 감각 유지', value: 'W' },
    right: { text: '목표 점수 위해 먼저 잡을 파트부터 집중', value: 'N' },
    reaction: '학습 범위 스타일 파악 완료!',
    setter: 'setRangeAxis' as const,
  },
  {
    label: 'Q2. 나에게 맞는 공부 페이스는?',
    left:  { text: '짧고 밀도 있게 몰아서', value: 'B' },
    right: { text: '매일 조금씩 꾸준히', value: 'G' },
    reaction: '페이스 파악 완료!',
    setter: 'setRhythm' as const,
  },
  {
    label: 'Q3. 나에게 더 맞는 난이도는?',
    left:  { text: '어려운 문제 도전해야 실력이 는다', value: 'C' },
    right: { text: '맞힐 수 있는 문제부터 쌓아야 자신감', value: 'S' },
    reaction: '난이도 성향 체크 완료!',
    setter: 'setDifficulty' as const,
  },
  {
    label: 'Q4. 공부가 싫어질 때 필요한 건?',
    left:  { text: '칭찬·보상이 있으면 다시 하게 된다', value: 'R' },
    right: { text: '목표까지 부족함을 확인하면 정신 차린다', value: 'P' },
    reaction: '당신의 코치를 찾았어요!',
    setter: 'setMotivation' as const,
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
    store[q.setter](value as any)
    setShowReaction(true)

    setTimeout(() => {
      if (idx < QUESTIONS.length - 1) {
        setIdx(idx + 1)
        setPicked(null)
        setShowReaction(false)
      } else {
        onComplete()
      }
    }, 900)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] px-4 py-10">
      <div className="w-full max-w-[390px] mx-auto flex flex-col flex-1 animate-fade-in">
        <div className="flex-1 flex flex-col justify-center space-y-8">

          <div className="flex gap-1.5">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i <= idx ? 'bg-primary' : 'bg-[#D1D5DB]'}`} />
            ))}
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto flex items-center justify-center bg-primary-50 border border-primary-100 rounded-2xl animate-bounce-in">
              <span className="text-2xl">{showReaction ? '✓' : '?'}</span>
            </div>
            <div className="bg-white border border-[#D1D5DB] rounded-2xl px-5 py-4 text-[#111318] text-[15px] font-medium leading-relaxed min-h-[60px] flex items-center justify-center text-center relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-white" />
              {showReaction ? q.reaction : q.label}
            </div>
          </div>

          <div className="space-y-2.5">
            {[q.left, q.right].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePick(opt.value)}
                disabled={!!picked}
                className={`w-full py-4 px-5 rounded-[10px] text-[15px] font-medium transition-all duration-200 border text-left ${
                  picked === opt.value
                    ? 'bg-primary text-white border-primary'
                    : picked
                    ? 'bg-white text-[#D1D5DB] border-[#D1D5DB]'
                    : 'bg-white text-[#374151] border-[#D1D5DB] hover:border-primary hover:text-primary'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
