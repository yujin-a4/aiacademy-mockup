'use client'

/* Part 7 장문 독해 수업 (신규 분할형 파일럿) — /part7-reading */

import { useRouter } from 'next/navigation'
import Part7ReadingScreen from '@/components/part7/Part7ReadingScreen'
import { stopCurrentAudio } from '@/lib/tts'

export default function Part7ReadingPage() {
  const router = useRouter()
  return <Part7ReadingScreen onEnd={() => { stopCurrentAudio(); router.push('/lessons') }} />
}
