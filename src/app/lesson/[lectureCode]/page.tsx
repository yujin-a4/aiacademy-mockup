'use client'

import { useRouter, useParams } from 'next/navigation'
import DbLessonScreen from '@/components/lesson/DbLessonScreen'
import { stopCurrentAudio } from '@/lib/tts'

// DB 기반 유형학습 수업 — /lesson/RC-P5-07 형식. 강의·문항·레일 전부 Supabase에서 옴.
export default function DbLessonPage() {
  const router = useRouter()
  const params = useParams<{ lectureCode: string }>()
  const lectureCode = decodeURIComponent(params.lectureCode)

  return (
    <DbLessonScreen
      lectureCode={lectureCode}
      onEnd={() => { stopCurrentAudio(); router.push('/lessons') }}
    />
  )
}
