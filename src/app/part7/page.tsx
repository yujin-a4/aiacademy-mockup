'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Part7Screen, { type Part7EndResult } from '@/components/part7/Part7Screen'
import SessionEndFlow from '@/components/session/SessionEndFlow'

export default function Part7Page() {
  const router   = useRouter()
  const startRef = useRef(Date.now())
  const [endData, setEndData] = useState<Part7EndResult | null>(null)

  if (endData) {
    return (
      <SessionEndFlow
        partKey="part7"
        partName="Part 7 · 장문 독해"
        elapsedSeconds={Math.floor((Date.now() - startRef.current) / 1000)}
        correctCount={endData.correct}
        totalCount={endData.total}
        results={endData.results}
        onNextLesson={() => router.push('/speaking')}
        onReport={() => router.push('/status')}
        onHome={() => router.push('/lessons')}
      />
    )
  }

  return <Part7Screen onEnd={(result) => setEndData(result)} />
}
