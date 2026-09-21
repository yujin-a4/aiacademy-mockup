/**
 * FGI 설문을 **강사별로** 뒤집어 본다. 폼도 응답도 건드리지 않는다 — 읽기만 한다.
 *
 * 왜 필요한가
 *   설문은 강사 이름이 아니라 **들은 순서**로 묻는다(A=첫 강의, B=두 번째, C·D 의 ①/②).
 *   순서는 사람마다 뒤집어 놓았기 때문에(카운터밸런싱), 응답을 그대로 쌓으면 두 강사가 섞여
 *   아무것도 못 읽는다. 다행히 폼 맨 앞에 **"첫/두 번째로 들은 강의의 강사"** 를 받아 두었으므로,
 *   그 두 칸을 열쇠로 삼아 A/B 와 ①/② 를 강사 이름으로 되돌릴 수 있다.
 *
 *   ⚠️ 이 열쇠를 **진행자가 안 채우거나 잘못 채우면 그 응답은 통째로 못 쓴다.** 아래에서 따로 센다.
 *
 * 쓰는 법
 *   node scripts/fgi-survey-by-instructor.js           # 강사별 표
 *   node scripts/fgi-survey-by-instructor.js --raw     # 사람별로 무엇이 어느 강사였는지도 같이
 *
 * 인증은 공용 토큰(`~/.google-scripts`)을 그대로 쓴다 — 묻지 않는다.
 */
const { google, getAuthClient } = require('C:/Users/YBM/.google-scripts/auth.cjs')

const FORM_ID = process.env.FGI_FORM_ID || '1YiugsTHqywZh59nukC-RqeDKrYekXGbDcbzPETld3XU'
const RAW = process.argv.includes('--raw')

/** 순서를 강사로 되돌리는 열쇠 — 이 두 문항이 없으면 아무것도 못 한다 */
const KEY_FIRST = /첫 번째로 들은 강의의 강사/
const KEY_SECOND = /두 번째로 들은 강의의 강사/

/** A- 는 첫 강의, B- 는 두 번째 강의를 묻는다. 짝을 맞춰 한 줄로 세운다 */
const AB_PAIRS = [
  ['A-1', 'B-1', '이미 알던 내용이었나'],
  ['A-2', 'B-2', '답까지 오래 걸렸나 (1~5, 높을수록 오래)'],
  ['A-3', 'B-3', '단계적으로 묻는 방식 (1~5, 높을수록 좋음)'],
  ['A-4', 'B-4', '넘기고 싶었던 부분'],
  ['A-5', 'B-5', '어색했던 순간'],
]

/** ①/② 로 답하는 비교 문항 — 답 자체를 강사 이름으로 바꿔 준다 */
const CHOICE_FIRST = /^①/
const CHOICE_SECOND = /^②/

const pad = (s, n) => {
  /* 한글은 터미널에서 두 칸을 먹는다 — 글자 수로 맞추면 표가 어긋난다 */
  const w = [...String(s ?? '')].reduce((a, c) => a + (/[\u1100-\u11FF\u3000-\u303F\uAC00-\uD7AF\uFF00-\uFFEF]/.test(c) ? 2 : 1), 0)
  return String(s ?? '') + ' '.repeat(Math.max(0, n - w))
}
const short = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

