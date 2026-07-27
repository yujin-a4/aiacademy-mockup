'use client'

/**
 * 강의별 스캐폴딩 레일(lecture_steps) 클라이언트 로더.
 *
 * 정본은 구글시트 "AI어학원 콘텐츠" > [이도윤 ver]/[윤다은 ver]/[공통] 스케폴딩 탭이고,
 * `scripts/import-instructor-rails.js`가 시트 → 이 테이블로 넣는다.
 * 즉 **콘텐츠팀이 시트에서 고친 레일이 여기로 내려오고, 화면은 이 표만 보고 턴을 만든다.**
 *
 * 서버용 로더는 `src/lib/tutorDb.ts`(튜터 엔진). 여기는 유형학습 화면 전용으로,
 * `src/data/db/*` 규약(브라우저 supabase + 훅)에 맞춰 따로 둔다.
 */
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

/** 레일의 한 턴. 값은 전부 사람이 쓴 한국어 문장이다.
 *  `lecture_steps`(강의별 원본)와 `rail_compositions`(부품 조합) 둘 다 이 모양으로 변환해서
 *  화면·번역기는 출처를 몰라도 되게 한다. */
export interface DbLectureStep {
  order: number
  stepCode: string              // 'S1 핵심 단서', '선택지 A 청취 + S6/S5' …
  fixedRule: string | null      // AI가 따라야 할 규칙 (화면엔 안 쓰고 검토 패널에만 표시)
  section: string | null        // 'Q1 상황/주제/목적형' — 하위문제 그룹
  audioMode: string | null      // '선택지 A 음원만 재생한다' / '재생 없음' / 조건부 지시문
  scriptMode: string | null     // '전체 스크립트 공개' / 'A 스크립트만 표시' / '표시 없음'
  interaction: string | null    // 'AI 진행' / '선택 응답' / '필수 수행 / 필기 인식' …
  studentPrompt: string | null  // 학생에게 던지는 질문 ('—'면 없음)
  freeExpression: string | null // 강사 발화 예시 → 말풍선·TTS
  dbFields: string | null       // 이 턴이 참조하는 DB 필드 목록 (검토 패널용)
  /* ── 부품 조합(rail_compositions)에서 온 턴만 채워진다 ── */
  partCode?: string | null      // 'P5-02' — 이 턴이 쓰는 부품
  /** 학생 문구가 어디서 왔나. LLM 생성은 이 위에 덮인다(단 'override'는 못 덮음) */
  promptOrigin?: 'override' | 'part' | 'seed' | 'none'
  /** true면 이 강의 전용 예외가 지정돼 있어 LLM이 못 건드린다 */
  promptLocked?: boolean
  /** 이식된 손글씨 문구 — LLM에 말투 예시로 준다 */
  promptSeed?: string | null
}

/** 레일을 어디서 읽었는지 — 검토 패널 머리말에 표시 */
export type RailSource = 'composition' | 'lecture_steps' | 'none'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 강의 하나의 레일을 강사 기준으로 로드. 해당 강사 레일이 없으면 'common'으로 폴백한다.
 * (튜터 엔진 `loadLectureSteps`와 같은 폴백 규칙 — 두 화면이 같은 레일을 보게)
 */
export async function fetchLectureSteps(
  lectureCode: string,
  instructorCode = 'common',
): Promise<DbLectureStep[]> {
  const supabase = getSupabase()
  if (!supabase || !lectureCode) return []

  const query = (code: string) => supabase
    .from('lecture_steps')
    .select('step_order, step_code, fixed_rule, section, audio_mode, script_mode, interaction, student_prompt, free_expression, db_fields, lectures!inner(lecture_code)')
    .eq('lectures.lecture_code', lectureCode)
    .eq('instructor_code', code)
    .order('step_order')

  const { data, error } = await query(instructorCode)
  let rows = error ? null : data
  if (!rows?.length && instructorCode !== 'common') {
    const fallback = await query('common')
    rows = fallback.error ? null : fallback.data
  }

  return ((rows as any[]) ?? []).map((s) => ({
    order: s.step_order,
    stepCode: String(s.step_code ?? '').replace(/\s*\n\s*/g, ' ').trim(),
    fixedRule: s.fixed_rule ?? null,
    section: s.section ?? null,
    audioMode: s.audio_mode ?? null,
    scriptMode: s.script_mode ?? null,
    interaction: s.interaction ?? null,
    studentPrompt: s.student_prompt ?? null,
    freeExpression: s.free_expression ?? null,
    dbFields: s.db_fields ?? null,
  }))
}

