'use client'

/* 커리큘럼 강의 단위 플레이어 — /lecture/[code] (예: /lecture/RC-P5-03).
   내 학습(커리큘럼 리스트)에서 강의 카드를 누르면 여기로 온다.
   기존 유형학습 플레이어(TypeLessonPlayer)를 강의코드 기준으로 재사용한다:
   강의의 파트에 맞는 로컬 TypeLesson을 형판(shape)으로 쓰고, 앵커=<code>-Q001 로
   buildLessonFromDb가 DB 문항·보기·근거·레일·실전세트까지 통째로 채운다.
   ※ 15유형(t01~t15)은 문항 렌더러 프리셋이고, 실제 학습 단위는 커리큘럼 강의다. */

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getTypeLesson } from '@/data/typeLearning'
import TypeLessonPlayer from '@/components/type-lesson/TypeLessonPlayer'
import { useOnboardingStore } from '@/store/onboardingStore'
import { INST_NAME } from '@/data/instructorData'
import { useDbLectureQuestions } from '@/data/db/questionStore'
import { buildLessonFromDb } from '@/data/typeLearning/fromDb'

/* 파트 → 형판으로 쓸 로컬 유형(같은 파트여야 buildLessonFromDb가 동작).
   지원 파트: 1(사진)·5(단문 빈칸)·6(장문 빈칸)·7(1지문 독해). LC 듣기(2/3/4)는 아직 UI 미지원. */
const TEMPLATE_BY_PART: Record<number, string> = { 1: 't01', 5: 't07', 6: 't08', 7: 't09' }

export default function LecturePage() {
  const params = useParams<{ code: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const selected = useOnboardingStore((s) => s.selectedInstructor)

  const code = (params.code || '').toUpperCase()
  const part = Number((code.match(/P(\d)/) || [])[1] || 0)
  const templateId = TEMPLATE_BY_PART[part]
  const local = templateId ? getTypeLesson(templateId) : undefined
  const anchor = `${code}-Q001`

  const effectiveLesson = useDbLectureQuestions(
    local ? code : '',
    (rows) => (local ? buildLessonFromDb(local, rows, anchor) : local),
    local,
  )

  const override = search.get('instructor')
  const instructor =
    (override && INST_NAME[override] ? override : null) ??
    (selected && INST_NAME[selected] ? selected : null) ??
    'lee_doyun'

  if (!local || !effectiveLesson) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#F5F8FE]">
        <p className="text-sm text-gray-500">
          {part >= 2 && part <= 4
            ? `이 강의(${code})는 듣기 유형이라 아직 화면이 준비 중이에요.`
            : `강의를 찾을 수 없어요. (${code})`}
        </p>
        <button onClick={() => router.push('/lessons')} className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold">내 학습으로</button>
      </div>
    )
  }
  return <TypeLessonPlayer lesson={effectiveLesson} instructor={instructor} />
}
