'use client'

/**
 * DB(questions/question_options) → TypeLesson 어댑터. (Phase 3-3 콘텐츠 이식)
 *
 * 폴리시된 TypeLessonPlayer UI는 그대로 두고, 데이터 소스만 로컬 하드코딩 → DB로 바꾼다.
 * 콘텐츠(사진·지문·보기·근거)와 레일(턴)을 실제 문항에서 만들어, 화면과 강사 발화가 어긋나지 않게 한다.
 *
 * 원칙
 * - DB 로드 실패 시 로컬 lesson으로 폴백 (useDbQuestionsByPassage).
 * - 강사 발화는 **콘텐츠 중립 템플릿 + DB 값**으로만 만든다. 특정 지문에 종속된 문장을 지어내지 않는다.
 * - 지원 범위 = D1(FGI 5강)의 4개 ui_type: Part1 사진, Part5 단문 빈칸, Part6 장문 빈칸, Part7 1지문.
 *
 * 한계: DB에 문장별 한국어 해석(ko)이 없다. 직독직해 탭은 비고, 그래서 P7 레일은
 * '문장 탭해서 해석 열기' 대신 **근거 문장 표시(mark)** 로 구성한다. (해석 컬럼이 생기면 되돌리면 됨)
 */
import type { UiDbQuestion, UiDbOption, UiDbPassage } from '@/data/db/questionStore'
import type {
  TypeLesson, TypeLessonContent, Turn, PassageDoc, QuestionItem, SentenceItem, RecapSentence,
  ChatMessage, TableData,
} from './types'

/* ── 공통 유틸 ── */

const PASSAGE_KINDS = new Set<PassageDoc['kind']>([
  'text', 'email', 'notice', 'ad', 'article', 'chat', 'table', 'form', 'utterance', 'dialogue', 'talk',
])

/**
 * DB `passages`(0014)를 화면 PassageDoc으로. 지문이 이관돼 있으면 이걸 쓴다.
 * 지문이 아직 없는 문항은 null → 호출부가 예전처럼 content 문자열을 쪼갠다(폴백).
 *
 * 이관 전에는 화면이 매번 content의 긴 문자열을 정규식으로 쪼개고 있었다.
 * 문장 분할 규칙이 화면 코드에 박혀 있었다는 뜻이라, 표·화자·이메일 메타처럼
 * 문자열로 표현이 안 되는 건 담을 방법이 없었다. 이제 그 구조가 DB에 있다.
 */
function passageDocOf(q: UiDbQuestion | undefined, id = 'p1'): PassageDoc | null {
  return docOf(q?.passage, id)
}

/** 이중·삼중 지문(0027) — 세트 전체를 p1·p2·p3 으로. 단일 지문이면 길이 1, 지문이 없으면 [] */
function passageDocsOf(q: UiDbQuestion | undefined): PassageDoc[] {
  const set = q?.passages ?? []
  if (set.length <= 1) {
    const one = passageDocOf(q)
    return one ? [one] : []
  }
  return set
    .map((p, i) => docOf(p, `p${i + 1}`))
    .filter((d): d is PassageDoc => !!d)
}

function docOf(p: UiDbPassage | null | undefined, id: string): PassageDoc | null {
  if (!p) return null
  const body = p.body as { table?: TableData; chat?: ChatMessage[] } | null
  /* 문장이 없어도 **표·대화가 있으면 지문이다** — 도면·시간표는 교재에서 그림이라 문장이 0개다.
     문장만 세면 그런 지문이 통째로 사라진다(실측: 삼중 지문의 도면 탭이 없어졌다). */
  if (p.sentences.length === 0 && !body?.table && !body?.chat?.length) return null
  const kind = (PASSAGE_KINDS.has(p.kind as PassageDoc['kind']) ? p.kind : 'article') as PassageDoc['kind']
  const table = body?.table
  // 문자 대화는 말풍선(화자·시각)이 있어야 폰 조판이 나온다. 문장 목록만으로는 흰 종이가 된다
  const chat = body?.chat
  return {
    id,
    kind,
    ...(p.title ? { title: p.title } : {}),
    ...(p.meta?.length ? { meta: p.meta } : {}),
    ...(table ? { table } : {}),
    ...(chat?.length ? { chat } : {}),
    sentences: p.sentences.map((s) => ({
      id: `s${s.seq}`,
      en: s.en,
      ...(s.ko ? { ko: s.ko } : {}),
      ...(s.speaker ? { speaker: s.speaker } : {}),
      ...(s.blankNo != null ? { blank: s.blankNo } : {}),
      ...(s.audioUrl ? { audio: s.audioUrl } : {}),
    })),
  }
}

const BLANK = '______'                       // ContentView가 렌더하는 단일 빈칸 마커
/** 교재·시트가 빈칸을 적는 꼴 → 우리 마커로. **밑줄만이 아니라 붙임표도 쓴다**:
 *  "the entry fee will be ------- for Cordell residents." (실측: DB blank_sentence 가 이 꼴이다)
 *  안 바꾸면 화면에 붙임표가 글자 그대로 찍히고, 줄 끝에서 중간이 잘려 두 줄로 갈라진다.
 *  ⚠️ 3개 이상만 본다 — "editor-in-chief" 같은 낱말의 붙임표를 빈칸으로 읽으면 안 된다. */
const toBlank = (s: string) => s.replace(/_{2,}/g, BLANK).replace(/[-–—]{3,}/g, BLANK)
const numBlank = (n: number) => `___(${n})___` // ContentView가 렌더하는 번호 빈칸 마커

const qNo = (q: UiDbQuestion) => Number(q.content.question_number) || 0
const correctOf = (q: UiDbQuestion): UiDbOption | undefined => q.options.find((o) => o.correct)

/** 같은 지문 묶음. 지문 개념이 없는 Part1·5는 앵커 1문항만.
 *  0014 이후로는 `passages`(정규화된 지문)가 1차 기준이다 — LC(P2·3·4)는 content에 지문 문자열이
 *  아예 없어서 예전 기준(passage_text/passage_context)으로는 묶이지 않는다. 그 둘은 폴백. */
function groupOf(rows: UiDbQuestion[], anchor: UiDbQuestion): UiDbQuestion[] {
  const pCode = anchor.passage?.code
  const key = anchor.content.passage_text ?? anchor.content.passage_context
  const same = pCode
    ? rows.filter((r) => r.passage?.code === pCode)
    : key
      ? rows.filter((r) => (r.content.passage_text ?? r.content.passage_context) === key)
      : [anchor]
  return [...same].sort(
    (a, b) => (a.displayOrder || qNo(a)) - (b.displayOrder || qNo(b)) || a.code.localeCompare(b.code),
  )
}

/** DB 보기 → 화면 문항 (why = 정답이면 근거, 오답이면 오답이유) */
function toQuestion(q: UiDbQuestion, label?: string): QuestionItem {
  return {
    q: label ?? q.content.question_text ?? '알맞은 것을 고르세요.',
    code: q.code,                       // 학습 로그가 어느 문항이었는지 남긴다 (STEP 6)
    audio: q.content.audio_url,
    options: q.options.map((o) => ({
      label: o.label,
      text: o.text,
      correct: o.correct,
      why: o.correct ? (o.evidence ?? undefined) : (o.explanation ?? undefined),
      audio: o.audioUrl ?? undefined,   // 화면 보기와 같은 행에서 나온 mp3 — 매니페스트보다 우선
    })),
  }
}

