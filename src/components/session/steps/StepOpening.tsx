'use client'

import { useEffect } from 'react'

interface Props {
  partName: string
  elapsedSeconds: number
  onNext: () => void
}

export default function StepOpening({ partName, elapsedSeconds, onNext }: Props) {
  useEffect(() => {
    const id = setTimeout(onNext, 2000)
    return () => clearTimeout(id)
  }, [onNext])

  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
  const ss = String(elapsedSeconds % 60).padStart(2, '0')

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6 px-8 cursor-pointer select-none"
      onClick={onNext}
    >
      {/* 체크 아이콘 */}
      <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center animate-pop-badge shadow-lg shadow-indigo-200">
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
          <path
            d="M10 25l11 11 18-22"
            stroke="white"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
        <p className="text-slate-400 text-sm mb-2">{partName}</p>
        <h1 className="text-3xl font-black text-slate-900 mb-5">수업 완료!</h1>
        {elapsedSeconds > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-slate-500">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7.5 4.5v3.5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="text-sm">{mm}:{ss} 동안 학습했어요</span>
          </div>
        )}
      </div>

      <p className="text-slate-300 text-xs mt-10 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
        화면을 탭하면 건너뜁니다
      </p>
    </div>
  )
}
