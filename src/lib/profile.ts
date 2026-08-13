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
  try { await ensureBaselineAnswerLog(user.id) } catch (e) { console.warn('[profile] baseline seed 실패', e) }
}

/** 파트별 베이스라인 정답률. 파트당 50건에서 정답 수가 정수로 떨어지는 값만 쓴다. */
const BASELINE_TARGET: Record<number, number> = { 1: 0.9, 2: 0.86, 3: 0.76, 4: 0.7, 5: 0.6, 6: 0.5, 7: 0.46 }

/** 최근 7일에 심을 파트당 건수. 나머지는 8~14일 전에 심는다. */
const BASELINE_RECENT_PER_PART = 10

/** 계정에 답안 로그가 없으면 파트별 데모 baseline을 그 계정 uid로 심는다(온보딩 1회).
 *  이후 그 계정으로 실제 문제를 풀면 같은 uid에 쌓여 리포트가 누적된다.
 *  FGI 참가자 전원이 같은 리포트로 시작해야 해서 정답 여부와 날짜를 난수로 뽑지 않는다. */
export async function ensureBaselineAnswerLog(userId: string): Promise<void> {
  const supabase = createClient()
  const { count } = await supabase.from('learner_answer_log')
    .select('id', { count: 'exact', head: true }).eq('learner_id', userId)
  if (count && count > 0) return

  const { data: questions } = await supabase.from('questions').select('id, part')
  if (!questions || questions.length === 0) return

  const byPart = new Map<number, number[]>()
  for (const q of questions as { id: number; part: number }[]) {
    if (q.part < 1 || q.part > 7) continue
    const arr = byPart.get(q.part) ?? []
    if (arr.length < 10) { arr.push(q.id); byPart.set(q.part, arr) }
  }

  const DAY = 86400000
  // 심는 시각과 무관하게 최근 7일 경계가 흔들리지 않도록 정오로 맞춘다.
  const noon = new Date(); noon.setHours(12, 0, 0, 0)

  const rows: Record<string, unknown>[] = []
  Array.from(byPart.entries()).sort((a, b) => a[0] - b[0]).forEach(([part, ids]) => {
    const total = ids.length * 5
    const correctCount = Math.round(total * (BASELINE_TARGET[part] ?? 0.7))
    const recent = Math.min(BASELINE_RECENT_PER_PART, total)
    let i = 0
    for (const id of ids) for (let r = 0; r < 5; r++, i++) {
      // 정답을 앞쪽에 몰지 않고 전 구간에 고르게 흩는다. 총 개수는 correctCount로 딱 떨어진다.
      const isCorrect =
        Math.floor(((i + 1) * correctCount) / total) > Math.floor((i * correctCount) / total)
      // 최근 7일(0~6일 전)에 recent건, 나머지는 8~14일 전. 7일 전은 경계라 비운다.
      const daysAgo = i < total - recent ? 8 + (i % 7) : i % 7
      rows.push({
        learner_id: userId, question_id: id, selected_option_label: 'A',
        is_correct: isCorrect,
        answered_at: new Date(noon.getTime() - daysAgo * DAY).toISOString(),
      })
    }
  })
  if (rows.length) await supabase.from('learner_answer_log').insert(rows)
}

/** 로그인 유저 auth id 반환(비로그인 시 fallback). 튜터 studentId에 사용 → 답이 그 계정에 쌓임. */
export async function getLearnerId(fallback = 'demo'): Promise<string> {
  try {
    const { data: { user } } = await createClient().auth.getUser()
    return user?.id ?? fallback
  } catch { return fallback }
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
  studyDays: number         // 학습한 고유 날짜 수(실측)
  answeredThisWeek: number  // 최근 7일 풀이 수(실측)
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
      .select('question_id, is_correct, answered_at')
      .eq('learner_id', tryUid)

    if (!logs || logs.length === 0) continue

    const qIds = Array.from(new Set(logs.map((l: any) => l.question_id)))
    const { data: questions } = await supabase
      .from('questions')
      .select('id, part')
      .in('id', qIds)

    if (!questions) continue

    // 학습일수(고유 날짜)·이번 주 풀이 수 — 파트 매칭과 무관하게 로그 전체 기준
    const studyDaySet = new Set<string>()
    let answeredThisWeek = 0
    for (const log of logs as any[]) {
      const ts = log.answered_at as string | undefined
      if (!ts) continue
      studyDaySet.add(ts.slice(0, 10))
      if (ts >= weekAgo) answeredThisWeek++
    }

    const partMap = new Map<number, number>(questions.map((q: any) => [q.id, q.part]))

    const bucketAll = new Map<number, { total: number; correct: number }>()
    const bucketThis = new Map<number, { total: number; correct: number }>()
    const bucketLast = new Map<number, { total: number; correct: number }>()

    for (const log of logs as any[]) {
      const part = partMap.get(log.question_id)
      if (!part) continue
      const ts = log.answered_at as string

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
      studyDays: studyDaySet.size,
      answeredThisWeek,
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
    // 최근 시험 결과는 아직 user_profiles 컬럼이 없다 — 온보딩 스토어(localStorage)에만 남는다
    lastExamDate: null,
    currentLcScore: null,
    currentRcScore: null,
  }
}