/**
 * 부품 조합 레일 (rail_compositions × rail_steps).
 *
 * 스캐폴딩을 "부품 사전 + 조합표"로 쪼갠 새 구조. 한 부품을 고치면 그 부품을 쓰는
 * 모든 강의가 같이 바뀐다 — 레일 실험의 단위를 강의가 아니라 부품으로 내리는 게 목적.
 * 강의별로 다르게 갈 자리는 `*_override`에 값을 넣어 빠져나간다.
 * 아직 이식 안 된 파트는 빈 배열 → 호출부가 lecture_steps로 폴백.
 */
export async function fetchRailComposition(
  lectureCode: string,
  instructorCode: string,
): Promise<DbLectureStep[]> {
  const supabase = getSupabase()
  if (!supabase || !lectureCode) return []

  const { data, error } = await supabase
    .from('rail_compositions')
    .select('step_order, student_prompt_override, tutor_directive_override, student_prompt_seed, tutor_directive_seed, rail_steps!inner(code, name, interaction, audio_mode, script_mode, student_prompt, tutor_directive), lectures!inner(lecture_code)')
    .eq('lectures.lecture_code', lectureCode)
    .eq('instructor_code', instructorCode)
    .order('step_order')
  if (error || !data) return []

  return (data as any[]).map((r) => {
    const part = r.rail_steps
    /* 문구 우선순위 (LLM 없이 결정되는 값):
         override(이 강의 전용 예외) > 부품 기본값(공유) > seed(이식된 손글씨)
       LLM 생성분은 이 위에 덮이는데, override만은 못 덮는다. */
    const origin: DbLectureStep['promptOrigin'] =
      r.student_prompt_override ? 'override'
        : part?.student_prompt ? 'part'
          : r.student_prompt_seed ? 'seed' : 'none'
    return {
      order: r.step_order,
      stepCode: String(part?.name ?? '').trim(),
      fixedRule: null,
      section: null,
      audioMode: part?.audio_mode ?? null,
      scriptMode: part?.script_mode ?? null,
      interaction: part?.interaction ?? null,
      studentPrompt: r.student_prompt_override ?? part?.student_prompt ?? r.student_prompt_seed ?? null,
      freeExpression: r.tutor_directive_override ?? part?.tutor_directive ?? r.tutor_directive_seed ?? null,
      dbFields: null,
      partCode: part?.code ?? null,
      promptOrigin: origin,
      promptLocked: !!r.student_prompt_override,
      promptSeed: r.student_prompt_seed ?? null,
    }
  })
}

/**
 * 레일 훅 — **부품 조합을 먼저 보고, 없으면 강의별 원본(lecture_steps)** 으로 폴백.
 * 둘 다 없으면 빈 배열이고, 그때는 호출부가 코드 생성 레일로 폴백한다.
 */
export function useDbLectureSteps(
  lectureCode: string,
  instructorCode: string,
): { steps: DbLectureStep[]; source: RailSource } {
  const [state, setState] = useState<{ steps: DbLectureStep[]; source: RailSource }>({ steps: [], source: 'none' })
  useEffect(() => {
    let alive = true
    if (!lectureCode) return
    ;(async () => {
      const composed = await fetchRailComposition(lectureCode, instructorCode)
      if (!alive) return
      if (composed.length) { setState({ steps: composed, source: 'composition' }); return }
      const raw = await fetchLectureSteps(lectureCode, instructorCode)
      if (alive && raw.length) setState({ steps: raw, source: 'lecture_steps' })
    })().catch(() => { /* 폴백 유지 */ })
    return () => { alive = false }
  }, [lectureCode, instructorCode])
  return state
}
