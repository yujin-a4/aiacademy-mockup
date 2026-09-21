/**
 * FGI 진행 중에 **지금 누가 무엇을 하고 있는지** 터미널에서 본다.
 *
 * 왜 GA 화면을 안 쓰나
 *   GA4 실시간 리포트는 참가자별로 쪼개 보려면 클릭이 여러 번이고, 표준 리포트는 하루쯤 늦다.
 *   FGI 는 두 시간짜리라 그 사이에 볼 것이 필요하다. 이 파일은 **읽기만 한다** — 아무것도 안 바꾼다.
 *
 * 쓰는 법
 *   node scripts/ga-fgi-live.js            # 지금 30분 (실시간)
 *   node scripts/ga-fgi-live.js --watch    # 30초마다 다시 그린다 (Ctrl+C 로 끝)
 *   node scripts/ga-fgi-live.js --today    # 오늘 하루 누적 (실시간이 아니라 표준 리포트)
 *   node scripts/ga-fgi-live.js --all      # internal(우리)까지 같이 본다
 *
 * 인증은 공용 토큰을 그대로 쓴다 — 묻지 않는다. 죽으면 `node C:/Users/YBM/.google-scripts/login.mjs`.
 */
const { google, getAuthClient } = require('C:/Users/YBM/.google-scripts/auth.cjs')

const PROPERTY = process.env.GA_PROPERTY || 'properties/549455539'
const WATCH = process.argv.includes('--watch')
const TODAY = process.argv.includes('--today')
const ALL = process.argv.includes('--all')

/** 참가자가 실제로 '수업을 했다' 고 말할 수 있는 이벤트만 고른다 — page_view·scroll 은 소음이다 */
const SIGNAL = [
  'lesson_started', 'turn_advanced', 'stage_left', 'tutor_turn', 'tutor_reask',
  'practice_started', 'practice_submitted', 'practice_result_viewed',
  'onboarding_step', 'lc_run_started', 'review_started', 'review_finished',
]

const pad = (s, n) => String(s ?? '').padEnd(n)
const num = (s, n) => String(s ?? '').padStart(n)

/** cohort=fgi 만 본다 — 우리가 같은 시간에 앱을 쓰고 있어도 섞이지 않는다 */
const fgiOnly = ALL ? undefined : {
  filter: { fieldName: 'customUser:cohort', stringFilter: { value: 'fgi' } },
}

