'use client'

/**
 * 학생 문구를 LLM이 만들게 하는 훅 (부품화의 마지막 조각).
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 부품(rail_steps)은 "S6 오답 제거 / 선택 응답"까지만 갖는다. 문구를 강의마다 손으로 써두면
 * 강의가 늘 때마다 사람이 따라 써야 해서 확장이 안 된다. 그래서 문구는 매번 만든다.
 *
 * ── 우선순위 ────────────────────────────────────────────────────
 *   1. override      — 이 강의 전용 예외 (있으면 LLM이 못 건드림). 목표는 0개.
 *   2. LLM 생성분     — 부품 + 이번 문항 사실로 생성
 *   3. 부품 기본값 / seed — LLM 꺼져 있거나 실패했을 때
 *
 * 3번이 있어서 키가 없는 환경에서도 화면이 비지 않는다 (다른 API 라우트와 같은 폴백 원칙).
 */
import { useEffect, useState } from 'react'
import type { DbLectureStep } from '@/data/db/lectureStepStore'
import { DEFAULT_TONE, INST_TONE } from '@/data/instructorData'
import { gateLevels, GATE_RULE, type Gate } from './stageGate'
import type { Interaction, LessonItemRef, Turn, TypeLessonContent } from './types'

/** LLM에 줄 "이번 문항 사실" — 여기 없는 건 지어내지 말라고 시킨다 */
export function factsOf(
  content: TypeLessonContent, part: number, item: LessonItemRef | undefined, gate: Gate,
): string {
  const material = (item ? content.questions.slice(item.qFrom, item.qTo) : content.questions)
    .some((q) => q.photo) || content.photo ? '사진'
    : content.passages?.length ? '지문'
      : content.audioScript?.length ? '음원(스크립트)' : '문장'
  const lines: string[] = [
    `파트: Part ${part}`,
    /* ⚠️ 자료 종류를 안 주면 사진 문항에도 "핵심 단어를 골라봐" 같은 문구가 나온다(실측).
       사진에는 짚을 단어가 없다. */
    `자료 종류: ${material} — 학생에게 시킬 때 이 자료에 없는 것을 시키지 마라`
    + (material === '사진' ? ' (사진에는 단어가 없다. "단어를 고르라"고 하지 마라)' : ''),
  ]
  /* 아이템(레일 한 바퀴)이 주어지면 **그 바퀴의 문항·지문만** 준다.
     강의 전체를 주면 모델이 여러 문항 중 어느 것에 대한 턴인지 골라야 해서 엉뚱한 문항을 말한다. */
  const qs = item ? content.questions.slice(item.qFrom, item.qTo) : content.questions
  const psgs = item
    ? (content.passages ?? []).filter((p) => item.passageIds.includes(p.id))
    : (content.passages ?? [])
  if (content.photoDesc) lines.push(`사진: ${content.photoDesc}`)
  for (const p of psgs) {
    const body = p.sentences?.map((s) => s.en).join(' ') ?? ''
    if (body) lines.push(`지문(${p.label ?? p.kind}): ${body.slice(0, 600)}`)
  }
  /* 게이트 — 생성되는 문구가 아직 안 배운 것을 흘리지 않게 (stageGate.ts).
     화면 배너 문구도 여기서 나오므로, 단서 단계에서 보기를 주면 "보기 중에 골라봐"가 나온다. */
  qs.forEach((q, i) => {
    lines.push(`문항 ${i + 1}: ${q.q}`)
    if (gate === 1) return
    q.options.forEach((o) => {
      const mark = gate >= 3 && o.correct ? ' [정답]' : ''
      const why = (gate >= 4 || (gate === 3 && o.correct)) && o.why ? ` — ${o.why}` : ''
      lines.push(`  ${o.label}) ${o.text}${mark}${why}`)
    })
  })
  lines.push(`[이 단계에서 쓸 수 있는 범위] ${GATE_RULE[gate]}`)
  return lines.join('\n')
}

/** 화면에 뜨는 상호작용을 사람 말로 — LLM이 "학생이 뭘 하는 턴인지" 알아야 문구가 맞는다 */
const KIND_LABEL: Record<Interaction['kind'], string> = {
  next: '설명만 듣고 넘어가기',
  choice: '두 선택지 중 고르기',
  pickAnswer: '문항 보기에서 정답 고르기',
  solveAll: '모든 문항 풀기',
  subjective: '자기 말로 설명하기',
  mark: '화면에 직접 표시하기 — 사진이면 그 부분에 동그라미, 지문이면 그 단어에 밑줄·탭',
  shadow: '따라 말하기',
  match: '지문에서 근거 연결하기',
}

/** 문구가 있어야 의미 있는 상호작용만 — 'next'는 문구가 없다 */
const NEEDS_PROMPT = new Set<Interaction['kind']>(['choice', 'pickAnswer', 'solveAll', 'subjective', 'mark', 'match'])

