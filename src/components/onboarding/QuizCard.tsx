'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'

const QUESTIONS = [
  {
    label: 'Q1. 아는 문제를 또 틀렸다! 이때 나를 움직이게 하는 선생님의 한마디는?',
    left: { text: '“정신 차려!” 뼈 때리는 팩폭으로 정신 번쩍 들게 하기', value: '강하게' },
    right: { text: '“괜찮아!” 따뜻한 격려로 다시 멘탈 잡아주기', value: '스스로' },
    reaction: '확실한 스타일이시네요! 스타일 파악 완료 ✅',
    key: 'managementStyle' as const,
  },
  {
    label: 'Q2. 공부하기 정말 싫은 날, 나를 책상에 앉게 만드는 원동력은?',
    left: { text: '눈으로 확인하는 내 점수 상승 그래프', value: '점수' },
    right: { text: '나를 챙겨주는 선생님의 진심 어린 응원', value: '성취감' },
    reaction: '무엇이 동기가 되는지 알겠어요! 체크 완료 ✨',
    key: 'motivationType' as const,
  },
  {
    label: 'Q3. 나에게 딱 맞는 트레이닝 페이스는?',
    left: { text: '짧고 밀도 있게, 빡세게 몰아치기', value: '빠르게' },
    right: { text: '지치지 않게, 내 컨디션에 맞춘 꾸준한 루틴', value: '꼼꼼' },
    reaction: '완벽해요! 당신께 딱 맞는 코스를 구성할게요 🚀',
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ybm-onboarding px-6 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-[-60px] right-[-40px] w-56 h-56 rounded-full bg-ybm-blue/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-40px] left-[-40px] w-44 h-44 rounded-full bg-ybm-blue/10 blur-2xl pointer-events-none" />

      <div className="w-full max-w-sm space-y-10 animate-fade-in z-10">
        {/* 진행 바 */}
        <div className="flex gap-2 px-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                i <= idx ? 'bg-ybm-blue' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* 질문 헤더 */}
        <div className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm animate-bounce-in">
            <span className="text-4xl">{showReaction ? '✅' : '❓'}</span>
          </div>
          <div className="relative bg-white rounded-2xl px-5 py-4 text-slate-900 text-base font-bold leading-relaxed shadow-lg border border-slate-100 min-h-[60px] flex items-center justify-center">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-white" />
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
              className={`w-full h-16 rounded-2xl px-6 text-base font-bold transition-all duration-200 border-2 ${
                picked === opt.value
                  ? 'bg-ybm-blue text-white border-ybm-blue scale-[1.02] shadow-lg'
                  : picked
                  ? 'bg-slate-50 text-slate-300 border-slate-100'
                  : 'bg-white text-slate-900 border-slate-200 shadow-sm hover:border-ybm-blue hover:text-ybm-blue'
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
