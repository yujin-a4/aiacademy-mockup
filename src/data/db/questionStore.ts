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
import { getLearnerId } from '@/lib/profile'
import { DEMO_LEARNER_UUID } from '@/data/db/learningEventStore'
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
  /** 화면에 그릴 순서 (0014). 크론이 보기를 지웠다 다시 넣어도 트리거가 채운다 */
  displayOrder: number
}

/** 지문 문장 하나 (`passage_sentences`) — 음원 구간 재생·직독직해의 최소 단위 */
export interface UiDbSentence {
  seq: number
  en: string
  ko: string | null
  speaker: string | null
  blankNo: number | null
  audioUrl: string | null
}

/** 지문 (`passages`, 0014) — 표·대화·이메일 메타를 담는다. content 문자열을 대체한다 */
export interface UiDbPassage {
  code: string | null
  kind: string
  title: string | null
  meta: { k: string; v: string }[] | null
  /** 문장으로 안 쪼개지는 것: { table: { headers, rows } } 등 */
  body: Record<string, unknown> | null
  sentences: UiDbSentence[]
  /** 이중·삼중 지문 묶음 키 (0027). 단일 지문은 null */
  setCode: string | null
  /** 세트 안 순서 (지문 1·2·3) */
  setSeq: number
}

export interface UiDbQuestion {
  code: string
  part: number
  content: Record<string, string>
  options: UiDbOption[]
  /** 지문 안에서 몇 번째 문항인가 (0014). 교재 원문 번호(147 같은 값)와 다르다 */
  displayOrder: number
  /** 이 문항이 붙은 지문. 지문 개념이 없는 Part1·5는 null.
   *  이중·삼중이면 **세트의 첫 지문**이다 — 세트 전체는 `passages` 를 봐라 */
  passage: UiDbPassage | null
  /** 이 문항이 보는 지문 전체 (0027). 단일 지문이면 [passage], 없으면 [] */
  passages: UiDbPassage[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/* 세 군데서 같은 select/매핑을 하던 것을 한 곳으로. 컬럼이 늘 때 한 군데만 고치면 된다 */
const P_SELECT =
  'passage_code, kind, title, meta, body, set_code, set_seq, ' +
  'passage_sentences(seq, en, ko, speaker, blank_no, audio_url)'
const Q_SELECT =
  'question_code, part, content, display_order, ' +
  'question_options(option_label, option_text, is_correct, option_explanation, correct_evidence, audio_url, display_order), ' +
  `passages(${P_SELECT})`

function mapPassageRow(p: any): UiDbPassage {
  return {
    code: p.passage_code ?? null,
    kind: p.kind,
    title: p.title ?? null,
    meta: (p.meta as { k: string; v: string }[] | null) ?? null,
    body: (p.body as Record<string, unknown> | null) ?? null,
    setCode: p.set_code ?? null,
    setSeq: p.set_seq ?? 1,
    sentences: ((p.passage_sentences as any[]) ?? [])
      .map((s) => ({
        seq: s.seq, en: s.en, ko: s.ko ?? null, speaker: s.speaker ?? null,
        blankNo: s.blank_no ?? null, audioUrl: s.audio_url ?? null,
      }))
      .sort((a, b) => a.seq - b.seq),
  }
}

function mapPassage(row: any): UiDbPassage | null {
  const p = Array.isArray(row?.passages) ? row.passages[0] : row?.passages
  return p ? mapPassageRow(p) : null
}

/**
 * 이중·삼중 지문 세트를 붙인다 (0027).
 *
 * 문항은 세트의 **첫 지문**만 가리킨다(`questions.passage_id`). 나머지 지문은 같은 `set_code`
 * 로 묶여 있을 뿐이라 문항 조회에 딸려 오지 않는다 — 그래서 여기서 한 번 더 읽는다.
 * 세트가 없는 강의(대부분)는 쿼리 자체를 안 한다.
 */
async function attachPassageSets(rows: UiDbQuestion[]): Promise<UiDbQuestion[]> {
  const supabase = getSupabase()
  const codes = Array.from(new Set(
    rows.map((r) => r.passage?.setCode).filter((c): c is string => !!c),
  ))
  if (!supabase || codes.length === 0) return rows

  const { data, error } = await supabase.from('passages').select(P_SELECT).in('set_code', codes)
  if (error || !data) return rows                       // 실패해도 첫 지문으로는 돈다

  const bySet = new Map<string, UiDbPassage[]>()
  for (const p of data as any[]) {
    const doc = mapPassageRow(p)
    if (!doc.setCode) continue
    bySet.set(doc.setCode, [...(bySet.get(doc.setCode) ?? []), doc])
  }
  bySet.forEach((list) => list.sort((a, b) => a.setSeq - b.setSeq))

  return rows.map((r) => {
    const set = r.passage?.setCode ? bySet.get(r.passage.setCode) : undefined
    return set && set.length > 1 ? { ...r, passages: set } : r
  })
}

function mapQuestion(row: any): UiDbQuestion {
  const passage = mapPassage(row)
  return {
    code: row.question_code,
    part: row.part,
    content: (row.content as Record<string, string>) ?? {},
    displayOrder: row.display_order ?? 0,
    passage,
    passages: passage ? [passage] : [],      // 세트면 attachPassageSets 가 나머지를 채운다
    options: ((row.question_options as any[]) ?? [])
      // display_order 우선(0014). 없던 시절 데이터/폴백을 위해 label 순으로 떨어진다
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
        || String(a.option_label).localeCompare(String(b.option_label)))
      .map((o, i) => ({
        label: o.option_label,
        text: o.option_text,
        correct: o.is_correct,
        explanation: o.option_explanation,
        evidence: o.correct_evidence,
        audioUrl: o.audio_url ?? null,
        displayOrder: o.display_order ?? i + 1,
      })),
  }
}

/** codes 순서대로 정렬해 반환. 하나라도 없거나 실패하면 null (→ 폴백) */
export async function fetchQuestionsByCodes(codes: string[]): Promise<UiDbQuestion[] | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('questions')
    .select(Q_SELECT)
    .in('question_code', codes)

