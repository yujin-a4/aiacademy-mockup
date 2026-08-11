'use client'

/* ── 유형학습 콘텐츠 렌더러 ──
   파트/유형별 본문: 사진(P1) · 음성 질문(P2) · 스크립트+시각자료(P3/4) · 빈칸 문장(P5/6) ·
   지문/채팅/표(P7, 점진 공개). 모든 영어 텍스트는 단어 탭 → 형광펜(필기 인식 대체). */

import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import type { TypeLesson, TypeLessonContent, PassageDoc, QuestionItem, SentenceItem, MatchEvidence } from '@/data/typeLearning'
import { track } from '@/lib/analytics'

export interface ContentState {
  revealedScript: Set<string> | 'all'
  revealedOptions: Record<number, Set<string> | 'all'>
  /** 지금 다루는 지문 id — 탭이 자동으로 이 지문을 따라간다.
   *  지문 자체에는 잠금이 없다(학생은 언제든 모든 지문을 오갈 수 있음). */
  activePassageId?: string
  playingId: string | null
  marks: Set<string>
  /** 단어 탭(형광펜)을 쓸 수 있나 — 실전은 false. 지정하지 않으면 쓸 수 있다 */
  tapWords?: boolean
  tutorMarks: Set<string>
  onTapWord: (word: string) => void
  /** 문장 하나만 재생 (스크립트 문장 클릭) — 없으면 재생 버튼을 안 그린다(실전 단계 등) */
  onPlaySentence?: (id: string, text: string) => void
  /** 학생이 음원을 직접 트는 화면인가 (실전). 수업은 **강사가 틀어준다** —
   *  수업에서는 '음원 듣기' 버튼을 두지 않고, 지금 나가는 자리(보기·문항 옆)만 파랗게 켜서 알린다. */
  selfAudio?: boolean
  /** 이 음원을 더 들을 수 있는 횟수 (실전은 2회 제한). undefined면 무제한 */
  playsLeft?: (id: string) => number
  /** 실제 시험지처럼 **보기 없이 (A)(B)(C)(D) 마킹만** 하는 답안지 모드 (LC 실전, 채점 전) */
  answerSheet?: boolean
  /** 지금 도는 아이템의 문항 범위 [from, to). 아이템 순회 수업(STEP 4)에서만 온다.
   *  강의 하나가 사진 3장·문장 5개로 돌면 문항이 전부 세로로 쌓여 한눈에 안 들어온다 —
   *  지금 바퀴의 문항만 보여주고, 나머지는 단계가 넘어가면 나온다.
   *  ⚠️ 인덱스는 그대로 둔다. 턴이 qIdx 로 문항을 가리키므로 배열을 자르면 어긋난다. */
  visibleQ?: { from: number; to: number }
  focusQ?: number
  /** 잠깐 짚어 보여줄 문항 — '안 푼 문제가 있어요' 로 데려간 자리. 화면에 스크롤해 올리고 표시를 단다.
   *  focusQ 를 쓰면 '지금 읽어주는 문항' 과 뜻이 섞여서 따로 둔다. */
  spotlightQ?: number
  /** 'single': focusQ 문항만 선택 가능 / 'all': 전 문항 선택 가능 / 'none' */
  answerMode: 'none' | 'single' | 'all'
  answers: Record<number, string>
  graded: Set<number>
  /** 틀리게 고른 보기 `${qIdx}:${label}` — 채점 전이라도 "이건 아니다"를 남겨둔다.
   *  (오답이면 다시 고를 수 있어야 하는데, 표시가 없으면 같은 걸 또 누른다) */
  wrongPicks?: Set<string>
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

/** 형광펜 표시 하나의 키 — `자리|토큰번호|단어`.
 *  단어만으로 표시하면 **같은 단어가 지문에 나올 때마다 전부 칠해진다.** 학생이 짚은 것은 그 자리
 *  하나인데 화면은 다섯 군데가 켜지는 식이라, 자리(scope)와 토큰 번호까지 넣어 그 자리만 칠한다.
 *  뒤에 단어를 붙여 두는 이유는 '목표 단어를 다 짚었나'(mark 상호작용) 판정이 단어로 이뤄지기 때문이다. */
export const markKey = (scope: string, i: number, word: string) => `${scope}|${i}|${word}`
/** 표시된 키 집합 → 표시된 **단어** 집합 (mark 완료 판정용) */
export const markedWords = (marks: Set<string>) => {
  const s = new Set<string>()
  marks.forEach((k) => { const w = k.split('|').pop(); if (w) s.add(w) })
  return s
}

/* ── 단어 탭 텍스트 ── */
function TapText({ text, st, className, scope = '' }: { text: string; st: ContentState; className?: string; scope?: string }) {
  const tokens = text.split(/(\s+)/)
  /* 실전에는 형광펜이 없다 — 시험지에 밑줄을 긋고 싶으면 좌하단 연필(필기)을 쓴다.
     단어를 눌러 노랗게 칠하는 건 수업에서 강사가 "여기 짚어보세요" 할 때 쓰는 장치다. */
  const tappable = st.tapWords !== false
  return (
    <span className={className}>
      {tokens.map((tk, i) => {
        if (/^\s+$/.test(tk)) return <span key={i}>{tk}</span>
        const word = normWord(tk)
        if (!word) return <span key={i}>{tk}</span>
        const tMarked = st.tutorMarks.has(word)   // 강사가 짚은 단어는 지문 어디에 있든 같이 켜진다
        if (!tappable) {
          return tMarked
            ? <span key={i} className="rounded-[3px] px-[1px] -mx-[1px] bg-[#DBEAFE] text-[#1D4ED8] font-semibold">{tk}</span>
            : <span key={i}>{tk}</span>
        }
        const key = markKey(scope, i, word)
        const marked = st.marks.has(key)
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
function SentenceText({ text, st, focusBlank, scope = '' }: { text: string; st: ContentState; focusBlank?: number; scope?: string }) {
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
        return <TapText key={i} text={p} st={st} scope={`${scope}.${i}`} />
      })}
    </>
  )
}

/* 선택지·질문에 붙는 작은 아이콘 버튼 (스크립트 보기) — 정답 공개나 코칭 전에는 잠긴다 */
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
  const focused = st.focusQ === qIdx
  const graded = st.graded.has(qIdx)
  const selectable = !graded && (st.answerMode === 'all' || (st.answerMode === 'single' && focused))
  const revealed = st.revealedOptions[qIdx]
  const correctLabel = q.options.find((o) => o.correct)?.label
  /* 지금 나가는 음원이 "전체 지문/스크립트"인가 — 보기(opt:)·문항 묶음(qaudio:)은 그 자리에서 켜지므로 뺀다 */
  const scriptPlaying = !!st.playingId && !st.playingId.startsWith('opt:') && !st.playingId.startsWith('qaudio:')
  // 파트1·2는 실제 시험에서 문제 지문이 없음(사진/음성) → 문제 헤더 숨기고 보기만
  const hideQ = lesson.part === 1 || lesson.part === 2

  const spotted = st.spotlightQ === qIdx
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [focused])
  /* 안 푼 문항으로 데려온 경우 — 세트 안에서 아래쪽에 있으면 화면 밖이라 보이지가 않는다 */
  useEffect(() => {
    if (spotted) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [spotted])

  /* 지금 다루는 문항이라도 **파란 테두리는 두르지 않는다** — 보기 하나를 고르면 그 보기에도
     파란 테두리가 생겨서 테두리가 두 겹이 되고, 실전은 한 화면에 한 문항뿐이라 강조할 대상도 없다.
     지금 문항이라는 표시는 아래 Q번호 칩(파란 배경)이 이미 하고 있다. */
  /* 답안지 모드(LC 실전, 채점 전)에서는 카드 껍데기를 통째로 벗긴다 — 실제 시험지의 마킹란은
     상자 안에 들어 있지 않고 (A)(B)(C)(D) 가 그냥 놓여 있다. 테두리·그림자가 있으면 웹 폼처럼
     보여서 시험지 느낌이 깨진다. 채점하면 보기·근거가 열려 해설 카드가 되므로 상자를 되돌린다. */
  const bare = !!st.answerSheet && !graded
  /* P3·P4 실전은 세 문항이 한 상자 안에 나란히 있다 — 음원이 지금 읽어주는 문항이 어느 것인지
     보이지 않으면 학생이 따라가지 못한다. 이때만 옅은 파랑으로 짚는다.
     (선택한 보기의 파란 테두리와 겹치지 않게 카드는 배경으로, 보기는 테두리로 구분한다) */
  const readingNow = focused && !!st.selfAudio && (lesson.part === 3 || lesson.part === 4) && !graded
  return (
    <div ref={ref}
      className={bare ? `py-1 ${spotted ? 'rounded-2xl ring-2 ring-[#FCA5A5] bg-[#FEF2F2]' : ''}` : `rounded-2xl border p-4 transition-all ${
        spotted ? 'border-[#FCA5A5] bg-[#FEF2F2] ring-2 ring-[#FCA5A5]/40'
          : readingNow ? 'border-[#BFDBFE] bg-[#F5F9FF] shadow-[0_2px_16px_rgba(37,99,235,0.10)]'
            : `border-[#E5E7EB] bg-white ${focused ? 'shadow-[0_2px_16px_rgba(15,23,42,0.08)]' : ''}`
      }`}>
      {!hideQ && (
        <div className="flex items-start gap-2.5 mb-3">
          <span className={`shrink-0 w-7 h-7 rounded-lg text-[12px] font-black flex items-center justify-center ${
            focused ? 'bg-[#2563EB] text-white' : 'bg-[#EFF6FF] text-[#2563EB]'
          }`}>Q{qIdx + 1}</span>
          <p className="text-[14px] md:text-[15px] font-semibold text-[#1C1B33] leading-relaxed pt-0.5">
            <TapText text={q.q} st={st} scope={`q${qIdx}`} />
          </p>
          {/* 전체 지문 음원이 나가는 중 — 재생 바를 없앤 대신 "지금 소리가 난다"를 여기서 알린다.
              스크립트가 잠긴 P3·P4는 이 표시가 유일한 재생 신호다. */}
          {/* 문항이 여러 개 펼쳐져 있으면(P3·P4 실전) 세 장에 다 붙는다 → **짚고 있는 문항에만** 단다.
              담화가 나가는 동안(아직 짚는 문항이 없을 때)은 맨 위 세트 음원 바가 이미 재생을 알린다. */}
          {scriptPlaying && (focused || (!st.selfAudio && st.focusQ === undefined)) && (
            <span className="ml-auto shrink-0 flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-1 text-[10px] font-black text-[#2563EB]">
              <SpeakerIcon pulse /> {readingNow ? '읽는 중' : '재생 중'}
            </span>
          )}
        </div>
      )}
      {/* ── 답안지 모드 (LC 실전, 채점 전) ──
          실제 시험지에는 보기 내용이 인쇄되지 않는다 — (A)(B)(C)(D) 마킹 칸만 있다.
          채점하면 아래 일반 보기 목록으로 바뀌고 스크립트도 열린다(근거 확인). */}
      {st.answerSheet && !graded ? (
        <div className="flex items-center justify-center gap-3 md:gap-5 py-1">
          {q.options.map((o) => {
            const chosen = st.answers[qIdx] === o.label
            return (
              <button key={o.label} disabled={!selectable} onClick={() => st.onSelect(qIdx, o.label)}
                aria-label={`보기 ${o.label} 선택`} aria-pressed={chosen}
                className={`w-11 h-11 md:w-12 md:h-12 rounded-full border-2 text-[14px] md:text-[15px] font-black
                            flex items-center justify-center transition-all ${
                  chosen ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm'
                    : 'border-[#CBD5E1] bg-white text-[#475569] hover:border-[#93C5FD] hover:bg-[#F8FAFF]'
                } ${selectable ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-70'}`}>
                {o.label}
              </button>
            )
          })}
        </div>
      ) : (
      <div className="space-y-2">
        {q.options.map((o) => {
          const chosen = st.answers[qIdx] === o.label
          const isCorrect = o.label === correctLabel
          const playing = st.playingId === `opt:${qIdx}:${o.label}`
          const showResult = graded
          // 채점 전이라도 이미 틀린 보기는 표시해 둔다 (정답은 공개하지 않는다)
          const wrongTried = !showResult && !!st.wrongPicks?.has(`${qIdx}:${o.label}`)
          const rowCls = showResult
            ? isCorrect ? 'border-[#86EFAC] bg-[#F0FDF4]'
              : chosen ? 'border-[#FCA5A5] bg-[#FEF2F2]' : 'border-[#E5E7EB] bg-white opacity-70'
            /* 흐리게 두지 않는다 — "내가 고른 오답"은 지금 보라고 남겨둔 것이다.
               (예전엔 opacity-70 이라 빨강이 죽어서 그냥 지나간 줄처럼 보였다) */
            : wrongTried ? 'border-[#EF4444] bg-[#FEF2F2]'
              : chosen ? 'border-[#2563EB] bg-[#EFF6FF]'
                : playing ? 'border-[#93C5FD] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-white'
          const circleCls = showResult
            ? isCorrect ? 'border-[#22C55E] text-[#16A34A]' : chosen ? 'border-[#EF4444] text-[#EF4444]' : 'border-[#D1D5DB] text-[#9CA3AF]'
            : wrongTried ? 'border-[#EF4444] text-[#EF4444]'
              : chosen ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-[#D1D5DB] text-[#6B7280]'
          /* 보기가 음성인 유형(P1·P2)의 보기별 컨트롤.
             강사가 음원을 들려주고 나면 '스크립트 보기' **버튼이 열린다**(coached).
             ⚠️ 버튼만 열리고 글자는 안 열린다 — 듣기 수업인데 스크립트가 저절로 펼쳐지면
             학생이 소리 대신 글자를 읽어버린다. 열어볼지는 학생이 버튼으로 정한다. */
          const optAudio = !!lesson.content.optionAudio
          const coached = graded || revealed === 'all' || (revealed instanceof Set && revealed.has(o.label))
          /* 실전은 채점하고 나면 스크립트가 열린 채로 시작한다(근거 확인 단계라 감출 이유가 없다).
             수업은 그 반대 — 버튼만 열리고 내용은 학생이 눌러야 열린다. */
          const scriptShown = scriptOverride[o.label] ?? (optAudio ? (!!st.selfAudio && graded) : true)
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
                    /* 보기가 음성인 유형(P1·P2) — 재생 중인 보기가 곧 재생 표시다(별도 재생 바 없음) */
                    playing ? <EqLine label="재생 중" /> : (
                      <span className="text-[13px] font-medium flex items-center gap-1.5 text-[#9CA3AF]">
                        <SpeakerIcon /> 음성으로 들어요
                      </span>
                    )
                  ) : (
                    <span className="text-[13px] md:text-[14px] text-[#1C1B33] leading-snug flex-1">
                      <TapText text={o.text} st={st} scope={`q${qIdx}.${o.label}`} />
                    </span>
                  )}
                  {playing && !textHidden && <SpeakerIcon pulse />}
                  {showResult && isCorrect && <span className="ml-auto shrink-0 text-[10px] font-black text-[#16A34A]">정답</span>}
                  {showResult && chosen && !isCorrect && <span className="ml-auto shrink-0 text-[10px] font-black text-[#EF4444]">내 답</span>}
                  {/* 채점 전(리뷰·수업 중 재시도)에도 내가 고른 오답임을 말해준다.
                      정답은 여전히 공개하지 않는다 — "이건 아니다"만 남긴다. */}
                  {wrongTried && <span className="ml-auto shrink-0 text-[10px] font-black text-[#EF4444]">내 답 · 오답</span>}
                </button>

                {optAudio && (
                  <MiniBtn label="스크립트 보기" disabled={!coached} active={scriptShown}
                    onClick={() => setScriptOverride((p) => ({ ...p, [o.label]: !scriptShown }))}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
                    </svg>
                  </MiniBtn>
                )}
              </div>

              {showResult && o.why && (isCorrect || chosen) && (
                <p className={`text-[11px] leading-relaxed mt-1 ml-9 ${isCorrect ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>{o.why}</p>
              )}
            </div>
          )
        })}
      </div>
      )}
      {/* 세트 실전에서는 카드마다 달지 않는다 — 세 문항이 **같은 스크립트**를 보므로 세 번 반복된다.
          그때는 세트 머리('대화 듣기' 아래)에 한 번만 놓는다(아래 세트 레이아웃). */}
      {(lesson.part === 3 || lesson.part === 4) && !st.selfAudio && <ScriptAccordion lesson={lesson} st={st} />}
    </div>
  )
}

/* ── 문항 탭(P3·P4·P6·P7) — 한 화면에 한 문항만.
   탭으로 이전/이후 문항을 자유롭게 오갈 수 있고, 턴이 다루는 문항(focusQ)이 바뀌면 그 탭으로 자동 이동한다.
   탭 점: 채점 후엔 정/오답(초록/빨강), 채점 전 답만 고른 상태(실전)는 파랑. ── */
/** 이 문항이 지금 바퀴에 속하나 (범위가 없으면 전부 보인다) */
const qInView = (st: ContentState, i: number) =>
  !st.visibleQ || (i >= st.visibleQ.from && i < st.visibleQ.to)

function QuestionTabs({ lesson, st, pane }: { lesson: TypeLesson; st: ContentState; pane?: boolean }) {
  const qs = lesson.content.questions
  const [active, setActive] = useState(0)
  const focusQ = st.focusQ
  useEffect(() => {
    if (focusQ !== undefined && focusQ >= 0 && focusQ < qs.length) setActive(focusQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusQ])

  /* 탭에 올릴 문항 = 지금 바퀴(visibleQ)에 속한 것만. 범위 밖 문항까지 탭에 두면
     아직 안 다룬 문항으로 건너뛸 수 있어 순회 수업이 어긋난다.
     한 문항만 남으면(실전 페이징 등) 탭 줄 자체가 군더더기라 카드만 그린다. */
  const viewIdx = qs.map((_, i) => i).filter((i) => qInView(st, i))
  const idx = viewIdx.includes(active) ? active : (viewIdx[0] ?? 0)
  const q = qs[idx]
  if (!q) return null

  return (
    /* pane: 높이가 정해진 칸(P6·P7 하단) — 탭 줄은 고정, 카드만 스크롤.
       그 외(P3·P4): 페이지 전체가 스크롤되므로 탭 줄을 sticky로 붙여 둔다. */
    <div className={pane ? 'flex-1 min-h-0 flex flex-col' : ''}>
      {viewIdx.length > 1 && (
        <div className={`flex items-center gap-1.5 pb-2 ${pane ? 'shrink-0' : 'sticky top-0 z-10 bg-white pt-0.5'}`}>
          {viewIdx.map((i) => {
            const graded = st.graded.has(i)
            const correct = graded && st.answers[i] === qs[i].options.find((o) => o.correct)?.label
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
      )}
      <div className={pane ? 'flex-1 min-h-0 overflow-y-auto' : ''}>
        <QuestionCard q={q} qIdx={idx} lesson={lesson} st={st} />
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
function ScriptAccordion({ lesson, st, only }: { lesson: TypeLesson; st: ContentState; only?: SentenceItem[] }) {
  const script = only ?? lesson.content.audioScript ?? []
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
      <button
        onClick={() => setOpen((v) => {
          /* LC 실전에서 **스크립트를 실제로 펼쳐 보는가** — 채점 뒤 해설을 읽는지 판단하는 근거 */
          if (!v) track('script_opened', { lecture: lesson.id, part: lesson.part, stage: st.selfAudio ? 'practice' : 'lesson' })
          return !v
        })}
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
                      s.speaker.startsWith('W') ? 'bg-[#FCE7F3] text-[#DB2777]' : 'bg-[#DBEAFE] text-[#2563EB]'
                    }`}>{/* DB 화자는 교재 태그(W-Am·M-Cn…)라 성별 글자만 뽑아 쓴다 — 억양은 목소리로 들린다 */}
                      {s.speaker[0]}</span>
                  )}
                  <p className="text-[13px] md:text-[14px] text-[#334155] leading-relaxed flex-1">
                    <TapText text={s.en} st={st} scope={s.id} />
                  </p>
                  {/* 문장 재생은 별도 버튼 — 문장 안의 단어 탭은 형광펜이라 클릭 대상이 겹치면 안 된다 */}
                  {st.onPlaySentence && (
                    <button onClick={playThis} aria-label="이 문장 듣기"
                      className={`shrink-0 self-start mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                        playing ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-[#DBEAFE] bg-white text-[#2563EB] hover:bg-[#EFF6FF]'
                      }`}>
                      <SpeakerIcon pulse={playing} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── 시각자료(표) — LC 표/자료형(Part 3·4의 "Look at the graphic") ──
   실물 시험지도 지문과 같은 조판이다: 검은 실선 박스 + 가운데 세리프 볼드 제목 + 검은 실선 표.
   RC 지문과 같은 ExamTable 을 쓴다 — 한 시험지 안에서 표만 다른 톤이면 그게 더 튄다. */
function VisualTable({ visual }: { visual: NonNullable<TypeLessonContent['visual']> }) {
  return (
    <div className="mx-auto max-w-[560px] border-[1.5px] border-[#111] bg-white px-3 py-3 md:px-4 md:py-4">
      {visual.title && (
        <p className="text-center font-exam-serif font-bold text-[15px] md:text-[17px] text-[#111] mb-2 tracking-wide">
          {visual.title}
        </p>
      )}
      <ExamTable table={visual.table} />
    </div>
  )
}

function VisualPanel({ lesson }: { lesson: TypeLesson }) {
  const v = lesson.content.visual
  if (!v) return null
  return <VisualTable visual={v} />
}

/* ── 세트 음원 버튼 (P3·P4 실전) ──
   음원 하나가 문항 셋을 덮으므로 세트 머리에 하나만 둔다. `qaudio:<세트 첫 문항>` 으로 부르면
   실전 듣기 한 판(담화 → 문항 읽어주기 → 답할 시간)이 그 세트 범위 안에서 돈다. */
function SetAudioButton({ kind, st, from, to }: { kind: string; st: ContentState; from: number; to: number }) {
  const id = `qaudio:${from}`
  const left = st.playsLeft ? st.playsLeft(id) : Infinity
  const out = left <= 0
  /* 다른 세트가 재생 중일 때 이 버튼까지 '재생 중' 이 되면 안 된다 — 지금 짚는 문항이 내 범위인지로 가른다.
     담화가 나가는 동안엔 아직 짚는 문항이 없다(focusQ 없음) → 그때는 '남은 횟수를 쓴 세트' 가 나다. */
    const mine = st.focusQ !== undefined ? (st.focusQ >= from && st.focusQ < to) : out
  const playing = !!st.playingId && mine
  return (
    <button type="button" disabled={out} onClick={() => st.onPlaySentence?.(id, '')}
      aria-label={`${kind} 음원 듣기`}
      className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
        playing ? 'border-[#93C5FD] bg-[#EFF6FF]'
          : out ? 'border-[#EEF0F4] bg-white cursor-not-allowed'
            : 'border-[#BFDBFE] bg-white hover:border-[#93C5FD] hover:bg-[#F8FAFF]'
      }`}>
      <span aria-hidden className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
        playing ? 'bg-[#2563EB] text-white animate-pulse'
          : out ? 'bg-[#F1F3F7] text-[#C4C9D4]' : 'bg-[#EFF6FF] text-[#2563EB]'
      }`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className={`block text-[13px] font-bold ${out ? 'text-[#C4C9D4]' : playing ? 'text-[#2563EB]' : 'text-[#1C1B33]'}`}>
          {out ? '재생 완료' : playing ? '재생 중…' : `${kind} 듣기 (1회)`}
        </span>
        <span className="block text-[11px] text-[#9CA3AF] mt-0.5">{kind}를 듣고 이어지는 문항에 답하세요</span>
      </span>
    </button>
  )
}

/* 지문 탭에 붙는 이름 (시험지 스킨은 아래 ExamDoc/ExamEmail/ExamPhone/ExamWeb 가 그린다) */
const KIND_LABEL: Record<PassageDoc['kind'], string> = {
  text: '지문', email: '이메일', notice: '공지', ad: '광고', article: '기사', chat: '문자 대화', table: '표', form: '양식',
  // LC 스크립트 (Part 2·3·4) — 화면은 아직 미지원이지만 라벨은 타입상 있어야 한다
  utterance: '질문 발화', dialogue: '대화 스크립트', talk: '담화 스크립트',
}

/* ══ 시험지 스킨 ══════════════════════════════════════════════════════════
   실제 시험지(YBM 실전토익 본권)의 지문 조판을 그대로 옮긴다. **글자는 살아 있어야 한다** —
   단어 탭 형광펜, 근거 문장 탭, 강사의 문장 지목, 빈칸 포커스가 전부 텍스트 노드에 걸려 있어서
   지문을 캡처 이미지로 넣으면 수업(스캐폴딩)이 통째로 죽는다. 그래서 사진이 아니라 CSS로 재현한다.

   조판 규칙(실물 기준)
     · 정보·공지·기사·광고 = 흰 종이 박스 + 검은 테두리, 본문 세리프, 제목은 가운데 세리프 볼드
     · 이메일   = 회색 판 + 타이틀바 + 회색 라벨칸/흰 값칸 + 본문 흰 박스 + 가짜 스크롤바
     · 문자     = 폰 프레임 + 회색 화면 + 흰 각진 말풍선, 산세리프, 화자별 좌/우 정렬
     · 웹페이지 = 브라우저 크롬(주소창·점 3개·스크롤 레일), 산세리프
     · Part 6 장문 = 산세리프 + 넓은 줄간 (빈칸을 채우는 지문이라 줄 사이가 떠 있다)
   ══════════════════════════════════════════════════════════════════════ */

/** 지문 문장 하나 — 인라인으로 흐른다(실제 지문은 문단이지 줄 목록이 아니다).
 *  재생 중 표시·근거 선택은 문장 단위라 span 하나씩은 유지한다. */
function SentenceSpan({ s, st, focusBlank, docId }: { s: SentenceItem; st: ContentState; focusBlank?: number; docId?: string }) {
  const playing = st.playingId === s.id
  const match = st.matchState
  const matched = !!docId && !!match?.matchedTargets.has(`${docId}:${s.id}`)
  return (
    <span
      onClick={match && docId ? () => match.onTap(docId, s.id) : undefined}
      className={`[box-decoration-break:clone] rounded-[2px] transition-colors ${playing ? 'bg-[#EFF6FF]' : ''} ${
        match && docId ? 'cursor-pointer' : ''
      } ${matched ? 'bg-[#F0FDF4] ring-1 ring-[#86EFAC]' : ''}`}>
      {matched && <span className="mr-0.5 text-[#16A34A] font-black">✓</span>}
      <SentenceText text={s.en} st={st} focusBlank={focusBlank} scope={s.id} />{' '}
    </span>
  )
}

/** 지문 본문 — 문장들을 한 문단으로 흘린다. 해석(showKo)은 문단 아래 회색 덩어리로. */
function ExamBody({ doc, st, focusBlank, sans }: {
  doc: PassageDoc; st: ContentState; focusBlank?: number; sans?: boolean
}) {
  const ss = doc.sentences ?? []
  if (!ss.length) return null
  return (
    <>
      <p className={`text-[#111] ${sans
        ? 'font-exam-sans text-[13px] md:text-[14.5px] leading-[2.3]'
        : 'font-exam-serif text-[14px] md:text-[16px] leading-[1.75]'}`}>
        {ss.map((s) => <SentenceSpan key={s.id} s={s} st={st} focusBlank={focusBlank} docId={doc.id} />)}
      </p>
      {st.showKo && ss.some((s) => s.ko) && (
        <p className="mt-2 pt-2 border-t border-dashed border-[#D4D4D4] text-[11.5px] leading-relaxed text-[#7A7A7A]">
          {ss.map((s) => s.ko).filter(Boolean).join(' ')}
        </p>
      )}
    </>
  )
}

/** 이메일·웹 본문 오른쪽 가짜 스크롤바 — 실물의 그 회색 레일 */
function ScrollRail() {
  const box = 'w-[13px] h-[13px] border border-[#111] bg-[#D9D9D9] flex items-center justify-center text-[7px] text-[#333] leading-none'
  return (
    <div className="shrink-0 w-[15px] border-l border-[#111] bg-[#EDEDED] flex flex-col justify-between items-center py-[1px]">
      <span className={box}>▲</span>
      <span className={box}>▼</span>
    </div>
  )
}

/** 머리글 한 줄(To/From/…) — 근거 연결(match)에서 탭 대상이 되기도 한다 */
function MetaRow({ doc, m, st }: { doc: PassageDoc; m: { k: string; v: string }; st: ContentState }) {
  const targetId = `meta:${m.k}`
  const matched = st.matchState?.matchedTargets.has(`${doc.id}:${targetId}`)
  return (
    <div className="flex items-stretch gap-[5px]">
      <div className="w-[92px] md:w-[112px] shrink-0 bg-[#C6C6C6] border border-[#111] px-2 py-[3px]
                      font-exam-sans font-black text-[11px] md:text-[12px] text-[#111]">
        {m.k}{m.k.endsWith(':') ? '' : ':'}
      </div>
      <div
        onClick={st.matchState ? () => st.matchState!.onTap(doc.id, targetId) : undefined}
        className={`flex-1 min-w-0 border border-[#111] px-2 py-[3px] font-exam-serif text-[13px] md:text-[14.5px] text-[#111] truncate ${
          st.matchState ? 'cursor-pointer' : ''
        } ${matched ? 'bg-[#F0FDF4] ring-1 ring-inset ring-[#86EFAC]' : 'bg-white'}`}>
        {matched && <span className="mr-1 text-[#16A34A] font-black">✓</span>}{m.v}
      </div>
    </div>
  )
}

/** 머리글을 본문 위에 평문으로 (웹·공지 등 — 라벨 박스를 쓰지 않는 포맷) */
function MetaLines({ doc, st, sans }: { doc: PassageDoc; st: ContentState; sans?: boolean }) {
  if (!doc.meta?.length) return null
  return (
    <div className="mb-2.5 space-y-0.5">
      {doc.meta.map((m) => {
        const targetId = `meta:${m.k}`
        const matched = st.matchState?.matchedTargets.has(`${doc.id}:${targetId}`)
        return (
          <p key={m.k}
            onClick={st.matchState ? () => st.matchState!.onTap(doc.id, targetId) : undefined}
            className={`${sans ? 'font-exam-sans text-[12.5px] md:text-[13.5px]' : 'font-exam-serif text-[13px] md:text-[14.5px]'} text-[#111] ${
              st.matchState ? 'cursor-pointer' : ''
            } ${matched ? 'bg-[#F0FDF4] ring-1 ring-[#86EFAC] rounded-[2px]' : ''}`}>
            {matched && <span className="mr-1 text-[#16A34A] font-black">✓</span>}
            <span className="font-bold">{m.k}{m.k.endsWith(':') ? '' : ':'} </span>{m.v}
          </p>
        )
      })}
    </div>
  )
}

/* 시험지 표 — 검은 실선 */
function ExamTable({ table, docId, st }: { table: { headers: string[]; rows: string[][] }; docId?: string; st?: ContentState }) {
  const active = !!(docId && st?.matchState)
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-exam-serif text-[13px] md:text-[14.5px] text-[#111]">
        {table.headers.some(Boolean) && (
          <thead>
            <tr>
              {table.headers.map((h) => (
                <th key={h} className="border border-[#111] bg-[#EDEDED] px-2.5 py-1.5 text-left font-bold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((r, i) => {
            const targetId = `row:${i}`
            const matched = active && st!.matchState!.matchedTargets.has(`${docId}:${targetId}`)
            return (
              <tr key={i}
                onClick={active ? () => st!.matchState!.onTap(docId!, targetId) : undefined}
                className={`${active ? 'cursor-pointer' : ''} ${matched ? 'bg-[#F0FDF4]' : active ? 'hover:bg-[#EFF6FF]' : ''}`}>
                {r.map((c, j) => (
                  <td key={j} className="border border-[#111] px-2.5 py-1.5 align-top">
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

/* 이메일 — 회색 판 위에 얹힌 메일 클라이언트 */
function ExamEmail({ doc, st }: { doc: PassageDoc; st: ContentState }) {
  return (
    <div className="border-[1.5px] border-[#111] bg-[#D6D6D6] p-2 md:p-2.5">
      {/* 타이틀 바 — 가운데 제목, 양옆 가로선 장식 */}
      <div className="flex items-center gap-2 pb-2">
        <span className="flex-1 h-[7px] border-t-[3px] border-b border-[#8A8A8A]" />
        <span className="font-exam-sans font-bold text-[12px] md:text-[13.5px] text-[#111] whitespace-nowrap">
          {doc.title ?? '*E-Mail*'}
        </span>
        <span className="flex-1 h-[7px] border-t-[3px] border-b border-[#8A8A8A]" />
      </div>
      <div className="space-y-[4px]">
        {doc.meta?.map((m) => <MetaRow key={m.k} doc={doc} m={m} st={st} />)}
      </div>
      <div className="mt-2 flex bg-white border border-[#111] min-h-[120px]">
        <div className="flex-1 min-w-0 px-3 py-2.5 md:px-4 md:py-3.5">
          <ExamBody doc={doc} st={st} />
        </div>
        <ScrollRail />
      </div>
    </div>
  )
}

/* 웹페이지 — 브라우저 크롬(주소창 + 점 3개 + 스크롤 레일) */
function ExamWeb({ doc, st, url }: { doc: PassageDoc; st: ContentState; url: string }) {
  const rest = { ...doc, meta: doc.meta?.filter((m) => !/url|http|주소/i.test(m.k) && !/^https?:\/\//i.test(m.v)) }
  return (
    <div className="border-[1.5px] border-[#111] bg-[#D6D6D6]">
      <div className="flex items-center gap-2 px-2 py-2">
        <span className="shrink-0 font-exam-sans text-[11px] text-[#111] tracking-tighter">◀▶</span>
        <span className="flex-1 min-w-0 bg-white border border-[#111] px-2 py-[3px] font-exam-sans text-[12px] md:text-[13px] text-[#111] truncate">
          {url}
        </span>
        <span className="shrink-0 flex items-center gap-[3px] pl-1">
          {[0, 1, 2].map((i) => <span key={i} className="w-[5px] h-[5px] rounded-full bg-[#111]" />)}
        </span>
      </div>
      <div className="flex bg-white border-t border-[#111]">
        <div className="flex-1 min-w-0 px-3 py-3 md:px-4">
          <MetaLines doc={rest} st={st} sans />
          {doc.table && <ExamTable table={doc.table} docId={doc.id} st={st} />}
          <ExamBody doc={doc} st={st} sans />
        </div>
        <ScrollRail />
      </div>
    </div>
  )
}

/* 문자 대화 — 폰 프레임 + 회색 화면 + 흰 각진 말풍선 */
function ExamPhone({ doc, st }: { doc: PassageDoc; st: ContentState }) {
  const first = doc.chat?.[0]?.speaker
  return (
    <div className="mx-auto max-w-[520px] rounded-[26px] border-[3px] border-[#111] bg-white p-3">
      {/* 상단 장식 — 실물의 봉투/말풍선 탭과 점 두 개 */}
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className="w-9 h-6 border-[1.5px] border-[#111] rounded-t-[4px] flex items-center justify-center text-[10px] leading-none">✉</span>
        <span className="w-9 h-6 border-[1.5px] border-b-0 border-[#111] rounded-t-[10px] bg-[#D6D6D6]" />
        <span className="flex-1" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#111]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#111]" />
      </div>
      <div className="rounded-[10px] bg-[#C9C9C9] p-2.5 md:p-3 space-y-2">
        {doc.chat?.map((c) => {
          const right = !!first && c.speaker !== first
          const matched = st.matchState?.matchedTargets.has(`${doc.id}:${c.id}`)
          return (
            <div key={c.id} className={`flex ${right ? 'justify-end' : 'justify-start'}`}>
              <div
                onClick={st.matchState ? () => st.matchState!.onTap(doc.id, c.id) : undefined}
                className={`max-w-[84%] bg-white border border-[#111] rounded-[3px] px-2.5 py-1.5 ${
                  st.matchState ? 'cursor-pointer' : ''
                } ${matched ? 'ring-2 ring-[#86EFAC]' : ''}`}>
                <p className="font-exam-sans text-[12px] md:text-[13px] font-bold text-[#111] mb-0.5">
                  {matched && <span className="mr-1 text-[#16A34A]">✓</span>}
                  {c.speaker}
                  {c.time && <span className="ml-1.5">[{c.time}]</span>}
                </p>
                <p className="font-exam-sans text-[12.5px] md:text-[13.5px] text-[#111] leading-[1.6]">
                  <TapText text={c.text} st={st} scope={c.id} />
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* 정보·공지·기사·광고·양식 — 흰 종이 박스. Part 6 장문은 산세리프 + 넓은 줄간 */
function ExamDoc({ doc, st, focusBlank, sans }: {
  doc: PassageDoc; st: ContentState; focusBlank?: number; sans?: boolean
}) {
  return (
    <div className="border-[1.5px] border-[#111] bg-white px-4 py-4 md:px-6 md:py-5">
      {doc.title && (
        <p className={`text-center font-bold text-[#111] mb-2.5 ${
          sans ? 'font-exam-sans text-[14px] md:text-[15px]' : 'font-exam-serif text-[16px] md:text-[19px]'}`}>
          {doc.title}
        </p>
      )}
      <MetaLines doc={doc} st={st} sans={sans} />
      {doc.table && <ExamTable table={doc.table} docId={doc.id} st={st} />}
      {doc.table && !!doc.sentences?.length && <div className="h-2.5" />}
      <ExamBody doc={doc} st={st} focusBlank={focusBlank} sans={sans} />
    </div>
  )
}

function PassageView({ doc, lesson, st, focusBlank }: { doc: PassageDoc; lesson: TypeLesson; st: ContentState; focusBlank?: number }) {
  /* Part 6 장문은 빈칸을 채우는 지문이라 실물도 산세리프에 줄 사이가 떠 있다 */
  const sans = lesson.part === 6 || focusBlank !== undefined
  /* 웹페이지는 별도 kind가 없다 — 머리글에 주소가 있으면 브라우저 크롬으로 본다 */
  const urlMeta = doc.meta?.find((m) => /url|http|주소/i.test(m.k) || /^https?:\/\//i.test(m.v))

  if (doc.chat?.length) return <ExamPhone doc={doc} st={st} />
  if (doc.kind === 'email') return <ExamEmail doc={doc} st={st} />
  if (urlMeta) return <ExamWeb doc={doc} st={st} url={urlMeta.v} />
  return <ExamDoc doc={doc} st={st} focusBlank={focusBlank} sans={sans} />
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
            <button key={d.id}
              onClick={() => {
                /* 이중·삼중 지문을 실제로 **오가며** 푸는가 — 연계 문항의 핵심 행동이다.
                   한 번도 안 넘겼다면 두 번째 지문을 아예 안 봤다는 뜻이다. */
                if (active !== i) track('passage_tab_switched', { lecture: lesson.id, part: lesson.part, to: i + 1, of: docs.length })
                setActive(i)
              }}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                active === i ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#93C5FD]'
              }`}>
              {pending && <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse shrink-0" />}
              {d.label ?? KIND_LABEL[d.kind] ?? `지문 ${i + 1}`}
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

/* 재생 중 이퀄라이저 한 줄 — 음원이 나오는 자리(질문 카드·보기)에 직접 붙는다 */
function EqLine({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2 text-[12px] font-bold text-[#2563EB]">
      <span className="flex items-end gap-[2px] h-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="w-[2.5px] h-full rounded-full bg-[#2563EB] origin-bottom animate-eq" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </span>
      {label}
    </span>
  )
}

/* ── P2 질문 카드 — 질문 음원이 여기서 재생되고, 재생 표시도 여기 뜬다 ── */
function Part2View({ lesson, st, children }: { lesson: TypeLesson; st: ContentState; children: ReactNode }) {
  /* P2 는 audioScript[i] ↔ 문항 i 다. 예전엔 **항상 [0]** 을 재생해서, 문항이 여러 개인 강의에서는
     2·3번 문항에서도 1번 질문이 나갔다. 지금 다루는 문항(focusQ)의 발화를 쓴다. */
  const qIdx = st.focusQ ?? 0
  const q1 = lesson.content.audioScript?.[qIdx] ?? lesson.content.audioScript?.[0]
  const qRevealed = !!q1 && (st.revealedScript === 'all' || st.revealedScript.has(q1.id))
  /* 실전에서는 질문만이 아니라 보기까지 이어서 나간다 — 그 동안 내내 "재생 중"이어야 한다 */
  const playing = st.playingId === q1?.id
    || (!!st.selfAudio && (st.playingId === `qaudio:${qIdx}` || !!st.playingId?.startsWith(`opt:${qIdx}:`)))

  /* ── 이 카드가 곧 [음원 듣기] 버튼이다 ──
     실전에서 하단에 따로 버튼을 두면, 소리가 나는 곳(이 카드)과 트는 곳(하단 바)이 갈라져
     학생이 어디를 봐야 할지 모른다. `qaudio:` 로 부르면 실전 듣기 한 판(질문 → 보기 → 카운트다운)이 돈다. */
  const left = st.selfAudio && st.playsLeft ? st.playsLeft(`qaudio:${qIdx}`) : Infinity
  const out = left <= 0
  const playQ = () => {
    if (!q1) return
    if (st.selfAudio) { if (!out) st.onPlaySentence?.(`qaudio:${qIdx}`, q1.en) }
    else st.onPlaySentence?.(q1.id, q1.en)
  }

  return (
    <div className="max-w-[560px] mx-auto space-y-4">
      {/* 문제 번호 — 파트2는 시험지에 지문이 없어 번호가 유일한 위치 표시다.
          실전은 시험지 문구를 그대로 적는다("Mark your answer on your answer sheet."). */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-[12px] font-black flex items-center justify-center">Q{qIdx + 1}</span>
        {st.selfAudio && (
          <span className="text-[12px] font-medium text-[#9CA3AF] truncate">Mark your answer on your answer sheet.</span>
        )}
      </div>
      <button type="button" onClick={playQ} disabled={out}
        aria-label={st.selfAudio ? '음원 듣기' : '질문 음원 재생'}
        className={`w-full rounded-2xl border px-5 py-6 flex flex-col items-center gap-2.5 transition-colors ${
          playing ? 'border-[#93C5FD] bg-[#EFF6FF]'
            : out ? 'border-[#EEF0F4] bg-[#FAFAFA] cursor-not-allowed'
              : 'border-[#E5E7EB] bg-white hover:border-[#93C5FD] hover:bg-[#F8FAFF]'
        }`}>
        <span aria-hidden
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            playing ? 'bg-[#2563EB] text-white animate-pulse'
              : out ? 'bg-[#F1F3F7] text-[#C4C9D4]' : 'bg-[#EFF6FF] text-[#2563EB]'
          }`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </span>
        {qRevealed && q1 ? (
          <span className="text-[15px] font-semibold text-[#1C1B33] text-center leading-relaxed"><TapText text={q1.en} st={st} scope={q1.id} /></span>
        ) : playing ? (
          /* 재생 표시가 사는 자리 — 예전엔 강사 창에 별도 재생 바가 떴는데, 소리가 나는 곳과
             표시가 나는 곳이 달라 어디를 봐야 할지 알 수 없었다. 음원은 여기서 나온다. */
          <EqLine label={st.selfAudio ? '재생 중' : '질문 음성 재생 중'} />
        ) : (
          <span className={`text-[13px] font-medium ${out ? 'text-[#C4C9D4]' : 'text-[#9CA3AF]'}`}>
            {st.selfAudio ? (out ? '재생 완료' : '눌러서 음원 듣기 (1회)') : '질문은 음성으로 나와요'}
          </span>
        )}
      </button>
      {children}
    </div>
  )
}

/* ── 좌우 2분할 + 드래그 리사이즈 (지문 | 문항) ──
   가운데 핸들을 끌어 비율을 바꾼다. 지문이 긴 세트는 지문을 넓히고, 보기를 훑을 땐 반대로 —
   실제 시험지처럼 학생이 직접 폭을 정하게 한다.
   좁은 화면(<lg)에서는 가로로 쪼갤 폭이 없어 위/아래 스택으로 떨어지고 핸들은 숨는다. */
function SplitPane({ left, right, initial = 0.55 }: { left: ReactNode; right: ReactNode; initial?: number }) {
  const [frac, setFrac] = useState(initial)
  /* 끄는 동안엔 텍스트가 드래그 선택되지 않게 — 단어 탭(형광펜)과 겹쳐 보이면 지저분하다 */
  const [dragging, setDragging] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const onDown = (e: ReactPointerEvent) => {
    setDragging(true)
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onMove = (e: ReactPointerEvent) => {
    if (!dragging || !wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    setFrac(Math.min(0.78, Math.max(0.25, (e.clientX - r.left) / r.width)))
  }
  const onUp = () => setDragging(false)

  return (
    <div ref={wrapRef} className={`h-full min-h-0 flex flex-col lg:flex-row ${dragging ? 'select-none' : ''}`}>
      <div className="min-h-0 min-w-0 flex-1 lg:flex-none lg:w-[var(--pf)] flex flex-col"
        style={{ ['--pf' as string]: `${frac * 100}%` }}>
        {left}
      </div>
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        role="separator" aria-orientation="vertical" aria-label="지문·문항 영역 크기 조절"
        className={`hidden lg:flex w-3 shrink-0 items-center justify-center cursor-col-resize touch-none
                   rounded-full mx-1 transition-colors group ${dragging ? 'bg-[#EFF6FF]' : 'hover:bg-[#EFF6FF]'}`}>
        <div className={`h-10 w-[3px] rounded-full transition-colors ${dragging ? 'bg-[#2563EB]' : 'bg-[#D9DEE7] group-hover:bg-[#93C5FD]'}`} />
      </div>
      <div className="min-h-0 min-w-0 flex-1 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-3">
        {right}
      </div>
    </div>
  )
}

/* ── 위/아래 2분할 + 드래그 리사이즈 (지문 위 · 문항 아래) ──
   SplitPane 의 세로판. 지문을 길게 보고 싶으면 손잡이를 내리고, 보기를 훑을 땐 올린다.
   RC 수업은 강사 창이 오른쪽 기둥을 먹어 콘텐츠가 좁고 높은 칸이 되므로, 이 비율이 특히 중요하다. */
function StackPane({ top, bottom, initial = 0.6 }: { top: ReactNode; bottom: ReactNode; initial?: number }) {
  const [frac, setFrac] = useState(initial)
  const [dragging, setDragging] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const onDown = (e: ReactPointerEvent) => {
    setDragging(true)
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onMove = (e: ReactPointerEvent) => {
    if (!dragging || !wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    setFrac(Math.min(0.8, Math.max(0.2, (e.clientY - r.top) / r.height)))
  }
  const onUp = () => setDragging(false)

  return (
    <div ref={wrapRef} className={`h-full min-h-0 flex flex-col ${dragging ? 'select-none' : ''}`}>
      <div className="min-h-0 flex flex-col" style={{ height: `${frac * 100}%` }}>{top}</div>
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        role="separator" aria-orientation="horizontal" aria-label="지문·문항 영역 크기 조절"
        className={`h-3 shrink-0 flex items-center justify-center cursor-row-resize touch-none
                   rounded-full my-1 transition-colors group ${dragging ? 'bg-[#EFF6FF]' : 'hover:bg-[#EFF6FF]'}`}>
        <div className={`w-10 h-[3px] rounded-full transition-colors ${dragging ? 'bg-[#2563EB]' : 'bg-[#D9DEE7] group-hover:bg-[#93C5FD]'}`} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col border-t border-gray-100 pt-2">{bottom}</div>
    </div>
  )
}

/* ── 메인: 파트별 레이아웃 ──
   readingSideBySide=true면 읽기 파트(P6·P7)를 지문(좌)/문항(우) 가로 2열로 — 사이 핸들로 폭 조절.
   강사 패널이 하단 도크로 내려가 위쪽 콘텐츠가 넓고 낮은 가로 공간이 될 때, 그리고 강사 없이
   문제만 나오는 실전 단계에서 쓴다. 기본(우측 패널)은 세로 스택. */
export default function ContentView({ lesson, st, readingSideBySide = false }: { lesson: TypeLesson; st: ContentState; readingSideBySide?: boolean }) {
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
        qInView(st, i) ? <QuestionCard key={i} q={q} qIdx={i} lesson={lesson} st={st} /> : null
      ))}
    </div>
  )

  /* P1 — 사진 위 · 보기 아래 (실제 파트1엔 문제 지문이 없어 보기만 표시)
     실전은 문항마다 사진이 달라서 사진+보기를 한 쌍씩 쌓는다. */
  if (part === 1) {
    if (content.questions.length > 1) {
      return (
        <div className="flex flex-col gap-6 max-w-[620px] mx-auto">
          {content.questions.map((q, i) => (
            !qInView(st, i) ? null : <div key={i} className="flex flex-col gap-3">
              {/* 실전은 시험지를 그대로 따른다 — Part 1 은 **문항마다 지시문이 없다.**
                  영문 Directions 가 첫 문항 위에 한 번만 인쇄되고, 그 뒤로는 번호와 사진뿐이다.
                  (수업은 학습 안내가 필요하니 한국어 한 줄을 그대로 둔다) */}
              {st.selfAudio && i === 0 && (
                <p className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#6B7280]">
                  <span className="font-bold text-[#1C1B33]">Directions:</span> For each question in this part, you will hear
                  four statements about a picture in your test book. When you hear the statements, you must select the one
                  statement that best describes what you see in the picture. Then find the number of the question on your
                  answer sheet and mark your answer. The statements will not be printed in your test book and will be
                  spoken only one time.
                </p>
              )}
              <div className="flex items-center gap-2">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-[12px] font-black flex items-center justify-center">Q{i + 1}</span>
                {st.selfAudio
                  ? <span className="flex-1 min-w-0" />
                  : <span className="text-[12px] font-bold text-[#6B7280] flex-1 min-w-0">사진을 가장 잘 묘사한 보기를 고르세요</span>}
                {/* 음원 듣기 버튼은 **실전에서만**. 수업에서는 강사가 틀어주고,
                    나가는 동안에는 아래 보기가 파랗게 켜져 재생 중임을 알린다. */}
                {q.audio && st.selfAudio && st.onPlaySentence && (() => {
                  /* 실전 음원은 시험처럼 횟수가 정해져 있다(2회). 남은 횟수를 버튼에 적고, 다 쓰면 잠근다 */
                  const left = st.playsLeft ? st.playsLeft(`qaudio:${i}`) : Infinity
                  const playing = st.playingId === `qaudio:${i}`
                  const out = left <= 0
                  return (
                    <button disabled={out}
                      onClick={() => st.onPlaySentence?.(`qaudio:${i}`, q.options.map((o) => `${o.label}. ${o.text}`).join(' '))}
                      className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold rounded-lg border px-2.5 py-1.5 transition-colors ${
                        out ? 'border-[#EEF0F4] bg-[#FAFAFA] text-[#C4C9D4] cursor-not-allowed'
                          : playing ? 'border-[#2563EB] bg-[#2563EB] text-white'
                            : 'border-[#BFDBFE] bg-white text-[#2563EB] hover:bg-[#EFF6FF]'
                      }`}>
                      <SpeakerIcon pulse={playing} />
                      {out ? '재생 완료' : playing ? '재생 중…' : `음원 듣기${Number.isFinite(left) ? ` (${left}회 남음)` : ''}`}
                    </button>
                  )
                })()}
                {/* 수업 — 버튼 없이 "지금 여기서 소리가 난다"만 */}
                {!st.selfAudio && st.playingId === `qaudio:${i}` && (
                  <span className="shrink-0 flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-1 text-[10px] font-black text-[#2563EB]">
                    <SpeakerIcon pulse /> 재생 중
                  </span>
                )}
              </div>
              {(q.photo ?? content.photo) && (
                /* 장당 높이를 묶어 한 쌍(사진+보기)이 화면 안에 들어오게 한다.
                   실전(selfAudio)은 페이저로 한 문항씩 넘기므로 사진이 세로로 쌓이지 않는다 → 더 크게 본다.
                   수업은 여러 문항이 이어서 보일 수 있어 그대로 둔다.
                   object-contain — 파트1은 사진 구석의 사물이 정답 근거라 잘라내면 안 된다. */
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.photo ?? content.photo} alt={`문제 ${i + 1} 사진`}
                  className={`w-full ${st.selfAudio ? 'max-h-[46vh]' : 'max-h-[34vh]'} rounded-2xl border border-[#E5E7EB] object-contain bg-[#F8FAFC]`} />
              )}
              <QuestionCard q={q} qIdx={i} lesson={lesson} st={st} />
            </div>
          ))}
        </div>
      )
    }
    /* 수업(문항 1개) — 사진과 보기가 **스크롤 없이 한 화면**에 들어와야 한다.
       파트1은 사진을 보면서 보기를 하나씩 지워나가는 수업이라, 둘 중 하나가 화면 밖으로
       나가면 수업 자체가 성립하지 않는다.
       그래서 부모가 준 높이를 세로로 나눠 쓴다 — 보기는 shrink-0으로 항상 온전히 두고,
       사진이 남는 높이를 전부 먹는다(P6·P7이 지문/문항을 나누는 방식과 같다).
       사진은 object-contain — 구석의 사물이 정답 근거라 잘라내면 안 된다. */
    return (
      <div className="h-full min-h-0 flex flex-col gap-4 max-w-[620px] mx-auto">
        {content.photo && (
          <div className="flex-1 min-h-[120px] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={content.photo} alt="문제 사진"
              className="max-h-full max-w-full rounded-2xl border border-[#E5E7EB] object-contain" />
          </div>
        )}
        <div className="shrink-0 min-w-0 overflow-y-auto">{questionsBlock}</div>
      </div>
    )
  }

  /* P2 — 음성 질문 카드 + 보기 */
  if (part === 2) {
    return <Part2View lesson={lesson} st={st}>{questionsBlock}</Part2View>
  }

  /* P3·P4 — 시각자료 + 문항 (스크립트는 각 문항 아래 아코디언) */
  if (part === 3 || part === 4) {
    const kind = part === 3 ? '대화' : '담화'
    /* ── 실전 = 세트 나열 ──
       실제 시험지는 한 세트의 세 문항이 한 페이지에 나란히 인쇄되고, 세트가 아래로 이어진다.
       학생은 담화를 들으며 그 세트의 셋을 눈으로 훑는다 — 한 문항씩 넘기면 실전이 안 된다.
       그래서 실전에서는 탭/페이저 대신 세트마다 상자를 하나씩 놓고 통째로 편다.
       세트 정보가 없으면(옛 데이터·수업) 전체를 한 세트로 본다. */
    const sets = content.sets ?? [{ script: content.audioScript ?? [], visual: content.visual, from: 0, to: content.questions.length }]
    if (st.selfAudio && content.questions.length > 1) {
      return (
        <div className="space-y-5">
          {/* 넘기는 단위가 세트라 지금 세트만 그린다 — 9문항을 한 화면에 이어 붙이면 스크롤만 길다 */}
          {sets.map((set, si) => !qInView(st, set.from) ? null : (
            <div key={si} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 md:p-4 space-y-3">
              <div className="flex items-center gap-2 px-1">
                {sets.length > 1 && (
                  <span className="shrink-0 text-[11px] font-black px-2 py-0.5 rounded-md bg-[#1C1B33] text-white">세트 {si + 1}/{sets.length}</span>
                )}
                <span className="shrink-0 text-[11px] font-black px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB]">
                  Questions {set.from + 1}–{set.to}
                </span>
                <span className="text-[11px] text-[#9CA3AF] truncate">한 {kind}에 딸린 {set.to - set.from}문항입니다</span>
              </div>

              {/* 세트 음원 — '이 문항의 음원' 이 없으므로 세트 머리에서 한 번 튼다.
                  누르면 대화/담화 → 문항 읽어주기 → 답할 시간이 그 세트 안에서 이어진다. */}
              <SetAudioButton kind={kind} st={st} from={set.from} to={set.to} />

              {/* 스크립트는 **세트에 하나**다 — 세 문항이 같은 대화를 본다. 그리고 푸는 동안에는
                  아예 내보내지 않는다(잠금 안내조차 미끼가 된다). 채점하면 여기서 열린다. */}
              {st.graded.size > 0 && <ScriptAccordion lesson={lesson} st={st} only={set.script ?? []} />}

              {set.visual && <VisualTable visual={set.visual} />}

              <div className="space-y-2.5">
                {content.questions.slice(set.from, set.to).map((q, k) => (
                  <QuestionCard key={set.from + k} q={q} qIdx={set.from + k} lesson={lesson} st={st} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <VisualPanel lesson={lesson} />
        {questionsBlock}
      </div>
    )
  }

  /* P5 — 문장 카드 + 보기. 실전은 문항마다 문장이 따로라 한 쌍씩 쌓는다(문장 i ↔ 문항 i) */
  if (part === 5) {
    /* 문항 i ↔ 문장 i 로 짝짓는다. 지문이 어떤 모양이든 맞게 **전부 펼쳐서** 센다:
         · 아이템 순회(STEP 4) — 아이템마다 지문 1개 × 문장 1개  → [s1][s2][s3]
         · 예전 실전 세트      — 지문 1개 안에 문장 N개          → [s1,s2,s3]
       예전에는 passages[0] 만 봐서, 아이템 순회로 바뀐 뒤 **2번째 문항부터 문장이 안 나왔다.** */
    const sentences = (content.passages ?? []).flatMap((p) => p.sentences ?? [])
    const SentenceCard = ({ text }: { text: string }) => (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-6">
        <p className="text-[15px] md:text-[16px] text-[#1C1B33] leading-[2.1] text-center">
          <SentenceText text={text} st={st} focusBlank={focusBlank} scope="p5" />
        </p>
      </div>
    )
    if (content.questions.length > 1) {
      return (
        <div className="max-w-[560px] mx-auto space-y-6">
          {content.questions.map((q, i) => (
            !qInView(st, i) ? null : <div key={i} className="space-y-3">
              {sentences[i] && <SentenceCard text={sentences[i].en} />}
              <QuestionCard q={q} qIdx={i} lesson={lesson} st={st} />
            </div>
          ))}
        </div>
      )
    }
    return (
      <div className="max-w-[560px] mx-auto space-y-4">
        {sentences[0] && <SentenceCard text={sentences[0].en} />}
        {questionsBlock}
      </div>
    )
  }

  /* P6·P7 — 지문(들) + 문항, 각각 독립 스크롤. 지문이 여럿이면 탭으로 전환.
     강사 창 최소화(readingSideBySide): 콘텐츠가 화면 전폭을 쓰므로 지문(좌) | 문항(우) 가로 2열.
     우측 패널일 때는 폭이 좁으니 지문(위)/문항(아래) 세로 스택. */

  /* ── 실전 = 세트 단위(P3·P4 와 같은 규칙) ──
     실제 시험지는 지문 하나에 딸린 문항이 **전부 인쇄돼** 있고, 학생은 지문을 훑으며 4문항을
     오간다. 수업은 강사가 한 문항씩 끌고 가니 탭이 맞지만, 실전에서 탭으로 갈라 놓으면
     "지문 하나에 문제 여럿" 이라는 이 파트의 성격 자체가 화면에서 사라진다 → 전부 펴서 스크롤.
     (지문이 여럿인 이중·삼중은 그대로 **탭**이다 — 지문을 나란히 펴면 어느 쪽을 보는지 흐려진다) */
  const readingSets = content.sets
  /* 지금 세트의 지문만 탭에 올린다 — `passages` 는 세트를 이어 붙인 평평한 배열이라,
     거르지 않으면 다음 세트의 지문 탭이 미리 열려 있다 */
  const readingDocs = (() => {
    const all = content.passages ?? []
    const vis = st.visibleQ
    if (!readingSets || !vis) return all
    const ids = readingSets.find((s) => vis.from >= s.from && vis.from < s.to)?.passageIds
    return ids?.length ? all.filter((p) => ids.includes(p.id)) : all
  })()

  const practiceStack = st.selfAudio && multiQ ? (
    <div className="flex-1 min-h-0 flex flex-col">
      {(() => {
        const inView = content.questions.map((_, i) => i).filter((i) => qInView(st, i))
        const set = readingSets?.find((s) => s.from === inView[0])
        return (
          <div className="shrink-0 flex items-center gap-2 pb-2">
            <span className="shrink-0 text-[11px] font-black px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB]">
              Questions {(inView[0] ?? 0) + 1}–{(inView[inView.length - 1] ?? 0) + 1}
            </span>
            {readingSets && readingSets.length > 1 && set && (
              <span className="shrink-0 text-[11px] font-black px-2 py-0.5 rounded-md bg-[#1C1B33] text-white">
                세트 {readingSets.indexOf(set) + 1}/{readingSets.length}
              </span>
            )}
            <span className="text-[11px] text-[#9CA3AF] truncate">한 지문에 딸린 {inView.length}문항입니다</span>
          </div>
        )
      })()}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5">
        {content.questions.map((q, i) => (
          qInView(st, i) ? <QuestionCard key={i} q={q} qIdx={i} lesson={lesson} st={st} /> : null
        ))}
      </div>
    </div>
  ) : null

  if (readingSideBySide) {
    return (
      <SplitPane
        left={<PassageTabs docs={readingDocs} lesson={lesson} st={st} focusBlank={focusBlank} />}
        right={practiceStack ?? (multiQ
          ? <QuestionTabs lesson={lesson} st={st} pane />
          : <div className="flex-1 min-h-0 overflow-y-auto">{questionsBlock}</div>)}
      />
    )
  }
  /* 세로 스택 — 손잡이를 끌어 지문/문항 비율을 바꾼다.
     문항 칸: 탭이 있으면 탭 줄은 고정하고 카드만 스크롤(QuestionTabs가 자체 스크롤을 가짐) */
  return (
    <StackPane
      top={<PassageTabs docs={readingDocs} lesson={lesson} st={st} focusBlank={focusBlank} />}
      bottom={practiceStack ?? (multiQ
        ? <QuestionTabs lesson={lesson} st={st} pane />
        : <div className="flex-1 min-h-0 overflow-y-auto">{questionsBlock}</div>)}
    />
  )
}
