'use client'
import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const LOAD_STEPS = [
  { name: '박혜원', action: (n: string) => `${n}님의 성향을 보고 프로그램을 구성하고 있어요`, thumb: '/image_reference/park-2.jpg' },
  { name: '윤다은', action: (n: string) => `${n}님에게 맞는 커리큘럼을 설계하고 있어요`, thumb: '/image_reference/jang.png' },
  { name: '이도윤', action: (n: string) => `${n}님께 제안할 프로그램을 완성하고 있어요`, thumb: '/image_reference/lee.png' },
  { name: '서지안', action: (n: string) => `${n}님을 위한 최적의 프로그램을 확정하고 있어요`, thumb: '/image_reference/jung.png' },
]

function DotLoader() {
  return (
    <span className="inline-flex gap-[3px] ml-1 align-middle">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  )
}

export default function CurriculumLoading({ onNext }: { onNext: () => void }) {
  const userName = useOnboardingStore(s => s.userName)
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timers = [
      setTimeout(() => setCurrent(1), 500),
      setTimeout(() => setCurrent(2), 3500),
      setTimeout(() => setCurrent(3), 6500),
      setTimeout(() => setCurrent(4), 9500),
      setTimeout(() => setDone(true), 12500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFF]">
      <header className="flex items-center px-6 md:px-12 py-4 md:py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <img src="/logo.svg" alt="YBM" className="w-4 h-4 brightness-0 invert"
              onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
          </div>
          <span className="text-[#374151] text-[13px] font-bold hidden sm:block">YBM AI 어학원</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pb-10">
        <div className="w-full max-w-[560px] space-y-8">

          {/* 타이틀 */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-[12px] font-semibold px-4 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              프로그램 생성 중
            </div>
            <h2 className="text-[#0F172A] text-[26px] md:text-[32px] font-medium leading-tight tracking-tight">
              {userName}님에게 맞는<br />학습 프로그램을 만들고 있어요
            </h2>
          </div>

          {/* 강사 진행 카드 */}
          <div className="bg-white border-2 border-[#E5E7EB] rounded-2xl p-6 space-y-5">
            {LOAD_STEPS.map((step, i) => {
              if (current <= i) return null
              const isActive = current === i + 1 && !done
              const isCompleted = current > i + 1 || done
              return (
                <div key={i} className="flex items-center gap-4 animate-fade-in">
                  <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 transition-colors ${
                    isCompleted ? 'border-emerald-400' : 'border-primary/30'
                  }`}>
                    <img src={step.thumb} alt={step.name}
                      className="w-full h-full object-cover object-top"
                      onError={e => {
                        const el = e.target as HTMLImageElement
                        el.style.display = 'none'
                        el.parentElement!.classList.add('bg-primary', 'flex', 'items-center', 'justify-center')
                        el.parentElement!.innerHTML = `<span class="text-white text-xs font-bold">${step.name[0]}</span>`
                      }} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-[14px] leading-snug ${isCompleted ? 'text-[#64748B]' : 'text-[#0F172A]'}`}>
                      <span className="font-bold">{step.name} 쌤</span>이{' '}
                      {step.action(userName ?? '고객')}
                      {isActive && <DotLoader />}
                      {isCompleted && <span className="ml-1.5 text-emerald-500 font-semibold text-[12px]">완료</span>}
                    </p>
                  </div>
                </div>
              )
            })}

            {done && (
              <div className="flex items-center gap-4 pt-4 border-t border-[#F1F5F9] animate-fade-in">
                <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <p className="text-[#0F172A] font-bold text-[15px]">
                  {userName}님을 위한 프로그램이 준비됐어요!
                </p>
              </div>
            )}
          </div>

          {done && (
            <button
              onClick={onNext}
              className="w-full h-12 bg-primary hover:bg-primary-600 text-white font-bold text-[15px] rounded-xl transition-all active:scale-[0.98] shadow-md animate-fade-in"
            >
              프로그램 확인하기
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
