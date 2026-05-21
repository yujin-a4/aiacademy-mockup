'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Part6Screen, { type Part6EndResult } from '@/components/part6/Part6Screen'
import SessionEndFlow from '@/components/session/SessionEndFlow'

export default function Part6Page() {
  const router   = useRouter()
  const startRef = useRef(Date.now())
  const [endData, setEndData] = useState<Part6EndResult | null>(null)

  if (endData) {
    return (
      <SessionEndFlow
        partKey="part6"
        partName="Part 6 · 장문 빈칸 채우기"
        elapsedSeconds={Math.floor((Date.now() - startRef.current) / 1000)}
        correctCount={endData.correct}
        totalCount={endData.total}
        results={endData.results}
        onNextLesson={() => router.push('/part5')}
        onReport={() => router.push('/status')}
        onHome={() => router.push('/lessons')}
      />
    )
  }

  return <Part6Screen onEnd={(result) => setEndData(result)} />
}
