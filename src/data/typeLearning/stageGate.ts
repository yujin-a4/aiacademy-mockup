/**
 * 단계 → **에이전트/생성 LLM 에 공개할 범위**(게이트).
 *
 * ── 왜 필요한가 (실측 2026-07-30) ─────────────────────────────────
 * 수업 첫 턴(S1 핵심 단서 찾기)에서 강사가 "에이 비 씨 디 중에 뭐 같아 말해봐" 라고 했다.
 * 보기 음원을 아직 들려주지도 않은 시점이다. 원인은 프롬프트가 아니라 **정보**였다 —
 * `buildLessonFacts`·`factsOf` 가 세션 시작 때 보기 전문과 정답을 통째로 줬다.
 * 알고 있으면 말한다. 프롬프트로 "말하지 마라"를 쓰는 건 가장 약한 통제다.
 *
 * ── 원칙 ──────────────────────────────────────────────────────────
 * **모르면 말할 수 없다.** 그 단계에서 필요 없는 사실은 아예 주지 않는다.
 *
 * ── 왜 단조 증가인가 ───────────────────────────────────────────────
 * 대화 컨텍스트는 **누적된다.** 한 번 준 정답은 회수할 수 없다. 그래서 등급이 내려가는
 * 설계는 의미가 없고(이미 알고 있다), 올라갈 때만 추가로 준다.
 */
import type { Turn } from './types'

/** 1 clue → 2 solve → 3 answer → 4 review. 숫자가 클수록 더 많이 안다 */
export type Gate = 1 | 2 | 3 | 4

export const GATE_NAME: Record<Gate, string> = {
  1: 'clue', 2: 'solve', 3: 'answer', 4: 'review',
}

/** 단계 이름에 든 S코드 전부 — 정본 레일은 한 턴에 여러 개가 붙어 있다
 *  ('Q1-S5 + 쉐도잉 + S6', 'S2+S3+S1 유형 안내·단서 확인'). 가장 높은 것이 그 턴의 성격이다.
 *  ⚠️ 'Q1-S5' 의 Q1 을 S코드로 오인하면 안 되므로 S 뒤 숫자만 본다. */
function maxSCode(stage: string): number | null {
  const codes = Array.from(String(stage ?? '').matchAll(/S(\d)/g)).map((m) => Number(m[1]))
  return codes.length ? Math.max(...codes) : null
}

/** 이 턴 하나만 놓고 봤을 때 필요한 공개 범위 */
function baseGate(turn: Turn): Gate {
  const k = turn.interaction.kind
  const s = maxSCode(turn.stage)

  // S6(오답 제거)·S7(정리)는 오답 이유까지 필요하다.
  // Part5 레일은 S6 → S5 순서라 여기서 먼저 열린다 — 오답을 제거하려면 정답을 알아야 한다.
  if (s !== null && s >= 6) return 4
  // S5 = 정답 근거 연결 → 정답과 근거를 안다
  if (s === 5) return 3
  // 학생이 스스로 푸는 턴(S0·학생 풀이·전체 풀기·정답 고르기) → 보기는 알되 정답은 모른다
  if (s === 0 || k === 'solveAll' || k === 'pickAnswer') return 2
  // 그 외(S1~S4 단서 찾기·유형 판별·개념·구조) → 사진·지문만
  return 1
}

/** 레일 전체의 등급 — 한 아이템 안에서는 **한 번 오르면 내려가지 않고**(컨텍스트가 누적되므로),
 *  **아이템이 바뀌면 1로 되돌린다.**
 *
 *  왜 리셋하나 (실측): Part1 은 사진 3장이 아이템 3개다. 리셋하지 않으면 첫 사진에서 오른 등급이
 *  그대로 유지돼 **두 번째 사진의 S1(단서 찾기)에서 이미 그 사진의 정답을 알고 있다.**
 *  사실 주입도 아이템 단위로 다시 보내므로(`${itemSeq}:${gate}`) 여기서 리셋해야 정합이 맞는다. */
export function gateLevels(turns: Turn[]): Gate[] {
  let cur: Gate = 1
  let item: number | undefined
  return turns.map((t) => {
    if (t.itemSeq !== item) { item = t.itemSeq; cur = 1 }   // 새 아이템 = 새 자료 = 처음부터
    const b = baseGate(t)
    if (b > cur) cur = b
    return cur
  })
}

/** 에이전트에게 "지금 무엇을 말해도 되는지"를 명시한다 — 정보 차단의 보조 설명 */
export const GATE_RULE: Record<Gate, string> = {
  1: '지금은 보기와 정답을 모른다. 보기 내용이나 정답을 절대 언급하지 마라. 사진·지문에서 관찰되는 것만 다룬다.',
  2: '보기는 알지만 **어느 것이 정답인지는 모른다.** 정답을 아는 척하지 마라. 학생이 스스로 고르게 하라.',
  3: '이제 정답과 그 근거를 안다. 근거를 짚어도 된다. 다만 오답 하나하나의 이유는 아직 다루지 않는다.',
  4: '정답·근거·오답 이유를 모두 안다. 학생이 고른 것에 맞춰 짚어라.',
}
