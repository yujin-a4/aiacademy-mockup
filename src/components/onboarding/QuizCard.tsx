'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const QUESTIONS = [
  {
    label: 'Q1. 아는 문제를 또 틀렸다! 이때 나를 움직이게 하는 선생님의 한마디는?',
    left: { text: '"정신 차려!" 뼈 때리는 팩폭으로 정신 번쩍 들게 하기', value: '강하게' },
    right: { text: '"괜찮아!" 따뜻한 격려로 다시 멘탈 잡아주기', value: '스스로' },
    reaction: '확실한 스타일이시네요! 스타일 파악 완료',
    key: 'managementStyle' as const,
  },
  {
    label: 'Q2. 공부하기 정말 싫은 날, 나를 책상에 앉게 만드는 원동력은?',
    left: { text: '눈으로 확인하는 내 점수 상승 그래프', value: '점수' },
    right: { text: '나를 챙겨주는 선생님의 진심 어린 응원', value: '성취감' },
    reaction: '무엇이 동기가 되는지 알겠어요! 체크 완료',
    key: 'motivationType' as const,
  },
  {
    label: 'Q3. 나에게 딱 맞는 트레이닝 페이스는?',
    left: { text: '짧고 밀도 있게, 빡세게 몰아치기', value: '빠르게' },
    right: { text: '지치지 않게, 내 컨디션에 맞춘 꾸준한 루틴', value: '꼼꼼' },
    reaction: '완벽해요! 당신께 딱 맞는 코스를 구성할게요',
    key: 'learningStyle' as const,
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F4F6] px-4">
      <div className="w-full max-w-[390px] space-y-8 animate-fade-in">
        {/* 진행 바 */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i <= idx ? 'bg-primary' : 'bg-[#D1D5DB]'}`} />
          ))}
        </div>

        {/* 질문 헤더 */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-primary-50 border border-primary-100 rounded-2xl animate-bounce-in">
            <span className="text-2xl">{showReaction ? '✓' : '?'}</span>
          </div>
          <div className="bg-white border border-[#D1D5DB] rounded-2xl px-5 py-4 text-[#111318] text-[15px] font-medium leading-relaxed min-h-[60px] flex items-center justify-center text-center relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-white" />
            {showReaction ? q.reaction : q.label}
          </div>
        </div>

        {/* 선택지 */}
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
  )
}
