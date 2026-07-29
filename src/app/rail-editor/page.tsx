'use client'

/* 스캐폴딩 레일 편집기 — 콘텐츠팀용. docs/rail-editor-plan.md STEP 3
   /rail-editor

   ── 무엇을 하는 화면인가 ────────────────────────────────────────
   콘텐츠팀이 수업 단계 순서를 직접 짜보고, **진짜 수업 화면으로 확인**한다.
   지금 학생에게 나가는 레일(정본)은 이 화면에서 손댈 수 없다 — 드래프트만 만진다.

   ── 왜 자유 입력이 아니라 드롭다운인가 ──────────────────────────
   단계 변종 20종·상호작용 8종이 사전(step_variants·interactions)으로 고정돼 있다.
   그래서 "아무 말이나 쓰는 칸"이 아니라 **정해진 부품을 고르는 화면**이다.
   이러면 오입력이 구조적으로 막히고, 시트에 없어서 못 채우던 상호작용(D9)도 여기서 해결된다.

   ── 미리보기는 이 화면이 흉내내지 않는다 ────────────────────────
   /lecture/[code]?rail=<draft> 를 새 탭으로 연다. 음원 게이트·아이템 전환·문구 생성이
   전부 실제 화면에만 있어서, 흉내내면 "편집기에선 됐는데" 가 된다. */

import { useCallback, useEffect, useMemo, useState } from 'react'

interface Draft { draft_id: string; title: string; base_instructor: string; steps: number; promoted_at: string | null }
interface RailRow {
  question_type_id: number; type_code: string; type_name: string; part: number
  instructor_code: string; steps: number; sample_lecture: string | null
}
interface Variant { id: number; code: string; step_code: string; name: string; interaction_code: string | null; scope: string }
interface Step {
  id?: number; variantId: number; audioMode: string | null; scriptMode: string | null
  stepLabel: string | null; studentPromptOverride: string | null
}
interface CtxItem {
  lecture_code: string; phase: string; item_seq: number; passage_id: number | null
  question_count: number; question_codes: string | null
}
interface Ctx {
  type: { part: number; type_code: string; name: string; description: string | null } | null
  items: CtxItem[]
  counts: { lectures: number; items: number; questions: number; options: number; passages: number; live_rail_rows: number }
}

const api = async (url: string) => {
  const r = await fetch(url)
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || '실패')
  return j
}
const post = async (body: unknown) => {
  const r = await fetch('/api/rail-draft', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || '실패')
  return j
}

type TableSet = Record<string, { title: string; what: string; key: string; rows: Record<string, unknown>[] }>

/** 값 하나를 표 칸에 그린다. null·jsonb·긴 텍스트를 눈에 구분되게. */
function cell(v: unknown): { text: string; cls: string } {
  if (v === null || v === undefined) return { text: 'NULL', cls: 'text-[#CBD5E1] italic' }
  if (typeof v === 'boolean') return { text: String(v), cls: v ? 'text-[#15803D] font-bold' : 'text-[#B91C1C]' }
  if (typeof v === 'object') return { text: JSON.stringify(v), cls: 'text-[#7C3AED]' }
  if (typeof v === 'number') return { text: String(v), cls: 'text-[#0F172A] tabular-nums' }
  return { text: String(v), cls: 'text-[#334155]' }
}

