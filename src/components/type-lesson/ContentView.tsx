'use client'

/* ── 유형학습 콘텐츠 렌더러 ──
   파트/유형별 본문: 사진(P1) · 음성 질문(P2) · 스크립트+시각자료(P3/4) · 빈칸 문장(P5/6) ·
   지문/채팅/표(P7, 점진 공개). 모든 영어 텍스트는 단어 탭 → 형광펜(필기 인식 대체). */

import { useEffect, useRef, useState } from 'react'
import type { TypeLesson, PassageDoc, QuestionItem, SentenceItem } from '@/data/typeLearning'

export interface ContentState {
  revealedScript: Set<string> | 'all'
  revealedOptions: Record<number, Set<string> | 'all'>
  revealedPassages: Set<string> | 'all'
  playingId: string | null
  marks: Set<string>
  tutorMarks: Set<string>
  onTapWord: (word: string) => void
  focusQ?: number
  /** 'single': focusQ 문항만 선택 가능 / 'all': 전 문항 선택 가능 / 'none' */
  answerMode: 'none' | 'single' | 'all'
  answers: Record<number, string>
  graded: Set<number>
  onSelect: (qIdx: number, label: string) => void
  showKo: boolean
}

export function normWord(tk: string): string {
  return tk.toLowerCase().replace(/[^a-z0-9''-]/g, '')
}

/** 다중 단어 타깃('out of stock')을 토큰 집합으로 변환 */
export function targetTokens(targets: string[] | undefined): Set<string> {
  const s = new Set<string>()
  for (const t of targets ?? []) for (const w of t.split(/\s+/)) { const k = normWord(w); if (k) s.add(k) }
  return s
}

/* ── 단어 탭 텍스트 ── */
function TapText({ text, st, className }: { text: string; st: ContentState; className?: string }) {
  const tokens = text.split(/(\s+)/)
  return (
    <span className={className}>
      {tokens.map((tk, i) => {
        if (/^\s+$/.test(tk)) return <span key={i}>{tk}</span>
        const key = normWord(tk)
        if (!key) return <span key={i}>{tk}</span>
        const marked = st.marks.has(key)
        const tMarked = st.tutorMarks.has(key)
        return (
          <span key={i} onClick={() => st.onTapWord(key)}
            className={`cursor-pointer rounded-[3px] px-[1px] -mx-[1px] transition-colors ${
              marked ? 'bg-[#FDE68A]' : tMarked ? 'bg-[#DBEAFE] text-[#1D4ED8] font-semibold' : 'hover:bg-[#F3F4F6]'
            } ${marked && tMarked ? 'underline decoration-[#2563EB] decoration-2 underline-offset-2' : ''}`}>
            {tk}
          </span>
        )
      })}
    </span>
  )
}

/* ── 빈칸 마커(______ / ___(n)___) 포함 문장 ── */
function SentenceText({ text, st, focusBlank }: { text: string; st: ContentState; focusBlank?: number }) {
  const parts = text.split(/(___\(\d\)___|______)/)
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^___\((\d)\)___$/)
        if (m || p === '______') {
          const n = m ? Number(m[1]) : undefined
          const focused = n !== undefined && focusBlank === n
          return (
            <span key={i}
              className={`inline-block min-w-[64px] text-center mx-0.5 px-2 rounded-md border-b-2 text-[13px] font-black align-baseline ${
                focused ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#94A3B8]'
              }`}>
              {n ? `(${n})` : '____'}
            </span>
          )
        }
        return <TapText key={i} text={p} st={st} />
      })}
    </>
  )
}

