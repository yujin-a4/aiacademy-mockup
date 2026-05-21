'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SpeakingRouter from '@/components/speaking/SpeakingRouter'
import SessionEndFlow from '@/components/session/SessionEndFlow'

export default function SpeakingPage() {
  const router   = useRouter()
  const startRef = useRef(Date.now())
  const [showEnd, setShowEnd] = useState(false)

  if (showEnd) {
    return (
      <SessionEndFlow
        partKey="speaking"
        partName="Speaking · 영어 말하기"
        elapsedSeconds={Math.floor((Date.now() - startRef.current) / 1000)}
        correctCount={0}
        totalCount={0}
        onNextLesson={() => router.push('/part6')}
        onReport={() => router.push('/status')}
        onHome={() => router.push('/lessons')}
      />
    )
  }

  return <SpeakingRouter onEnd={() => setShowEnd(true)} />
}
