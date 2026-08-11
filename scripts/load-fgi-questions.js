/**
 * FGI 시연 2강의 문항 적재 — 시트 "FGI 문항" → DB
 *
 * 대상: 1강 LC-P1-01(사람·동작 vs 사물·상태 사진) · 24강 RC-P5-08(능동태·수동태)
 *
 * 시트의 **문항코드(YBM_LC1_T06_Q001 …)는 우리 것이 아니다.** 콘텐츠팀이 교재를 가리키려고
 * 임의로 붙인 값이라 DB 에 없다(조회 0건). 그래서 코드로 잇지 않고 **본문으로 새로 적재**하고,
 * 코드는 우리 규칙(`<강의코드>-Q00n` 수업 / `-P00n` 실전)으로 다시 매긴다.
 *
 * 시트 열
 *   [9] 단계 = '유형 학습'(수업) | '실전 문제'(실전)   → content.stage: undefined | 'practice'
 *   [10] question(빈칸 문장·지시문) [11~14] A~D [15] 정답 라벨 [16] 정답 본문
 *   [17] 문제 해석 [18] 보기 해석 [19] 해설 [21] 문항어휘  [7] 유형  [8] 난이도
 *
 * 보기 해석·해설은 한 칸에 (A)~(D) 가 뭉쳐 있다 → 라벨로 쪼개 보기별 설명으로 넣는다.
 *
 * ⚠️ 이 스크립트는 그 강의의 **기존 문항을 지우고 새로 넣는다.** 옛 문항에 달린 보기·로그도
 *    같이 지워진다. 그래서 기본이 dry run 이고, --go 를 붙여야 실제로 쓴다.
 *
 * 사용
 *   python scripts/fetch_sheet.py 1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8   # 덤프 갱신
 *   node scripts/load-fgi-questions.js                 # 무엇이 들어갈지 보여주기만
 *   node scripts/load-fgi-questions.js --only RC       # 한쪽만
 *   node scripts/load-fgi-questions.js --go
 *
 * 적재 뒤 (LC 만)
 *   node scripts/gen_lc_audio.js --go     보기 음원 생성
 *   사진(image_url)은 이 시트에 없다 — 교재에서 따로 넣어야 한다.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const DUMP = path.join(__dirname, 'sheet_dump.json')
const TAB = 'FGI 문항'
const LABELS = ['A', 'B', 'C', 'D']

/** 시트의 강 표기 → 우리 강의코드 */
const LECTURE = { '1강': 'LC-P1-01', '24강': 'RC-P5-08' }

/* 교재에서 뽑아 둔 Part 1 사진 (scripts/extract_part1_photos.py 가 만든다).
   파일명이 곧 시트의 교재 문항코드다 — 사진과 문항을 잇는 열쇠가 그 코드 하나뿐이라 그렇게 뒀다. */
const PHOTO_DIR = path.join(__dirname, '..', 'public', 'part1', 'fgi')
function photoOf(srcCode) {
  if (!srcCode) return null
  for (const ext of ['jpeg', 'jpg', 'png']) {
    if (fs.existsSync(path.join(PHOTO_DIR, `${srcCode.toUpperCase()}.${ext}`))) {
      return `/part1/fgi/${srcCode.toUpperCase()}.${ext}`
    }
  }
  return null
}

const go = process.argv.includes('--go')
const onlyArg = (() => {
  const i = process.argv.indexOf('--only')
  return i >= 0 ? String(process.argv[i + 1] || '').toUpperCase() : null
})()

/** "(A) 여자가 … (B) 옷이 …" 처럼 뭉친 칸을 라벨별로 쪼갠다 */
function splitByLabel(text) {
  const out = {}
  if (!text) return out
  const s = String(text).replace(/\s+/g, ' ')
  const re = /\(([A-D])\)\s*/g
  const hits = []
  let m
  while ((m = re.exec(s))) hits.push({ label: m[1], at: m.index, end: re.lastIndex })
  hits.forEach((h, i) => {
    const to = i + 1 < hits.length ? hits[i + 1].at : s.length
    out[h.label] = s.slice(h.end, to).replace(/^[.\s/]+|[\s/]+$/g, '').trim()
  })
  return out
}

function readRows() {
  if (!fs.existsSync(DUMP)) throw new Error(`덤프가 없다: ${DUMP} — fetch_sheet.py 를 먼저 돌릴 것`)
  const tab = JSON.parse(fs.readFileSync(DUMP, 'utf8')).sheets.find((s) => s.name === TAB)
  if (!tab) throw new Error(`시트에 "${TAB}" 탭이 없다`)

  /* 강 표기는 블록의 첫 줄에만 있고 나머지 줄은 비어 있다 → 마지막 값을 이어받는다.
     보기가 네 칸 다 차 있는 줄만 문항으로 본다(레일 설명·머리글 줄이 섞여 있다). */
  const items = []
  let curLecture = null
  for (const row of tab.values) {
    const cell = (i) => String((row || [])[i] ?? '').trim()
    if (LECTURE[cell(1)]) curLecture = LECTURE[cell(1)]
    const opts = LABELS.map((_, i) => cell(11 + i))
    if (!curLecture || opts.some((o) => !o)) continue
    const answer = cell(15).toUpperCase()
    if (!LABELS.includes(answer)) continue

    const stage = cell(9).includes('실전') ? 'practice' : 'lesson'
    items.push({
      lecture: curLecture,
      stage,
      srcCode: cell(6),
      photoType: cell(7),
      difficulty: cell(8) || null,
      question: cell(10),
      options: opts,
      answer,
      qTrans: cell(17),
      optTrans: splitByLabel(cell(18)),
      explain: cell(19),
      vocab: cell(21),
    })
  }
  return items
}

