/**
 * Part 1 교재 음원을 다듬는다 — 인트로 잘라낸 통음원 + 보기 4개 (public/part1/fgi)
 *
 * 왜 필요한가
 *   교재 음원은 한 파일에 (A)~(D) 가 이어져 있다. 문항 전체 듣기는 그대로 쓰면 되지만,
 *   수업에서 강사가 **보기 하나만 다시 들려주는 단계**는 보기별 mp3 가 있어야 한다.
 *   없으면 그 자리만 브라우저 TTS 로 새서, 같은 화면에서 성우와 기계음이 번갈아 나온다.
 *
 * 어떻게 자르나 (실측한 지면 낭독 구조)
 *   [Number N.] [Look at the picture …]  (A) [문장]  (B) [문장]  (C) [문장]  (D) [문장]
 *   무음으로 끊으면 **인트로 2조각 + (라벨 1 + 문장 1) × 4 = 10조각**이 나온다(7개 파일 모두 동일).
 *   그래서 앞 2조각을 버리고 남은 것을 둘씩 묶어 A~D 로 자른다.
 *   자르는 지점은 **라벨이 시작되는 자리**다 — "(B)" 부터 들려야 어느 보기인지 안다.
 *
 * 통음원도 같이 다듬는다
 *   앞의 "Number 1. Look at the picture marked number 1 in your test book." 은 뺀다.
 *   화면에 번호와 사진이 이미 있어서 그 안내가 하는 일이 없고, 전체 듣기를 누를 때마다
 *   5초를 기다렸다 (A)가 나온다. 뒤의 '답 고르는 여백'도 같이 잘라 (A)~(D) 만 남긴다.
 *
 * 원본은 raw/ 로 옮겨 보관한다 — 다듬은 파일을 다시 분석하면 조각이 8개가 되어 건너뛰게 된다.
 * 그래서 이 스크립트는 **항상 raw/ 를 읽고** 바깥에 결과를 쓴다(여러 번 돌려도 같은 결과).
 *
 * 조각 수가 10이 아니면 그 파일은 **건너뛴다.** 잘못 자른 음원이 붙는 것보다 낫다.
 *
 * 사용
 *   node scripts/split-part1-options.js          # 어떻게 잘리는지 보여주기만
 *   node scripts/split-part1-options.js --go     # 자르고 DB 갱신
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true })
const fs = require('fs')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')
const { Client } = require('pg')

const ROOT = path.join(__dirname, '..')
const DIR = path.join(ROOT, 'public', 'part1', 'fgi')
const RAW = path.join(DIR, 'raw')      // 교재에서 그대로 복사해 온 원본
const LABELS = ['A', 'B', 'C', 'D']
const NOISE = '-35dB'      // 이 아래는 무음으로 본다
const MIN_SIL = 0.35       // 이만큼 이어져야 끊는 것으로 본다
const PAD = 0.12           // 앞을 조금 남긴다 — 라벨 첫소리가 잘리면 (A) 가 (에이)로 안 들린다
const TAIL = 0.15          // 끝도 조금 남긴다 — 마지막 자음이 잘리면 말이 끊긴 것처럼 들린다
const go = process.argv.includes('--go')

function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim())
}

/** 말이 나오는 구간 [시작, 끝] 목록 */
function speechSegments(file) {
  /* ffmpeg 는 분석 결과를 **stderr** 로 뱉는다 — execFileSync 는 stdout 만 돌려주므로 spawnSync 로 받는다 */
  const r = spawnSync('ffmpeg', ['-i', file, '-af', `silencedetect=noise=${NOISE}:d=${MIN_SIL}`, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 24 })
  const out = `${r.stderr || ''}`
  const marks = []
  for (const line of out.split('\n')) {
    let m = /silence_start:\s*([\d.]+)/.exec(line)
    if (m) { marks.push({ t: Number(m[1]), kind: 'start' }); continue }
    m = /silence_end:\s*([\d.]+)/.exec(line)
    if (m) marks.push({ t: Number(m[1]), kind: 'end' })
  }
  const total = duration(file)
  const segs = []
  let cur = 0
  for (const mk of marks) {
    if (mk.kind === 'start') { if (mk.t - cur > 0.05) segs.push([cur, mk.t]) }
    else cur = mk.t
  }
  if (total - cur > 0.05) segs.push([cur, total])
  return segs
}

