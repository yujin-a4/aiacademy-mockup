// 리포트 베이스라인 일괄 심기 — FGI에서 참가자 전원이 같은 리포트로 시작하게 한다.
//
// 실행:
//   node scripts/seed-report-baseline.js          확인만 (아무것도 안 바꿈)
//   node scripts/seed-report-baseline.js --apply  실제로 지우고 심음 (지우기 전 백업 저장)
//
// 대상 고르기:
//   --only=ybm    ybm00~ybm50 (기본)
//   --only=guest  guest00~guest80
//   --only=all    둘 다
//   --no-demo     폴백용 데모 UUID는 건드리지 않음
//
// 심는 값은 src/lib/profile.ts 의 ensureBaselineAnswerLog 와 같은 규칙이다.
// 파트당 문항 10개 × 5회 = 50건, 최근 7일에 10건 · 8~14일 전에 40건.

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('.env.local에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const APPLY = process.argv.includes('--apply')
const WITH_DEMO = !process.argv.includes('--no-demo')
const ONLY = (process.argv.find(a => a.startsWith('--only=')) ?? '--only=ybm').split('=')[1]

const PATTERN = {
  ybm:   /^ybm\d+@ybm\.co\.kr$/i,
  guest: /^guest\d+@ybm\.co\.kr$/i,
  all:   /^(ybm|guest)\d+@ybm\.co\.kr$/i,
}[ONLY]
if (!PATTERN) { console.error(`--only 값이 잘못됐습니다: ${ONLY} (ybm | guest | all)`); process.exit(1) }

/** 화면이 로그 없는 계정에서 폴백으로 읽는 UUID. 여기도 채워야 레이더가 안 깨진다. */
const DEMO_LEARNER_UUID = '11111111-1111-4111-8111-111111111111'

const RATE = { 1: 0.9, 2: 0.86, 3: 0.76, 4: 0.7, 5: 0.6, 6: 0.5, 7: 0.46 }
const Q_PER_PART = 10
const REPEAT = 5
const RECENT_PER_PART = 10
const DAY = 86400000

async function pickQuestions() {
  const { data, error } = await sb.from('questions').select('id, part').order('id')
  if (error) throw new Error('questions 조회 실패: ' + error.message)
  const byPart = new Map()
  for (const q of data) {
    if (q.part < 1 || q.part > 7) continue
    const arr = byPart.get(q.part) ?? []
    if (arr.length < Q_PER_PART) { arr.push(q.id); byPart.set(q.part, arr) }
  }
  return byPart
}

function buildRows(learnerId, byPart) {
  const noon = new Date(); noon.setHours(12, 0, 0, 0)
  const rows = []
  Array.from(byPart.entries()).sort((a, b) => a[0] - b[0]).forEach(([part, ids]) => {
    const total = ids.length * REPEAT
    const correctCount = Math.round(total * (RATE[part] ?? 0.7))
    const recent = Math.min(RECENT_PER_PART, total)
    let i = 0
    for (const id of ids) for (let r = 0; r < REPEAT; r++, i++) {
      const isCorrect =
        Math.floor(((i + 1) * correctCount) / total) > Math.floor((i * correctCount) / total)
      const daysAgo = i < total - recent ? 8 + (i % 7) : i % 7
      rows.push({
        learner_id: learnerId, question_id: id, selected_option_label: 'A',
        is_correct: isCorrect,
        answered_at: new Date(noon.getTime() - daysAgo * DAY).toISOString(),
      })
    }
  })
  return rows
}

async function main() {
  const byPart = await pickQuestions()
  console.log('파트별로 고른 문항 수:',
    Array.from(byPart.entries()).sort((a, b) => a[0] - b[0])
      .map(([p, ids]) => `P${p}:${ids.length}`).join(' '))

  const missing = [1, 2, 3, 4, 5, 6, 7].filter(p => !byPart.has(p))
  if (missing.length) console.log('경고: 문항이 없는 파트 —', missing.join(', '))

  const preview = buildRows('preview', byPart)
  const stat = new Map()
  const partOfQ = new Map()
  Array.from(byPart.entries()).forEach(([p, ids]) => ids.forEach(id => partOfQ.set(id, p)))
  for (const r of preview) {
    const p = partOfQ.get(r.question_id)
    const cur = stat.get(p) ?? { total: 0, correct: 0 }
    cur.total++; if (r.is_correct) cur.correct++
    stat.set(p, cur)
  }
  console.log('\n심을 값 (계정마다 동일)')
  Array.from(stat.entries()).sort((a, b) => a[0] - b[0]).forEach(([p, s]) =>
    console.log(`  Part ${p}  ${Math.round((s.correct / s.total) * 100)}%  (${s.correct}/${s.total})`))
  const days = new Set(preview.map(r => r.answered_at.slice(0, 10)))
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString()
  console.log(`  총 ${preview.length}건 · 총 학습일 ${days.size}일 · 최근 7일 ${preview.filter(r => r.answered_at >= weekAgo).length}건`)

  const { data: { users }, error: uErr } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (uErr) throw new Error('계정 목록 조회 실패: ' + uErr.message)
  const targets = users.filter(u => u.email && PATTERN.test(u.email))
    .sort((a, b) => a.email.localeCompare(b.email, 'en', { numeric: true }))
  const others = users.filter(u => u.email && !PATTERN.test(u.email))

  console.log(`\n대상 계정 ${targets.length}개 (--only=${ONLY})${WITH_DEMO ? ' + 데모 UUID 1개' : ''}`)
  if (targets.length) console.log(`  ${targets[0].email} … ${targets[targets.length - 1].email}`)
  if (others.length) console.log(`건드리지 않음 ${others.length}개`)

  const ids = targets.map(u => u.id).concat(WITH_DEMO ? [DEMO_LEARNER_UUID] : [])
  const emailOf = new Map(targets.map(u => [u.id, u.email]))

  // PostgREST가 한 번에 1000건까지만 주므로 끝까지 넘겨 받는다. 백업이 잘리면 안 된다.
  const existing = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('learner_answer_log').select('id, learner_id, question_id, is_correct, answered_at')
      .in('learner_id', ids).order('id').range(from, from + PAGE - 1)
    if (error) throw new Error('기존 로그 조회 실패: ' + error.message)
    existing.push(...data)
    if (data.length < PAGE) break
  }

  const byLearner = new Map()
  for (const l of existing) byLearner.set(l.learner_id, (byLearner.get(l.learner_id) ?? 0) + 1)
  console.log(`\n지워질 기존 로그 ${existing.length}건`)
  Array.from(byLearner.entries()).forEach(([lid, n]) =>
    console.log(`  ${emailOf.get(lid) ?? '(데모 UUID)'}: ${n}건`))

  if (!APPLY) {
    console.log('\n확인만 했습니다. 실제로 반영하려면 --apply 를 붙여 다시 실행하세요.')
    return
  }

  if (existing.length) {
    const backupDir = path.join(__dirname, 'dump')
    fs.mkdirSync(backupDir, { recursive: true })
    const file = path.join(backupDir, `answer-log-backup-${Date.now()}.json`)
    fs.writeFileSync(file, JSON.stringify(existing, null, 2), 'utf8')
    console.log(`\n백업 저장: ${file}`)
  }

  const { error: dErr } = await sb.from('learner_answer_log').delete().in('learner_id', ids)
  if (dErr) throw new Error('삭제 실패: ' + dErr.message)
  console.log(`기존 로그 ${existing.length}건 삭제`)

  let inserted = 0
  for (const lid of ids) {
    const rows = buildRows(lid, byPart)
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from('learner_answer_log').insert(rows.slice(i, i + 500))
      if (error) throw new Error(`${emailOf.get(lid) ?? lid} 삽입 실패: ${error.message}`)
    }
    inserted += rows.length
  }
  console.log(`${ids.length}개 계정에 ${inserted}건 심음 (계정당 ${inserted / ids.length}건)`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
