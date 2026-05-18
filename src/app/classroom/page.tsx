'use client'

import { useLessonStore } from '@/store/lessonStore'
import LessonRouter from '@/components/lesson/LessonRouter'

export default function ClassroomPage() {
  const reset = useLessonStore((s) => s.reset)

  const handleEnd = () => {
    reset()
    window.history.back()
  }

  return <LessonRouter onEnd={handleEnd} />
}
