/**
 * 튜터 엔진용 Supabase 문항 로더 (서버 전용).
 *
 * 스캐폴딩 DB(questions / question_options / wrong_answer_tags / step_types)를
 * 엔진이 쓰는 형태로 변환한다. 모든 사실(지문·보기·정답·근거·오답이유·태그)은
 * DB 원문만 사용 — 엔진/에이전트는 사실을 생성하지 않는다 (S-CHNXPN).
 *
 * RLS 기준 anon 키로 충분: 문항/마스터는 읽기 허용, learner_answer_log는 insert 허용.
 */
import { getSupabase } from '@/lib/supabaseClient'

export interface DbWrongTag {
  id: number
  name: string
  meaning: string
  missedPoint: string | null
  /** 기본 스캐폴딩 단계 시퀀스 (예: ['S1','S6','S5']. 'S1/S2' 같은 복합 표기 가능) */
  steps: string[]
  /** "S1: ... / S6: ... / S5: ..." 형태의 단계별 제공 내용 요약 */
  stepSummary: string | null
  /** 동일 태그 반복 시 추가 단계 설명 (예: "동일 태그 반복 시 S2 ... 추가") */
  repeatExtra: string | null
  diagnosticName: string | null
}

export interface DbOption {
  label: string
  text: string
  correct: boolean
  explanation: string | null
  evidence: string | null
  tag: DbWrongTag | null
}

export interface DbTutorQuestion {
  code: string
  part: number
  lectureCode: string
  lectureTitle: string
  difficulty: string | null
  /** Part별 가변 필드 (blank_sentence / passage_text / question_text 등) */
  content: Record<string, string>
  options: DbOption[]
  answerLabel: string
  answerText: string
  evidence: string
}

export interface StepTypeInfo {
  code: string
  name: string
  role: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function loadDbQuestion(questionCode: string): Promise<DbTutorQuestion | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('questions')
    .select(`
      question_code, part, difficulty, content,
      lectures ( lecture_code, title ),
      question_options (
        option_label, option_text, is_correct, option_explanation, correct_evidence,
        wrong_answer_tags (
          id, tag_name, tag_meaning, missed_point,
          default_step_sequence, step_summary, repeat_extra_step,
          diagnostic_categories ( name )
        )
      )
    `)
    .eq('question_code', questionCode)
    .maybeSingle()

  if (error || !data) return null

  const lec: any = data.lectures
  const options: DbOption[] = ((data.question_options as any[]) ?? [])
    .sort((a, b) => String(a.option_label).localeCompare(String(b.option_label)))
    .map((o) => {
      const t: any = o.wrong_answer_tags
      return {
        label: o.option_label,
        text: o.option_text,
        correct: o.is_correct,
        explanation: o.option_explanation,
        evidence: o.correct_evidence,
        tag: t
          ? {
              id: t.id,
              name: t.tag_name,
              meaning: t.tag_meaning,
              missedPoint: t.missed_point,
              steps: t.default_step_sequence ?? [],
              stepSummary: t.step_summary,
              repeatExtra: t.repeat_extra_step,
              diagnosticName: t.diagnostic_categories?.name ?? null,
            }
          : null,
      }
    })

  const answer = options.find((o) => o.correct)
  if (!answer) return null

  return {
    code: data.question_code,
    part: data.part,
    lectureCode: lec?.lecture_code ?? '',
    lectureTitle: lec?.title ?? '',
    difficulty: data.difficulty,
    content: (data.content as Record<string, string>) ?? {},
    options,
    answerLabel: answer.label,
    answerText: answer.text,
    evidence: answer.evidence ?? '',
  }
}

export interface LectureStep {
  order: number
  code: string          // 'S2', 'S2+S3', 'S5①' 등 시트 원문
  rule: string          // AI가 따라야 할 규칙 (고정)
  dbFields: string | null
  freeExpression: string | null
}

/** 강의별 유형학습 레일 (lecture_steps — 시트 유형학습_G 탭 이관분). 없으면 빈 배열 */
export async function loadLectureSteps(lectureCode: string): Promise<LectureStep[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('lecture_steps')
    .select('step_order, step_code, fixed_rule, db_fields, free_expression, lectures!inner(lecture_code)')
    .eq('lectures.lecture_code', lectureCode)
    .order('step_order')
  return (data ?? []).map((s: any) => ({
    order: s.step_order,
    code: s.step_code,
    rule: s.fixed_rule,
    dbFields: s.db_fields,
    freeExpression: s.free_expression,
  }))
}

let stepTypesCache: Map<string, StepTypeInfo> | null = null

export async function loadStepTypes(): Promise<Map<string, StepTypeInfo>> {
  if (stepTypesCache) return stepTypesCache
  const supabase = getSupabase()
  if (!supabase) return new Map()
  const { data } = await supabase.from('step_types').select('code, name, role')
  stepTypesCache = new Map((data ?? []).map((s: any) => [s.code, { code: s.code, name: s.name, role: s.role }]))
  return stepTypesCache
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** 목업용: auth 도입 전까지 비 UUID studentId(예: 'demo')는 고정 UUID로 매핑 */
const DEMO_LEARNER_UUID = '11111111-1111-4111-8111-111111111111'

export function normalizeLearnerId(studentId: string | undefined): string {
  return studentId && UUID_RE.test(studentId) ? studentId : DEMO_LEARNER_UUID
}

/** 답안 기록. questions.id가 필요해 question_code로 조회 후 insert */
export async function logAnswer(
  learnerId: string,
  questionCode: string,
  selectedLabel: string,
  isCorrect: boolean,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  const { data: q } = await supabase.from('questions').select('id').eq('question_code', questionCode).maybeSingle()
  if (!q) return
  await supabase.from('learner_answer_log').insert({
    learner_id: learnerId,
    question_id: (q as any).id,
    selected_option_label: selectedLabel,
    is_correct: isCorrect,
  })
}

/**
 * 이 학습자가 과거에 같은 오답 태그로 틀린 횟수 (이번 답안 기록 전 기준).
 * learner_answer_log에는 태그가 저장되지 않으므로 선택지 테이블과 대조해 센다.
 */
export async function countPriorTagWrongs(learnerId: string, tagId: number): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0

  const { data: logs } = await supabase
    .from('learner_answer_log')
    .select('question_id, selected_option_label')
    .eq('learner_id', learnerId)
    .eq('is_correct', false)
  if (!logs || logs.length === 0) return 0

  const qIds = Array.from(new Set(logs.map((l: any) => l.question_id)))
  const { data: opts } = await supabase
    .from('question_options')
    .select('question_id, option_label, option_error_tag_id')
    .in('question_id', qIds)
  if (!opts) return 0

  const tagOf = new Map(opts.map((o: any) => [`${o.question_id}|${o.option_label}`, o.option_error_tag_id]))
  return logs.filter((l: any) => tagOf.get(`${l.question_id}|${l.selected_option_label}`) === tagId).length
}