async function main() {
  const all = readRows()
  const byLecture = new Map()
  for (const it of all) {
    if (onlyArg && !it.lecture.startsWith(onlyArg)) continue
    if (!byLecture.has(it.lecture)) byLecture.set(it.lecture, [])
    byLecture.get(it.lecture).push(it)
  }
  if (!byLecture.size) { console.log('적재할 것이 없다.'); return }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL })
  await c.connect()
  try {
    for (const [code, items] of byLecture) {
      const lec = await c.query('select id, title, part from lectures where lecture_code=$1', [code])
      if (!lec.rowCount) { console.error(`강의 없음: ${code}`); continue }
      const { id: lectureId, part } = lec.rows[0]
      const cur = await c.query('select count(*)::int n from questions where lecture_id=$1', [lectureId])

      const lesson = items.filter((i) => i.stage === 'lesson')
      const practice = items.filter((i) => i.stage === 'practice')
      console.log(`\n${code} (Part ${part}) — 지금 ${cur.rows[0].n}문항 → 새로 ${items.length}문항`)
      console.log(`  수업(유형 학습) ${lesson.length} · 실전 ${practice.length}`)
      items.forEach((it, i) => {
        const n = it.stage === 'practice' ? practice.indexOf(it) + 1 : lesson.indexOf(it) + 1
        const newCode = `${code}-${it.stage === 'practice' ? 'P' : 'Q'}${String(n).padStart(3, '0')}`
        console.log(`   ${newCode}  ${it.answer}  ${(it.question || it.options[0]).slice(0, 52)}`)
      })
      /* Part 1 은 사진이 있어야 화면이 돈다. 시트에는 사진이 없고 교재 좌표(문항코드)만 있으므로
         extract_part1_photos.py 가 미리 뽑아 둔 파일을 코드로 찾아 잇는다. */
      if (part === 1) {
        const missing = items.filter((it) => !photoOf(it.srcCode))
        if (missing.length) {
          console.log(`  ⚠️ 사진 없음 ${missing.length}장: ${missing.map((m) => m.srcCode).join(', ')}`)
          console.log('     → python scripts/extract_part1_photos.py --from-sheet 를 먼저 돌릴 것')
        } else {
          console.log(`  사진 ${items.length}장 모두 확인됨 (public/part1/fgi)`)
        }
      }

      if (!go) continue

      await c.query('begin')
      /* ── 기존 문항 치우기 ──
         questions 를 가리키는 것이 넷이다. 순서를 지켜야 FK 에 걸리지 않는다.
           item_questions     레일 아이템 ↔ 문항 연결 → 적재 뒤 build-lecture-items 로 다시 만든다
           learner_answer_log 답안 기록. 이 강의 것은 온보딩이 심은 데모 시드다(문항이 바뀌면 뜻이 없다)
           rail_checks        문항코드로 물려 있다
           question_options   보기 */
      const oldIds = 'select id from questions where lecture_id=$1'
      const gone = await c.query(`delete from item_questions where question_id in (${oldIds}) returning 1`, [lectureId])
      const logs = await c.query(`delete from learner_answer_log where question_id in (${oldIds}) returning 1`, [lectureId])
      await c.query(`delete from rail_checks where question_code in (select question_code from questions where lecture_id=$1)`, [lectureId])
      await c.query(`delete from question_options where question_id in (${oldIds})`, [lectureId])
      await c.query('delete from questions where lecture_id=$1', [lectureId])
      console.log(`  치움: 아이템 연결 ${gone.rowCount} · 답안 로그 ${logs.rowCount}(데모 시드)`)

      for (const group of [lesson, practice]) {
        for (let i = 0; i < group.length; i++) {
          const it = group[i]
          const newCode = `${code}-${it.stage === 'practice' ? 'P' : 'Q'}${String(i + 1).padStart(3, '0')}`
          const content = {
            question_text: it.question || (part === 1 ? '사진을 가장 잘 묘사한 보기를 고르시오.' : '빈칸에 알맞은 것을 고르시오.'),
            question_number: String(i + 1),
            ...(it.stage === 'practice' ? { stage: 'practice' } : {}),
            ...(part === 1
              ? { photo_type: it.photoType, ...(photoOf(it.srcCode) ? { image_url: photoOf(it.srcCode) } : {}) }
              : { blank_sentence: it.question }),
            ...(it.qTrans ? { question_translation: it.qTrans } : {}),
            ...(it.explain ? { explanation: it.explain } : {}),
            ...(it.vocab ? { vocabulary: it.vocab } : {}),
            source_code: it.srcCode,          // 교재 대조용 — 우리 코드가 아니다
          }
          const q = await c.query(
            `insert into questions (question_code, lecture_id, part, difficulty, content, display_order)
             values ($1,$2,$3,$4,$5,$6) returning id`,
            [newCode, lectureId, part, it.difficulty, content, i + 1])
          const qid = q.rows[0].id
          for (let k = 0; k < LABELS.length; k++) {
            const label = LABELS[k]
            await c.query(
              `insert into question_options (question_id, option_label, option_text, is_correct, option_explanation, display_order)
               values ($1,$2,$3,$4,$5,$6)`,
              [qid, label, it.options[k], label === it.answer, it.optTrans[label] || null, k + 1])
          }
        }
      }
      await c.query('commit')
      console.log(`  ✅ ${code} 적재 완료 — 이어서 \`node scripts/build-lecture-items.js --go\` (아이템 연결 재생성)`)
    }
    if (!go) console.log('\n보여주기만 했다. 실제로 넣으려면 --go 를 붙일 것.')
  } catch (e) {
    await c.query('rollback').catch(() => {})
    throw e
  } finally {
    await c.end()
  }
}

main().catch((e) => { console.error('\n실패:', e.message); process.exit(1) })
