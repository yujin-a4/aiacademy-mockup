/* ── 내 학습 '하루 흐름' 가이드 영상 ──
 *
 * 개발사(캐치잇)에 넘길 설명용 영상을 자동으로 찍는다. 이 화면의 상태들은 **실제로 돌려서는
 * 만들기 어렵다** — Day 3 까지 끝낸 화면을 보려면 강의를 아홉 개 들어야 하고, 복귀 연출은
 * 수업을 끝내고 돌아오는 그 한 번에만 나온다. 그래서 /lessons 의 ?demo* 파라미터로 상태를
 * 만들어 장면을 하나씩 찍는다(진짜 진도는 건드리지 않는다).
 *
 *   node scripts/guide-video.mjs                 # dev 서버가 3000 에 떠 있어야 한다
 *   node scripts/guide-video.mjs --headed        # 도는 것을 보면서
 *
 * 화면은 **아이패드 에어 가로(1180×820) 그대로**, 설명은 그 아래 띠에 적는다 — 자막이 화면을
 * 가리면 정작 설명하는 자리가 안 보인다(사용자 지적). 그래서 앱을 iframe 으로 얹고 바깥
 * 캔버스(1220×1020)를 찍는다. iframe 안은 부모에서 스크립트로 못 건드리지만, Playwright 는
 * frameLocator 로 눌러 주고 스크롤은 마우스 휠로 민다 — 실제 사용자가 만지는 것과 같은 길이다.
 *
 * 결과: docs/redesign/guide/learn-day-flow.mp4 (+ .webm, 장면별 png)
 */
