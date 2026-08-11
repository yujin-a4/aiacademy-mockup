/**
 * FGI 시연 대본 → 수업 턴 — 시트 "시트66" → src/data/typeLearning/fgiScenario.ts
 *
 * 왜 코드가 아니라 생성기인가
 *   시연 2강의는 **강사가 할 말을 대본으로 다 정해 둔다.** 평소 수업은 레일(단계)만 DB 에 두고
 *   발화는 LLM 이 만드는데, 시연에서는 그 자유도가 위험이다(docs/tutor-control-plan.md §6 D단계).
 *   대본은 시트가 정본이라 손으로 옮기지 않고 여기서 뽑아 쓴다 — 시트가 바뀌면 다시 돌리면 된다.
 *
 * 시트 구조 (한 문항 = 한 블록)
 *   유형 학습 N / ID: YBM_LC1_T06_Q001 / 사진: … / 정답: B. …
 *   단계 | 강사 진행 | 학생 방식 | 학생 예시 답변
 *
 * 학생 방식 → 화면 상호작용
 *   2지선다 → choice(2개)   말하기 → subjective   A~D → pickAnswer   O/X → choice(O/X)   듣기 → next
 *
 * 2지선다는 시트에 보기가 따로 없다 — 강사 발화에서 뽑는다("A인가요, 아니면 B인가요?" / "A와 B 중").
 * 못 뽑으면 그 턴은 **말하기로 낮춘다**(엉뚱한 두 버튼을 세우는 것보다 낫다). 뽑은 결과는 아래
 * 출력에 다 찍히므로 눈으로 확인할 것.
 *
 * 사용
 *   python scripts/fetch_sheet.py 1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8
 *   node scripts/build-fgi-scenario.js          # 무엇이 만들어지는지 보여주기만
 *   node scripts/build-fgi-scenario.js --go     # 파일 쓰기
 */
const fs = require('fs')
const path = require('path')

const DUMP = path.join(__dirname, 'sheet_dump.json')
const OUT = path.join(__dirname, '..', 'src', 'data', 'typeLearning', 'fgiScenario.ts')
const TAB = '시트66'
const LECTURE = 'LC-P1-01'          // 이 대본이 붙는 강의
/* 시트에는 개정 이력이 아래로 계속 이어져 있다 — **쓰기로 한 구간만** 읽는다(1-base, 양끝 포함).
   범위를 안 자르면 뒤쪽 초안까지 딸려 들어와 같은 단계가 두 번 세 번 나온다(실측 57턴). */
const ROWS = [6, 46]
const go = process.argv.includes('--go')

const clean = (s) => String(s ?? '')
  /* 시트 대본은 통째로 겹따옴표(“ ”)로 감싸여 있다 — 낭독되는 문장이라 벗긴다.
     문자 클래스에 직접 적으면 파일 인코딩에 따라 안 잡히므로 유니코드 이스케이프로 적는다. */
  .replace(/[“”″]/g, '')
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ')
  .replace(/^"|"$/g, '')
  .trim()

/** "A인가요, 아니면 B인가요?" · "A와 B 중" 에서 두 갈래를 뽑는다 */
function twoChoices(tutor, sample) {
  const t = clean(tutor)
  let a = null
  let b = null
  /* 왼쪽 갈래는 **문장 경계를 넘지 않는다** — 마침표·따옴표를 허용하면 앞 문장까지 통째로 딸려온다
     (실측: "이번 사진은 상태 표현을 …" 이 선택지 하나가 됐다). 길이도 30자로 묶는다. */
  let m = /([^,.?"]{2,30}?)인가요[,\s]*아니면\s*([^.?"]{2,30}?)인가요/.exec(t)
  if (m) { a = m[1]; b = m[2] }
  if (!a) {
    m = /([^\s,]+)(?:과|와)\s+([^\s,]+)\s*중(?:에서)?/.exec(t)
    if (m) { a = m[1]; b = m[2] }
  }
  if (!a || !b) return null
  const norm = (s) => clean(s).replace(/^(지금|이미|그|저)\s+/, '').replace(/[.?!]$/, '')
  const opts = [norm(a), norm(b)]
  /* 예시 답변이 어느 쪽인지로 정답을 정한다 — 답이 안 맞으면 정답 표시 없이 둔다(둘 다 받아준다) */
  const ans = clean(sample).replace(/[.?!]$/, '').replace(/(이에요|예요|요)$/, '')
  const hit = opts.findIndex((o) => ans && (o.includes(ans) || ans.includes(o)))
  return opts.map((text, i) => (hit >= 0 && i === hit ? { text, correct: true } : { text }))
}

/** 강사 발화에서 학생에게 던지는 질문만 뽑는다 — 선택지 카드의 제목이 된다 */
function askOf(tutor) {
  const t = clean(tutor)
  const qs = t.split(/(?<=[?])\s*/).filter((s) => s.trim().endsWith('?'))
  return qs.length ? clean(qs[qs.length - 1]) : t
}