  if (error || !data) return null

  const byCode = new Map<string, UiDbQuestion>(
    data.map((row: any) => [row.question_code, mapQuestion(row)]),
  )

  const ordered = codes.map((c) => byCode.get(c))
  if (ordered.some((q) => !q || q.options.length === 0)) return null
  return attachPassageSets(ordered as UiDbQuestion[])
}

/** 한 파트의 문항 전체. 자율학습 '파트별 연습'이 여기서 문제를 받는다.
 *  큐레이션(Q_CODES)이나 앵커(Q_ANCHORS)로 좁히지 않고 DB에 든 것을 다 가져온다. */
export async function fetchQuestionsByPart(part: number): Promise<UiDbQuestion[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('questions')
    .select(Q_SELECT)
    .eq('part', part)
  if (error || !data) return []
  return attachPassageSets((data as any[])
    .map(mapQuestion)
    .filter((q) => q.options.length > 0)
    .sort((a, b) => a.code.localeCompare(b.code)))
}

/** 지문(또는 지문 세트) 하나 = 한 판. 파트별 연습에서 고를 목록을 만든다.
 *  지문이 없는 파트(P5)는 묶을 것이 없어 빈 배열을 준다. */
export interface PassageGroup {
  /** 화면 상단에 띄울 이름 = 지문 종류('이메일'·'광고'). 지문 원문은 쓰지 않는다 —
   *  잘라 붙인 첫 줄로는 무슨 글인지 알 수 없다. */
  label: string
  questions: UiDbQuestion[]
}

/** 지문 종류 한글 이름. fromDb 의 KIND_KO 와 같은 표 — 여기서 fromDb 를 부르면 참조가 서로 물린다 */
const KIND_KO: Record<string, string> = {
  text: '지문', email: '이메일', notice: '공지', ad: '광고', article: '기사',
  chat: '문자', table: '표', form: '양식',
}

export function groupByPassage(rows: UiDbQuestion[]): PassageGroup[] {
  const byKey = new Map<string, UiDbQuestion[]>()
  for (const q of rows) {
    /* 이중·삼중 지문은 문항마다 가리키는 지문(passage.code)이 달라서, 그걸로 묶으면 한 세트가
       둘·셋으로 쪼개진다. 세트 코드가 있으면 그게 정본이다. 둘 다 없는 옛 적재분은 지문 원문으로. */
    const key = q.passage?.setCode ?? q.passage?.code
      ?? q.content.passage_text ?? q.content.passage_context ?? q.code
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(q)
  }
  return Array.from(byKey.values()).map((questions) => {
    const sorted = [...questions].sort((a, b) => a.code.localeCompare(b.code))
    const first = sorted[0]
    // 세트면 첫 지문(setSeq 순으로 정렬돼 있음)의 제목이 그 묶음의 이름이다
    const head = first.passages?.[0] ?? first.passage
    /* 교재 표기(passage_type)가 'ad' 보다 구체적이라 있으면 그걸 쓴다 — '영수증'·'일정표'·'보도문'.
       다만 '이중 지문'처럼 지문 개수를 말하는 값이 섞여 있는데, 그건 종류가 아니라 아래 passageCount 로 낸다. */
    const type = first.content.passage_type?.trim()
    const label = type && !/지문$/.test(type)
      ? type
      : KIND_KO[head?.kind ?? ''] ?? '지문'
    return { label, questions: sorted, sortKey: first.code }
  }).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ label, questions }) => ({ label, questions }))
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
    .select(Q_SELECT)
    .eq('lecture_id', anchorRow.lecture_id as number)
  if (passageText) query = query.eq('content->>passage_text', passageText)

  const { data, error } = await query
  if (error || !data || data.length === 0) return null

  const rows: UiDbQuestion[] = (data as any[])
    .map(mapQuestion)
    .filter((q) => q.options.length > 0)
    .sort((a, b) => a.code.localeCompare(b.code))

  return rows.length ? attachPassageSets(rows) : null
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

