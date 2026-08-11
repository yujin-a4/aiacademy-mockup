/**
 * GA4 — FGI 참가자가 화면에서 실제로 무엇을 하는지 본다.
 *
 * 왜 스니펫을 그대로 안 붙였나
 *   이 앱은 SPA(App Router)라 화면을 옮겨도 페이지가 새로 열리지 않는다. 기본 스니펫은
 *   **첫 진입 한 번만** 기록해서, 온보딩 → 수업 → 실전으로 옮겨 다닌 경로가 통째로 안 남는다.
 *   그래서 `send_page_view: false` 로 자동 기록을 끄고, 경로가 바뀔 때마다 직접 보낸다.
 *
 * 측정 ID 는 페이지 소스에 그대로 실리는 **공개 값**이다(비밀이 아니라 여기 적어 둔다).
 * 환경변수로 덮어쓸 수 있게만 열어 둔다 — 나중에 실험용 속성으로 갈아탈 때 쓴다.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-M1KH3TJZJB'

/** `next dev` 에서는 보내지 않는다 — 개발하며 누른 것이 FGI 데이터에 섞이면 되돌릴 수 없다 */
export const GA_ON = process.env.NODE_ENV === 'production' && !!GA_ID

/** 프리뷰(우리 확인용)와 프로덕션(FGI 본 데이터)을 나중에 갈라 볼 수 있게 모든 이벤트에 붙인다 */
export const APP_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'production'

/** 사내 화면 — 참가자 행동이 아니라서 센다고 좋을 게 없다. 통째로 뺀다 */
const INTERNAL = [/^\/dev(\/|$)/, /^\/rail-editor(\/|$)/, /^\/status(\/|$)/]
export const isInternalPath = (path: string) => INTERNAL.some((re) => re.test(path))

/* ── 참가자 표식 ──
   FGI 참가자는 **사람마다 다른 링크와 다른 계정**을 받는다. 둘 다 표식으로 쓰되 역할을 나눈다.

     누구인가(participant) ← **계정**이 정본. 사람마다 하나씩 나눠주는 것이라 기기를 바꿔도,
                             링크 없이 다시 들어와도 같은 사람으로 이어진다.
                             로그인 전 화면(로그인 자체)에서는 링크의 `?p=` 가 임시로 그 자리를 채운다.
     어느 집단인가(cohort)  ← **링크**(`?p=`)로 정한다. 우리는 파라미터 없이 들어오니 `internal`,
                             참가자는 `fgi`. GA 에서 `cohort = fgi` 하나로 내부 사용이 통째로 빠진다.
                             **기간으로 자르는 것보다 정확하다** — FGI 기간에도 우리는 이 앱을 쓴다.

   계정을 participant 로 삼되 cohort 까지 fgi 로 올리지는 않는다 — 그러면 우리가 우리 계정으로
   로그인한 것까지 전부 참가자로 잡혀서 가르는 의미가 없어진다. 다만 참가자 계정은 `ybm00`~`ybm50`
   으로 미리 파둔 번호라, 그 꼴이면 링크를 잃어버려도 참가자로 본다(아래 FGI_ID). */
const PARTICIPANT_KEY = 'ybm_fgi_participant'
const COHORT_KEY = 'ybm_fgi_cohort'
export const PARTICIPANT_PARAM = 'p'
/** 참가자용으로 파둔 계정 번호(`ybm00`~`ybm50`). 이 꼴이면 링크가 없어도 참가자로 본다 —
 *  계정 이름 규칙이 곧 안전망이다. **숫자 두 자리로 좁힌다** — `ybm`으로 시작하기만 하면
 *  다 참가자로 보면 우리가 쓰는 계정까지 딸려 들어간다. */
const FGI_ID = /^YBM\d{2}$/

let participant: string | null = null
let isFgi = false

const remember = (code: string, fgi: boolean) => {
  participant = code
  if (fgi) isFgi = true
  try {
    window.localStorage.setItem(PARTICIPANT_KEY, code)
    if (fgi) window.localStorage.setItem(COHORT_KEY, 'fgi')
  } catch { /* 시크릿 모드 등 저장이 막힌 경우 — 이번 세션에만 남는다 */ }
}

/** 링크의 `?p=` 를 읽어 저장한다. 한 번 붙으면 그 기기에서는 계속 참가자로 남는다 */
export function initParticipant(search: URLSearchParams): string | null {
  if (typeof window === 'undefined') return null
  const fromLink = (search.get(PARTICIPANT_PARAM) ?? '').trim().toUpperCase()
  if (fromLink && /^[A-Z0-9_-]{1,16}$/.test(fromLink)) {
    remember(fromLink, true)
    return participant
  }
  try {
    participant = window.localStorage.getItem(PARTICIPANT_KEY)
    isFgi = window.localStorage.getItem(COHORT_KEY) === 'fgi'
  } catch { /* 저장이 막힌 환경 */ }
  return participant
}