/** 근거 문장 정리 — 한국어 주석 제거, `...`로 이어붙인 뒷부분은 잘라 한 문장만 남긴다 */
function cleanEn(s: string): string {
  return s
    .replace(/\([^)]*[가-힣][^)]*\)/g, '')
    .split(/\s*\.\.\.\s*/)[0]
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP = new Set(['about', 'after', 'their', 'there', 'these', 'those', 'which', 'while', 'where', 'whenever', 'should', 'would', 'could', 'because', 'every', 'other', 'anyone', 'always'])

/** 문장에서 가장 변별력 있는 단어 하나 (recap 빈칸용) */
function keyWord(sentence: string): string | null {
  const words = sentence.split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z-]/g, ''))
    .filter((w) => w.length >= 6 && !STOP.has(w.toLowerCase()))
  if (!words.length) return null
  return words.sort((a, b) => b.length - a.length)[0]
}

/* ═══════════ Part 1 · 사진 묘사 ═══════════ */

function part1Turns(q: UiDbQuestion): Turn[] {
  const opts = q.options
  const correct = correctOf(q)
  const listen: Turn[] = opts.map((o, i) => ({
    no: 3 + i,
    stage: `선택지 ${o.label} · S6/S5`,
    tutor: `${o.label} 들어볼게요. 들리는 내용이 사진 속 동작·상태와 맞는지 보세요.`,
    audio: { kind: 'option', qIdx: 0, label: o.label },
    reveal: { optionText: [{ qIdx: 0, labels: [o.label] }] },
    interaction: {
      kind: 'choice',
      prompt: `${o.label}는 사진과 맞나요?`,
      choices: o.correct
        ? [{ text: '사진과 맞아요', correct: true }, { text: '사진과 달라요' }]
        : [{ text: '사진과 맞아요' }, { text: '사진과 달라요', correct: true }],
      feedback: o.correct
        ? (o.evidence ?? '사진과 일치하는 정답이에요.')
        : (o.explanation ?? '사진과 맞지 않아요.'),
    },
  }))

  return [
    {
      no: 1,
      stage: 'S1 핵심 관찰',
      tutor: '바로 보기 기다리지 말고 사진부터 볼게요. 먼저 눈에 들어오는 건 뭔가요? 사람이 중심인가요, 사물이나 배경이 중심인가요? 필기 버튼으로 사진에 직접 표시해도 좋아요.',
      interaction: { kind: 'subjective', prompt: '사진에서 먼저 눈에 들어오는 것을 말해보세요', hint: '예) 사람이 무언가를 하고 있어요' },
    },
    {
      no: 2,
      stage: 'S3 표현 코칭',
      tutor: '좋아요. 이런 사진에서는 동작(be+-ing)과 상태(be+p.p.) 표현이 정답으로 나와요. 특히 putting on(입는 중)과 wearing(이미 입은 상태)처럼 동작·상태를 바꿔치기한 함정을 조심하세요. 이제 보기를 하나씩 들어볼게요.',
      interaction: { kind: 'next', label: '선택지 듣기 시작' },
    },
    ...listen,
    {
      no: 3 + opts.length,
      stage: 'S7 표현 정리',
      tutor: correct
        ? `정리하면 정답은 ${correct.label}) ${correct.text} 예요. ${correct.evidence ?? ''}`.trim()
        : '정리해 볼게요.',
      interaction: { kind: 'next', label: '실전 문제 풀기' },
    },
  ]
}

/** 같은 강의의 다른 사진 문항으로 세션 정리 문장 만들기 — 오답 보기의 표현이 그대로 함정 선택지가 된다 */
function part1Recap(rows: UiDbQuestion[], anchor: UiDbQuestion, fallback: TypeLesson['recap']): TypeLesson['recap'] {
  const items: RecapSentence[] = []
  for (const r of rows) {
    if (r.code === anchor.code || items.length >= 3) continue
    const c = correctOf(r)
    const key = c && keyWord(c.text)
    if (!c || !key) continue
    const traps = r.options.filter((o) => !o.correct).map((o) => keyWord(o.text)).filter((w): w is string => !!w && w !== key)
    if (traps.length < 2) continue
    items.push({
      id: `r${items.length + 1}`,
      en: c.text.replace(new RegExp(`\\b${key}\\b`), '___'),
      ko: '',                                   // DB에 문장 해석 없음 — 채워지면 여기로 들어온다
      answer: key,
      choices: [key, traps[0], traps[1]],
      keywords: [key.toLowerCase()],
    })
  }
  if (items.length < 3) return fallback
  return { sentences: items, closing: '사진 문제의 오답은 늘 비슷한 표현으로 옵니다. 오늘 고른 표현들을 통째로 기억해 두면, 다음 사진에서도 동작과 상태를 바로 갈라낼 수 있어요.' }
}

function buildPart1(local: TypeLesson, rows: UiDbQuestion[], q: UiDbQuestion): TypeLesson {
  return {
    ...local,
    content: {
      ...local.content,
      photo: q.content.image_url ?? local.content.photo,
      photoDesc: q.content.key_elements ?? q.content.photo_type ?? local.content.photoDesc,
      optionAudio: true,
      questions: [toQuestion(q, q.content.question_text ?? '사진을 가장 잘 묘사한 보기를 고르시오.')],
    },
    turns: part1Turns(q),
    recap: part1Recap(rows, q, local.recap),
  }
}

/* ═══════════ Part 2·3·4 · LC 듣기 ═══════════
   FGI에서 LC도 시연한다(2026-07-28 기획 결정, D7). 쉐도잉은 제품에서 빠졌다(fromSteps 가 그 턴을 버린다).

   LC는 RC와 콘텐츠 모양이 다르다. 지문을 눈으로 읽는 게 아니라 **음원 스크립트**를 듣는다.
     · 화면은 `content.audioScript`(문장 단위 = 구간 재생 단위)를 본다. `passages`가 아니다
     · 표/자료형은 `content.visual` — 음원 듣는 동안 화면에 상시 노출
     · Part2는 보기까지 음성이라 `optionAudio: true` (텍스트는 공개 전 숨김)
   재료는 전부 passages/passage_sentences(0014)에서 온다 — 화자·표를 담을 자리가 그때 생겼다.

   ⚠️ 문장 mp3(`passage_sentences.audio_url`)는 지금 전부 비어 있다.
      플레이어가 브라우저 TTS로 폴백하므로 수업은 돌지만, 성우 음원이 아니다. */

/** 지문 → LC 음원 스크립트. 화자(W/M)가 있으면 그대로 살린다 */
function lcScript(q: UiDbQuestion | undefined): SentenceItem[] {
  return (q?.passage?.sentences ?? []).map((s) => ({
    id: `s${s.seq}`,
    en: s.en,
    ...(s.ko ? { ko: s.ko } : {}),
    ...(s.speaker ? { speaker: s.speaker } : {}),
    ...(s.audioUrl ? { audio: s.audioUrl } : {}),
  }))
}

/** 지문 body의 표 → 시각자료 (P3·P4 표/자료형) */
function lcVisual(q: UiDbQuestion | undefined): TypeLessonContent['visual'] {
  const body = q?.passage?.body as
    { table?: { headers: string[]; rows: string[][] }; visual_title?: string } | null | undefined
  if (!body?.table) return undefined
  return { title: body.visual_title ?? '시각자료', table: body.table }
}

