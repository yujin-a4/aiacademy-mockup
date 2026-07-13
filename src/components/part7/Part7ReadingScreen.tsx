'use client'

/* Part 7 장문 독해 — 도입 → 수업 → 실전
   · 도입: LessonIntro (강사 인트로)
   · 수업: [좌] 문제 지문/보기 (상하 리사이즈 + 필기) / [우] 강사 대화창
           강사 = ElevenLabs 실시간 에이전트. 텍스트 모드=채팅 / 음성 모드=통화 (같은 세션)
   · 실전: 좌 지문 / 우 Q1~Q5 혼자 풀기
   색: 목업 #2277F0. */

import React, { useEffect, useRef, useState } from 'react'
import { P7_PASSAGES, type P7Passage } from '@/data/rcData'
import { PART7_SETS } from '@/data/part7Scenario'
import { useDbQuestionsByPassage, toPart7Set, toP7Passage, Q_ANCHORS } from '@/data/db/questionStore'
import LessonIntro from '@/components/lesson/LessonIntro'
import { speakTTS, stopCurrentAudio } from '@/lib/tts'
import { useClassroomStore } from '@/store/classroomStore'
import { useDrawingTool, DrawingOverlay, DrawToggleButton } from '@/components/DrawingOverlay'
import { useConversation } from '@11labs/react'
import TutorMiniCard, { PanelCollapseButton } from '@/components/lesson/TutorMiniCard'
import { TutorChatModal, TutorFloatingWidget } from '@/components/lesson/TutorModal'

const LABELS = ['A', 'B', 'C', 'D']
const TEACHER_IMG = '/image_reference/park-2.jpg'

const P7_INTRO_SCRIPT =
  '안녕하세요! 오늘은 Part 7 장문 독해를 배울 거예요. 지문을 다 읽기 전에 질문부터 파악하고, 지문에서 근거 문장을 찾아 정답을 고르는 전략을 익혀볼게요. 준비됐죠? 😊'
const P7_INTRO_POINTS = [
  { text: "질문부터 읽고 '무엇을 묻는지' 파악하기" },
  { text: '지문에서 근거 문장 찾기' },
  { text: '오답 소거로 정답 확정하기' },
]

/* 정리 단계 — 핵심 요약 3개 빈칸 채우기 */
const SUMMARY_CARDS = [
  { before: '장문 독해는 지문을 다 읽기 전에 ', blank: '질문', after: '부터 확인한다.', accept: ['질문', '문제'] },
  { before: '질문에서 묻는 내용의 ', blank: '근거', after: ' 문장을 지문에서 찾는다.', accept: ['근거', '단서'] },
  { before: '정답이 애매할 땐 ', blank: '오답', after: '을 하나씩 소거해 확정한다.', accept: ['오답'] },
]
const INSTRUCTOR_PHOTO = '/image_reference/park-3.jpg'
const CLOSING_SUMMARY_SCRIPT =
  '오늘 정말 잘했어요! 장문 독해의 핵심은 세 가지예요. 첫째, 지문을 다 읽기 전에 질문부터 확인하기. 둘째, 질문이 묻는 내용의 근거 문장을 지문에서 찾기. 셋째, 답이 애매할 땐 오답을 하나씩 소거하기. 이 순서만 기억하면 Part 7이 훨씬 쉬워질 거예요. 수고 많았어요!'

/* 수업 = ElevenLabs 실시간 에이전트 */
const AGENT_ID = 'agent_2501kt0w00khfrr8869g2z5vnpaz'
const STUDENT_VARS: Record<string, string> = {
  user_name: '지윤',
  target_score: '900',
  study_range: '파트 세븐 장문 독해',
  exam_date: '다음 달',
  daily_time: '하루 한 시간',
  learning_style: '집중형',
  management_style: '주도형',
  motivation_type: '목표 달성형',
  instructor_greeting: '자, 오늘은 파트 세븐 백사십팔 번 문제 같이 풀어볼 거야. 차를 왜 파는지 묻는 문제야. 준비됐지? 바로 시작하자.',
}

/* 수업 지문·문제 = 에이전트가 가르치는 세트 (중고차, 147·148) — DB 로드 실패 시 폴백 */
const FALLBACK_LESSON_SET = PART7_SETS[0]

