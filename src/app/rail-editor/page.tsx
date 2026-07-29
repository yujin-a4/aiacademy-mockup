'use client'

/* 스캐폴딩 실험장 — 콘텐츠팀용. docs/rail-editor-plan.md
   /rail-editor

   ── 형태 ────────────────────────────────────────────────────────
   Supabase Table Editor 와 같은 한 화면. 왼쪽에 표 목록, 오른쪽에 그리드.
   컬럼명은 실제 DB 컬럼 그대로 쓴다.

   ── 어디를 만지는가 ─────────────────────────────────────────────
   **`sandbox` 스키마.** public(정본)과 물리적으로 분리돼 있어서 여기서 뭘 하든
   학생 화면에 안 닿는다. 그래서 가드도, 드래프트 개념도 없다 — 전부 자유롭게 편집한다.
     · 단계 추가·편집·삭제        (type_rails)
     · 변종 신설                   (step_variants — 정본과 달리 같은 조합도 여러 개 가능)
     · 유형 신설                   (question_types)
     · 어떤 문항을 어떤 유형으로   (lecture_items.question_type_id)
   문항·지문·강의는 sandbox 에 없다. public 을 참조만 하고 **읽기 전용**으로 보여준다.

   엉키면 [초기화] 한 번이면 public 기준으로 통째 리셋된다.

   ── 미리보기는 이 화면이 흉내내지 않는다 ────────────────────────
   /lecture/[code]?sandbox=1 을 새 탭으로 연다. 음원 게이트·아이템 전환·문구 생성이
   전부 실제 화면에만 있어서, 흉내내면 "편집기에선 됐는데" 가 된다. */

import { useCallback, useEffect, useMemo, useState } from 'react'

type Cell = string | number | boolean | null | Record<string, unknown>
type Row = Record<string, Cell>
interface TableDef {
  title: string; what: string; pk: string[]; editable: string[]
  editableTable: boolean; rows: Row[]
  chain?: string; usesLabel?: string
}
interface Preview {
  id: number; part: number; type_code: string; name: string
  rail_steps: number; items: number; questions: number
  instructor: string | null; sample_lecture: string | null
}
interface Meta {
  variants: { id: number; code: string; step_code: string; name: string; interaction_code: string | null }[]
  interactions: { code: string; label: string }[]
  stepTypes: { code: string; name: string }[]
  questionTypes: { id: number; type_code: string; part: number }[]
  lectures: { id: number; lecture_code: string }[]
}

/** 다른 표를 가리키는 키 — 헤더를 파랗게 */
const FK = new Set(['question_type_id', 'variant_id', 'interaction_code', 'item_id',
  'question_id', 'lecture_id', 'passage_id', 'step_code'])

