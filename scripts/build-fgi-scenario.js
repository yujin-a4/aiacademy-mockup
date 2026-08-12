/**
 * FGI 시연 대본 → 수업 턴 — 시트 대본 탭 → src/data/typeLearning/fgiScenario.ts
 *
 * 왜 코드가 아니라 생성기인가
 *   시연 강의는 **강사가 할 말을 대본으로 다 정해 둔다.** 평소 수업은 레일(단계)만 DB 에 두고
 *   발화는 LLM 이 만드는데, 시연에서는 그 자유도가 위험이다(docs/tutor-control-plan.md §6 D단계).
 *   대본은 시트가 정본이라 손으로 옮기지 않고 여기서 뽑아 쓴다 — 시트가 바뀌면 다시 돌리면 된다.
 *
 * **강사마다 대본이 다르다.** 같은 문항·같은 S코드라도 짚는 순서와 시키는 방식이 갈린다
 *   (윤다은은 S1 에서 2지선다로 먼저 좁히고, 이도윤은 바로 말하게 한다). 그래서 출력은
 *   `강사 → 강의코드 → 대본` 두 겹이다. 강사 축이 없으면 누구를 골라도 같은 수업이 나온다.
 *
 * 시트 구조 (한 문항 = 한 블록)
 *   유형 학습 N | 실전 N          ← 블록 머리
 *   ID: YBM_LC1_T06_Q001         ← 교재 문항코드 (우리 코드가 아니다. 대조용)
 *   사진: … / 정답: B. …          ← 있으면 읽고 없으면 만다
 *   단계 | 강사 진행 | 학생 방식 | 학생 예시 답변    ← 표 머리(열 위치는 이 줄에서 찾는다)
 *
 *   강사마다 표 머리 낱말이 다르다(`스캐폴딩`/`AI 강사`/`학생 답변 방식`…) → 이름으로 찾는다.
 *
 * 학생 방식 → 화면 상호작용
 *   2지선다 → choice(2개)   말하기·음성 → subjective   A~D·선택형 → pickAnswer
 *   O/X → choice(맞아요/아니에요)   듣기·'-' → next
 *
 * 2지선다는 시트에 보기가 따로 없다 — 강사 발화에서 뽑는다. 세 가지 꼴을 안다.
 *   "A와 B 중에서" · "A일까요, B일까요?" · "① A ② B 중 어느 쪽?"
 * 못 뽑으면 그 턴은 **말하기로 낮춘다**(엉뚱한 두 버튼을 세우는 것보다 낫다). 뽑은 결과는
 * 아래 출력에 다 찍히므로 눈으로 확인할 것.
 *
 * 수업(유형 학습)과 실전은 **가는 곳이 다르다**
 *   유형 학습 → turns   : 스캐폴딩 수업. 문항을 강사와 같이 푼다
 *   실전       → review : 학생이 혼자 다 푼 뒤, 문항마다 보기를 하나씩 짚는 코칭
 *   실전 대본에는 정답 고르기 턴이 없다 — 이미 풀고 온 자리라 다시 고를 것이 없다.
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

/* 대본 탭 목록. 콘텐츠팀이 탭 이름을 바꾸므로(시트66 → 파트1_윤다은) 여기만 고치면 된다.
   미완성 탭은 올리지 않는다 — 반쯤 빈 대본이 붙으면 강사가 중간에 말을 잃는다. */
