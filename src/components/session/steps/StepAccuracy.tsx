'use client'

import { useEffect, useState } from 'react'

interface Props {
  correctCount: number
  totalCount: number
  results: boolean[]
  onNext: () => void
}

export default function StepAccuracy({ correctCount, totalCount, results, onNext }: Props) {
  const [progress, setProgress] = useState(false)
  const [revealedDots, setRevealedDots] = useState(0)

  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100
  const radius = 54
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const t = setTimeout(() => setProgress(true), 300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (results.length === 0) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setRevealedDots(i)
      if (i >= results.length) clearInterval(interval)
    }, 150)
    return () => clearInterval(interval)
  }, [results.length])

  useEffect(() => {
    const delay = Math.max(2800, results.length * 150 + 1000)
    const id = setTimeout(onNext, delay)
    return () => clearTimeout(id)
  }, [onNext, results.length])

  const dashoffset = circumference * (1 - (progress ? percentage / 100 : 0))

  const ringColor = percentage >= 80 ? '#6366F1' : percentage >= 60 ? '#F59E0B' : '#EF4444'

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-8 px-8 cursor-pointer select-none"
      onClick={onNext}
    >
      <p className="text-slate-400 text-sm animate-fade-in-up">오늘의 정확도</p>

      {/* 원형 프로그레스 */}
      <div className="relative animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <svg width="148" height="148" viewBox="0 0 148 148">
          <circle
            cx="74" cy="74" r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="11"
          />
          <circle
            cx="74" cy="74" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            transform="rotate(-90 74 74)"
            style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-slate-900 tabular-nums">{percentage}%</span>
          {totalCount > 0 && (
            <span className="text-slate-400 text-xs mt-1">{correctCount} / {totalCount} 정답</span>
          )}
        </div>
      </div>

      {/* 결과 점 */}
      {results.length > 0 && (
        <div
          className="flex flex-wrap gap-2.5 justify-center max-w-[220px] animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
        >
          {results.map((correct, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < revealedDots
                  ? correct
                    ? 'bg-emerald-400 scale-100'
                    : 'bg-red-400 scale-100'
                  : 'bg-slate-100 scale-75'
              }`}
              style={{ transitionDelay: `${i * 0.04}s` }}
            />
          ))}
        </div>
      )}

      <p className="text-slate-300 text-xs mt-4 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
        화면을 탭하면 건너뜁니다
      </p>
    </div>
  )
}
