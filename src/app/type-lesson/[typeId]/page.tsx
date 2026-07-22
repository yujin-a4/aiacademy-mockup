'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getTypeLesson } from '@/data/typeLearning'
import TypeLessonPlayer from '@/components/type-lesson/TypeLessonPlayer'
import { useOnboardingStore } from '@/store/onboardingStore'
import { INST_NAME } from '@/data/instructorData'
import { useDbQuestions, useStableCodes } from '@/data/db/questionStore'
import { buildPart1LessonFromDb } from '@/data/typeLearning/fromDb'

/* 15문항 유형 샘플 수업 — /type-lesson/t01 ~ t15 (내 학습 탭 그리드에서 진입)
   강사: 온보딩에서 고른 강사를 그대로 따른다. ?instructor=lee_doyun 으로 덮어쓸 수 있다(테스트용).
   ※ 스캐폴딩 레일(turns)은 아직 이도윤 ver 한 벌뿐이라, 다른 강사를 골라도 짚는 순서는 같고
     목소리·얼굴·화법만 그 강사가 된다. 강사별 레일이 채워지면 이 폴백을 걷어내면 된다. */
export default function TypeLessonPage() {
  const params = useParams<{ typeId: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const selected = useOnboardingStore((s) => s.selectedInstructor)
  const lesson = getTypeLesson(params.typeId)

  /* Part1은 DB(실제 교재 문항)로 콘텐츠·레일을 채운다 — 사진과 강사 발화가 어긋나지 않게.
     DB 실패 시 로컬 lesson 폴백. (Phase 3-3 콘텐츠 이식, Part1 우선) */
  const codes = useStableCodes(lesson?.part === 1 ? [`${lesson.railCode}-Q001`] : [])
  const effectiveLesson = useDbQuestions(
    codes,
    (rows) => (lesson ? buildPart1LessonFromDb(lesson, rows) : lesson),
    lesson,
  )

  const override = search.get('instructor')
  const instructor =
    (override && INST_NAME[override] ? override : null) ??
    (selected && INST_NAME[selected] ? selected : null) ??
    'lee_doyun'

  if (!effectiveLesson) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#F5F8FE]">
        <p className="text-sm text-gray-500">유형을 찾을 수 없어요. ({params.typeId})</p>
        <button onClick={() => router.push('/lessons')} className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold">내 학습으로</button>
      </div>
    )
  }
  return <TypeLessonPlayer lesson={effectiveLesson} instructor={instructor} />
}
