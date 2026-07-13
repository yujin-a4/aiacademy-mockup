'use client'

/* Part 7 장문 독해 수업 — 분할 레이아웃 변형 (지문 좌 / 문제 우 + 강사 모달) — /part7-split */

import { useRouter } from 'next/navigation'
import Part7ReadingScreen from '@/components/part7/Part7ReadingScreen'
import { stopCurrentAudio } from '@/lib/tts'

export default function Part7SplitPage() {
  const router = useRouter()
  return <Part7ReadingScreen variant="split" onEnd={() => { stopCurrentAudio(); router.push('/lessons') }} />
}
