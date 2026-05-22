'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Part7AIScreen, { type Part7AIEndResult } from '@/components/part7/Part7AIScreen'
import SessionEndFlow from '@/components/session/SessionEndFlow'

export default function Part7AIPage() {
  const router   = useRouter()
  const startRef = useRef(Date.now())
  const [endData, setEndData] = useState<Part7AIEndResult | null>(null)

  if (endData) {
    return (
      <SessionEndFlow
        partKey="part7"
        partName="Part 7 · AI 튜터와 독해"
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

  return <Part7AIScreen onEnd={(result) => setEndData(result)} />
}
