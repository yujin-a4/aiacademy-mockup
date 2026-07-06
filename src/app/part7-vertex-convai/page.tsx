'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Part7ConvAIScreen, { type Part7ConvAIEndResult } from '@/components/part7/Part7ConvAIScreen'
import SessionEndFlow from '@/components/session/SessionEndFlow'
import { stopCurrentAudio } from '@/lib/tts'

export default function Part7VertexConvAIPage() {
  const router   = useRouter()
  const startRef = useRef(Date.now())
  const [endData, setEndData] = useState<Part7ConvAIEndResult | null>(null)

  if (endData) {
    return (
      <SessionEndFlow
        partKey="part7"
        partName="Part 7 · 장문 독해 (Vertex AI 음성 대화)"
        elapsedSeconds={Math.floor((Date.now() - startRef.current) / 1000)}
        correctCount={endData.correct}
        totalCount={endData.total}
        results={endData.results}
        onNextLesson={() => { stopCurrentAudio(); router.push('/speaking') }}
        onReport={() => { stopCurrentAudio(); router.push('/status') }}
        onHome={() => { stopCurrentAudio(); router.push('/lessons') }}
      />
    )
  }

  return <Part7ConvAIScreen engine="vertex" onEnd={(result) => { stopCurrentAudio(); setEndData(result) }} />
}