/** Supabase Table Editor 풍 그리드 — 컬럼명은 실제 DB 컬럼 그대로 */
function DataGrid({ rows, highlight }: { rows: Record<string, unknown>[]; highlight?: string[] }) {
  if (!rows.length) return <p className="text-[11px] text-[#94A3B8] py-3">행 없음</p>
  const cols = Object.keys(rows[0])
  return (
    <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg bg-white">
      <table className="text-[11px] border-collapse w-max min-w-full">
        <thead className="bg-[#F8FAFC] sticky top-0">
          <tr>
            {cols.map((c) => (
              <th key={c} className={`text-left font-bold px-2 py-1.5 border-b border-[#E5E7EB] whitespace-nowrap ${
                highlight?.includes(c) ? 'text-[#1D4ED8]' : 'text-[#64748B]'}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-[#F8FAFC]">
              {cols.map((c) => {
                const { text, cls } = cell(r[c])
                return (
                  <td key={c} className={`px-2 py-1 border-b border-[#F1F5F9] align-top max-w-[280px] truncate ${cls}`}
                    title={text}>{text}</td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** DB 컬럼 한 줄 — 이름 · 값 · "화면에 어떻게 닿는지" */
function Row({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2 items-start text-[11px]">
      <div className="pt-1">
        <code className="text-[#475569] font-bold">{label}</code>
        <p className="mt-0.5 text-[10px] text-[#94A3B8] leading-snug">{note}</p>
      </div>
      <div className="min-w-0 pt-1">{children}</div>
    </div>
  )
}

export default function RailEditorPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [instructors, setInstructors] = useState<{ instructor_code: string; steps: number }[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [draftId, setDraftId] = useState<string>('')
  const [rails, setRails] = useState<RailRow[]>([])
  const [sel, setSel] = useState<RailRow | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState<string>('')
  const [busy, setBusy] = useState(false)

  /* ── 순서 이동 UI 상태 ──
     dragFrom  : 끌고 있는 단계 (핸들을 눌러야만 시작된다 — 드롭다운·입력칸을 건드려도 안 끌리게)
     dragOver  : 지금 놓으려는 자리 (그 자리에 파란 선을 그린다)
     moved     : 방금 자리를 옮긴 단계 — 잠깐 테두리를 켜서 **어디로 갔는지 눈으로 따라가게** 한다.
                 ↑↓ 버튼으로 옮기면 화면이 조용해서 뭐가 움직였는지 놓치기 쉽다. */
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [dragArmed, setDragArmed] = useState<number | null>(null)
  const [moved, setMoved] = useState<number | null>(null)
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [showCtx, setShowCtx] = useState(true)
  const [openStep, setOpenStep] = useState<number | null>(null)
  /* 표 보기 — 콘텐츠팀이 DB 관계를 익히려면 가공된 라벨 말고 실제 표를 봐야 한다는 요청(07-29) */
  const [mode, setMode] = useState<'edit' | 'tables'>('edit')
  const [tables, setTables] = useState<TableSet | null>(null)
  const [tab, setTab] = useState<string>('type_rails_draft')

  useEffect(() => {
    if (moved === null) return
    const t = setTimeout(() => setMoved(null), 1400)
    return () => clearTimeout(t)
  }, [moved])

  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const loadDrafts = useCallback(async () => {
    const j = await api('/api/rail-draft?action=list')
    setDrafts(j.drafts); setInstructors(j.instructors)
  }, [])

  useEffect(() => {
    api('/api/rail-draft?action=meta').then((j) => setVariants(j.variants)).catch(() => {})
    loadDrafts().catch((e) => say(e.message))
  }, [loadDrafts])

  useEffect(() => {
    if (!draftId) { setRails([]); setSel(null); setSteps([]); return }
    api(`/api/rail-draft?action=rails&draft=${encodeURIComponent(draftId)}`)
      .then((j) => { setRails(j.rails); setSel(null); setSteps([]) })
      .catch((e) => say(e.message))
  }, [draftId])

  const openRail = async (r: RailRow) => {
    if (dirty && !confirm('저장 안 한 변경이 있어요. 버릴까요?')) return
    api(`/api/rail-draft?action=context&type=${r.question_type_id}`)
      .then((j) => setCtx(j)).catch(() => setCtx(null))
    const j = await api(`/api/rail-draft?action=steps&draft=${encodeURIComponent(draftId)}`
      + `&type=${r.question_type_id}&instructor=${encodeURIComponent(r.instructor_code)}`)
    /* eslint-disable @typescript-eslint/no-explicit-any */
    setSteps((j.steps as any[]).map((s) => ({
      id: s.id, variantId: s.variant_id, audioMode: s.audio_mode, scriptMode: s.script_mode,
      stepLabel: s.step_label, studentPromptOverride: s.student_prompt_override,
    })))
    setSel(r); setDirty(false); setTables(null)
  }

  /* 표 보기는 열 때 한 번만 읽는다 (양이 많고, 저장하면 다시 읽는다) */
  const loadTables = useCallback(async (r: RailRow) => {
    const j = await api(`/api/rail-draft?action=tables&draft=${encodeURIComponent(draftId)}`
      + `&type=${r.question_type_id}&instructor=${encodeURIComponent(r.instructor_code)}`)
    setTables(j.tables)
  }, [draftId])

  useEffect(() => {
    if (mode === 'tables' && sel && !tables) loadTables(sel).catch((e) => say(e.message))
  }, [mode, sel, tables, loadTables])

  const vById = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants])

  const mutate = (fn: (s: Step[]) => Step[]) => { setSteps((prev) => fn([...prev])); setDirty(true) }

  /** i 를 to 자리로 옮긴다 (드래그·버튼이 같은 경로를 쓴다) */
  const reorder = (from: number, to: number) => {
    if (from === to || to < 0 || to >= steps.length) return
    mutate((s) => {
      const [x] = s.splice(from, 1)
      s.splice(to, 0, x)
      return s
    })
    setMoved(to)          // 옮겨간 자리를 잠깐 강조
  }
  const move = (i: number, d: -1 | 1) => reorder(i, i + d)
  const remove = (i: number) => { mutate((s) => { s.splice(i, 1); return s }); setMoved(null) }
  const add = () => mutate((s) => {
    s.push({ variantId: variants[0]?.id ?? 0, audioMode: null, scriptMode: null,
      stepLabel: null, studentPromptOverride: null })
    return s
  })
  const setField = (i: number, patch: Partial<Step>) => mutate((s) => { s[i] = { ...s[i], ...patch }; return s })

  const save = async () => {
    if (!sel) return
    setBusy(true)
    try {
      const r = await post({
        action: 'save', draftId, questionTypeId: sel.question_type_id,
        instructorCode: sel.instructor_code, steps,
      })
      setDirty(false); setTables(null)   // 표 보기를 다시 읽게 한다
      say(`저장됨 — ${r.saved}단계`)
      api(`/api/rail-draft?action=rails&draft=${encodeURIComponent(draftId)}`)
        .then((j) => setRails(j.rails)).catch(() => {})
    } catch (e) { say((e as Error).message) } finally { setBusy(false) }
  }

  const createDraft = async () => {
    const id = prompt('드래프트 이름 (예: kim-0729)')?.trim()
    if (!id) return
    const inst = prompt(`기준 강사 (${instructors.map((i) => i.instructor_code).join(' / ')})`, 'lee_doyun')?.trim()
    if (!inst) return
    setBusy(true)
    try {
      const r = await post({ action: 'create', draftId: id, instructor: inst })
      await loadDrafts(); setDraftId(id)
      say(`${id} 생성 — 정본에서 ${r.copied}단계 복사`)
    } catch (e) { say((e as Error).message) } finally { setBusy(false) }
  }

  const dropDraft = async () => {
    if (!draftId || !confirm(`드래프트 "${draftId}" 를 지울까요? (정본에는 영향 없음)`)) return
    setBusy(true)
    try {
      await post({ action: 'delete', draftId })
      setDraftId(''); await loadDrafts(); say('삭제됨')
    } catch (e) { say((e as Error).message) } finally { setBusy(false) }
  }

  const previewUrl = sel?.sample_lecture
    ? `/lecture/${sel.sample_lecture}?instructor=${sel.instructor_code}&rail=${encodeURIComponent(draftId)}`
    : null

  return (
    <div className="min-h-dvh bg-[#F5F8FE]">
      {/* 상단 — 무엇을 만지고 있는지 항상 보이게 */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] px-4 md:px-6 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[15px] font-black text-[#0F172A]">스캐폴딩 레일 편집기</h1>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA] font-bold">
            드래프트만 편집 · 정본은 안 바뀝니다
          </span>
          <div className="ml-auto flex items-center gap-2">
            <select value={draftId} onChange={(e) => setDraftId(e.target.value)}
              className="text-[12px] font-bold border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white">
              <option value="">드래프트 선택…</option>
              {drafts.map((d) => (
                <option key={d.draft_id} value={d.draft_id}>
                  {d.draft_id} ({d.steps}단계{d.promoted_at ? ' · 승격됨' : ''})
                </option>
              ))}
            </select>
            <button onClick={createDraft} disabled={busy}
              className="text-[12px] font-bold px-3 py-1.5 rounded-lg bg-[#2563EB] text-white disabled:opacity-40">새로 만들기</button>
            {draftId && (
              <button onClick={dropDraft} disabled={busy}
                className="text-[12px] font-bold px-3 py-1.5 rounded-lg border border-[#FCA5A5] text-[#B91C1C] bg-white disabled:opacity-40">폐기</button>
            )}
          </div>
        </div>
        {msg && <p className="mt-2 text-[12px] font-bold text-[#B45309]">{msg}</p>}
      </header>

      {!draftId ? (
        <div className="max-w-[560px] mx-auto mt-16 text-center px-6">
          <p className="text-[14px] font-bold text-[#0F172A]">드래프트를 고르거나 새로 만드세요.</p>
          <p className="mt-2 text-[12px] text-[#64748B] leading-relaxed">
            새로 만들면 <b>지금 돌아가는 레일이 그대로 복사</b>됩니다 — 빈 상태로 시작하지 않아요.
            거기서 순서를 바꾸거나 단계를 지워보고, 실제 수업 화면으로 확인하면 됩니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 p-4 md:p-6 max-w-[1400px] mx-auto">
          {/* 좌 — 이 드래프트에 담긴 레일 목록 */}
          <aside className="lg:w-[300px] shrink-0">
            <h2 className="text-[11px] font-black text-[#94A3B8] mb-2">레일 ({rails.length})</h2>
            <div className="space-y-1.5">
              {rails.map((r) => {
                const on = sel?.question_type_id === r.question_type_id && sel?.instructor_code === r.instructor_code
                return (
                  <button key={`${r.question_type_id}-${r.instructor_code}`} onClick={() => openRail(r)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      on ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-white hover:border-[#93C5FD]'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">P{r.part}</span>
                      <span className="text-[12px] font-bold text-[#0F172A] truncate">{r.type_code}</span>
                      <span className="ml-auto text-[11px] font-bold text-[#64748B]">{r.steps}단계</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#64748B] truncate">{r.type_name} · {r.instructor_code}</p>
                  </button>
                )
              })}
              {!rails.length && <p className="text-[12px] text-[#94A3B8]">이 드래프트에 레일이 없어요.</p>}
            </div>
          </aside>

          {/* 우 — 단계 편집 */}
          <main className="flex-1 min-w-0">
            {!sel ? (
              <p className="text-[12px] text-[#94A3B8] mt-4">왼쪽에서 레일을 고르세요.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <h2 className="text-[13px] font-black text-[#0F172A]">{sel.type_code} · {sel.instructor_code}</h2>
                  <span className="text-[11px] text-[#64748B]">{steps.length}단계</span>
                  {dirty && <span className="text-[11px] font-bold text-[#B45309]">· 저장 안 됨</span>}

                  {/* 편집 ⇄ 표 보기 */}
                  <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden ml-1">
                    {(['edit', 'tables'] as const).map((m) => (
                      <button key={m} onClick={() => setMode(m)}
                        className={`text-[11px] font-bold px-2.5 py-1.5 transition-colors ${
                          mode === m ? 'bg-[#2563EB] text-white' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'}`}>
                        {m === 'edit' ? '편집' : 'DB 표'}
                      </button>
                    ))}
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    {previewUrl && (
                      <a href={previewUrl} target="_blank" rel="noreferrer"
                        className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border ${
                          dirty ? 'border-[#E5E7EB] text-[#94A3B8]' : 'border-[#BFDBFE] text-[#2563EB] bg-white hover:bg-[#EFF6FF]'}`}
                        title={dirty ? '저장해야 미리보기에 반영됩니다' : sel.sample_lecture ?? ''}>
                        미리보기 ↗ {sel.sample_lecture}
                      </a>
                    )}
                    <button onClick={save} disabled={!dirty || busy}
                      className="text-[12px] font-bold px-3 py-1.5 rounded-lg bg-[#2563EB] text-white disabled:opacity-40">저장</button>
                  </div>
                </div>

                {mode === 'tables' ? (
                  /* ── DB 표 보기 ──
                     Supabase Table Editor 처럼 **실제 컬럼 그대로** 그린다.
                     콘텐츠팀이 관계를 익히려면 가공된 라벨이 아니라 표를 봐야 한다는 요청.
                     편집은 여전히 '편집' 탭에서만 — 여기서는 아무것도 안 바뀐다. */
                  !tables ? (
                    <p className="text-[12px] text-[#94A3B8] py-4">표를 읽는 중…</p>
                  ) : (
                    <>
                      {/* 관계 한 줄 — 표 이름만 봐서는 뭐가 뭘 가리키는지 모른다 */}
                      <div className="mb-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 overflow-x-auto">
                        <p className="text-[10px] font-black text-[#94A3B8] mb-1.5">관계</p>
                        <pre className="text-[10px] leading-relaxed text-[#475569] font-mono whitespace-pre">{
`lectures ──< lecture_items ──< item_questions >── questions ──< question_options
                   │ question_type_id
                   ↓
            question_types ──< type_rails ──> step_variants ──> interactions
                                  ↑ draft_id 가 있으면 드래프트, NULL 이면 정본`
                        }</pre>
                      </div>

                      {/* 표 탭 — 순서가 곧 데이터 흐름이다 (강의 → 아이템 → 문항 → 유형 → 레일 → 변종) */}
                      <div className="flex gap-1 flex-wrap mb-3">
                        {Object.entries(tables).map(([name, t]) => (
                          <button key={name} onClick={() => setTab(name)}
                            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                              tab === name ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                                : 'border-[#E5E7EB] bg-white text-[#64748B] hover:border-[#93C5FD]'}`}>
                            {name} <span className="text-[#94A3B8]">{t.rows.length}</span>
                          </button>
                        ))}
                      </div>

                      {tables[tab] && (
                        <>
                          {/* 이 표가 뭐 하는 표인지 — 컬럼명만 봐서는 절대 모른다 */}
                          <div className="mb-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-[12px] font-black text-[#0F172A]">{tables[tab].title}</h3>
                              <code className="text-[10px] text-[#94A3B8]">{tab}</code>
                              <span className="text-[10px] font-bold text-[#64748B]">{tables[tab].rows.length}행</span>
                              {tab === 'type_rails_draft'
                                ? <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]">편집 가능</span>
                                : <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">읽기 전용</span>}
                            </div>
                            <p className="mt-1.5 text-[11px] text-[#334155] leading-relaxed">{tables[tab].what}</p>
                            <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed">
                              <span className="font-bold text-[#94A3B8]">눈여겨볼 것 · </span>{tables[tab].key}
                            </p>
                          </div>
                          <DataGrid rows={tables[tab].rows}
                            highlight={['draft_id', 'question_type_id', 'variant_id', 'interaction_code',
                              'item_id', 'question_id', 'lecture_id', 'id', 'code']} />
                        </>
                      )}
                      <p className="mt-3 text-[11px] text-[#94A3B8] leading-relaxed">
                        파란 컬럼이 다른 표를 가리키는 키입니다. <code>NULL</code> 은 회색, jsonb 는 보라색.<br />
                        이 화면에서는 아무것도 바뀌지 않습니다 — 편집은 <b>편집</b> 탭에서.
                      </p>
                    </>
                  )
                ) : (
                <>
                {/* ── DB 구조 패널 — 이 레일이 어디에 붙어 있나 (전부 읽기 전용) ──
                     콘텐츠팀이 "단계를 고치면 어디까지 영향이 가나" 를 눈으로 보게 한다.
                     레일은 강의가 아니라 **유형**에 붙어 있어서, 한 벌을 고치면
                     그 유형을 쓰는 모든 강의·아이템이 같이 바뀐다. 그걸 숫자로 보여준다. */}
                {ctx && (
                  <div className="mb-3 rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                    <button onClick={() => setShowCtx((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F8FAFC]">
                      <span className="text-[11px] font-black text-[#94A3B8]">DB 구조</span>
                      <span className="text-[11px] text-[#64748B] truncate">
                        이 레일 한 벌이 강의 {ctx.counts.lectures} · 아이템 {ctx.counts.items} · 문항 {ctx.counts.questions}개에 적용됩니다
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"
                        className={`ml-auto w-3 h-3 shrink-0 transition-transform ${showCtx ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                    </button>

                    {showCtx && (
                      <div className="px-3 pb-3 border-t border-[#F1F5F9]">
                        {/* 체인 — 화살표 방향이 "무엇이 무엇을 가리키나" */}
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[11px]">
                          {([
                            ['lectures', `강의 ${ctx.counts.lectures}`, false],
                            ['items', `아이템 ${ctx.counts.items}`, false],
                            ['questions', `문항 ${ctx.counts.questions}`, false],
                            ['options', `보기 ${ctx.counts.options}`, false],
                          ] as const).map(([k, label], i) => (
                            <span key={k} className="flex items-center gap-1.5">
                              {i > 0 && <span className="text-[#CBD5E1]">→</span>}
                              <span className="px-2 py-1 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-[#475569] font-bold">{label}</span>
                            </span>
                          ))}
                          {ctx.counts.passages > 0 && (
                            <span className="px-2 py-1 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-[#475569] font-bold">지문 {ctx.counts.passages}</span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className="px-2 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] font-bold">
                            유형 {ctx.type?.type_code}
                          </span>
                          <span className="text-[#CBD5E1]">←</span>
                          <span className="px-2 py-1 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] text-[#9A3412] font-bold">
                            레일 {steps.length}단계 · 편집 가능
                          </span>
                          <span className="text-[#CBD5E1]">→</span>
                          <span className="px-2 py-1 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-[#475569] font-bold">변종 {variants.length}종</span>
                          <span className="text-[#CBD5E1]">→</span>
                          <span className="px-2 py-1 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-[#475569] font-bold">상호작용</span>
                        </div>

                        <p className="mt-2.5 text-[11px] text-[#64748B] leading-relaxed">
                          <b className="text-[#9A3412]">주황색만 여기서 고칠 수 있어요.</b> 문항·보기·지문은 읽기 전용입니다 —
                          레일은 <b>강의가 아니라 유형</b>에 붙어 있어서, 한 벌을 고치면 아래 아이템 전부가 같이 바뀝니다.
                        </p>

                        {/* 영향받는 아이템 = 레일이 실제로 도는 자리 */}
                        <div className="mt-2.5 overflow-x-auto">
                          <table className="w-full text-[11px] border-collapse min-w-[440px]">
                            <thead>
                              <tr className="text-[#94A3B8] text-left">
                                <th className="font-bold py-1 pr-3">강의</th>
                                <th className="font-bold py-1 pr-3">구분</th>
                                <th className="font-bold py-1 pr-3">아이템</th>
                                <th className="font-bold py-1">문항</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ctx.items.map((it, i) => (
                                <tr key={i} className="border-t border-[#F1F5F9]">
                                  <td className="py-1 pr-3 font-bold text-[#0F172A]">{it.lecture_code}</td>
                                  <td className="py-1 pr-3 text-[#64748B]">{it.phase === 'lesson' ? '수업' : '실전'}</td>
                                  <td className="py-1 pr-3 text-[#64748B]">#{it.item_seq}</td>
                                  <td className="py-1 text-[#475569]">{it.question_codes ?? '—'}</td>
                                </tr>
                              ))}
                              {!ctx.items.length && (
                                <tr><td colSpan={4} className="py-2 text-[#94A3B8]">이 유형을 쓰는 아이템이 없어요.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {steps.map((s, i) => {
                    const v = vById.get(s.variantId)
                    const dragging = dragFrom === i
                    const isMoved = moved === i
                    /* 놓을 자리 표시선 — 위에서 아래로 끌면 아래쪽에, 반대면 위쪽에 그린다 */
                    const showLineTop = dragOver === i && dragFrom !== null && dragFrom > i
                    const showLineBottom = dragOver === i && dragFrom !== null && dragFrom < i
                    return (
                      <div
                        key={i}
                        draggable={dragArmed === i}
                        onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move' }}
                        onDragEnter={() => setDragOver(i)}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (dragFrom !== null) reorder(dragFrom, i)
                          setDragFrom(null); setDragOver(null); setDragArmed(null)
                        }}
                        onDragEnd={() => { setDragFrom(null); setDragOver(null); setDragArmed(null) }}
                        className={`rounded-xl border bg-white px-3 py-2.5 transition-all
                          ${showLineTop ? 'border-t-[3px] border-t-[#2563EB]' : ''}
                          ${showLineBottom ? 'border-b-[3px] border-b-[#2563EB]' : ''}
                          ${dragging ? 'opacity-40 border-[#93C5FD]'
                            : isMoved ? 'border-[#2563EB] ring-2 ring-[#BFDBFE] bg-[#EFF6FF]'
                              : 'border-[#E5E7EB]'}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 드래그 핸들 — 여기서만 끌린다. 행 전체를 draggable 로 두면
                              드롭다운을 열려고 눌러도 드래그가 시작돼 조작이 안 된다. */}
                          <button
                            onPointerDown={() => setDragArmed(i)}
                            onPointerUp={() => setDragArmed(null)}
                            className="shrink-0 w-5 h-7 flex items-center justify-center text-[#CBD5E1] hover:text-[#64748B] cursor-grab active:cursor-grabbing touch-none"
                            title="끌어서 순서 이동"
                            aria-label={`${i + 1}번 단계 끌어서 이동`}
                          >⠿</button>
                          <span className={`shrink-0 w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center transition-colors ${
                            isMoved ? 'bg-[#2563EB] text-white' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>{i + 1}</span>

                          <select value={s.variantId} onChange={(e) => setField(i, { variantId: Number(e.target.value) })}
                            className="text-[12px] font-bold border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white min-w-0 flex-1">
                            {variants.map((v2) => (
                              <option key={v2.id} value={v2.id}>{v2.step_code} · {v2.name} ({v2.code})</option>
                            ))}
                          </select>

                          <span className="text-[11px] text-[#64748B] shrink-0 hidden md:inline">
                            {v?.interaction_code ?? '—'}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => move(i, -1)} disabled={i === 0}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] text-[#475569] disabled:opacity-30" title="위로">↑</button>
                            <button onClick={() => move(i, 1)} disabled={i === steps.length - 1}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] text-[#475569] disabled:opacity-30" title="아래로">↓</button>
                            <button onClick={() => remove(i)}
                              className="w-7 h-7 rounded-lg border border-[#FCA5A5] text-[#B91C1C]" title="삭제">×</button>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input value={s.audioMode ?? ''} onChange={(e) => setField(i, { audioMode: e.target.value })}
                            placeholder="음원 지시 (비우면 없음)"
                            className="text-[11px] border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white" />
                          <input value={s.stepLabel ?? ''} onChange={(e) => setField(i, { stepLabel: e.target.value })}
                            placeholder="단계 이름 (비우면 변종 이름)"
                            className="text-[11px] border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white" />
                        </div>

                        {/* DB 원문 — type_rails 한 행이 실제로 갖는 칸을 전부 보여준다.
                            "화면에 어떻게 닿는지" 를 칸마다 적어야 콘텐츠팀이 헛수고를 안 한다.
                            강사 발화 칸은 0024 에서 아예 제거했다 — 발화는 DB에 없고 LLM 이 만든다. */}
                        <details open={openStep === i}
                          onToggle={(e) => setOpenStep((e.currentTarget as HTMLDetailsElement).open ? i : null)}
                          className="mt-2">
                          <summary className="text-[11px] text-[#64748B] cursor-pointer select-none">DB 원문 (type_rails)</summary>
                          <div className="mt-2 space-y-2">
                            <Row label="variant_id" note="→ step_variants 참조. 위 드롭다운이 이 값이다">
                              <span className="text-[#0F172A] font-mono">{s.variantId}</span>
                              <span className="ml-2 text-[#64748B]">{v?.code} · {v?.name}</span>
                            </Row>
                            <Row label="interaction" note="변종에 딸려 온다 — 변종을 바꾸면 같이 바뀐다">
                              <span className="text-[#0F172A]">{v?.interaction_code ?? '—'}</span>
                            </Row>
                            <Row label="scope" note="item=매 바퀴 / type=유형 첫 등장 / lecture=강의 첫 아이템">
                              <span className="text-[#0F172A]">{v?.scope ?? '—'}</span>
                            </Row>
                            <Row label="script_mode" note="스크립트 노출 지시">
                              <input value={s.scriptMode ?? ''} onChange={(e) => setField(i, { scriptMode: e.target.value })}
                                placeholder="(없음)"
                                className="w-full text-[11px] border border-[#E5E7EB] rounded px-1.5 py-1 bg-white" />
                            </Row>
                            <Row label="student_prompt_override"
                              note="학생에게 던질 질문. 그대로 나가지 않고 LLM 이 이 문항에 맞춰 다시 쓴다(말투 참고용)">
                              <input value={s.studentPromptOverride ?? ''} onChange={(e) => setField(i, { studentPromptOverride: e.target.value })}
                                placeholder="(비우면 변종 기본값)"
                                className="w-full text-[11px] border border-[#E5E7EB] rounded px-1.5 py-1 bg-white" />
                            </Row>
                          </div>
                        </details>
                      </div>
                    )
                  })}
                  <button onClick={add}
                    className="w-full rounded-xl border border-dashed border-[#CBD5E1] text-[12px] font-bold text-[#64748B] py-2.5 hover:border-[#93C5FD] hover:text-[#2563EB]">
                    + 단계 추가
                  </button>
                </div>

                <p className="mt-4 text-[11px] text-[#94A3B8] leading-relaxed">
                  ⠿ 를 잡고 끌어서 순서를 바꾸거나, ↑↓ 버튼을 쓰세요. 옮긴 단계는 잠깐 파랗게 표시됩니다.<br />
                  저장하면 이 드래프트에만 반영됩니다. 학생 화면(정본)은 바뀌지 않아요.<br />
                  강사 발화 문구는 여기서 쓰지 않습니다 — 문항 사실을 보고 매번 생성됩니다.
                </p>
                </>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
