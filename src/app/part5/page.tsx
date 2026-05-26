'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLessonStore } from '@/store/lessonStore'
import LessonRouter from '@/components/lesson/LessonRouter'
import SessionEndFlow from '@/components/session/SessionEndFlow'
import { stopCurrentAudio } from '@/lib/tts'

export default function Part5Page() {
  const router          = useRouter()
  const reset           = useLessonStore((s) => s.reset)
  const practiceResults = useLessonStore((s) => s.practiceResults)

  const [showEnd, setShowEnd] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => { reset() }, [reset])

  const handleEnd = () => {
    stopCurrentAudio()
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    setShowEnd(true)
  }

  if (showEnd) {
    const boolResults  = practiceResults.filter((r): r is boolean => r !== null)
    const correctCount = boolResults.filter(Boolean).length
    return (
      <SessionEndFlow
        partKey="part5"
        partName="Part 5 · 수동태 심화"
        elapsedSeconds={elapsed}
        correctCount={correctCount}
        totalCount={boolResults.length}
        results={boolResults}
        onNextLesson={() => { stopCurrentAudio(); reset(); router.push('/part7') }}
        onReport={() => { stopCurrentAudio(); router.push('/status') }}
        onHome={() => { stopCurrentAudio(); reset(); router.push('/lessons') }}
      />
    )
  }

  return <LessonRouter onEnd={handleEnd} />
}
