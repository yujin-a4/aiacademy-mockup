/**
 * 주간 리포트 — "매주 월요일 07:00(KST)에 생성, 그 주 내내 고정" 캐시.
 *
 * 목업 단계라 서버 크론/DB 없이 클라이언트에서 처리한다:
 *   - 주 키(week key) = 가장 최근 월요일 07:00 KST 앵커의 날짜.
 *   - localStorage에 `유저ID + 주 키`로 저장 → 같은 주엔 캐시를 그대로 반환(고정),
 *     월요일 07:00을 넘겨 주 키가 바뀌면 그때 1회 새로 생성.
 *   - 기기 단위 저장이라 기기 간 동기화는 되지 않음(진짜 계정 단위는 서버 저장 필요).
 */

export type WeeklyReport = {
  good: string[]
  improve: string[]
  focus: string[]
}

export type WeeklyReportInputs = {
  targetScore: number
  ddayLabel: string | null
  lcAccuracy: number | null
  rcAccuracy: number | null
  totalAnswered: number
  dailyTime: string | null
  partStats: { part: number; accuracy: number; total: number }[]
}

const STORAGE_PREFIX = 'ybm_weekly_report:'

/** 가장 최근 "월요일 07:00 KST" 앵커의 날짜(YYYY-MM-DD)를 주 키로 반환한다. */
export function getReportWeekKey(now: Date = new Date()): string {
  // 기기 타임존과 무관하게 KST 벽시계로 계산: epoch를 +9h 이동시키고 UTC 필드로 읽는다.
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const daysSinceMon = (kst.getUTCDay() + 6) % 7 // Mon=0 … Sun=6

  // 이번 주 월요일 07:00 KST 앵커
  let anchor = new Date(Date.UTC(
    kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - daysSinceMon, 7, 0, 0,
  ))
  // 아직 이번 주 월요일 07:00 이전이면 지난주 앵커로.
  if (kst.getTime() < anchor.getTime()) {
    anchor = new Date(anchor.getTime() - 7 * 24 * 3600 * 1000)
  }

  const y = anchor.getUTCFullYear()
  const m = String(anchor.getUTCMonth() + 1).padStart(2, '0')
  const d = String(anchor.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 이번 주 리포트를 반환한다. 캐시가 있으면 그대로(고정), 없으면 LLM으로 1회 생성 후 저장.
 * 실패하면 null(호출부에서 카드 미표시로 graceful degrade).
 */
export async function loadWeeklyReport(
  userId: string,
  inputs: WeeklyReportInputs,
): Promise<WeeklyReport | null> {
  if (typeof window === 'undefined') return null

  const weekKey = getReportWeekKey()
  const storageKey = `${STORAGE_PREFIX}${userId}:${weekKey}`

  try {
    const cached = window.localStorage.getItem(storageKey)
    if (cached) return JSON.parse(cached) as WeeklyReport
  } catch {
    /* 파싱 실패 시 재생성으로 진행 */
  }

  try {
    const res = await fetch('/api/weekly-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs),
    })
    if (!res.ok) return null

    const data = (await res.json()) as WeeklyReport
    if (!data || !Array.isArray(data.good)) return null

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data))
      pruneOldWeeks(userId, weekKey)
    } catch {
      /* 저장 실패해도 이번 세션엔 반환값으로 표시 */
    }
    return data
  } catch {
    return null
  }
}

/** 같은 유저의 지난 주 캐시들을 정리해 localStorage가 무한정 커지지 않게 한다. */
function pruneOldWeeks(userId: string, currentWeekKey: string) {
  const keep = `${STORAGE_PREFIX}${userId}:${currentWeekKey}`
  const userPrefix = `${STORAGE_PREFIX}${userId}:`
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const k = window.localStorage.key(i)
    if (k && k.startsWith(userPrefix) && k !== keep) {
      window.localStorage.removeItem(k)
    }
  }
}
