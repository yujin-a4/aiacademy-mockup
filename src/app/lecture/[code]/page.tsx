'use client'

/* 커리큘럼 강의 단위 플레이어 — /lecture/[code] (예: /lecture/RC-P5-03).
   내 학습(커리큘럼 리스트)에서 강의 카드를 누르면 여기로 온다. **정본 진입점이다.**

   STEP 4 이전에는 이 화면이
     (1) 강의의 앵커 문항(-Q001) 하나만 잡고 레일을 한 바퀴만 돌렸고 — 사진 3장짜리 강의가 1장만 수업됨
     (2) **DB 레일을 아예 안 읽었다** — /type-lesson 만 읽고 있었다.
         그래서 콘텐츠팀이 시트에서 레일을 고쳐도 정본 화면에는 안 닿았다.
   지금은 v_lecture_program(아이템 × 레일)을 읽어 아이템마다 한 바퀴씩 돌린다.

   ※ 15유형(t01~t15)은 문항 렌더러 프리셋이고, 실제 학습 단위는 커리큘럼 강의다. */

import { useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getTypeLesson } from '@/data/typeLearning'
import TypeLessonPlayer from '@/components/type-lesson/TypeLessonPlayer'
import { useOnboardingStore } from '@/store/onboardingStore'
import { INST_NAME } from '@/data/instructorData'
import { useDbLectureQuestions } from '@/data/db/questionStore'
import { useLectureProgram } from '@/data/db/lectureProgramStore'
import { buildLessonFromDb } from '@/data/typeLearning/fromDb'
import { buildLessonFromItems } from '@/data/typeLearning/fromItems'
import { useRailPrompts } from '@/data/typeLearning/railPrompts'

/* 파트 → 형판으로 쓸 로컬 유형(같은 파트여야 buildLessonFromDb가 동작).
   FGI에서 LC도 시연하기로 해서(2026-07-28, D7) 듣기 2·3·4도 붙였다.
   형판은 제목·세션정리 폴백에만 쓰고, 스크립트·표·보기·레일은 전부 DB에서 온다. */
const TEMPLATE_BY_PART: Record<number, string> = {
  1: 't01',   // 사진 묘사
  2: 't02',   // 질의응답
  3: 't03',   // 짧은 대화
  4: 't05',   // 짧은 담화
  5: 't07',   // 단문 빈칸
  6: 't08',   // 장문 빈칸
  7: 't09',   // 1지문 독해
}

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

  const override = search.get('instructor')
  const instructor =
    (override && INST_NAME[override] ? override : null) ??
    (selected && INST_NAME[selected] ? selected : null) ??
    'lee_doyun'

  /* ?rail=<draft_id> — 레일 편집기 드래프트 미리보기 (docs/rail-editor-plan.md STEP 2).
     **강사 축과 레일 축을 분리해서 받는다.** 드래프트를 instructor 자리에 넣으면
     tutorAgentFor()가 매칭에 실패해 기본 에이전트로 조용히 떨어지고(instructorData.ts:76),
     레일을 평가하러 열었는데 강사 목소리가 다른 사람이 된다.
       /lecture/LC-P1-01?instructor=lee_doyun&rail=kim-0729
     ↑ 목소리·얼굴은 instructor 가, 단계 순서는 rail 이 정한다. */
  /* ?sandbox=1 — 실험장 스키마로 돌린다 (docs/rail-editor-plan.md).
     ?rail=<id> 는 옛 드래프트 방식. 둘 다 "정본 대신 다른 레일로 돈다" 는 같은 뜻이라
     아래 한 값으로 합쳐서 넘긴다. */
  const draftId = search.get('sandbox') === '1' ? 'sandbox' : search.get('rail')

  /* 문항(재료)과 진행표(아이템 × 레일)를 따로 읽어 여기서 합친다.
     문항은 드래프트에서도 **정본을 그대로** 읽는다 — 드래프트가 바꾸는 것은 레일뿐이다. */
  const rows = useDbLectureQuestions(local ? code : '', (r) => r, [])
  const program = useLectureProgram(local ? code : '', instructor, draftId)

  const { lesson: builtLesson, rail } = useMemo(() => {
    if (!local) return { lesson: undefined, rail: undefined }
    if (!rows.length) return { lesson: local, rail: undefined }

    /* 진행표가 있으면 아이템 순회, 없으면 예전 방식(앵커 1문항)으로 폴백 */
    if (!program.items.length) {
      return { lesson: buildLessonFromDb(local, rows, anchor), rail: undefined }
    }
    const { lesson, diags, railFromDb } = buildLessonFromItems(local, rows, program.items)
    if (!railFromDb) return { lesson, rail: undefined }   // 코드 생성 레일로 돈 것 — 검토할 게 없다

    const origin = program.source === 'composition' ? '변종 조합' : '강의별 원본'
    return {
      lesson,
      rail: {
        diags,
        source: `${code} · ${INST_NAME[program.instructorCode ?? instructor] ?? instructor}`
          + ` · ${draftId ? `드래프트 ${draftId}` : origin}`
          + ` · 아이템 ${program.items.length} × 레일 = ${lesson.turns.length}턴`,
      },
    }
  }, [local, rows, program, anchor, code, instructor, draftId])

  /* 학생 문구는 레일에 박아두지 않고 매번 만든다 (없거나 실패하면 원본이 그대로 남는다) */
  const steps = useMemo(() => program.items.flatMap((i) => i.steps), [program.items])
  const promptState = useRailPrompts(
    builtLesson?.turns ?? [], steps, builtLesson?.content ?? null,
    builtLesson?.part ?? 0, !!rail, builtLesson?.items,
  )
  const finalLesson = builtLesson && rail
    ? { ...builtLesson, turns: promptState.turns }
    : builtLesson
  const finalRail = rail && { ...rail, generated: promptState.generated, status: promptState.status }

  if (!local || !finalLesson) {
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
  /* 드래프트로 열었는데 이 강의에 해당하는 레일이 없으면 **조용히 정본으로 돌지 않는다.**
     그러면 "내가 바꾼 게 왜 반영이 안 되지?" 를 알 방법이 없다. 비었다고 말해준다. */
  if (draftId && !program.items.length) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#F5F8FE] px-6 text-center">
        <p className="text-[15px] font-bold text-[#0F172A]">드래프트 <span className="text-[#B45309]">{draftId}</span> 에 이 강의의 레일이 없어요.</p>
        <p className="text-sm text-gray-500">
          드래프트는 유형 단위로 복사돼요. {code} 가 쓰는 유형이 이 드래프트에 안 들어 있으면 비어 보입니다.
        </p>
        <div className="flex gap-2 mt-1">
          <button onClick={() => router.push(`/lecture/${code}`)} className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold">정본으로 열기</button>
          <button onClick={() => router.push('/lessons')} className="px-5 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-[#334155] text-sm font-bold">내 학습으로</button>
        </div>
      </div>
    )
  }

  // 대사 생성이 끝나기 전에 들어가면 강사가 시트의 옛 예시 문구를 말한다 — 시작을 막는다
  return <TypeLessonPlayer lesson={finalLesson} instructor={instructor} rail={finalRail}
    /* 드래프트 미리보기는 학습 로그를 남기지 않는다(D-C) — 실험 데이터가 실사용 로그에 섞이면
       FGI 분석이 오염된다. lectureCode 가 로그의 스위치라(TypeLessonPlayer:624) 안 넘기면 꺼진다. */
    lectureCode={draftId ? undefined : code}
    draftId={draftId}
    preparing={promptState.status === 'loading'} />
}
