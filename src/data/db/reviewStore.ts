/* ── 복습 세션이 낼 문항 고르기 ──
 *
 * 하루의 마지막은 복습이다("동일 유형 오답 문제 풀이", curriculumSchedule.ts).
 * **순서가 아니라 오답에 매단다** — 그날 강의에서 틀린 문항이 있으면, 그 문항의 **유사 문항**을 낸다.
 *
 * 짝은 DB 가 들고 있다: 복습 문항(`<강의코드>-R00n`)의 `content.review_of` 가 원문항 코드다
 * (scripts/load-review-questions.js 가 시트 'FGI 파트&문항' R 열에서 적재한다).
 *
 * 무엇을 '틀렸다'고 보는가
 *   `learning_events` 의 response 이벤트 중 `is_correct = false` 인 것. 실전에서 틀린 것도,
 *   수업 중에 틀린 것도 같이 센다 — 학생 입장에서는 둘 다 "이 문항을 못 맞혔다" 이다.
 *   **한 번이라도 틀렸으면** 짝을 낸다. 나중에 맞혔다고 지우지 않는다: 강사가 짚어 줘서 맞힌 것과
 *   혼자 맞히는 것은 다른 일이고, 복습은 뒤쪽을 확인하는 자리다.
 */
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'
import { getLearnerId } from '@/lib/profile'
import { DEMO_LEARNER_UUID } from '@/data/db/learningEventStore'

/** 이 강의들에서 학습자가 **한 번이라도 틀린** 문항 코드 */
export async function fetchWrongQuestionCodes(lectureCodes: string[]): Promise<Set<string>> {
  const supabase = getSupabase()
  if (!supabase || !lectureCodes.length) return new Set()
  const learnerId = await getLearnerId(DEMO_LEARNER_UUID)

  const { data, error } = await supabase
    .from('learning_events')
    .select('question_code')
    .eq('learner_id', learnerId)
    .eq('event_type', 'response')
    .eq('is_correct', false)
    .in('lecture_code', lectureCodes)

  if (error || !data) return new Set()
  return new Set(data.map((r: { question_code: string | null }) => r.question_code).filter(Boolean) as string[])
}

/** 이 강의들의 복습 문항 전부 — `복습문항코드 → 짝이 되는 원문항코드` */
export async function fetchReviewPairs(lectureCodes: string[]): Promise<Map<string, string>> {
  const supabase = getSupabase()
  if (!supabase || !lectureCodes.length) return new Map()

  /* 강의별 코드 접두어로 긁는다 — `like` 를 여러 개 걸 수 없어 or() 로 잇는다 */
  const { data, error } = await supabase
    .from('questions')
    .select('question_code, content')
    .or(lectureCodes.map((c) => `question_code.like.${c}-R%`).join(','))

  if (error || !data) return new Map()
  const pairs = new Map<string, string>()
  for (const row of data as { question_code: string; content: Record<string, string> | null }[]) {
    const of = row.content?.review_of
    if (of) pairs.set(row.question_code, of)
  }
  return pairs
}

export interface ReviewPlan {
  /** 낼 복습 문항 코드 (원문항 순서대로) */
  codes: string[]
  /** 그날 강의에서 틀린 문항 수 — 짝이 없는 것도 포함한다(화면이 "몇 개 틀렸는지"를 말해야 한다) */
  wrongCount: number
  /** 아직 읽는 중인가 — 빈 목록이 '틀린 게 없다'인지 '아직 모른다'인지 갈라야 한다 */
  loading: boolean
}

/**
 * 그날 강의 목록 → 복습에서 낼 문항.
 * 틀린 것이 없으면 빈 목록이다 — 그때는 낼 문제가 없다고 말하는 것이 맞다(아무거나 내지 않는다).
 */
export function useReviewPlan(lectureCodes: string[]): ReviewPlan {
  const [plan, setPlan] = useState<ReviewPlan>({ codes: [], wrongCount: 0, loading: true })
  const key = lectureCodes.join(',')

  useEffect(() => {
    let alive = true
    setPlan((p) => ({ ...p, loading: true }))
    Promise.all([fetchWrongQuestionCodes(lectureCodes), fetchReviewPairs(lectureCodes)])
      .then(([wrong, pairs]) => {
        if (!alive) return
        /* 원문항 순서를 그대로 물려받는다 — 복습 코드가 R001, R002 … 순으로 그 순서다 */
        const codes = Array.from(pairs.entries())
          .filter(([, of]) => wrong.has(of))
          .map(([code]) => code)
          .sort()
        setPlan({ codes, wrongCount: wrong.size, loading: false })
      })
      .catch(() => { if (alive) setPlan({ codes: [], wrongCount: 0, loading: false }) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return plan
}
