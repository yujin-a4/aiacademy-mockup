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
      pruneOldWeeks(STORAGE_PREFIX, userId, weekKey)
    } catch {
      /* 저장 실패해도 이번 세션엔 반환값으로 표시 */
    }
    return data
  } catch {
    return null
  }
}

/* ═══════════════════════════════════════
   강사 처방전 — "이번 주에 어느 파트를 처방했는가"를 주 단위로 고정한다.
   ───────────────────────────────────────
   정답률 자체는 실시간이지만 **처방 대상 파트는 주 중에 바뀌면 안 된다.**
   월요일에 "Part 7 먼저 잡아"라고 해놓고, 학습자가 그걸 풀어서 정답률이 오르자마자
   처방이 다른 파트로 갈아치워지면 — 시킨 걸 했는데 칭찬 대신 새 숙제가 나온다.
   강사가 하루 만에 말을 바꾸는 셈이라 페르소나 신뢰도 깨진다.

   그래서 파트 id 목록만 주 키로 고정하고, 정답률·진행바는 화면에서 실시간 값을 쓴다.
   → 학습자에겐 "선생님이 짚어준 Part 7이 48% → 55%로 오르는" 것으로 보인다.
   ═══════════════════════════════════════ */

const RX_PREFIX = 'ybm_weekly_rx:'

/**
 * 이번 주 처방 대상 파트 id 목록. 이번 주에 이미 정해둔 게 있으면 그대로 쓰고,
 * 없으면 `pick()` 으로 새로 골라 저장한다.
 *
 * 빈 결과는 저장하지 않는다 — 학습 데이터가 없는 상태로 주가 시작되면
 * 그 주 내내 처방전이 빈 채로 굳어버리기 때문이다.
 */
export function resolveWeeklyPrescription(userId: string, pick: () => string[]): string[] {
  if (typeof window === 'undefined') return pick()

  const weekKey = getReportWeekKey()
  const storageKey = `${RX_PREFIX}${userId}:${weekKey}`

  try {
    const cached = window.localStorage.getItem(storageKey)
    if (cached) {
      const ids = JSON.parse(cached)
      if (Array.isArray(ids) && ids.length > 0) return ids as string[]
    }
  } catch {
    /* 파싱 실패 시 새로 고른다 */
  }

  const ids = pick()
  if (ids.length === 0) return ids

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids))
    pruneOldWeeks(RX_PREFIX, userId, weekKey)
  } catch {
    /* 저장 실패해도 이번 세션엔 반환값으로 표시 */
  }
  return ids
}

/** 같은 유저의 지난 주 캐시들을 정리해 localStorage가 무한정 커지지 않게 한다. */
function pruneOldWeeks(prefix: string, userId: string, currentWeekKey: string) {
  const keep = `${prefix}${userId}:${currentWeekKey}`
  const userPrefix = `${prefix}${userId}:`
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const k = window.localStorage.key(i)
    if (k && k.startsWith(userPrefix) && k !== keep) {
      window.localStorage.removeItem(k)
    }
  }
}