async function fetchPrompts(
  turns: Turn[], steps: DbLectureStep[], facts: string, tone: string,
): Promise<{ prompts: Record<number, string>; tutors: Record<number, string> }> {
  /* 씨앗(말투 참고)은 **턴 자신에게서** 뽑는다.
     예전에는 steps[i] 로 짝지었는데, 쉐도잉처럼 건너뛴 턴이 있으면 길이가 달라져
     엉뚱한 단계의 문구를 참고하게 된다(LC 는 12단계 → 9턴). */
  const lockedStages = new Set(
    steps.filter((st) => st.promptLocked).map((st) => st.stepCode),
  )
  /* 시트 "스캐폴딩 입력"의 [설명] — 이 단계에서 강사가 뭘 시키는지.
     발화 문장이 아니라 **지시**라서 (옛 seed 와 달리) 다른 문항의 내용어가 없다.
     단계 코드로 짝짓는다 — 인덱스로 하면 건너뛴 턴에서 어긋난다(위 주석과 같은 이유). */
  const roleByStage = new Map(
    steps.filter((st) => st.fixedRule).map((st) => [st.stepCode, st.fixedRule as string]),
  )
  const payload = turns.flatMap((t) => {
    if (lockedStages.has(t.stage)) return []   // 이 강의 전용 예외 — LLM이 건드리지 않는다
    const needsPrompt = NEEDS_PROMPT.has(t.interaction.kind)
    const cur = 'prompt' in t.interaction ? (t.interaction as { prompt?: string }).prompt : undefined
    return [{
      no: t.no,
      stage: t.stage,
      role: roleByStage.get(t.stage),
      interaction: KIND_LABEL[t.interaction.kind],
      needsPrompt,
      /* ⚠️ 시트에 적힌 문구(seed)는 **보내지 않는다.**
         원래는 "말투 참고"로 넣었는데, 그 문장에 다른 문항의 내용어가 박혀 있어
         생성을 오염시켰다 — RC-P5-03(명사 강의)에서 "뒤에 to가 있으니 apply 같은
         자동사"(RC-P5-08 문장)가 나왔다.
         DB는 **단계가 무엇을 시키는지**만 준다. 말은 문항 사실을 보고 LLM이 만든다.
         강사 말투·개성은 목소리(에이전트)와 페르소나가 낸다. */
    }]
  })
  if (!payload.length) return { prompts: {}, tutors: {} }

  const res = await fetch('/api/rail-prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turns: payload, facts, tone }),
  })
  if (!res.ok) return { prompts: {}, tutors: {} }
  const json = await res.json()
  const pick = (src: unknown): Record<number, string> => {
    const out: Record<number, string> = {}
    for (const [k, v] of Object.entries((src ?? {}) as Record<string, string>)) {
      const no = Number(k)
      if (Number.isFinite(no) && typeof v === 'string' && v.trim()) out[no] = v.trim()
    }
    return out
  }
  return { prompts: pick(json?.prompts), tutors: pick(json?.tutors) }
}

/**
 * 수업 한 판을 **아이템(레일 한 바퀴) 단위로 나눠** 생성한다.
 *
 * 왜 나누나 (실측 2026-07-28):
 *   LC-P1-01 은 21턴(7단계 × 사진 3장)이다. 한 번에 요청하니 모델 응답이 잘려
 *   `unparsable-model-output` 이 되고, 통째로 폴백해서 **시트의 옛 문구가 그대로 나왔다.**
 *   화면에서 "사진 한번 봐볼게요… 서류가 책상 위에" 가 계속 보이던 원인이 이것이다.
 * 덤으로 아이템별 문항 사실만 주게 되어, 모델이 어느 문항 이야기인지 헷갈릴 일이 없다.
 */
