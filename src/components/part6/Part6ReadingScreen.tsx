'use client'

/* Part 6 장문 공란 — 도입 → 수업(좌: 지문+빈칸문제 / 우: 강사 대화창) → 실전 → 정리
   원래 P6_PASSAGES 데이터 그대로 사용. 지문에 빈칸(N)을 하이라이트. 색: #2277F0. */

import React, { useEffect, useRef, useState } from 'react'
import { P6_PASSAGES, type P6Passage } from '@/data/rcData'
import { useDbQuestionsByPassage, toP6Passage, Q_ANCHORS } from '@/data/db/questionStore'
import LessonIntro from '@/components/lesson/LessonIntro'
import { speakTTS, stopCurrentAudio } from '@/lib/tts'
import { useClassroomStore } from '@/store/classroomStore'
import { useDrawingTool, DrawingOverlay, DrawToggleButton } from '@/components/DrawingOverlay'
import { useConversation } from '@11labs/react'
import TutorMiniCard, { PanelCollapseButton } from '@/components/lesson/TutorMiniCard'
import { TutorChatModal, TutorFloatingWidget } from '@/components/lesson/TutorModal'

const LABELS = ['A', 'B', 'C', 'D']
const TEACHER_IMG = '/image_reference/park-2.jpg'
const INSTRUCTOR_PHOTO = '/image_reference/park-3.jpg'
const AGENT_ID = 'agent_2501kt0w00khfrr8869g2z5vnpaz'

const P6_INTRO_SCRIPT =
  '안녕하세요! 오늘은 Part 6 장문 공란을 배울 거예요. 빈칸 앞뒤 문맥과 문장 구조를 함께 보고 알맞은 말을 넣는 전략을 익혀볼게요. 준비됐죠? 😊'
const P6_INTRO_POINTS = [
  { text: '빈칸 앞뒤 문장까지 함께 읽기' },
  { text: '빈칸 자리의 문법(태·품사·동사형) 파악' },
  { text: '접속어·문맥 흐름으로 정답 확정' },
]
const SUMMARY_CARDS = [
  { before: '장문 공란은 빈칸 ', blank: '앞뒤', after: ' 문장까지 함께 읽는다.', accept: ['앞뒤', '전후'] },
  { before: '빈칸 자리의 ', blank: '문법', after: ' 구조(태·품사)를 먼저 본다.', accept: ['문법', '품사', '구조'] },
  { before: '접속어와 ', blank: '문맥', after: ' 흐름으로 정답을 확정한다.', accept: ['문맥', '흐름'] },
]
const CLOSING_SUMMARY_SCRIPT =
  '오늘 배운 Part 6 핵심! 빈칸 앞뒤를 함께 읽고, 빈칸 자리의 문법 구조를 파악하고, 접속어와 문맥 흐름으로 정답을 확정하세요. 수고 많았어요!'

const STUDENT_VARS: Record<string, string> = {
  user_name: '지윤', target_score: '900', study_range: '파트 식스 장문 공란',
  exam_date: '다음 달', daily_time: '하루 한 시간', learning_style: '집중형', management_style: '주도형', motivation_type: '목표 달성형',
  instructor_greeting: '자, 오늘은 파트 식스 장문 공란을 같이 풀어보자. 빈칸 하나씩 짚어줄게. 시작하자.',
}

interface Props {
  onEnd?: () => void
  /** 'side'(기본) = 우측 강사 패널 / 'split' = 지문 좌·문제 우 분할 + 강사 모달 (UI 실험) */
  variant?: 'side' | 'split'
}

const blankPrompt = (n: number) => `빈칸 (${n})에 들어갈 가장 알맞은 것은?`