const SOURCES = [
  {
    instructor: 'yun_daeun',
    lecture: 'LC-P1-01',
    tab: '파트1_윤다은',
    /* 도입 — 시트 '파트1_윤다은' 에는 도입 줄이 아직 없다(이도윤 탭에는 있다).
       시트에 생기면 그쪽을 읽고 여기는 무시된다(parse 가 도입 블록을 먼저 본다). */
    intro: {
      script: [
        '오늘은 Part 1에서 이 세 가지를 중심으로 연습해볼게요.',
        '먼저 Part 1 문제를 어떻게 풀어야 하는지 간단히 살펴보고 시작할게요.',
        'Part 1은 사진을 보고 네 개의 문장을 들은 다음, 사진을 가장 정확하게 설명하는 문장 하나를 고르는 문제예요.',
        '그래서 음원을 듣기 전에 사진부터 빠르게 살펴보는 게 중요해요. 사람이 중심인 사진에서는 사람의 동작을, 사물이 중심인 사진에서는 사물의 위치나 상태를 먼저 확인하면 됩니다.',
        '그리고 사진에 어떤 물건이 보인다고 해서 바로 답을 고르면 안 돼요. 누가 무엇을 하고 있는지, 사물이 어디에 있고 어떤 상태인지까지 선택지와 정확하게 일치하는지 확인해야 해요.',
        '이제 방금 본 세 가지 포인트를 문제에 적용해볼게요. 첫 번째 유형부터 시작해볼까요?',
      ].join('\n'),
      /* '오늘 배울 내용' — 단계명(S1·S3…)을 그대로 올리면 학생에게는 아무 말도 아니다.
         이 강의가 실제로 다루는 세 문항이 그대로 세 줄이 된다(도입 발화가 "이 세 가지"로 받는다). */
      points: [
        '사람이 무엇을 하고 있는지 빠르게 찾기',
        '사물이 어디에 있고 어떤 상태인지 확인하기',
        '진행 중인 동작과 이미 만들어진 상태 구분하기',
      ],
    },
  },
  // { instructor: 'lee_doyun', lecture: 'LC-P1-01', tab: 'FGI_이도윤' },  ← 유형학습 2 부터 빈칸(0812)
]

const go = process.argv.includes('--go')

const clean = (s) => String(s ?? '')
  /* 시트 대본은 통째로 겹따옴표(“ ”)로 감싸여 있다 — 낭독되는 문장이라 벗긴다.
     문자 클래스에 직접 적으면 파일 인코딩에 따라 안 잡히므로 유니코드 이스케이프로 적는다. */
  .replace(/[“”″]/g, '')
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ')
  .replace(/^"|"$/g, '')
  .trim()

/** 시트의 학생 방식 낱말을 한 벌로 모은다 — 강사마다 다르게 적는다 */
function normMode(raw) {
  const m = clean(raw).replace(/\s/g, '').toUpperCase()
  if (!m || m === '-' || m === '–' || m === '—') return '듣기'
  if (m.includes('2지선다') || m.includes('양자')) return '2지선다'
  if (m === 'O/X' || m === 'OX' || m.includes('O/X')) return 'O/X'
  if (m.includes('A~D') || m.includes('A-D') || m.includes('선택형')) return 'A~D'
  if (m.includes('말하기') || m.includes('음성') || m.includes('주관')) return '말하기'
  return '듣기'
}

/** 예시 답변 칸 → [첫 답, …나머지]. 한 칸에 '-' 로 여러 답이 나열돼 있는 경우가 있다 */
function samples(raw) {
  const s = clean(raw)
  if (!s || s === '-' || s === '–') return []
  return s.split(/(?:^|\s)[-·]\s*/).map((x) => clean(x)).filter(Boolean)
}

/** 두 갈래의 낱말 수를 맞춘다 — "이번 사진도 사람이 중심인 사진" / "사물이 중심인 사진" 처럼
 *  왼쪽에 앞 문장이 딸려 오는 경우가 있다. 긴 쪽을 앞에서 잘라 짝을 맞춘다. */
function alignPair(a, b) {
  const wa = a.split(' ')
  const wb = b.split(' ')
  if (wa.length > wb.length) return [wa.slice(wa.length - wb.length).join(' '), b]
  if (wb.length > wa.length) return [a, wb.slice(wb.length - wa.length).join(' ')]
  return [a, b]
}