async function main() {
  const forms = google.forms({ version: 'v1', auth: await getAuthClient() })
  const { data: form } = await forms.forms.get({ formId: FORM_ID })

  /* questionId → 사람이 읽는 제목. 그리드는 '문항 / 행' 으로 붙인다 */
  const titleOf = new Map()
  for (const it of form.items ?? []) {
    if (it.questionItem?.question) titleOf.set(it.questionItem.question.questionId, it.title ?? '')
    for (const g of it.questionGroupItem?.questions ?? []) {
      titleOf.set(g.questionId, `${it.title ?? ''} ▸ ${g.rowQuestion?.title ?? ''}`)
    }
  }

  const { data } = await forms.forms.responses.list({ formId: FORM_ID })
  const responses = data.responses ?? []
  if (!responses.length) { console.log('\n아직 응답이 없다.\n'); return }

  /* ── 응답을 '제목 → 값' 으로 펴고, 열쇠로 강사를 붙인다 ── */
  const people = []
  const broken = []
  for (const r of responses) {
    const byTitle = new Map()
    for (const [qid, ans] of Object.entries(r.answers ?? {})) {
      byTitle.set(titleOf.get(qid) ?? qid, (ans.textAnswers?.answers ?? []).map((a) => a.value).join(' / '))
    }
    const find = (re) => [...byTitle.entries()].find(([t]) => re.test(t))?.[1]
    const first = find(KEY_FIRST)
    const second = find(KEY_SECOND)
    const when = new Date(r.lastSubmittedTime).toLocaleString('ko-KR')
    if (!first || !second || first === second) { broken.push({ when, first, second }); continue }
    people.push({ when, first, second, byTitle, find })
  }

  const names = [...new Set(people.flatMap((p) => [p.first, p.second]))].sort()
  console.log(`\n  ── FGI 설문 · 강사별 ──  응답 ${responses.length}명` +
    (broken.length ? `  (강사 칸이 비어 못 쓰는 응답 ${broken.length}건)` : ''))
  console.log(`  ${people.map((p) => `${p.when.slice(5)} ①${p.first}→②${p.second}`).join('   ')}\n`)

  /* ── 1. A/B 문항 — 순서를 강사로 되돌린다 ── */
  console.log('  【 강의별 문항 】 A(첫 강의)·B(두 번째)를 강사로 되돌린 것\n')
  for (const [aKey, bKey, label] of AB_PAIRS) {
    const bucket = new Map(names.map((n) => [n, []]))
    for (const p of people) {
      const a = p.find(new RegExp('^' + aKey + '\\.'))
      const b = p.find(new RegExp('^' + bKey + '\\.'))
      if (a !== undefined) bucket.get(p.first).push(a)
      if (b !== undefined) bucket.get(p.second).push(b)
    }
    console.log('  ' + label)
    for (const n of names) console.log('    ' + pad(n, 10) + bucket.get(n).map((v) => short(v, 46)).join('  |  '))
    console.log('')
  }

  /* ── 2. ①/② 로 고르는 비교 문항 — 답을 강사 이름으로 바꾼다 ── */
  console.log('  【 비교 문항 】 ①/② 를 강사 이름으로 바꾼 것 — **여기가 제일 읽을 만하다**\n')
  const compare = [...new Set(people.flatMap((p) => [...p.byTitle.keys()]))].filter((t) => /^C-[123]\./.test(t)).sort()
  for (const t of compare) {
    console.log('  ' + short(t, 76))
    const tally = new Map()
    for (const p of people) {
      const v = p.byTitle.get(t)
      if (v === undefined) continue
      const named = CHOICE_FIRST.test(v) ? p.first : CHOICE_SECOND.test(v) ? p.second : v
      tally.set(named, (tally.get(named) ?? 0) + 1)
    }
    for (const [k, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) console.log('    ' + pad(k, 12) + n + '명')
    console.log('')
  }

  /* ── 3. ①/② 행으로 된 그리드·자유응답 ── */
  console.log('  【 ①/② 로 나뉜 문항 】\n')
  const rowKeys = [...new Set(people.flatMap((p) => [...p.byTitle.keys()]))]
    .filter((t) => /①|②|먼저 들은|나중에 들은/.test(t) && !KEY_FIRST.test(t) && !KEY_SECOND.test(t)).sort()
  const seen = new Set()
  for (const t of rowKeys) {
    const stem = t.replace(/\s*▸.*$/, '').replace(/^(D-2|D-3)\s*[①②]?\s*/, 'D-2/3 ')
    if (!seen.has(stem)) { console.log('  ' + short(stem, 76)); seen.add(stem) }
    for (const p of people) {
      const v = p.byTitle.get(t)
      if (v === undefined) continue
      const who = /②|나중에 들은/.test(t) ? p.second : p.first
      console.log('    ' + pad(who, 10) + short(v, 60))
    }
  }
  console.log('')

  if (broken.length) {
    console.log('  ⚠️ 강사 칸이 비었거나 같은 강사를 두 번 골라 못 쓰는 응답')
    for (const b of broken) console.log(`    ${b.when}  ①${b.first ?? '(없음)'} / ②${b.second ?? '(없음)'}`)
    console.log('')
  }

  if (RAW) {
    console.log('  【 사람별 원본 】\n')
    people.forEach((p, i) => {
      console.log(`  ─ ${i + 1}번  ①${p.first} → ②${p.second}  (${p.when})`)
      for (const [t, v] of p.byTitle) console.log('    ' + pad(short(t, 52), 54) + short(v, 70))
      console.log('')
    })
  }
}

main().catch((e) => {
  console.error('\n실패:', e.errors?.[0]?.message || e.message)
  process.exit(1)
})
