'use client'

/* 리스닝(Part 1~4) 수업 라우트 — /lc/1 ~ /lc/4 */

import { useRouter, useParams } from 'next/navigation'
import ListeningScreen from '@/components/lc/ListeningScreen'
import { LC_PARTS } from '@/data/lcData'
import { stopCurrentAudio } from '@/lib/tts'

export default function LCPage() {
  const router = useRouter()
  const params = useParams()
  const no = Number(params.no)
  const part = LC_PARTS[no]

  if (!part) {
    return (
      <div className="h-dvh flex items-center justify-center text-gray-400 text-sm">준비 중인 파트예요.</div>
    )
  }
  return <ListeningScreen part={part} onEnd={() => { stopCurrentAudio(); router.push('/lessons') }} />
}
