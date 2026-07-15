'use client'

/* ── 유형학습 플레이어 (턴 기반) ──
   이도윤 스캐폴딩 레일(TypeLesson.turns)을 순회하며 턴마다
   ① 강사 발화(말풍선+TTS) ② 음원 재생(문장 단위) ③ 스크립트/지문 점진 공개
   ④ 상호작용(퀵버튼·정답선택·주관식·마킹·쉐도잉·매칭)을 하단 독에 렌더한다.
   진행 상태(공개 범위)는 turns[0..idx]에서 매번 파생 — 이전/건너뛰기가 안전하다. */

import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { TypeLesson, Turn, AudioCue, Interaction } from '@/data/typeLearning'
import ContentView, { targetTokens, type ContentState } from '@/components/type-lesson/ContentView'
import { DrawingOverlay, useDrawingTool } from '@/components/DrawingOverlay'
import { speakEnglishSeq, speakKorean, stopVoice } from '@/lib/voice'
import { INST_NAME, INST_THUMBS } from '@/data/instructorData'
import LessonIntro from '@/components/lesson/LessonIntro'
import { TutorChatModal, TutorFloatingWidget } from '@/components/lesson/TutorModal'

const TUTOR_KEY = 'lee_doyun' // 레일 정본이 이도윤 ver — 강사 고정

/* 강사 발화 → UI에 짧게: 대본 통짜 대신 핵심 첫 문장 1개만 (음성은 전체 발화 유지) */
function keySentence(t: string): string {
  const m = t.match(/^[\s\S]*?[.!?。](?=\s|$)/)
  return (m ? m[0] : t).trim()
}

/* 음원 지시 → 재생 아이템 목록 */
function cueItems(lesson: TypeLesson, cue: AudioCue): { id: string; text: string }[] {
  const script = lesson.content.audioScript ?? []
  switch (cue.kind) {
    case 'sentences':
      return script.filter((s) => cue.ids.includes(s.id)).map((s) => ({ id: s.id, text: s.en }))
    case 'full':
      return script.map((s) => ({ id: s.id, text: s.en }))
    case 'option': {
      const o = lesson.content.questions[cue.qIdx]?.options.find((x) => x.label === cue.label)
      return o ? [{ id: `opt:${cue.qIdx}:${o.label}`, text: `${o.label}. ${o.text}` }] : []
    }
    case 'options': {
      const q = lesson.content.questions[cue.qIdx]
      return cue.labels
        .map((l) => q?.options.find((x) => x.label === l))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .map((o) => ({ id: `opt:${cue.qIdx}:${o.label}`, text: `${o.label}. ${o.text}` }))
    }
  }
}

/* ── 마이크 버튼 (Web Speech STT — 주관식 ko / 쉐도잉 en) ── */
function MicButton({ lang, onResult, className }: { lang: string; onResult: (t: string) => void; className?: string }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognition | null>(null)
  // SSR과 첫 클라이언트 렌더가 같아야 하므로(hydration) 지원 여부는 마운트 후 판별
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    setSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    return () => { try { recRef.current?.stop() } catch { /* noop */ } }
  }, [])
  if (!supported) return null
  const toggle = () => {
    if (listening) { try { recRef.current?.stop() } catch { /* noop */ } setListening(false); return }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    recRef.current = rec
    rec.lang = lang
    rec.interimResults = true
    let finalBuf = ''
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalBuf += t; else interim += t
      }
      onResult((finalBuf || interim).trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }
  return (
    <button type="button" onClick={toggle} aria-label="음성 입력"
      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
        listening ? 'bg-[#EF4444] border-[#EF4444] text-white animate-pulse' : 'bg-white border-[#BFDBFE] text-[#2563EB] hover:bg-[#EFF6FF]'
      } ${className ?? ''}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
      </svg>
    </button>
  )
}

const PRIMARY_BTN = 'px-6 py-3 rounded-xl bg-[#2563EB] text-white text-[14px] font-bold hover:bg-[#1D4ED8] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed'

