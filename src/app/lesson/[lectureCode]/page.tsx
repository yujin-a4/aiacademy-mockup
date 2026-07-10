'use client'

import { useRouter, useParams, useSearchParams } from 'next/navigation'
import DbLessonScreen from '@/components/lesson/DbLessonScreen'
import { useOnboardingStore } from '@/store/onboardingStore'
import { stopCurrentAudio } from '@/lib/tts'

// DB 기반 유형학습 수업 — /lesson/RC-P5-07 형식. 강의·문항·레일 전부 Supabase에서 옴.
// 강사: 온보딩에서 고른 강사(selectedInstructor)를 그대로 쓴다. ?instructor= 쿼리로 오버라이드 가능(테스트용).
export default function DbLessonPage() {
  const router = useRouter()
  const params = useParams<{ lectureCode: string }>()
  const lectureCode = decodeURIComponent(params.lectureCode)
  const selectedInstructor = useOnboardingStore((s) => s.selectedInstructor)
  const instructor = useSearchParams().get('instructor') ?? selectedInstructor ?? undefined

  return (
    <DbLessonScreen
      lectureCode={lectureCode}
      instructor={instructor}
      onEnd={() => { stopCurrentAudio(); router.push('/lessons') }}
    />
  )
}
