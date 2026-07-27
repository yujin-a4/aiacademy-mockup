'use client'

import { useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getTypeLesson } from '@/data/typeLearning'
import TypeLessonPlayer from '@/components/type-lesson/TypeLessonPlayer'
import { useOnboardingStore } from '@/store/onboardingStore'
import { INST_NAME } from '@/data/instructorData'
import { useDbLectureQuestions } from '@/data/db/questionStore'
import { useDbLectureSteps } from '@/data/db/lectureStepStore'
import { buildLessonFromDb } from '@/data/typeLearning/fromDb'
import { buildTurnsFromSteps } from '@/data/typeLearning/fromSteps'
import { useRailPrompts } from '@/data/typeLearning/railPrompts'

/* 유형 → DB 앵커 문항. 앵커가 속한 지문(또는 강의) 묶음이 통째로 딸려와 콘텐츠·레일이 된다.
   D1(FGI 5강) 범위만 연결 — 나머지 유형은 로컬 샘플 데이터 그대로 돈다. */
const DB_ANCHOR: Record<string, string> = {
  t01: 'LC-P1-01-Q001',  // 사진 묘사
  t07: 'RC-P5-08-Q001',  // 단문 빈칸 (능동태·수동태)
  t08: 'RC-P6-01-Q001',  // 장문 빈칸 (Rosen Hotel 광고)
  t09: 'RC-P7-03-Q001',  // 1지문 독해 (Medina 광고)
}

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

  /* DB(실제 교재 문항)로 콘텐츠·레일을 채운다 — 화면과 강사 발화가 어긋나지 않게.
     DB 실패·미지원 유형이면 로컬 lesson 폴백. (Phase 3-3 콘텐츠 이식) */
  /* 강의 단위로 통째로 받는다 — 실전 문항(P00x)이 수업과 다른 지문에 있어서(P7) 지문 단위로는 안 딸려온다. */
  const anchor = DB_ANCHOR[params.typeId] ?? ''
  const lectureCode = anchor.replace(/-[QP]\d+$/, '')
  const effectiveLesson = useDbLectureQuestions(
    lectureCode,
    (rows) => (lesson ? buildLessonFromDb(lesson, rows, anchor) : lesson),
    lesson,
  )

  const override = search.get('instructor')
  const instructor =
    (override && INST_NAME[override] ? override : null) ??
    (selected && INST_NAME[selected] ? selected : null) ??
    'lee_doyun'

  /* 스캐폴딩 레일(턴 순서·상호작용)도 DB에서 가져온다 — 정본은 시트, 넣는 건 import-instructor-rails.
     콘텐츠팀이 시트에서 레일을 고치면 코드를 안 고쳐도 화면이 그대로 바뀌게 하는 게 목적. */
  const { steps: dbSteps, source: railSource } = useDbLectureSteps(lectureCode, instructor)
  const { lesson: playedLesson, rail } = useMemo(() => {
    /* DB 콘텐츠로 갈아끼워진 강의에만 DB 레일을 얹는다.
       (로컬 샘플 콘텐츠에 실제 강의 레일을 씌우면 발화와 화면이 어긋난다) */
    const dbBacked = !!effectiveLesson && effectiveLesson !== lesson
    if (!effectiveLesson || !dbBacked) return { lesson: effectiveLesson, rail: undefined }

    const { turns, diags } = buildTurnsFromSteps(dbSteps, effectiveLesson.content, !!effectiveLesson.practice)
    if (!turns.length) return { lesson: effectiveLesson, rail: undefined }  // 레일 없음/못 씀 → 기존 코드 레일 유지
    const origin = railSource === 'composition' ? '부품 조합(rail_compositions)' : '강의별 원본(lecture_steps)'
    return {
      lesson: { ...effectiveLesson, turns },
      rail: { diags, source: `${lectureCode} · ${INST_NAME[instructor] ?? instructor} · ${origin} · ${turns.length}턴` },
    }
  }, [effectiveLesson, lesson, dbSteps, railSource, lectureCode, instructor])

  /* 학생 문구는 부품에 박아두지 않고 매번 만든다 — 강의가 늘어도 부품은 그대로.
     생성 전·실패 시엔 원본(부품 기본값/이식 문구)이 그대로 남아 화면이 비지 않는다. */
  const promptState = useRailPrompts(
    playedLesson?.turns ?? [], dbSteps, playedLesson?.content ?? null,
    playedLesson?.part ?? 0, !!rail,
  )
  const finalLesson = playedLesson && rail
    ? { ...playedLesson, turns: promptState.turns }
    : playedLesson
  const finalRail = rail && { ...rail, generated: promptState.generated, status: promptState.status }

  if (!finalLesson) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#F5F8FE]">
        <p className="text-sm text-gray-500">유형을 찾을 수 없어요. ({params.typeId})</p>
        <button onClick={() => router.push('/lessons')} className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold">내 학습으로</button>
      </div>
    )
  }
  return <TypeLessonPlayer lesson={finalLesson} instructor={instructor} rail={finalRail} />
}