/** 강사 발화에서 두 갈래를 뽑는다 (세 가지 꼴) */
function twoChoices(tutor, sample) {
  const t = clean(tutor)
  let a = null
  let b = null

  /* ① … ② … 중 — 콘텐츠팀이 번호로 적은 꼴 */
  let m = /①\s*([^②]{2,45}?)\s*②\s*([^?]{2,45}?)\s*중/.exec(t)
  if (m) { a = m[1]; b = m[2] }
  /* A인가요, 아니면 B인가요? — 왼쪽 갈래는 **문장 경계를 넘지 않는다**(마침표·따옴표 금지).
     허용하면 앞 문장까지 통째로 딸려온다(실측: "이번 사진은 상태 표현을 …" 이 선택지가 됐다). */
  if (!a) { m = /([^,.?"]{2,45}?)인가요[,\s]*(?:아니면\s*)?([^.?"]{2,45}?)인가요/.exec(t); if (m) { a = m[1]; b = m[2] } }
  /* A일까요, B일까요? */
  if (!a) { m = /([^,.?"]{2,45}?)일까요[,\s]*(?:아니면\s*)?([^.?"]{2,45}?)일까요/.exec(t); if (m) { a = m[1]; b = m[2] } }
  /* A와 B 중(에서) */
  if (!a) { m = /([^\s,]+)(?:과|와)\s+([^\s,]+)\s*중(?:에서)?/.exec(t); if (m) { a = m[1]; b = m[2] } }
  if (!a || !b) return null

  const norm = (s) => clean(s).replace(/^(지금|이미|그|저)\s+/, '').replace(/[.?!]$/, '')
  const opts = alignPair(norm(a), norm(b))
  /* 예시 답변이 어느 쪽인지로 정답을 정한다 — 답이 안 맞으면 정답 표시 없이 둔다(둘 다 받아준다) */
  const ans = clean(sample)
    .replace(/^[①②]\s*/, '')
    .replace(/[.?!]$/, '')
    .replace(/(이에요|예요|요)$/, '')
  const hit = opts.findIndex((o) => ans && (o.includes(ans) || ans.includes(o)))
  return opts.map((text, i) => (hit >= 0 && i === hit ? { text, correct: true } : { text }))
}

/** 강사 발화에서 학생에게 던지는 질문만 뽑는다 — 선택지 카드의 제목이 된다 */
function askOf(tutor) {
  const t = clean(tutor)
  const qs = t.split(/(?<=[?])\s*/).filter((s) => s.trim().endsWith('?'))
  return qs.length ? clean(qs[qs.length - 1]) : t
}

/** 표 머리 줄에서 열 위치를 찾는다 — 강사마다 낱말이 다르다 */
function columnsOf(row) {
  const cells = (row || []).map((c) => clean(c))
  const find = (...names) => cells.findIndex((c) => names.some((n) => c.includes(n)))
  const stage = find('단계', '스캐폴딩')
  const tutor = find('강사 진행', 'AI 강사', '강사')
  const mode = find('학생 방식', '학생 답변 방식', '학생 인터랙션')
  /* 예시 답변 열은 '학생' 으로 시작하는 것이 여럿이라 **방식 열 뒤**에서 찾는다 */
  const sample = cells.findIndex((c, i) => i > mode && (c.includes('답변') || c === '학생'))
  if (stage < 0 || tutor < 0) return null
  return { stage, tutor, mode, sample }
}

