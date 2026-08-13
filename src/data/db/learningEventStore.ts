'use client'

/**
 * 학습 로그 (STEP 6) — docs/db-restructure-plan.md §7 STEP 6
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────
 * 이게 없으면 **FGI를 돌려도 데이터가 안 남는다.**
 * 기존 `learner_answer_log` 는 문항·선택지·정오답만 남긴다. 그걸로는
 *   "S6(오답 제거)를 선택 응답으로 받은 학생이 같은 유형 2번째 바퀴에서 정답률이 올랐나"
 * 를 물을 수 없다. 스캐폴딩이 통하는지(H3) 보려면 턴마다
 *   **어느 변종이었는지(variant_id)** 와 **몇 번째 바퀴였는지(occurrence)** 가 있어야 한다.
 *
 * ── 원칙 ───────────────────────────────────────────────────────────
 * 1) **로그 때문에 수업이 죽으면 안 된다.** 전부 fire-and-forget, 실패는 삼킨다.
 * 2) 화면을 막지 않는다 — await 하지 않는다.
 * 3) DB가 없으면(env 미설정) 조용히 아무것도 안 한다. 다른 스토어와 같은 폴백 원칙.
 */
import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'
import type { Turn, TypeLesson } from '@/data/typeLearning'

export type LearningEventType = 'turn_shown' | 'response' | 'hint' | 'complete'

/** 한 번의 수업에서 고정되는 값 — 턴마다 다시 안 넘겨도 되게 묶는다 */
export interface LessonLogContext {
  learnerId: string
  sessionId: string
  lectureCode: string
  phase: 'lesson' | 'practice'
  instructorCode: string
  questionTypeId?: number | null
}

interface EventInput {
  type: LearningEventType
  turn?: Turn
  questionCode?: string | null
  response?: string | null
  isCorrect?: boolean | null
  latencyMs?: number | null
}

/** 데모/비로그인 학습자를 한 UUID로 뭉치던 값. 서버(tutorDb)와 같은 값을 쓴다 */
export const DEMO_LEARNER_UUID = '11111111-1111-4111-8111-111111111111'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const normalizeLearnerId = (id: string | undefined | null): string =>
  id && UUID_RE.test(id) ? id : DEMO_LEARNER_UUID

/** 브라우저에서 세션 id 하나 만들기 (한 번 들어와서 끝낼 때까지) */
export function newSessionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    // 구형 브라우저 폴백 — 충돌해도 로그 분석에만 영향
    return `${Date.now().toString(16)}-0000-4000-8000-${Math.floor(Math.random() * 1e12).toString(16).padStart(12, '0')}`.slice(0, 36)
  }
}

/**
 * 턴 하나를 기록한다. **await 하지 말 것** — 화면을 막지 않는다.
 * 실패해도 조용히 넘어간다(수업이 죽는 것보다 로그 한 줄이 비는 게 낫다).
 */
export function logLearningEvent(ctx: LessonLogContext, ev: EventInput): void {
  const supabase = getSupabase()
  if (!supabase || !ctx.lectureCode) return

  const t = ev.turn
  const row = {
    learner_id: ctx.learnerId,
    session_id: ctx.sessionId,
    lecture_code: ctx.lectureCode,
    phase: ctx.phase,
    item_seq: t?.itemSeq ?? null,
    occurrence: t?.occurrence ?? null,
    question_code: ev.questionCode ?? null,
    question_type_id: ctx.questionTypeId ?? null,
    variant_id: t?.variantId ?? null,
    step_order: t?.stepOrder ?? t?.no ?? null,
    step_label: t?.stage ?? null,
    instructor_code: ctx.instructorCode,
    rail_source: t?.railSource ?? null,
    event_type: ev.type,
    response: ev.response ?? null,
    is_correct: ev.isCorrect ?? null,
    latency_ms: ev.latencyMs ?? null,
  }

  void supabase.from('learning_events').insert(row).then(
    () => undefined,
    () => undefined,   // 로그 실패는 삼킨다
  )
}

/**
 * 진도·Fading 상태 갱신 (수업을 끝냈을 때).
 * /api/tutor 의 in-memory `mastery` Map 을 대체하는 표에 쌓는다 —
 * 그 Map 은 서버리스에서 사라져서 Fading 판정이 매번 처음으로 돌아갔다.
 */
export function bumpLearnerProgress(ctx: LessonLogContext): void {
  const supabase = getSupabase()
  if (!supabase || !ctx.lectureCode) return

  void (async () => {
    try {
      const { data } = await supabase
        .from('learner_progress')
        .select('completed_count')
        .eq('learner_id', ctx.learnerId)
        .eq('lecture_code', ctx.lectureCode)
        .maybeSingle()

      const next = ((data as { completed_count?: number } | null)?.completed_count ?? 0) + 1
      // 서버(/api/tutor fadingLevelFor)와 같은 기준선을 쓴다
      const level = next >= 5 ? 'minimal' : next >= 3 ? 'reduced' : 'full'

      await supabase.from('learner_progress').upsert({
        learner_id: ctx.learnerId,
        lecture_code: ctx.lectureCode,
        question_type_id: ctx.questionTypeId ?? null,
        completed_count: next,
        mastery: next,
        fading_level: level,
        last_at: new Date().toISOString(),
      }, { onConflict: 'learner_id,lecture_code' })
    } catch {
      /* 진도 기록 실패도 수업을 막지 않는다 */
    }
  })()
}

