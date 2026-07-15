'use client'

/* ── 유형학습 플레이어 (턴 기반) ──
   이도윤 스캐폴딩 레일(TypeLesson.turns)을 순회하며 턴마다
   ① 강사 발화(말풍선+TTS) ② 음원 재생(문장 단위) ③ 스크립트/지문 점진 공개
   ④ 상호작용(퀵버튼·정답선택·주관식·마킹·쉐도잉·매칭)을 하단 독에 렌더한다.
   진행 상태(공개 범위)는 turns[0..idx]에서 매번 파생 — 이전/건너뛰기가 안전하다. */

import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { TypeLesson, Turn, AudioCue, Interaction, RecapSentence } from '@/data/typeLearning'
import ContentView, { targetTokens, type ContentState } from '@/components/type-lesson/ContentView'
import { DrawingOverlay, DrawPalette, useDrawingTool } from '@/components/DrawingOverlay'
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

/* 단계명(S코드/Q번호 접두어)에서 사람이 읽을 라벨만 뽑는다. 남는 게 'S2+S4'처럼 코드성이면 버린다 —
   그런 조각은 노트 제목으로 노출하기엔 의미가 없다. */
function cleanStageLabel(stage: string): string | null {
  const s = stage
    .replace(/^S\d+(\+S\d+)*\s*/, '')
    .replace(/^Q\d+\s*·\s*/, '')
    .replace(/\s*·\s*S\d+(\/S\d+)*$/, '')
    .trim()
  if (!s || /^S\d/.test(s)) return null
  return s
}

/* S1~S7은 스캐폴딩 시트 전체에서 공통된 의미(관찰→유형판별→코칭→구조파악→정답연결→오답제거→정리)를 갖는다
   — 유형마다 다른 소재라도 "이 단계에서 뭘 하는지"는 재사용 가능. 강사가 실제로 할 구체적 설명·질문은
   여기 없다(강사 에이전트가 대화로 전달할 몫), 대신 그 단계의 일반적인 접근 방법을 불릿으로 안내한다. */
const S_HEADING: Record<string, string> = {
  '1': '핵심 단서 찾기', '2': '유형 파악', '3': '개념·표현 확인', '4': '구조 파악·읽기',
  '5': '정답 연결', '6': '오답 제거', '7': '핵심 정리',
}
const S_BULLETS: Record<string, string[]> = {
  '1': ['문제·선택지·지문에서 눈에 띄는 핵심 단어를 먼저 찾아보세요.', '이 단서로 어떤 상황·주제인지 짐작해 보세요.'],
  '2': ['문제의 형태를 보고 어떤 유형인지 먼저 정하세요.', '유형에 따라 확인할 순서가 달라져요.'],
  '3': ['헷갈리기 쉬운 표현이나 문법 포인트를 선생님과 짚어보세요.', '비슷해 보이는 짝 표현은 차이를 확실히 구분하세요.'],
  '4': ['문장·지문의 앞뒤 구조와 흐름을 확인하세요.', '필요한 부분은 끊어 읽으며 의미를 잡아보세요.'],
  '5': ['지금까지 확인한 단서를 바탕으로 정답을 선택해 보세요.'],
  '6': ['각 보기가 왜 오답인지 이유를 하나씩 생각해 보세요.'],
  '7': ['오늘 다룬 핵심 표현과 전략을 다시 한번 떠올려 보세요.'],
}
/* S코드가 없는 자유 단계명(Q번호 진행, 실전형 등)은 인터랙션 종류 기준으로 대체 */
const KIND_HEADING: Record<Interaction['kind'], string> = {
  next: '다음으로', choice: '선택해 보기', pickAnswer: '정답 고르기', solveAll: '문제 풀기',
  subjective: '생각 말하기', mark: '단서 찾기', shadow: '따라 말하기', match: '근거 연결',
}
const KIND_BULLETS: Record<Interaction['kind'], string[]> = {
  next: ['선생님과의 대화 흐름을 따라 다음으로 넘어가 보세요.'],
  choice: ['보기 중 하나를 선생님과 대화하며 골라보세요.', '고른 이유를 스스로 설명해 보면 더 좋아요.'],
  pickAnswer: ['지금까지 확인한 근거를 바탕으로 정답을 선택해 보세요.'],
  solveAll: ['배운 전략을 활용해 문제를 직접 풀어보세요.'],
  subjective: ['선생님과 대화하며 생각을 말해 보세요.'],
  mark: ['지문에서 단서가 되는 부분을 탭해 표시해 보세요.'],
  shadow: ['문장을 들으며 억양과 끊어 읽기를 따라 해보세요.'],
  match: ['지문에서 근거가 되는 부분을 탭해 서로 연결해 보세요.'],
}

