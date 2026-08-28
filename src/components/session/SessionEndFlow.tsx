'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import StepOpening from './steps/StepOpening'
import StepAccuracy from './steps/StepAccuracy'
import StepBadge from './steps/StepBadge'
import StepAction from './steps/StepAction'
import { computeBadges } from '@/lib/sessionBadges'
import { getTotalCompletions, saveSession } from '@/lib/sessionHistory'
import type { PartKey } from '@/lib/sessionHistory'
import { stopCurrentAudio } from '@/lib/tts'

export interface SessionEndFlowProps {
  partKey: PartKey
  partName: string
  elapsedSeconds: number
  correctCount: number
  totalCount: number
  results?: boolean[]
  /** 세션 정리(핵심 문장 채우기) 결과 — 넘기면 정리 성취 배지가 붙는다 */
  recap?: { correct: number; total: number }
  onNextLesson?: () => void
  onReport?: () => void
  onHome: () => void
  /** 마지막 화면 버튼 문구 — 기본은 '다음 강의 가기' / '홈으로' */
  nextLessonLabel?: string
  homeLabel?: string
  /** 마지막 화면 안내 문구 — 오늘 분량이 남았는지에 따라 달라진다 */
  actionTitle?: string
  actionSubtitle?: string
  /** 오늘 강사가 짚어 준 표현 — 마지막 화면에 모아 보여준다 (구현 중 메모 73행) */
  expressions?: { en: string; ko: string }[]
}

export default function SessionEndFlow({
  partKey,
  partName,
  elapsedSeconds,
  correctCount,
  totalCount,
  results = [],
  recap,
  onNextLesson,
  onReport,
  onHome,
  nextLessonLabel,
  homeLabel,
  actionTitle,
  actionSubtitle,
  expressions,
}: SessionEndFlowProps) {
  // localStorage는 렌더 시점에 읽어서 저장 전 값을 얻는다('첫 완주' 판정이 이번 회차에 오염되면 안 된다)
  const totalCompletions = getTotalCompletions(partKey)
  const isFirstTime = totalCompletions === 0
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100

  /* 완료 화면 피드백 — 배지(수집)가 아니라 그 자리에서 보여주고 끝나는 문구.
     하나도 없을 수 있다(잘한 게 없으면 말하지 않는다) — 그때는 이 스텝을 그냥 건너뛴다. */
  const badges = computeBadges({ correctCount, totalCount, isFirstTime, recap }, results)

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

  badges.forEach((badge, i) => {
    steps.push(
      <StepBadge key={`feedback-${badge.id}`} badge={badge} badgeIndex={i + 1} totalBadges={badges.length} onNext={next} />,
    )
  })

  /* 지난 점수 대비 막대그래프(StepGrowth)는 뺐다 — MVP 완료 화면은 "오늘 무엇을 해냈나"만
     말한다. 회차 간 점수 비교는 리포트가 할 일이고, 여기서 보여주면 잘한 날에도 그래프가
     내려가 있으면 김이 샌다. */

  steps.push(
    <StepAction key="action" onNextLesson={onNextLesson} onReport={onReport} onHome={onHome}
      nextLessonLabel={nextLessonLabel} homeLabel={homeLabel} title={actionTitle} subtitle={actionSubtitle}
      expressions={expressions} />,
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
