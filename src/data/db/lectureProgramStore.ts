'use client'

/**
 * 강의 진행표 로더 — `v_lecture_program`(0015) 하나만 읽는다.
 *
 * 이 뷰가 생기기 전까지 화면은 원시 테이블 두 벌(`rail_compositions` / `lecture_steps`)을
 * 직접 알고 있었고(`lectureStepStore`), **아이템 개념이 아예 없어서** 강의의 앵커 문항
 * 하나만 잡고 레일을 한 번 돌렸다. 그래서 사진 3장짜리 강의가 1장만 수업하고 끝났다.
 *
 * 이제 화면은 "아이템 × 레일" 표만 본다. STEP 5에서 레일 원천이 `type_rails` 로 바뀌어도
 * 뷰 안쪽만 바뀌고 이 파일과 화면은 그대로다. 그게 뷰를 두는 이유다.
 */
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'
import type { DbLectureStep, RailSource } from '@/data/db/lectureStepStore'

/** 아이템 하나 = 레일이 한 바퀴 도는 단위 */
export interface ProgramItem {
  itemSeq: number
  /** 같은 유형이 이 강의에서 몇 번째로 나오는가 — Fading 과 학습효과 분석의 축 */
  occurrence: number
  typeCode: string | null
  questionTypeId: number | null
  /** 이 아이템이 다루는 문항 코드 (sub_order 순) */
  questionCodes: string[]
  /** 이 아이템에서 돌 레일 턴 */
  steps: DbLectureStep[]
}

export interface LectureProgram {
  items: ProgramItem[]
  source: RailSource
  instructorCode: string | null
}

const EMPTY: LectureProgram = { items: [], source: 'none', instructorCode: null }

/* eslint-disable @typescript-eslint/no-explicit-any */

function toStep(r: any): DbLectureStep {
  return {
    order: r.step_order,
    stepCode: String(r.step_code ?? '').replace(/\s*\n\s*/g, ' ').trim(),
    fixedRule: r.fixed_rule ?? null,
    section: r.section ?? null,
    audioMode: r.audio_mode ?? null,
    scriptMode: r.script_mode ?? null,
    interaction: r.interaction ?? null,
    studentPrompt: r.student_prompt ?? null,
    freeExpression: null,   // 0024 에서 제거 — 강사 발화는 DB에 없다
    dbFields: r.db_fields ?? null,
    partCode: r.variant_code ?? null,
    variantId: r.variant_id ?? null,
    railSource: r.rail_source ?? null,
  }
}

/* 강사 발화 칸(tutor_directive)은 0024 에서 뷰·테이블 양쪽에서 제거됐다.
   발화는 DB에 없다 — 문항 사실 + 단계 지시로 LLM 이 매번 만든다. */
const COLUMNS =
  'item_seq, occurrence, type_code, question_type_id, questions, instructor_code, rail_source,'
  + ' step_order, step_code, interaction, audio_mode, script_mode, student_prompt,'
  + ' section, fixed_rule, db_fields, variant_code, variant_id'

/**
 * 강의 하나의 진행표. 해당 강사 레일이 없으면 'common' 으로 폴백한다
 * (튜터 엔진·`lectureStepStore` 와 같은 폴백 규칙 — 세 곳이 같은 레일을 보게).
 *
 * `draftId` 를 주면 **레일 편집기 드래프트**를 읽는다(`?rail=` 미리보기).
 *   · 읽는 뷰가 통째로 다르다 — `v_lecture_program_draft`.
 *     정본 뷰는 `draft_id is null` 로 드래프트를 구조적으로 차단하므로(0021) 여기로 못 온다.
 *   · **'common' 폴백을 하지 않는다.** 드래프트는 "지금 이 레일을 이렇게 바꿔봤다" 를 보는 것이라,
 *     비어 있으면 조용히 다른 레일을 보여주는 게 아니라 **비어 있다고 알려야** 한다.
 */