/** 로그인 계정으로 참가자를 확정한다(`ybm07@ybm.co.kr` → `YBM07`).
 *  링크는 기기에 붙는 표식이라 어긋날 수 있다 — 계정은 사람에게 붙으므로 이쪽이 정본이다. */
export function setParticipantFromAccount(email: string | null | undefined): string | null {
  if (typeof window === 'undefined' || !email) return participant
  const code = email.split('@')[0].trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16)
  if (!code || code === participant) return participant
  remember(code, FGI_ID.test(code))
  identify()                                  // 이미 보낸 user property 를 새 값으로 덮는다
  return participant
}

export const getParticipant = () => participant
export const getCohort = () => (isFgi ? 'fgi' : 'internal')

/** 참가자·집단은 **user property** 로도 심는다 — 이벤트 파라미터와 달리
 *  GA 리포트에서 '사용자 기준' 으로 쪼갤 수 있다(참가자별 세션 수·재방문 등) */
export function identify() {
  if (!GA_ON || typeof window === 'undefined') return
  window.gtag?.('set', 'user_properties', {
    cohort: getCohort(),
    participant: participant ?? '(none)',
    app_env: APP_ENV,
  })
}

type Value = string | number | boolean | undefined
export type EventParams = Record<string, Value>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/**
 * 이벤트 하나 보내기. **화면에서 부르는 유일한 창구다.**
 *
 *   track('practice_submitted', { lecture: 'RC-P7-08', correct: 4, total: 5 })
 *
 * GA4 규칙 — 이름은 소문자 snake_case, 파라미터는 최대 25개.
 * 값이 `undefined` 인 파라미터는 빼고 보낸다(빈 칸이 리포트에 '(not set)' 으로 쌓이는 걸 막는다).
 */
export function track(event: string, params: EventParams = {}) {
  if (!GA_ON || typeof window === 'undefined') return
  const clean: Record<string, Exclude<Value, undefined>> = {}
  for (const [k, v] of Object.entries(params)) if (v !== undefined) clean[k] = v
  window.gtag?.('event', event, {
    app_env: APP_ENV,
    cohort: getCohort(),
    ...(participant ? { participant } : {}),
    ...clean,
  })
}

/** 초 단위 경과 — 이벤트마다 `Date.now()` 를 빼는 코드가 흩어지지 않게 여기 둔다 */
export const secSince = (startMs: number) => Math.round((Date.now() - startMs) / 1000)

/* ── 첫 진입 · 몇 번째 수업인가 ──
   FGI 규모(8~9명)에서는 GA 의 '재방문 사용자' 같은 집계가 무의미하다. 대신 기기에 두 값만
   들고 있으면 **"처음 열고 첫 수업까지 얼마나 걸렸나"** 와 **"두 번째 수업으로 이어졌나"** 가 나온다.
   후자는 이 규모에서 리텐션의 유일한 실물이다. */
const FIRST_SEEN_KEY = 'ybm_first_seen'
const LESSON_COUNT_KEY = 'ybm_lesson_count'

const readNum = (key: string) => {
  try { return Number(window.localStorage.getItem(key)) || 0 } catch { return 0 }
}
const writeNum = (key: string, v: number) => {
  try { window.localStorage.setItem(key, String(v)) } catch { /* 저장이 막힌 환경 */ }
}

/** 앱을 처음 연 시각. 없으면 지금으로 찍는다 */
export function markFirstSeen() {
  if (typeof window === 'undefined') return
  if (!readNum(FIRST_SEEN_KEY)) writeNum(FIRST_SEEN_KEY, Date.now())
}

/** 수업을 한 판 시작했다 — 몇 번째인지와 첫 진입 이후 몇 초 만인지를 붙여 보낸다 */
export function trackLessonStart(params: EventParams = {}) {
  if (typeof window === 'undefined') return
  const nth = readNum(LESSON_COUNT_KEY) + 1
  writeNum(LESSON_COUNT_KEY, nth)
  const first = readNum(FIRST_SEEN_KEY)
  track('lesson_started', {
    nth,
    ...(nth === 1 && first ? { sec_since_first_open: Math.round((Date.now() - first) / 1000) } : {}),
    ...params,
  })
}

/** 화면 이동 한 번. 라우터가 바뀔 때 `Analytics` 가 부른다 */
export function pageview(path: string) {
  if (!GA_ON || typeof window === 'undefined' || isInternalPath(path)) return
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
    app_env: APP_ENV,
    cohort: getCohort(),
    ...(participant ? { participant } : {}),
  })
}
