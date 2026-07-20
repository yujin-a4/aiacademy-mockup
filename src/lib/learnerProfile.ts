/* 온보딩 4축 진단(W/N · C/S · R/P · D/M) → 사람이 읽는 라벨 + 튜터 에이전트 dynamic variables.
 *
 * 4축은 PR #3에서 옛 3분류(learningStyle/managementStyle/motivationType)를 대체했는데,
 * 에이전트에 넘기는 변수는 옛 이름·하드코딩 값으로 남아 있었다. 여기서 한 번에 만든다.
 *
 * ※ 옛 변수명(learning_style/management_style/motivation_type)도 함께 넘긴다 —
 *   기존 에이전트(박혜원·윤다은)의 시스템 프롬프트가 아직 그 이름을 참조하기 때문.
 *   프롬프트를 전부 새 이름으로 옮긴 뒤에는 BACK_COMPAT 블록을 지우면 된다. */

import type { UserProfile } from '@/store/onboardingStore'

export const RANGE_DESC:  Record<string, string> = { W: '골고루 학습형', N: '우선순위 학습형' }
export const DIFF_DESC:   Record<string, string> = { C: '레벨업 도전형', S: '안정 득점형' }
export const MOTIVE_DESC: Record<string, string> = { R: '성취 보상형',   P: '목표 자극형' }
export const RHYTHM_DESC: Record<string, string> = { D: '집중 몰입형',   M: '짧게 자주형' }

/** 진단 코드 4글자 — 순서는 DiagnosisResult와 동일하게 [범위][난이도][동기][리듬] */
export function learnerTypeCode(p: Partial<UserProfile>): string {
  return [p.rangeAxis, p.difficulty, p.motivation, p.rhythm].map((c) => c ?? '?').join('')
}

/** 온보딩 미완료(진단 전 바로 수업 진입) 대비 기본값 — 빈 문자열이 프롬프트에 박히지 않게 한다 */
const FALLBACK = {
  user_name: '학생',
  target_score: '800',
  study_range: '전체',
  exam_date: '미정',
  daily_time: '하루 한 시간',
  style: '분석 중',
}

/**
 * 튜터 에이전트에 넘길 dynamic variables.
 * @param p 온보딩 스토어 프로필 (useOnboardingStore()에서 그대로 넘기면 됨)
 * @param extra instructor_greeting 등 화면별로 덧붙일 값
 */
export function buildTutorVars(
  p: Partial<UserProfile>,
  extra: Record<string, string> = {},
): Record<string, string> {
  const range  = p.rangeAxis  ? RANGE_DESC[p.rangeAxis]   : FALLBACK.style
  const diff   = p.difficulty ? DIFF_DESC[p.difficulty]   : FALLBACK.style
  const motive = p.motivation ? MOTIVE_DESC[p.motivation] : FALLBACK.style
  const rhythm = p.rhythm     ? RHYTHM_DESC[p.rhythm]     : FALLBACK.style

  return {
    user_name:    p.userName || FALLBACK.user_name,
    target_score: p.targetScore ? String(p.targetScore) : FALLBACK.target_score,
    study_range:  p.studyRange || FALLBACK.study_range, // 화면이 파트명으로 덮어쓸 수 있다(extra)
    exam_date:    p.examDate || FALLBACK.exam_date,
    daily_time:   p.dailyTime || FALLBACK.daily_time,

    // 4축 진단 (신규)
    range_style:      range,
    difficulty_style: diff,
    motivation_style: motive,
    rhythm_style:     rhythm,
    learner_type:     learnerTypeCode(p),

    // ── BACK_COMPAT: 기존 에이전트 프롬프트가 참조하는 옛 이름 ──
    learning_style:  range,
    management_style: rhythm,
    motivation_type: motive,

    ...extra,
  }
}
