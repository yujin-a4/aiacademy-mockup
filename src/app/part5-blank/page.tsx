'use client'

/* Part 5 단문 공란 수업 (신규 포맷) — /part5-blank */

import { useRouter } from 'next/navigation'
import Part5BlankScreen from '@/components/part5/Part5BlankScreen'
import { stopCurrentAudio } from '@/lib/tts'

export default function Part5BlankPage() {
  const router = useRouter()
  return <Part5BlankScreen onEnd={() => { stopCurrentAudio(); router.push('/lessons') }} />
}