async function fetchPromptsByItem(
  turns: Turn[], steps: DbLectureStep[], content: TypeLessonContent, part: number,
  items: LessonItemRef[] | undefined, tone: string,
): Promise<{ prompts: Record<number, string>; tutors: Record<number, string> }> {
  /* 등급(stageGate)은 **레일 전체 순서**로 정해진다 — 아이템별로 자르기 전에 한 번 계산한다.
     같은 아이템 안에서도 S1 턴과 S6 턴은 알아야 할 것이 다르므로, 아래에서 등급별로 또 나눈다. */
  const gateByTurn = new Map<number, Gate>()
  gateLevels(turns).forEach((g, i) => gateByTurn.set(turns[i].no, g))
  const gateOf = (t: Turn): Gate => gateByTurn.get(t.no) ?? 1

  if (!items?.length) {
    /* 아이템 정보가 없으면 등급으로만 나눈다 */
    const byGate = new Map<Gate, Turn[]>()
    for (const t of turns) {
      const g = gateOf(t)
      byGate.set(g, [...(byGate.get(g) ?? []), t])
    }
    const entries: [Gate, Turn[]][] = []
    byGate.forEach((ts, g) => entries.push([g, ts]))
    const rs = await Promise.all(entries.map(([g, ts]) =>
      fetchPrompts(ts, steps, factsOf(content, part, undefined, g), tone)
        .catch(() => ({ prompts: {}, tutors: {} }))))
    const prompts: Record<number, string> = {}
    const tutors: Record<number, string> = {}
    for (const r of rs) { Object.assign(prompts, r.prompts); Object.assign(tutors, r.tutors) }
    return { prompts, tutors }
  }

  const groups: { item: LessonItemRef | undefined; gate: Gate; turns: Turn[] }[] = []
  const push = (item: LessonItemRef | undefined, ts: Turn[]) => {
    const byGate = new Map<Gate, Turn[]>()
    for (const t of ts) {
      const g = gateOf(t)
      byGate.set(g, [...(byGate.get(g) ?? []), t])
    }
    byGate.forEach((gts, gate) => groups.push({ item, gate, turns: gts }))
  }
  for (const it of items) {
    const ts = turns.filter((t) => t.itemSeq === it.seq)
    if (ts.length) push(it, ts)
  }
  // 아이템에 안 붙은 턴(구방식)은 한 덩어리로
  const loose = turns.filter((t) => t.itemSeq == null)
  if (loose.length) push(undefined, loose)

  const results = await Promise.all(groups.map((g) =>
    fetchPrompts(g.turns, steps, factsOf(content, part, g.item, g.gate), tone)
      .catch(() => ({ prompts: {}, tutors: {} })),
  ))
  const prompts: Record<number, string> = {}
  const tutors: Record<number, string> = {}
  for (const r of results) {
    Object.assign(prompts, r.prompts)
    Object.assign(tutors, r.tutors)
  }
  return { prompts, tutors }
}

/** 상호작용에 문구 갈아끼우기 — 종류마다 문구가 들어가는 자리가 달라서 하나씩 처리 */
function withPrompt(it: Interaction, prompt: string): Interaction {
  switch (it.kind) {
    // 선택지와 짝인 문구(맞아요/아니에요 판정형)는 건드리지 않는다 — 어긋나면 학생이 뭘 고르는지 모른다
    case 'choice':     return it.fixedPrompt ? it : { ...it, prompt }
    case 'pickAnswer': return { ...it, prompt }
    case 'solveAll':   return { ...it, prompt }
    case 'subjective': return { ...it, prompt }
    case 'mark':       return { ...it, prompt }
    case 'match':      return { ...it, prompt }
    default:           return it
  }
}

export interface RailPromptState {
  turns: Turn[]
  /** 턴 번호 → LLM이 만든 문구 (검토 패널이 출처 표시에 쓴다) */
  generated: Record<number, string>
  status: 'idle' | 'loading' | 'done' | 'off'
}

/**
 * turns의 문구를 LLM 생성분으로 갈아끼운 배열을 돌려준다.
 * 생성 전/실패 시에는 원본 turns를 그대로 준다 → 화면이 비지 않는다.
 */
export function useRailPrompts(
  turns: Turn[], steps: DbLectureStep[], content: TypeLessonContent | null, part: number, enabled: boolean,
  items?: LessonItemRef[],
  /** 강사 — 말투를 생성 쪽에 넘긴다. 첫 마디는 에이전트가 그대로 낭독하므로 여기서 강사 색이 결정된다 */
  instructor?: string,
): RailPromptState {
  const [state, setState] = useState<RailPromptState>({ turns, generated: {}, status: 'idle' })

  useEffect(() => {
    let alive = true
    if (!enabled || !turns.length || !content) { setState({ turns, generated: {}, status: 'off' }); return }
    setState({ turns, generated: {}, status: 'loading' })
    fetchPromptsByItem(turns, steps, content, part, items,
      (instructor && INST_TONE[instructor]) || DEFAULT_TONE)
      .then(({ prompts, tutors }) => {
        if (!alive) return
        const merged = turns.map((t) => {
          const p = prompts[t.no]
          const tu = tutors[t.no]
          let next = t
          // 강사 발화도 갈아끼운다 — 시트 문장은 다른 문항을 보고 쓴 예시라
          // 그대로 낭독하면 화면과 어긋난다(실제로 LC-P1-01 에서 그랬다)
          if (tu) next = { ...next, tutor: tu }
          if (p) next = { ...next, interaction: withPrompt(next.interaction, p) }
          return next
        })
        setState({ turns: merged, generated: prompts, status: 'done' })
      })
      .catch(() => { if (alive) setState({ turns, generated: {}, status: 'done' }) })
    return () => { alive = false }
    // turns는 매 렌더 새 배열이라 의존성에서 뺀다 — 레일이 바뀌면 아래 키가 바뀐다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // 강사가 바뀌면 말투가 달라지므로 다시 만든다
  }, [enabled, part, instructor, turns.length, steps.map((s) => s.partCode ?? s.stepCode).join('|')])

  return state
}