const api = async (u: string) => { const r = await fetch(u); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j }
const post = async (b: unknown) => {
  const r = await fetch('/api/sandbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
  const j = await r.json(); if (!r.ok) throw new Error(j.error); return j
}

function show(v: Cell): { text: string; cls: string } {
  if (v === null || v === undefined) return { text: 'NULL', cls: 'text-[#CBD5E1] italic' }
  if (typeof v === 'boolean') return { text: String(v), cls: v ? 'text-[#15803D] font-bold' : 'text-[#B91C1C]' }
  if (typeof v === 'object') return { text: JSON.stringify(v), cls: 'text-[#7C3AED]' }
  if (typeof v === 'number') return { text: String(v), cls: 'text-[#0F172A] tabular-nums' }
  return { text: String(v), cls: 'text-[#334155]' }
}

const NEW = '__new__'   // 아직 저장 안 된 행 표시

export default function SandboxEditorPage() {
  const [tables, setTables] = useState<Record<string, TableDef> | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [tab, setTab] = useState('type_rails')
  const [previews, setPreviews] = useState<Preview[]>([])
  const [edits, setEdits] = useState<Row[] | null>(null)      // 편집 중인 현재 표
  const [dels, setDels] = useState<Row[]>([])                  // 지울 행
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 6000) }

  const load = useCallback(async () => {
    const [t, m, p] = await Promise.all([
      api('/api/sandbox?action=tables'), api('/api/sandbox?action=meta'), api('/api/sandbox?action=previews'),
    ])
    setTables(t.tables); setMeta(m); setPreviews(p.previews); setEdits(null); setDels([])
  }, [])
  useEffect(() => { load().catch((e) => say(e.message)) }, [load])

  const def = tables?.[tab]
  const dirty = edits !== null || dels.length > 0
  const rows: Row[] = edits ?? def?.rows ?? []
  const HIDDEN = new Set([NEW, '__uses', '__uses_detail'])
  const cols = rows.length ? Object.keys(rows[0]).filter((c) => !HIDDEN.has(c)) : (def?.editable ?? [])
  const hasUses = !!def?.usesLabel

  const base = () => edits ?? (def?.rows ?? []).map((r) => ({ ...r }))
  const setCell = (i: number, c: string, v: Cell) => setEdits(base().map((r, k) => (k === i ? { ...r, [c]: v } : r)))
  const addRow = () => {
    const blank: Row = { [NEW]: true }
    for (const c of cols) blank[c] = null
    setEdits([...base(), blank])
  }
  const delRow = (i: number) => {
    const b = base(); const row = b[i]
    if (!row[NEW]) setDels([...dels, row])
    setEdits(b.filter((_, k) => k !== i))
  }

  const switchTab = (name: string) => {
    if (dirty && !confirm('저장 안 한 변경이 있어요. 버릴까요?')) return
    setTab(name); setEdits(null); setDels([])
  }

  const save = async () => {
    if (!def || !dirty) return
    setBusy(true)
    try {
      const cur = edits ?? def.rows
      const orig = new Map(def.rows.map((r) => [def.pk.map((k) => String(r[k])).join('|'), r]))
      const inserts = cur.filter((r) => r[NEW])
      const updates = cur.filter((r) => {
        if (r[NEW]) return false
        const o = orig.get(def.pk.map((k) => String(r[k])).join('|'))
        return o && def.editable.some((c) => String(o[c] ?? '') !== String(r[c] ?? ''))
      })
      const r = await post({ action: 'save', table: tab, inserts, updates, deletes: dels })
      say(`저장됨 — 추가 ${r.inserted} · 수정 ${r.updated} · 삭제 ${r.deleted}`)
      await load()
    } catch (e) { say((e as Error).message) } finally { setBusy(false) }
  }

  const reset = async () => {
    if (!confirm('sandbox 를 정본(public) 기준으로 통째 초기화합니다. 실험한 내용은 사라져요. 계속할까요?')) return
    setBusy(true)
    try { const r = await post({ action: 'reset' }); say(r.msg); await load() }
    catch (e) { say((e as Error).message) } finally { setBusy(false) }
  }

  /* 미리보기는 유형별 목록(탭 '__preview__')에서 연다.
     원래 아이템 첫 행으로 강의 하나만 골라 열었는데, 그러면 파트1 하나만 보였다. */

  /* FK 드롭다운 후보 */
  const options = (col: string): { v: string | number; label: string }[] | null => {
    if (!meta) return null
    if (col === 'variant_id') return meta.variants.map((v) => ({ v: Number(v.id), label: `${v.id} · ${v.code} (${v.step_code})` }))
    if (col === 'question_type_id') return meta.questionTypes.map((t) => ({ v: Number(t.id), label: `${t.id} · P${t.part} ${t.type_code}` }))
    if (col === 'interaction_code') return meta.interactions.map((i) => ({ v: i.code, label: `${i.code} — ${i.label}` }))
    if (col === 'step_code') return meta.stepTypes.map((s) => ({ v: s.code, label: `${s.code} — ${s.name}` }))
    if (col === 'lecture_id') return meta.lectures.map((l) => ({ v: Number(l.id), label: `${l.id} · ${l.lecture_code}` }))
    if (col === 'phase') return [{ v: 'lesson', label: 'lesson (수업)' }, { v: 'practice', label: 'practice (실전)' }]
    return null
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F8FAFC]">
      <header className="shrink-0 bg-white border-b border-[#E5E7EB] px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[14px] font-black text-[#0F172A]">스캐폴딩 실험장</h1>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] font-bold">
            sandbox 스키마 · 정본과 물리적으로 분리 · 학생 화면에 안 닿음
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => switchTab('__preview__')}
              className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border ${
                tab === '__preview__' ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                  : 'border-[#BFDBFE] text-[#2563EB] bg-white hover:bg-[#EFF6FF]'}`}>
              미리보기 (유형 {previews.length})
            </button>
            <button onClick={async () => {
              setBusy(true)
              try {
                const r = await post({ action: 'syncSheet' })
                if (r.ok) { say(`시트 반영 — SC ${r.sc}벌 · 단계 ${r.steps} · 아이템 재연결 ${r.remapped}`); await load() }
                else say('시트 오류: ' + r.errors.slice(0, 3).join(' / ') + (r.errors.length > 3 ? ` 외 ${r.errors.length - 3}건` : ''))
              } catch (e) { say((e as Error).message) } finally { setBusy(false) }
            }} disabled={busy}
              className="text-[12px] font-bold px-3 py-1.5 rounded-lg bg-[#047857] text-white disabled:opacity-40">
              시트에서 불러오기
            </button>
            <button onClick={reset} disabled={busy}
              className="text-[12px] font-bold px-3 py-1.5 rounded-lg border border-[#FCA5A5] text-[#B91C1C] bg-white disabled:opacity-40">초기화</button>
            <button onClick={save} disabled={!dirty || busy}
              className="text-[12px] font-bold px-3 py-1.5 rounded-lg bg-[#2563EB] text-white disabled:opacity-40">
              {dirty ? '저장 *' : '저장'}
            </button>
          </div>
        </div>
        {msg && <p className="mt-1.5 text-[12px] font-bold text-[#B45309]">{msg}</p>}
      </header>

      {!tables ? (
        <p className="p-4 text-[12px] text-[#94A3B8]">읽는 중…</p>
      ) : (
        <div className="flex-1 flex min-h-0">
          <aside className="w-[220px] shrink-0 border-r border-[#E5E7EB] bg-white overflow-y-auto">
            <p className="text-[10px] font-black text-[#94A3B8] px-3 pt-2.5 pb-1">실험장 (편집 가능)</p>
            {Object.entries(tables).filter(([, t]) => t.editableTable).map(([name, t]) => (
              <button key={name} onClick={() => switchTab(name)}
                className={`w-full text-left px-3 py-1.5 border-l-2 ${
                  tab === name ? 'border-l-[#2563EB] bg-[#EFF6FF]' : 'border-l-transparent hover:bg-[#F8FAFC]'}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black px-1 py-px rounded bg-[#EA580C] text-white shrink-0">편집</span>
                  <code className={`text-[11px] truncate ${tab === name ? 'text-[#1D4ED8] font-bold' : 'text-[#475569]'}`}>{name}</code>
                  <span className="ml-auto text-[10px] text-[#94A3B8]">{t.rows.length}</span>
                </div>
              </button>
            ))}
            <p className="text-[10px] font-black text-[#94A3B8] px-3 pt-3 pb-1">정본 (읽기 전용)</p>
            {Object.entries(tables).filter(([, t]) => !t.editableTable).map(([name, t]) => (
              <button key={name} onClick={() => switchTab(name)}
                className={`w-full text-left px-3 py-1.5 border-l-2 ${
                  tab === name ? 'border-l-[#2563EB] bg-[#EFF6FF]' : 'border-l-transparent hover:bg-[#F8FAFC]'}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black px-1 py-px rounded bg-[#F1F5F9] text-[#94A3B8] shrink-0">읽기</span>
                  <code className={`text-[11px] truncate ${tab === name ? 'text-[#1D4ED8] font-bold' : 'text-[#475569]'}`}>{name.replace('public.', '')}</code>
                  <span className="ml-auto text-[10px] text-[#94A3B8]">{t.rows.length}</span>
                </div>
              </button>
            ))}
          </aside>

          <main className="flex-1 min-w-0 flex flex-col">
            {tab === '__preview__' ? (
              /* ── 유형별 미리보기 ──
                 어떤 유형을 어느 강의로 열어볼 수 있나. 레일이 0단계이거나 문항이 0개면
                 열어도 아무것도 안 보이므로, **왜 못 여는지**를 같이 적는다. */
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="px-4 py-2.5 bg-white border-b border-[#E5E7EB]">
                  <h2 className="text-[12px] font-black text-[#0F172A]">유형별 미리보기</h2>
                  <p className="mt-0.5 text-[11px] text-[#64748B]">
                    지금 sandbox 상태로 실제 수업 화면을 엽니다. 편집한 건 <b>저장해야</b> 반영돼요.
                  </p>
                </div>
                <table className="text-[11px] border-collapse w-full bg-white">
                  <thead className="bg-[#F8FAFC] sticky top-0">
                    <tr className="text-left text-[#64748B]">
                      <th className="font-bold px-3 py-1.5 border-b border-[#E5E7EB]">유형</th>
                      <th className="font-bold px-2 py-1.5 border-b border-[#E5E7EB]">레일</th>
                      <th className="font-bold px-2 py-1.5 border-b border-[#E5E7EB]">아이템</th>
                      <th className="font-bold px-2 py-1.5 border-b border-[#E5E7EB]">문항</th>
                      <th className="font-bold px-3 py-1.5 border-b border-[#E5E7EB]">열기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previews.map((p) => {
                      const ok = p.rail_steps > 0 && !!p.sample_lecture && p.questions > 0
                      const why = p.rail_steps === 0 ? '레일이 없다 (type_rails 에 이 유형의 단계가 0개)'
                        : !p.sample_lecture ? '이 유형을 쓰는 아이템이 없다'
                          : p.questions === 0 ? '아이템에 묶인 문항이 없다' : ''
                      return (
                        <tr key={p.id} className="border-b border-[#F1F5F9] hover:bg-[#FAFCFF]">
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black px-1 py-px rounded bg-[#F1F5F9] text-[#475569]">P{p.part}</span>
                              <code className="font-bold text-[#0F172A]">{p.type_code}</code>
                            </div>
                            <p className="text-[10px] text-[#94A3B8] mt-0.5">{p.name}</p>
                          </td>
                          <td className={`px-2 py-1.5 tabular-nums ${p.rail_steps ? 'text-[#334155]' : 'text-[#B91C1C] font-bold'}`}>{p.rail_steps}</td>
                          <td className={`px-2 py-1.5 tabular-nums ${p.items ? 'text-[#334155]' : 'text-[#B91C1C] font-bold'}`}>{p.items}</td>
                          <td className={`px-2 py-1.5 tabular-nums ${p.questions ? 'text-[#334155]' : 'text-[#B91C1C] font-bold'}`}>{p.questions}</td>
                          <td className="px-3 py-1.5">
                            {ok ? (
                              <a href={`/lecture/${p.sample_lecture}?instructor=${p.instructor ?? 'common'}&sandbox=1`}
                                target="_blank" rel="noreferrer"
                                className="font-bold text-[#2563EB] hover:underline">
                                {p.sample_lecture} ↗
                              </a>
                            ) : (
                              <span className="text-[#94A3B8]">{why}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
            <>
            <div className="shrink-0 px-4 py-2 bg-white border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-[12px] font-black text-[#0F172A]">{tab}</code>
                <span className="text-[11px] text-[#64748B]">{def?.title}</span>
                <span className="text-[11px] text-[#94A3B8]">{rows.length}행</span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#64748B]">{def?.what}</p>
              {def?.chain && (
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black text-[#94A3B8]">영향 경로</span>
                  <code className="text-[10px] text-[#1D4ED8] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">
                    {def.chain}
                  </code>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <table className="text-[11px] border-collapse w-max min-w-full bg-white">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#F8FAFC]">
                    {def?.editableTable && <th className="w-8 border-b border-r border-[#E5E7EB]" />}
                    {hasUses && (
                      <th title={def?.usesLabel}
                        className="text-left font-bold px-2 py-1.5 border-b border-r border-[#E5E7EB] whitespace-nowrap text-[#047857] bg-[#ECFDF5]">
                        수업에 미치는 영향 <span className="text-[9px] font-normal">ⓘ</span>
                      </th>
                    )}
                    {cols.map((c) => {
                      const ed = !!def?.editable.includes(c)
                      return (
                        <th key={c} className={`text-left font-bold px-2 py-1.5 border-b border-[#E5E7EB] whitespace-nowrap ${
                          ed ? 'text-[#9A3412] bg-[#FFF7ED]' : FK.has(c) ? 'text-[#1D4ED8]' : 'text-[#64748B]'}`}>
                          {c}{ed && <span className="ml-1 text-[9px] font-normal">✎</span>}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={r[NEW] ? 'bg-[#F0FDF4]' : 'hover:bg-[#FAFCFF]'}>
                      {def?.editableTable && (
                        <td className="border-b border-r border-[#F1F5F9] text-center">
                          <button onClick={() => delRow(i)} title="이 행 삭제"
                            className="w-6 h-6 text-[#CBD5E1] hover:text-[#B91C1C]">×</button>
                        </td>
                      )}
                      {hasUses && (() => {
                        const n = r[NEW] ? 0 : Number(r.__uses ?? 0)
                        const detail = r[NEW] ? null : (r.__uses_detail as string | null)
                        return (
                          <td className={`px-2 py-1 border-b border-r border-[#F1F5F9] whitespace-nowrap ${
                            n > 0 ? 'bg-[#ECFDF5]' : 'bg-[#FAFAFA]'}`}
                            title={n > 0 ? def?.usesLabel : '아무도 이 행을 안 쓴다 — 수업 화면에 영향 없음'}>
                            {n > 0 ? (
                              <>
                                <span className="text-[#047857] font-bold">{n}턴</span>
                                {detail && <span className="ml-1.5 text-[10px] text-[#94A3B8]">{detail}</span>}
                              </>
                            ) : (
                              <span className="text-[#94A3B8]">안 쓰임</span>
                            )}
                          </td>
                        )
                      })()}
                      {cols.map((c) => {
                        if (!def?.editable.includes(c)) {
                          const { text, cls } = show(r[c])
                          return <td key={c} title={text}
                            className={`px-2 py-1 border-b border-[#F1F5F9] max-w-[300px] truncate bg-[#FCFCFD] ${cls}`}>{text}</td>
                        }
                        const opts = options(c)
                        if (opts) {
                          return (
                            <td key={c} className="border-b border-[#F1F5F9] p-0">
                              <select value={r[c] === null || r[c] === undefined ? '' : String(r[c])}
                                onChange={(e) => setCell(i, c, e.target.value === '' ? null
                                  : (typeof opts[0].v === 'number' ? Number(e.target.value) : e.target.value))}
                                className="w-full min-w-[180px] text-[11px] px-1.5 py-1 bg-white outline-none focus:bg-[#EFF6FF]">
                                <option value="">NULL</option>
                                {opts.map((o) => <option key={String(o.v)} value={String(o.v)}>{o.label}</option>)}
                              </select>
                            </td>
                          )
                        }
                        const num = ['step_order', 'seq', 'version', 'part', 'sub_order', 'min_level'].includes(c)
                        return (
                          <td key={c} className="border-b border-[#F1F5F9] p-0">
                            <input type={num ? 'number' : 'text'} placeholder="NULL"
                              value={r[c] === null || r[c] === undefined ? '' : String(r[c])}
                              onChange={(e) => setCell(i, c, e.target.value === '' ? null : (num ? Number(e.target.value) : e.target.value))}
                              className={`w-full text-[11px] px-1.5 py-1 bg-white outline-none focus:bg-[#EFF6FF] ${
                                num ? 'min-w-[70px] tabular-nums' : 'min-w-[150px]'}`} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={cols.length + 1} className="px-3 py-4 text-[#94A3B8]">행 없음</td></tr>}
                </tbody>
              </table>
              {def?.editableTable && (
                <button onClick={addRow}
                  className="m-3 px-3 py-1.5 rounded-lg border border-dashed border-[#CBD5E1] text-[11px] font-bold text-[#64748B] hover:border-[#93C5FD] hover:text-[#2563EB]">
                  + 행 추가
                </button>
              )}
            </div>

            <div className="shrink-0 px-4 py-1.5 bg-white border-t border-[#E5E7EB] text-[10px] text-[#94A3B8]">
              <span className="text-[#9A3412] font-bold">주황 ✎</span> 편집 가능 ·
              <span className="text-[#1D4ED8] font-bold"> 파랑</span> 다른 표를 가리키는 키 ·
              <span className="text-[#15803D] font-bold"> 초록 행</span> 아직 저장 안 됨 ·
              <span className="text-[#047857] font-bold"> 영향</span> **끝까지 간** 턴 수 (옆 표만 센 게 아니다) —
              <b>0이면 수업 화면에 영향이 없다</b> ·
              <span className="italic"> NULL</span> 빈 값
              {dels.length > 0 && <span className="text-[#B91C1C] font-bold"> · 삭제 대기 {dels.length}행</span>}
            </div>
            </>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