/** Part2 — 질문 발화 1개 + 응답 3개. 아이템 = 문항 1개 */
function part2Turns(q: UiDbQuestion, script: SentenceItem[]): Turn[] {
  const correct = correctOf(q)
  const first = script[0]
  const turns: Turn[] = [
    {
      no: 1, stage: 'S0 질문 1차 청취',
      tutor: '먼저 질문만 들어볼게요. 첫 단어, 그러니까 의문사를 잡는 게 목표예요. 선택지는 아직 안 나옵니다.',
      ...(first ? { audio: { kind: 'sentences', ids: [first.id] } as const } : {}),
      interaction: { kind: 'next', label: '들었어요' },
    },
    {
      no: 2, stage: 'S1 핵심 단서',
      tutor: '질문의 첫 단어는 뭐였나요? 의문사 하나, 핵심 동사 하나, 명사 하나면 됩니다.',
      interaction: { kind: 'subjective', prompt: '들은 의문사·핵심 동사·명사를 말해보세요', hint: '예) Where / held / meeting' },
    },
    {
      no: 3, stage: 'S3 응답 예측',
      tutor: '무엇을 묻는지 잡았으면, 어떤 답이 올 수 있는지 범위를 먼저 정해두고 선택지를 듣습니다.',
      interaction: { kind: 'next', label: '선택지 들으러 가기' },
    },
    {
      no: 4, stage: 'S0 선택지 청취 + 답 선택', focusQ: 0,
      tutor: `이제 ${q.options.map((o) => o.label).join(', ')}를 이어서 들려드릴게요. 질문에 맞는 응답을 골라보세요.`,
      audio: { kind: 'options', qIdx: 0, labels: q.options.map((o) => o.label) },
      interaction: { kind: 'pickAnswer', qIdx: 0, prompt: '정답을 고르세요' },
    },
  ]
  q.options.forEach((o) => {
    turns.push({
      no: turns.length + 1, stage: `선택지 ${o.label} · S6`,
      tutor: `${o.label} 다시 들어볼게요.`,
      audio: { kind: 'option', qIdx: 0, label: o.label },
      reveal: { optionText: [{ qIdx: 0, labels: [o.label] }] },
      interaction: {
        kind: 'choice',
        prompt: `${o.label}는 질문에 맞는 응답인가요?`,
        choices: o.correct
          ? [{ text: '맞는 응답이에요', correct: true }, { text: '맞지 않아요' }]
          : [{ text: '맞는 응답이에요' }, { text: '맞지 않아요', correct: true }],
        feedback: (o.correct ? o.evidence : o.explanation) ?? '',
      },
    })
  })
  turns.push({
    no: turns.length + 1, stage: 'S7 표현 정리',
    tutor: correct
      ? `정리할게요. 정답은 ${correct.label}) ${correct.text} 예요. ${correct.evidence ?? ''}`.trim()
      : '정리할게요.',
    reveal: { scriptIds: 'all', optionText: [{ qIdx: 0, labels: 'all' }] },
    interaction: { kind: 'next', label: '수업 마치기' },
  })
  return turns
}

/** Part3·4 — 대화/담화 1개 + 문항 3개. 아이템 = 지문 1개 */
function part34Turns(group: UiDbQuestion[], hasVisual: boolean): Turn[] {
  const turns: Turn[] = [
    {
      no: 1, stage: 'S1 핵심 단서',
      tutor: '음원 틀기 전에 문제와 선택지부터 빠르게 볼게요. 주요 명사와 동사를 탭해서 표시해 보세요.',
      interaction: { kind: 'mark', prompt: '문제·선택지의 핵심 단어를 표시해 보세요' },
    },
  ]
  if (hasVisual) {
    turns.push({
      no: 2, stage: 'S3 시각자료 확인',
      tutor: '표를 먼저 볼게요. 보기에 항목 이름이 있으면, 음원에서는 이름이 아니라 다른 값(가격·시간)을 말해줄 가능성이 큽니다. 짝을 미리 눈에 넣어두세요.',
      interaction: { kind: 'next', label: '표 확인했어요' },
    })
  }
  turns.push(
    {
      no: turns.length + 1, stage: 'S2 유형·역할 판별',
      tutor: '문제 세 개가 각각 무엇을 묻는지 먼저 갈라둡니다. 주제·세부정보·다음 행동 — 어느 쪽인지에 따라 들을 위치가 달라져요.',
      interaction: { kind: 'next', label: '음원 들으러 가기' },
    },
    {
      no: turns.length + 2, stage: 'S0 전체 음원 재생 + 학생 풀이',
      tutor: '이제 전체를 한 번에 들려드릴게요. 실제 시험처럼 중간에 멈추지 않습니다. 들으면서 바로 풀어보세요.',
      audio: { kind: 'full' },
      interaction: { kind: 'solveAll', prompt: '들으면서 세 문항을 풀어보세요' },
    },
    {
      no: turns.length + 3, stage: 'S5 정답·스크립트 공개 + 흐름 확인',
      tutor: '스크립트를 열게요. 어디서 답이 나왔는지 위치부터 확인합니다.',
      reveal: { scriptIds: 'all' },
      interaction: { kind: 'next', label: '문항별로 보기' },
    },
  )
  group.forEach((q, i) => {
    const c = correctOf(q)
    turns.push({
      no: turns.length + 1, stage: `Q${i + 1} · S2+S5 근거 확인`, focusQ: i,
      tutor: c
        ? `Q${i + 1} 갑니다. 정답은 ${c.label}) ${c.text}. ${c.evidence ?? ''} 스크립트에서 이 부분이 어떻게 바뀌어 보기로 나왔는지 보세요.`.replace(/\s+/g, ' ').trim()
        : `Q${i + 1} 갑니다. 근거가 되는 문장을 찾아보세요.`,
      interaction: { kind: 'next' },
    })
  })
  turns.push({
    no: turns.length + 1, stage: 'S7 표현 정리',
    tutor: '듣기는 스크립트 표현이 보기에서 그대로 안 나옵니다. 오늘처럼 같은 내용이 다른 말로 바뀌어 보기가 됩니다. 그 바꿔치기를 알아보는 게 전부예요.',
    interaction: { kind: 'next', label: '수업 마치기' },
  })
  return turns
}

function buildLc(local: TypeLesson, group: UiDbQuestion[]): TypeLesson {
  const script = lcScript(group[0])
  if (!script.length) return local
  const visual = lcVisual(group[0])
  const isP2 = local.part === 2
  const title = group[0].passage?.title

  return {
    ...local,
    ...(title ? { title } : {}),
    desc: isP2
      ? '질문 음원 1개 + 응답 — 의문사·핵심어 잡기'
      : `${local.part === 3 ? '대화' : '담화'} 1개 + 문항 ${group.length}개 — 문제 먼저 읽고 타이밍 잡기`,
    content: {
      audioScript: script,
      ...(visual ? { visual } : {}),
      ...(isP2 ? { optionAudio: true } : {}),
      questions: group.map((q) => toQuestion(q)),
    },
    turns: isP2 ? part2Turns(group[0], script) : part34Turns(group, !!visual),
    recap: local.recap,     // LC 세션 정리는 아직 로컬 형판 그대로 (문장 해석이 DB에 없다)
  }
}

/* ═══════════ Part 5 · 단문 빈칸 ═══════════ */