async function realtime(data) {
  /* ⚠️ 실시간 API 는 **`participant` 와 `eventName` 을 한 번에 못 묻는다**
     ("Selected dimensions and metrics cannot be queried together"). 그래서 세 번 나눠 묻고 여기서 합친다.
     사람별 이벤트 이름까지 쪼개 보려면 `--today`(표준 리포트)를 쓸 것. */
  const ask = (dimensions, metrics, filter = fgiOnly) => data.properties.runRealtimeReport({
    property: PROPERTY,
    requestBody: { dimensions: dimensions.map((name) => ({ name })), metrics: metrics.map((name) => ({ name })), dimensionFilter: filter ?? undefined, limit: 200 },
  }).then((r) => r.data.rows ?? [])

  const [users, counts, recency, events] = await Promise.all([
    ask(['customUser:participant'], ['activeUsers']),
    ask(['customUser:participant'], ['eventCount']),
    ask(['customUser:participant', 'minutesAgo'], ['activeUsers']),
    /* ⚠️ `eventName` 은 **user 범위 맞춤측정기준으로 거를 수 없다**(cohort 를 물리면 같은 거부가 난다).
       그래서 이 줄만 필터 없이 묻고, 아래에서 '전체 합계'라고 못박아 보여준다 — 우리 것도 섞인 수다. */
    ask(['eventName'], ['eventCount'], null),   // null 이어야 기본값(fgiOnly)이 안 먹는다
  ])

  if (!users.length) {
    console.log('  아직 아무도 안 들어왔다.' + (ALL ? '' : '  (우리 것까지 보려면 --all)'))
    return
  }

  const nOf = (rows) => new Map(rows.map((r) => [r.dimensionValues[0].value, Number(r.metricValues[0].value)]))
  const total = nOf(counts)
  /* 마지막으로 움직인 게 몇 분 전인가 — **멈춘 사람을 찾는 유일한 실마리다**(minutesAgo 는 0~29) */
  const last = new Map()
  for (const r of recency) {
    const [who, min] = r.dimensionValues.map((v) => v.value)
    const m = Number(min)
    if (!last.has(who) || m < last.get(who)) last.set(who, m)
  }

  console.log('  ' + pad('참가자', 12) + num('접속', 4) + num('이벤트', 7) + num('마지막', 8))
  for (const r of users.sort((a, b) => a.dimensionValues[0].value.localeCompare(b.dimensionValues[0].value))) {
    const who = r.dimensionValues[0].value
    const ago = last.has(who) ? `${last.get(who)}분 전` : '—'
    console.log('  ' + pad(who, 12) + num(r.metricValues[0].value, 4) + num(total.get(who) ?? 0, 7) + num(ago, 8))
  }

  const sig = events.filter((r) => SIGNAL.includes(r.dimensionValues[0].value))
  if (sig.length) {
    console.log('\n  지금 일어나는 일 (사람 구분 없는 전체 합계 — 우리 것도 섞여 있다)')
    for (const r of sig.sort((a, b) => Number(b.metricValues[0].value) - Number(a.metricValues[0].value))) {
      console.log('    ' + pad(r.dimensionValues[0].value, 24) + r.metricValues[0].value)
    }
  }
}

async function today(data) {
  const { data: r } = await data.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [{ startDate: 'today', endDate: 'today' }],
      dimensions: [{ name: 'customUser:participant' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: fgiOnly,
      limit: 500,
    },
  })
  const rows = r.rows ?? []
  if (!rows.length) { console.log('  오늘 기록이 없다.' + (ALL ? '' : '  (우리 것까지 보려면 --all)')); return }

  const per = new Map()
  for (const row of rows) {
    const [who, ev] = row.dimensionValues.map((v) => v.value)
    if (!per.has(who)) per.set(who, new Map())
    per.get(who).set(ev, Number(row.metricValues[0].value))
  }
  /* 표에 담을 것은 **하나씩 의미가 다른 다섯 개**다. 나머지는 GA 에서 보면 된다 */
  const COLS = ['lesson_started', 'turn_advanced', 'tutor_turn', 'tutor_reask', 'practice_submitted']
  console.log('  ' + pad('참가자', 12) + COLS.map((c) => num(c.replace(/_/g, ' ').slice(0, 9), 11)).join(''))
  for (const who of [...per.keys()].sort()) {
    const m = per.get(who)
    console.log('  ' + pad(who, 12) + COLS.map((c) => num(m.get(c) ?? '·', 11)).join(''))
  }
}

async function draw(data) {
  if (WATCH) process.stdout.write('\x1b[2J\x1b[H')
  const when = new Date().toLocaleTimeString('ko-KR')
  console.log(`\n  ── FGI ${TODAY ? '오늘 누적' : '실시간(최근 30분)'} · ${when} ${ALL ? '· 전체' : '· cohort=fgi'} ──\n`)
  await (TODAY ? today(data) : realtime(data))
  if (WATCH) console.log('\n  30초마다 다시 그린다. Ctrl+C 로 끝.')
}

;(async () => {
  const data = google.analyticsdata({ version: 'v1beta', auth: await getAuthClient() })
  await draw(data)
  if (WATCH) setInterval(() => draw(data).catch((e) => console.error('  ⚠️ ' + (e.errors?.[0]?.message || e.message))), 30_000)
})().catch((e) => {
  console.error('\n실패:', e.errors?.[0]?.message || e.message)
  process.exit(1)
})
