'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const QUESTIONS = [
  {
    step: 1,
    label: '토익 공부,\n나에게 맞는 방식은?',
    left:  { emoji: '🌊', title: '넓게 고루', desc: '여러 파트를 고르게 풀면서 전체 감각을 유지하고 싶어요', value: 'W' },
    right: { emoji: '🎯', title: '집중 공략', desc: '목표 점수를 위해 먼저 잡아야 할 파트부터 집중적으로 공부하고 싶어요', value: 'N' },
    setter: 'setRangeAxis' as const,
  },
  {
    step: 2,
    label: '나에게 더 맞는\n학습 난이도는?',
    left:  { emoji: '🔥', title: '도전 위주', desc: '조금 어려운 문제도 도전해봐야 실력이 느는 것 같아요', value: 'C' },
    right: { emoji: '🧩', title: '기초 탄탄', desc: '내가 맞힐 수 있는 문제부터 쌓아가야 자신감이 생겨요', value: 'S' },
    setter: 'setDifficulty' as const,
  },
  {
    step: 3,
    label: '공부가 싫어질 때\n나에게 필요한 건?',
    left:  { emoji: '🎁', title: '칭찬 & 보상', desc: '칭찬과 보상이 있으면 다시 해볼 마음이 생겨요', value: 'R' },
    right: { emoji: '📊', title: '현실 자각', desc: '목표까지 아직 부족하다는 걸 확인하면 정신차리고 다시 하게 돼요', value: 'P' },
    setter: 'setMotivation' as const,
  },
  {
    step: 4,
    label: '나에게 맞는\n공부 페이스는?',
    left:  { emoji: '⚡', title: '집중 몰입', desc: '한번에 몰아서 공부하는 게 좋아요', value: 'D' },
    right: { emoji: '📅', title: '짧게 자주', desc: '짧게 여러번 나눠서 공부하는 게 좋아요', value: 'M' },
    setter: 'setRhythm' as const,
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
    else if (q.setter === 'setDifficulty') store.setDifficulty(value as 'C' | 'S')
    else if (q.setter === 'setMotivation') store.setMotivation(value as 'R' | 'P')
    else store.setRhythm(value as 'D' | 'M')

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
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center p-4 gap-4">
      {/* ── 카드 밖 상단 헤더 ── */}
      <div className="w-full max-w-[1032px] flex items-center gap-2.5">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
          <img src="/logo.svg" alt="YBM" className="w-4 h-4 brightness-0 invert"
            onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
        </div>
        <span className="text-[#374151] text-[13px] font-bold">YBM AI 어학원</span>
      </div>

      <div className="w-full max-w-[1032px] min-h-[600px] rounded-3xl overflow-hidden shadow-2xl shadow-black/10 flex flex-col md:flex-row">
        {/* ── 좌측: 질문 영역 ── */}
        <div className="relative md:w-[45%] bg-gradient-to-br from-[#3B82F6] to-[#2563EB] p-8 md:p-10 flex flex-col justify-center overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-[#1D4ED8]/40 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* 슬라이드 영역: 진행 점 + 질문 */}
            <div key={idx} className="animate-slide-in-right">
              {/* 진행 점 */}
              <div className="flex items-center gap-1.5 mb-8">
                {QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      i < idx
                        ? 'w-2 bg-white/40'
                        : i === idx
                        ? 'w-8 bg-white'
                        : 'w-2 bg-white/25'
                    }`}
                  />
                ))}
                <span className="text-white/60 text-[12px] font-medium ml-2">
                  {idx + 1} / {QUESTIONS.length}
                </span>
              </div>

              {/* 질문 */}
              <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[11px] font-black px-3.5 py-1 rounded-full tracking-widest mb-5 uppercase">
                Q{q.step}
              </span>
              <h2 className="text-white text-[28px] md:text-[34px] font-black leading-tight whitespace-pre-line">
                {q.label}
              </h2>
            </div>

            <p className="text-white/55 text-[13px] leading-relaxed mt-10">
              선택한 성향을 바탕으로<br />나에게 맞는 학습 유형을 찾아드려요.
            </p>
          </div>
        </div>

        {/* ── 우측: 선택지 영역 ── */}
        <div className="md:w-[55%] bg-white flex flex-col justify-center px-8 md:px-10 py-10">
          <div key={idx} className="flex flex-col gap-4 animate-slide-in-right">
            {[q.left, q.right].map((opt) => {
              const isSelected = picked === opt.value
              const isDimmed = picked !== null && !isSelected
              return (
                <button
                  key={opt.value}
                  onClick={() => handlePick(opt.value)}
                  disabled={!!picked}
                  className={`relative flex items-start gap-4 p-6 md:p-7 min-h-[140px] rounded-2xl border-2 text-left transition-all duration-200 ${
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
                    <p className={`text-[16px] md:text-[17px] font-normal mb-2 ${
                      isSelected ? 'text-white' : 'text-[#0F172A]'
                    }`}>
                      {opt.title}
                    </p>
                    <p className={`text-[14px] md:text-[15px] leading-relaxed font-light tracking-tight ${
                      isSelected ? 'text-white/90' : 'text-[#374151]'
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