/** 빈칸 앞뒤 단어 — 자리를 결정하는 구조 단서 */
function blankNeighbors(sentence: string): string[] {
  const words = sentence.split(/\s+/)
  const i = words.findIndex((w) => /_{2,}/.test(w))
  if (i === -1) return []
  return [words[i - 1], words[i + 1]].filter(Boolean).map((w) => w.replace(/[^A-Za-z'-]/g, '')).filter(Boolean)
}

function part5Turns(q: UiDbQuestion, sentence: string): Turn[] {
  const point = q.content.grammar_point ?? q.content.blank_type ?? '문장 구조'
  const correct = correctOf(q)
  const wrong = q.options.find((o) => !o.correct && o.explanation)
  const neighbors = blankNeighbors(sentence)

  const turns: Turn[] = [
    {
      no: 1, stage: 'S1 핵심 단서',
      tutor: '보기들이 다 비슷해 보이죠. 뜻부터 따지지 말고 단서부터 봅니다. 빈칸 바로 앞과 바로 뒤 단어를 탭해서 표시해 보세요.',
      interaction: { kind: 'mark', prompt: '빈칸 앞뒤 단어를 표시해 보세요', targetWords: neighbors },
    },
    {
      no: 2, stage: 'S3 개념 코칭',
      tutor: `이 문항의 포인트는 ${point}예요. 개념은 이 문제에서 바로 쓸 것만 짚을게요 — 빈칸 앞뒤에 뭐가 왔는지가 들어갈 형태를 정합니다.`,
      interaction: { kind: 'next' },
    },
    {
      no: 3, stage: 'S2 유형 판별',
      tutor: '그럼 이 빈칸에는 어떤 형태가 들어가야 할까요? 직접 말해보세요.',
      interaction: { kind: 'subjective', prompt: '빈칸에 필요한 형태는?', hint: '예) 과거분사(수동태)' },
    },
  ]

  if (wrong && correct) {
    turns.push({
      no: 4, stage: 'S6 오답 제거',
      tutor: '자리를 잡았으면 안 맞는 보기부터 지웁니다. 단어 뜻만 보면 맞아 보이는 보기가 있어서 조심해야 해요.',
      interaction: {
        kind: 'choice',
        prompt: '이 자리에 들어갈 수 없는 것은?',
        choices: [
          { text: `${wrong.label}) ${wrong.text}`, correct: true },
          { text: `${correct.label}) ${correct.text}` },
        ],
        feedback: wrong.explanation ?? '자리에 맞지 않아요.',
      },
    })
  }

  turns.push(
    {
      no: turns.length + 1, stage: 'S5 정답 연결', focusQ: 0,
      tutor: '남은 보기 중에서 근거를 확인하고 정답을 직접 골라보세요.',
      interaction: { kind: 'pickAnswer', qIdx: 0, prompt: '정답을 고르세요' },
    },
    {
      no: turns.length + 2, stage: 'S7 표현 정리',
      tutor: correct
        ? `정리할게요. 정답은 ${correct.label}) ${correct.text}. ${correct.evidence ?? ''} ${point} 문제는 이 판단 순서 하나로 끝납니다.`.replace(/\s+/g, ' ').trim()
        : `${point} 문제는 빈칸 앞뒤 구조로 판단합니다.`,
      interaction: { kind: 'next', label: '수업 마치기' },
    },
  )
  return turns
}

/** 같은 강의의 다른 문항(연습 포함)으로 세션 정리 문장 만들기 */
function part5Recap(rows: UiDbQuestion[], anchor: UiDbQuestion, fallback: TypeLesson['recap']): TypeLesson['recap'] {
  const others = rows.filter((r) => r.code !== anchor.code && r.content.blank_sentence && correctOf(r))
  const sentences: RecapSentence[] = others.slice(0, 3).map((r, i) => {
    const c = correctOf(r)!
    const choices = r.options.slice(0, 3).map((o) => o.text)
    if (!choices.includes(c.text)) choices[0] = c.text
    return {
      id: `r${i + 1}`,
      en: (r.content.blank_sentence ?? '').replace(/_{2,}/g, '___'),
      ko: '',                                   // DB에 문장 해석 없음 — 채워지면 여기로 들어온다
      answer: c.text,
      choices,
      keywords: [c.text.toLowerCase()],
    }
  })
  if (sentences.length < 3) return fallback
  const point = anchor.content.grammar_point ?? '이 유형'
  return { sentences, closing: `${point} — 보기 뜻이 아니라 빈칸 앞뒤 구조로 판단한다는 감각, 오늘 문장들로 다졌어요. 다음 단문 빈칸에도 그대로 적용해 보세요.` }
}

/** 문장 해석 — DB `content.question_translation`(교재 원문의 한 줄 해석).
 *  채점이 끝나면 문항 아래에 그대로 깔린다(구현 중 메모 91행). 예전에는 이 값을 아무 데도
 *  안 써서, 해석은 강사가 말로 하고 지나가는 것뿐이었다("눈에 잘 들어오지 않는다"). */
const p5Ko = (q: UiDbQuestion) => (q.content.question_translation ? { ko: q.content.question_translation } : {})

function buildPart5(local: TypeLesson, rows: UiDbQuestion[], anchor: UiDbQuestion): TypeLesson {
  const raw = anchor.content.blank_sentence
  if (!raw) return local
  const sentence = toBlank(raw)
  return {
    ...local,
    title: `단문 빈칸 — ${anchor.content.grammar_point ?? local.title}`,
    desc: anchor.content.blank_type ? `${anchor.content.blank_type} · 빈칸 앞뒤 구조로 판단하기` : local.desc,
    content: {
      passages: [{
        id: 'p1', kind: 'text',
        sentences: [{ id: 's1', en: sentence, blank: 1, ...p5Ko(anchor) }],
      }],
      /* 실제 시험지의 Part 5 에는 발문이 없다 — 문장과 (A)~(D) 가 전부다 */
      questions: [toQuestion(anchor, '')],
    },
    turns: part5Turns(anchor, sentence),
    recap: part5Recap(rows, anchor, local.recap),
  }
}

/* ═══════════ Part 6 · 장문 빈칸 ═══════════ */

/* 문장 끝처럼 보이지만 아닌 약어 — 여기서 끊으면 "Dear Ms. / Boyce," 처럼 쪼개진다 */
const ABBR = /\b(Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Co|Corp|Jr|Sr|St|Ave|Rd|No|vs|approx|a\.m|p\.m)\./g
const KEEP = ''

/** 장문을 문장 단위로 쪼개고 `(n)_______` → `___(n)___` 로 정규화 */
function clozeSentences(passage: string): SentenceItem[] {
  const norm = passage
    .replace(/\((\d)\)\s*_{2,}/g, (_m, n) => numBlank(Number(n)))
    .replace(ABBR, (m) => m.replace('.', KEEP))
  return norm
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replaceAll(KEEP, '.'))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((en, i) => {
      const m = en.match(/___\((\d)\)___/)
      return { id: `n${i + 1}`, en, ...(m ? { blank: Number(m[1]) } : {}) }
    })
}

const P6_COACH: Record<string, string> = {
  문법형: '문법형이에요. 뜻보다 빈칸 앞뒤의 구조와 시제 단서를 먼저 봅니다.',
  어휘형: '어휘형이에요. 단어 뜻 하나가 아니라, 앞 문장이 말한 내용을 받는 표현인지가 기준이에요.',
  연결어형: '연결어형이에요. 빈칸 앞 문장과 뒤 문장의 방향이 같은지 반대인지부터 판단합니다.',
  문장삽입형: '문장 삽입이에요. 문장 뜻만 맞아서는 부족해요. 앞 문장을 받아서 뒤 문장으로 이어지는지 흐름으로 판단합니다.',
}

function part6Turns(group: UiDbQuestion[]): Turn[] {
  const turns: Turn[] = [{
    no: 1, stage: 'S4 지문 파악',
    tutor: '빈칸부터 바로 가지 말고, 어떤 글이고 어떤 상황인지 두 문장만 훑고 갈게요. 그래야 뒤에 나오는 빈칸들의 근거가 보입니다.',
    reveal: { passageIds: ['p1'] },
    interaction: { kind: 'next', label: '첫 빈칸으로' },
  }]

  group.forEach((q, i) => {
    const n = qNo(q) || i + 1
    const type = q.content.blank_type ?? ''
    turns.push({
      no: turns.length + 1, stage: `Q${n} · 유형 안내`, focusQ: i,
      tutor: `빈칸 (${n}) 갑니다. ${P6_COACH[type] ?? '빈칸 주변 문맥에서 단서를 먼저 잡습니다.'}`,
      interaction: { kind: 'next', label: '보기 보기' },
    })
    turns.push({
      no: turns.length + 1, stage: `Q${n} · 정답 연결`, focusQ: i,
      tutor: '근거를 잡았으면 정답을 골라보세요.',
      interaction: { kind: 'pickAnswer', qIdx: i },
    })
  })

  turns.push({
    no: turns.length + 1, stage: '미확정 빈칸 회수',
    tutor: '실전에서는 애매한 빈칸을 붙잡고 있지 말고 표시만 하고 지나갔다가, 글을 끝까지 읽고 여기서 회수하면 됩니다. "지금 바로 고르지 말고 뒤를 조금 더 보고 판단할게요" — 이 감각이 Part 6의 핵심이에요.',
    interaction: { kind: 'next' },
  })
  const answers = group.map((q) => {
    const t = correctOf(q)?.text ?? ''
    return `(${qNo(q)}) ${t.length > 30 ? '문장 삽입' : t}`   // 삽입형 정답은 문장이라 통째로 읽지 않는다
  })
  turns.push({
    no: turns.length + 1, stage: 'S7 표현 정리',
    tutor: `정리합니다. ${answers.join(' / ')} — 근거는 전부 빈칸 주변 문맥에 있었어요. 유형별 판단 기준을 세트로 가져가세요.`,
    interaction: { kind: 'next', label: '수업 마치기' },
  })
  return turns
}

function part6Recap(group: UiDbQuestion[], sentences: SentenceItem[], fallback: TypeLesson['recap']): TypeLesson['recap'] {
  const items: RecapSentence[] = []
  for (const q of group) {
    const n = qNo(q)
    const c = correctOf(q)
    const line = sentences.find((s) => s.blank === n)
    if (!c || !line || items.length >= 3) continue
    // 문장 삽입형은 빈칸 자체가 문장이라 정리 문장으로 쓰기 어렵다 — 건너뛴다
    if ((q.content.blank_type ?? '').includes('문장삽입')) continue
    const choices = q.options.slice(0, 3).map((o) => o.text)
    if (!choices.includes(c.text)) choices[0] = c.text
    items.push({
      id: `r${items.length + 1}`,
      en: line.en.replace(/___\(\d\)___/, '___'),
      ko: '',
      answer: c.text,
      choices,
      keywords: [c.text.toLowerCase()],
    })
  }
  if (items.length < 3) return fallback
  return { sentences: items, closing: '문법은 구조 단서, 어휘는 앞 문장 받기, 연결어는 앞뒤 방향 — 장문 빈칸의 근거는 언제나 빈칸 주변에 있어요.' }
}

function buildPart6(local: TypeLesson, group: UiDbQuestion[]): TypeLesson {
  const passage = group[0]?.content.passage_context
  const doc = passageDocOf(group[0])
    ?? (passage ? { id: 'p1', kind: passageKind(undefined, passage), sentences: clozeSentences(passage) } : null)
  if (!doc || group.length === 0) return local
  const sentences = doc.sentences ?? []
  const types = Array.from(new Set(group.map((q) => q.content.blank_type).filter(Boolean)))
  return {
    ...local,
    // 로컬 제목('사내 공지')은 지문이 바뀌면 거짓말이 된다 — DB 빈칸 구성으로 다시 쓴다
    title: `장문 빈칸 — 빈칸 ${group.length}개`,
    desc: types.length ? `지문 흐름 속 ${types.join('·')} 빈칸 ${group.length}개` : local.desc,
    content: {
      passages: [doc],
      questions: group.map((q, i) => toQuestion(q, `빈칸 (${qNo(q) || i + 1})`)),
    },
    turns: part6Turns(group),
    recap: part6Recap(group, sentences, local.recap),
  }
}

/* ═══════════ Part 7 · 1지문 독해 ═══════════ */

const P7_KIND: { re: RegExp; kind: PassageDoc['kind'] }[] = [
  { re: /광고|홍보/, kind: 'ad' },
  { re: /이메일|편지|메일/, kind: 'email' },
  { re: /공지|안내|회람/, kind: 'notice' },
  { re: /문자|채팅|메시지/, kind: 'chat' },
  { re: /양식|일정|표/, kind: 'form' },
]

function passageKind(type: string | undefined, text: string): PassageDoc['kind'] {
  for (const { re, kind } of P7_KIND) if (type && re.test(type)) return kind
  if (/^(Dear|To:|From:)/m.test(text)) return 'email'
  return 'article'
}

const P7_COACH: Partial<Record<PassageDoc['kind'], string>> = {
  ad: '광고예요. 광고는 대상·조건·혜택이 어디에 적혀 있는지가 전부예요. 특히 "이 조건이면 이렇게 된다"는 문장에 정답 근거가 몰려 있습니다.',
  email: '이메일은 누가 누구에게 왜 보냈는지부터 봐요. 목적은 앞에, 추가 요청과 조건은 뒤에 붙는 경우가 많아서 끝까지 봐야 합니다.',
  notice: '공지예요. 무엇이 언제 어떻게 바뀌는지, 그리고 받는 사람이 뭘 해야 하는지 — 이 두 축으로 읽습니다.',
}

function part7Turns(group: UiDbQuestion[], kind: PassageDoc['kind']): Turn[] {
  const evidenceWords = group
    .map((q) => keyWord(cleanEn(q.content.evidence_sentence ?? '')))
    .filter((w): w is string => !!w)

  const turns: Turn[] = [
    {
      no: 1, stage: 'S1 질문 먼저 읽기',
      tutor: '지문 보기 전에 질문부터 갑니다. 선택지까지 다 보지 말고, 지문에서 뭘 찾아야 하는지만 잡으세요. 그게 정해져야 읽는 속도가 붙어요.',
      interaction: { kind: 'next', label: '지문 읽으러 가기' },
    },
    {
      no: 2, stage: 'S2+S3 지문 유형 안내',
      tutor: P7_COACH[kind] ?? '지문의 종류와 목적부터 잡고 들어갑니다. 첫 두세 문장에 그 단서가 있어요.',
      reveal: { passageIds: ['p1'] },
      interaction: { kind: 'next', label: '근거 찾기' },
    },
    {
      no: 3, stage: 'S4 근거 문장 찾기',
      tutor: '이제 읽으면서 질문과 연결되는 표현에 형광펜을 치세요. 전부 해석하려 하지 말고, 질문이 묻는 것과 겹치는 표현만 잡으면 됩니다.',
      interaction: { kind: 'mark', prompt: '질문과 연결되는 표현을 표시해 보세요', targetWords: evidenceWords },
    },
  ]

  group.forEach((q, i) => {
    const n = qNo(q) || i + 1
    const ev = cleanEn(q.content.evidence_sentence ?? '')
    turns.push({
      no: turns.length + 1, stage: `Q${n} · 근거 확인`, focusQ: i,
      tutor: ev
        ? `Q${n} 갑니다. 근거가 되는 문장은 이거예요 — "${ev}" 이 문장이 선택지에서 어떻게 바뀌어 나왔는지 보고 고르세요.`
        : `Q${n} 갑니다. 지문에서 근거 문장을 찾아 선택지와 연결해 보세요.`,
      interaction: { kind: 'pickAnswer', qIdx: i, prompt: '근거와 연결되는 답을 고르세요' },
    })
  })

  turns.push({
    no: turns.length + 1, stage: 'S7 표현 정리',
    tutor: 'Part 7은 지문 표현이 선택지에서 그대로 나오지 않아요. 오늘처럼 지문의 한 문장이 다른 표현으로 바뀌어 선택지가 됩니다. 표현이 바뀌어도 같은 내용인지 알아보는 것 — 그게 전부예요.',
    interaction: { kind: 'next', label: '수업 마치기' },
  })
  return turns
}

/** 근거 문장에서 핵심 표현을 빈칸으로 — 지문 안 표현만 사용 */
function part7Recap(group: UiDbQuestion[], fallback: TypeLesson['recap']): TypeLesson['recap'] {
  const cands = group
    .map((q) => cleanEn(q.content.evidence_sentence ?? ''))
    .filter((s) => s.split(/\s+/).length >= 5)
    .map((s) => ({ s, w: keyWord(s) }))
    .filter((x): x is { s: string; w: string } => !!x.w)
  if (cands.length < 3) return fallback

  const pool = cands.map((c) => c.w)
  const items: RecapSentence[] = cands.slice(0, 3).map((c, i) => ({
    id: `r${i + 1}`,
    en: c.s.replace(new RegExp(`\\b${c.w}\\b`), '___'),
    ko: '',
    answer: c.w,
    choices: [c.w, pool[(i + 1) % pool.length], pool[(i + 2) % pool.length]].filter((v, idx, a) => a.indexOf(v) === idx),
    keywords: [c.w.toLowerCase()],
  }))
  return { sentences: items, closing: '근거 문장 안의 표현이 선택지에서는 다른 말로 바뀝니다. 오늘 문장들을 통째로 기억해 두면, 바뀐 표현도 바로 알아볼 수 있어요.' }
}

/** 이중·삼중일 때만 — 이 문항의 근거가 어느 지문인지 문항에 실어 준다(레일이 탭을 연다) */
function withDoc(item: QuestionItem, q: UiDbQuestion, docs: PassageDoc[]): QuestionItem {
  if (docs.length <= 1) return item
  const d = Number(q.content.evidence_passage ?? 0)
  return d > 0 && docs[d - 1] ? { ...item, passageId: docs[d - 1].id } : item
}

/* 이중·삼중 지문 — 탭 이름에 쓴다 (ContentView 의 KIND_LABEL 과 같은 말) */
const KIND_KO: Partial<Record<PassageDoc['kind'], string>> = {
  text: '지문', email: '이메일', notice: '공지', ad: '광고', article: '기사',
  chat: '문자', table: '표', form: '양식',
}

/**
 * 이중·삼중 지문 레일 — 지문마다 한 바퀴 돌고, 연계 문항은 지문을 오가게 한다.
 * (question_types 의 P7-DOUBLE/TRIPLE 설명과 같은 뼈대)
 *
 * 어느 지문에 근거가 있는지는 `content.evidence_passage`(적재기가 넣는다)로 안다.
 * 없으면 지문을 지정하지 않는다 — 지문은 어차피 잠겨 있지 않아 학생이 직접 오갈 수 있다.
 */
function part7SetTurns(group: UiDbQuestion[], docs: PassageDoc[]): Turn[] {
  const turns: Turn[] = [{
    no: 1, stage: 'S1 질문 먼저 읽기',
    tutor: `지문이 ${docs.length}개예요. 다 읽고 시작하면 시간이 무너집니다. 질문부터 훑어서 `
      + `"어느 지문에서 무엇을 찾을지"만 정하고 들어갈게요.`,
    interaction: { kind: 'next', label: '지문 1 보기' },
  }]

  docs.forEach((d, i) => {
    turns.push({
      no: turns.length + 1, stage: `S2+S3 지문 ${i + 1} 파악`,
      tutor: `지문 ${i + 1}은 ${KIND_KO[d.kind] ?? '지문'}이에요. `
        + (i === 0
          ? '누가 누구에게 무엇을 알리는 글인지, 첫 두세 문장만 보고 넘어갑니다.'
          : `앞 지문과 무엇이 이어지는지를 보세요. 이름·날짜·장소처럼 **양쪽에 같이 나오는 말**이 연계 문항의 열쇠입니다.`),
      reveal: { passageIds: [d.id] },
      interaction: { kind: 'next', label: i + 1 < docs.length ? `지문 ${i + 2} 보기` : '문항 풀기' },
    })
  })

  group.forEach((q, i) => {
    const n = qNo(q) || i + 1
    const ev = cleanEn(q.content.evidence_sentence ?? '')
    const dIdx = Number(q.content.evidence_passage ?? 0)
    const doc = dIdx > 0 ? docs[dIdx - 1] : undefined
    const linked = q.content.linked === '1'
    turns.push({
      no: turns.length + 1, stage: `Q${n} · ${linked ? '연계' : '근거 확인'}`, focusQ: i,
      ...(doc ? { reveal: { passageIds: [doc.id] } } : {}),
      tutor: linked
        ? `Q${n}은 연계 문항이에요. 한 지문만 봐서는 안 풀립니다. `
          + (doc && ev
            ? `지문 ${dIdx}의 "${ev}" 로 대상을 먼저 특정하고, 다른 지문에서 그 대상에 붙은 정보를 확인하세요.`
            : '한 지문에서 대상을 특정하고, 다른 지문에서 그 대상에 붙은 정보를 확인하세요.')
        : `Q${n} 갑니다. ${doc ? `근거는 지문 ${dIdx}에 있어요. ` : ''}`
          + (ev ? `이 문장이에요 — "${ev}" 선택지에서 어떻게 바뀌어 나왔는지 보고 고르세요.` : '근거 문장을 찾아 선택지와 연결해 보세요.'),
      interaction: { kind: 'pickAnswer', qIdx: i, prompt: '근거와 연결되는 답을 고르세요' },
    })
  })

  turns.push({
    no: turns.length + 1, stage: 'S7 표현 정리',
    tutor: '이중·삼중 지문은 읽는 양이 아니라 **연결**이 시험입니다. 두 지문에 같이 나오는 이름·날짜·장소를 '
      + '먼저 이어 두면, 연계 문항은 그 자리에서 답이 보여요.',
    interaction: { kind: 'next', label: '수업 마치기' },
  })
  return turns
}

function buildPart7(local: TypeLesson, group: UiDbQuestion[]): TypeLesson {
  const text = group[0]?.content.passage_text
  const fromDb = passageDocsOf(group[0])
  if (!fromDb.length && (!text || group.length === 0)) return local
  const docs: PassageDoc[] = fromDb.length ? fromDb : [{
    id: 'p1',
    kind: passageKind(group[0].content.passage_type, text!),
    sentences: text!.split(/\n+/).map((l) => l.trim()).filter(Boolean)
      .map((en, i) => ({ id: `e${i + 1}`, en })),
  }]
  const type = group[0].content.passage_type
  // 지문 종류 라벨은 시트 원문 표기를 그대로 보여준다 ('광고·홍보문').
  // 세트는 그 라벨이 세트 성격('이중 지문')이라 지문마다 붙이면 탭이 전부 같은 이름이 된다
  if (docs.length === 1) { if (type) docs[0].label = type }
  else docs.forEach((d, i) => { d.label = `지문 ${i + 1} · ${KIND_KO[d.kind] ?? '지문'}` })

  return {
    ...local,
    title: `독해 — ${type ?? '1지문'}${docs.length > 1 ? '' : ' 지문'}`,
    desc: docs.length > 1
      ? `지문 ${docs.length}개 + 문항 ${group.length}개 — 지문을 오가며 근거를 잇는다`
      : `${group[0].content.passage_structure ?? type ?? '지문'} 1개 + 문항 ${group.length}개 — 질문 먼저, 근거 문장으로`,
    content: {
      passages: docs,
      questions: group.map((q) => withDoc(toQuestion(q), q, docs)),
    },
    turns: docs.length > 1 ? part7SetTurns(group, docs) : part7Turns(group, docs[0].kind),
    recap: part7Recap(group, local.recap),
  }
}

/* ═══════════ 실전 문제 세트 (stage='practice') ═══════════ */

/**
 * RC(P6·P7) 실전 — **지문 묶음 하나 = 세트 하나 = 문항 여럿**.
 * 이중·삼중 지문은 지문 2~3장이 한 세트다(문항은 그중 첫 지문에 링크돼 있고, 나머지는
 * `passages`(set_code)로 딸려 온다).
 *
 * `questions` 는 세트를 이어 붙인 **평평한 배열**로 둔다 — 답·채점·오답 리뷰가 전부 그 인덱스를
 * 쓰기 때문이다(LC 3·4 와 같은 규칙). 세트는 자기 지문과 문항 범위만 갖는다.
 */
function buildRcPracticeSets(part: number, group: UiDbQuestion[]): TypeLessonContent | undefined {
  /* 세트 키 — 정규화된 지문이 1차. 옛 데이터(지문 미이관)는 content 문자열로 묶는다 */
  const keyOf = (q: UiDbQuestion) =>
    q.passages?.[0]?.code ?? q.passage?.code
    ?? q.content.passage_text ?? q.content.passage_context ?? q.code

  const byPsg = new Map<string, UiDbQuestion[]>()
  for (const q of group) {
    const k = keyOf(q)
    if (!byPsg.has(k)) byPsg.set(k, [])
    byPsg.get(k)!.push(q)
  }

  const passages: PassageDoc[] = []
  const questions: QuestionItem[] = []
  const sets: NonNullable<TypeLessonContent['sets']> = []

  Array.from(byPsg.values()).forEach((g, si) => {
    const head = g[0]
    const raw = part === 6 ? head.content.passage_context : head.content.passage_text
    const fromDb = passageDocsOf(head)
    const docs: PassageDoc[] = fromDb.length
      ? fromDb
      : raw
        ? [{
            id: 'p1',
            kind: passageKind(part === 7 ? head.content.passage_type : undefined, raw),
            sentences: part === 6
              ? clozeSentences(raw)
              : raw.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((en, i) => ({ id: `e${i + 1}`, en })),
          }]
        : []
    if (!docs.length) return          // 지문이 없는 묶음은 통째로 건너뛴다 (풀 수가 없다)

    /* 지문 id 는 지문 묶음 안에서만 유일하다(p1·p2) — 세트를 이어 붙이면 겹쳐서
       탭이 남의 세트 지문을 연다. 세트가 둘 이상일 때만 앞에 세트 번호를 붙인다. */
    if (si > 0) docs.forEach((d, i) => { d.id = `g${si + 1}p${i + 1}` })

    const type = head.content.passage_type
    if (docs.length === 1) { if (type) docs[0].label = type }
    else docs.forEach((d, i) => { d.label = `지문 ${i + 1} · ${KIND_KO[d.kind] ?? '지문'}` })

    const from = questions.length
    g.forEach((q, i) => {
      /* P6 는 실물 시험지에 문제 문장이 없다 — 지문의 번호 붙은 빈칸이 곧 문제다.
         DB(교재)에는 "빈칸 (3)에 들어갈 문장으로…" 같은 한글 지시문이 있지만 시험지에는 없는 말이라 안 쓴다.
         대신 지금 문항이 지문의 어느 빈칸인지는 화면이 강조로 알려준다(TypeLessonPlayer 의 focusQ). */
      const item = part === 6
        ? toQuestion(q, `빈칸 (${qNo(q) || i + 1})`)
        : withDoc(toQuestion(q), q, docs)
      questions.push(item)
    })
    passages.push(...docs)
    sets.push({ passageIds: docs.map((d) => d.id), from, to: questions.length })
  })

  if (!questions.length) return undefined
  return { passages, sets, questions }
}

/**
 * 같은 강의의 실전 문항(P00x)으로 실전 stage용 콘텐츠를 만든다.
 * 수업에서 다룬 문항을 다시 푸는 게 아니라, DB에 따로 준비된 세트를 푼다.
 * P1은 문항마다 사진이, P5는 문항마다 문장이 다르고, P6·P7은 수업과 다른 지문 하나를 공유한다.
 */
function buildPractice(part: number, rows: UiDbQuestion[]): TypeLessonContent | undefined {
  const ps = rows.filter((r) => r.content.stage === 'practice')
  if (ps.length === 0) return undefined
  return buildPracticeContent(part, ps)
}

/** 문항 묶음을 실전 화면(PracticeStage)이 먹는 content 로 바꾼다.
 *  `buildPractice` 와 달리 stage 필터가 없다 — 넘긴 문항을 그대로 쓴다.
 *  자율학습 '파트별 연습'이 이 경로로 들어온다(수업 레일 없이 실전 화면만 쓴다). */
export function buildPracticeContent(part: number, rows: UiDbQuestion[]): TypeLessonContent | undefined {
  if (rows.length === 0) return undefined
  const group = [...rows].sort((a, b) => qNo(a) - qNo(b) || a.code.localeCompare(b.code))

  switch (part) {
    case 1:
      return {
        optionAudio: true,
        photo: group[0].content.image_url,
        questions: group.map((q) => ({ ...toQuestion(q, ''), photo: q.content.image_url })),
      }
    /* LC(2·3·4) — 듣기는 지문이 아니라 **음원 스크립트**다. 표(시각자료)도 여기서 실린다.
       이게 없던 동안 LC 실전은 DB 세트가 아니라 **로컬 형판의 옛 샘플**을 풀고 있었다
       (실측: Part4 표/자료형 강의를 열었는데 표 없는 다른 담화가 나왔다). */
    case 2: {
      /* P2 는 문항마다 **자기 질문 발화**가 따로다(지문 1개 = 문장 1개).
         화면은 audioScript[i] 를 i번 문항의 발화로 본다 — id 가 겹치면 남의 음원이 재생된다. */
      const script = group
        .map((q, i) => { const s = lcScript(q)[0]; return s ? { ...s, id: `q${i + 1}` } : null })
        .filter((s): s is SentenceItem => !!s)
      /* 실전 회차 적재분은 P2 에 지문 행이 없다 — 질문 발화가 따로 저장돼 있지 않고, 대신
         문항마다 **통음원**(질문 + 보기 셋)이 붙어 있다. 화면은 통음원이 있으면 그걸 먼저 트니
         스크립트가 없어도 판이 성립한다. 통음원조차 없을 때만 못 만드는 판으로 돌린다. */
      if (script.length !== group.length) {
        if (!group.every((q) => q.content.audio_url)) return undefined
        return { optionAudio: true, questions: group.map((q) => toQuestion(q)) }
      }
      return { audioScript: script, optionAudio: true, questions: group.map((q) => toQuestion(q)) }
    }
    case 3:
    case 4: {
      /* 대화·담화는 **지문 하나 = 세트 하나 = 문항 셋**이다. 실전에는 그런 세트가 여럿 올 수 있어
         지문(passage.code)으로 묶는다. 예전엔 group[0] 의 지문만 스크립트로 잡아서, 세트가 둘 이상이면
         뒤 세트의 문항이 **첫 담화에 통째로 붙었다**(9문항이 1번 대화에 딸린 꼴). */
      const byPsg = new Map<string, UiDbQuestion[]>()
      for (const q of group) {
        const key = q.passage?.code ?? q.code
        if (!byPsg.has(key)) byPsg.set(key, [])
        byPsg.get(key)!.push(q)
      }
      const groups = Array.from(byPsg.values())
      const flat = groups.flat()
      const sets: NonNullable<TypeLessonContent['sets']> = []
      let cursor = 0
      for (const g of groups) {
        const script = lcScript(g[0])
        if (!script.length) return undefined
        const visual = lcVisual(g[0])
        /* 문장 id 는 지문 안에서만 유일하다(s1·s2…) — 세트를 이어 붙이면 겹쳐서 남의 음원이 재생된다 */
        /* 내레이터 안내는 그 세트 **첫 문항**에 저장돼 있다(gen_narration_audio.js 와 같은 규칙) */
        const introText = g[0].content.set_intro_text
        sets.push({
          script: script.map((s) => ({ ...s, id: `g${sets.length + 1}${s.id}` })),
          ...(visual ? { visual } : {}),
          ...(introText ? { intro: { text: introText, audio: g[0].content.set_intro_url } } : {}),
          from: cursor, to: cursor + g.length,
        })
        cursor += g.length
      }
      return {
        audioScript: sets.flatMap((s) => s.script ?? []),
        ...(sets.length > 1 ? { sets } : {}),
        ...(sets[0].visual ? { visual: sets[0].visual } : {}),
        /* 문항 낭독 음원 — 없으면 화면이 브라우저 TTS 로 떨어진다 */
        questions: flat.map((q) => {
          const item = toQuestion(q)
          return q.content.qread_url ? { ...item, readAudio: q.content.qread_url } : item
        }),
      }
    }
    case 5:
      return {
        passages: [{
          id: 'p1', kind: 'text',
          sentences: group.map((q, i) => ({
            id: `s${i + 1}`, en: toBlank(q.content.blank_sentence ?? ''), blank: i + 1, ...p5Ko(q),
          })),
        }],
        questions: group.map((q) => toQuestion(q, '')),
      }
    /* RC(6·7) — **지문 하나(이중·삼중이면 한 묶음) = 세트 하나 = 문항 여럿**이다.
       LC 3·4 와 같은 규칙으로 지문(passage.code)으로 묶는다. 예전엔 group[0] 의 지문만 보고
       나머지 지문의 문항을 **버렸다** — 한 강의에 실전 세트가 둘 이상 실리는 순간 문항이 사라진다. */
    case 6:
    case 7:
      return buildRcPracticeSets(part, group)
    default:
      return undefined
  }
}

/* ═══════════ 자율학습 · 파트별 연습 ═══════════ */

const PRACTICE_PART_NAME: Record<number, string> = {
  5: '단문 빈칸', 6: '장문 빈칸', 7: '장문 독해',
}

/** 실전 화면에 넘길 최소 TypeLesson. 강사 레일과 세션 정리는 이 경로에서 안 쓰므로 비운다.
 *  PracticeStage 는 `practice` 가 있으면 그걸 풀고, part·area 로 2분할과 적정 시간을 정한다. */
export function practiceOnlyLesson(
  part: number, title: string, content: TypeLessonContent,
): TypeLesson {
  return {
    id: `part-practice-p${part}`,
    typeNo: 0,
    area: 'RC',
    part,
    partName: PRACTICE_PART_NAME[part] ?? `Part ${part}`,
    typeLabel: '파트별 연습',
    railCode: '',
    title,
    desc: '',
    content,
    practice: content,
    turns: [],
    recap: { sentences: [], closing: '' },
  }
}

/* ═══════════ 진입점 ═══════════ */

/**
 * 복습 세션(하루의 마지막)이 낼 문항 → 실전 화면이 쓰는 콘텐츠.
 *
 * 실전과 **같은 화면으로 푼다** — 복습은 강사 코칭 없이 풀고 채점만 하는 자리라, 실전 문항을
 * 담는 그릇을 그대로 쓰면 된다. 그래서 `buildPractice` 와 같은 모양을 만든다. 다르게 만들면
 * 같은 Part 를 두 벌로 조판하게 되고 한쪽만 고쳐지는 일이 생긴다.
 *
 * 지금 복습 문항이 있는 것은 FGI 시연 두 강의(Part 1 · Part 5)뿐이다. 다른 파트는 null →
 * 화면이 "낼 문제가 없다"고 말한다(엉뚱한 그릇에 담아 깨지는 것보다 낫다).
 */
export function buildReviewContent(part: number, rows: UiDbQuestion[]): TypeLessonContent | null {
  /* 복습 코드(-R001, -R002 …)는 원문항 순서를 그대로 물려받았다 — 코드순이 곧 낼 순서다 */
  const group = [...rows].sort((a, b) => a.code.localeCompare(b.code))
  if (!group.length) return null

  if (part === 1) {
    return {
      optionAudio: true,
      photo: group[0].content.image_url,
      questions: group.map((q) => ({ ...toQuestion(q, ''), photo: q.content.image_url })),
    }
  }
  if (part === 5) {
    return {
      passages: [{
        id: 'p1', kind: 'text',
        sentences: group.map((q, i) => ({
          id: `s${i + 1}`, en: toBlank(q.content.blank_sentence ?? ''), blank: i + 1, ...p5Ko(q),
        })),
      }],
      questions: group.map((q) => toQuestion(q, '')),
    }
  }
  return null
}

/**
 * 앵커 문항 기준으로 로컬 lesson을 DB 콘텐츠·레일로 갈아끼운다.
 * rows는 같은 강의(또는 같은 지문)의 문항 전체 — 앵커가 속한 지문 묶음만 골라 쓴다.
 * 지원하지 않는 파트이거나 필수 필드가 비면 로컬 lesson을 그대로 반환(폴백).
 */
export function buildLessonFromDb(local: TypeLesson, rows: UiDbQuestion[], anchorCode: string): TypeLesson {
  const anchor = rows.find((r) => r.code === anchorCode)
  if (!anchor || anchor.options.length === 0 || anchor.part !== local.part) return local
  const lessonRows = rows.filter((r) => r.content.stage !== 'practice')
  const group = groupOf(lessonRows, anchor)

  let built: TypeLesson
  switch (local.part) {
    case 1: built = buildPart1(local, lessonRows, anchor); break
    case 2: built = buildLc(local, [anchor]); break          // 질문 1개가 한 바퀴
    case 3:
    case 4: built = buildLc(local, group); break             // 지문(대화·담화) 1개가 한 바퀴
    case 5: built = buildPart5(local, lessonRows, anchor); break
    case 6: built = buildPart6(local, group); break
    case 7: built = buildPart7(local, group); break
    default: return local
  }
  if (built === local) return local          // 필수 필드가 비어 폴백된 경우 실전도 붙이지 않는다

  return { ...built, dbBacked: true, practice: buildPractice(local.part, rows) ?? built.practice }
}