/* ── 강사 노트 — 말풍선(누가 지금 말하는 중) 대신 "지금 이 단계에서 뭘 하면 되는지"만 알려주는 참고자료.
   강사가 실제로 할 설명·질문은 여기 없다 — 그건 강사 에이전트가 대화로 직접 전달한다.
   이 노트를 읽는다고 다음 턴으로 못 넘어간다 — 진행은 스캐폴딩 레일(수동, 지금은 UI 확인용) 또는
   나중에 붙을 강사 에이전트 음성이 맡는다. */
function TutorNote({ turn }: { turn: Turn }) {
  const sNum = turn.stage.match(/^S(\d)/)?.[1]
  const kind = turn.interaction.kind
  const heading = cleanStageLabel(turn.stage) ?? (sNum ? S_HEADING[sNum] : undefined) ?? KIND_HEADING[kind]
  const bullets = (sNum && S_BULLETS[sNum]) ? S_BULLETS[sNum] : KIND_BULLETS[kind]
  return (
    <div className="px-4 md:px-6 pt-3 pb-1 shrink-0">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5">
        <p className="text-[13px] font-bold text-[#1C1B33] mb-1.5">{heading}</p>
        <ul className="text-[12.5px] text-[#475569] space-y-1 list-disc pl-4 leading-relaxed">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>
    </div>
  )
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

/* 스캐폴딩 레일 — 턴별 단계(S코드)를 칩으로. 현재=파랑, 완료=초록. 칩을 탭하면 그 턴으로 바로 이동한다
   (원래는 강사 에이전트 발화로 자동 전환될 예정 — 지금은 UI 확인용으로 수동 이동만 구현).
   스크롤바 숨기고 포인터 드래그(터치/마우스)로 좌우 이동 */
function ScaffoldRail({ turns, turnIdx, onJump }: { turns: Turn[]; turnIdx: number; onJump: (i: number) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; left: number } | null>(null)
  const onDown = (e: ReactPointerEvent) => {
    const el = scrollRef.current
    if (!el) return
    dragRef.current = { x: e.clientX, left: el.scrollLeft }
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onMove = (e: ReactPointerEvent) => {
    const el = scrollRef.current
    if (!el || !dragRef.current) return
    el.scrollLeft = dragRef.current.left - (e.clientX - dragRef.current.x)
  }
  const onUp = () => { dragRef.current = null }
  return (
    <div ref={scrollRef}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      className="bg-[#F7FAFF] border-b border-[#E5EDFA] px-3 md:px-5 py-2 shrink-0 overflow-x-auto cursor-grab active:cursor-grabbing select-none touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[10px] font-black text-[#94A3B8] tracking-wide mr-1 shrink-0">스캐폴딩</span>
        {turns.map((t, i) => (
          <div key={i} className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onJump(i)} className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              i === turnIdx ? 'bg-[#2563EB] text-white'
                : i < turnIdx ? 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]'
                : 'bg-white border border-gray-200 text-gray-400 hover:border-[#93C5FD] hover:text-[#2563EB]'
            }`}>{t.stage}</button>
            {i < turns.length - 1 && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* 재생 중인 항목 라벨 (선택지/화자/음원) */
function playbackLabel(lesson: TypeLesson, id: string): string {
  const m = id.match(/^opt:(\d+):(.+)$/)
  if (m) return `선택지 ${m[2]}`
  const s = lesson.content.audioScript?.find((x) => x.id === id)
  if (s?.speaker) return s.speaker === 'W' ? '여자 음성' : '남자 음성'
  return '음원'
}

/* ── 음원 재생 바 — 듣기 중 오른쪽 영역에 시각 표시(이퀄라이저) ── */
function PlaybackBar({ label, onReplay }: { label: string; onReplay?: () => void }) {
  return (
    <div className="px-4 md:px-6 pb-1 shrink-0">
      <div className="flex items-center gap-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-3.5 py-2.5 shadow-[0_1px_8px_rgba(37,99,235,0.08)]">
        <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-[#1D4ED8] mb-1.5 truncate">음원 재생 중 · {label}</p>
          <div className="flex items-end gap-[3px] h-3.5">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} className="flex-1 max-w-[5px] h-full rounded-full bg-[#2563EB] origin-bottom animate-eq"
                style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
        {onReplay && (
          <button onClick={onReplay} aria-label="다시 듣기"
            className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#2563EB] border border-[#BFDBFE] bg-white rounded-lg px-2.5 py-1.5 hover:bg-[#EFF6FF]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            다시
          </button>
        )}
      </div>
    </div>
  )
}

export default function TypeLessonPlayer({ lesson }: { lesson: TypeLesson }) {
  const router = useRouter()
  const turns = lesson.turns
  const [turnIdx, setTurnIdx] = useState(0)
  /* 'wrap' = 세션 전체 정리(4단계 프레임의 마지막 단계, 실전 이후) — 수업 중 S7 "표현 정리" 턴과는
     별개 화면이다. 그건 수업 워크스루의 마지막 코칭 포인트일 뿐, 세션 전체 정리가 아니다. */
  const [phase, setPhase] = useState<'lesson' | 'practice' | 'wrap' | 'done'>('lesson')
  const [practiceScore, setPracticeScore] = useState<{ correct: number; total: number } | null>(null)
  const turn: Turn = turns[Math.min(turnIdx, turns.length - 1)]

  /* 진행 상태 */
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [marks, setMarks] = useState<Set<string>>(new Set())
  const [tutorMarks, setTutorMarks] = useState<Set<string>>(new Set())
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [graded, setGraded] = useState<Set<number>>(new Set())
  const [answeredQ, setAnsweredQ] = useState<Set<number>>(new Set()) // pickAnswer로 텍스트 공개된 문항
  const [showKo, setShowKo] = useState(false)
  const [started, setStarted] = useState(false)            // 도입(LessonIntro) → 수업 진입 여부
  const [panelOpen, setPanelOpen] = useState(false)        // 강사 모달 열림/축소 (기본=축소 위젯)
  const [widgetNudge, setWidgetNudge] = useState(true)      // 수업 진입 직후 — 강사 위젯 탭 유도(펄스+말풍선). 한번 열면 꺼짐
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

  /* 좌(지문/문제) · 우(설명) 분할 리사이즈 — 강사 영역은 기본으로 최대한 좁게(허용 범위의 최솟값) */
  const [leftFrac, setLeftFrac] = useState(0.72)
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
  /** 근거 연결(match) — 지문에서 직접 탭한 근거. `${passageId}:${targetId}` 키로 저장 */
  const [matchTapped, setMatchTapped] = useState<Set<string>>(new Set())

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
      await speakKorean(turn.tutor)
      if (!alive || !turn.audio) return
      await speakEnglishSeq(cueItems(lesson, turn.audio), (id) => { if (alive) setPlayingId(id) })
    })()
    return () => { alive = false; stopVoice() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIdx, started])

  useEffect(() => () => stopVoice(), [])

  const goNext = () => {
    if (turnIdx < turns.length - 1) setTurnIdx(turnIdx + 1)
    else { stopVoice(); setPhase('practice') }   // 수업(스캐폴딩) 끝 → 실전 문제
  }

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

  const matchIt = turn.interaction
  const matchState = matchIt.kind === 'match' ? {
    evidence: matchIt.evidence,
    matchedTargets: matchTapped,
    onTap: (passageId: string, targetId: string) => {
      const valid = matchIt.evidence.some((ev) => ev.passageId === passageId && ev.targetIds.includes(targetId))
      if (!valid) return
      setMatchTapped((p) => new Set(p).add(`${passageId}:${targetId}`))
    },
  } : undefined

  const st: ContentState = {
    revealedScript, revealedOptions, revealedPassages,
    playingId, marks, tutorMarks,
    onTapWord: (w) => setMarks((p) => { const n = new Set(p); if (n.has(w)) n.delete(w); else n.add(w); return n }),
    focusQ: turn.focusQ,
    answerMode: turn.interaction.kind === 'pickAnswer' ? 'single' : turn.interaction.kind === 'solveAll' ? 'all' : 'none',
    answers, graded, onSelect, showKo,
    matchState,
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

  /* ── 실전 문제 (수업 뒤 — 배운 전략으로 직접 풀기) ── */
  if (phase === 'practice') {
    return (
      <PracticeStage
        lesson={lesson}
        onExit={() => { stopVoice(); router.push('/lessons') }}
        onDone={(score) => { setPracticeScore(score); setPhase('wrap') }}
      />
    )
  }

  /* ── 세션 정리 (4단계 프레임의 마지막 — 실전 문제 이후) ── */
  if (phase === 'wrap') {
    return (
      <WrapStage
        lesson={lesson}
        practiceScore={practiceScore}
        onExit={() => { stopVoice(); router.push('/lessons') }}
        onDone={() => { stopVoice(); setPhase('done') }}
      />
    )
  }

  if (phase === 'done') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-[#F5F8FE] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-3xl">🎉</div>
        <div>
          <p className="text-lg font-bold text-[#1C1B33]">{lesson.title} 완료!</p>
          <p className="text-[13px] text-[#6B7280] mt-1">{lesson.partName} · {lesson.typeLabel}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setPhase('lesson'); setTurnIdx(0); setAnswers({}); setGraded(new Set()); setAnsweredQ(new Set()); setMarks(new Set()); setTutorMarks(new Set()); setPracticeScore(null) }}
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
            {lesson.area === 'RC' && (
              <button onClick={() => setShowKo(!showKo)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${showKo ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#C7D2FE]'}`}>해석</button>
            )}
            <button onClick={draw.toggleDraw}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${draw.drawMode ? 'bg-[#F97316] border-[#F97316] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#FDBA74]'}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              <span className="hidden md:inline">필기</span>
            </button>
          </>
        }
      />

      {/* ── 스캐폴딩 레일 (턴별 단계) ── */}
      <ScaffoldRail turns={turns} turnIdx={turnIdx} onJump={setTurnIdx} />

      {/* ── 본문: 좌 지문/문제 · 우 강사 설명 (part6-split 틀) ── */}
      <div ref={splitRef} className="flex-1 flex flex-col lg:flex-row min-h-0 bg-white">
        {/* 좌: 지문/문제/사진 (파트별 ContentView) — 필기 켜면 상단에 도구 바(인라인, 콘텐츠 위로 밀어냄) */}
        <div className="h-[42%] lg:h-full min-h-0 flex flex-col lg:w-[var(--lf)] border-b lg:border-b-0 border-gray-100" style={{ ['--lf' as string]: `${leftFrac * 100}%` }}>
          {draw.drawMode && <DrawPalette tool={draw.tool} setTool={draw.setTool} clearCanvas={draw.clearCanvas} setDrawMode={draw.setDrawMode} />}
          <div ref={contentRef} className={`flex-1 min-h-0 px-3 md:px-6 py-4 ${
            lesson.part === 6 || lesson.part === 7 ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
          }`}>
            <ContentView lesson={lesson} st={st} />
          </div>
        </div>

        {/* 세로 리사이즈 핸들 (데스크탑) */}
        <div onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd}
          className="hidden lg:flex w-4 shrink-0 items-center justify-center cursor-col-resize touch-none bg-gray-50 border-x border-gray-100 hover:bg-gray-100">
          <div className="h-12 w-1 rounded-full bg-gray-300" />
        </div>

        {/* 우: 강사 설명(스캐폴딩 단계) + 상호작용 — 대화형 말풍선 아님(에이전트 음성이 대화는 대신함), 참고자료 성격의 노트만 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 강사 노트 — 읽어도 진행 안 됨. 진행은 스캐폴딩 레일(수동) / 나중엔 에이전트 음성 */}
          <TutorNote turn={turn} />

          {/* 음원 재생 바 (듣기 재생 중에만) */}
          {playingId && <PlaybackBar label={playbackLabel(lesson, playingId)} onReplay={turn.audio ? replayCue : undefined} />}

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
              matchTapped={matchTapped}
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
        <TutorFloatingWidget imgSrc={INST_THUMBS[TUTOR_KEY]} name={INST_NAME[TUTOR_KEY]} connected isSpeaking={playingId !== null} lastAi=""
          nudge={widgetNudge} onOpen={() => { setPanelOpen(true); setWidgetNudge(false) }} />
      )}

      <DrawingOverlay {...draw} bounds={contentRef} hidePalette />
    </div>
  )
}