/** 이 턴이 다루는 문항 코드 */
export function questionCodeOfTurn(lesson: TypeLesson, turn: Turn): string | null {
  const idx = turn.focusQ ?? (turn.interaction.kind === 'pickAnswer' ? turn.interaction.qIdx : undefined)
  if (idx == null) return null
  return lesson.content.questions[idx]?.code ?? null
}

/** 이 턴이 속한 아이템의 유형 id */
function typeIdOfTurn(lesson: TypeLesson, turn: Turn): number | null {
  return lesson.items?.find((i) => i.seq === turn.itemSeq)?.questionTypeId ?? null
}

/**
 * 수업 화면용 로거. 학습자 id 확인·세션 id 발급을 안에서 하므로 화면은 무엇을 기록할지만 정하면 된다.
 * 로그인 전이거나 DB가 없으면 조용히 아무것도 안 한다.
 */
export function useLessonLog(
  lesson: TypeLesson | undefined,
  lectureCode: string | undefined,
  instructorCode: string,
  phase: 'lesson' | 'practice' = 'lesson',
) {
  const [learnerId, setLearnerId] = useState<string | null>(null)
  const sessionIdRef = useRef<string>('')
  if (!sessionIdRef.current) sessionIdRef.current = newSessionId()

  useEffect(() => {
    let alive = true
    const supabase = getSupabase()
    if (!supabase) { setLearnerId(DEMO_LEARNER_UUID); return }
    supabase.auth.getUser()
      .then(({ data }) => { if (alive) setLearnerId(normalizeLearnerId(data.user?.id)) })
      .catch(() => { if (alive) setLearnerId(DEMO_LEARNER_UUID) })
    return () => { alive = false }
  }, [])

  const ctxOf = (turn?: Turn): LessonLogContext | null => {
    if (!learnerId || !lectureCode || !lesson) return null
    return {
      learnerId,
      sessionId: sessionIdRef.current,
      lectureCode,
      phase,
      instructorCode,
      questionTypeId: turn ? typeIdOfTurn(lesson, turn) : null,
    }
  }

  return {
    ready: !!learnerId && !!lectureCode,
    /** 턴에 들어갔다 */
    turnShown(turn: Turn) {
      const ctx = ctxOf(turn)
      if (ctx && lesson) {
        logLearningEvent(ctx, { type: 'turn_shown', turn, questionCode: questionCodeOfTurn(lesson, turn) })
      }
    },
    /** 학생이 답했다 */
    response(turn: Turn, response: string, isCorrect: boolean | null, latencyMs?: number) {
      const ctx = ctxOf(turn)
      if (ctx && lesson) {
        logLearningEvent(ctx, {
          type: 'response', turn, response, isCorrect,
          questionCode: questionCodeOfTurn(lesson, turn),
          latencyMs: latencyMs ?? null,
        })
      }
    },
    /** 실전을 채점했다 — **문항별로 한 줄씩** 남긴다.
     *
     *  왜 따로 두는가: 복습 세션이 "무엇을 틀렸나"를 이 기록으로 고른다(reviewStore). 코칭 턴의
     *  response 만으로는 모자란다 — 대본 코칭은 문항 자체가 아니라 보기 하나하나를 O/X 로 묻기
     *  때문에, 실전에서 3번을 틀려도 코칭에서 O/X 를 맞히면 `is_correct=true` 만 남는다.
     *  그러면 정작 틀린 문항의 짝이 복습에 안 나온다. 채점한 사실은 채점한 자리에서 남겨야 한다. */
    practiceGraded(questions: { code?: string }[], results: boolean[], answers: Record<number, string>) {
      if (!learnerId || !lectureCode) return
      const ctx: LessonLogContext = {
        learnerId, sessionId: sessionIdRef.current, lectureCode,
        phase: 'practice', instructorCode, questionTypeId: null,
      }
      results.forEach((ok, i) => {
        const code = questions[i]?.code
        if (!code) return
        logLearningEvent(ctx, { type: 'response', questionCode: code, response: answers[i] ?? null, isCorrect: ok })
      })
    },
    /** 수업을 끝냈다 — 진도·Fading 상태도 같이 올린다 */
    complete(turn?: Turn) {
      const ctx = ctxOf(turn)
      if (!ctx) return
      logLearningEvent(ctx, { type: 'complete', turn })
      bumpLearnerProgress(ctx)
    },
  }
}
