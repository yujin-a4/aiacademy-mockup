'use client'

/* Part 5 도입(intro) — 공용 LessonIntro 디자인 사용. TTS 발화 유지. */

import { useEffect, useRef } from 'react'
import LessonIntro from './LessonIntro'
import { speakTTS, stopCurrentAudio } from '@/lib/tts'
import { buildTurns } from '@/data/lessonScenario'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'

interface Screen0Props {
  onComplete: () => void
  onEnd?: () => void
}

const PART5_INTRO_POINTS = [
  { text: '목적어 유무로 능동태·수동태 판별하기' },
  { text: 'be동사 + 과거분사(p.p.) 기본 형태' },
  { text: '수동태 불가 자동사는 먼저 제외하기' },
]

export default function Screen0({ onComplete, onEnd }: Screen0Props) {
  const persona = useClassroomStore((s) => s.persona)
  const userName = useOnboardingStore((s) => s.userName) || '민주'
  const turn = buildTurns(userName).s0_intro
  const playedRef = useRef(false)

  useEffect(() => {
    if (playedRef.current) return
    playedRef.current = true
    void speakTTS(turn.script, persona)
    return () => stopCurrentAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <LessonIntro
      tag="Part 5 수동태"
      script={turn.script}
      points={PART5_INTRO_POINTS}
      onStart={() => { stopCurrentAudio(); onComplete() }}
      onEnd={onEnd ?? (() => window.history.back())}
    />
  )
}