export async function fetchLectureProgram(
  lectureCode: string,
  instructorCode = 'common',
  phase: 'lesson' | 'practice' = 'lesson',
  draftId?: string | null,
): Promise<LectureProgram> {
  const supabase = getSupabase()
  if (!supabase || !lectureCode) return EMPTY

  /* sandbox = 실험장 스키마. 브라우저에는 안 열려 있어서(0025) 서버 라우트를 거친다. */
  if (draftId === 'sandbox') return fetchSandboxProgram(lectureCode, instructorCode, phase)

  const query = (code: string) => (
    draftId
      ? supabase.from('v_lecture_program_draft').select(COLUMNS).eq('draft_id', draftId)
      : supabase.from('v_lecture_program').select(COLUMNS)
  )
    .eq('lecture_code', lectureCode)
    .eq('phase', phase)
    .eq('instructor_code', code)
    .order('item_seq')
    .order('step_order')

  let used = instructorCode
  const { data, error } = await query(instructorCode)
  let rows = error ? null : data
  if (!rows?.length && instructorCode !== 'common' && !draftId) {
    const fb = await query('common')
    rows = fb.error ? null : fb.data
    used = 'common'
  }
  if (!rows?.length) return EMPTY
  return toProgram(rows as any[], used)
}

/** 뷰 행 묶음 → 진행표 (정본·드래프트·sandbox 가 같은 모양이라 변환도 하나로 쓴다) */
function toProgram(rows: any[], used: string): LectureProgram {
  const byItem = new Map<number, ProgramItem>()
  for (const r of rows as any[]) {
    if (!byItem.has(r.item_seq)) {
      byItem.set(r.item_seq, {
        itemSeq: r.item_seq,
        occurrence: r.occurrence ?? 1,
        typeCode: r.type_code ?? null,
        questionTypeId: r.question_type_id ?? null,
        questionCodes: ((r.questions as any[]) ?? []).map((q) => q.question_code),
        steps: [],
      })
    }
    byItem.get(r.item_seq)!.steps.push(toStep(r))
  }

  const first = (rows as any[])[0]
  return {
    items: Array.from(byItem.values()).sort((a, b) => a.itemSeq - b.itemSeq),
    source: first.rail_source === 'composition' ? 'composition' : 'lecture_steps',
    instructorCode: used,
  }
}

/** sandbox 스키마의 진행표 — `?sandbox=1` 미리보기.
 *  sandbox 는 anon 에게 열려 있지 않으므로(0025) supabase 클라이언트로 못 읽는다.
 *  `/api/sandbox-program` 서버 라우트가 대신 읽어준다. */
async function fetchSandboxProgram(
  lectureCode: string, instructorCode: string, phase: string,
): Promise<LectureProgram> {
  try {
    const res = await fetch(`/api/sandbox-program?lecture=${encodeURIComponent(lectureCode)}`
      + `&instructor=${encodeURIComponent(instructorCode)}&phase=${phase}`)
    if (!res.ok) return EMPTY
    const { rows } = await res.json()
    return toProgram(rows ?? [], instructorCode)
  } catch { return EMPTY }
}

/** 훅. 실패하면 빈 진행표 → 호출부가 예전 방식(앵커 1문항 + 코드 레일)으로 폴백한다.
 *  `draftId` 를 주면 드래프트 진행표를 읽는다(미리보기). */
export function useLectureProgram(
  lectureCode: string, instructorCode: string, draftId?: string | null,
): LectureProgram {
  const [state, setState] = useState<LectureProgram>(EMPTY)
  useEffect(() => {
    let alive = true
    if (!lectureCode) return
    fetchLectureProgram(lectureCode, instructorCode, 'lesson', draftId)
      .then((p) => { if (alive) setState(p) })
      .catch(() => { /* 폴백 유지 */ })
    return () => { alive = false }
  }, [lectureCode, instructorCode, draftId])
  return state
}
