'use client'

import { useEffect, useState, useCallback } from 'react'
import { useClassroomStore } from '@/store/classroomStore'

interface ClassroomTopNavProps {
  partName: string
  totalProblems: number
  initialSeconds?: number
  onEnd?: () => void
}

export default function ClassroomTopNav({
  partName,
  totalProblems,
  initialSeconds = 20 * 60,
  onEnd,
}: ClassroomTopNavProps) {
  const currentProblemIndex = useClassroomStore((s) => s.currentProblemIndex)
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  const handleEnd = useCallback(() => onEnd?.(), [onEnd])

  useEffect(() => {
    if (secondsLeft <= 0) { handleEnd(); return }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [secondsLeft, handleEnd])

  const mm   = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss   = String(secondsLeft % 60).padStart(2, '0')
  const isLow = secondsLeft <= 3 * 60

  return (
    <nav className="bg-white border-b border-ybm-border flex items-center justify-between px-4 h-14 shrink-0">

      {/* 좌측: 브레드크럼 */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <button
          onClick={handleEnd}
          className="text-ybm-text-sub hover:text-ybm-text transition-colors"
          aria-label="뒤로"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-ybm-text-sub hidden sm:inline">TOEIC RC</span>
        <span className="text-ybm-text-sub hidden sm:inline">›</span>
        <span className="text-ybm-text font-semibold truncate">{partName}</span>
      </div>

      {/* 중앙: 진행도 */}
      <div className="flex items-center gap-1 text-sm font-semibold">
        <span className="text-cr-accent">{currentProblemIndex + 1}</span>
        <span className="text-ybm-text-sub">/</span>
        <span className="text-ybm-text-sub">{totalProblems}</span>
      </div>

      {/* 우측: 타이머 + 종료 */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 타이머 */}
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ybm-text-sub">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7 4.5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className={`text-sm font-semibold tabular-nums ${isLow ? 'text-red-500' : 'text-ybm-text'}`}>
            {mm}:{ss}
          </span>
        </div>

        {/* 학습 도움말 아이콘 */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-ybm-text-sub hover:bg-ybm-bg transition-colors"
          aria-label="학습 도움말"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M6.5 6a1.5 1.5 0 013 0c0 1-1.5 1.5-1.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
          </svg>
        </button>

        {/* 수업 종료 */}
        <button
          onClick={handleEnd}
          className="h-8 px-3 rounded-lg border border-ybm-border text-ybm-text-sub text-xs font-medium hover:border-red-300 hover:text-red-500 transition-colors whitespace-nowrap"
        >
          종료
        </button>
      </div>
    </nav>
  )
}
