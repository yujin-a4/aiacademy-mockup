/* ── 화면 스모크 검사 ─────────────────────────────────────────────────────────
   `npx tsc --noEmit` 은 "안 깨졌다" 만 말한다. 콘텐츠 파트가 보는 건 화면이라,
   화면이 **어제와 달라졌는지** 를 기계가 대신 봐야 /memo 가 루프로 돈다.

   무엇을 하나: /dev/screens 갤러리의 화면을 하나씩 열어 눈에 보이는 글자·버튼 상태를
   찍고, 저장해 둔 기준(tests/smoke/baselines/<id>.txt)과 글자 단위로 비교한다.
   다르면 **탈락**이다. 통과/탈락이 갈리니까 고쳤는지 아닌지를 사람이 안 봐도 된다.

   쓰는 법
     npm run smoke                 # 전부 검사
     npm run smoke -- end-fb-high  # 몇 개만
     npm run smoke -- --update     # 지금 화면을 새 기준으로 저장 (일부러 바꿨을 때만)
     npm run smoke -- --serve      # dev 서버가 없으면 직접 띄우고, 끝나면 내가 내린다

   규칙 넷
     · 기준을 고치는 건 `--update` 를 **일부러** 줬을 때뿐이다. 탈락했다고 자동으로 안 덮는다.
     · dev 서버가 이미 떠 있으면 손대지 않는다 — 사용자 것이다.
     · `npm run build` 는 같이 돌리지 않는다. .next 를 덮어 dev 를 죽인다.
     · 로그인은 로그인 화면의 **[guest00 (마스터) 로그인]** 버튼을 누른다. 비밀번호를 안 적는다.
       (미들웨어가 `/` 말고 전부 막으므로 로그인 없이는 갤러리에 못 들어간다)
──────────────────────────────────────────────────────────────────────────── */

import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000'
const BASELINE_DIR = path.join(process.cwd(), 'tests', 'smoke', 'baselines')

const argv = process.argv.slice(2)
const UPDATE = argv.includes('--update')
const SERVE = argv.includes('--serve')
const ONLY = argv.filter((a) => !a.startsWith('--'))

const ESC = String.fromCharCode(27)
const paint = (n) => (s) => `${ESC}[${n}m${s}${ESC}[0m`
const c = { red: paint(31), green: paint(32), yellow: paint(33), dim: paint(2) }

/* ── dev 서버 ───────────────────────────────────────────────────────────── */

async function serverUp() {
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(3000) })
    return r.status < 500
  } catch {
    return false
  }
}

let myServer = null // 내가 띄운 것만 여기 담는다 — 내가 내린다

async function ensureServer() {
  if (await serverUp()) return
  if (!SERVE) {
    console.error(c.red(`\ndev 서버가 없다 (${BASE}).`))
    console.error(`  먼저 다른 창에서 ${c.yellow('npm run dev')} 를 띄우거나,`)
    console.error(`  이 명령에 ${c.yellow('--serve')} 를 붙이면 내가 띄우고 끝나면 내린다.\n`)
    process.exit(2)
  }
  console.log(c.dim('dev 서버가 없어서 띄운다 (--serve) …'))
  myServer = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'ignore',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
  })
  myServer.unref() // 이게 없으면 검사가 끝나도 프로세스가 안 죽는다
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    if (await serverUp()) return
  }
  throw new Error('dev 서버가 90초 안에 안 떴다')
}

function stopServer() {
  if (!myServer) return
  const pid = myServer.pid
  myServer = null
  try {
    // **동기로 죽여야 한다.** 비동기로 던지고 바로 종료하면 taskkill 이 돌기 전에 프로세스가 끝나
    // dev 서버가 살아남는다(실제로 그렇게 하나 흘렸다).
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' })
    else process.kill(-pid)
  } catch {
    /* 이미 죽었으면 그만이다 */
  }
  console.log(c.dim('내가 띄운 dev 서버를 내렸다.'))
}

/* ── 브라우저 ───────────────────────────────────────────────────────────── */

async function launch() {
  const args = ['--mute-audio', '--autoplay-policy=user-gesture-required']
  try {
    return await chromium.launch({ channel: 'chrome', args }) // 이미 깔린 크롬을 쓴다
  } catch {
    return await chromium.launch({ args }) // 없으면 플레이라이트가 받아둔 것
  }
}

