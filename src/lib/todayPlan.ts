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

/** 강의 하나를 오늘 몫으로 기록. 같은 강의를 두 번 들어도 한 번만 센다 */
export function markLectureDone(code: string) {
  if (typeof window === 'undefined' || !code) return
  const plan = load()
  if (plan.done.includes(code)) return
  plan.done.push(code)
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)) } catch { /* 저장 실패는 무시 */ }
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