/* ── 실전 문제 단계 — 스캐폴딩 없이 전 문항을 직접 풀고 채점 ── */
function PracticeStage({ lesson, onExit, onDone }: { lesson: TypeLesson; onExit: () => void; onDone: (score: { correct: number; total: number }) => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [graded, setGraded] = useState(false)
  const [showKo, setShowKo] = useState(false)
  const [marks, setMarks] = useState<Set<string>>(new Set())
  const draw = useDrawingTool()
  const contentRef = useRef<HTMLDivElement>(null)

  const qs = lesson.content.questions
  const total = qs.length
  const answered = qs.filter((_, i) => answers[i]).length
  const correct = qs.filter((q, i) => answers[i] === q.options.find((o) => o.correct)?.label).length

  const allOptions: Record<number, 'all'> = {}
  qs.forEach((_, i) => { allOptions[i] = 'all' })

  const st: ContentState = {
    revealedScript: 'all', revealedOptions: allOptions, revealedPassages: 'all',
    playingId: null, marks, tutorMarks: new Set(),
    onTapWord: (w) => setMarks((p) => { const n = new Set(p); if (n.has(w)) n.delete(w); else n.add(w); return n }),
    answerMode: graded ? 'none' : 'all',
    answers, graded: graded ? new Set(qs.map((_, i) => i)) : new Set(),
    onSelect: (q, l) => { if (!graded) setAnswers((p) => ({ ...p, [q]: l })) },
    showKo,
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F5F8FE] overflow-hidden">
      <PhaseStepper
        active={2}
        onEnd={onExit}
        extra={lesson.area === 'RC' ? (
          <button onClick={() => setShowKo(!showKo)}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${showKo ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#C7D2FE]'}`}>해석</button>
        ) : undefined}
      />

      {/* 실전 안내 배너 */}
      <div className="shrink-0 bg-white border-b border-[#EBEBF0] px-4 md:px-6 py-2.5">
        <div className="max-w-[900px] mx-auto flex items-center gap-2">
          <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#B45309]">실전 문제</span>
          <p className="text-[12px] font-bold text-[#1C1B33] truncate">{lesson.title} — 배운 전략으로 직접 풀어보세요</p>
        </div>
      </div>

      {/* 필기 도구 바 (인라인) */}
      {draw.drawMode && <DrawPalette tool={draw.tool} setTool={draw.setTool} clearCanvas={draw.clearCanvas} setDrawMode={draw.setDrawMode} />}

      {/* 문항 */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-4 min-h-0">
        <div className="max-w-[900px] mx-auto"><ContentView lesson={lesson} st={st} /></div>
      </div>

      {/* 제출/채점 바 */}
      <div className="shrink-0 bg-white border-t border-[#EBEBF0] px-4 md:px-6 py-3">
        <div className="max-w-[900px] mx-auto flex items-center justify-between gap-3">
          {graded ? (
            <p className="text-[13px] font-bold text-[#1C1B33]">채점 결과 <span className="text-[#2563EB]">{correct}/{total}</span> 정답</p>
          ) : (
            <p className="text-[12px] font-bold text-[#6B7280]"><span className={answered === total ? 'text-[#16A34A]' : 'text-[#9CA3AF]'}>{answered}/{total}</span> 선택</p>
          )}
          {graded
            ? <button onClick={() => onDone({ correct, total })} className={PRIMARY_BTN}>정리로 →</button>
            : <button onClick={() => setGraded(true)} disabled={answered < total} className={PRIMARY_BTN}>채점하기</button>}
        </div>
      </div>

      <DrawingOverlay {...draw} bounds={contentRef} hidePalette />
    </div>
  )
}

/* 빈칸 포함 문장 렌더 — 채우기 전엔 빈 슬롯, 채운 뒤엔 정오답 색으로 표시 */
function RecapBlankSentence({ text, filled, correct }: { text: string; filled?: string; correct?: boolean }) {
  const [pre, post] = text.split('___')
  return (
    <p className="text-[14px] md:text-[15px] font-semibold text-[#1C1B33] leading-relaxed">
      {pre}
      <span className={`inline-block min-w-[76px] text-center mx-1 px-2 py-0.5 rounded-md border-b-2 font-black align-baseline ${
        filled === undefined ? 'border-[#CBD5E1] bg-[#F8FAFC] text-[#94A3B8]'
          : correct ? 'border-[#22C55E] bg-[#F0FDF4] text-[#15803D]' : 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]'
      }`}>{filled ?? '____'}</span>
      {post}
    </p>
  )
}

/* 정리 카드 하나 — 클릭 선택 + 음성 입력 둘 다 가능 */
function RecapCard({ index, sentence, filled, correct, onPick, onSpeak }: {
  index: number; sentence: RecapSentence; filled?: string; correct?: boolean
  onPick: (choice: string) => void; onSpeak: (transcript: string) => void
}) {
  const done = filled !== undefined
  return (
    <div className={`rounded-2xl border bg-white p-4 transition-all ${done ? (correct ? 'border-[#86EFAC]' : 'border-[#FCA5A5]') : 'border-[#E5E7EB]'}`}>
      <div className="flex items-start gap-2.5 mb-2.5">
        <span className={`shrink-0 w-7 h-7 rounded-full text-[12px] font-black flex items-center justify-center ${
          done ? (correct ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]') : 'bg-[#EFF6FF] text-[#2563EB]'
        }`}>{done ? (correct ? '✓' : '✗') : index + 1}</span>
        <RecapBlankSentence text={sentence.en} filled={filled} correct={correct} />
      </div>
      {done && <p className="text-[12px] text-[#6B7280] mb-2.5 pl-9">{sentence.ko}</p>}
      <div className="flex flex-wrap items-center gap-2 pl-9">
        {sentence.choices.map((c) => {
          const picked = filled === c
          return (
            <button key={c} onClick={() => onPick(c)}
              className={`text-[12px] font-semibold border rounded-lg px-3 py-1.5 transition-colors ${
                picked ? (correct ? 'border-[#22C55E] bg-[#F0FDF4] text-[#15803D]' : 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]')
                  : 'border-[#E5E7EB] text-[#374151] hover:border-[#93C5FD] hover:bg-[#EFF6FF]'
              }`}>{c}</button>
          )
        })}
        <MicButton lang="en-US" onResult={onSpeak} />
      </div>
    </div>
  )
}

/* ── 세션 정리 단계 — 4단계 프레임의 마지막(실전 이후). 핵심 문장 3개 빈칸 채우기 + 강사 마무리 멘트 ── */
function WrapStage({ lesson, practiceScore, onExit, onDone }: {
  lesson: TypeLesson; practiceScore: { correct: number; total: number } | null
  onExit: () => void; onDone: () => void
}) {
  const [fills, setFills] = useState<Record<string, string>>({})
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({})
  const [showClosing, setShowClosing] = useState(false)
  const spokenRef = useRef(false)

  const sentences = lesson.recap.sentences
  const allDone = sentences.every((s) => fills[s.id] !== undefined)

  useEffect(() => {
    if (!allDone || spokenRef.current) return
    spokenRef.current = true
    setShowClosing(true)
    void speakKorean(lesson.recap.closing)
    return () => stopVoice()
  }, [allDone, lesson.recap.closing])

  useEffect(() => () => stopVoice(), [])

  const pick = (s: RecapSentence, choice: string) => {
    setFills((p) => ({ ...p, [s.id]: choice }))
    setCorrectMap((p) => ({ ...p, [s.id]: choice === s.answer }))
  }
  const speak = (s: RecapSentence, transcript: string) => {
    if (!transcript.trim()) return
    const ok = s.keywords.some((k) => transcript.toLowerCase().includes(k))
    setFills((p) => ({ ...p, [s.id]: transcript }))
    setCorrectMap((p) => ({ ...p, [s.id]: ok }))
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F5F8FE] overflow-hidden">
      <PhaseStepper active={3} onEnd={onExit} />

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        <div className="max-w-[640px] mx-auto space-y-4">
          <div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#EDE9FE] text-[#6D28D9]">정리</span>
            <p className="text-[15px] font-bold text-[#1C1B33] mt-2">오늘 배운 핵심 문장을 직접 채워보세요</p>
            <p className="text-[12px] text-[#6B7280] mt-0.5">보기를 탭하거나 🎤를 눌러 말해보세요.</p>
          </div>

          {practiceScore && (
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5">
              <span className="text-[11px] font-bold text-[#6B7280]">실전 결과</span>
              <span className="text-[13px] font-black text-[#2563EB]">{practiceScore.correct}/{practiceScore.total} 정답</span>
            </div>
          )}

          <div className="space-y-3">
            {sentences.map((s, i) => (
              <RecapCard key={s.id} index={i} sentence={s} filled={fills[s.id]} correct={correctMap[s.id]}
                onPick={(c) => pick(s, c)} onSpeak={(t) => speak(s, t)} />
            ))}
          </div>

          {showClosing && (
            <div className="flex items-start gap-2.5 bg-[#F0F5FF] border border-[#BFD9FF] rounded-2xl p-4 animate-fade-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={INST_THUMBS[TUTOR_KEY]} alt={INST_NAME[TUTOR_KEY]}
                className="w-9 h-9 rounded-full object-cover object-top border border-[#2563EB]/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-[#374151]">{INST_NAME[TUTOR_KEY]} 강사</span>
                <p className="text-[13px] text-[#374151] leading-relaxed mt-1">{lesson.recap.closing}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 bg-white border-t border-[#EBEBF0] px-4 md:px-6 py-3">
        <div className="max-w-[640px] mx-auto flex justify-end">
          <button onClick={onDone} disabled={!showClosing} className={PRIMARY_BTN}>완료하기</button>
        </div>
      </div>
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
  matchTapped: Set<string>
  setPlayingId: (id: string | null) => void
}) {
  const { turn, lesson } = props
  const it: Interaction = turn.interaction

  /* AI 진행 — 강사 발화만으로 넘어가는 턴. 확인 버튼 없음(에이전트 음성이 대신 판단해 전환할 예정) */
  if (it.kind === 'next') {
    return null
  }

  /* 선택 응답 (퀵버튼) — 고르면 바로 피드백. "다음" 버튼 없음 */
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
          <p className={`text-[12px] leading-relaxed mt-2.5 ${it.choices[picked!]?.correct ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
            {it.choices[picked!]?.correct ? '✓ ' : ''}{it.feedback ?? (it.choices[picked!]?.correct ? '정확해요!' : '다시 한번 근거를 확인해 보세요.')}
          </p>
        )}
      </div>
    )
  }

  /* 필수 응답 — 본문 보기에서 선택. "다음" 버튼 없음 */
  if (it.kind === 'pickAnswer') {
    const done = props.graded.has(it.qIdx)
    return (
      <p className="text-[12px] font-bold text-[#1C1B33]">
        🎯 {it.prompt ?? '위 문항의 보기에서 정답을 선택하세요'}
        {!done && <span className="ml-2 text-[11px] font-semibold text-[#2563EB] animate-pulse">Q{it.qIdx + 1} 보기를 탭하세요</span>}
      </p>
    )
  }

  /* 실전 풀이 — 전 문항 선택. "제출하기"/"다음" 버튼 없음 */
  if (it.kind === 'solveAll') {
    const total = lesson.content.questions.length
    const answered = lesson.content.questions.filter((_, i) => props.answers[i]).length
    return (
      <p className="text-[12px] font-bold text-[#1C1B33]">
        ✍️ {it.prompt ?? '모든 문항의 답을 선택하세요'}
        <span className={`ml-2 text-[11px] font-black ${answered === total ? 'text-[#16A34A]' : 'text-[#9CA3AF]'}`}>{answered}/{total} 선택</span>
      </p>
    )
  }

  /* 주관식 — 실제 말하기는 강사 에이전트와의 대화로만. 여기엔 입력창/마이크 없음(강사 노트가 안내) */
  if (it.kind === 'subjective') {
    return null
  }

  /* 필기 인식(마킹) — 단어 탭 + 필기. "다 표시했어요"/"다음" 버튼 없음 */
  if (it.kind === 'mark') {
    return (
      <p className="text-[12px] font-bold text-[#1C1B33]">
        🖍️ {it.prompt}
        <span className="ml-2 text-[11px] font-normal text-[#9CA3AF]">단어를 탭하면 형광펜, 상단 ✏️필기로 자유롭게 쓸 수도 있어요</span>
      </p>
    )
  }

  /* 쉐도잉 — 듣기·마이크는 유지, "완료" 버튼 없음 */
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
        {/* 실제 따라 말하기는 강사 에이전트와의 대화로 — 여기선 원음 다시 듣기만 */}
        <button onClick={playChunks}
          className="shrink-0 flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] border border-[#BFDBFE] bg-white rounded-xl px-3.5 py-2.5 hover:bg-[#EFF6FF]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          듣기
        </button>
      </div>
    )
  }

  /* 근거 연결 (이중·삼중 지문) — 지문에서 직접 근거를 탭한다. 여기는 진행 체크리스트만 표시, "다음" 버튼 없음 */
  if (it.kind === 'match') {
    const totalTargets = it.evidence.reduce((n, ev) => n + ev.targetIds.length, 0)
    const matchedCount = it.evidence.reduce((n, ev) => n + ev.targetIds.filter((tid) => props.matchTapped.has(`${ev.passageId}:${tid}`)).length, 0)
    const allDone = matchedCount >= totalTargets
    return (
      <div>
        <p className="text-[12px] font-bold text-[#1C1B33] mb-2">🔗 {it.prompt} <span className="text-[11px] font-normal text-[#9CA3AF]">왼쪽 지문에서 근거가 되는 문장·행을 직접 탭하세요</span></p>
        <div className="space-y-1.5">
          {it.evidence.map((ev) => {
            const done = ev.targetIds.every((tid) => props.matchTapped.has(`${ev.passageId}:${tid}`))
            return (
              <div key={ev.label} className={`flex items-center gap-2 text-[12px] font-semibold rounded-lg px-3 py-2 border transition-colors ${
                done ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#15803D]' : 'border-[#E5E7EB] bg-white text-[#6B7280]'
              }`}>
                <span className={`shrink-0 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${done ? 'bg-[#22C55E] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>
                  {done ? '✓' : ''}
                </span>
                {ev.label}
              </div>
            )
          })}
        </div>
        <p className={`text-[12px] font-semibold mt-2.5 ${allDone ? 'text-[#15803D]' : 'text-[#9CA3AF]'}`}>
          {allDone ? '✓ 근거가 모두 연결됐어요!' : `${matchedCount}/${totalTargets} 연결됨`}
        </p>
      </div>
    )
  }

  return null
}