/* ── 로그인 ───────────────────────────────────────────────────────────────
   미들웨어(src/middleware.ts)가 `/` 를 뺀 모든 경로를 로그인 화면으로 돌려보낸다.
   로그인 화면에 개발용 **[guest00 (마스터) 로그인]** 버튼이 있어서 그걸 누른다 —
   아이디·비밀번호를 이 파일에 적지 않아도 되고, 사람이 쓰는 계정도 안 건드린다.        */

async function login(ctx) {
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const guest = page.getByRole('button', { name: /guest00/ })
  try {
    await guest.waitFor({ state: 'visible', timeout: 30000 })
  } catch {
    await page.close()
    throw new Error('로그인 화면에서 [guest00 (마스터) 로그인] 버튼을 못 찾았다 — 로그인 화면이 바뀌었나?')
  }
  await guest.click()

  // 로그인 화면을 벗어날 때까지 그냥 둔다 — 중간에 다른 데로 옮기면 로그인이 끊긴다
  // (누른 뒤 환영 화면이 잠깐 돌고 /dashboard 나 /onboarding 으로 간다)
  await page.waitForURL((u) => new URL(u).pathname !== '/', { timeout: 90000 }).catch(() => {})

  // 미들웨어가 보는 건 쿠키다. 쿠키가 앉았는지로 판정한다
  let ok = false
  for (let i = 0; i < 30 && !ok; i++) {
    await page.waitForTimeout(1000)
    ok = (await ctx.cookies()).some((k) => /^sb-.*auth-token/.test(k.name))
  }
  if (!ok) {
    await page.close()
    throw new Error('로그인을 눌렀는데 세션 쿠키(sb-*-auth-token)가 안 앉았다')
  }

  await page.goto(`${BASE}/dev/screens`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  const landed = new URL(page.url()).pathname
  await page.close()
  if (landed !== '/dev/screens') {
    throw new Error(`로그인은 됐는데 /dev/screens 가 ${landed} 로 튕겼다`)
  }
}

/* ── 화면 목록 ─────────────────────────────────────────────────────────── */

async function screenIds(ctx) {
  if (ONLY.length) return ONLY
  const page = await ctx.newPage()
  await page.goto(`${BASE}/dev/screens`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('a[href*="/dev/screens?s="]', { timeout: 30000 })
  const ids = await page.$$eval('a[href*="/dev/screens?s="]', (as) =>
    as.map((a) => decodeURIComponent(new URL(a.href).searchParams.get('s') || '')),
  )
  await page.close()
  // 강의 화면(lecture:*)은 DB 문항이 늘면 같이 바뀌므로 기준을 못 잡는다 — 이름으로 부를 때만 본다
  return [...new Set(ids)].filter((id) => id && !id.startsWith('lecture:'))
}

/* ── 화면 하나 찍기 ─────────────────────────────────────────────────────── */

const NOISE = [/favicon/i, /React DevTools/i, /webpack-hmr/i, /Fast Refresh/i]

async function snapshot(ctx, id) {
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(`[예외] ${String(e.message).slice(0, 160)}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text().slice(0, 160)
    if (NOISE.some((re) => re.test(t))) return
    problems.push(`[콘솔] ${t}`)
  })

  await page.goto(`${BASE}/dev/screens?s=${encodeURIComponent(id)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })

  const read = () =>
    page.evaluate(() => {
      const root = document.querySelector('.device-vp') || document.body
      const visible = (el) => {
        const r = el.getBoundingClientRect()
        const s = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0'
      }
      const text = (root.innerText || '')
        .split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
      const btns = Array.from(root.querySelectorAll('button, [role="button"], a[href]'))
        .filter(visible)
        .map((b) => {
          const label = (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()
          const off = b.disabled === true || b.getAttribute('aria-disabled') === 'true'
          return `[버튼] ${label || '(글자없음)'}${off ? ' · 꺼짐' : ''}`
        })
      return text.concat(btns)
    })

  // 자리를 잡을 때까지 기다린다 — 두 번 읽어서 같으면 다 그려진 것이다
  let prev = null
  let lines = []
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(500)
    lines = await read()
    const now = lines.join('\n')
    if (prev !== null && now === prev && lines.length) break
    prev = now
  }

  // 넥스트 에러 오버레이는 그 자체가 탈락이다
  const overlay = await page.locator('nextjs-portal').count().catch(() => 0)
  if (overlay) problems.push('[오류] Next.js 에러 오버레이가 떴다')

  await page.close()

  const body = lines.join('\n')
  const tail = [...new Set(problems)].sort().join('\n')
  return tail ? `${body}\n\n--- 문제 ---\n${tail}\n` : `${body}\n`
}

/* ── 비교 ─────────────────────────────────────────────────────────────── */

/* 줄을 한 칸씩 맞대 보면 한 줄만 빠져도 뒤가 통째로 밀려 전부 다르게 보인다.
   가장 긴 공통 부분(LCS)을 먼저 찾고 거기서 벗어난 줄만 ± 로 찍는다. */
function diff(expected, actual) {
  const a = expected.split('\n')
  const b = actual.split('\n')

  // lcs[i][j] = a[i..] 와 b[j..] 의 공통 줄 수
  const lcs = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out = []
  let i = 0
  let j = 0
  let same = 0 // 같은 줄이 이어지면 접어서 보여준다
  const flush = () => {
    if (same > 2) out.push(c.dim(`  … 같은 줄 ${same}개`))
    else for (let k = 0; k < same; k++) out.push(c.dim('  ⋮'))
    same = 0
  }
  while (i < a.length || j < b.length) {
    if (out.length > 40) {
      out.push(c.dim('  … (더 있음)'))
      break
    }
    if (i < a.length && j < b.length && a[i] === b[j]) {
      same++
      i++
      j++
    } else if (j < b.length && (i >= a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      flush()
      out.push(c.green(`  + ${b[j++]}`))
    } else {
      flush()
      out.push(c.red(`  - ${a[i++]}`))
    }
  }
  flush()
  return out.join('\n') || c.dim('  (다른 줄이 없다 — 파일 끝 줄바꿈 차이)')
}

/* ── 본체 ─────────────────────────────────────────────────────────────── */

async function main() {
  mkdirSync(BASELINE_DIR, { recursive: true })
  await ensureServer()
  const browser = await launch()
  // 창 하나로 쭉 간다 — 로그인 쿠키가 화면마다 살아 있어야 한다
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })

  let ids
  try {
    await login(ctx)
    ids = await screenIds(ctx)
  } catch (e) {
    await browser.close()
    throw new Error(`화면 목록을 못 읽었다 (${BASE}/dev/screens): ${e.message}`)
  }

  const pass = []
  const fail = []
  const fresh = []

  for (const id of ids) {
    process.stdout.write(c.dim(`· ${id} … `))
    let actual
    try {
      actual = await snapshot(ctx, id)
    } catch (e) {
      fail.push({ id, why: `  ${e.message.split('\n')[0]}` })
      console.log(c.red('탈락 (열다가 터졌다)'))
      continue
    }
    const file = path.join(BASELINE_DIR, `${id}.txt`)
    const had = existsSync(file)

    if (!had || UPDATE) {
      writeFileSync(file, actual, 'utf8')
      if (had) {
        pass.push(id)
        console.log(c.yellow('기준 갱신'))
      } else {
        fresh.push(id)
        console.log(c.yellow('기준 새로 만듦'))
      }
      continue
    }
    if (readFileSync(file, 'utf8') === actual) {
      pass.push(id)
      console.log(c.green('통과'))
    } else {
      fail.push({ id, why: diff(readFileSync(file, 'utf8'), actual) })
      console.log(c.red('탈락'))
    }
  }

  await browser.close()

  console.log('')
  if (fresh.length) console.log(c.yellow(`기준을 새로 잡은 화면 ${fresh.length}개 — 내용이 맞는지 한 번 훑어보세요.`))
  console.log(
    `${c.green(`통과 ${pass.length}`)} · ${fail.length ? c.red(`탈락 ${fail.length}`) : '탈락 0'} / 전체 ${ids.length}`,
  )

  if (fail.length) {
    console.log('')
    for (const f of fail) {
      console.log(c.red(`■ ${f.id}`))
      console.log(f.why)
      console.log('')
    }
    console.log(c.dim('일부러 바꾼 것이면 `npm run smoke -- --update <id>` 로 기준을 다시 잡는다.'))
    process.exitCode = 1
  }
}

process.on('exit', stopServer)
process.on('SIGINT', () => {
  stopServer()
  process.exit(130)
})

main()
  .catch((e) => {
    console.error(c.red(`\n${e.message}`))
    process.exitCode = 1
  })
  .finally(() => {
    stopServer()
    process.exit(process.exitCode || 0) // dev 서버를 띄웠으면 그냥 두면 안 죽는다
  })
