/* ── 오늘의 수업 분량 ──
   "다음 수업으로 갈까, 내 학습으로 돌아갈까"를 정하는 유일한 근거.

   ⚠️ 목업 수준의 계산이다. 진짜 학습 계획(주 n회·시험일 역산)은 아직 없고, 내 학습 화면의
   '오늘 수업 일정'도 그 페이지 안의 하드코딩 목록에서 나온다. 여기서는 **하루 목표 강의 수**만
   두고 오늘 끝낸 강의를 localStorage 에 세어, 남았으면 다음 강의로 잇는다.
   계획 데이터가 생기면 이 파일만 갈아끼우면 된다. */

const STORAGE_KEY = 'ybm_today_plan'

/** 하루 목표 강의 수 — 커리큘럼 42강을 2주에 도는 속도(FGI 시연 기준) */
export const DAILY_QUOTA = 3

interface TodayPlan {
  /** YYYY-MM-DD (로컬 기준). 날짜가 바뀌면 통째로 리셋된다 */
  date: string
  /** 오늘 끝낸 강의 코드 (중복 없음) */
  done: string[]
}

function todayKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function load(): TodayPlan {
  const empty: TodayPlan = { date: todayKey(), done: [] }
  if (typeof window === 'undefined') return empty
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as TodayPlan
    if (!parsed || parsed.date !== empty.date || !Array.isArray(parsed.done)) return empty
    return parsed
  } catch {
    return empty
  }
}

/* ── 방금 끝낸 강의 ──
   수업을 마치고 내 학습으로 돌아왔을 때, 오늘 보드의 **그 칸**에 눈이 가게 하려고 한 칸만
   표시해 둔다. 읽는 쪽이 한 번 가져가면 지워진다(같은 축하를 두 번 하지 않는다).
   DB 에 넣지 않는 이유: 이건 학습 기록이 아니라 **이번 복귀 한 번**의 연출이다. */
const FRESH_KEY = 'ybm_just_done'
/** 돌아오는 길에 얼마나 오래 이 표시를 들고 있을 것인가 — 5분이면 '방금'이 아니다 */
const FRESH_TTL_MS = 5 * 60 * 1000

/** 강의 하나를 오늘 몫으로 기록. 같은 강의를 두 번 들어도 한 번만 센다 */
export function markLectureDone(code: string) {
  if (typeof window === 'undefined' || !code) return
  const plan = load()
  /* 다시 들은 강의라도 '방금 끝냄' 표시는 남긴다 — 화면은 돌아온 자리를 짚어 줘야 한다 */
  try { window.localStorage.setItem(FRESH_KEY, JSON.stringify({ code, at: Date.now() })) } catch { /* 무시 */ }
  if (plan.done.includes(code)) return
  plan.done.push(code)
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)) } catch { /* 저장 실패는 무시 */ }
}

/** 방금 끝낸 강의 코드를 **가져가며 지운다**. 없거나 오래됐으면 null */
export function takeJustCompleted(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(FRESH_KEY)
    if (!raw) return null
    window.localStorage.removeItem(FRESH_KEY)
    const { code, at } = JSON.parse(raw) as { code?: string; at?: number }
    if (!code || !at || Date.now() - at > FRESH_TTL_MS) return null
    return code
  } catch {
    return null
  }
}

export interface TodayProgress {
  /** 오늘 끝낸 강의 수 */
  done: number
  /** 하루 목표 */
  quota: number
  /** 목표까지 남은 수 (0이면 오늘 분량 완료) */
  remaining: number
  /** 오늘 끝낸 강의 코드 — 다음 강의를 고를 때 이미 들은 걸 건너뛴다 */
  doneCodes: string[]
}

export function getTodayProgress(): TodayProgress {
  const plan = load()
  const done = plan.done.length
  return {
    done,
    quota: DAILY_QUOTA,
    remaining: Math.max(0, DAILY_QUOTA - done),
    doneCodes: plan.done,
  }
}

/* ── 하루의 마지막 칸: 복습 ──
   강의 셋을 다 들어도 **복습을 풀어야 그 Day 가 닫힌다**(09-21 사용자 지시). 강의 완료는
   Supabase(learner_progress)가 들고 있지만 복습에는 아직 테이블이 없다 → 여기 localStorage 에
   Day 번호로 둔다. 목업 수준이고, 테이블이 생기면 이 두 함수만 갈아끼우면 된다. */
const REVIEW_KEY = 'ybm_review_done'

/** 그 Day 의 복습을 끝냈다고 적는다 */
export function markReviewDone(day: number) {
  if (typeof window === 'undefined' || !Number.isFinite(day)) return
  const days = getReviewDoneDays()
  if (days.has(day)) return
  days.add(day)
  try { window.localStorage.setItem(REVIEW_KEY, JSON.stringify(Array.from(days))) } catch { /* 무시 */ }
}

/** 복습을 끝낸 Day 번호들 */
export function getReviewDoneDays(): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(REVIEW_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(arr) ? arr.filter((n): n is number => typeof n === 'number') : [])
  } catch {
    return new Set()
  }
}
