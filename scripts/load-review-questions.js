/**
 * 복습용 유사 문항 적재 — 시트 'FGI 파트&문항' R 열 → DB
 *
 * 무엇을 위한 것인가
 *   하루의 마지막은 복습이다("동일 유형 오답 문제 풀이", curriculumSchedule.ts). 1강·24강에서
 *   **틀린 문항이 있으면 그 문항의 유사 문항**을 복습에서 낸다. 어느 문항의 짝인지가 이 적재의 핵심이라
 *   `content.review_of` 에 원문항 코드를 박는다 — 복습 화면은 그 한 칸만 보고 낼 문항을 고른다.
 *
 * 시트 R 열이 주는 것 / 주지 않는 것
 *   준다  : 교재 문항코드(첫 줄) · 보기 4개 · RC 는 빈칸 문장
 *   안 준다: **정답** · LC 사진 · LC 음원 · 해석 · 해설
 *   → 정답은 교재 해설 PDF 의 정답표에서 뽑고(scripts/extract_answer_keys.py),
 *     사진은 교재 본권에서 뽑고(scripts/extract_part1_photos.py),
 *     음원은 적재 뒤 보기 텍스트로 합성한다(scripts/gen_part1_practice_audio.js).
 *   정답을 지어내지 않는 이유는 자명하다 — 시연에서 학생에게 틀린 답을 정답이라고 하게 된다.
 *
 * 문항 코드는 우리 규칙으로 다시 매긴다: `<강의코드>-R00n` (수업 Q00n · 실전 P00n 과 같은 자리)
 *
 * ⚠️ 그 강의의 **기존 복습 문항(-R00n)을 지우고 새로 넣는다.** 기본이 dry run 이고 --go 로 쓴다.
 *
 * 사용
 *   python scripts/fetch_tab.py <시트ID> "FGI 파트&문항"        # 덤프 갱신
 *   python scripts/extract_answer_keys.py --from-sheet          # 정답 (→ _answer_keys.json)
 *   python scripts/extract_part1_photos.py <LC 유사코드…>        # LC 사진
 *   node scripts/load-review-questions.js                       # 무엇이 들어갈지 보여주기만
 *   node scripts/load-review-questions.js --go
 *   node scripts/gen_part1_practice_audio.js                    # LC 보기 음원 (적재 뒤)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const DUMP = path.join(__dirname, 'sheet_dump.json')
const KEYS = path.join(__dirname, '_answer_keys.json')
const TAB = 'FGI 파트&문항'
const PHOTO_DIR = path.join(__dirname, '..', 'public', 'part1', 'fgi')
const LABELS = ['A', 'B', 'C', 'D']
const go = process.argv.includes('--go')

/* 시트 열 (0-base) — 'FGI 파트&문항' */
const C = { src: 1, type: 2, level: 3, stage: 4, stem: 5, opts: 6, vocab: 16, similar: 17 }

/** 시트의 강 구분은 좌측 제목 줄에 있다: 'LC 1강 …' / 'RC Part 5 …' */
const LECTURE_OF = (title) => (/^LC\s*1강/.test(title) ? 'LC-P1-01' : /^RC\s*Part\s*5/.test(title) ? 'RC-P5-08' : null)

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** R 열 한 칸 → { code, stem, options[] }.
 *  첫 줄이 교재 코드, '문제:' 줄이 지문(LC 는 "(사진 묘사 …)" 라 버린다), '(A) …' 넷이 보기다. */
