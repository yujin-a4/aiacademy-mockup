'use client'
import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const LOAD_STEPS = [
  { name: '박혜원', action: '학습 성향을 분석하고 있습니다', thumb: '/image_reference/park-2.jpg' },
  { name: '장연지', action: '맞춤형 커리큘럼을 설계하고 있습니다', thumb: '/image_reference/jang.png' },
  { name: '김토익', action: '핵심 문제 유형을 선별하고 있습니다', thumb: '/image_reference/kim.png' },
]

function DotLoader() {
  return (
    <span className="inline-flex gap-[3px] ml-1 align-middle">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-[#9CA3AF] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
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
      setTimeout(() => setCurrent(1), 400),
      setTimeout(() => setCurrent(2), 2200),
      setTimeout(() => setCurrent(3), 4000),
      setTimeout(() => setDone(true), 5600),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F4F6] px-4">
      <div className="w-full max-w-[390px] space-y-6">

        {/* 아이콘 + 타이틀 */}
        <div className="text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-lg animate-bounce-in">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/><path d="M18.4 9.4L11 16.8l-3.5-3.5L4 16.8"/>
              </svg>
            </div>
            {!done && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-5 w-5 bg-white border-2 border-primary items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                </span>
              </span>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[#6B7280] text-xs font-semibold uppercase tracking-[0.15em]">프로그램 생성 중</p>
            <h2 className="text-[#111318] text-[22px] font-bold leading-snug">
              {userName}님에게 맞는<br />학습 프로그램을 만들고 있어요
            </h2>
          </div>
        </div>

        {/* 강사 로딩 메시지 카드 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4 shadow-sm">
          {LOAD_STEPS.map((step, i) => {
            if (current <= i) return null
            const isActive = current === i + 1 && !done
            const isCompleted = current > i + 1 || done
            return (
              <div key={i} className="flex items-center gap-3 animate-fade-in">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-[#E5E7EB] shadow-sm">
                  <img
                    src={step.thumb}
                    alt={step.name}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement
                      el.style.display = 'none'
                      el.parentElement!.classList.add('bg-primary', 'flex', 'items-center', 'justify-center')
                      el.parentElement!.innerHTML = `<span class="text-white text-xs font-bold">${step.name[0]}</span>`
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[#374151] text-[13px] leading-snug">
                    <span className="font-bold text-[#111318]">{step.name} 쌤</span>이{' '}
                    {step.action}
                    {isActive && <DotLoader />}
                    {isCompleted && (
                      <span className="ml-1 text-emerald-500 font-semibold text-[12px]">완료 ✓</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}

          {/* 구분선 + 완료 메시지 */}
          {done && (
            <div className="flex items-center gap-3 pt-3 border-t border-[#F3F4F6] animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-[#111318] font-bold text-[15px]">
                생성이 완료되었습니다!
              </p>
            </div>
          )}
        </div>

        {/* 완료 후 버튼 (자동 진행 없음) */}
        {done && (
          <button
            onClick={onNext}
            className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-12 font-semibold text-[15px] transition-colors active:scale-[0.98] shadow-md animate-fade-in"
          >
            프로그램 확인하기
          </button>
        )}
      </div>
    </div>
  )
}