function cutsFor(file) {
  const segs = speechSegments(file)
  /* 인트로 2조각(번호 + 지시문) 뒤로 라벨·문장이 4쌍 */
  if (segs.length !== 10) return { error: `말 조각이 ${segs.length}개다(10이어야 함)` }
  /* 각 보기는 **라벨 시작 ~ 그 문장 끝**이다. 다음 라벨 직전까지 늘리면 보기 사이 여백이 딸려오고,
     특히 (D) 는 시험 음원의 '답 고르는 5초' 까지 물고 들어와 8초짜리가 된다. */
  return {
    ranges: [0, 1, 2, 3].map((k) => [
      Math.max(0, segs[2 + k * 2][0] - PAD),
      segs[3 + k * 2][1] + TAIL,
    ]),
  }
}

async function main() {
  /* 처음 한 번: 바깥에 있는 원본을 raw/ 로 옮긴다. 이미 raw/ 에 있으면 그대로 둔다 */
  fs.mkdirSync(RAW, { recursive: true })
  for (const f of fs.readdirSync(DIR)) {
    if (!/^YBM_.+\.mp3$/i.test(f) || /_[A-D]\.mp3$/i.test(f)) continue
    const dest = path.join(RAW, f)
    if (!fs.existsSync(dest)) fs.renameSync(path.join(DIR, f), dest)
  }
  const files = fs.readdirSync(RAW).filter((f) => /^YBM_.+\.mp3$/i.test(f))
  if (!files.length) { console.log('자를 파일이 없다.'); return }

  const plan = []
  for (const f of files) {
    const full = path.join(RAW, f)
    const src = f.replace(/\.mp3$/i, '')
    const { ranges, error } = cutsFor(full)
    if (error) { console.log(`  ✗ ${src}: ${error} — 건너뜀`); continue }
    console.log(`  ✓ ${src}  통음원 ${ranges[0][0].toFixed(1)}~${ranges[3][1].toFixed(1)}s  |  ${ranges.map((r, i) => `${LABELS[i]} ${(r[1] - r[0]).toFixed(1)}s`).join(' · ')}`)
    plan.push({ src, full, ranges })
  }
  console.log(`\n${plan.length}/${files.length}개 자를 수 있다`)
  if (!go) { console.log('보여주기만 했다. 실제로 자르려면 --go 를 붙일 것.'); return }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL })
  await c.connect()
  try {
    let n = 0
    for (const p of plan) {
      /* 통음원 — 인트로와 끝 여백을 뺀 (A)~(D). DB 의 audio_url 은 그대로라 갱신할 것이 없다 */
      execFileSync('ffmpeg', ['-y', '-ss', String(p.ranges[0][0]), '-to', String(p.ranges[3][1]), '-i', p.full,
        '-c:a', 'libmp3lame', '-b:a', '96k', path.join(DIR, `${p.src}.mp3`)], { stdio: ['ignore', 'ignore', 'pipe'] })
      for (let i = 0; i < LABELS.length; i++) {
        const [from, to] = p.ranges[i]
        const out = path.join(DIR, `${p.src}_${LABELS[i]}.mp3`)
        execFileSync('ffmpeg', ['-y', '-ss', String(from), '-to', String(to), '-i', p.full,
          '-c:a', 'libmp3lame', '-b:a', '96k', out], { stdio: ['ignore', 'ignore', 'pipe'] })
        /* 보기 행은 문항의 source_code 로 찾는다 — 파일 이름이 그 코드다 */
        const r = await c.query(
          `update question_options o set audio_url = $1
             from questions q
            where o.question_id = q.id and q.content->>'source_code' = $2 and o.option_label = $3`,
          [`/part1/fgi/${p.src}_${LABELS[i]}.mp3`, p.src, LABELS[i]])
        n += r.rowCount
      }
    }
    console.log(`✅ 통음원 ${plan.length}개 다시 만듦 · 보기 음원 ${plan.length * 4}개 · DB ${n}행 반영`)
  } finally {
    await c.end()
  }
}

main().catch((e) => { console.error('\n실패:', e.message); process.exit(1) })
