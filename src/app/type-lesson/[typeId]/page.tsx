'use client'

import { useParams, useRouter } from 'next/navigation'
import { getTypeLesson } from '@/data/typeLearning'
import TypeLessonPlayer from '@/components/type-lesson/TypeLessonPlayer'

/* 15문항 유형 샘플 수업 — /type-lesson/t01 ~ t15 (내 학습 탭 그리드에서 진입) */
export default function TypeLessonPage() {
  const params = useParams<{ typeId: string }>()
  const router = useRouter()
  const lesson = getTypeLesson(params.typeId)

  if (!lesson) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#F5F8FE]">
        <p className="text-sm text-gray-500">유형을 찾을 수 없어요. ({params.typeId})</p>
        <button onClick={() => router.push('/lessons')} className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold">내 학습으로</button>
      </div>
    )
  }
  return <TypeLessonPlayer lesson={lesson} />
}