/** 화면에 넘길 보기 4칸. Part2처럼 3개뿐이면 빈 칸으로 채운다 */
function choicesTuple(q: UiDbQuestion): RCChoices {
  const texts = q.options.map((o) => o.text)
  while (texts.length < 4) texts.push('')
  return texts.slice(0, 4) as RCChoices
}

/**
 * 정답 위치. 화면 타입(rcData)이 `answer: number`라 인덱스를 넘기지만,
 * **그 인덱스를 label로부터 계산한다.** 예전에는 options 배열을 findIndex 했는데,
 * 그건 choicesTuple이 만든 배열과 우연히 순서가 같아서 맞던 것이었다.
 * 이제 보기 정렬 기준이 display_order(0014)라 둘이 갈릴 수 있어 명시적으로 맞춘다.
 */
function answerIndex(q: UiDbQuestion): number {
  const label = correctOf(q)?.label
  const i = q.options.findIndex((o) => o.label === label)
  return i >= 0 ? Math.min(i, 3) : 0
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
      answer: answerIndex(q),
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
      answer: answerIndex(q),
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
    answer: answerIndex(q),
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
  /** 커리큘럼 42강 순서(LC 1~16 → RC 17~42). 데모 강의는 null.
      fetchCurriculumLectures 만 채운다 — 문항 기준 목록(fetchLecturesWithQuestions)에는 없다 */
  seq?: number | null
  isDemo?: boolean
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

/** 커리큘럼 전체 강의(문항 없는 강의 포함) + 문항 수. 실패 시 빈 배열.
   내 학습을 커리큘럼(정규 42강)대로 보여주기 위한 목록 — 문항 있는 강의만 플레이 가능. */
export async function fetchCurriculumLectures(): Promise<DbLecture[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const [lecRes, counts] = await Promise.all([
    supabase.from('lectures').select('lecture_code, title, part, lc_rc, seq, is_demo'),
    fetchLecturesWithQuestions(),
  ])
  if (lecRes.error || !lecRes.data) return []
  const countByCode = new Map(counts.map((l) => [l.code, l.questionCount]))
  return (lecRes.data as any[])
    .map((l) => ({
      code: l.lecture_code, title: l.title, part: l.part, lcRc: l.lc_rc,
      questionCount: countByCode.get(l.lecture_code) ?? 0,
      seq: l.seq ?? null, isDemo: l.is_demo ?? false,
    }))
    .sort((a, b) => a.part - b.part || a.code.localeCompare(b.code))
}

export function useCurriculumLectures(): DbLecture[] {
  const [data, setData] = useState<DbLecture[]>([])
  useEffect(() => {
    let alive = true
    fetchCurriculumLectures().then((rows) => { if (alive) setData(rows) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return data
}

/* ── 끝낸 강의 ──
   수업을 한 판 끝내면 learner_progress 에 completed_count 가 올라간다(learningEventStore).
   '복습이 열렸는가' 같은 판단은 그 기록이 정본이다 — 화면이 따로 세면 새로고침에 날아간다. */
export async function fetchCompletedLectureCodes(): Promise<Set<string>> {
  const supabase = getSupabase()
  if (!supabase) return new Set()
  const learnerId = await getLearnerId(DEMO_LEARNER_UUID)
  const { data, error } = await supabase
    .from('learner_progress')
    .select('lecture_code, completed_count')
    .eq('learner_id', learnerId)
  if (error || !data) return new Set()
  return new Set((data as { lecture_code: string; completed_count: number }[])
    .filter((r) => (r.completed_count ?? 0) > 0)
    .map((r) => r.lecture_code))
}

export function useCompletedLectures(): Set<string> {
  const [done, setDone] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    let alive = true
    fetchCompletedLectureCodes().then((s) => { if (alive) setDone(s) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return done
}

/** 강의의 문항 전체 (code 순). 수업 화면은 첫 문항을 대표로 쓴다 */
export async function fetchLectureQuestions(lectureCode: string): Promise<UiDbQuestion[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('questions')
    .select(`${Q_SELECT}, lectures!inner(lecture_code)`)
    .eq('lectures.lecture_code', lectureCode)
  if (error || !data) return []
  return attachPassageSets((data as any[])
    .map(mapQuestion)
    .filter((q) => q.options.length > 0)
    .sort((a, b) => a.code.localeCompare(b.code)))
}
