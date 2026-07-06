'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Part7AIScreen, { type Part7AIEndResult } from '@/components/part7/Part7AIScreen'
import SessionEndFlow from '@/components/session/SessionEndFlow'
import { stopCurrentAudio } from '@/lib/tts'

export default function Part7VertexPage() {
  const router   = useRouter()
  const startRef = useRef(Date.now())
  const [endData, setEndData] = useState<Part7AIEndResult | null>(null)

  if (endData) {
    return (
      <SessionEndFlow
        partKey="part7"
        partName="Part 7 · Vertex AI 테스트"
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

  return (
    <Part7AIScreen
      onEnd={(result) => { stopCurrentAudio(); setEndData(result) }}
      apiEndpoint="/api/tutor-vertex"
      engineLabel="Gemini 3.5 Flash · Vertex AI"
      footerNote={{
        title: '이 화면 구조: Vertex AI (자유생성, DB 미연동)',
        body: '학생 메시지 → /api/tutor-vertex가 페르소나 시스템 프롬프트(personaPrompts.ts, 지문·정답 하드코딩)를 참고해 Gemini가 답을 통째로 자유생성. /api/tutor(DB 레일 엔진)와는 연결 안 됨 — 음성 대화 테스트(Vertex AI 음성 대화 테스트)가 DB 연동 버전.',
      }}
    />
  )
}
