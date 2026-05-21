'use client'

import { useEffect, useState } from 'react'

interface Props {
  score: number
  previousScore: number | null
  totalCompletions: number
  onNext: () => void
}

export default function StepGrowth({ score, previousScore, totalCompletions, onNext }: Props) {
  const [showNewBar, setShowNewBar] = useState(false)
  const [showDelta, setShowDelta] = useState(false)
  const [displayedCount, setDisplayedCount] = useState(totalCompletions)

  const delta = previousScore !== null ? score - previousScore : null
  const isFirst = previousScore === null

  useEffect(() => {
    const t1 = setTimeout(() => setShowNewBar(true), isFirst ? 300 : 900)
    const t2 = setTimeout(() => setShowDelta(true), isFirst ? 900 : 1600)
    const t3 = setTimeout(() => setDisplayedCount(totalCompletions + 1), 1200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [isFirst, totalCompletions])

  useEffect(() => {
    const id = setTimeout(onNext, 3600)
    return () => clearTimeout(id)
  }, [onNext])

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-8 px-8 cursor-pointer select-none"
      onClick={onNext}
    >
      <p className="text-slate-400 text-sm animate-fade-in-up">내 TOEIC RC 실력</p>

      <div className="w-full max-w-xs flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

        {/* 이전 점수 바 */}
        {previousScore !== null && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs w-8 text-right shrink-0">이전</span>
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-300 transition-all duration-1000 ease-out"
                style={{ width: `${previousScore}%` }}
              />
            </div>
            <span className="text-slate-400 text-xs w-10 shrink-0 tabular-nums">{previousScore}점</span>
          </div>
        )}

        {/* 오늘 점수 바 */}
        <div className="flex items-center gap-3">
          <span className="text-slate-800 font-bold text-xs w-8 text-right shrink-0">오늘</span>
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-1000 ease-out"
              style={{
                width: showNewBar ? `${score}%` : '0%',
                transitionDelay: '0.15s',
              }}
            />
          </div>
          <span className="text-indigo-600 font-bold text-xs w-10 shrink-0 tabular-nums">{score}점</span>
        </div>
      </div>

      {/* 델타 or 첫 완주 메시지 */}
      {showDelta && (
        <div className="animate-pop-badge text-center">
          {isFirst ? (
            <>
              <p className="text-3xl font-black text-amber-500">🌟 첫 기록 달성!</p>
              <p className="text-slate-400 text-sm mt-1">앞으로 계속 성장해봐요</p>
            </>
          ) : delta !== null && (
            <>
              <p className={`text-4xl font-black ${delta >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                {delta >= 0 ? '+' : ''}{delta}점
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {delta > 0 ? '지난번보다 올랐어요!' : delta === 0 ? '지난번과 동일해요' : '다음엔 더 잘할 수 있어요'}
              </p>
            </>
          )}
        </div>
      )}

      {/* 누적 완료 횟수 */}
      <div className="text-center animate-fade-in-up" style={{ animationDelay: '1.4s' }}>
        <div className="inline-flex items-baseline gap-1 px-5 py-2.5 bg-slate-50 rounded-2xl">
          <span className="text-slate-400 text-xs">누적 수업 완료</span>
          <span className="text-slate-900 font-black text-2xl tabular-nums transition-all duration-500 mx-1">{displayedCount}</span>
          <span className="text-slate-400 text-xs">회</span>
        </div>
      </div>

      <p className="text-slate-300 text-xs mt-4 animate-fade-in-up" style={{ animationDelay: '1.8s' }}>
        화면을 탭하면 건너뜁니다
      </p>
    </div>
  )
}