import { chromium } from 'playwright'
import { spawnSync } from 'child_process'
import { mkdirSync, readdirSync, renameSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = 'docs/redesign/guide'
const APP = { w: 1180, h: 820 }                    // 기기 기준 = iPad Air 가로 (docs/screens 와 같다)
const CANVAS = { width: APP.w + 40, height: APP.h + 200 }  // 여백 + 아래 설명 띠
const headed = process.argv.includes('--headed')

/* 한 장면 = 상태 하나. url 은 개발사가 그대로 따라 칠 수 있게 설명 띠에 그대로 박는다.
   act: 장면 안에서 실제로 만져 보이는 동작(훑어보기·접고 펴기·전체 보기). */
const SCENES = [
  { id: '00-tour', act: 'tour', ms: 1200,
    url: '/lessons?demoDay=3',
    title: '0. 화면 한 바퀴',
    body: '오늘 보드 → 다음 Day → 남은 Day 들. 아래로 훑어본 뒤, 상태별로 하나씩 봅니다.' },

  { id: '01-start', ms: 4200,
    url: '/lessons?demoDay=3',
    title: '1. 하루의 시작 — 0/4',
    body: '오늘 보드에 그날 할 일 넷. 강의 3개는 각각 약 20분, 마지막 칸(복습)은 자물쇠로 잠겨 있다.' },

  { id: '02-one-done', ms: 5200,
    url: '/lessons?demoDay=3&demoLec=1&demoFresh=1',
    title: '2. 강의 1개를 끝내고 돌아왔을 때',
    body: '끝낸 칸의 체크가 튕기고 초록 파문 1회 → 막대가 1/4 로 밀린다 → 다음 칸이 파랗게 깨어난다.' },

  { id: '03-multi', ms: 5600,
    url: '/lessons?demoDay=3&demoLec=3&demoFresh=3',
    title: '3. 이어하기로 3개를 내리 끝내고 돌아왔을 때',
    body: '끝낸 순서대로 0.14초씩 늦춰 차례로 튕긴다. 막대는 끝낸 개수만큼 뒤(0/4)에서 출발한다.' },

  { id: '04-unlock', ms: 5600,
    url: '/lessons?demoDay=3&demoLec=3&demoFresh=1',
    title: '4. 강의를 다 들으면 복습이 풀린다',
    body: '자물쇠가 별로 바뀌며 흔들리다 튕겨 열린다. 아래 버튼도 "복습 풀기"로 바뀐다.' },

  { id: '05-close', ms: 6000,
    url: '/lessons?demoDay=3&demoLec=3&demoReview=1&demoFreshReview=1',
    title: '5. 복습까지 끝내면 하루가 닫힌다',
    body: '복습 칸이 튕기고 막대 4/4 → 축하가 끝난 뒤(약 1.1초) 오늘 보드가 완료 카드로 모핑된다.' },

  { id: '06-closed', ms: 5200,
    url: '/lessons?demoDay=3&demoLec=3&demoReview=1&demoReviewToday=1',
    title: '6. 완료한 날에 다시 들어오면',
    body: '그날 안에는 완료 카드로 남는다. 더 풀고 싶으면 자율학습, 앞서 가고 싶으면 "다음 Day 미리 시작하기".' },

  { id: '07-next-day', ms: 4600,
    url: '/lessons?demoDay=4',
    title: '7. 다음 날 — 또는 "다음 Day 미리 시작하기"를 눌렀을 때',
    body: 'Day 4 가 오늘 보드로 올라오고, 끝난 날들은 위쪽 초록 "지난 학습" 줄로 접힌다.' },

  { id: '08-day-fold', act: 'fold', ms: 2600,
    url: '/lessons?demoDay=4',
    title: '8. Day 를 눌러 펼치고 접기',
    body: '펼치면 머리 줄과 강의들이 한 판(회색) 안으로 들어간다. 높이는 240ms 에 밀려 올라온다.' },

  { id: '09-past', act: 'past', ms: 2600,
    url: '/lessons?demoDay=4',
    title: '9. 지난 학습도 같은 방식으로 펼친다',
    body: '끝낸 날들은 초록 줄 하나로 접혀 있다. 눌러 펴면 Day 별로, 다시 눌러 펴면 그날 강의로.' },

  { id: '10-all-view', act: 'all', ms: 2600,
    url: '/lessons?demoDay=4',
    title: '10. 전체 보기에서 Day 를 고르면',
    body: '12일 격자에서 Day 를 누르면 오늘 보기로 돌아가 그 Day 를 펼치고 그 자리로 데려간다.' },
]

/* 바깥 캔버스 — 위에 기기 화면(iframe), 아래에 설명 띠 */
const HARNESS = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#0F172A;font-family:Pretendard,system-ui,-apple-system,sans-serif}
  .wrap{height:100%;display:flex;flex-direction:column;align-items:center}
  .device{width:${APP.w}px;height:${APP.h}px;margin-top:20px;border-radius:14px;overflow:hidden;
    box-shadow:0 18px 50px rgba(0,0,0,.45);background:#fff;flex:none}
  iframe{width:${APP.w}px;height:${APP.h}px;border:0;display:block}
  .cap{width:${APP.w}px;padding:14px 4px 0;color:#fff;flex:none}
  .n{font-size:13px;font-weight:800;color:#93C5FD;letter-spacing:.02em}
  .t{font-size:22px;font-weight:900;margin-top:3px}
  .b{font-size:15.5px;font-weight:600;color:#CBD5E1;margin-top:7px;line-height:1.5}
  .u{font-size:12.5px;font-weight:700;color:#64748B;margin-top:9px;font-family:ui-monospace,monospace}
</style></head><body><div class="wrap">
  <div class="device"><iframe id="app" src="about:blank"></iframe></div>
  <div class="cap"><div class="n" id="n"></div><div class="t" id="t"></div>
    <div class="b" id="b"></div><div class="u" id="u"></div></div>
</div></body></html>`

const run = async () => {
  /* 산출물만 지운다 — 같은 폴더의 README.md(사람이 쓴 설명)는 남긴다.
     전에 폴더째 지웠다가 README 가 같이 날아갔다. */
  mkdirSync(OUT, { recursive: true })
  for (const f of readdirSync(OUT)) if (!f.endsWith('.md')) rmSync(join(OUT, f), { recursive: true, force: true })

  const browser = await chromium.launch({ headless: !headed })
  const ctx = await browser.newContext({
    viewport: CANVAS,
    recordVideo: { dir: join(OUT, '_raw'), size: CANVAS },
  })
  const page = await ctx.newPage()

  /* 로그인 — 미들웨어가 미로그인 접근을 로그인 화면으로 돌려보낸다 */
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /guest00/ }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 })

  await page.setContent(HARNESS)
  const app = page.frameLocator('#app')
  /* 마우스를 기기 화면 가운데에 둔다 — 휠 스크롤이 iframe 안으로 들어가게 */
  const center = { x: CANVAS.width / 2, y: 20 + APP.h / 2 }

  for (const [i, sc] of SCENES.entries()) {
    await page.evaluate(({ n, total, title, body, url, src }) => {
      document.getElementById('n').textContent = `${n} / ${total}`
      document.getElementById('t').textContent = title
      document.getElementById('b').textContent = body
      document.getElementById('u').textContent = url
      document.getElementById('app').src = src
    }, { n: i + 1, total: SCENES.length, title: sc.title, body: sc.body, url: sc.url, src: `${BASE}${sc.url}` })

    /* 강의 목록은 DB 에서 온다 — 보드가 그려질 때까지 기다린다 */
    await app.getByText(/DAY \d+/).first().waitFor({ timeout: 30000 })
    await page.mouse.move(center.x, center.y)
    await page.waitForTimeout(700)
    await page.screenshot({ path: join(OUT, `${sc.id}.png`) })

    if (sc.act === 'tour') {
      /* 아래까지 한 번 훑고 올라온다 — 휠을 잘게 굴려야 스크롤이 매끄럽게 보인다 */
      for (let k = 0; k < 26; k++) { await page.mouse.wheel(0, 130); await page.waitForTimeout(90) }
      await page.waitForTimeout(900)
      for (let k = 0; k < 26; k++) { await page.mouse.wheel(0, -130); await page.waitForTimeout(80) }
      await page.waitForTimeout(600)
    }
    if (sc.act === 'fold') {
      /* 다음 Day 한 줄을 눌러 접었다 편다 — 펼침·접힘이 둘 다 보이게 */
      const row = app.locator('#day-5 button').first()
      await row.click(); await page.waitForTimeout(1500)
      await row.click(); await page.waitForTimeout(1500)
      await row.click(); await page.waitForTimeout(1800)
    }
    if (sc.act === 'past') {
      await app.getByText('펼쳐 보기').first().click()
      await page.waitForTimeout(1500)
      await app.locator('#day-1 button').first().click()
      await page.waitForTimeout(2200)
    }
    if (sc.act === 'all') {
      await app.getByRole('button', { name: '전체' }).first().click()
      await page.waitForTimeout(2400)
      await app.getByRole('button', { name: /DAY 6/ }).first().click()
      await page.waitForTimeout(3000)
    }
    await page.waitForTimeout(sc.ms)
  }

  await ctx.close()
  await browser.close()

  /* playwright 가 이름을 무작위로 붙인다 → 하나뿐인 파일을 제자리로 옮긴다 */
  const raw = join(OUT, '_raw')
  if (existsSync(raw)) {
    const file = readdirSync(raw).find((f) => f.endsWith('.webm'))
    if (file) renameSync(join(raw, file), join(OUT, 'learn-day-flow.webm'))
    rmSync(raw, { recursive: true, force: true })
  }
  /* 메일·팀즈로 돌릴 때를 위해 mp4 도 만든다(webm 은 크롬 밖에서 안 열리는 데가 있다).
     ffmpeg 이 없으면 webm 만 두고 넘어간다 — 그것만으로도 쓸 수 있다. */
  const mp4 = join(OUT, 'learn-day-flow.mp4')
  const enc = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(OUT, 'learn-day-flow.webm'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-movflags', '+faststart', mp4], { stdio: 'inherit' })

  console.log(`✅ ${OUT}/learn-day-flow.webm${enc.status === 0 ? ' + .mp4' : ' (mp4 변환 건너뜀 — ffmpeg 없음)'}`
    + ` (+ 장면별 png ${SCENES.length}장)`)
}

run().catch((e) => { console.error('❌', e.message); process.exit(1) })
