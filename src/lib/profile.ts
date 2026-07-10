import { createClient } from './supabase'
import type { UserProfile } from '@/store/onboardingStore'

export async function saveProfileToSupabase(profile: UserProfile) {
  console.log('[profile] saveProfileToSupabase 시작')
  const supabase = createClient()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    console.error('[profile] 세션 오류:', sessionError.message)
    return
  }
  if (!session?.user) {
    console.error('[profile] 저장 실패: 로그인 세션 없음')
    return
  }
  const user = session.user
  console.log('[profile] 저장 시도 user:', user.email, 'profile:', profile.userName)

  const { error } = await supabase.from('user_profiles').upsert({
    id: user.id,
    user_name: profile.userName,
    range_axis: profile.rangeAxis,
    rhythm: profile.rhythm,
    difficulty: profile.difficulty,
    motivation: profile.motivation,
    target_score: profile.targetScore,
    exam_date: profile.examDate,
    selected_instructor: profile.selectedInstructor,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[profile] 저장 실패:', error.message, error.code, error)
    throw new Error(`[profile] ${error.code}: ${error.message}`)
  }
  console.log('[profile] 저장 완료:', user.email)
}

export interface PartAnswerStat {
  part: number
  accuracy: number
  total: number
  correct: number
}

export interface AnswerStats {
  partStats: PartAnswerStat[]
  totalAnswered: number
  lcAccuracy: number | null
  rcAccuracy: number | null
  partDiff: Record<number, number | null>  // part → 전주 대비 %p (null = 전주 데이터 없음)
}

const DEMO_LEARNER_UUID = '11111111-1111-4111-8111-111111111111'

export async function loadAnswerStats(userId?: string): Promise<AnswerStats | null> {
  const supabase = createClient()
  let uid = userId
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null
    uid = session.user.id
  }

  const msInDay = 24 * 60 * 60 * 1000
  const now = Date.now()
  const weekAgo = new Date(now - 7 * msInDay).toISOString()
  const twoWeeksAgo = new Date(now - 14 * msInDay).toISOString()

  // 실제 유저 UUID로 먼저 시도, 없으면 데모 UUID로 폴백
  for (const tryUid of [uid, DEMO_LEARNER_UUID]) {
    const { data: logs } = await supabase
      .from('learner_answer_log')
      .select('question_id, is_correct, created_at')
      .eq('learner_id', tryUid)

    if (!logs || logs.length === 0) continue

    const qIds = Array.from(new Set(logs.map((l: any) => l.question_id)))
    const { data: questions } = await supabase
      .from('questions')
      .select('id, part')
      .in('id', qIds)

    if (!questions) continue

    const partMap = new Map<number, number>(questions.map((q: any) => [q.id, q.part]))

    const bucketAll = new Map<number, { total: number; correct: number }>()
    const bucketThis = new Map<number, { total: number; correct: number }>()
    const bucketLast = new Map<number, { total: number; correct: number }>()

    for (const log of logs as any[]) {
      const part = partMap.get(log.question_id)
      if (!part) continue
      const ts = log.created_at as string

      const addTo = (m: Map<number, { total: number; correct: number }>) => {
        const cur = m.get(part) ?? { total: 0, correct: 0 }
        cur.total++
        if (log.is_correct) cur.correct++
        m.set(part, cur)
      }

      addTo(bucketAll)
      if (ts >= weekAgo) addTo(bucketThis)
      else if (ts >= twoWeeksAgo) addTo(bucketLast)
    }

    const toAccuracy = (m: Map<number, { total: number; correct: number }>) => {
      const r = new Map<number, number>()
      Array.from(m.entries()).forEach(([part, { total, correct }]) =>
        r.set(part, Math.round((correct / total) * 100))
      )
      return r
    }

    const thisAcc = toAccuracy(bucketThis)
    const lastAcc = toAccuracy(bucketLast)

    const partDiff: Record<number, number | null> = {}
    for (const part of [1, 2, 3, 4, 5, 6, 7]) {
      const cur = thisAcc.get(part) ?? null
      const prev = lastAcc.get(part) ?? null
      partDiff[part] = cur != null && prev != null ? cur - prev : null
    }

    const partStats: PartAnswerStat[] = Array.from(bucketAll.entries())
      .map(([part, { total, correct }]) => ({
        part, total, correct,
        accuracy: Math.round((correct / total) * 100),
      }))
      .sort((a, b) => a.part - b.part)

    const avg = (parts: PartAnswerStat[]) =>
      parts.length ? Math.round(parts.reduce((s, p) => s + p.accuracy, 0) / parts.length) : null

    return {
      partStats,
      totalAnswered: logs.length,
      lcAccuracy: avg(partStats.filter(p => p.part <= 4)),
      rcAccuracy: avg(partStats.filter(p => p.part >= 5)),
      partDiff,
    }
  }

  return null
}

export async function loadProfileFromSupabase(userId?: string): Promise<UserProfile | null> {
  const supabase = createClient()
  let uid = userId
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null
    uid = session.user.id
  }

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle()

  if (!data) return null

  return {
    userName: data.user_name ?? '',
    rangeAxis: data.range_axis,
    rhythm: data.rhythm,
    difficulty: data.difficulty,
    motivation: data.motivation,
    targetScore: data.target_score,
    examDate: data.exam_date,
    selectedInstructor: data.selected_instructor,
    studyPeriod: null,
    dailyTime: null,
    studyRange: null,
  }
}
