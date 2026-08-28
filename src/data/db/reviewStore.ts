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

/* 낼 문항 수 — 콘텐츠 파트 요청(메모 54행): 틀린 수대로 내되 **최소 3 · 최대 5**.
   틀린 것이 없거나 3개가 안 되면 나머지는 그날 복습 문항 중에서 **무작위로 채운다.** */
const MIN_QUESTIONS = 3
const MAX_QUESTIONS = 5

/** 복습 문항 코드 `<강의코드>-R00n` 에서 강의코드만 */
const lectureOf = (reviewCode: string) => reviewCode.replace(/-R\d+$/, '')

/** 목록에서 n 개를 무작위로 (원본은 건드리지 않는다) */
function pickRandom<T>(pool: T[], n: number): T[] {
  const rest = [...pool]
  const out: T[] = []
  while (out.length < n && rest.length) {
    out.push(...rest.splice(Math.floor(Math.random() * rest.length), 1))
  }
  return out
}

export interface ReviewPlan {
  /** 낼 복습 문항 코드 (원문항 순서대로) */
  codes: string[]
  /** 그날 강의에서 틀린 문항 수 — 짝이 없는 것도 포함한다(화면이 "몇 개 틀렸는지"를 말해야 한다) */
  wrongCount: number
  /** 그중 무작위로 채운 문항 수 — 화면이 "왜 이 문제가 나왔는지"를 달리 말해야 한다 */
  filledCount: number
  /** 아직 읽는 중인가 — 빈 목록이 '틀린 게 없다'인지 '아직 모른다'인지 갈라야 한다 */
  loading: boolean
}

/**
 * 그날 강의 목록 → 복습에서 낼 문항.
 *
 * 틀린 문항의 **짝(유사 문항)이 먼저**다 — 복습은 오답에 매단 자리라 그게 본줄기다.
 * 그것만으로 3개가 안 되면 그날 복습 문항 중에서 무작위로 채우고, 5개에서 끊는다(메모 54행).
 * 채울 때는 **이미 고른 것과 같은 강의**를 먼저 본다 — 실전 화면이 한 파트만 담는 그릇이라,
 * 강의가 섞이면 파트가 섞이고 뒤에서 버려진다(review/[day]/page.tsx 의 `dropped`).
 */
export function useReviewPlan(lectureCodes: string[]): ReviewPlan {
  const [plan, setPlan] = useState<ReviewPlan>({ codes: [], wrongCount: 0, filledCount: 0, loading: true })
  const key = lectureCodes.join(',')

  useEffect(() => {
    let alive = true
    setPlan((p) => ({ ...p, loading: true }))
    Promise.all([fetchWrongQuestionCodes(lectureCodes), fetchReviewPairs(lectureCodes)])
      .then(([wrong, pairs]) => {
        if (!alive) return
        /* 원문항 순서를 그대로 물려받는다 — 복습 코드가 R001, R002 … 순으로 그 순서다 */
        const matched = Array.from(pairs.entries())
          .filter(([, of]) => wrong.has(of))
          .map(([code]) => code)
          .sort()

        const codes = matched.slice(0, MAX_QUESTIONS)
        let filledCount = 0
        if (codes.length < MIN_QUESTIONS) {
          const taken = new Set(codes)
          const rest = Array.from(pairs.keys()).filter((c) => !taken.has(c))
          /* 이미 고른 것이 있으면 그 강의를 먼저, 없으면 복습 문항이 가장 많은 강의를 먼저 */
          const home = codes.length
            ? lectureOf(codes[0])
            : rest.map(lectureOf).sort((a, b) =>
                rest.filter((c) => lectureOf(c) === b).length - rest.filter((c) => lectureOf(c) === a).length)[0]
          const near = rest.filter((c) => lectureOf(c) === home)
          const far = rest.filter((c) => lectureOf(c) !== home)
          const filled = pickRandom(near, MIN_QUESTIONS - codes.length)
          filled.push(...pickRandom(far, MIN_QUESTIONS - codes.length - filled.length))
          codes.push(...filled)
          filledCount = filled.length
        }
        setPlan({ codes, wrongCount: wrong.size, filledCount, loading: false })
      })
      .catch(() => { if (alive) setPlan({ codes: [], wrongCount: 0, filledCount: 0, loading: false }) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return plan
}
