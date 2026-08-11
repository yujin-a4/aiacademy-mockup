/**
 * GA4 맞춤 정의(맞춤 측정기준·측정항목)를 코드가 보내는 이름과 맞춰 등록한다.
 *
 * 왜 손으로 안 하나
 *   맞춤 정의는 **이름이 한 글자만 달라도 영원히 빈칸**이다. 코드가 보내는 이름(track 의 파라미터)과
 *   GA 화면에 손으로 친 이름이 어긋나면, 데이터는 계속 들어오는데 리포트에는 아무것도 안 나온다.
 *   그래서 등록을 사람 손이 아니라 이 파일 하나로 묶는다 — 아래 표가 곧 정본이다.
 *
 * ⚠️ 맞춤 정의는 **소급 적용이 안 된다.** 등록한 시점 이후 데이터만 담긴다 → FGI 시작 전에 돌려야 한다.
 *
 * 쓰는 법
 *   node scripts/ga-custom-definitions.js          # 무엇을 만들지 보여주기만 (기본값·안전)
 *   node scripts/ga-custom-definitions.js --apply  # 실제로 만든다
 *
 *   처음 한 번은 브라우저가 열려 구글 로그인을 묻는다. **GA 속성에 수정 권한이 있는 계정**으로
 *   승인해야 한다. 승인하면 scripts/token_ga.json 에 저장되고 다음부터는 안 묻는다.
 *
 * 미리 필요한 것
 *   · 이 OAuth 클라이언트가 속한 GCP 프로젝트에서 **Google Analytics Admin API 사용 설정**
 *   · 승인 계정이 해당 GA4 속성의 편집자 이상
 *
 * 여러 번 돌려도 안전하다 — 이미 있는 것은 건너뛴다.
 */
const fs = require('fs')
const path = require('path')
const { authenticate } = require('@google-cloud/local-auth')
const { google } = require('googleapis')

/** 측정 ID — 이걸로 어느 속성인지 스스로 찾는다(속성 번호를 손으로 넣지 않는다) */
const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-M1KH3TJZJB'

const SCOPES = ['https://www.googleapis.com/auth/analytics.edit']
const TOKEN_PATH = path.join(__dirname, 'token_ga.json')
const CREDENTIALS_PATH = path.join(
  __dirname, '..',
  'client_secret_643194950870-d31lfg4i5fvr33l7iaeb2tc1ts0apl7i.apps.googleusercontent.com.json',
)

/* ── 등록할 것 ──
   parameterName 은 **src/lib/analytics.ts 와 화면들이 실제로 보내는 이름**이다. 여기를 고치면
   코드도 같이 고쳐야 한다. displayName 은 리포트에 보일 이름이라 한글로 둔다.

   범위(scope)
     USER  : 사람에게 붙는 값. identify() 가 user_properties 로 심는 것만 여기 온다
     EVENT : 이벤트마다 달라지는 값

   숫자는 측정기준이 아니라 **측정항목**으로 등록해야 평균·합계를 낼 수 있다(METRICS 표). */
const DIMENSIONS = [
  // 사용자 범위 — FGI 는 이 셋이 없으면 사람별로 아무것도 못 가른다
  { parameterName: 'participant', displayName: '참가자', scope: 'USER', description: 'FGI 참가자 코드(계정 아이디 = 링크 ?p=)' },
  { parameterName: 'cohort', displayName: '집단', scope: 'USER', description: 'fgi = 참가자 / internal = 우리' },
  { parameterName: 'app_env', displayName: '환경', scope: 'USER', description: 'production / preview' },

  // 이벤트 범위
  { parameterName: 'lecture', displayName: '강의', scope: 'EVENT', description: '강의 코드(RC-P7-03 등)' },
  { parameterName: 'part', displayName: '파트', scope: 'EVENT', description: '토익 파트 1~7' },
  { parameterName: 'area', displayName: '영역', scope: 'EVENT', description: 'LC / RC' },
  { parameterName: 'stage', displayName: '단계', scope: 'EVENT', description: '수업·실전·리뷰 중 어디' },
  { parameterName: 'reason', displayName: '사유', scope: 'EVENT', description: '중단·실패 원인' },
  { parameterName: 'mode', displayName: '모드', scope: 'EVENT', description: '튜터 모드' },
  { parameterName: 'step', displayName: '스텝', scope: 'EVENT', description: '온보딩 몇 번째 단계' },
  { parameterName: 'target', displayName: '대상', scope: 'EVENT', description: '막힌 음원 등 이벤트 대상' },
  { parameterName: 'turn', displayName: '턴', scope: 'EVENT', description: '수업 턴 번호' },
  { parameterName: 'nth', displayName: '회차', scope: 'EVENT', description: '몇 번째 수업인가(리텐션)' },
]

/** measurementUnit: STANDARD(단위 없는 수) · SECONDS · MILLISECONDS · …
 *  scope 는 측정기준과 달리 **EVENT 하나뿐**인데도 빼면 거부된다(METRIC_SCOPE_UNSPECIFIED). */
const METRICS = [
  { parameterName: 'elapsed_sec', displayName: '풀이시간', scope: 'EVENT', measurementUnit: 'SECONDS', description: '실전 한 판에 걸린 시간' },
  { parameterName: 'sec', displayName: '경과초', scope: 'EVENT', measurementUnit: 'SECONDS', description: '이벤트가 일어난 시점의 경과 초' },
  { parameterName: 'dwell_sec', displayName: '결과체류', scope: 'EVENT', measurementUnit: 'SECONDS', description: '결과 화면을 들여다본 시간' },
  { parameterName: 'score_pct', displayName: '점수', scope: 'EVENT', measurementUnit: 'STANDARD', description: '실전 정답률 %' },
  { parameterName: 'pace_ratio', displayName: '속도배수', scope: 'EVENT', measurementUnit: 'STANDARD', description: 'RC 적정 시간 대비 배수(1.5 = 1.5배 걸림)' },
]

