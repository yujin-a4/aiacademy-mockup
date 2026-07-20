'use client'

/* ── 유형학습 콘텐츠 렌더러 ──
   파트/유형별 본문: 사진(P1) · 음성 질문(P2) · 스크립트+시각자료(P3/4) · 빈칸 문장(P5/6) ·
   지문/채팅/표(P7, 점진 공개). 모든 영어 텍스트는 단어 탭 → 형광펜(필기 인식 대체). */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { TypeLesson, PassageDoc, QuestionItem, SentenceItem, MatchEvidence } from '@/data/typeLearning'
import MicButton from '@/components/type-lesson/MicButton'

export interface ContentState {
  revealedScript: Set<string> | 'all'
  revealedOptions: Record<number, Set<string> | 'all'>
  /** 지금 다루는 지문 id — 탭이 자동으로 이 지문을 따라간다.
   *  지문 자체에는 잠금이 없다(학생은 언제든 모든 지문을 오갈 수 있음). */
  activePassageId?: string
  playingId: string | null
  marks: Set<string>
  tutorMarks: Set<string>
  onTapWord: (word: string) => void
  /** 문장 하나만 재생 (스크립트 문장 클릭) — 없으면 재생 버튼을 안 그린다(실전 단계 등) */
  onPlaySentence?: (id: string, text: string) => void
  /** 스캐폴딩이 쉐도잉 단계에 도달했는가 — 스크립트 문장별 쉐도잉 버튼은 그 뒤부터 열린다 */
  shadowUnlocked?: boolean
  focusQ?: number
  /** 'single': focusQ 문항만 선택 가능 / 'all': 전 문항 선택 가능 / 'none' */
  answerMode: 'none' | 'single' | 'all'
  answers: Record<number, string>
  graded: Set<number>
  onSelect: (qIdx: number, label: string) => void
  showKo: boolean
  /** 근거 연결(match) 진행 중일 때만 존재 — 지문의 문장/메타/표 행을 직접 탭하는 상호작용 상태.
   *  matchedTargets는 `${passageId}:${targetId}` 키로 이미 맞힌 근거를 담는다. */
  matchState?: { evidence: MatchEvidence[]; matchedTargets: Set<string>; onTap: (passageId: string, targetId: string) => void }
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

/* ── 쉐도잉 패널 — 음원을 한 번 듣고 따라 말하기. 발음 평가는 하지 않고 인식된 말만 보여준다 ── */
function ShadowPanel({ text, onReplay }: { text: string; onReplay: () => void }) {
  const [said, setSaid] = useState('')
  return (
    <div className="mt-1.5 ml-9 rounded-xl border border-[#BFDBFE] bg-[#F8FAFF] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <MicButton lang="en-US" onResult={setSaid} className="!w-8 !h-8" />
        <p className="text-[11px] font-bold text-[#1D4ED8] flex-1">듣고 따라 말해보세요</p>
        <button onClick={onReplay}
          className="shrink-0 text-[10px] font-bold text-[#2563EB] border border-[#BFDBFE] bg-white rounded-lg px-2 py-1 hover:bg-[#EFF6FF]">다시 듣기</button>
      </div>
      <p className="text-[12px] text-[#334155] mt-1.5 leading-relaxed">{said || <span className="text-[#9CA3AF]">{text}</span>}</p>
    </div>
  )
}

/* 선택지·질문에 붙는 작은 아이콘 버튼 (쉐도잉/스크립트) — 정답 공개나 코칭 전에는 잠긴다 */
function MiniBtn({ label, active, disabled, onClick, children }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode
}) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} disabled={disabled} aria-label={label}
      className={`shrink-0 flex items-center gap-1 text-[10px] font-bold rounded-lg border px-2 py-1 transition-colors ${
        disabled ? 'border-[#EEF0F4] bg-[#FAFAFA] text-[#C4C9D4] cursor-not-allowed'
          : active ? 'border-[#2563EB] bg-[#2563EB] text-white'
          : 'border-[#BFDBFE] bg-white text-[#2563EB] hover:bg-[#EFF6FF]'
      }`}>
      {children}
    </button>
  )
}