function parse(tabName) {
  const tab = JSON.parse(fs.readFileSync(DUMP, 'utf8')).sheets.find((s) => s.name === tabName)
  if (!tab) throw new Error(`시트에 "${tabName}" 탭이 없다 — 콘텐츠팀이 탭 이름을 바꿨는지 볼 것`)

  const blocks = []
  let cur = null
  let cols = null
  for (const row of tab.values) {
    const c0 = clean((row || [])[0])
    /* 블록 머리 — 여기서 잘라야 뒤쪽 초안까지 딸려 들어가지 않는다 */
    const head = /^유형 학습\s*\d+$/.test(c0) ? 'lesson'
      : /^실전\s*\d+$/.test(c0) ? 'practice'
      : /^도입$/.test(c0) ? 'intro' : null
    if (head) { cur = { kind: head, turns: [] }; blocks.push(cur); cols = null; continue }
    if (!cur) continue
    /* 도입은 표가 아니라 문단이다 — 둘째 칸의 글을 그대로 모은다(이도윤 탭이 이 꼴) */
    if (cur.kind === 'intro') {
      const para = clean((row || [])[1])
      if (para) cur.turns.push({ stage: '도입', tutor: para, mode: '듣기', samples: [] })
      continue
    }
    if (/^ID:/.test(c0)) { cur.srcCode = c0.replace(/^ID:\s*/, ''); continue }
    if (/^YBM_[A-Z0-9_]+$/i.test(c0)) { cur.srcCode = c0; continue }   // ID: 없이 코드만 적은 블록
    if (/^사진:/.test(c0)) { cur.photo = c0.replace(/^사진:\s*/, ''); continue }
    if (/^정답:/.test(c0)) { cur.answer = c0.replace(/^정답:\s*/, '').slice(0, 1); continue }

    const asCols = columnsOf(row)
    if (asCols && !clean((row || [])[asCols.tutor]).includes('“')) {
      // 표 머리 줄 ('단계 | 강사 진행 | …')
      if (/^(단계|스캐폴딩)$/.test(c0) || clean((row || [])[asCols.tutor]) === '강사 진행') { cols = asCols; continue }
    }
    if (!cols) continue

    const tutor = clean((row || [])[cols.tutor])
    if (!tutor) continue        // 빈칸 줄 — 아직 안 쓴 대본이다. 버린다
    cur.turns.push({
      stage: clean((row || [])[cols.stage]) || cur.turns[cur.turns.length - 1]?.stage || '수업',
      tutor,
      mode: normMode(cols.mode >= 0 ? (row || [])[cols.mode] : ''),
      samples: samples(cols.sample >= 0 ? (row || [])[cols.sample] : ''),
    })
  }
  return blocks.filter((b) => b.turns.length)
}

/** 이 턴이 **어느 보기를 지목하고 있는가** — "이번에는 A를 볼게요", "D에서는 …", 단계명 'S6 오답 제거 - A'.
 *  화면은 이걸 보고 그 보기의 스크립트를 연다. 강사가 읽고 있는 문장이 화면에 없으면 못 따라간다.
 *  홀로 선 대문자만 센다 — 영어 문장 속 글자('an easel')를 보기 라벨로 오인하면 안 된다. */
