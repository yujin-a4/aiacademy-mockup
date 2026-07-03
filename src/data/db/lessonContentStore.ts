import { supabase } from '@/lib/supabaseClient'

export interface SubjectChoiceOption {
  id: string
  text: string
  correct: boolean
}

export interface SubjectChoiceRow {
  id: string
  questionNumber: number
  prompt: string
  options: SubjectChoiceOption[]
  evidence: string
}

/**
 * Supabase `subject_choices` 테이블에서 세부 질문용 선택지를 조회한다.
 * 테이블 스키마/시드는 docs 또는 대화 기록의 SQL 참고 (id/question_number/prompt/options(jsonb)/evidence).
 */
export async function getSubjectChoiceRow(id: string): Promise<SubjectChoiceRow | null> {
  const { data, error } = await supabase
    .from('subject_choices')
    .select('id, question_number, prompt, options, evidence')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    questionNumber: data.question_number,
    prompt: data.prompt,
    options: data.options,
    evidence: data.evidence,
  }
}