/* ── 상단 phase 스텝퍼 ── */
function PhaseStepper({ active, onEnd, extra }: { active: number; onEnd: () => void; extra?: React.ReactNode }) {
  const labels = ['도입', '유형 학습', '실전 문제', '핵심 요약']
  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 shrink-0">
      <button onClick={onEnd} className="p-1" aria-label="뒤로">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-7 md:h-7"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <div className="flex items-center gap-1.5 md:gap-2.5">
        {labels.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5 md:gap-2.5">
            <div className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full text-[11px] md:text-[15px] font-bold ${i === active ? 'bg-[#2277F0] text-white' : i < active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{label}</div>
            {i < 3 && <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5 md:w-4 md:h-4"><path d="M9 18l6-6-6-6" /></svg>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <button onClick={onEnd} className="text-[11px] md:text-sm text-gray-400 border border-gray-100 px-2.5 py-1 md:px-4 md:py-2 rounded-lg">종료</button>
      </div>
    </div>
  )
}

/* ── 수업(lesson) 단계 안의 스캐폴딩 레일 (B안: 단계마다 UI 전환) ──
   시트 스캐폴딩(S1~S7)을 Part 6 장문 공란에 맞춰 5스텝으로. 첫 빈칸을 예시로 함께 풀고,
   나머지 빈칸은 실전(reading)에서 학생이 스스로 푼다. 4단계 프레임·강사 모달은 그대로 둔다. */
type ScafMode = 'observe' | 'grammar' | 'context' | 'answer' | 'recap'
interface ScafStep { code: string; label: string; tutor: string; mode: ScafMode }
const SCAF_P6: ScafStep[] = [
  { code: 'S1', label: '빈칸 앞뒤 관찰', mode: 'observe',
    tutor: '먼저 빈칸 (1) 앞뒤 문장을 같이 읽어봐요. 빈칸 하나만 보지 말고 흐름을 잡는 게 Part 6의 핵심이에요.' },
  { code: 'S2', label: '문법 자리 판별', mode: 'grammar',
    tutor: '이 빈칸 자리에 뭐가 필요한지 형태부터 봐요. 동사 자리인지, 연결어 자리인지 품사를 정해요.' },
  { code: 'S3', label: '문맥·접속어', mode: 'context',
    tutor: '앞 문장과의 관계를 보여주는 접속어 단서를 찾아요. 대조(however)인지 인과(therefore)인지에 따라 답이 갈려요.' },
  { code: 'S4', label: '정답 연결', mode: 'answer',
    tutor: '이제 보기에서 문맥과 문법에 맞는 걸 직접 골라보세요.' },
  { code: 'S5', label: '핵심 정리', mode: 'recap',
    tutor: '빈칸 (1) 정리! 앞뒤 문맥 → 문법 자리 → 접속어 흐름, 이 순서로 확정하면 됩니다.' },
]

/* 수업 단계 내부의 스캐폴딩 서브 스텝퍼 — 4단계 바 바로 아래 */
function ScaffoldStepper({ steps, active }: { steps: ScafStep[]; active: number }) {
  return (
    <div className="bg-[#F7FAFF] border-b border-[#E5EDFA] px-4 md:px-8 py-2 shrink-0 overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[10px] font-black text-[#94A3B8] tracking-wide mr-1 shrink-0">스캐폴딩</span>
        {steps.map((s, i) => (
          <div key={s.code} className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
              i === active ? 'bg-[#2277F0] text-white'
                : i < active ? 'bg-green-100 text-green-700'
                : 'bg-white border border-gray-200 text-gray-400'
            }`}>
              <span className="font-black mr-1">{s.code}</span>{s.label}
            </span>
            {i < steps.length - 1 && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 지문 (빈칸 하이라이트) ── */
function PassageView({ passage, currentBlank, answeredBlanks }: { passage: P6Passage; currentBlank: number; answeredBlanks: Set<number> }) {
  return (
    <div className="h-full overflow-y-auto px-5 md:px-8 py-5 md:py-6">
      <div className="inline-flex items-center gap-2 mb-4">
        <span className="bg-[#2277F0]/10 text-[#2277F0] text-xs md:text-sm font-bold px-3 py-1 rounded-full">지문</span>
        <span className="text-xs md:text-sm text-gray-400">{passage.title}</span>
      </div>
      <div className="whitespace-pre-line leading-loose text-[#1A2B4B] text-sm md:text-base">
        {passage.passage.split(/(\(\d\)_+)/g).map((part, i) => {
          const m = part.match(/^\((\d)\)_+$/)
          if (!m) return <span key={i}>{part}</span>
          const num = Number(m[1])
          const cls = num === currentBlank
            ? 'bg-[#EFF6FF] text-[#2277F0] border-b-2 border-[#2277F0] font-bold'
            : answeredBlanks.has(num) ? 'bg-[#F0FDF4] text-[#059669] font-bold' : 'bg-gray-100 text-gray-400 font-bold'
          return <span key={i} className={`inline-block px-1.5 py-0.5 rounded mx-0.5 ${cls}`}>({num})</span>
        })}
      </div>
    </div>
  )
}

/* ── 선택지 카드 ── */
function ChoiceCard({ label, text, state, onClick, disabled }: {
  label: string; text: string; state: 'idle' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' | 'dimmed'; onClick: () => void; disabled: boolean
}) {
  const box = {
    idle: 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#2277F0]/50 hover:bg-[#2277F0]/5',
    'selected-correct': 'bg-green-50 border-green-400 text-green-800',
    'selected-wrong': 'bg-red-50 border-red-400 text-red-800',
    'reveal-correct': 'bg-green-50 border-green-400 text-green-800',
    dimmed: 'bg-gray-50 border-gray-100 text-gray-400',
  }[state]
  const badge = {
    idle: 'bg-gray-200 text-gray-500', 'selected-correct': 'bg-green-500 text-white', 'selected-wrong': 'bg-red-500 text-white', 'reveal-correct': 'bg-green-500 text-white', dimmed: 'bg-gray-200 text-gray-400',
  }[state]
  return (
    <button onClick={onClick} disabled={disabled} className={`w-full flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl border text-left transition-all text-sm md:text-base ${box}`}>
      <span className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold flex-shrink-0 ${badge}`}>{label}</span>
      <span className="font-medium leading-snug flex-1">{text}</span>
      {(state === 'selected-correct' || state === 'reveal-correct') && (
        <span className="ml-auto shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </span>
      )}
      {state === 'selected-wrong' && (
        <span className="ml-auto shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </span>
      )}
    </button>
  )
}

/* ── 실전: 빈칸 탭 + 선택지 + 해설 ── */
function QuestionView({ passage, qIndex, setQIndex, answers, onSelect, onNext, isLast }: {
  passage: P6Passage; qIndex: number; setQIndex: (i: number) => void; answers: Record<number, number>
  onSelect: (choiceIdx: number) => void; onNext: () => void; isLast: boolean
}) {
  const q = passage.questions[qIndex]
  const selected = answers[q.blankNum]
  const answered = selected !== undefined
  const isCorrect = answered && selected === q.answer
  const answeredCount = passage.questions.filter((qq) => answers[qq.blankNum] !== undefined).length
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 border-b border-gray-100 shrink-0 overflow-x-auto">
        {passage.questions.map((qq, i) => {
          const ans = answers[qq.blankNum]
          const active = i === qIndex
          const tabCls = active
            ? 'bg-[#2277F0] text-white'
            : ans === undefined ? 'bg-gray-100 text-gray-400'
            : ans === qq.answer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          return (
            <button key={qq.blankNum} onClick={() => setQIndex(i)}
              className={`shrink-0 px-3 h-9 md:h-10 rounded-full text-xs md:text-sm font-bold transition-all ${tabCls}`}>
              빈칸 {qq.blankNum}
            </button>
          )
        })}
        <span className="ml-auto shrink-0 text-xs md:text-sm text-gray-400 font-medium">{answeredCount}/{passage.questions.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 min-h-0">
        <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed mb-4"><span className="text-[#2277F0] font-bold mr-1.5">({q.blankNum})</span>{blankPrompt(q.blankNum)}</p>
        <div className="flex flex-col gap-2 md:gap-2.5">
          {q.choices.map((choice, i) => {
            let state: 'idle' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' | 'dimmed' = 'idle'
            if (answered) {
              if (i === q.answer) state = i === selected ? 'selected-correct' : 'reveal-correct'
              else if (i === selected) state = 'selected-wrong'
              else state = 'dimmed'
            }
            return <ChoiceCard key={i} label={LABELS[i]} text={choice} state={state} disabled={answered} onClick={() => onSelect(i)} />
          })}
        </div>
        {answered && (
          <div className="mt-4 md:mt-5 rounded-2xl border border-[#BFD9FF] bg-[#F0F5FF] p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TEACHER_IMG} alt="AI 강사" className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-[#2277F0]/40" />
              <span className="text-xs md:text-sm font-bold text-[#1A2B4B]">박혜원 AI 강사 해설</span>
              <span className={`ml-auto text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-md ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isCorrect ? '✓ 정답' : '✕ 오답'}</span>
            </div>
            <p className="text-[13px] md:text-[15px] text-[#374151] leading-relaxed">{q.explanation}</p>
          </div>
        )}
      </div>
      <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 bg-white shrink-0">
        <button onClick={onNext} disabled={!answered} className={`w-full py-3.5 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-lg font-bold transition-all ${answered ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>{isLast ? '완료하기 →' : '다음 빈칸 →'}</button>
      </div>
    </div>
  )
}

export default function Part6ReadingScreen({ onEnd, variant = 'side' }: Props) {
  // 지문·문항은 Supabase DB에서 로드 (실패 시 하드코딩 폴백)
  const passage = useDbQuestionsByPassage(
    Q_ANCHORS.p6Memo,
    (rows) => toP6Passage(rows, P6_PASSAGES[0]),
    P6_PASSAGES[0],
  )
  const persona = useClassroomStore((s) => s.persona)
  const [phase, setPhase] = useState<'intro' | 'lesson' | 'reading' | 'summary'>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [lessonBlank, setLessonBlank] = useState(0)
  const [lessonStep, setLessonStep] = useState(0)          // split 수업: 스캐폴딩 스텝 인덱스
  const [scafPick, setScafPick] = useState<number | null>(null) // S4 정답 연결에서 고른 보기
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text')
  const [panelOpen, setPanelOpen] = useState(variant !== 'split') // side: 패널 열림 / split: 위젯부터
  const [inputText, setInputText] = useState('')
  const [topFrac, setTopFrac] = useState(0.5)
  const [leftFrac, setLeftFrac] = useState(0.5) // split: 지문(좌) 폭 비율
  const [summaryInputs, setSummaryInputs] = useState(['', '', ''])
  const [summaryChecked, setSummaryChecked] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)
  const draw = useDrawingTool()

  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([])
  const conversation = useConversation({
    // 텍스트 모드에서는 마이크를 음소거 → 입력은 오직 텍스트로만
    micMuted: chatMode === 'text',
    onMessage: (p: { source: string; message: string }) => setMessages((prev) => [...prev, { role: p.source === 'user' ? 'user' : 'ai', text: p.message }]),
  })
  const connected = conversation.status === 'connected'
  const connecting = conversation.status === 'connecting'

  const handleEnd = onEnd ?? (() => window.history.back())
  const total = passage.questions.length
  const isLast = qIndex === total - 1
  const answeredBlanks = new Set(Object.keys(answers).map(Number))

  useEffect(() => {
    if (phase !== 'intro') return
    // 도입 발화
    void speakTTS(P6_INTRO_SCRIPT, persona)
    return () => stopCurrentAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])
  useEffect(() => {
    if (phase !== 'lesson' && conversation.status !== 'disconnected') { try { conversation.endSession() } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])
  useEffect(() => () => { try { conversation.endSession() } catch { /* noop */ } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 도입 ──
  if (phase === 'intro') {
    return (
      <LessonIntro tag="Part 6 장문 공란" script={P6_INTRO_SCRIPT} points={P6_INTRO_POINTS}
        onStart={() => { stopCurrentAudio(); setMessages([]); setLessonBlank(0); setLessonStep(0); setScafPick(null); setPhase('lesson') }} onEnd={handleEnd} />
    )
  }

  // ── 수업 ──
  if (phase === 'lesson') {
    const q = passage.questions[lessonBlank]
    const lastAi = [...messages].reverse().find((m) => m.role === 'ai')?.text ?? ''
    const startAgent = () => { setMessages([]); conversation.startSession({ agentId: AGENT_ID, dynamicVariables: STUDENT_VARS }).catch(() => {}) }
    const sendText = () => { const t = inputText.trim(); if (!t || !connected) return; conversation.sendUserMessage(t); setInputText('') }
    const goReading = () => { try { conversation.endSession() } catch { /* noop */ } stopCurrentAudio(); setPhase('reading') }
    const onResizeStart = (e: React.PointerEvent) => { resizingRef.current = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
    const onResizeMove = (e: React.PointerEvent) => { if (!resizingRef.current || !mainRef.current) return; const r = mainRef.current.getBoundingClientRect(); setTopFrac(Math.min(0.8, Math.max(0.25, (e.clientY - r.top) / r.height))) }
    const onResizeEnd = () => { resizingRef.current = false }
    const onHResizeMove = (e: React.PointerEvent) => { if (!resizingRef.current || !mainRef.current) return; const r = mainRef.current.getBoundingClientRect(); setLeftFrac(Math.min(0.75, Math.max(0.25, (e.clientX - r.left) / r.width))) }

    // ── split 변형: 지문 좌 / 스캐폴딩 단계별 콘텐츠 우 + 강사는 플로팅 위젯 → 드래그 모달 ──
    if (variant === 'split') {
      const scaf = SCAF_P6[lessonStep]
      const taught = passage.questions[0]          // 수업은 첫 빈칸을 예시로 함께 푼다
      const isLastStep = lessonStep === SCAF_P6.length - 1
      const scafAnswered = scaf.mode === 'answer' && scafPick !== null
      const lessonHighlight = new Set<number>(scafPick !== null ? [taught.blankNum] : [])
      const goStep = (d: number) => setLessonStep((s) => Math.min(SCAF_P6.length - 1, Math.max(0, s + d)))
      return (
        <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
          <PhaseStepper active={1} onEnd={handleEnd} extra={<DrawToggleButton drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} />} />
          {/* 스캐폴딩 서브 스텝퍼 — 수업 단계 안에서 단계별로 진행 */}
          <ScaffoldStepper steps={SCAF_P6} active={lessonStep} />
          <DrawingOverlay {...draw} bounds={mainRef} />
          <div ref={mainRef} className="flex-1 flex flex-col lg:flex-row min-h-0 bg-white">
            {/* 좌: 지문 (이번에 배우는 빈칸 하이라이트) */}
            <div className="h-[45%] lg:h-full min-h-0 lg:w-[var(--lf)] border-b lg:border-b-0 border-gray-100" style={{ ['--lf' as string]: `${leftFrac * 100}%` }}>
              <PassageView passage={passage} currentBlank={taught.blankNum} answeredBlanks={lessonHighlight} />
            </div>
            {/* 가운데 세로 리사이즈 핸들 (데스크탑) */}
            <div onPointerDown={onResizeStart} onPointerMove={onHResizeMove} onPointerUp={onResizeEnd}
              className="hidden lg:flex w-4 shrink-0 items-center justify-center cursor-col-resize touch-none bg-gray-50 border-x border-gray-100 hover:bg-gray-100">
              <div className="h-12 w-1 rounded-full bg-gray-300" />
            </div>
            {/* 우: 스캐폴딩 단계별 콘텐츠 */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* 강사 코치 배너 (단계별 멘트) */}
              <div className="px-5 md:px-8 pt-3 pb-1 shrink-0">
                <div className="flex items-start gap-2.5 bg-[#F0F5FF] border border-[#BFD9FF] rounded-2xl p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TEACHER_IMG} alt="박혜원" className="w-8 h-8 rounded-full object-cover object-top border border-[#2277F0]/40 shrink-0" />
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] font-black text-[#2277F0] bg-white border border-[#BFD9FF] px-1.5 py-0.5 rounded mb-1"><span className="font-black">{scaf.code}</span> {scaf.label}</span>
                    <p className="text-[13px] text-[#374151] leading-relaxed">{scaf.tutor}</p>
                  </div>
                </div>
              </div>

              {/* 단계별 뷰 */}
              <div className="flex-1 overflow-y-auto px-5 md:px-8 py-3 min-h-0">
                {scaf.mode === 'observe' && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-bold text-[#1A2B4B] mb-2">빈칸 ({taught.blankNum}) 주변 읽기</p>
                    <ul className="text-[13px] text-[#475569] space-y-1.5 list-disc pl-4">
                      <li>빈칸 <b>바로 앞 문장</b>의 주어·동사를 확인해요.</li>
                      <li>빈칸 <b>뒤 문장</b>이 앞 내용을 잇는지, 뒤집는지 봐요.</li>
                      <li>왼쪽 지문에서 <span className="text-[#2277F0] font-bold">파란 밑줄</span>이 이번에 풀 빈칸이에요.</li>
                    </ul>
                  </div>
                )}
                {scaf.mode === 'grammar' && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-bold text-[#1A2B4B] mb-2.5">이 빈칸은 어떤 자리일까요?</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['동사', '명사', '형용사', '접속어'].map((t) => (
                        <span key={t} className="text-[13px] font-bold text-[#334155] bg-white border border-gray-200 rounded-full px-3 py-1.5">{t}</span>
                      ))}
                    </div>
                    <p className="text-[12px] text-gray-500 leading-relaxed">보기 4개의 <b>형태</b>를 비교하면 자리가 보여요. 형태가 제각각이면 문법 문제, 비슷하면 어휘 문제예요.</p>
                  </div>
                )}
                {scaf.mode === 'context' && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-bold text-[#1A2B4B] mb-2.5">앞뒤 관계 단서 — 접속어</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[['however', '대조'], ['therefore', '인과'], ['in addition', '첨가'], ['for example', '예시']].map(([w, k]) => (
                        <div key={w} className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                          <p className="text-[13px] font-bold text-[#2277F0]">{w}</p>
                          <p className="text-[11px] text-gray-500">{k}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {scaf.mode === 'answer' && (
                  <>
                    <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed mb-3"><span className="text-[#2277F0] font-bold mr-1.5">({taught.blankNum})</span>{blankPrompt(taught.blankNum)}</p>
                    <div className="flex flex-col gap-2 md:gap-2.5">
                      {taught.choices.map((c, i) => {
                        let state: 'idle' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' | 'dimmed' = 'idle'
                        if (scafPick !== null) {
                          if (i === taught.answer) state = i === scafPick ? 'selected-correct' : 'reveal-correct'
                          else if (i === scafPick) state = 'selected-wrong'
                          else state = 'dimmed'
                        }
                        return <ChoiceCard key={i} label={LABELS[i]} text={c} state={state} disabled={scafPick !== null} onClick={() => setScafPick(i)} />
                      })}
                    </div>
                    {scafPick !== null && (
                      <div className="mt-4 rounded-2xl border border-[#BFD9FF] bg-[#F0F5FF] p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-[#1A2B4B]">박혜원 AI 강사 해설</span>
                          <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-md ${scafPick === taught.answer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{scafPick === taught.answer ? '✓ 정답' : '✕ 오답'}</span>
                        </div>
                        <p className="text-[13px] text-[#374151] leading-relaxed">{taught.explanation}</p>
                      </div>
                    )}
                  </>
                )}
                {scaf.mode === 'recap' && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-bold text-[#1A2B4B] mb-2">빈칸 ({taught.blankNum}) 풀이 흐름</p>
                    <ol className="text-[13px] text-[#475569] space-y-1.5 list-decimal pl-4">
                      <li>빈칸 앞뒤 문맥을 먼저 읽는다.</li>
                      <li>빈칸 자리의 문법(품사·태)을 정한다.</li>
                      <li>접속어·문맥 흐름으로 정답을 확정한다.</li>
                    </ol>
                    <p className="text-[12px] text-[#2277F0] font-semibold mt-3">이 흐름을 나머지 빈칸에도 그대로 적용해 실전에서 풀어봐요.</p>
                  </div>
                )}
              </div>

              {/* 단계 이동 */}
              <div className="px-5 md:px-8 py-3 border-t border-gray-100 bg-white shrink-0 flex items-center gap-2">
                <button onClick={() => goStep(-1)} disabled={lessonStep === 0}
                  className="px-4 py-3 rounded-xl text-sm font-bold text-gray-500 border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← 이전</button>
                {isLastStep ? (
                  <button onClick={goReading} className="flex-1 py-3.5 rounded-xl text-sm md:text-base font-bold bg-[#2277F0] text-white hover:bg-[#1a66d4]">실전 문제 풀기 →</button>
                ) : (
                  <button onClick={() => goStep(1)} disabled={scaf.mode === 'answer' && !scafAnswered}
                    className={`flex-1 py-3.5 rounded-xl text-sm md:text-base font-bold transition-all ${scaf.mode === 'answer' && !scafAnswered ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#2277F0] text-white hover:bg-[#1a66d4]'}`}>다음 단계 →</button>
                )}
              </div>
            </div>
          </div>

          {/* 강사 — 플로팅 위젯 ↔ 드래그 모달 (그대로) */}
          {panelOpen ? (
            <TutorChatModal
              imgSrc={TEACHER_IMG} connected={connected} connecting={connecting} isSpeaking={conversation.isSpeaking}
              chatMode={chatMode} setChatMode={setChatMode} messages={messages}
              inputText={inputText} setInputText={setInputText} onSend={sendText}
              onStartAgent={startAgent} onEndSession={() => { try { conversation.endSession() } catch { /* noop */ } }}
              lastAi={lastAi} onClose={() => setPanelOpen(false)}
              footerLabel="실전 문제 풀기 →" onFooter={goReading}
            />
          ) : (
            <TutorFloatingWidget imgSrc={TEACHER_IMG} connected={connected} isSpeaking={conversation.isSpeaking} lastAi={lastAi} onOpen={() => setPanelOpen(true)} />
          )}
        </div>
      )
    }

    return (
      <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
        <PhaseStepper active={1} onEnd={handleEnd} extra={<DrawToggleButton drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} />} />
        <DrawingOverlay {...draw} bounds={mainRef} />
        <div className="flex-1 flex flex-col-reverse lg:flex-row-reverse min-h-0">
          {/* 강사 대화창 — 접으면 미니 카드 */}
          {panelOpen && (
          <aside className="shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col h-[46%] lg:h-auto lg:w-[360px] min-h-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TEACHER_IMG} alt="박혜원" className="w-7 h-7 rounded-full object-cover object-top border border-[#2277F0]/40" />
                <span className="text-[13px] font-bold text-gray-600">박혜원 AI 강사</span>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-gray-50 rounded-full p-0.5">
                  <button onClick={() => setChatMode('text')} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${chatMode === 'text' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>텍스트</button>
                  <button onClick={() => setChatMode('voice')} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${chatMode === 'voice' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>음성</button>
                </div>
                <PanelCollapseButton onCollapse={() => setPanelOpen(false)} />
              </div>
            </div>
            {!connected ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 min-h-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TEACHER_IMG} alt="박혜원" className="w-20 h-20 rounded-full object-cover object-top border-2 border-[#2277F0]/30" />
                <p className="text-sm text-gray-500 text-center">{connecting ? '강사와 연결 중…' : '박혜원 강사와 대화를 시작해요'}</p>
                <button onClick={startAgent} disabled={connecting} className="px-5 py-3 rounded-xl bg-[#2277F0] text-white font-bold text-sm hover:bg-[#1a66d4] disabled:opacity-60">{connecting ? '연결 중…' : '▶ 강사와 대화 시작'}</button>
              </div>
            ) : chatMode === 'text' ? (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
                  {messages.length === 0 && <p className="text-center text-xs text-gray-400 mt-4">강사가 곧 말을 걸어요…</p>}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'ai' ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-[#2277F0] text-white rounded-tr-sm'}`}>{m.text}</div>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
                  <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5"><input className="w-full bg-transparent text-sm outline-none" placeholder="메시지 입력..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendText() }} /></div>
                  <button onClick={sendText} disabled={!inputText.trim()} className="w-9 h-9 bg-[#2277F0] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40" aria-label="전송"><svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg></button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-5 py-5 min-h-0">
                <div className={`w-24 h-24 rounded-full overflow-hidden border-4 mb-3 ${conversation.isSpeaking ? 'border-[#2277F0] shadow-[0_0_24px_rgba(34,119,240,0.55)]' : 'border-[#2277F0]/25'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TEACHER_IMG} alt="박혜원" className="w-full h-full object-cover object-top" />
                </div>
                <p className="text-gray-500 text-[12px] font-semibold mb-1">박혜원 AI 강사</p>
                {lastAi && <div className="bg-gray-100 rounded-xl p-3 w-full my-3 text-center max-h-24 overflow-y-auto"><p className="text-gray-600 text-[13px] leading-relaxed">{lastAi}</p></div>}
                <p className="text-gray-400 text-[11px] mt-1">{conversation.isSpeaking ? '강사가 말하는 중…' : '말하면 강사가 들어요'}</p>
                <button onClick={() => { try { conversation.endSession() } catch { /* noop */ } }} className="mt-4 text-[12px] font-semibold text-gray-400">통화 종료</button>
              </div>
            )}
            <button onClick={goReading} className="shrink-0 border-t border-gray-100 py-3 text-[13px] font-bold text-[#2277F0] hover:bg-[#2277F0]/5">실전 문제 풀기 →</button>
          </aside>
          )}
          {!panelOpen && (
            <TutorMiniCard imgSrc={TEACHER_IMG} connected={connected} isSpeaking={conversation.isSpeaking} lastAi={lastAi} onOpen={() => setPanelOpen(true)} />
          )}

          {/* 좌: 지문(위) / 빈칸 문제(아래) — 리사이즈 */}
          <div ref={mainRef} className="flex-1 flex flex-col min-h-0 bg-white">
            <div style={{ height: `${topFrac * 100}%` }} className="min-h-0">
              <PassageView passage={passage} currentBlank={q.blankNum} answeredBlanks={answeredBlanks} />
            </div>
            <div onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} className="h-4 shrink-0 flex items-center justify-center cursor-row-resize touch-none bg-gray-50 border-y border-gray-100 hover:bg-gray-100">
              <div className="w-12 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 px-5 md:px-8 pt-3 pb-2 shrink-0">
                {passage.questions.map((qq, i) => (
                  <button key={qq.blankNum} onClick={() => setLessonBlank(i)} className={`px-3 h-9 rounded-full text-xs md:text-sm font-bold ${i === lessonBlank ? 'bg-[#2277F0] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>빈칸 {qq.blankNum}</button>
                ))}
                <span className="ml-auto text-xs text-gray-400 font-medium">{lessonBlank + 1} / {total}</span>
              </div>
              <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-4 min-h-0">
                <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed mb-3"><span className="text-[#2277F0] font-bold mr-1.5">({q.blankNum})</span>{blankPrompt(q.blankNum)}</p>
                <div className="flex flex-col gap-2 md:gap-2.5">
                  {q.choices.map((c, i) => (<ChoiceCard key={i} label={LABELS[i]} text={c} state="idle" disabled onClick={() => {}} />))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 실전 ──
  if (phase !== 'summary') {
    const q = passage.questions[qIndex]
    const select = (choiceIdx: number) => { if (answers[q.blankNum] !== undefined) return; setAnswers((a) => ({ ...a, [q.blankNum]: choiceIdx })) }
    const goNext = () => { if (!isLast) setQIndex(qIndex + 1); else setPhase('summary') }
    return (
      <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
        <PhaseStepper active={2} onEnd={handleEnd} extra={<DrawToggleButton drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} />} />
        <DrawingOverlay {...draw} />
        {/* 태블릿 가로/PC: 좌 지문 / 우 문항 */}
        <div className="hidden lg:flex flex-1 flex-row min-h-0">
          <div className="w-[48%] border-r border-gray-100 bg-white min-h-0"><PassageView passage={passage} currentBlank={q.blankNum} answeredBlanks={answeredBlanks} /></div>
          <div className="flex-1 bg-white min-h-0"><QuestionView passage={passage} qIndex={qIndex} setQIndex={setQIndex} answers={answers} onSelect={select} onNext={goNext} isLast={isLast} /></div>
        </div>
        {/* 모바일/세로: 지문 위 + 문항 아래 */}
        <div className="flex-1 flex flex-col min-h-0 lg:hidden">
          <div className="h-[38%] shrink-0 border-b border-gray-100 bg-white"><PassageView passage={passage} currentBlank={q.blankNum} answeredBlanks={answeredBlanks} /></div>
          <div className="flex-1 min-h-0 bg-white"><QuestionView passage={passage} qIndex={qIndex} setQIndex={setQIndex} answers={answers} onSelect={select} onNext={goNext} isLast={isLast} /></div>
        </div>
      </div>
    )
  }

  // ── 정리 ──
  const correct = passage.questions.filter((qq) => answers[qq.blankNum] === qq.answer).length
  const results = SUMMARY_CARDS.map((c, i) => c.accept.some((a) => summaryInputs[i].replace(/\s/g, '').includes(a)))
  const allFilled = summaryInputs.every((s) => s.trim().length > 0)
  const correctCount = results.filter(Boolean).length
  return (
    <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
      <PhaseStepper active={3} onEnd={handleEnd} />
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TEACHER_IMG} alt="박혜원" className="w-12 h-12 rounded-full object-cover object-top border-2 border-[#2277F0]/30" />
            <div className="flex-1 min-w-0"><h2 className="text-lg md:text-xl font-bold text-[#1A2B4B]">오늘 수업 완료!</h2><p className="text-xs md:text-sm text-gray-500">Part 6 장문 공란 · 실전 {correct}/{total} 정답</p></div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2277F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <p className="text-sm md:text-base font-bold text-[#1A2B4B]">핵심 요약 — 빈칸을 채워보세요</p>
          </div>
          <div className="space-y-3 mb-6">
            {SUMMARY_CARDS.map((c, i) => {
              const ok = results[i]
              return (
                <div key={i} className={`rounded-2xl border p-4 ${summaryChecked ? (ok ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50') : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#D6EAFF] text-[#2277F0] text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <p className="text-sm md:text-base text-[#1A2B4B] leading-loose">
                      {c.before}
                      {summaryChecked
                        ? <span className={`font-bold ${ok ? 'text-green-700' : 'text-red-500 line-through'}`}>{summaryInputs[i].trim() || '　'}</span>
                        : <input value={summaryInputs[i]} onChange={(e) => setSummaryInputs((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))} className="mx-1 w-28 text-center border-b-2 border-[#2277F0] bg-[#EFF6FF] rounded-sm px-1 py-0.5 font-bold text-[#2277F0] outline-none" placeholder="빈칸" />}
                      {summaryChecked && !ok && <span className="font-bold text-green-700 mx-1">→ {c.blank}</span>}
                      {c.after}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          {!summaryChecked ? (
            <button onClick={() => { setSummaryChecked(true); void speakTTS(CLOSING_SUMMARY_SCRIPT, persona) }} disabled={!allFilled} className={`w-full py-4 rounded-2xl font-bold text-base md:text-lg ${allFilled ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>채점하기</button>
          ) : (
            <>
              <p className="text-center text-sm font-bold text-[#2277F0] mb-3">요약 {correctCount}/{SUMMARY_CARDS.length} 정답!</p>
              <div className="rounded-2xl border border-[#BFD9FF] bg-[#F0F5FF] p-4 md:p-5 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={INSTRUCTOR_PHOTO} alt="박혜원" className="w-12 h-12 rounded-full object-cover object-top border-2 border-[#2277F0]/40" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold text-[#1A2B4B]">박혜원 AI 강사</p><p className="text-[11px] text-[#2277F0] font-semibold">오늘 학습 마무리 🎓</p></div>
                  <button onClick={() => void speakTTS(CLOSING_SUMMARY_SCRIPT, persona)} className="w-9 h-9 rounded-full bg-white border border-[#BFD9FF] flex items-center justify-center text-[#2277F0]" title="다시 듣기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></svg></button>
                </div>
                <p className="text-sm md:text-[15px] text-[#374151] leading-relaxed">{CLOSING_SUMMARY_SCRIPT}</p>
              </div>
              <button onClick={() => { stopCurrentAudio(); handleEnd() }} className="w-full py-4 rounded-2xl bg-[#2277F0] text-white font-bold text-base md:text-lg hover:bg-[#1a66d4]">학습 마치기 →</button>
              <button onClick={() => { stopCurrentAudio(); setSummaryChecked(false); setSummaryInputs(['', '', '']) }} className="w-full mt-2 py-3 text-sm font-bold text-gray-400 hover:text-gray-600">다시 채우기</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