async function getAuth() {
  try {
    return google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')))
  } catch { /* 아직 승인 전 */ }

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`OAuth 클라이언트 파일이 없다: ${CREDENTIALS_PATH}`)
  }
  console.log('브라우저가 열린다 — GA 속성에 수정 권한이 있는 계정으로 승인할 것\n')
  const client = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH })
  const key = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
  const k = key.installed || key.web
  if (client.credentials?.refresh_token) {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({
      type: 'authorized_user',
      client_id: k.client_id,
      client_secret: k.client_secret,
      refresh_token: client.credentials.refresh_token,
    }))
    console.log(`승인 저장: ${TOKEN_PATH}\n`)
  }
  return client
}

/** 측정 ID 로 속성을 찾는다 — 속성이 여럿일 때 엉뚱한 곳에 만드는 사고를 막는다 */
async function findProperty(admin) {
  const { data } = await admin.accountSummaries.list({ pageSize: 200 })
  for (const acc of data.accountSummaries ?? []) {
    for (const p of acc.propertySummaries ?? []) {
      const { data: streams } = await admin.properties.dataStreams.list({ parent: p.property, pageSize: 200 })
      const hit = (streams.dataStreams ?? []).find(
        (s) => s.webStreamData?.measurementId === MEASUREMENT_ID,
      )
      if (hit) return { name: p.property, display: p.displayName, account: acc.displayName, stream: hit.displayName }
    }
  }
  return null
}

async function main() {
  const apply = process.argv.includes('--apply')
  const admin = google.analyticsadmin({ version: 'v1beta', auth: await getAuth() })

  const prop = await findProperty(admin)
  if (!prop) {
    console.error(`측정 ID ${MEASUREMENT_ID} 를 가진 속성을 못 찾았다.`)
    console.error('승인한 계정이 그 속성에 접근 권한이 있는지 확인할 것.')
    process.exit(1)
  }
  console.log(`속성: ${prop.display}  (${prop.name})`)
  console.log(`계정: ${prop.account} · 스트림: ${prop.stream} · ${MEASUREMENT_ID}\n`)

  const [{ data: curD }, { data: curM }] = await Promise.all([
    admin.properties.customDimensions.list({ parent: prop.name, pageSize: 200 }),
    admin.properties.customMetrics.list({ parent: prop.name, pageSize: 200 }),
  ])
  /* 이미 있는가는 **이름+범위**로 본다 — 같은 파라미터를 사용자/이벤트 범위로 각각 두는 경우가 있다 */
  const haveD = new Set((curD.customDimensions ?? []).map((d) => `${d.parameterName}|${d.scope}`))
  const haveM = new Set((curM.customMetrics ?? []).map((m) => m.parameterName))

  const todoD = DIMENSIONS.filter((d) => !haveD.has(`${d.parameterName}|${d.scope}`))
  const todoM = METRICS.filter((m) => !haveM.has(m.parameterName))

  const skipped = DIMENSIONS.length - todoD.length + (METRICS.length - todoM.length)
  console.log(`측정기준 ${todoD.length}개 · 측정항목 ${todoM.length}개 만들 것 (이미 있어 건너뜀 ${skipped}개)\n`)
  for (const d of todoD) console.log(`  [측정기준] ${d.parameterName.padEnd(14)} ${d.scope.padEnd(5)} ${d.displayName}`)
  for (const m of todoM) console.log(`  [측정항목] ${m.parameterName.padEnd(14)} ${m.measurementUnit.padEnd(5)} ${m.displayName}`)

  if (!apply) {
    console.log('\n보여주기만 했다. 실제로 만들려면 --apply 를 붙일 것.')
    return
  }
  if (!todoD.length && !todoM.length) {
    console.log('\n만들 것이 없다 — 이미 다 등록돼 있다.')
    return
  }

  console.log('')
  let made = 0
  for (const d of todoD) {
    try {
      await admin.properties.customDimensions.create({ parent: prop.name, requestBody: d })
      console.log(`  ✅ 측정기준 ${d.parameterName}`)
      made++
    } catch (e) {
      /* 한도(이벤트 50·사용자 25)에 걸리면 여기서 걸린다 — 나머지는 계속 시도한다 */
      console.error(`  ❌ 측정기준 ${d.parameterName}: ${e.errors?.[0]?.message || e.message}`)
    }
  }
  for (const m of todoM) {
    try {
      await admin.properties.customMetrics.create({ parent: prop.name, requestBody: m })
      console.log(`  ✅ 측정항목 ${m.parameterName}`)
      made++
    } catch (e) {
      console.error(`  ❌ 측정항목 ${m.parameterName}: ${e.errors?.[0]?.message || e.message}`)
    }
  }
  console.log(`\n${made}개 등록 완료. 리포트에 값이 차는 데는 하루쯤 걸린다(실시간·DebugView 는 바로 보인다).`)
}

main().catch((e) => {
  console.error('\n실패:', e.errors?.[0]?.message || e.message)
  if (String(e).includes('has not been used') || String(e).includes('disabled')) {
    console.error('→ GCP 콘솔에서 Google Analytics Admin API 를 사용 설정할 것.')
  }
  process.exit(1)
})