interface Props {
  onEnd?: () => void
  /** 'side'(기본) = 우측 강사 패널 / 'split' = 지문 좌·문제 우 분할 + 강사 모달 (UI 실험) */
  variant?: 'side' | 'split'
}

/* ── 상단 phase 스텝퍼 ── */
function PhaseStepper({ active, onEnd, extra }: { active: number; onEnd: () => void; extra?: React.ReactNode }) {
  const labels = ['도입', '수업', '실전', '정리']
  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 shrink-0">
      <button onClick={onEnd} className="p-1" aria-label="뒤로">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-7 md:h-7"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <div className="flex items-center gap-1.5 md:gap-2.5">
        {labels.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5 md:gap-2.5">
            <div className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full text-[11px] md:text-[15px] font-bold ${
              i === active ? 'bg-[#2277F0] text-white' : i < active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}>
              {label}
            </div>
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

/* ── 지문 뷰 (실전 좌측) ── */
function PassageView({ passage }: { passage: P7Passage }) {
  return (
    <div className="h-full overflow-y-auto px-5 md:px-8 py-5 md:py-6">
      <div className="inline-flex items-center gap-2 mb-4">
        <span className="bg-[#2277F0]/10 text-[#2277F0] text-xs md:text-sm font-bold px-3 py-1 rounded-full">지문</span>
        <span className="text-xs md:text-sm text-gray-400">{passage.title}</span>
      </div>
      <p className="whitespace-pre-line leading-relaxed text-[#1A2B4B] text-sm md:text-base">{passage.passage}</p>
    </div>
  )
}

/* ── 선택지 카드 ── */
function ChoiceCard({ label, text, state, onClick, disabled }: {
  label: string
  text: string
  state: 'idle' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' | 'dimmed'
  onClick: () => void
  disabled: boolean
}) {
  const box = {
    idle: 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#2277F0]/50 hover:bg-[#2277F0]/5',
    'selected-correct': 'bg-green-50 border-green-400 text-green-800',
    'selected-wrong': 'bg-red-50 border-red-400 text-red-800',
    'reveal-correct': 'bg-green-50 border-green-400 text-green-800',
    dimmed: 'bg-gray-50 border-gray-100 text-gray-400',
  }[state]
  const badge = {
    idle: 'bg-gray-200 text-gray-500',
    'selected-correct': 'bg-green-500 text-white',
    'selected-wrong': 'bg-red-500 text-white',
    'reveal-correct': 'bg-green-500 text-white',
    dimmed: 'bg-gray-200 text-gray-400',
  }[state]
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl border text-left transition-all text-sm md:text-base ${box}`}>
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

/* ── 실전: 문항 뷰 ── */
function QuestionView({ passage, qIndex, setQIndex, answers, onSelect, onNext, isLast }: {
  passage: P7Passage
  qIndex: number
  setQIndex: (i: number) => void
  answers: Record<number, number>
  onSelect: (choiceIdx: number) => void
  onNext: () => void
  isLast: boolean
}) {
  const q = passage.questions[qIndex]
  const selected = answers[q.id]
  const answered = selected !== undefined
  const isCorrect = answered && selected === q.answer
  const answeredCount = passage.questions.filter((qq) => answers[qq.id] !== undefined).length

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 border-b border-gray-100 shrink-0 overflow-x-auto">
        {passage.questions.map((qq, i) => {
          const ans = answers[qq.id]
          const active = i === qIndex
          const tabCls = active
            ? 'bg-[#2277F0] text-white'
            : ans === undefined ? 'bg-gray-100 text-gray-400'
            : ans === qq.answer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          return (
            <button key={qq.id} onClick={() => setQIndex(i)}
              className={`shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full text-xs md:text-sm font-bold transition-all ${tabCls}`}>
              Q{i + 1}
            </button>
          )
        })}
        <span className="ml-auto shrink-0 text-xs md:text-sm text-gray-400 font-medium">{answeredCount}/{passage.questions.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 min-h-0">
        <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed mb-4">
          <span className="text-[#2277F0] font-bold mr-1.5">Q{qIndex + 1}.</span>{q.question}
        </p>
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
              <span className={`ml-auto text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-md ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isCorrect ? '✓ 정답' : '✕ 오답'}
              </span>
            </div>
            <p className="text-[13px] md:text-[15px] text-[#374151] leading-relaxed">{q.explanation}</p>
          </div>
        )}
      </div>

      <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 bg-white shrink-0">
        <button onClick={onNext} disabled={!answered}
          className={`w-full py-3.5 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-lg font-bold transition-all ${
            answered ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4] active:scale-[0.99]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}>
          {isLast ? '완료하기 →' : '다음 문제 →'}
        </button>
      </div>
    </div>
  )
}

export default function Part7ReadingScreen({ onEnd, variant = 'side' }: Props) {
  // 문항(수업 세트 + 실전 지문)은 Supabase DB에서 로드 (실패 시 하드코딩 폴백)
  const LESSON_SET = useDbQuestionsByPassage(
    Q_ANCHORS.p7CarAd,
    (rows) => toPart7Set(rows, FALLBACK_LESSON_SET),
    FALLBACK_LESSON_SET,
  )
  const passage = useDbQuestionsByPassage(
    Q_ANCHORS.p7Greenwood,
    (rows) => toP7Passage(rows, P7_PASSAGES[0]),
    P7_PASSAGES[0],
  )
  const persona = useClassroomStore((s) => s.persona)
  const [phase, setPhase] = useState<'intro' | 'lesson' | 'reading' | 'summary'>('intro')

  // 실전 상태
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [mobileView, setMobileView] = useState<'passage' | 'question'>('passage')

  // 수업 상태
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text')
  const [panelOpen, setPanelOpen] = useState(variant !== 'split') // side: 패널 열림 / split: 위젯부터
  const [inputText, setInputText] = useState('')
  const [lessonQIndex, setLessonQIndex] = useState(0) // 수업 문항 전환 (147/148)
  const [topFrac, setTopFrac] = useState(0.4) // 지문 40% / 문제·보기 60% (보기 4개 기본 노출)
  const [leftFrac, setLeftFrac] = useState(0.5) // split: 지문(좌) 폭 비율

  // 정리 상태 (요약 빈칸)
  const [summaryInputs, setSummaryInputs] = useState(['', '', ''])
  const [summaryChecked, setSummaryChecked] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)

  // 필기 도구
  const draw = useDrawingTool()

  // 수업 대화 — ElevenLabs 실시간 에이전트 (텍스트/음성 공통 세션)
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([])
  const conversation = useConversation({
    // 텍스트 모드에서는 마이크를 음소거 → 입력은 오직 텍스트로만
    micMuted: chatMode === 'text',
    onMessage: (p: { source: string; message: string }) =>
      setMessages((prev) => [...prev, { role: p.source === 'user' ? 'user' : 'ai', text: p.message }]),
  })
  const connected = conversation.status === 'connected'
  const connecting = conversation.status === 'connecting'

  const handleEnd = onEnd ?? (() => window.history.back())
  const isLast = qIndex === passage.questions.length - 1

  // 도입 발화
  const introPlayedRef = useRef(false)
  useEffect(() => {
    if (phase !== 'intro' || introPlayedRef.current) return
    introPlayedRef.current = true
    void speakTTS(P7_INTRO_SCRIPT, persona)
    return () => stopCurrentAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // 수업을 벗어나면 에이전트 세션 종료
  useEffect(() => {
    if (phase !== 'lesson' && conversation.status !== 'disconnected') {
      try { conversation.endSession() } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])
  useEffect(() => () => { try { conversation.endSession() } catch { /* noop */ } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'intro') {
    return (
      <LessonIntro
        tag="Part 7 장문 독해"
        script={P7_INTRO_SCRIPT}
        points={P7_INTRO_POINTS}
        onStart={() => { stopCurrentAudio(); setMessages([]); setPhase('lesson') }}
        onEnd={handleEnd}
      />
    )
  }

  // ── 수업 단계 ──
  if (phase === 'lesson') {
    const lastAi = [...messages].reverse().find((m) => m.role === 'ai')?.text ?? ''
    const startAgent = () => { setMessages([]); conversation.startSession({ agentId: AGENT_ID, dynamicVariables: STUDENT_VARS }).catch(() => {}) }
    const sendText = () => {
      const t = inputText.trim()
      if (!t || !connected) return
      conversation.sendUserMessage(t)
      setInputText('')
    }
    const goReading = () => { try { conversation.endSession() } catch { /* noop */ } stopCurrentAudio(); setPhase('reading') }
    const onResizeStart = (e: React.PointerEvent) => {
      resizingRef.current = true
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
    }
    const onResizeMove = (e: React.PointerEvent) => {
      if (!resizingRef.current || !mainRef.current) return
      const r = mainRef.current.getBoundingClientRect()
      const f = (e.clientY - r.top) / r.height
      setTopFrac(Math.min(0.8, Math.max(0.25, f)))
    }
    const onResizeEnd = () => { resizingRef.current = false }
    const onHResizeMove = (e: React.PointerEvent) => {
      if (!resizingRef.current || !mainRef.current) return
      const r = mainRef.current.getBoundingClientRect()
      setLeftFrac(Math.min(0.75, Math.max(0.25, (e.clientX - r.left) / r.width)))
    }

    // ── split 변형: 지문 좌 / 문제·보기 우 + 강사는 플로팅 위젯 → 드래그 모달 ──
    if (variant === 'split') {
      const lq = LESSON_SET.questions[lessonQIndex]
      return (
        <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
          <PhaseStepper active={1} onEnd={handleEnd} extra={<DrawToggleButton drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} />} />
          <DrawingOverlay {...draw} bounds={mainRef} />
          <div ref={mainRef} className="flex-1 flex flex-col lg:flex-row min-h-0 bg-white">
            {/* 좌: 지문 */}
            <div className="h-[45%] lg:h-full min-h-0 overflow-y-auto px-5 md:px-8 py-4 md:py-5 lg:w-[var(--lf)] border-b lg:border-b-0 border-gray-100" style={{ ['--lf' as string]: `${leftFrac * 100}%` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#2277F0]/10 text-[#2277F0] text-xs md:text-sm font-bold px-3 py-1 rounded-full">지문</span>
                <span className="text-xs md:text-sm text-gray-400">{LESSON_SET.questionRange}</span>
              </div>
              <p className="text-[11px] md:text-xs text-gray-400 italic mb-3">{LESSON_SET.questionRange} refer to the following {LESSON_SET.passageType}.</p>
              <p className="whitespace-pre-line leading-relaxed text-[#1A2B4B] text-sm md:text-base">{LESSON_SET.passage}</p>
            </div>
            {/* 가운데 세로 리사이즈 핸들 (데스크탑) */}
            <div onPointerDown={onResizeStart} onPointerMove={onHResizeMove} onPointerUp={onResizeEnd}
              className="hidden lg:flex w-4 shrink-0 items-center justify-center cursor-col-resize touch-none bg-gray-50 border-x border-gray-100 hover:bg-gray-100">
              <div className="h-12 w-1 rounded-full bg-gray-300" />
            </div>
            {/* 우: 문제 — 문항 버튼(147/148)으로 전환 */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 px-5 md:px-8 pt-3 pb-2 shrink-0">
                {LESSON_SET.questions.map((qq, i) => (
                  <button key={qq.number} onClick={() => setLessonQIndex(i)}
                    className={`px-3.5 h-9 rounded-full text-xs md:text-sm font-bold transition-all ${i === lessonQIndex ? 'bg-[#2277F0] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                    {qq.number}번
                  </button>
                ))}
                <span className="ml-auto text-xs text-gray-400 font-medium">{lessonQIndex + 1} / {LESSON_SET.questions.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-4 min-h-0">
                <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed mb-3">
                  <span className="text-[#2277F0] font-bold mr-1.5">{lq.number}.</span>{lq.text}
                </p>
                <div className="flex flex-col gap-2 md:gap-2.5">
                  {lq.choices.map((c) => (
                    <ChoiceCard key={c.id} label={c.id} text={c.text} state="idle" disabled onClick={() => {}} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 강사 — 플로팅 위젯 ↔ 드래그 모달 */}
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
          {/* 강사 대화창 (우 / 모바일 하단) — 접으면 미니 카드 */}
          {panelOpen && (
          <aside className="shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col h-[46%] lg:h-auto lg:w-[360px] min-h-0">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TEACHER_IMG} alt="박혜원" className="w-7 h-7 rounded-full object-cover object-top border border-[#2277F0]/40" />
                <span className="text-[13px] font-bold text-gray-600">박혜원 AI 강사</span>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-gray-50 rounded-full p-0.5">
                  <button onClick={() => setChatMode('text')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${chatMode === 'text' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M8 16h8" /></svg>
                    텍스트
                  </button>
                  <button onClick={() => setChatMode('voice')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${chatMode === 'voice' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" /></svg>
                    음성
                  </button>
                </div>
                <PanelCollapseButton onCollapse={() => setPanelOpen(false)} />
              </div>
            </div>

            {/* 본문 */}
            {!connected ? (
              /* 연결 전 — 공통 CTA */
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 min-h-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TEACHER_IMG} alt="박혜원" className="w-20 h-20 rounded-full object-cover object-top border-2 border-[#2277F0]/30" />
                <p className="text-sm text-gray-500 text-center">{connecting ? '강사와 연결 중…' : '박혜원 강사와 대화를 시작해요'}</p>
                <button onClick={startAgent} disabled={connecting}
                  className="px-5 py-3 rounded-xl bg-[#2277F0] text-white font-bold text-sm hover:bg-[#1a66d4] disabled:opacity-60">
                  {connecting ? '연결 중…' : '▶ 강사와 대화 시작'}
                </button>
              </div>
            ) : chatMode === 'text' ? (
              /* 텍스트 채팅 */
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
                  <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5">
                    <input className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none" placeholder="메시지 입력..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendText() }} />
                  </div>
                  <button onClick={sendText} disabled={!inputText.trim()} className="w-9 h-9 bg-[#2277F0] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40" aria-label="전송">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                  </button>
                </div>
              </>
            ) : (
              /* 음성 통화 */
              <div className="flex-1 flex flex-col items-center justify-center px-5 py-5 min-h-0">
                <div className={`w-24 h-24 rounded-full overflow-hidden border-4 mb-3 transition-all ${conversation.isSpeaking ? 'border-[#2277F0] shadow-[0_0_24px_rgba(34,119,240,0.55)]' : 'border-[#2277F0]/25'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TEACHER_IMG} alt="박혜원" className="w-full h-full object-cover object-top" />
                </div>
                <p className="text-gray-500 text-[12px] font-semibold mb-1">박혜원 AI 강사</p>
                {lastAi && (
                  <div className="bg-gray-100 rounded-xl p-3 w-full my-3 text-center max-h-24 overflow-y-auto">
                    <p className="text-gray-600 text-[13px] leading-relaxed">{lastAi}</p>
                  </div>
                )}
                <p className="text-gray-400 text-[11px] mt-1">{conversation.isSpeaking ? '강사가 말하는 중…' : '말하면 강사가 들어요'}</p>
                <button onClick={() => { try { conversation.endSession() } catch { /* noop */ } }} className="mt-4 text-[12px] font-semibold text-gray-400">통화 종료</button>
              </div>
            )}

            {/* 실전 이동 */}
            <button onClick={goReading} className="shrink-0 border-t border-gray-100 py-3 text-[13px] font-bold text-[#2277F0] hover:bg-[#2277F0]/5">
              실전 문제 풀기 →
            </button>
          </aside>
          )}
          {!panelOpen && (
            <TutorMiniCard imgSrc={TEACHER_IMG} connected={connected} isSpeaking={conversation.isSpeaking} lastAi={lastAi} onOpen={() => setPanelOpen(true)} />
          )}

          {/* 좌: 문제 지문(위) / 보기(아래) — 드래그 리사이즈 */}
          <div ref={mainRef} className="flex-1 flex flex-col min-h-0 bg-white">
            <div style={{ height: `${topFrac * 100}%` }} className="overflow-y-auto px-5 md:px-8 py-4 md:py-5 min-h-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#2277F0]/10 text-[#2277F0] text-xs md:text-sm font-bold px-3 py-1 rounded-full">지문</span>
                <span className="text-xs md:text-sm text-gray-400">{LESSON_SET.questionRange}</span>
              </div>
              {/* 지시문 */}
              <p className="text-[11px] md:text-xs text-gray-400 italic mb-3">{LESSON_SET.questionRange} refer to the following {LESSON_SET.passageType}.</p>
              <p className="whitespace-pre-line leading-relaxed text-[#1A2B4B] text-sm md:text-base">{LESSON_SET.passage}</p>
            </div>

            <div onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd}
              className="h-4 shrink-0 flex items-center justify-center cursor-row-resize touch-none bg-gray-50 border-y border-gray-100 hover:bg-gray-100">
              <div className="w-12 h-1 rounded-full bg-gray-300" />
            </div>

            {/* 문제 — 문항 버튼(147/148)으로 전환 */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 px-5 md:px-8 pt-3 pb-2 shrink-0">
                {LESSON_SET.questions.map((qq, i) => (
                  <button key={qq.number} onClick={() => setLessonQIndex(i)}
                    className={`px-3.5 h-9 rounded-full text-xs md:text-sm font-bold transition-all ${i === lessonQIndex ? 'bg-[#2277F0] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                    {qq.number}번
                  </button>
                ))}
                <span className="ml-auto text-xs text-gray-400 font-medium">{lessonQIndex + 1} / {LESSON_SET.questions.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-4 min-h-0">
                <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed mb-3">
                  <span className="text-[#2277F0] font-bold mr-1.5">{LESSON_SET.questions[lessonQIndex].number}.</span>{LESSON_SET.questions[lessonQIndex].text}
                </p>
                <div className="flex flex-col gap-2 md:gap-2.5">
                  {LESSON_SET.questions[lessonQIndex].choices.map((c) => (
                    <ChoiceCard key={c.id} label={c.id} text={c.text} state="idle" disabled onClick={() => {}} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 정리 단계 (핵심 요약 빈칸 채우기) ──
  if (phase === 'summary') {
    const total = passage.questions.length
    const correct = passage.questions.filter((qq) => answers[qq.id] === qq.answer).length
    const results = SUMMARY_CARDS.map((c, i) => c.accept.some((a) => summaryInputs[i].replace(/\s/g, '').includes(a)))
    const allFilled = summaryInputs.every((s) => s.trim().length > 0)
    const correctCount = results.filter(Boolean).length
    return (
      <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
        <PhaseStepper active={3} onEnd={handleEnd} />
        <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-6">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            {/* 헤더 + 실전 결과 */}
            <div className="flex items-center gap-3 mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TEACHER_IMG} alt="박혜원" className="w-12 h-12 rounded-full object-cover object-top border-2 border-[#2277F0]/30" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-[#1A2B4B]">오늘 수업 완료!</h2>
                <p className="text-xs md:text-sm text-gray-500">Part 7 장문 독해 · 실전 {correct}/{total} 정답</p>
              </div>
            </div>

            {/* 핵심 요약 빈칸 */}
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2277F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              <p className="text-sm md:text-base font-bold text-[#1A2B4B]">핵심 요약 — 빈칸을 채워보세요</p>
            </div>
            <div className="space-y-3 mb-6">
              {SUMMARY_CARDS.map((c, i) => {
                const ok = results[i]
                return (
                  <div key={i} className={`rounded-2xl border p-4 transition-colors ${summaryChecked ? (ok ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50') : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[#D6EAFF] text-[#2277F0] text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <p className="text-sm md:text-base text-[#1A2B4B] leading-loose">
                        {c.before}
                        {summaryChecked ? (
                          <span className={`font-bold ${ok ? 'text-green-700' : 'text-red-500 line-through'}`}>{summaryInputs[i].trim() || '　'}</span>
                        ) : (
                          <input
                            value={summaryInputs[i]}
                            onChange={(e) => setSummaryInputs((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                            className="mx-1 w-24 text-center border-b-2 border-[#2277F0] bg-[#EFF6FF] rounded-sm px-1 py-0.5 font-bold text-[#2277F0] outline-none"
                            placeholder="빈칸"
                          />
                        )}
                        {summaryChecked && !ok && <span className="font-bold text-green-700 mx-1">→ {c.blank}</span>}
                        {c.after}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {!summaryChecked ? (
              <button onClick={() => { setSummaryChecked(true); void speakTTS(CLOSING_SUMMARY_SCRIPT, persona) }} disabled={!allFilled}
                className={`w-full py-4 rounded-2xl font-bold text-base md:text-lg transition-all ${allFilled ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4] active:scale-[0.99]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                채점하기
              </button>
            ) : (
              <>
                <p className="text-center text-sm font-bold text-[#2277F0] mb-3">요약 {correctCount}/{SUMMARY_CARDS.length} 정답!</p>

                {/* AI 강사 마무리 코너 */}
                <div className="rounded-2xl border border-[#BFD9FF] bg-[#F0F5FF] p-4 md:p-5 mb-5">
                  <div className="flex items-center gap-3 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={INSTRUCTOR_PHOTO} alt="박혜원" className="w-12 h-12 rounded-full object-cover object-top border-2 border-[#2277F0]/40" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1A2B4B]">박혜원 AI 강사</p>
                      <p className="text-[11px] text-[#2277F0] font-semibold">오늘 학습 마무리 🎓</p>
                    </div>
                    <button onClick={() => void speakTTS(CLOSING_SUMMARY_SCRIPT, persona)} title="다시 듣기" className="w-9 h-9 rounded-full bg-white border border-[#BFD9FF] flex items-center justify-center text-[#2277F0] hover:bg-[#EFF6FF]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                    </button>
                  </div>
                  <p className="text-sm md:text-[15px] text-[#374151] leading-relaxed">{CLOSING_SUMMARY_SCRIPT}</p>
                </div>

                <button onClick={() => { stopCurrentAudio(); handleEnd() }} className="w-full py-4 rounded-2xl bg-[#2277F0] text-white font-bold text-base md:text-lg hover:bg-[#1a66d4] active:scale-[0.99]">학습 마치기 →</button>
                <button onClick={() => { stopCurrentAudio(); setSummaryChecked(false); setSummaryInputs(['', '', '']) }} className="w-full mt-2 py-3 text-sm font-bold text-gray-400 hover:text-gray-600">다시 채우기</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 실전 단계 ──
  const select = (choiceIdx: number) => {
    const cq = passage.questions[qIndex]
    if (answers[cq.id] !== undefined) return
    setAnswers((a) => ({ ...a, [cq.id]: choiceIdx }))
  }
  const goNext = () => {
    if (!isLast) { setQIndex(qIndex + 1); setMobileView('question') }
    else setPhase('summary')
  }

  return (
    <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
      <PhaseStepper active={2} onEnd={handleEnd} extra={<DrawToggleButton drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} />} />
      <DrawingOverlay {...draw} />

      {/* 폰 / 태블릿 세로: [지문 | 문제] 토글 */}
      <div className="flex-1 flex flex-col min-h-0 lg:hidden">
        <div className="flex items-center gap-1 bg-white px-4 md:px-6 pt-3 shrink-0">
          {(['passage', 'question'] as const).map((v) => (
            <button key={v} onClick={() => setMobileView(v)}
              className={`flex-1 py-2.5 md:py-3 text-sm md:text-base font-bold border-b-2 transition-all ${
                mobileView === v ? 'text-[#2277F0] border-[#2277F0]' : 'text-gray-400 border-transparent'
              }`}>
              {v === 'passage' ? '지문' : '문제'}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 bg-white">
          {mobileView === 'passage'
            ? <PassageView passage={passage} />
            : <QuestionView passage={passage} qIndex={qIndex} setQIndex={setQIndex} answers={answers} onSelect={select} onNext={goNext} isLast={isLast} />}
        </div>
      </div>

      {/* 태블릿 가로 / PC: 좌 지문 / 우 문항 */}
      <div className="hidden lg:flex flex-1 flex-row min-h-0">
        <div className="w-[48%] border-r border-gray-100 bg-white min-h-0">
          <PassageView passage={passage} />
        </div>
        <div className="flex-1 bg-white min-h-0">
          <QuestionView passage={passage} qIndex={qIndex} setQIndex={setQIndex} answers={answers} onSelect={select} onNext={goNext} isLast={isLast} />
        </div>
      </div>
    </div>
  )
}