function parseSimilar(blob) {
  const lines = String(blob || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return null
  const code = lines[0]
  const options = {}
  const rest = []
  let stem = ''
  for (const line of lines.slice(1)) {
    const m = /^\(([A-D])\)\s*(.+)$/.exec(line)
    if (m) { options[m[1]] = clean(m[2]); continue }
    /* '문제:' 는 콜론이 전각(：)인 줄도 있다 — 손으로 옮겨 적은 흔적이다 */
    const q = /^문제\s*[:：]\s*(.+)$/.exec(line)
    if (q) { stem = clean(q[1]); continue }
    rest.push(clean(line))
  }
  /* '문제:' 를 아예 안 붙이고 지문만 적어 둔 줄도 있다(실측: YBM_RC1_T09_Q111).
     빠뜨리면 RC 문항이 지문 없이 올라가 화면에 "사진을 고르시오" 가 뜬다. */
  if (!stem && rest.length) stem = rest.join(' ')
  if (/^\(사진/.test(stem)) stem = ''      // LC — 지문이 없다. 사진이 문제다
  if (LABELS.some((l) => !options[l])) return { code, stem, options, error: '보기 4개가 안 채워졌다' }
  return { code, stem, options }
}

function photoOf(code) {
  for (const ext of ['jpeg', 'jpg', 'png']) {
    if (fs.existsSync(path.join(PHOTO_DIR, `${code}.${ext}`))) return `/part1/fgi/${code}.${ext}`
  }
  return null
}

/** 시트 → 복습 문항 목록. 원문항의 순서를 그대로 물려받는다(수업 Q001… → 복습 R001…) */
function collect() {
  const dump = JSON.parse(fs.readFileSync(DUMP, 'utf8'))
  const rows = dump.sheets.find((s) => s.name === TAB)?.values
  if (!rows) throw new Error(`시트에 "${TAB}" 탭이 없다`)
  const answers = JSON.parse(fs.readFileSync(KEYS, 'utf8'))

  const out = []
  let lecture = null
  const seq = {}
  const stageSeq = {}
  for (const r of rows) {
    const title = clean(r[0])
    const asLecture = LECTURE_OF(title)
    if (asLecture) { lecture = asLecture; continue }
    const srcCode = clean(r[C.src])
    if (!lecture || !/^YBM_/.test(srcCode)) continue

    /* 원문항의 우리 코드 — 적재기(load-fgi-questions.js)와 **같은 규칙으로 다시 센다**.
       그래야 review_of 가 실제 DB 문항을 가리킨다. */
    const stage = clean(r[C.stage]) === '실전 문제' ? 'practice' : 'lesson'
    const key = `${lecture}|${stage}`
    stageSeq[key] = (stageSeq[key] ?? 0) + 1
    const of = `${lecture}-${stage === 'practice' ? 'P' : 'Q'}${String(stageSeq[key]).padStart(3, '0')}`

    const sim = parseSimilar(r[C.similar])
    if (!sim) continue
    seq[lecture] = (seq[lecture] ?? 0) + 1
    const answer = answers[sim.code]?.answer ?? null
    out.push({
      lecture,
      code: `${lecture}-R${String(seq[lecture]).padStart(3, '0')}`,
      reviewOf: of,
      srcCode: sim.code,
      stem: sim.stem,
      options: sim.options,
      answer,
      photo: photoOf(sim.code),
      part: lecture.startsWith('LC') ? 1 : 5,
      level: clean(r[C.level]) || '중',
      typeTag: clean(r[C.type]),
      /* 낼 수 없는 문항은 **올리지 않는다** — 정답 없는 문제는 채점이 안 되고,
         사진 없는 Part 1 은 문제 자체가 성립하지 않는다. */
      error: sim.error || (!answer ? '정답을 못 찾았다' : null)
        || (lecture.startsWith('LC') && !photoOf(sim.code) ? '사진이 없다' : null)
        || (lecture.startsWith('RC') && !sim.stem ? '빈칸 문장이 없다' : null),
    })
  }
  return out
}

async function main() {
  const items = collect()

  /* review_of 가 **실제로 있는 문항**을 가리키는가. 여기가 어긋나면 복습이 조용히 아무것도
     안 낸다 — 틀린 문항의 짝을 못 찾으니까. 적재 전에 확인한다. */
  const probe = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
  await probe.connect()
  const { rows: known } = await probe.query(
    'select question_code from questions where question_code = any($1)', [items.map((i) => i.reviewOf)])
  await probe.end()
  const have = new Set(known.map((r) => r.question_code))
  for (const i of items) {
    if (!have.has(i.reviewOf)) i.error = i.error || `짝이 될 원문항 ${i.reviewOf} 이 DB 에 없다`
  }

  const ok = items.filter((i) => !i.error)
  const bad = items.filter((i) => i.error)

  for (const i of items) {
    console.log(`${i.error ? '✗' : '✓'} ${i.code}  ← ${i.reviewOf}  (${i.srcCode})`
      + `  정답 ${i.answer || '?'}${i.photo ? '  📷' : ''}  ${i.typeTag}`)
    if (i.stem) console.log(`     ${i.stem.slice(0, 78)}`)
    if (i.error) console.log(`     ⚠️ ${i.error}`)
  }
  console.log(`\n낼 수 있는 문항 ${ok.length} / ${items.length}`)
  if (bad.length) console.log(`올리지 않는 문항 ${bad.length}개 — 위 ⚠️ 를 볼 것`)
  if (!go) return console.log('\n보여주기만 했다. 실제로 쓰려면 --go 를 붙일 것.')

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try {
    await c.query('begin')
    for (const lecture of [...new Set(ok.map((i) => i.lecture))]) {
      const del = await c.query(
        `delete from questions where question_code like $1
           and lecture_id = (select id from lectures where lecture_code = $2)`,
        [`${lecture}-R%`, lecture])
      console.log(`  ${lecture}: 기존 복습 문항 ${del.rowCount}개 삭제`)
    }
    for (const [n, i] of ok.entries()) {
      const content = {
        stage: 'review',
        review_of: i.reviewOf,
        source_code: i.srcCode,
        question_text: i.stem || '사진을 가장 잘 묘사한 보기를 고르시오.',
        question_number: String(n + 1),
        ...(i.stem ? { blank_sentence: i.stem } : {}),
        ...(i.photo ? { image_url: i.photo } : {}),
        ...(i.typeTag ? { photo_type: i.typeTag } : {}),
      }
      const { rows } = await c.query(
        `insert into questions (question_code, lecture_id, part, difficulty, content, display_order)
         values ($1, (select id from lectures where lecture_code = $2), $3, $4, $5, $6)
         returning id`,
        [i.code, i.lecture, i.part, i.level, content, n + 1])
      for (const [k, label] of LABELS.entries()) {
        await c.query(
          `insert into question_options (question_id, option_label, option_text, is_correct, display_order)
           values ($1, $2, $3, $4, $5)`,
          [rows[0].id, label, i.options[label], label === i.answer, k + 1])
      }
    }
    await c.query('commit')
    console.log(`\n✅ 복습 문항 ${ok.length}개 적재`)
    console.log('   LC 음원은 아직 없다 → node scripts/gen_part1_practice_audio.js')
  } catch (e) {
    await c.query('rollback')
    throw e
  } finally {
    await c.end()
  }
}

main().catch((e) => { console.error('실패:', e.message); process.exit(1) })
