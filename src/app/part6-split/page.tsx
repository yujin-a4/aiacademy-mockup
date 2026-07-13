'use client'

/* Part 6 장문 공란 수업 — 분할 레이아웃 변형 (지문 좌 / 문제 우 + 강사 모달) — /part6-split */

import { useRouter } from 'next/navigation'
import Part6ReadingScreen from '@/components/part6/Part6ReadingScreen'
import { stopCurrentAudio } from '@/lib/tts'

export default function Part6SplitPage() {
  const router = useRouter()
  return <Part6ReadingScreen variant="split" onEnd={() => { stopCurrentAudio(); router.push('/lessons') }} />
}
