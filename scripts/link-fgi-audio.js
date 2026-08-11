/**
 * FGI 시연 강의(Part 1)에 교재 음원을 붙인다 — lc_files → public/part1/fgi → DB
 *
 * 음원 파일 이름이 곧 교재 좌표다:
 *   lc_files/YBM TOEIC LC 1000 Vol_{권}_T_5-{묶음}/Test {회차}/Test {회차}_Part 1_{문항}.mp3
 * 문항의 `content.source_code`(YBM_LC1_T06_Q001)가 같은 좌표를 가리키므로 그걸로 잇는다.
 *
 * 문항 통음원이다 — 한 파일에 보기 (A)~(D) 가 이어져 있다. 그래서 붙는 자리는 **문항**이고
 * (`content.audio_url`), 보기별 음원(question_options.audio_url)은 여기서 못 만든다.
 * 보기 하나만 다시 듣는 수업 단계는 보기 음원이 없으면 브라우저 TTS 로 폴백한다.
 *
 * 사용
 *   node scripts/link-fgi-audio.js          # 무엇이 붙는지 보여주기만
 *   node scripts/link-fgi-audio.js --go     # 파일 복사 + DB 갱신
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const ROOT = path.join(__dirname, '..')
const SRC_ROOT = path.join(ROOT, 'lc_files')
const OUT_DIR = path.join(ROOT, 'public', 'part1', 'fgi')
const LECTURES = ['LC-P1-01']
const go = process.argv.includes('--go')

/** 교재 코드 → lc_files 안의 실제 mp3 경로 (없으면 null) */
function findAudio(srcCode) {
  const m = /^YBM_LC(\d)_T(\d+)_Q(\d+)$/i.exec(srcCode || '')
  if (!m) return null
  const [, vol, test, q] = m
  const tt = String(Number(test)).padStart(2, '0')
  const qq = String(Number(q)).padStart(2, '0')
  const wanted = `Test ${tt}_Part 1_${qq}.mp3`

  /* 묶음 폴더(T_5-1 ~ T_5-5)가 어느 회차를 담는지는 폴더명으로 알 수 없다 → 훑어서 찾는다 */
  if (!fs.existsSync(SRC_ROOT)) return null
  for (const bundle of fs.readdirSync(SRC_ROOT)) {
    if (!new RegExp(`Vol_${vol}_`, 'i').test(bundle)) continue
    const bundleDir = path.join(SRC_ROOT, bundle)
    if (!fs.statSync(bundleDir).isDirectory()) continue
    for (const testDir of fs.readdirSync(bundleDir)) {
      const p = path.join(bundleDir, testDir, wanted)
      if (fs.existsSync(p)) return p
    }
  }
  return null
}

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL })
  await c.connect()
  try {
    const { rows } = await c.query(
      `select q.id, q.question_code, q.content->>'source_code' src, q.content->>'audio_url' cur
         from questions q join lectures l on l.id = q.lecture_id
        where l.lecture_code = any($1) order by q.question_code`, [LECTURES])

    let found = 0
    const plan = []
    for (const r of rows) {
      const src = findAudio(r.src)
      if (!src) {
        console.log(`  ✗ ${r.question_code}  ${r.src} — lc_files 에 없다`)
        continue
      }
      found++
      const name = `${r.src.toUpperCase()}.mp3`
      const kb = Math.round(fs.statSync(src).size / 1024)
      console.log(`  ✓ ${r.question_code}  ${r.src}  ${kb}KB`)
      plan.push({ id: r.id, src, dest: path.join(OUT_DIR, name), url: `/part1/fgi/${name}` })
    }
    console.log(`\n${found}/${rows.length}개 찾음`)
    if (!go) { console.log('보여주기만 했다. 실제로 붙이려면 --go 를 붙일 것.'); return }

    fs.mkdirSync(OUT_DIR, { recursive: true })
    for (const p of plan) {
      fs.copyFileSync(p.src, p.dest)
      /* content 는 jsonb 라 통째로 덮지 않고 그 키만 합친다 — 사진·해설이 날아가면 안 된다 */
      await c.query(`update questions set content = content || jsonb_build_object('audio_url', $2::text) where id = $1`,
        [p.id, p.url])
    }
    console.log(`✅ ${plan.length}개 복사 + DB 반영`)
  } finally {
    await c.end()
  }
}

main().catch((e) => { console.error('\n실패:', e.message); process.exit(1) })
