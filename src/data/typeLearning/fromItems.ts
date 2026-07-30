'use client'

/**
 * 아이템 순회 — docs/db-restructure-plan.md §7 STEP 4
 *
 * ── 무엇이 문제였나 ────────────────────────────────────────────────
 * 지금까지 화면은 강의의 **앵커 문항(-Q001) 하나**만 잡고 레일을 한 번 돌렸다.
 *   LC-P1-01 은 사진이 3장인데 1장만 수업하고 끝났다. RC-P5-08 도 문장 5개 중 1개만.
 * 그렇다고 문항 수로 곱하면 Part6·7이 깨진다 — Part6 레일 11턴은 이미 빈칸 4개를 훑기 때문에
 * 문항 수로 곱하면 44턴이 된다(4배 중복).
 *
 * ── 무엇을 하나 ────────────────────────────────────────────────────
 * `v_lecture_program`(DB)이 알려준 **아이템**마다 레일을 한 바퀴 돌리고, 그 결과를 이어붙인다.
 *   아이템 = P1·P2·P5 문항 1개 / P3·P4·P6·P7 지문 1개
 *   기대값(실측): LC-P1-01 7×3=21턴 · RC-P5-08 7×5=35턴 · RC-P6-01 11턴 · RC-P7-03 7×2=14턴
 *
 * ── 이어붙일 때 반드시 해야 하는 것 ────────────────────────────────
 * 턴은 문항을 **인덱스**로, 지문·문장을 **id**로 가리킨다. 아이템을 이으면 둘 다 충돌한다.
 *   · focusQ / pickAnswer.qIdx / audio.qIdx → 앞 아이템들의 문항 수만큼 밀어준다
 *   · 지문 id·문장 id → 아이템 접두어(`i2`)를 붙이고, 그걸 가리키는 참조를 전부 다시 쓴다
 * 이걸 빼먹으면 2번째 아이템 턴이 1번째 아이템의 문항을 가리킨다(조용히 틀린다).
 */
import type { UiDbQuestion } from '@/data/db/questionStore'
import type { ProgramItem } from '@/data/db/lectureProgramStore'
import { buildLessonFromDb } from './fromDb'
import { buildTurnsFromSteps, type RailDiag } from './fromSteps'
import type {
  AudioCue, LessonItemRef, PassageDoc, QuestionItem, RevealState, Turn, TypeLesson, TypeLessonContent,
} from './types'

export interface ItemsResult {
  lesson: TypeLesson
  diags: RailDiag[]
  /** 레일을 DB에서 읽어 돌렸나 (false면 코드 생성 레일로 폴백한 것) */
  railFromDb: boolean
}

/* ── 아이템 접두어로 id 다시 쓰기 ── */

const pfx = (seq: number, id: string) => `i${seq}${id}`

function remapPassages(docs: PassageDoc[], seq: number): PassageDoc[] {
  return docs.map((p) => ({
    ...p,
    id: pfx(seq, p.id),
    sentences: p.sentences?.map((s) => ({ ...s, id: pfx(seq, s.id) })),
  }))
}

function remapReveal(r: RevealState | undefined, seq: number, qBase: number): RevealState | undefined {
  if (!r) return undefined
  return {
    ...(r.scriptIds ? { scriptIds: r.scriptIds === 'all' ? 'all' : r.scriptIds.map((id) => pfx(seq, id)) } : {}),
    ...(r.passageIds ? { passageIds: r.passageIds === 'all' ? 'all' : r.passageIds.map((id) => pfx(seq, id)) } : {}),
    ...(r.optionText ? { optionText: r.optionText.map((o) => ({ ...o, qIdx: o.qIdx + qBase })) } : {}),
  }
}

function remapAudio(a: AudioCue | undefined, seq: number, qBase: number): AudioCue | undefined {
  if (!a) return undefined
  switch (a.kind) {
    case 'sentences': return { kind: 'sentences', ids: a.ids.map((id) => pfx(seq, id)) }
    case 'option':    return { ...a, qIdx: a.qIdx + qBase }
    case 'options':   return { ...a, qIdx: a.qIdx + qBase }
    // 발화+보기 — 문항 번호와 문장 id 둘 다 아이템 기준으로 옮겨야 한다
    case 'mix':       return { ...a, qIdx: a.qIdx + qBase, ids: a.ids.map((id) => pfx(seq, id)) }
    default:          return a
  }
}

