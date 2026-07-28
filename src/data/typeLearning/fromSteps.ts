'use client'

/**
 * lecture_steps(DB) → 유형학습 플레이어 턴(Turn[]) 번역기.
 *
 * ── 이 파일이 있는 이유 ─────────────────────────────────────────────
 * 스캐폴딩 레일은 콘텐츠팀이 구글시트에 **한국어 문장**으로 쓴다.
 *   interaction: "필수 수행 / 필기 인식 또는 주관식 응답"
 *   audio_mode : "선택지 A 음원만 재생한다. 재생 후 바로 판단한다."
 * 화면은 이걸 알아들을 수 없으므로, 여기서 사전을 놓고 화면 동작으로 옮긴다.
 *
 * ── 원칙 ───────────────────────────────────────────────────────────
 * 1) **레일(무엇을 시킬지)은 DB에서, 재료(보기·정답·근거)는 문항 DB에서.**
 *    "선택 응답"이라고만 쓰여 있으면 선택지는 문항에서 만들어 붙인다.
 * 2) **못 알아들으면 조용히 넘어가지 않는다.** 해석 실패는 warnings에 남기고
 *    화면(검토 패널)에 그대로 띄운다. 콘텐츠팀이 뭘 고쳐야 하는지 보이게.
 * 3) **해석 결과도 남긴다.** "선택 응답 → 맞다/아니다 2지선다로 해석" 처럼
 *    어떻게 먹혔는지 보여줘야 문구를 맞춰갈 수 있다.
 *
 * ── 한계 ───────────────────────────────────────────────────────────
 * audio_mode의 조건부 지시문("근거가 명확하면 멈춘다")은 원리적으로 해석 불가 —
 * 화면이 '근거가 명확한지'를 판단할 수 없다. 경고만 남기고 재생 지시는 버린다.
 * 이 문장들은 Part 2·3·4에 몰려 있고, 지금 DB로 도는 Part 1·5·6·7에는 없다.
 */
import type { DbLectureStep } from '@/data/db/lectureStepStore'
import type {
  AudioCue, Interaction, RevealState, Turn, TypeLessonContent,
} from './types'

/* ── FGI 범위 ──
   2026-07-28 기획 결정: **FGI에서 LC(Part 2·3·4)는 시연하되, 쉐도잉은 하지 않는다.**
   시트 레일에는 쉐도잉 턴이 남아 있으므로(lecture_steps 48행, 대부분 Part2) 화면에서 건너뛴다.
   레일 데이터를 지우지 않는 이유: 정본은 시트고, 결정이 뒤집히면 이 상수만 되돌리면 된다.
   계획서 §10 D10("쉐도잉을 어느 단계로 볼까")도 이 결정으로 해소됐다 — 안 쓰니 정할 필요가 없다. */
export const SKIP_SHADOW = true

/* ── 검토 결과 ── */

/** 턴 하나가 어떻게 해석됐는지 — 검토 패널이 그대로 보여준다 */
export interface RailDiag {
  no: number
  stepCode: string
  /** 부품 조합으로 돌 때 — 이 턴이 쓰는 부품 코드 ('P5-02') */
  partCode?: string | null
  /** LLM 생성 전, 학생 문구가 어디서 온 값인지 */
  promptOrigin?: DbLectureStep['promptOrigin']
  /** DB 원문 (사람이 쓴 그대로) */
  raw: Pick<DbLectureStep,
    'audioMode' | 'scriptMode' | 'interaction' | 'studentPrompt' | 'section' | 'dbFields' | 'fixedRule'>
  /** 해석 결과 — "이렇게 알아들었다" 한 줄씩 */
  read: { label: string; value: string }[]
  /** 못 알아들었거나 재료가 없어 다르게 처리한 것 */
  warnings: string[]
}

export interface RailFromSteps {
  turns: Turn[]
  diags: RailDiag[]
}

/* ── 문자열 유틸 ── */