/* ── 문항 카드 ── */
function QuestionCard({ q, qIdx, lesson, st }: { q: QuestionItem; qIdx: number; lesson: TypeLesson; st: ContentState }) {
  const ref = useRef<HTMLDivElement>(null)
  /* 보기별 스크립트 표시 여부를 학생이 직접 뒤집은 기록. 값이 없으면 턴이 공개한 상태를 따르고,
     한 번이라도 누르면(열든 닫든) 그 선택이 이긴다 — 슬라이드 명세가 "재클릭 시 숨김"이라 양방향이어야 한다. */
  const [scriptOverride, setScriptOverride] = useState<Record<string, boolean>>({})
  const [shadowFor, setShadowFor] = useState<string | null>(null)
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
          /* 보기가 음성인 유형(P1·P2)의 보기별 컨트롤.
             쉐도잉·스크립트는 강사가 정답을 공개했거나 그 보기를 코칭한 뒤에만 열린다. */
          const optAudio = !!lesson.content.optionAudio
          const coached = graded || revealed === 'all' || (revealed instanceof Set && revealed.has(o.label))
          const scriptShown = scriptOverride[o.label] ?? !hidden
          const textHidden = !scriptShown
          const playOpt = () => st.onPlaySentence?.(`opt:${qIdx}:${o.label}`, `${o.label}. ${o.text}`)
          return (
            <div key={o.label}>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={!selectable && !optAudio}
                  onClick={() => (selectable ? st.onSelect(qIdx, o.label) : optAudio ? playOpt() : undefined)}
                  className={`flex-1 min-w-0 flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${rowCls} ${
                    selectable || optAudio ? 'hover:border-[#93C5FD] hover:shadow-sm active:scale-[0.995] cursor-pointer' : 'cursor-default'
                  }`}>
                  <span className={`shrink-0 w-6 h-6 rounded-full border-2 text-[11px] font-black flex items-center justify-center ${circleCls}`}>
                    {o.label}
                  </span>
                  {textHidden ? (
                    <span className={`text-[13px] font-medium flex items-center gap-1.5 ${playing ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>
                      <SpeakerIcon pulse={playing} /> {playing ? '재생 중…' : '음성으로 들어요'}
                    </span>
                  ) : (
                    <span className="text-[13px] md:text-[14px] text-[#1C1B33] leading-snug flex-1">
                      <TapText text={o.text} st={st} />
                    </span>
                  )}
                  {playing && !textHidden && <SpeakerIcon pulse />}
                  {showResult && isCorrect && <span className="ml-auto shrink-0 text-[10px] font-black text-[#16A34A]">정답</span>}
                  {showResult && chosen && !isCorrect && <span className="ml-auto shrink-0 text-[10px] font-black text-[#EF4444]">내 답</span>}
                </button>

                {optAudio && (
                  <>
                    <MiniBtn label="쉐도잉" disabled={!coached} active={shadowFor === o.label}
                      onClick={() => {
                        const next = shadowFor === o.label ? null : o.label
                        setShadowFor(next)
                        if (next) playOpt()
                      }}>쉐도잉 ▶</MiniBtn>
                    <MiniBtn label="스크립트 보기" disabled={!coached} active={scriptShown}
                      onClick={() => setScriptOverride((p) => ({ ...p, [o.label]: !scriptShown }))}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
                      </svg>
                    </MiniBtn>
                  </>
                )}
              </div>

              {shadowFor === o.label && <ShadowPanel text={o.text} onReplay={playOpt} />}
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

/* ── 문항 탭(P3·P4·P6·P7) — 한 화면에 한 문항만.
   탭으로 이전/이후 문항을 자유롭게 오갈 수 있고, 턴이 다루는 문항(focusQ)이 바뀌면 그 탭으로 자동 이동한다.
   탭 점: 채점 후엔 정/오답(초록/빨강), 채점 전 답만 고른 상태(실전)는 파랑. ── */
function QuestionTabs({ lesson, st, pane }: { lesson: TypeLesson; st: ContentState; pane?: boolean }) {
  const qs = lesson.content.questions
  const [active, setActive] = useState(0)
  const focusQ = st.focusQ
  useEffect(() => {
    if (focusQ !== undefined && focusQ >= 0 && focusQ < qs.length) setActive(focusQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusQ])

  const idx = Math.min(active, qs.length - 1)
  return (
    /* pane: 높이가 정해진 칸(P6·P7 하단) — 탭 줄은 고정, 카드만 스크롤.
       그 외(P3·P4): 페이지 전체가 스크롤되므로 탭 줄을 sticky로 붙여 둔다. */
    <div className={pane ? 'flex-1 min-h-0 flex flex-col' : ''}>
      <div className={`flex items-center gap-1.5 pb-2 ${pane ? 'shrink-0' : 'sticky top-0 z-10 bg-white pt-0.5'}`}>
        {qs.map((q, i) => {
          const graded = st.graded.has(i)
          const correct = graded && st.answers[i] === q.options.find((o) => o.correct)?.label
          const answered = !graded && !!st.answers[i]
          return (
            <button key={i} onClick={() => setActive(i)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                idx === i ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#93C5FD]'
              }`}>
              Q{i + 1}
              {graded && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${correct ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />}
              {answered && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${idx === i ? 'bg-white/70' : 'bg-[#93C5FD]'}`} />}
            </button>
          )
        })}
      </div>
      <div className={pane ? 'flex-1 min-h-0 overflow-y-auto' : ''}>
        <QuestionCard q={qs[idx]} qIdx={idx} lesson={lesson} st={st} />
      </div>
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
  const [shadowFor, setShadowFor] = useState<string | null>(null)   // 문장별 쉐도잉 중인 문장 id
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
            const playThis = () => st.onPlaySentence?.(s.id, s.en)
            return (
              <div key={s.id}>
                <div className={`flex gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors ${playing ? 'bg-[#EFF6FF] ring-1 ring-[#93C5FD]' : ''}`}>
                  {s.speaker && (
                    <span className={`shrink-0 w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center mt-0.5 ${
                      s.speaker === 'W' ? 'bg-[#FCE7F3] text-[#DB2777]' : 'bg-[#DBEAFE] text-[#2563EB]'
                    }`}>{s.speaker}</span>
                  )}
                  <p className="text-[13px] md:text-[14px] text-[#334155] leading-relaxed flex-1">
                    <TapText text={s.en} st={st} />
                  </p>
                  {/* 문장 재생은 별도 버튼 — 문장 안의 단어 탭은 형광펜이라 클릭 대상이 겹치면 안 된다 */}
                  {st.onPlaySentence && (
                    <div className="shrink-0 self-start mt-0.5 flex items-center gap-1">
                      {/* 문장별 쉐도잉 — 강사 주도 쉐도잉 단계를 지난 뒤부터(그 전엔 아예 안 보임) */}
                      {st.shadowUnlocked && (
                        <MiniBtn label="이 문장 쉐도잉" active={shadowFor === s.id}
                          onClick={() => {
                            const next = shadowFor === s.id ? null : s.id
                            setShadowFor(next)
                            if (next) playThis()
                          }}>쉐도잉 ▶</MiniBtn>
                      )}
                      <button onClick={playThis} aria-label="이 문장 듣기"
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                          playing ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-[#DBEAFE] bg-white text-[#2563EB] hover:bg-[#EFF6FF]'
                        }`}>
                        <SpeakerIcon pulse={playing} />
                      </button>
                    </div>
                  )}
                </div>
                {shadowFor === s.id && <ShadowPanel text={s.en} onReplay={playThis} />}
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

/** docId+st가 있으면(근거 연결 진행 중) 행을 탭해 근거로 선택할 수 있다 — VisualPanel(LC 시각자료)은 둘 다 안 넘겨서 그대로 정적. */
function TableView({ table, accent = '#475569', docId, st }: { table: { headers: string[]; rows: string[][] }; accent?: string; docId?: string; st?: ContentState }) {
  const active = !!(docId && st?.matchState)
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
          {table.rows.map((r, i) => {
            const targetId = `row:${i}`
            const matched = active && st!.matchState!.matchedTargets.has(`${docId}:${targetId}`)
            return (
              <tr key={i}
                onClick={active ? () => st!.matchState!.onTap(docId!, targetId) : undefined}
                className={`transition-colors ${i % 2 ? 'bg-black/[0.02]' : ''} ${active ? 'cursor-pointer' : ''} ${
                  matched ? 'bg-[#F0FDF4] ring-1 ring-inset ring-[#86EFAC]' : active ? 'hover:bg-[#EFF6FF]' : ''
                }`}>
                {r.map((c, j) => (
                  <td key={j} className="px-3.5 py-2 text-[#334155] whitespace-nowrap">
                    {j === 0 && matched && <span className="mr-1 text-[#16A34A] font-black">✓</span>}{c}
                  </td>
                ))}
              </tr>
            )
          })}
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
          {doc.meta.map((m) => {
            const targetId = `meta:${m.k}`
            const matched = st.matchState?.matchedTargets.has(`${doc.id}:${targetId}`)
            return (
              <p key={m.k}
                onClick={st.matchState ? () => st.matchState!.onTap(doc.id, targetId) : undefined}
                className={`text-[11px] text-[#64748B] rounded px-1 -mx-1 transition-colors ${st.matchState ? 'cursor-pointer' : ''} ${
                  matched ? 'bg-[#F0FDF4] ring-1 ring-[#86EFAC] text-[#15803D] font-semibold' : st.matchState ? 'hover:bg-[#F1F5F9]' : ''
                }`}>
                {matched && <span className="mr-1 text-[#16A34A] font-black">✓</span>}
                <span className="font-bold text-[#94A3B8] inline-block w-14">{m.k}</span>{m.v}
              </p>
            )
          })}
        </div>
      )}

      {doc.table && <TableView table={doc.table} docId={doc.id} st={st} />}

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
            <SentenceRow key={s.id} s={s} st={st} focusBlank={focusBlank} docId={doc.id} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 지문 영역(P6·P7) — 지문이 여러 개(이중·삼중)면 탭으로 전환, 하나면 바로 표시.
   지문에 잠금은 없다(학생이 언제든 자유롭게 오감). 다만 턴이 다루는 지문이 바뀌면
   그 탭으로 자동 이동한다 — 학생이 직접 다른 탭을 고른 뒤에도 수업 흐름은 따라가야 하므로. ── */
function PassageTabs({ docs, lesson, st, focusBlank }: { docs: PassageDoc[]; lesson: TypeLesson; st: ContentState; focusBlank?: number }) {
  const [active, setActive] = useState(0)
  const activeId = st.activePassageId
  useEffect(() => {
    if (!activeId) return
    const i = docs.findIndex((d) => d.id === activeId)
    if (i >= 0) setActive(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  if (docs.length <= 1) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {docs[0] && <PassageView doc={docs[0]} lesson={lesson} st={st} focusBlank={focusBlank} />}
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-1.5 mb-2 shrink-0">
        {docs.map((d, i) => {
          const pending = st.matchState?.evidence.some((ev) =>
            ev.passageId === d.id && ev.targetIds.some((tid) => !st.matchState!.matchedTargets.has(`${d.id}:${tid}`)))
          return (
            <button key={d.id} onClick={() => setActive(i)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                active === i ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#93C5FD]'
              }`}>
              {pending && <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse shrink-0" />}
              {d.label ?? `지문 ${i + 1}`}
            </button>
          )
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <PassageView doc={docs[active]} lesson={lesson} st={st} focusBlank={focusBlank} />
      </div>
    </div>
  )
}

function SentenceRow({ s, st, focusBlank, docId }: { s: SentenceItem; st: ContentState; focusBlank?: number; docId?: string }) {
  const playing = st.playingId === s.id
  const match = st.matchState
  const matched = docId && match?.matchedTargets.has(`${docId}:${s.id}`)
  return (
    <div
      onClick={match && docId ? () => match.onTap(docId, s.id) : undefined}
      className={`rounded-lg px-2 py-1 -mx-2 transition-colors ${playing ? 'bg-[#EFF6FF]' : ''} ${match && docId ? 'cursor-pointer' : ''} ${
        matched ? 'bg-[#F0FDF4] ring-1 ring-[#86EFAC]' : match && docId ? 'hover:bg-[#F8FAFC]' : ''
      }`}>
      <p className="text-[13px] md:text-[14px] text-[#334155] leading-[1.9]">
        {matched && <span className="mr-1 text-[#16A34A] font-black">✓</span>}
        <SentenceText text={s.en} st={st} focusBlank={focusBlank} />
      </p>
      {st.showKo && s.ko && (
        <p className="text-[11px] text-[#94A3B8] leading-relaxed mt-0.5">{s.ko}</p>
      )}
    </div>
  )
}

/* ── P2 질문 카드 — 질문 음원 재생 + 쉐도잉(1차 청취 뒤 열림) ── */
function Part2View({ lesson, st, children }: { lesson: TypeLesson; st: ContentState; children: ReactNode }) {
  const q1 = lesson.content.audioScript?.[0]
  const [shadowOpen, setShadowOpen] = useState(false)
  const qRevealed = !!q1 && (st.revealedScript === 'all' || st.revealedScript.has(q1.id))
  const playing = st.playingId === q1?.id
  const playQ = () => q1 && st.onPlaySentence?.(q1.id, q1.en)

  return (
    <div className="max-w-[560px] mx-auto space-y-4">
      <div className={`rounded-2xl border px-5 py-6 flex flex-col items-center gap-2.5 transition-colors ${
        playing ? 'border-[#93C5FD] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-white'
      }`}>
        <button onClick={playQ} aria-label="질문 음원 재생"
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            playing ? 'bg-[#2563EB] text-white animate-pulse' : 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]'
          }`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </button>
        {qRevealed && q1 ? (
          <p className="text-[15px] font-semibold text-[#1C1B33] text-center leading-relaxed"><TapText text={q1.en} st={st} /></p>
        ) : (
          <p className="text-[13px] text-[#9CA3AF] font-medium">질문은 음성으로 나와요</p>
        )}
        {/* 질문 쉐도잉 — 질문 스크립트가 공개된(1차 청취를 지난) 뒤부터 */}
        <MiniBtn label="질문 쉐도잉" disabled={!qRevealed} active={shadowOpen} onClick={() => { const n = !shadowOpen; setShadowOpen(n); if (n) playQ() }}>
          쉐도잉 ▶
        </MiniBtn>
      </div>
      {shadowOpen && q1 && (
        <div className="-mt-1"><ShadowPanel text={q1.en} onReplay={playQ} /></div>
      )}
      {children}
    </div>
  )
}

/* ── 메인: 파트별 레이아웃 ── */
export default function ContentView({ lesson, st }: { lesson: TypeLesson; st: ContentState }) {
  const { part, content } = lesson
  const focusBlank = st.focusQ !== undefined && part === 6 ? st.focusQ + 1 : part === 5 ? 1 : undefined

  /* 묶음 문항 파트(P3·P4·P6·P7)는 탭으로 한 문항씩 — 세로로 다 쌓으면 한눈에 안 들어온다.
     P1·P2·P5는 원래 문항이 하나라 그대로 카드만 표시. */
  const multiQ = content.questions.length > 1 && (part === 3 || part === 4 || part === 6 || part === 7)
  const questionsBlock = multiQ ? (
    <QuestionTabs lesson={lesson} st={st} />
  ) : (
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
    return <Part2View lesson={lesson} st={st}>{questionsBlock}</Part2View>
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

  /* P6·P7 — 지문(들) 위 · 문항 아래, 각각 독립 스크롤. 지문이 여럿이면 탭으로 전환 */
  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <div className="flex-[3] min-h-0 flex flex-col">
        <PassageTabs docs={content.passages ?? []} lesson={lesson} st={st} focusBlank={focusBlank} />
      </div>
      {/* 문항 칸 — 탭이 있으면 탭 줄은 고정하고 카드만 스크롤(QuestionTabs가 자체 스크롤을 가짐) */}
      <div className={`flex-[2] min-h-0 border-t border-gray-100 pt-3 ${multiQ ? 'flex flex-col' : 'overflow-y-auto'}`}>
        {multiQ ? <QuestionTabs lesson={lesson} st={st} pane /> : questionsBlock}
      </div>
    </div>
  )
}
