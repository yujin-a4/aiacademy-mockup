'use client'

/* Part 6 장문 공란 수업 — /part6-reading */

import { useRouter } from 'next/navigation'
import Part6ReadingScreen from '@/components/part6/Part6ReadingScreen'
import { stopCurrentAudio } from '@/lib/tts'

export default function Part6ReadingPage() {
  const router = useRouter()
  return <Part6ReadingScreen onEnd={() => { stopCurrentAudio(); router.push('/lessons') }} />
}
