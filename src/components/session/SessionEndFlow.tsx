'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import StepOpening from './steps/StepOpening'
import StepAccuracy from './steps/StepAccuracy'
import StepBadge from './steps/StepBadge'
import StepGrowth from './steps/StepGrowth'
import StepAction from './steps/StepAction'
import { computeBadges } from '@/lib/sessionBadges'
import { getPreviousScore, getTotalCompletions, saveSession } from '@/lib/sessionHistory'
import type { PartKey } from '@/lib/sessionHistory'
import { stopCurrentAudio } from '@/lib/tts'

export interface SessionEndFlowProps {
  partKey: PartKey
  partName: string
  elapsedSeconds: number
  correctCount: number
  totalCount: number
  results?: boolean[]
  onNextLesson?: () => void
  onReport?: () => void
  onHome: () => void
}

export default function SessionEndFlow({
  partKey,
  partName,
  elapsedSeconds,
  correctCount,
  totalCount,
  results = [],
  onNextLesson,
  onReport,
  onHome,
}: SessionEndFlowProps) {
  // localStorage는 렌더 시점에 읽어서 저장 전 이전 값을 얻음
  const previousScore = getPreviousScore(partKey)
  const totalCompletions = getTotalCompletions(partKey)
  const isFirstTime = totalCompletions === 0
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100

  const badges = computeBadges(
    { correctCount, totalCount, elapsedSeconds, previousScore, isFirstTime },
    results,
  )

  // 진입 즉시 TTS 정지 (이전 화면 오디오 잔류 방지)
  useEffect(() => { stopCurrentAudio() }, [])

  // 세션 결과를 딱 한 번 저장
  const savedRef = useRef(false)
  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    saveSession(partKey, score)
  }, [partKey, score])

  const [step, setStep] = useState(0)
  const next = useCallback(() => setStep((s) => s + 1), [])

  // 스텝 배열 구성
  const steps: React.ReactElement[] = []

  steps.push(
    <StepOpening key="opening" partName={partName} elapsedSeconds={elapsedSeconds} onNext={next} />,
  )

  if (totalCount > 0) {
    steps.push(
      <StepAccuracy key="accuracy" correctCount={correctCount} totalCount={totalCount} results={results} onNext={next} />,
    )
  }

  badges.forEach((badge) => {
    steps.push(
      <StepBadge key={`badge-${badge.id}`} badge={badge} badgeIndex={badges.indexOf(badge) + 1} totalBadges={badges.length} onNext={next} />,
    )
  })

  steps.push(
    <StepGrowth key="growth" score={score} previousScore={previousScore} totalCompletions={totalCompletions} onNext={next} />,
  )

  steps.push(
    <StepAction key="action" onNextLesson={onNextLesson} onReport={onReport} onHome={onHome} />,
  )

  const currentStep = Math.min(step, steps.length - 1)

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">

      {/* 진행 도트 */}
      <div className="flex justify-center gap-1.5 pt-12 pb-2 shrink-0">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-400 ${
              i === currentStep
                ? 'w-5 bg-slate-800'
                : i < currentStep
                ? 'w-2 bg-slate-300'
                : 'w-2 bg-slate-100'
            }`}
          />
        ))}
      </div>

      {/* 현재 스텝 */}
      <div className="flex-1 flex flex-col min-h-0">
        {steps[currentStep]}
      </div>
    </div>
  )
}
