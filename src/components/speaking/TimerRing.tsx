'use client'

import { useEffect, useState } from 'react'

interface TimerRingProps {
  seconds: number
  running: boolean
  onEnd?: () => void
  size?: number
}

export default function TimerRing({ seconds, running, onEnd, size = 72 }: TimerRingProps) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => { setRemaining(seconds) }, [seconds])

  useEffect(() => {
    if (!running) return
    if (remaining <= 0) { onEnd?.(); return }
    const id = setTimeout(() => setRemaining((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [running, remaining, onEnd])

  const strokeW   = Math.max(4, Math.round(size / 13))
  const r         = (size / 2) - strokeW - 2
  const circ      = 2 * Math.PI * r
  const progress  = remaining / seconds
  const dash      = circ * progress
  const isLow     = remaining <= 5
  const strokeClr = isLow ? '#ef4444' : '#2277F0'

  const labelPx = Math.round(size * 0.145)
  const timePx  = Math.round(size * 0.24)

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8F0FE" strokeWidth={strokeW} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={strokeClr}
          strokeWidth={strokeW}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear' }}
        />
      </svg>
      <div className="flex flex-col items-center leading-none z-10 gap-0.5">
        <span style={{ fontSize: labelPx }} className="font-medium text-ybm-text-sub">남은 시간</span>
        <span style={{ fontSize: timePx }} className={`font-bold tabular-nums ${isLow ? 'text-red-500' : 'text-[#2277F0]'}`}>
          {mins}:{secs}
        </span>
      </div>
    </div>
  )
}