/** 스마트따옴표·개행 정리. '—'·'-'·빈칸은 "값 없음"으로 본다 */
function clean(s: string | null | undefined): string | null {
  if (!s) return null
  const t = String(s)
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[“”"]/g, '')
    .trim()
  if (!t || /^[—–-]+$/.test(t)) return null
  return t
}

const has = (s: string | null, re: RegExp) => !!s && re.test(s)

/* ── 하위문제 지목 (focusQ) ──
   section("── Q2 세부 정보형 ──")이나 step_code("Q2 근거 확인")에 적힌 Qn → 문항 인덱스 */
function readFocusQ(step: DbLectureStep, questionCount: number): number | undefined {
  const src = `${step.section ?? ''} ${step.stepCode}`
  const m = src.match(/Q\s*(\d)/)
  if (!m) return undefined
  const idx = Number(m[1]) - 1
  return idx >= 0 && idx < questionCount ? idx : undefined
}

/* ── 이 턴이 다루는 보기 (A~D) ──
   "선택지 A 청취" / "선택지 A 음원만 재생한다" / "A 스크립트만 표시" 어디에 있든 잡는다 */
function readOptionLabel(step: DbLectureStep): string | null {
  const src = `${step.stepCode} ${step.audioMode ?? ''} ${step.scriptMode ?? ''}`
  const m = src.match(/선택지\s*([A-D])(?!\s*[~∼-])/) ?? src.match(/\b([A-D])\s*스크립트/)
  return m ? m[1] : null
}

/* ── 음원 (audio_mode → AudioCue) ── */

/** 판단을 요구하는 지시문 — 화면이 실행할 수 없는 것들 */
const CONDITIONAL = /근거가\s*(명확|불명확)|멈추거나 표시|보류|예상 타이밍|필요하면|못 잡으면/

function readAudio(
  step: DbLectureStep, content: TypeLessonContent, focusQ: number, warn: (m: string) => void,
): { cue?: AudioCue; note: string } {
  const raw = clean(step.audioMode)
  if (!raw) return { note: '없음 (빈 칸)' }
  if (/^재생 없음/.test(raw)) return { note: '재생 없음' }

  if (CONDITIONAL.test(raw)) {
    warn('음원 지시가 조건부 문장이라 화면이 실행할 수 없어요. ("근거가 명확하면 멈춘다" 같은 판단은 화면이 못 합니다) — 이 턴은 음원 없이 진행합니다.')
    return { note: '조건부 지시문 → 해석 불가' }
  }

  const range = raw.match(/선택지\s*([A-D])\s*[~∼-]\s*([A-D])/)
  if (range) {
    const from = range[1].charCodeAt(0)
    const to = range[2].charCodeAt(0)
    const labels = Array.from({ length: to - from + 1 }, (_, i) => String.fromCharCode(from + i))
    return { cue: { kind: 'options', qIdx: focusQ, labels }, note: `보기 ${labels.join('·')} 이어서 재생` }
  }

  const one = raw.match(/선택지\s*([A-D])/)
  if (one) return { cue: { kind: 'option', qIdx: focusQ, label: one[1] }, note: `보기 ${one[1]} 재생` }

  if (/전체 음원|처음부터 끝까지|전체를? 재생/.test(raw)) {
    return { cue: { kind: 'full' }, note: '전체 음원 재생' }
  }

  /* "질문 음원"·"발화 음원" (Part2) — 지문이 정규화되기 전(0014 이전)에는 재생할 방법이 없었다.
     지금은 스크립트가 문장 단위라 **한 문장짜리 스크립트면 그게 곧 질문 발화**다. 그것만 재생한다.
     여러 문장이면 어느 게 질문인지 데이터에 없으므로 예전처럼 경고만 남긴다(추측하지 않는다). */
  if (/질문 음원|발화 음원/.test(raw)) {
    const script = content.audioScript ?? []
    if (script.length === 1) {
      return { cue: { kind: 'sentences', ids: [script[0].id] }, note: '질문/발화 음원 재생' }
    }
    warn(`"질문 음원"·"발화 음원"인데 스크립트가 ${script.length}문장이라 어느 게 질문인지 알 수 없어요. (한 문장이면 그것을 재생합니다)`)
    return { note: '질문/발화 음원 → 대상 불명' }
  }

  warn(`음원 지시를 못 알아들었어요: "${raw.slice(0, 40)}…" — 쓸 수 있는 표현: "재생 없음", "선택지 A 음원만 재생한다", "선택지 A~C를 이어서 재생한다", "전체 음원을 처음부터 끝까지 재생한다"`)
  return { note: '해석 실패' }
}

/* ── 스크립트 공개 (script_mode → RevealState) ── */

function readReveal(
  step: DbLectureStep, content: TypeLessonContent, focusQ: number, warn: (m: string) => void,
): { reveal?: RevealState; note: string } {
  const raw = clean(step.scriptMode)
  if (!raw) return { note: '없음 (빈 칸)' }
  if (/표시 없음|공개 없음/.test(raw)) return { note: '표시 없음' }

  if (/전체 스크립트/.test(raw)) {
    return {
      reveal: { scriptIds: 'all', optionText: [{ qIdx: focusQ, labels: 'all' }] },
      note: '전체 스크립트 + 보기 전체 공개',
    }
  }

  const one = raw.match(/\b([A-D])\s*스크립트/)
  if (one) {
    return {
      reveal: { optionText: [{ qIdx: focusQ, labels: [one[1]] }] },
      note: `보기 ${one[1]} 텍스트만 공개`,
    }
  }

  /* 음원과 같은 규칙 — 한 문장짜리 스크립트면 그게 질문 발화다 */
  if (/질문 스크립트|발화 스크립트/.test(raw)) {
    const script = content.audioScript ?? []
    if (script.length === 1) {
      return { reveal: { scriptIds: [script[0].id] }, note: '질문/발화 스크립트 공개' }
    }
    warn('"질문 스크립트"·"발화 스크립트"인데 스크립트가 여러 문장이라 어느 게 질문인지 알 수 없어요 — 전체 공개로 처리합니다.')
    return { reveal: { scriptIds: 'all' }, note: '질문/발화 스크립트 → 전체 공개로 대체' }
  }

  warn(`스크립트 지시를 못 알아들었어요: "${raw.slice(0, 40)}…" — 쓸 수 있는 표현: "표시 없음", "A 스크립트만 표시", "전체 스크립트 공개"`)
  return { note: '해석 실패' }
}

/* ── 상호작용 (interaction → Interaction) ── */

/** 시트 표현 → 화면 상호작용 8종. '또는'으로 여러 개면 앞엣것을 쓴다. */
type Kind = Interaction['kind']

function readKind(raw: string | null): { kind: Kind | null; matched: string | null } {
  if (!raw) return { kind: null, matched: null }
  const primary = raw.split(/\s*또는\s*/)[0]
  const table: [RegExp, Kind, string][] = [
    [/매칭|근거 연결/, 'match', '매칭'],
    [/쉐도잉/, 'shadow', '쉐도잉'],
    [/필기\s*인식/, 'mark', '필기 인식'],
    [/주관식/, 'subjective', '주관식'],
    [/선택\s*응답|선택지 표시/, 'choice', '선택 응답'],
    [/필수\s*응답/, 'pickAnswer', '필수 응답'],
    [/전체\s*풀이|모두 풀기/, 'solveAll', '전체 풀이'],
    [/AI\s*진행/, 'next', 'AI 진행'],
    [/필수\s*수행/, 'mark', '필수 수행(단서 표시)'],
  ]
  for (const [re, kind, matched] of table) if (re.test(primary)) return { kind, matched }
  return { kind: null, matched: null }
}

/** 정/오답 판단을 시키는 2지선다 — 특정 보기 하나를 다루는 턴에서 쓴다 */
function optionVerdictChoice(
  content: TypeLessonContent, focusQ: number, label: string, prompt: string,
): Interaction | null {
  const opt = content.questions[focusQ]?.options.find((o) => o.label === label)
  if (!opt) return null
  return {
    kind: 'choice',
    prompt,
    choices: opt.correct
      ? [{ text: '맞아요', correct: true }, { text: '아니에요' }]
      : [{ text: '맞아요' }, { text: '아니에요', correct: true }],
    feedback: opt.why ?? (opt.correct ? '맞습니다.' : '맞지 않아요.'),
  }
}

/** 오답 고르기 — "맞지 않는 보기는?" 류. 정답이 아닌 보기를 정답으로 삼는다 */
function wrongPickChoice(
  content: TypeLessonContent, focusQ: number, prompt: string,
): Interaction | null {
  const opts = content.questions[focusQ]?.options ?? []
  const wrong = opts.find((o) => !o.correct && o.why) ?? opts.find((o) => !o.correct)
  const right = opts.find((o) => o.correct)
  if (!wrong || !right) return null
  return {
    kind: 'choice',
    prompt,
    choices: [
      { text: `${wrong.label}) ${wrong.text}`, correct: true },
      { text: `${right.label}) ${right.text}` },
    ],
    feedback: wrong.why ?? '이 보기는 자리에 맞지 않아요.',
  }
}

/** 쉐도잉 재료 — 이 턴이 다루는 보기, 없으면 정답 문장 */
function shadowChunks(content: TypeLessonContent, focusQ: number, label: string | null): string[] {
  const opts = content.questions[focusQ]?.options ?? []
  const src = (label ? opts.find((o) => o.label === label) : undefined) ?? opts.find((o) => o.correct)
  const text = src?.text ?? content.passages?.[0]?.sentences?.[0]?.en
  if (!text) return []
  // 의미 단위로 대충 끊기 — 쉼표/전치사 앞
  return text.split(/,\s*|\s+(?=(?:in|on|at|to|for|with|by|from|that|which)\b)/i)
    .map((c) => c.trim()).filter(Boolean)
}

/* ── 턴 하나 만들기 ── */

function buildTurn(
  step: DbLectureStep, content: TypeLessonContent, isLast: boolean, hasPractice: boolean,
): { turn: Turn | null; diag: RailDiag } {
  const warnings: string[] = []
  const warn = (m: string) => warnings.push(m)
  const read: { label: string; value: string }[] = []

  const qCount = content.questions.length
  const focusQ = readFocusQ(step, qCount) ?? 0
  const optLabel = readOptionLabel(step)
  const prompt = clean(step.studentPrompt)
  const tutor = clean(step.freeExpression) ?? prompt ?? step.stepCode

  const rawInteraction = clean(step.interaction)
  const { kind, matched } = readKind(rawInteraction)

  /* 버릴 턴은 먼저 걸러낸다 — 음원·스크립트를 해석하면 **버릴 턴에 대한 경고**가 쌓인다.
     (Part3 쉐도잉 턴의 "Qn 근거 구간을 다시 재생한다"가 그랬다. 안 쓸 턴인데 검토 패널만 시끄러워진다) */
  if (kind === 'shadow' && SKIP_SHADOW) {
    return {
      turn: null,
      diag: {
        no: step.order, stepCode: step.stepCode, partCode: step.partCode ?? null,
        promptOrigin: step.promptOrigin,
        raw: {
          audioMode: step.audioMode, scriptMode: step.scriptMode, interaction: step.interaction,
          studentPrompt: step.studentPrompt, section: step.section, dbFields: step.dbFields,
          fixedRule: step.fixedRule,
        },
        read: [{ label: '상호작용', value: '쉐도잉 → FGI 범위 밖이라 이 턴은 건너뜁니다' }],
        warnings: [],
      },
    }
  }

  const { cue, note: audioNote } = readAudio(step, content, focusQ, warn)
  const { reveal, note: revealNote } = readReveal(step, content, focusQ, warn)

  if (!kind && rawInteraction) {
    warn(`상호작용을 못 알아들었어요: "${rawInteraction}" — 쓸 수 있는 표현: AI 진행 / 선택 응답 / 필수 응답 / 주관식 응답 / 필수 수행 (필기 인식·쉐도잉·매칭)`)
  }

  const nextLabel = isLast ? (hasPractice ? '실전 문제 풀기' : '수업 마치기') : undefined
  const fallbackNext: Interaction = { kind: 'next', label: nextLabel }

  let interaction: Interaction = fallbackNext
  let interactionNote = 'AI 진행 (다음 버튼)'

  switch (kind) {
    case 'next':
    case null:
      interaction = fallbackNext
      interactionNote = kind ? 'AI 진행 (다음 버튼)' : '해석 실패 → 다음 버튼으로 진행'
      break

    case 'choice': {
      const p = prompt ?? '어떻게 볼까요?'
      const isWrongPick = /오답|맞지 않는|아닌 것|제거|소거/.test(`${step.stepCode} ${p}`)
      const built = optLabel
        ? optionVerdictChoice(content, focusQ, optLabel, p)
        : (isWrongPick ? wrongPickChoice(content, focusQ, p) : null)
      if (built) {
        interaction = built
        interactionNote = optLabel
          ? `선택 응답 → 보기 ${optLabel} 맞다/아니다 2지선다`
          : '선택 응답 → 오답 고르기 2지선다'
      } else if (qCount > 0) {
        interaction = { kind: 'pickAnswer', qIdx: focusQ, prompt: p }
        interactionNote = `선택 응답 → 어떤 보기를 다루는지 안 적혀 있어 Q${focusQ + 1} 정답 고르기로 처리`
        warn('"선택 응답"인데 어느 보기를 다루는 턴인지 알 수 없어요. 단계 이름에 "선택지 A"처럼 적어주면 맞다/아니다로 물어봅니다.')
      } else {
        warn('"선택 응답"인데 만들 선택지가 없어요 — 다음 버튼으로 넘깁니다.')
        interactionNote = '선택 응답 → 재료 없음, 다음 버튼'
      }
      break
    }

    case 'pickAnswer':
      if (qCount > 0) {
        interaction = { kind: 'pickAnswer', qIdx: focusQ, prompt: prompt ?? '정답을 고르세요' }
        interactionNote = `필수 응답 → Q${focusQ + 1} 정답 고르기`
      } else {
        warn('"필수 응답"인데 문항이 없어요 — 다음 버튼으로 넘깁니다.')
      }
      break

    case 'solveAll':
      interaction = { kind: 'solveAll', prompt: prompt ?? undefined }
      interactionNote = '전체 문항 풀기'
      break

    case 'subjective':
      interaction = { kind: 'subjective', prompt: prompt ?? '말로 답해보세요' }
      interactionNote = '주관식 (말하기/입력)'
      break

    case 'mark':
      // 어떤 단어를 짚어야 하는지는 레일에 없다 → 자유 표시로 두고 학생이 탭하면 완료
      interaction = { kind: 'mark', prompt: prompt ?? '핵심 단서를 표시해 보세요' }
      interactionNote = `${matched} → 지문에서 단어 탭(형광펜)`
      break

    case 'shadow': {
      // SKIP_SHADOW 인 경우는 위에서 이미 걸러졌다 — 여기는 쉐도잉을 다시 켰을 때의 경로
      const chunks = shadowChunks(content, focusQ, optLabel)
      if (chunks.length) {
        interaction = { kind: 'shadow', chunks }
        interactionNote = `쉐도잉 → ${chunks.length}개 구간`
      } else {
        warn('"쉐도잉"인데 따라 읽을 문장을 문항에서 찾지 못했어요 — 다음 버튼으로 넘깁니다.')
        interactionNote = '쉐도잉 → 재료 없음, 다음 버튼'
      }
      break
    }

    case 'match':
      // 어느 지문의 어느 문장을 연결해야 하는지가 레일에 없다 → 표시(mark)로 낮춘다
      interaction = { kind: 'mark', prompt: prompt ?? '근거가 되는 부분을 표시해 보세요' }
      interactionNote = '매칭 → 연결 대상이 레일에 없어 단어 표시로 대체'
      warn('"매칭"은 어느 지문의 어느 문장을 연결해야 하는지가 필요한데 레일엔 그 정보가 없어요. 지금은 단어 표시로 대신합니다.')
      break
  }

  read.push(
    { label: '상호작용', value: interactionNote },
    { label: '음원', value: audioNote },
    { label: '스크립트', value: revealNote },
    { label: '다루는 문항', value: qCount > 1 ? `Q${focusQ + 1}` : '문항 1개' },
  )

  const turn: Turn = {
    no: step.order,
    stage: step.stepCode,
    tutor,
    ...(cue ? { audio: cue } : {}),
    ...(reveal ? { reveal } : {}),
    interaction,
    ...(qCount > 1 ? { focusQ } : {}),
  }

  return {
    turn,
    diag: {
      no: step.order,
      stepCode: step.stepCode,
      partCode: step.partCode ?? null,
      promptOrigin: step.promptOrigin,
      raw: {
        audioMode: step.audioMode, scriptMode: step.scriptMode, interaction: step.interaction,
        studentPrompt: step.studentPrompt, section: step.section, dbFields: step.dbFields,
        fixedRule: step.fixedRule,
      },
      read,
      warnings,
    },
  }
}

/* ── 진입점 ── */

/**
 * DB 레일 → 턴 배열. steps가 비면 빈 결과를 돌려주고, 호출부가 기존 레일로 폴백한다.
 * content는 "재료" — 보기·정답·근거를 여기서 꺼내 상호작용에 채운다.
 */
export function buildTurnsFromSteps(
  steps: DbLectureStep[], content: TypeLessonContent, hasPractice: boolean,
): RailFromSteps {
  if (!steps.length || !content.questions.length) return { turns: [], diags: [] }

  /* 상호작용 칸이 통째로 빈 레일 = [공통] 4열 레일(단계·규칙·DB참조·자유표현만 있음).
     이걸로 턴을 만들면 전부 "다음 버튼"만 나오므로 쓰지 않고 폴백시킨다.
     턴 상세가 있는 건 강사별 레일(이도윤 9열/7열)뿐이다. */
  if (!steps.some((s) => clean(s.interaction))) return { turns: [], diags: [] }

  const built = steps.map((s, i) => buildTurn(s, content, i === steps.length - 1, hasPractice))
  // 버려진 턴(쉐도잉)이 있어도 diag 는 전부 남긴다 — 검토 패널에서 "왜 빠졌는지"가 보여야 한다
  return {
    turns: built.map((b) => b.turn).filter((t): t is Turn => !!t).map((t, i) => ({ ...t, no: i + 1 })),
    diags: built.map((b) => b.diag),
  }
}