function remapTurn(t: Turn, seq: number, occurrence: number, qBase: number, no: number): Turn {
  const it = t.interaction
  const interaction = it.kind === 'pickAnswer' ? { ...it, qIdx: it.qIdx + qBase }
    : it.kind === 'match'
      ? {
        ...it,
        evidence: it.evidence.map((e) => ({
          ...e,
          passageId: pfx(seq, e.passageId),
          // 문장 id만 접두어를 붙인다. `row:0`·`meta:To` 같은 대상은 지문 안에서 유일하므로 그대로
          targetIds: e.targetIds.map((id) => (/^(row|meta):/.test(id) ? id : pfx(seq, id))),
        })),
      }
      : it
  return {
    ...t,
    no,
    itemSeq: seq,
    occurrence,
    interaction,
    ...(t.focusQ != null ? { focusQ: t.focusQ + qBase } : {}),
    ...(remapAudio(t.audio, seq, qBase) ? { audio: remapAudio(t.audio, seq, qBase)! } : {}),
    ...(remapReveal(t.reveal, seq, qBase) ? { reveal: remapReveal(t.reveal, seq, qBase)! } : {}),
  }
}

/* ── 진입점 ── */

/**
 * 아이템 순회로 수업 하나를 조립한다.
 *
 * @param local   파트 형판(로컬 TypeLesson) — 제목·recap 폴백에만 쓴다
 * @param rows    강의의 문항 전체 (수업 + 실전)
 * @param items   `v_lecture_program` 이 준 아이템 (수업 phase)
 *
 * 아이템이 없거나 조립에 실패하면 **기존 동작(앵커 1문항)으로 그대로 폴백**한다.
 * 이 파일 때문에 화면이 죽는 일은 없어야 한다.
 */
export function buildLessonFromItems(
  local: TypeLesson, rows: UiDbQuestion[], items: ProgramItem[],
): ItemsResult {
  const byCode = new Map(rows.map((r) => [r.code, r]))
  const anchor = items[0]?.questionCodes[0] ?? rows[0]?.code ?? ''

  // 제목·설명·recap·실전 세트는 강의 전체를 한 번 훑어 만든다 (아이템마다 다시 만들 이유가 없다)
  const whole = buildLessonFromDb(local, rows, anchor)
  if (!items.length) return { lesson: whole, diags: [], railFromDb: false }

  const content: TypeLessonContent = { questions: [], passages: [] }
  const turns: Turn[] = []
  const refs: LessonItemRef[] = []
  const diags: RailDiag[] = []
  let railFromDb = false

  items.forEach((item, idx) => {
    const itemRows = item.questionCodes.map((c) => byCode.get(c)).filter((r): r is UiDbQuestion => !!r)
    if (!itemRows.length) return

    const built = buildLessonFromDb(local, itemRows, itemRows[0].code)
    if (built === local) return                     // 필수 필드가 비어 폴백 — 이 아이템은 건너뛴다

    const qBase = content.questions.length
    const isLast = idx === items.length - 1

    /* 콘텐츠 — 지문은 접두어를 붙여서, 문항은 그대로 이어붙인다 */
    const docs = remapPassages(built.content.passages ?? [], item.itemSeq)
    content.passages!.push(...docs)

    /* LC 음원 스크립트도 같은 규칙으로 (문장 id가 아이템 사이에서 겹치면 엉뚱한 문장이 재생된다).
       시각자료(표)는 아이템마다 하나라 첫 아이템 것만 쓴다 — LC는 지금 강의당 아이템이 1개다. */
    const script = built.content.audioScript ?? []
    if (script.length) {
      content.audioScript = [
        ...(content.audioScript ?? []),
        ...script.map((s) => ({ ...s, id: pfx(item.itemSeq, s.id) })),
      ]
    }
    if (built.content.visual && !content.visual) content.visual = built.content.visual

    // P1은 사진이 아이템(문항)마다 다르다 → 강의 단위 photo 대신 문항에 붙인다
    const photo = built.content.photo
    const qs: QuestionItem[] = built.content.questions.map((q) => (photo && !q.photo ? { ...q, photo } : q))
    content.questions.push(...qs)
    if (built.content.optionAudio) content.optionAudio = true
    if (items.length === 1 && photo) content.photo = photo
    if (built.content.photoDesc && !content.photoDesc) content.photoDesc = built.content.photoDesc

    /* 레일 — DB 레일이 있으면 그걸로, 없으면 코드 생성 레일로 */
    const fromDb = item.steps.length
      ? buildTurnsFromSteps(item.steps, built.content, !!whole.practice && isLast)
      : { turns: [], diags: [] }
    const src = fromDb.turns.length ? fromDb.turns : built.turns
    if (fromDb.turns.length) { railFromDb = true; diags.push(...fromDb.diags) }

    for (const t of src) turns.push(remapTurn(t, item.itemSeq, item.occurrence, qBase, turns.length + 1))

    refs.push({
      seq: item.itemSeq, occurrence: item.occurrence, typeCode: item.typeCode,
      questionTypeId: item.questionTypeId,
      qFrom: qBase, qTo: content.questions.length,
      passageIds: docs.map((d) => d.id),
    })
  })

  if (!turns.length || !content.questions.length) {
    return { lesson: whole, diags: [], railFromDb: false }   // 조립 실패 → 기존 동작
  }

  return {
    lesson: { ...whole, content, turns, items: refs },
    diags,
    railFromDb,
  }
}
