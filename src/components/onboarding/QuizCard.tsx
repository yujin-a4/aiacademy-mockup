'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const QUESTIONS = [
  {
    step: 1,
    label: '토익 공부,\n나에게 맞는 방식은?',
    left:  { emoji: '🌊', title: '넓게 고루', desc: '여러 파트를 고루 풀며 전체 감각 유지', value: 'W' },
    right: { emoji: '🎯', title: '집중 공략', desc: '목표 파트부터 집중해서 먼저 점수 확보', value: 'N' },
    setter: 'setRangeAxis' as const,
  },
  {
    step: 2,
    label: '나에게 맞는\n공부 페이스는?',
    left:  { emoji: '⚡', title: '몰아서', desc: '짧고 밀도 있게 몰아서 하는 게 효율적', value: 'B' },
    right: { emoji: '📅', title: '꾸준히', desc: '매일 조금씩 쌓아가는 방식이 나에게 맞아', value: 'G' },
    setter: 'setRhythm' as const,
  },
  {
    step: 3,
    label: '나에게 더 맞는\n난이도는?',
    left:  { emoji: '🔥', title: '도전 위주', desc: '어려운 문제에 도전해야 실력이 는다', value: 'C' },
    right: { emoji: '🧩', title: '기초 탄탄', desc: '맞힐 수 있는 문제부터 쌓아야 자신감이 생긴다', value: 'S' },
    setter: 'setDifficulty' as const,
  },
  {
    step: 4,
    label: '공부가 싫어질 때\n나에게 필요한 건?',
    left:  { emoji: '🎁', title: '칭찬 & 보상', desc: '칭찬이나 보상이 있으면 다시 하게 된다', value: 'R' },
    right: { emoji: '📊', title: '현실 자각', desc: '목표까지 얼마나 부족한지 확인하면 정신 차린다', value: 'P' },
    setter: 'setMotivation' as const,
  },
]

export default function QuizCard({ onComplete }: { onComplete: () => void }) {
  const store = useOnboardingStore()
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const q = QUESTIONS[idx]

  const handlePick = (value: string) => {
    if (picked) return
    setPicked(value)

    if (q.setter === 'setRangeAxis') store.setRangeAxis(value as 'W' | 'N')
    else if (q.setter === 'setRhythm') store.setRhythm(value as 'B' | 'G')
    else if (q.setter === 'setDifficulty') store.setDifficulty(value as 'C' | 'S')
    else store.setMotivation(value as 'R' | 'P')

    setTimeout(() => {
      if (idx < QUESTIONS.length - 1) {
        setIdx(i => i + 1)
        setPicked(null)
      } else {
        onComplete()
      }
    }, 650)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFF]">

      {/* 상단 바 */}
      <header className="flex items-center justify-between px-6 md:px-12 py-4 md:py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <img src="/logo.svg" alt="YBM" className="w-4 h-4 brightness-0 invert"
              onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
          </div>
          <span className="text-[#374151] text-[13px] font-bold hidden sm:block">YBM AI 어학원</span>
        </div>

        {/* 진행 점 */}
        <div className="flex items-center gap-1.5">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-500 ${
                i < idx
                  ? 'w-2 bg-primary/40'
                  : i === idx
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-[#DDE3EC]'
              }`}
            />
          ))}
          <span className="text-[#9CA3AF] text-[12px] font-medium ml-2">
            {idx + 1} / {QUESTIONS.length}
          </span>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pb-10">
        <div className="w-full max-w-[760px] animate-fade-in" key={idx}>

          {/* 질문 */}
          <div className="text-center mb-8 md:mb-10">
            <span className="inline-block bg-primary text-white text-[11px] font-black px-3.5 py-1 rounded-full tracking-widest mb-4 uppercase">
              Q{q.step}
            </span>
            <h2 className="text-[#0F172A] text-[26px] md:text-[32px] font-black leading-tight whitespace-pre-line">
              {q.label}
            </h2>
          </div>

          {/* 선택지 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {[q.left, q.right].map((opt) => {
              const isSelected = picked === opt.value
              const isDimmed = picked !== null && !isSelected
              return (
                <button
                  key={opt.value}
                  onClick={() => handlePick(opt.value)}
                  disabled={!!picked}
                  className={`relative flex items-start gap-4 p-6 md:p-7 min-h-[140px] md:min-h-[160px] rounded-2xl border-2 text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary border-primary shadow-xl shadow-primary/25 scale-[1.02]'
                      : isDimmed
                      ? 'bg-[#F3F4F6] border-[#E9EBEF] opacity-40 cursor-default'
                      : 'bg-white border-[#E5E7EB] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/8 hover:scale-[1.01] cursor-pointer'
                  }`}
                >
                  {/* 이모지 박스 */}
                  <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-[22px] ${
                    isSelected ? 'bg-white/20' : 'bg-[#EEF2FF]'
                  }`}>
                    {opt.emoji}
                  </div>

                  {/* 텍스트 */}
                  <div className="flex-1 pt-0.5">
                    <p className={`text-[16px] md:text-[17px] font-bold mb-1.5 ${
                      isSelected ? 'text-white' : 'text-[#0F172A]'
                    }`}>
                      {opt.title}
                    </p>
                    <p className={`text-[13px] md:text-[14px] leading-relaxed ${
                      isSelected ? 'text-white/75' : 'text-[#64748B]'
                    }`}>
                      {opt.desc}
                    </p>
                  </div>

                  {/* 체크 */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-white/25 rounded-full flex items-center justify-center">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