/* ── 4단계(도입·수업·실전·정리) 매핑 ──
   시트 스캐폴딩 레일(턴)을 4개 매크로 단계로 접는다. 레일 순서가 유형마다 달라
   (예: Part3은 실전 풀이 후 문항별 수업 복습) 현재 턴 기준으로 어느 단계인지만 표시한다. */
type Macro = '수업' | '실전' | '정리'
function macroOf(t: Turn): Macro {
  const s = t.stage
  const k = t.interaction.kind
  if (s.includes('표현 정리') || s.startsWith('S7')) return '정리'
  if (k === 'solveAll' || k === 'pickAnswer' || s.includes('정답 선택') || s.includes('답 선택') || s.includes('전체 듣기')) return '실전'
  return '수업'
}
const MACRO_IDX: Record<Macro, number> = { 수업: 1, 실전: 2, 정리: 3 }

/* 상단 4단계 스텝퍼 (Part6 화면과 동일 톤) */
function PhaseStepper({ active, onEnd, extra }: { active: number; onEnd: () => void; extra?: ReactNode }) {
  const labels = ['도입', '수업', '실전', '정리']
  return (
    <div className="flex items-center justify-between gap-2 px-3 md:px-6 py-2.5 md:py-3 bg-white border-b border-[#EBEBF0] shrink-0">
      <button onClick={onEnd} className="p-1 shrink-0" aria-label="나가기">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <div className="flex items-center gap-1 md:gap-2 overflow-x-auto">
        {labels.map((label, i) => (
          <div key={label} className="flex items-center gap-1 md:gap-2 shrink-0">
            <div className={`px-2.5 py-1 md:px-4 md:py-1.5 rounded-full text-[11px] md:text-[14px] font-bold whitespace-nowrap ${i === active ? 'bg-[#2563EB] text-white' : i < active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{label}</div>
            {i < labels.length - 1 && <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 shrink-0"><path d="M9 18l6-6-6-6" /></svg>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 shrink-0">{extra}</div>
    </div>
  )
}

/* 스캐폴딩 레일 — 턴별 단계(S코드)를 칩으로. 현재=파랑, 완료=초록 */
function ScaffoldRail({ turns, turnIdx }: { turns: Turn[]; turnIdx: number }) {
  return (
    <div className="bg-[#F7FAFF] border-b border-[#E5EDFA] px-3 md:px-5 py-2 shrink-0 overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[10px] font-black text-[#94A3B8] tracking-wide mr-1 shrink-0">스캐폴딩</span>
        {turns.map((t, i) => (
          <div key={i} className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              i === turnIdx ? 'bg-[#2563EB] text-white'
                : i < turnIdx ? 'bg-[#DCFCE7] text-[#15803D]'
                : 'bg-white border border-gray-200 text-gray-400'
            }`}>{t.stage}</span>
            {i < turns.length - 1 && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TypeLessonPlayer({ lesson }: { lesson: TypeLesson }) {
  const router = useRouter()
  const turns = lesson.turns
  const [turnIdx, setTurnIdx] = useState(0)
  const [finished, setFinished] = useState(false)
  const turn: Turn = turns[Math.min(turnIdx, turns.length - 1)]

  /* 진행 상태 */
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [marks, setMarks] = useState<Set<string>>(new Set())
  const [tutorMarks, setTutorMarks] = useState<Set<string>>(new Set())
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [graded, setGraded] = useState<Set<number>>(new Set())
  const [answeredQ, setAnsweredQ] = useState<Set<number>>(new Set()) // pickAnswer로 텍스트 공개된 문항
  const [voiceOn, setVoiceOn] = useState(true)
  const [showKo, setShowKo] = useState(false)
  const [started, setStarted] = useState(false)            // 도입(LessonIntro) → 수업 진입 여부
  const [panelOpen, setPanelOpen] = useState(false)        // 강사 모달 열림/축소 (기본=축소 위젯)
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('voice')
  const [inputText, setInputText] = useState('')

  /* 도입 화면 "오늘 배울 내용" — 수업 단계 S코드에서 파생 */
  const introPoints = useMemo(() => {
    const seen = new Set<string>()
    const pts: string[] = []
    for (const t of turns) {
      if (macroOf(t) !== '수업') continue
      const label = t.stage.replace(/^S\d+\s*/, '').trim()
      if (label && !seen.has(label)) { seen.add(label); pts.push(label) }
      if (pts.length >= 4) break
    }
    return pts.length ? pts : [lesson.desc]
  }, [turns, lesson.desc])

  /* 좌(지문/문제) · 우(설명) 분할 리사이즈 */
  const [leftFrac, setLeftFrac] = useState(0.5)
  const splitRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)
  const onResizeStart = (e: ReactPointerEvent) => { resizingRef.current = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
  const onResizeMove = (e: ReactPointerEvent) => { if (!resizingRef.current || !splitRef.current) return; const r = splitRef.current.getBoundingClientRect(); setLeftFrac(Math.min(0.72, Math.max(0.28, (e.clientX - r.left) / r.width))) }
  const onResizeEnd = () => { resizingRef.current = false }

  /* 턴별 상호작용 로컬 상태 */
  const [choicePicked, setChoicePicked] = useState<number | null>(null)
  const [subjText, setSubjText] = useState('')
  const [subjSent, setSubjSent] = useState(false)
  const [markDone, setMarkDone] = useState(false)
  const [shadowSaid, setShadowSaid] = useState('')
  const [matchTapped, setMatchTapped] = useState<Set<number>>(new Set())

  const draw = useDrawingTool()
  const contentRef = useRef<HTMLDivElement>(null)

  /* 공개 범위 — turns[0..turnIdx]에서 파생 (뒤로가기/건너뛰기 안전) */
  const { revealedScript, revealedOptions, revealedPassages } = useMemo(() => {
    let script: Set<string> | 'all' = new Set<string>()
    const options: Record<number, Set<string> | 'all'> = {}
    let passages: Set<string> | 'all' = new Set<string>()
    for (let i = 0; i <= turnIdx && i < turns.length; i++) {
      const r = turns[i].reveal
      if (!r) continue
      if (r.scriptIds === 'all') script = 'all'
      else if (r.scriptIds && script !== 'all') r.scriptIds.forEach((id) => (script as Set<string>).add(id))
      if (r.passageIds === 'all') passages = 'all'
      else if (r.passageIds && passages !== 'all') r.passageIds.forEach((id) => (passages as Set<string>).add(id))
      for (const o of r.optionText ?? []) {
        if (o.labels === 'all') options[o.qIdx] = 'all'
        else if (options[o.qIdx] !== 'all') {
          const cur = (options[o.qIdx] as Set<string> | undefined) ?? new Set<string>()
          o.labels.forEach((l) => cur.add(l))
          options[o.qIdx] = cur
        }
      }
    }
    // 정답을 고른 문항은 보기 텍스트 전체 공개 (음성 전용 보기라도 채점 후엔 근거 확인 가능해야)
    answeredQ.forEach((q) => { options[q] = 'all' })
    return { revealedScript: script, revealedOptions: options, revealedPassages: passages }
  }, [turns, turnIdx, answeredQ])

  /* 턴 진입: 발화 → 음원. 로컬 상호작용 상태 리셋 (도입 전에는 재생 안 함) */
  useEffect(() => {
    if (!started) return
    setChoicePicked(null); setSubjText(''); setSubjSent(false); setMarkDone(false); setShadowSaid(''); setMatchTapped(new Set())
    setPlayingId(null)
    stopVoice()
    let alive = true
    ;(async () => {
      if (voiceOn) await speakKorean(turn.tutor)
      if (!alive || !turn.audio) return
      await speakEnglishSeq(cueItems(lesson, turn.audio), (id) => { if (alive) setPlayingId(id) })
    })()
    return () => { alive = false; stopVoice() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIdx, started])

  useEffect(() => () => stopVoice(), [])

  const goNext = () => {
    if (turnIdx < turns.length - 1) setTurnIdx(turnIdx + 1)
    else { stopVoice(); setFinished(true) }
  }
  const goPrev = () => { if (turnIdx > 0) setTurnIdx(turnIdx - 1) }

  const replayCue = () => {
    if (!turn.audio) return
    stopVoice()
    void speakEnglishSeq(cueItems(lesson, turn.audio), setPlayingId)
  }

  /* 정답 선택 처리 */
  const onSelect = (qIdx: number, label: string) => {
    const it = turn.interaction
    if (it.kind === 'pickAnswer') {
      setAnswers((p) => ({ ...p, [qIdx]: label }))
      setGraded((p) => new Set(p).add(qIdx))
      setAnsweredQ((p) => new Set(p).add(qIdx))
    } else if (it.kind === 'solveAll') {
      setAnswers((p) => ({ ...p, [qIdx]: label }))
    }
  }
  const submitAll = () => {
    setGraded((p) => {
      const n = new Set(p)
      lesson.content.questions.forEach((_, i) => n.add(i))
      return n
    })
    lesson.content.questions.forEach((_, i) => setAnsweredQ((p) => new Set(p).add(i)))
  }

  const st: ContentState = {
    revealedScript, revealedOptions, revealedPassages,
    playingId, marks, tutorMarks,
    onTapWord: (w) => setMarks((p) => { const n = new Set(p); if (n.has(w)) n.delete(w); else n.add(w); return n }),
    focusQ: turn.focusQ,
    answerMode: turn.interaction.kind === 'pickAnswer' ? 'single' : turn.interaction.kind === 'solveAll' ? 'all' : 'none',
    answers, graded, onSelect, showKo,
  }

  const macroActive = MACRO_IDX[macroOf(turn)]
  const tutorMessages = turns.slice(0, turnIdx + 1).map((t) => ({ role: 'ai' as const, text: t.tutor }))

  /* ── 도입 (LessonIntro — 4단계 프레임의 첫 단계) ── */
  if (!started) {
    return (
      <LessonIntro
        tag={`Part ${lesson.part} · ${lesson.typeLabel}`}
        script={`${lesson.desc} 이도윤 강사와 스캐폴딩 단계에 따라 하나씩 짚어볼게요.`}
        points={introPoints.map((text) => ({ text }))}
        teacherName={`${INST_NAME[TUTOR_KEY]} 선생님`}
        teacherImg={INST_THUMBS[TUTOR_KEY]}
        onStart={() => setStarted(true)}
        onEnd={() => { stopVoice(); router.push('/lessons') }}
      />
    )
  }

  if (finished) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-[#F5F8FE] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-3xl">🎉</div>
        <div>
          <p className="text-lg font-bold text-[#1C1B33]">{lesson.title} 완료!</p>
          <p className="text-[13px] text-[#6B7280] mt-1">{lesson.partName} · {lesson.typeLabel}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFinished(false); setTurnIdx(0); setAnswers({}); setGraded(new Set()); setAnsweredQ(new Set()); setMarks(new Set()); setTutorMarks(new Set()) }}
            className="px-5 py-2.5 rounded-xl border border-[#C7D2FE] text-[#2563EB] text-sm font-bold hover:bg-[#EFF6FF]">다시 해보기</button>
          <button onClick={() => router.push('/lessons')} className={PRIMARY_BTN}>다른 유형 보러 가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F5F8FE] overflow-hidden">
      {/* ── 4단계 스텝퍼 (도입·수업·실전·정리) ── */}
      <PhaseStepper
        active={macroActive}
        onEnd={() => { stopVoice(); router.push('/lessons') }}
        extra={
          <>
            {turn.audio && (
              <button onClick={replayCue} aria-label="다시 듣기"
                className="hidden sm:flex text-[11px] font-bold text-[#6B7280] border border-[#E5E7EB] rounded-lg px-2 py-1.5 hover:bg-[#F3F4F6] items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                다시 듣기
              </button>
            )}
            {lesson.area === 'RC' && (
              <button onClick={() => setShowKo(!showKo)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${showKo ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#C7D2FE]'}`}>해석</button>
            )}
            <button onClick={draw.toggleDraw}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${draw.drawMode ? 'bg-[#F97316] border-[#F97316] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#FDBA74]'}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              <span className="hidden md:inline">필기</span>
            </button>
            <button onClick={() => { if (voiceOn) stopVoice(); setVoiceOn(!voiceOn) }} aria-label="강사 음성"
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${voiceOn ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]' : 'bg-white border-[#E5E7EB] text-[#C4C9D4]'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {voiceOn ? <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /> : <line x1="23" y1="9" x2="17" y2="15" />}
              </svg>
            </button>
          </>
        }
      />

      {/* ── 스캐폴딩 레일 (턴별 단계) ── */}
      <ScaffoldRail turns={turns} turnIdx={turnIdx} />

      {/* ── 제목 + 진행 + 이전/건너뛰기 (데모 리뷰용) ── */}
      <div className="shrink-0 bg-white border-b border-[#EBEBF0] px-3 md:px-5 py-1.5">
        <div className="max-w-[1080px] mx-auto flex items-center gap-2">
          <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${lesson.area === 'LC' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F0FDF4] text-[#16A34A]'}`}>{lesson.area} · Part {lesson.part}</span>
          <p className="text-[12px] font-bold text-[#1C1B33] truncate">{lesson.title}</p>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="w-24 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${((turnIdx + 1) / turns.length) * 100}%` }} />
            </div>
            <span className="text-[11px] font-bold text-[#6B7280]">{turnIdx + 1}/{turns.length}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={goPrev} disabled={turnIdx === 0} aria-label="이전 턴" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C4C9D4] hover:bg-[#F3F4F6] hover:text-[#6B7280] disabled:opacity-30"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg></button>
            <button onClick={goNext} aria-label="건너뛰기" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C4C9D4] hover:bg-[#F3F4F6] hover:text-[#6B7280]"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg></button>
          </div>
        </div>
      </div>

      {/* ── 본문: 좌 지문/문제 · 우 강사 설명 (part6-split 틀) ── */}
      <div ref={splitRef} className="flex-1 flex flex-col lg:flex-row min-h-0 bg-white">
        {/* 좌: 지문/문제/사진 (파트별 ContentView) */}
        <div ref={contentRef} className="h-[42%] lg:h-full min-h-0 overflow-y-auto lg:w-[var(--lf)] border-b lg:border-b-0 border-gray-100 px-3 md:px-6 py-4" style={{ ['--lf' as string]: `${leftFrac * 100}%` }}>
          <ContentView lesson={lesson} st={st} />
        </div>

        {/* 세로 리사이즈 핸들 (데스크탑) */}
        <div onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd}
          className="hidden lg:flex w-4 shrink-0 items-center justify-center cursor-col-resize touch-none bg-gray-50 border-x border-gray-100 hover:bg-gray-100">
          <div className="h-12 w-1 rounded-full bg-gray-300" />
        </div>

        {/* 우: 강사 설명(스캐폴딩 단계) + 상호작용 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 강사 코치 배너 */}
          <div className="px-4 md:px-6 pt-3 pb-1 shrink-0">
            <div className="flex items-start gap-2.5 bg-[#F0F5FF] border border-[#BFD9FF] rounded-2xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={INST_THUMBS[TUTOR_KEY]} alt={INST_NAME[TUTOR_KEY]}
                className="w-8 h-8 rounded-full object-cover object-top border border-[#2563EB]/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[11px] font-bold text-[#374151]">{INST_NAME[TUTOR_KEY]} 강사</span>
                  <span className="text-[9px] font-black tracking-wide text-[#2563EB] bg-white border border-[#BFD9FF] px-1.5 py-0.5 rounded">{turn.stage}</span>
                  {turn.audio && (
                    <button onClick={replayCue} className="text-[10px] font-bold text-[#6B7280] border border-[#E5E7EB] rounded-md px-1.5 py-0.5 hover:bg-[#F3F4F6] flex items-center gap-1 bg-white">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                      다시 듣기
                    </button>
                  )}
                </div>
                <p className="text-[13px] text-[#374151] leading-relaxed">{keySentence(turn.tutor)}</p>
              </div>
            </div>
          </div>

          {/* 상호작용 (스캐폴딩 단계별 응답) */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 min-h-0">
            <InteractionDock
              key={turnIdx}
              turn={turn} lesson={lesson}
              goNext={goNext}
              answers={answers} graded={graded} submitAll={submitAll}
              choicePicked={choicePicked} setChoicePicked={setChoicePicked}
              subjText={subjText} setSubjText={setSubjText} subjSent={subjSent} setSubjSent={setSubjSent}
              markDone={markDone}
              onMarkDone={() => {
                const it = turn.interaction
                if (it.kind === 'mark' && it.targetWords) setTutorMarks((p) => { const n = new Set(p); targetTokens(it.targetWords).forEach((w) => n.add(w)); return n })
                setMarkDone(true)
              }}
              shadowSaid={shadowSaid} setShadowSaid={setShadowSaid}
              matchTapped={matchTapped} setMatchTapped={setMatchTapped}
              setPlayingId={setPlayingId}
            />
          </div>
        </div>
      </div>

      {/* 강사 에이전트 — 축소 위젯 ↔ 드래그 모달 (시트 발화 표시, 라이브 대화는 데모에서 생략) */}
      {panelOpen ? (
        <TutorChatModal
          imgSrc={INST_THUMBS[TUTOR_KEY]} name={INST_NAME[TUTOR_KEY]}
          connected connecting={false} isSpeaking={playingId !== null}
          chatMode={chatMode} setChatMode={setChatMode} messages={tutorMessages}
          inputText={inputText} setInputText={setInputText} onSend={() => setInputText('')}
          onStartAgent={() => {}} onEndSession={() => setPanelOpen(false)}
          lastAi={keySentence(turn.tutor)} onClose={() => setPanelOpen(false)}
        />
      ) : (
        <TutorFloatingWidget imgSrc={INST_THUMBS[TUTOR_KEY]} name={INST_NAME[TUTOR_KEY]} connected isSpeaking={playingId !== null} lastAi="" onOpen={() => setPanelOpen(true)} />
      )}

      <DrawingOverlay {...draw} bounds={contentRef} />
    </div>
  )
}

/* ── 상호작용 독 — 인터랙션 종류별 UI ── */
function InteractionDock(props: {
  turn: Turn; lesson: TypeLesson
  goNext: () => void
  answers: Record<number, string>; graded: Set<number>; submitAll: () => void
  choicePicked: number | null; setChoicePicked: (i: number) => void
  subjText: string; setSubjText: (t: string) => void; subjSent: boolean; setSubjSent: (b: boolean) => void
  markDone: boolean; onMarkDone: () => void
  shadowSaid: string; setShadowSaid: (t: string) => void
  matchTapped: Set<number>; setMatchTapped: (s: Set<number>) => void
  setPlayingId: (id: string | null) => void
}) {
  const { turn, lesson, goNext } = props
  const it: Interaction = turn.interaction

  /* AI 진행 */
  if (it.kind === 'next') {
    return (
      <div className="flex justify-end">
        <button onClick={goNext} className={PRIMARY_BTN}>{it.label ?? '다음'} →</button>
      </div>
    )
  }

  /* 선택 응답 (퀵버튼) */
  if (it.kind === 'choice') {
    const picked = props.choicePicked
    const done = picked !== null
    return (
      <div>
        <p className="text-[12px] font-bold text-[#1C1B33] mb-2">💬 {it.prompt}</p>
        <div className="flex flex-wrap gap-2">
          {it.choices.map((c, i) => {
            const isPicked = picked === i
            const cls = done
              ? c.correct ? 'border-[#22C55E] bg-[#F0FDF4] text-[#15803D]'
                : isPicked ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]' : 'border-[#E5E7EB] text-[#9CA3AF]'
              : 'border-[#C7D2FE] bg-[#F8FAFF] text-[#1C1B33] hover:border-[#2563EB] hover:bg-[#EFF6FF]'
            return (
              <button key={i} disabled={done} onClick={() => props.setChoicePicked(i)}
                className={`text-[13px] font-semibold border rounded-xl px-4 py-2.5 text-left transition-all active:scale-[0.98] ${cls}`}>
                <span className="mr-1.5 font-black">{['①', '②', '③', '④'][i]}</span>{c.text}
              </button>
            )
          })}
        </div>
        {done && (
          <div className="flex items-start justify-between gap-3 mt-2.5">
            <p className={`text-[12px] leading-relaxed flex-1 ${it.choices[picked!]?.correct ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
              {it.choices[picked!]?.correct ? '✓ ' : ''}{it.feedback ?? (it.choices[picked!]?.correct ? '정확해요!' : '다시 한번 근거를 확인해 보세요.')}
            </p>
            <button onClick={goNext} className={PRIMARY_BTN + ' shrink-0'}>다음 →</button>
          </div>
        )}
      </div>
    )
  }

  /* 필수 응답 — 본문 보기에서 선택 */
  if (it.kind === 'pickAnswer') {
    const done = props.graded.has(it.qIdx)
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-[#1C1B33]">
          🎯 {it.prompt ?? '위 문항의 보기에서 정답을 선택하세요'}
          {!done && <span className="ml-2 text-[11px] font-semibold text-[#2563EB] animate-pulse">Q{it.qIdx + 1} 보기를 탭하세요</span>}
        </p>
        {done && <button onClick={goNext} className={PRIMARY_BTN + ' shrink-0'}>다음 →</button>}
      </div>
    )
  }

  /* 실전 풀이 — 전 문항 선택 후 제출 */
  if (it.kind === 'solveAll') {
    const total = lesson.content.questions.length
    const answered = lesson.content.questions.filter((_, i) => props.answers[i]).length
    const isGraded = props.graded.size >= total
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-[#1C1B33]">
          ✍️ {it.prompt ?? '모든 문항의 답을 선택하세요'}
          <span className={`ml-2 text-[11px] font-black ${answered === total ? 'text-[#16A34A]' : 'text-[#9CA3AF]'}`}>{answered}/{total} 선택</span>
        </p>
        {isGraded
          ? <button onClick={goNext} className={PRIMARY_BTN + ' shrink-0'}>다음 →</button>
          : <button onClick={props.submitAll} disabled={answered < total} className={PRIMARY_BTN + ' shrink-0'}>제출하기</button>}
      </div>
    )
  }

  /* 주관식 — 텍스트/음성 */
  if (it.kind === 'subjective') {
    if (props.subjSent) {
      return (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#15803D] font-semibold">✓ 좋아요, 그 감각이면 됩니다! {it.hint && <span className="text-[#6B7280] font-normal">({it.hint})</span>}</p>
          <button onClick={goNext} className={PRIMARY_BTN + ' shrink-0'}>다음 →</button>
        </div>
      )
    }
    return (
      <div>
        <p className="text-[12px] font-bold text-[#1C1B33] mb-2">🗣️ {it.prompt}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#F3F4F6] rounded-full px-4 py-2.5">
            <input value={props.subjText} onChange={(e) => props.setSubjText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && props.subjText.trim()) props.setSubjSent(true) }}
              placeholder={it.hint ? `직접 입력하거나 🎤로 말해요 · ${it.hint}` : '직접 입력하거나 🎤로 말해요'}
              className="w-full bg-transparent text-[13px] text-[#1C1B33] placeholder-[#9CA3AF] outline-none" />
          </div>
          <MicButton lang="ko-KR" onResult={props.setSubjText} />
          <button onClick={() => props.setSubjSent(true)} disabled={!props.subjText.trim()} className={PRIMARY_BTN + ' shrink-0'}>보내기</button>
        </div>
      </div>
    )
  }

  /* 필기 인식(마킹) — 단어 탭 + 필기 */
  if (it.kind === 'mark') {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-[#1C1B33]">
          🖍️ {it.prompt}
          {props.markDone
            ? <span className="ml-2 text-[11px] font-semibold text-[#2563EB]">파란 표시가 강사가 잡은 단서예요 — 내 표시와 비교해 보세요</span>
            : <span className="ml-2 text-[11px] font-normal text-[#9CA3AF]">단어를 탭하면 형광펜, 상단 ✏️필기로 자유롭게 쓸 수도 있어요</span>}
        </p>
        {props.markDone
          ? <button onClick={goNext} className={PRIMARY_BTN + ' shrink-0'}>다음 →</button>
          : <button onClick={props.onMarkDone} className={PRIMARY_BTN + ' shrink-0'}>다 표시했어요</button>}
      </div>
    )
  }

  /* 쉐도잉 */
  if (it.kind === 'shadow') {
    const playChunks = () => {
      const script = lesson.content.audioScript ?? []
      const items = it.audioIds?.length
        ? script.filter((s) => it.audioIds!.includes(s.id)).map((s) => ({ id: s.id, text: s.en }))
        : [{ id: 'chunk', text: it.chunks.join(' ') }]
      void speakEnglishSeq(items, props.setPlayingId)
    }
    return (
      <div>
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          <span className="text-[12px] font-bold text-[#1C1B33] mr-1">🔁 따라 말해보세요</span>
          {it.chunks.map((c, i) => (
            <span key={i} className="text-[13px] font-mono font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-2.5 py-1">
              {c}{i < it.chunks.length - 1 && <span className="text-[#93C5FD] ml-2">/</span>}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={playChunks}
            className="shrink-0 flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] border border-[#BFDBFE] bg-white rounded-xl px-3.5 py-2.5 hover:bg-[#EFF6FF]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            듣기
          </button>
          <MicButton lang="en-US" onResult={props.setShadowSaid} />
          <div className="flex-1 bg-[#F3F4F6] rounded-full px-4 py-2.5 min-w-0">
            <p className={`text-[13px] truncate ${props.shadowSaid ? 'text-[#1C1B33] font-medium' : 'text-[#9CA3AF]'}`}>
              {props.shadowSaid || '🎤를 누르고 따라 말하면 여기 표시돼요'}
            </p>
          </div>
          <button onClick={goNext} className={PRIMARY_BTN + ' shrink-0'}>완료 →</button>
        </div>
      </div>
    )
  }

  /* 근거 연결 (이중·삼중 지문) */
  if (it.kind === 'match') {
    const allTapped = props.matchTapped.size >= it.items.length
    return (
      <div>
        <p className="text-[12px] font-bold text-[#1C1B33] mb-2">🔗 {it.prompt} <span className="text-[11px] font-normal text-[#9CA3AF]">카드를 순서대로 탭해서 이어보세요</span></p>
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-1.5">
          {it.items.map((item, i) => {
            const tapped = props.matchTapped.has(i)
            return (
              <div key={i} className="flex items-center gap-1.5 flex-1 min-w-0">
                <button onClick={() => { const n = new Set(props.matchTapped); if (tapped) n.delete(i); else n.add(i); props.setMatchTapped(n) }}
                  className={`flex-1 min-w-0 text-left rounded-xl border px-3 py-2.5 transition-all active:scale-[0.98] ${
                    tapped ? 'border-[#2563EB] bg-[#EFF6FF] shadow-[0_1px_8px_rgba(37,99,235,0.15)]' : 'border-[#E5E7EB] bg-white hover:border-[#C7D2FE]'
                  }`}>
                  <p className={`text-[9px] font-black tracking-wide mb-0.5 ${tapped ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>{item.passageLabel}</p>
                  <p className="text-[12px] text-[#374151] leading-snug">{item.text}</p>
                </button>
                {i < it.items.length - 1 && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round"
                    className={`shrink-0 hidden sm:block transition-colors ${allTapped ? 'stroke-[#2563EB]' : 'stroke-[#D1D5DB]'}`}>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-3 mt-2.5">
          <p className={`text-[12px] font-semibold ${allTapped ? 'text-[#15803D]' : 'text-[#9CA3AF]'}`}>
            {allTapped ? '✓ 근거가 하나로 이어졌어요!' : `${props.matchTapped.size}/${it.items.length} 연결됨`}
          </p>
          <button onClick={goNext} disabled={!allTapped} className={PRIMARY_BTN + ' shrink-0'}>다음 →</button>
        </div>
      </div>
    )
  }

  return null
}
