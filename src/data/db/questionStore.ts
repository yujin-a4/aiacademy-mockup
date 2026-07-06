'use client'

/**
 * 화면 UI용 Supabase 문항 스토어.
 *
 * DB(questions/question_options)를 각 화면이 기대하는 기존 데이터 모양으로 변환한다.
 * 원칙: DB 로드 실패(env 미설정·네트워크 등) 시 기존 하드코딩 데이터로 폴백 —
 * 데모가 죽지 않게 graceful degrade (supabaseClient와 같은 원칙).
 *
 * 튜터 엔진(/api/tutor)이 말하는 사실과 화면에 보이는 문항이 같은 DB 행에서 나온다.
 */
import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'
import type { Part7Set, Question as P7SetQuestion } from '@/data/part7Scenario'
import type { P5Question, P6Passage, P7Passage, RCChoices } from '@/data/rcData'

export interface UiDbOption {
  label: string
  text: string
  correct: boolean
  explanation: string | null
  evidence: string | null
}

export interface UiDbQuestion {
  code: string
  part: number
  content: Record<string, string>
  options: UiDbOption[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** codes 순서대로 정렬해 반환. 하나라도 없거나 실패하면 null (→ 폴백) */
export async function fetchQuestionsByCodes(codes: string[]): Promise<UiDbQuestion[] | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('questions')
    .select('question_code, part, content, question_options(option_label, option_text, is_correct, option_explanation, correct_evidence)')
    .in('question_code', codes)

  if (error || !data) return null

  const byCode = new Map<string, UiDbQuestion>(
    data.map((row: any) => [
      row.question_code,
      {
        code: row.question_code,
        part: row.part,
        content: (row.content as Record<string, string>) ?? {},
        options: ((row.question_options as any[]) ?? [])
          .sort((a, b) => String(a.option_label).localeCompare(String(b.option_label)))
          .map((o) => ({
            label: o.option_label,
            text: o.option_text,
            correct: o.is_correct,
            explanation: o.option_explanation,
            evidence: o.correct_evidence,
          })),
      },
    ]),
  )

  const ordered = codes.map((c) => byCode.get(c))
  if (ordered.some((q) => !q || q.options.length === 0)) return null
  return ordered as UiDbQuestion[]
}

/** 범용 훅: DB 로드 성공 시 adapt 결과, 실패 시 fallback */
export function useDbQuestions<T>(codes: string[], adapt: (rows: UiDbQuestion[]) => T, fallback: T): T {
  const [data, setData] = useState<T>(fallback)
  const key = codes.join(',')
  useEffect(() => {
    let alive = true
    fetchQuestionsByCodes(codes)
      .then((rows) => {
        if (alive && rows) setData(adapt(rows))
      })
      .catch(() => { /* 폴백 유지 */ })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return data
}

/* ── 어댑터: DB 행 → 화면별 기존 데이터 모양 ── */

function correctOf(q: UiDbQuestion): UiDbOption {
  return q.options.find((o) => o.correct) ?? q.options[0]
}

function choicesTuple(q: UiDbQuestion): RCChoices {
  const texts = q.options.map((o) => o.text)
  while (texts.length < 4) texts.push('')
  return texts.slice(0, 4) as RCChoices
}

/** Part7Set (part7Scenario 모양) — Part7ConvAIScreen / Part7AIScreen / Part7Screen / Part7ReadingScreen(수업 세트) */
export function toPart7Set(rows: UiDbQuestion[], fallback: Part7Set): Part7Set {
  const first = rows[0]
  return {
    ...fallback, // id·questionRange·passageType·adData 등 표시용 메타는 유지
    passage: first.content.passage_text ?? fallback.passage,
    questions: rows.map((q, i): P7SetQuestion => ({
      number: Number(q.content.question_number) || fallback.questions[i]?.number || i + 1,
      text: q.content.question_text ?? '',
      choices: q.options.map((o) => ({ id: o.label as 'A' | 'B' | 'C' | 'D', text: o.text })),
      correct: correctOf(q).label as 'A' | 'B' | 'C' | 'D',
      explanation: correctOf(q).evidence ?? '',
    })),
  }
}

/** P6Passage (rcData 모양) — Part6ReadingScreen / my-learning */
export function toP6Passage(rows: UiDbQuestion[], fallback: P6Passage): P6Passage {
  const first = rows[0]
  return {
    id: fallback.id,
    title: fallback.title,
    passage: first.content.passage_context ?? fallback.passage,
    questions: rows.map((q, i) => ({
      blankNum: Number(q.content.question_number) || i + 1,
      choices: choicesTuple(q),
      answer: q.options.findIndex((o) => o.correct),
      explanation: correctOf(q).evidence ?? '',
      category: q.content.blank_type ?? fallback.questions[i]?.category ?? '문법',
    })),
  }
}

/** P7Passage (rcData 모양) — Part7ReadingScreen / my-learning */
export function toP7Passage(rows: UiDbQuestion[], fallback: P7Passage): P7Passage {
  const first = rows[0]
  return {
    id: fallback.id,
    title: fallback.title,
    passage: first.content.passage_text ?? fallback.passage,
    questions: rows.map((q, i) => ({
      id: Number(q.content.question_number) || i + 1,
      question: q.content.question_text ?? '',
      choices: choicesTuple(q),
      answer: q.options.findIndex((o) => o.correct),
      explanation: correctOf(q).evidence ?? '',
    })),
  }
}

/** P5Question[] (rcData 모양) — my-learning */
export function toP5Questions(rows: UiDbQuestion[], fallback: P5Question[]): P5Question[] {
  return rows.map((q, i) => ({
    id: i + 1,
    sentence: q.content.blank_sentence ?? fallback[i]?.sentence ?? '',
    choices: choicesTuple(q),
    answer: q.options.findIndex((o) => o.correct),
    explanation: correctOf(q).evidence ?? '',
    category: q.content.grammar_point ?? fallback[i]?.category ?? '',
  }))
}

/** words/blankIndex 문제 (lessonScenario SCREEN1/SCREEN3 모양) — Part5BlankScreen */
export interface BlankProblem {
  number: string
  words: string[]
  blankIndex: number
  correctAnswer: string
  choices: { id: string; text: string }[]
  explanation: string
}

export function toBlankProblem(q: UiDbQuestion, number: string): BlankProblem {
  const sentence = q.content.blank_sentence ?? ''
  const words = sentence.split(/\s+/).filter(Boolean)
  let blankIndex = words.findIndex((w) => /^_+[.,]?$/.test(w))
  if (blankIndex === -1) blankIndex = 0
  words[blankIndex] = '______'
  const correct = correctOf(q)
  return {
    number,
    words,
    blankIndex,
    correctAnswer: correct.text,
    choices: q.options.map((o) => ({ id: o.label, text: o.text })),
    explanation: correct.evidence ?? '',
  }
}

/** 자주 쓰는 코드 묶음 */
export const Q_CODES = {
  p7CarAd: ['RC-P7-03-Q005', 'RC-P7-03-Q006'],
  p7Greenwood: ['RC-P7-03-Q001', 'RC-P7-03-Q002', 'RC-P7-03-Q003', 'RC-P7-03-Q004'],
  p6Memo: ['RC-P6-01-Q001', 'RC-P6-01-Q002', 'RC-P6-01-Q003', 'RC-P6-01-Q004'],
  p5Lesson: 'RC-P5-08-Q002',
  p5Practice: ['RC-P5-08-Q003', 'RC-P5-08-Q004', 'RC-P5-08-Q005'],
  p5Bank: ['RC-P5-08-Q001', 'RC-P5-07-Q001', 'RC-P5-02-Q001', 'RC-P5-11-Q001', 'RC-P5-16-Q001', 'RC-P5-12-Q001', 'RC-P5-06-Q001', 'RC-P5-13-Q001'],
} as const

/** memo 없이 배열 리터럴을 넘겨도 refetch가 반복되지 않도록 안정화한 편의 훅 */
export function useStableCodes(codes: readonly string[]): string[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => [...codes], [codes.join(',')])
}
