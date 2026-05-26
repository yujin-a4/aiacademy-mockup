'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SpeakingRouter from '@/components/speaking/SpeakingRouter'
import SessionEndFlow from '@/components/session/SessionEndFlow'
import { stopCurrentAudio } from '@/lib/tts'

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
        onNextLesson={() => { stopCurrentAudio(); router.push('/part6') }}
        onReport={() => { stopCurrentAudio(); router.push('/status') }}
        onHome={() => { stopCurrentAudio(); router.push('/lessons') }}
      />
    )
  }

  return <SpeakingRouter onEnd={() => { stopCurrentAudio(); setShowEnd(true) }} />
}