/* ── 문항 카드 ── */
function QuestionCard({ q, qIdx, lesson, st }: { q: QuestionItem; qIdx: number; lesson: TypeLesson; st: ContentState }) {
  const ref = useRef<HTMLDivElement>(null)
  const focused = st.focusQ === qIdx
  const graded = st.graded.has(qIdx)
  const selectable = !graded && (st.answerMode === 'all' || (st.answerMode === 'single' && focused))
  const revealed = st.revealedOptions[qIdx]
  const correctLabel = q.options.find((o) => o.correct)?.label
  // 파트1·2는 실제 시험에서 문제 지문이 없음(사진/음성) → 문제 헤더 숨기고 보기만
  const hideQ = lesson.part === 1 || lesson.part === 2

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [focused])

  return (
    <div ref={ref}
      className={`rounded-2xl border bg-white p-4 transition-all ${
        focused ? 'border-[#2563EB] shadow-[0_2px_16px_rgba(37,99,235,0.14)] ring-1 ring-[#2563EB]/20' : 'border-[#E5E7EB]'
      }`}>
      {!hideQ && (
        <div className="flex items-start gap-2.5 mb-3">
          <span className={`shrink-0 w-7 h-7 rounded-lg text-[12px] font-black flex items-center justify-center ${
            focused ? 'bg-[#2563EB] text-white' : 'bg-[#EFF6FF] text-[#2563EB]'
          }`}>Q{qIdx + 1}</span>
          <p className="text-[14px] md:text-[15px] font-semibold text-[#1C1B33] leading-relaxed pt-0.5">
            <TapText text={q.q} st={st} />
          </p>
        </div>
      )}
      <div className="space-y-2">
        {q.options.map((o) => {
          const hidden = !!lesson.content.optionAudio && revealed !== 'all' && !(revealed instanceof Set && revealed.has(o.label))
          const chosen = st.answers[qIdx] === o.label
          const isCorrect = o.label === correctLabel
          const playing = st.playingId === `opt:${qIdx}:${o.label}`
          const showResult = graded
          const rowCls = showResult
            ? isCorrect ? 'border-[#86EFAC] bg-[#F0FDF4]'
              : chosen ? 'border-[#FCA5A5] bg-[#FEF2F2]' : 'border-[#E5E7EB] bg-white opacity-70'
            : chosen ? 'border-[#2563EB] bg-[#EFF6FF]'
              : playing ? 'border-[#93C5FD] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-white'
          const circleCls = showResult
            ? isCorrect ? 'border-[#22C55E] text-[#16A34A]' : chosen ? 'border-[#EF4444] text-[#EF4444]' : 'border-[#D1D5DB] text-[#9CA3AF]'
            : chosen ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-[#D1D5DB] text-[#6B7280]'
          return (
            <div key={o.label}>
              <button
                disabled={!selectable}
                onClick={() => selectable && st.onSelect(qIdx, o.label)}
                className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${rowCls} ${
                  selectable ? 'hover:border-[#93C5FD] hover:shadow-sm active:scale-[0.995] cursor-pointer' : 'cursor-default'
                }`}>
                <span className={`shrink-0 w-6 h-6 rounded-full border-2 text-[11px] font-black flex items-center justify-center ${circleCls}`}>
                  {o.label}
                </span>
                {hidden ? (
                  <span className={`text-[13px] font-medium flex items-center gap-1.5 ${playing ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>
                    <SpeakerIcon pulse={playing} /> {playing ? '재생 중…' : '음성으로 들어요'}
                  </span>
                ) : (
                  <span className="text-[13px] md:text-[14px] text-[#1C1B33] leading-snug flex-1">
                    <TapText text={o.text} st={st} />
                  </span>
                )}
                {playing && !hidden && <SpeakerIcon pulse />}
                {showResult && isCorrect && <span className="ml-auto shrink-0 text-[10px] font-black text-[#16A34A]">정답</span>}
                {showResult && chosen && !isCorrect && <span className="ml-auto shrink-0 text-[10px] font-black text-[#EF4444]">내 답</span>}
              </button>
              {showResult && o.why && (isCorrect || chosen) && (
                <p className={`text-[11px] leading-relaxed mt-1 ml-9 ${isCorrect ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>{o.why}</p>
              )}
            </div>
          )
        })}
      </div>
      {(lesson.part === 3 || lesson.part === 4) && <ScriptAccordion lesson={lesson} st={st} />}
    </div>
  )
}

function SpeakerIcon({ pulse }: { pulse?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`w-3.5 h-3.5 shrink-0 ${pulse ? 'animate-pulse text-[#2563EB]' : ''}`}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

/* ── LC 스크립트 아코디언 (각 문항 아래) — 정답 확인 전 잠금, 해제되면 접었다 폈다 ── */
function ScriptAccordion({ lesson, st }: { lesson: TypeLesson; st: ContentState }) {
  const script = lesson.content.audioScript ?? []
  const [open, setOpen] = useState(false)
  if (!script.length) return null
  const anyRevealed = st.revealedScript === 'all' || st.revealedScript.size > 0

  // 잠금 상태 — 정답 확인 전
  if (!anyRevealed) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="text-[11px] font-semibold text-[#9CA3AF]">정답을 확인하면 스크립트가 열려요</span>
      </div>
    )
  }

  // 해제 상태 — 접기/펼치기
  return (
    <div className="mt-3 rounded-xl border border-[#E5E7EB] overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#F8FAFF] hover:bg-[#EFF6FF] transition-colors">
        <SpeakerIcon />
        <span className="text-[12px] font-bold text-[#475569]">스크립트</span>
        <span className="text-[10px] font-semibold text-[#94A3B8]">{open ? '접기' : '펼쳐 보기'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="p-3 space-y-1.5 bg-white">
          {script.map((s) => {
            const revealed = st.revealedScript === 'all' || st.revealedScript.has(s.id)
            if (!revealed) return null
            const playing = st.playingId === s.id
            return (
              <div key={s.id} className={`flex gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors ${playing ? 'bg-[#EFF6FF] ring-1 ring-[#93C5FD]' : ''}`}>
                {s.speaker && (
                  <span className={`shrink-0 w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center mt-0.5 ${
                    s.speaker === 'W' ? 'bg-[#FCE7F3] text-[#DB2777]' : 'bg-[#DBEAFE] text-[#2563EB]'
                  }`}>{s.speaker}</span>
                )}
                <p className="text-[13px] md:text-[14px] text-[#334155] leading-relaxed flex-1">
                  <TapText text={s.en} st={st} />
                </p>
                {playing && <SpeakerIcon pulse />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── 시각자료(표) — LC 표/자료형 ── */
function VisualPanel({ lesson }: { lesson: TypeLesson }) {
  const v = lesson.content.visual
  if (!v) return null
  return (
    <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFDF5] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#FDE68A] flex items-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        <p className="text-[12px] font-bold text-[#B45309]">{v.title}</p>
      </div>
      <TableView table={v.table} accent="#B45309" />
    </div>
  )
}

function TableView({ table, accent = '#475569' }: { table: { headers: string[]; rows: string[][] }; accent?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] md:text-[13px]">
        <thead>
          <tr className="border-b border-[#E5E7EB]">
            {table.headers.map((h) => (
              <th key={h} className="px-3.5 py-2 text-left font-bold whitespace-nowrap" style={{ color: accent }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-black/[0.02]' : ''}>
              {r.map((c, j) => (
                <td key={j} className="px-3.5 py-2 text-[#334155] whitespace-nowrap">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── RC 지문 (점진 공개 · 이메일/공지/채팅/표/양식) ── */
const KIND_LABEL: Record<PassageDoc['kind'], string> = {
  text: '지문', email: '이메일', notice: '공지', ad: '광고', article: '기사', chat: '문자 대화', table: '표', form: '양식',
}

function PassageView({ doc, lesson, st, focusBlank }: { doc: PassageDoc; lesson: TypeLesson; st: ContentState; focusBlank?: number }) {
  const revealed = st.revealedPassages === 'all' || st.revealedPassages.has(doc.id)
  if (!revealed) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#FAFAFA] px-4 py-6 flex flex-col items-center gap-1.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-[12px] font-semibold text-[#C4C9D4]">{doc.label ?? KIND_LABEL[doc.kind]} — 순서가 되면 열려요</p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-[#F8FAFF] border-b border-[#EEF2F7] flex items-center gap-2">
        <span className="text-[10px] font-black tracking-wide text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-md">
          {doc.label ?? KIND_LABEL[doc.kind]}
        </span>
        {doc.title && <p className="text-[13px] font-bold text-[#1C1B33] truncate">{doc.title}</p>}
      </div>

      {doc.meta && (
        <div className="px-4 py-2.5 bg-[#FCFCFD] border-b border-[#F3F4F6] space-y-0.5">
          {doc.meta.map((m) => (
            <p key={m.k} className="text-[11px] text-[#64748B]"><span className="font-bold text-[#94A3B8] inline-block w-14">{m.k}</span>{m.v}</p>
          ))}
        </div>
      )}

      {doc.table && <TableView table={doc.table} />}

      {doc.chat && (
        <div className="p-4 space-y-3">
          {doc.chat.map((c) => {
            const first = doc.chat![0].speaker
            const mine = c.speaker !== first
            return (
              <div key={c.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <p className="text-[10px] text-[#94A3B8] mb-1 px-1">{c.speaker}{c.time ? ` · ${c.time}` : ''}</p>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  mine ? 'bg-[#2563EB] text-white rounded-tr-sm' : 'bg-[#F3F4F6] text-[#1C1B33] rounded-tl-sm'
                }`}>
                  <TapText text={c.text} st={st} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {doc.sentences && (
        <div className="p-4 space-y-2">
          {doc.sentences.map((s) => (
            <SentenceRow key={s.id} s={s} st={st} focusBlank={focusBlank} />
          ))}
        </div>
      )}
    </div>
  )
}

function SentenceRow({ s, st, focusBlank }: { s: SentenceItem; st: ContentState; focusBlank?: number }) {
  const playing = st.playingId === s.id
  return (
    <div className={`rounded-lg px-2 py-1 -mx-2 transition-colors ${playing ? 'bg-[#EFF6FF]' : ''}`}>
      <p className="text-[13px] md:text-[14px] text-[#334155] leading-[1.9]">
        <SentenceText text={s.en} st={st} focusBlank={focusBlank} />
      </p>
      {st.showKo && s.ko && (
        <p className="text-[11px] text-[#94A3B8] leading-relaxed mt-0.5">{s.ko}</p>
      )}
    </div>
  )
}

/* ── 메인: 파트별 레이아웃 ── */
export default function ContentView({ lesson, st }: { lesson: TypeLesson; st: ContentState }) {
  const { part, content } = lesson
  const focusBlank = st.focusQ !== undefined && part === 6 ? st.focusQ + 1 : part === 5 ? 1 : undefined

  const questionsBlock = (
    <div className="space-y-3">
      {content.questions.map((q, i) => (
        <QuestionCard key={i} q={q} qIdx={i} lesson={lesson} st={st} />
      ))}
    </div>
  )

  /* P1 — 사진 위 · 보기 아래 (실제 파트1엔 문제 지문이 없어 보기만 표시) */
  if (part === 1) {
    return (
      <div className="flex flex-col gap-4 max-w-[620px] mx-auto">
        {content.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.photo} alt="문제 사진" className="w-full rounded-2xl border border-[#E5E7EB] object-cover" />
        )}
        <div className="min-w-0">{questionsBlock}</div>
      </div>
    )
  }

  /* P2 — 음성 질문 카드 + 보기 */
  if (part === 2) {
    const q1 = content.audioScript?.[0]
    const qRevealed = q1 && (st.revealedScript === 'all' || st.revealedScript.has(q1.id))
    return (
      <div className="max-w-[560px] mx-auto space-y-4">
        <div className={`rounded-2xl border px-5 py-6 flex flex-col items-center gap-2.5 transition-colors ${
          st.playingId === q1?.id ? 'border-[#93C5FD] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-white'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${st.playingId === q1?.id ? 'bg-[#2563EB] text-white animate-pulse' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </div>
          {qRevealed && q1 ? (
            <p className="text-[15px] font-semibold text-[#1C1B33] text-center leading-relaxed"><TapText text={q1.en} st={st} /></p>
          ) : (
            <p className="text-[13px] text-[#9CA3AF] font-medium">질문은 음성으로 나와요</p>
          )}
        </div>
        {questionsBlock}
      </div>
    )
  }

  /* P3·P4 — 시각자료 + 문항 (스크립트는 각 문항 아래 아코디언) */
  if (part === 3 || part === 4) {
    return (
      <div className="space-y-4">
        <VisualPanel lesson={lesson} />
        {questionsBlock}
      </div>
    )
  }

  /* P5 — 문장 카드 + 보기 */
  if (part === 5) {
    const s = content.passages?.[0]?.sentences?.[0]
    return (
      <div className="max-w-[560px] mx-auto space-y-4">
        {s && (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-6">
            <p className="text-[15px] md:text-[16px] text-[#1C1B33] leading-[2.1] text-center">
              <SentenceText text={s.en} st={st} focusBlank={focusBlank} />
            </p>
          </div>
        )}
        {questionsBlock}
      </div>
    )
  }

  /* P6·P7 — 지문(들) 좌 · 문항 우 */
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0 space-y-3">
        {content.passages?.map((doc) => (
          <PassageView key={doc.id} doc={doc} lesson={lesson} st={st} focusBlank={focusBlank} />
        ))}
      </div>
      <div className="lg:w-[42%] shrink-0">{questionsBlock}</div>
    </div>
  )
}
