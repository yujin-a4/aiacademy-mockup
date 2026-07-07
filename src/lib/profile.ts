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
    study_period: profile.studyPeriod,
    exam_date: profile.examDate,
    selected_instructor: profile.selectedInstructor,
    updated_at: new Date().toISOString(),
  })

  if (error) console.error('[profile] 저장 실패:', error.message, error)
  else console.log('[profile] 저장 완료:', user.email)
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
    studyPeriod: data.study_period,
    examDate: data.exam_date,
    dailyTime: data.daily_time,
    selectedInstructor: data.selected_instructor,
    studyRange: data.study_range,
  }
}