function parse() {
  const tab = JSON.parse(fs.readFileSync(DUMP, 'utf8')).sheets.find((s) => s.name === TAB)
  if (!tab) throw new Error(`시트에 "${TAB}" 탭이 없다`)

  const blocks = []
  let cur = null
  for (const [idx, row] of tab.values.entries()) {
    const lineNo = idx + 1
    if (lineNo < ROWS[0] - 5 || lineNo > ROWS[1]) continue   // 블록 머리(ID·사진·정답)는 조금 위에 있다
    const c0 = clean((row || [])[0])
    if (/^유형 학습\s*\d+$/.test(c0)) { cur = { turns: [] }; blocks.push(cur); continue }
    if (!cur) continue
    if (/^ID:/.test(c0)) { cur.srcCode = c0.replace(/^ID:\s*/, ''); continue }
    if (/^사진:/.test(c0)) { cur.photo = c0.replace(/^사진:\s*/, ''); continue }
    if (/^정답:/.test(c0)) { cur.answer = c0.replace(/^정답:\s*/, '').slice(0, 1); continue }
    if (c0 === '단계' || !c0) continue

    const tutor = clean((row || [])[1])
    const mode = clean((row || [])[2])
    const sample = clean((row || [])[3])
    if (!tutor) continue
    cur.turns.push({ stage: c0, tutor, mode, sample })
  }
  return blocks.filter((b) => b.turns.length)
}

function toTurn(t, qIdx, no, itemSeq, blockAnswer) {
  const base = { no, itemSeq, occurrence: itemSeq, stage: t.stage, tutor: t.tutor, focusQ: qIdx }
  switch (t.mode) {
    case 'A~D':
      /* 정답 고르기 — 네 보기를 들려주고 고르게 한다. 보기 음원은 교재에서 잘라 둔 것이 나간다 */
      return { ...base, audio: { kind: 'options', qIdx, labels: ['A', 'B', 'C', 'D'] },
        interaction: { kind: 'pickAnswer', qIdx } }
    case 'O/X': {
      const yes = /^(O|o|맞|네|예)/.test(t.sample)
      return { ...base, interaction: { kind: 'choice', prompt: askOf(t.tutor), fixedPrompt: true,
        choices: [{ text: '맞아요', ...(yes ? { correct: true } : {}) },
                  { text: '아니에요', ...(yes ? {} : { correct: true })}] } }
    }
    case '2지선다': {
      const choices = twoChoices(t.tutor, t.sample)
      if (choices) return { ...base, interaction: { kind: 'choice', prompt: askOf(t.tutor), fixedPrompt: true, choices } }
      return { ...base, interaction: { kind: 'subjective', prompt: askOf(t.tutor), ...(t.sample ? { hint: t.sample } : {}) } }
    }
    case '말하기':
      return { ...base, interaction: { kind: 'subjective', prompt: askOf(t.tutor), ...(t.sample && t.sample !== '-' ? { hint: t.sample } : {}) } }
    default:   // 듣기 — 학생이 할 일이 없다
      return { ...base, interaction: { kind: 'next' } }
  }
}

function main() {
  const blocks = parse()
  const turns = []
  let no = 0
  blocks.forEach((b, bi) => {
    console.log(`\n[문항 ${bi + 1}] ${b.srcCode}  정답 ${b.answer}  — ${b.turns.length}턴`)
    for (const t of b.turns) {
      const turn = toTurn(t, bi, ++no, bi + 1, b.answer)
      const k = turn.interaction.kind
      const extra = k === 'choice' ? ` [${turn.interaction.choices.map((c) => c.text + (c.correct ? '✓' : '')).join(' / ')}]` : ''
      console.log(`  ${String(no).padStart(2)} ${t.stage.padEnd(14)} ${t.mode.padEnd(6)} → ${k}${extra}`)
      turns.push(turn)
    }
  })

  const body = `/* 자동 생성 — scripts/build-fgi-scenario.js (시트 "${TAB}")
 *
 * FGI 시연용 **대본 수업**. 평소 수업은 레일(단계)만 정해 두고 강사 발화는 LLM 이 만드는데,
 * 시연 강의는 할 말을 미리 다 정해 둔다. 여기 있는 turns 가 그 대본이다.
 *
 * ⚠️ 손으로 고치지 말 것 — 시트가 정본이다. 고칠 일이 생기면 시트를 고치고 생성기를 다시 돌린다.
 */
import type { Turn } from '@/data/typeLearning/types'

/** 강의코드 → 대본 턴. 여기 있는 강의는 레일 대신 이 턴으로 돈다. */
export const FGI_SCENARIO: Record<string, Turn[]> = {
  '${LECTURE}': ${JSON.stringify(turns, null, 2).split('\n').map((l, i) => (i ? '  ' + l : l)).join('\n')},
}

/** 이 강의가 대본 수업인가 */
export const hasScenario = (code?: string) => !!code && !!FGI_SCENARIO[code]
`

  console.log(`\n총 ${turns.length}턴 · 문항 ${blocks.length}개`)
  if (!go) { console.log('보여주기만 했다. 파일을 쓰려면 --go 를 붙일 것.'); return }
  fs.writeFileSync(OUT, body)
  console.log(`✅ ${path.relative(path.join(__dirname, '..'), OUT)}`)
}

main()