function labelsOf(t) {
  /* 단계명에 적혀 있으면 그게 정답이다 — 실전 대본은 'S6 오답 제거 - A' 처럼 짚는 보기를 달고 있다 */
  const suffix = /[-–]\s*([A-D])\s*$/.exec(t.stage)
  if (suffix) return [suffix[1]]

  const hit = new Set()
  const re = /(?<![A-Za-z])([A-D])(?![A-Za-z])/g
  let m
  while ((m = re.exec(t.tutor))) {
    const before = t.tutor.slice(0, m.index).replace(/[\s'"‘’“”]+$/, '').slice(-1)
    const after = t.tutor.slice(m.index + 1).replace(/^['"‘’“”]+/, '').slice(0, 1)
    /* 영어 구문 속 **자리표시자**는 보기가 아니다 — "pour A into B", "hand A to B", "prop A against B".
       앞이 영어면 버린다. 그리고 보기 라벨은 뒤에 조사가 붙는다("A를 볼게요", "D에서는", "B예요"). */
    if (/[A-Za-z]/.test(before)) continue
    if (!/[가-힣]/.test(after)) continue
    hit.add(m[1])
  }
  return Array.from(hit).sort()
}

function toTurn(t, qIdx, no, seq, kind) {
  /* 실전(리뷰)은 itemSeq 를 달지 않는다 — 아이템 표는 수업 문항 것이라
     실전 문항 번호로 되짚으면 엉뚱한 범위가 잡힌다. 화면은 focusQ 하나로 문항을 고른다. */
  const base = kind === 'lesson'
    ? { no, itemSeq: seq, occurrence: seq, stage: t.stage, tutor: t.tutor, focusQ: qIdx }
    : { no, stage: t.stage, tutor: t.tutor, focusQ: qIdx }
  /* 지목한 보기가 있으면 그 스크립트를 연다. 공개는 누적이라 한 번 열린 보기는 계속 보인다.
     정답 고르기(A~D) 턴에는 붙이지 않는다 — 고르기도 전에 보기 글자가 열리면 듣기가 아니게 된다. */
  const labels = t.mode === 'A~D' ? [] : labelsOf(t)
  if (labels.length) base.reveal = { optionText: [{ qIdx, labels }] }
  const [first, ...rest] = t.samples

  switch (t.mode) {
    case 'A~D':
      /* 정답 고르기 — 네 보기를 들려주고 고르게 한다. 보기 음원은 교재에서 잘라 둔 것이 나간다 */
      return { ...base, audio: { kind: 'options', qIdx, labels: ['A', 'B', 'C', 'D'] },
        interaction: { kind: 'pickAnswer', qIdx } }
    case 'O/X': {
      const yes = /^(O|o|ㅇ|맞|네|예)/.test(first || '')
      return { ...base, interaction: { kind: 'choice', prompt: askOf(t.tutor), fixedPrompt: true,
        choices: [{ text: '맞아요', ...(yes ? { correct: true } : {}) },
                  { text: '아니에요', ...(yes ? {} : { correct: true })}] } }
    }
    case '2지선다': {
      const choices = twoChoices(t.tutor, first)
      if (choices) return { ...base, interaction: { kind: 'choice', prompt: askOf(t.tutor), fixedPrompt: true, choices } }
      return { ...base, interaction: { kind: 'subjective', prompt: askOf(t.tutor),
        ...(first ? { hint: first } : {}), ...(rest.length ? { accepts: t.samples } : {}) } }
    }
    case '말하기':
      /* 예시 답변이 여럿이면 **전부 받아준다**(accepts). hint 는 첫 줄만 — 못 맞혔을 때
         강사가 읽어주는 문장이라, 세 답을 이어 읽으면 말이 안 된다. */
      return { ...base, interaction: { kind: 'subjective', prompt: askOf(t.tutor),
        ...(first ? { hint: first } : {}), ...(rest.length ? { accepts: t.samples } : {}) } }
    default:   // 듣기 — 학생이 할 일이 없다
      return { ...base, interaction: { kind: 'next' } }
  }
}

function build(src) {
  const blocks = parse(src.tab)
  const out = { turns: [], review: [] }
  let no = 0
  let lessonSeq = 0
  let practiceSeq = 0

  console.log(`\n══ ${src.instructor} · ${src.lecture} ← "${src.tab}"`)

  /* 도입 — 시트에 있으면 시트가 정본, 없으면 설정에 적어 둔 것 */
  const fromSheet = blocks.filter((b) => b.kind === 'intro').flatMap((b) => b.turns.map((t) => t.tutor))
  const script = fromSheet.length ? fromSheet.join('\n') : src.intro?.script
  if (script) out.intro = { script, points: src.intro?.points ?? [] }
  console.log(`도입: ${fromSheet.length ? '시트' : src.intro ? '설정' : '없음'}`
    + `${out.intro ? ` · ${out.intro.script.length}자 · 오늘 배울 내용 ${out.intro.points.length}개` : ''}`)

  for (const b of blocks) {
    if (b.kind === 'intro') continue
    const lesson = b.kind === 'lesson'
    const qIdx = lesson ? lessonSeq++ : practiceSeq++
    const target = lesson ? out.turns : out.review
    console.log(`\n[${lesson ? '유형 학습' : '실전'} ${qIdx + 1}] ${b.srcCode || '(코드 없음)'}`
      + `${b.answer ? `  정답 ${b.answer}` : ''} — ${b.turns.length}턴`)
    for (const t of b.turns) {
      const turn = toTurn(t, qIdx, ++no, qIdx + 1, b.kind)
      const k = turn.interaction.kind
      const extra = k === 'choice'
        ? ` [${turn.interaction.choices.map((c) => c.text + (c.correct ? '✓' : '')).join(' / ')}]`
        : k === 'subjective' && turn.interaction.accepts ? ` (예시 ${turn.interaction.accepts.length}개)` : ''
      const rv = turn.reveal ? `  스크립트 열림 ${turn.reveal.optionText[0].labels.join('')}` : ''
      console.log(`  ${String(no).padStart(2)} ${t.stage.padEnd(18)} ${t.mode.padEnd(6)} → ${k}${extra}${rv}`)
      target.push(turn)
    }
  }
  console.log(`\n  수업 ${out.turns.length}턴 · 실전 코칭 ${out.review.length}턴`)
  return out
}

function main() {
  const byInstructor = {}
  for (const src of SOURCES) {
    const built = build(src)
    byInstructor[src.instructor] = byInstructor[src.instructor] || {}
    byInstructor[src.instructor][src.lecture] = built
  }

  const ind = (json, pad) => json.split('\n').map((l, i) => (i ? pad + l : l)).join('\n')
  const body = `/* 자동 생성 — scripts/build-fgi-scenario.js
 *
 * FGI 시연용 **대본 수업**. 평소 수업은 레일(단계)만 정해 두고 강사 발화는 LLM 이 만드는데,
 * 시연 강의는 할 말을 미리 다 정해 둔다. 여기 있는 turns 가 그 대본이다.
 *
 * **강사 → 강의** 두 겹인 이유: 같은 문항이라도 강사마다 짚는 순서와 시키는 방식이 다르다.
 * 대본이 없는 강사로 열면 이 파일을 쓰지 않고 평소대로 레일 + LLM 으로 돈다.
 *
 * turns  = 스캐폴딩 수업 (강사와 같이 푼다)
 * review = 실전을 혼자 다 푼 뒤의 문항별 코칭 (대본이 있으면 **다 맞혀도** 이 단계를 지난다)
 *
 * ⚠️ 손으로 고치지 말 것 — 시트가 정본이다. 고칠 일이 생기면 시트를 고치고 생성기를 다시 돌린다.
 */
import type { Turn } from '@/data/typeLearning/types'

export interface ScriptedLesson {
  /** 수업(스캐폴딩) 턴 */
  turns: Turn[]
  /** 실전 뒤 코칭 턴 — 비어 있으면 화면이 틀린 문항만 골라 스스로 만든다 */
  review: Turn[]
  /** 도입 화면 — 강사 발화(문단은 줄바꿈으로 나뉜다)와 '오늘 배울 내용'.
   *  없으면 화면이 단계명에서 뽑아 쓴다(S1·S3… 이 그대로 올라와 학생에게는 아무 말도 아니다). */
  intro?: { script: string; points: string[] }
}

/** 강사코드 → 강의코드 → 대본. 여기 있는 조합만 대본으로 돈다. */
export const FGI_SCENARIO: Record<string, Record<string, ScriptedLesson>> = {
${Object.entries(byInstructor).map(([inst, byCode]) => `  ${inst}: {
${Object.entries(byCode).map(([code, s]) => `    '${code}': {
${s.intro ? `      intro: ${ind(JSON.stringify(s.intro, null, 2), '      ')},\n` : ''}      turns: ${ind(JSON.stringify(s.turns, null, 2), '      ')},
      review: ${ind(JSON.stringify(s.review, null, 2), '      ')},
    },`).join('\n')}
  },`).join('\n')}
}

/** 이 강사·강의 조합의 대본 (없으면 undefined — 평소 레일로 돈다) */
export const scenarioFor = (instructor?: string, code?: string): ScriptedLesson | undefined =>
  (instructor && code && FGI_SCENARIO[instructor]?.[code]) || undefined
`

  if (!go) { console.log('\n보여주기만 했다. 파일을 쓰려면 --go 를 붙일 것.'); return }
  fs.writeFileSync(OUT, body)
  console.log(`\n✅ ${path.relative(path.join(__dirname, '..'), OUT)}`)
}

main()
