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
  /** 이 보기만 재생하는 mp3 (없으면 통합 음원으로 폴백) — scripts/gen_option_audio.js가 채운다 */
  audioUrl: string | null
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
    .select('question_code, part, content, question_options(option_label, option_text, is_correct, option_explanation, correct_evidence, audio_url)')
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
            audioUrl: o.audio_url ?? null,
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

/**
 * anchorCode(문항 코드 하나) 기준으로, "같은 지문(passage_text)에 속한 문항 전체"를 조회.
 * — 시트에 같은 지문에 새 문항을 추가하면, 화면 코드를 안 건드려도 자동으로 뜨게 하려는 목적.
 *
 * 주의: 한 강의(lecture_id)에 지문이 여러 개 들어있을 수 있어서(예: RC-P7-03 안에
 * Greenwood 지문 4문항 + 자동차광고 지문 2문항이 같이 있음), lecture_id만으로 묶으면
 * 서로 다른 지문의 문항이 섞인다. 그래서 anchor의 passage_text와 정확히 같은 행만 추린다.
 * passage_text가 없는 Part(예: Part5의 독립 문장형 문항)는 lecture_id 전체를 그대로 묶는다.
 */
export async function fetchQuestionsBySamePassage(anchorCode: string): Promise<UiDbQuestion[] | null> {
  const supabase = getSupabase()
  if (!supabase || !anchorCode) return null

  const { data: anchorRow, error: anchorErr } = await supabase
    .from('questions')
    .select('lecture_id, content')
    .eq('question_code', anchorCode)
    .maybeSingle()
  if (anchorErr || !anchorRow) return null

  const passageText = (anchorRow.content as Record<string, string>)?.passage_text
  let query = supabase
    .from('questions')
    .select('question_code, part, content, question_options(option_label, option_text, is_correct, option_explanation, correct_evidence, audio_url)')
    .eq('lecture_id', anchorRow.lecture_id as number)
  if (passageText) query = query.eq('content->>passage_text', passageText)

  const { data, error } = await query
  if (error || !data || data.length === 0) return null

  const rows: UiDbQuestion[] = (data as any[])
    .map((row) => ({
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
            audioUrl: o.audio_url ?? null,
        })),
    }))
    .filter((q) => q.options.length > 0)
    .sort((a, b) => a.code.localeCompare(b.code))

  return rows.length ? rows : null
}

/** 범용 훅: anchorCode 기준으로 같은 지문의 문항 전체를 로드. 실패 시 fallback */
export function useDbQuestionsByPassage<T>(anchorCode: string, adapt: (rows: UiDbQuestion[]) => T, fallback: T): T {
  const [data, setData] = useState<T>(fallback)
  useEffect(() => {
    let alive = true
    fetchQuestionsBySamePassage(anchorCode)
      .then((rows) => {
        if (alive && rows) setData(adapt(rows))
      })
      .catch(() => { /* 폴백 유지 */ })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorCode])
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

/** 자주 쓰는 코드 묶음 (지문 자동 확장이 안 되는/의미 없는 경우 — 하드코딩 유지) */
export const Q_CODES = {
  p5Lesson: 'RC-P5-08-Q002',
  p5Practice: ['RC-P5-08-Q003', 'RC-P5-08-Q004', 'RC-P5-08-Q005'],
  // 강의 8개를 하나씩 뽑은 큐레이션(대표 문항 모음) — 지문/강의 단위 자동 확장과 무관, 편집 판단이라 유지
  p5Bank: ['RC-P5-08-Q001', 'RC-P5-07-Q001', 'RC-P5-02-Q001', 'RC-P5-11-Q001', 'RC-P5-16-Q001', 'RC-P5-12-Q001', 'RC-P5-06-Q001', 'RC-P5-13-Q001'],
} as const

/**
 * 지문 자동 확장용 앵커 코드 — 문항 하나만 지정하면 같은 지문(passage_text)의 문항 전체가 자동으로 딸려옴.
 * 시트에서 같은 지문에 새 문항을 추가해도, 여기 코드를 안 건드려도 화면에 자동 반영됨.
 * (Part5는 지문 공유 개념이 없어서(독립 문장형) 대상 아님 — Q_CODES/p5* 그대로 사용)
 */
export const Q_ANCHORS = {
  p7CarAd: 'RC-P7-03-Q006',
  p7Greenwood: 'RC-P7-03-Q001',
  p6Memo: 'RC-P6-01-Q001',
} as const

/** memo 없이 배열 리터럴을 넘겨도 refetch가 반복되지 않도록 안정화한 편의 훅 */
export function useStableCodes(codes: readonly string[]): string[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => [...codes], [codes.join(',')])
}

/* ── DB 기반 수업 목록 (유형학습): 문항이 1개 이상 있는 강의만 ── */

export interface DbLecture {
  code: string
  title: string
  part: number
  lcRc: string
  questionCount: number
}

/** 문항이 있는 강의 목록 (part → code 순 정렬). 실패 시 빈 배열 */
export async function fetchLecturesWithQuestions(): Promise<DbLecture[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('questions')
    .select('question_code, lectures(lecture_code, title, part, lc_rc)')
  if (error || !data) return []

  const byCode = new Map<string, DbLecture>()
  for (const row of data as any[]) {
    const lec = row.lectures
    if (!lec) continue
    const cur = byCode.get(lec.lecture_code)
    if (cur) cur.questionCount += 1
    else byCode.set(lec.lecture_code, {
      code: lec.lecture_code, title: lec.title, part: lec.part, lcRc: lec.lc_rc, questionCount: 1,
    })
  }
  return Array.from(byCode.values()).sort((a, b) => a.part - b.part || a.code.localeCompare(b.code))
}

/** 범용 훅: 강의 하나의 문항 전체(수업 Q + 실전 P)를 로드. 실패·빈 결과면 fallback */
export function useDbLectureQuestions<T>(lectureCode: string, adapt: (rows: UiDbQuestion[]) => T, fallback: T): T {
  const [data, setData] = useState<T>(fallback)
  useEffect(() => {
    let alive = true
    if (!lectureCode) return
    fetchLectureQuestions(lectureCode)
      .then((rows) => {
        if (alive && rows.length) setData(adapt(rows))
      })
      .catch(() => { /* 폴백 유지 */ })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureCode])
  return data
}

export function useDbLectures(): DbLecture[] {
  const [data, setData] = useState<DbLecture[]>([])
  useEffect(() => {
    let alive = true
    fetchLecturesWithQuestions().then((rows) => { if (alive) setData(rows) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return data
}

/** 강의의 문항 전체 (code 순). 수업 화면은 첫 문항을 대표로 쓴다 */
export async function fetchLectureQuestions(lectureCode: string): Promise<UiDbQuestion[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('questions')
    .select('question_code, part, content, question_options(option_label, option_text, is_correct, option_explanation, correct_evidence, audio_url), lectures!inner(lecture_code)')
    .eq('lectures.lecture_code', lectureCode)
  if (error || !data) return []
  return (data as any[])
    .map((row) => ({
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
            audioUrl: o.audio_url ?? null,
        })),
    }))
    .filter((q) => q.options.length > 0)
    .sort((a, b) => a.code.localeCompare(b.code))
}
