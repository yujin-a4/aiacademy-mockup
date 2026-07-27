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
import type { Interaction, Turn, TypeLessonContent } from './types'

/** LLM에 줄 "이번 문항 사실" — 여기 없는 건 지어내지 말라고 시킨다 */
export function factsOf(content: TypeLessonContent, part: number): string {
  const lines: string[] = [`파트: Part ${part}`]
  if (content.photoDesc) lines.push(`사진: ${content.photoDesc}`)
  for (const p of content.passages ?? []) {
    const body = p.sentences?.map((s) => s.en).join(' ') ?? ''
    if (body) lines.push(`지문(${p.label ?? p.kind}): ${body.slice(0, 600)}`)
  }
  content.questions.forEach((q, i) => {
    lines.push(`문항 ${i + 1}: ${q.q}`)
    q.options.forEach((o) => {
      lines.push(`  ${o.label}) ${o.text}${o.correct ? ' [정답]' : ''}${o.why ? ` — ${o.why}` : ''}`)
    })
  })
  return lines.join('\n')
}

/** 화면에 뜨는 상호작용을 사람 말로 — LLM이 "학생이 뭘 하는 턴인지" 알아야 문구가 맞는다 */
const KIND_LABEL: Record<Interaction['kind'], string> = {
  next: '설명만 듣고 넘어가기',
  choice: '두 선택지 중 고르기',
  pickAnswer: '문항 보기에서 정답 고르기',
  solveAll: '모든 문항 풀기',
  subjective: '자기 말로 설명하기',
  mark: '지문·문장에서 단어 짚기',
  shadow: '따라 말하기',
  match: '지문에서 근거 연결하기',
}

/** 문구가 있어야 의미 있는 상호작용만 — 'next'는 문구가 없다 */
const NEEDS_PROMPT = new Set<Interaction['kind']>(['choice', 'pickAnswer', 'solveAll', 'subjective', 'mark', 'match'])

async function fetchPrompts(
  turns: Turn[], steps: DbLectureStep[], facts: string,
): Promise<Record<number, string>> {
  const payload = turns.flatMap((t, i) => {
    const step = steps[i]
    if (!NEEDS_PROMPT.has(t.interaction.kind)) return []
    if (step?.promptLocked) return []          // 이 강의 전용 예외 — LLM이 건드리지 않는다
    return [{
      no: t.no,
      stage: t.stage,
      interaction: KIND_LABEL[t.interaction.kind],
      seed: step?.promptSeed ?? null,
    }]
  })
  if (!payload.length) return {}

  const res = await fetch('/api/rail-prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turns: payload, facts }),
  })
  if (!res.ok) return {}
  const json = await res.json()
  const out: Record<number, string> = {}
  for (const [k, v] of Object.entries((json?.prompts ?? {}) as Record<string, string>)) {
    const no = Number(k)
    if (Number.isFinite(no) && typeof v === 'string' && v.trim()) out[no] = v.trim()
  }
  return out
}

/** 상호작용에 문구 갈아끼우기 — 종류마다 문구가 들어가는 자리가 달라서 하나씩 처리 */
function withPrompt(it: Interaction, prompt: string): Interaction {
  switch (it.kind) {
    case 'choice':     return { ...it, prompt }
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
): RailPromptState {
  const [state, setState] = useState<RailPromptState>({ turns, generated: {}, status: 'idle' })

  useEffect(() => {
    let alive = true
    if (!enabled || !turns.length || !content) { setState({ turns, generated: {}, status: 'off' }); return }
    setState({ turns, generated: {}, status: 'loading' })
    fetchPrompts(turns, steps, factsOf(content, part))
      .then((generated) => {
        if (!alive) return
        const merged = turns.map((t) => {
          const p = generated[t.no]
          return p ? { ...t, interaction: withPrompt(t.interaction, p) } : t
        })
        setState({ turns: merged, generated, status: 'done' })
      })
      .catch(() => { if (alive) setState({ turns, generated: {}, status: 'done' }) })
    return () => { alive = false }
    // turns는 매 렌더 새 배열이라 의존성에서 뺀다 — 레일이 바뀌면 아래 키가 바뀐다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, part, turns.length, steps.map((s) => s.partCode ?? s.stepCode).join('|')])

  return state
}
