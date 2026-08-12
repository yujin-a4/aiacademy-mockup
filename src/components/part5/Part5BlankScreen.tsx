'use client'

/* Part 5 단문 공란 — 도입 → 수업(좌: 문장+빈칸 / 우: 강사 대화창) → 실전 → 정리
   원래 lessonScenario.ts 데이터 그대로 사용 (도입 멘트·문제·요약·마무리 멘트 전부 원본). 색: #2277F0. */

import React, { useEffect, useRef, useState } from 'react'
import { SCREEN1_PROBLEM, SCREEN3_PROBLEMS, SCREEN4_CARDS, buildTurns } from '@/data/lessonScenario'
import { useDbQuestions, toBlankProblem, Q_CODES, useStableCodes } from '@/data/db/questionStore'
import LessonIntro from '@/components/lesson/LessonIntro'
import { speakTTS, stopCurrentAudio } from '@/lib/tts'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useDrawingTool, DrawingOverlay, DrawToggleButton } from '@/components/DrawingOverlay'
import { useConversation } from '@11labs/react'
import TutorMiniCard, { PanelCollapseButton } from '@/components/lesson/TutorMiniCard'

const TEACHER_IMG = '/image_reference/park-2.jpg'
const INSTRUCTOR_PHOTO = '/image_reference/park-3.jpg'
const AGENT_ID = 'agent_2501kt0w00khfrr8869g2z5vnpaz'
const TUTOR_QUESTION_CODE = 'RC-P5-08-Q002' // Supabase questions.question_code — 수동태 (technical issues)
const STUDENT_ID = 'demo'

/*
 * 수업 흐름(S1~S7 rail)·정오판정·단계전진·힌트는 전부 백엔드(/api/tutor)가 소유한다.
 * 이 화면은 학생 발화를 엔진에 보내고, 돌려받은 directive를 에이전트에 주입(말투 렌더)만 한다.
 * (이전의 정규식 텍스트 트리거 실험은 "지금 무슨 질문 중인지"를 텍스트에서 추론해야 해서
 *  무관한 문장에서 오탐이 났음 — /api/tutor의 세션 stepIdx가 상태를 갖는 이 방식으로 대체.)
 */
async function callTutor(payload: Record<string, unknown>): Promise<{ contextual?: string; sessionId?: string; done?: boolean; quickReplies?: string[] }> {
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return {}
  return res.json()
}

/* 실전 문제(SCREEN3_PROBLEMS)에 원본 words/blankIndex 방식 그대로 사용 */
type P5Question = typeof SCREEN3_PROBLEMS[number]
const LESSON_QUESTION: P5Question = {
  number: '1단계',
  words: SCREEN1_PROBLEM.words,
  blankIndex: SCREEN1_PROBLEM.blankIndex,
  correctAnswer: SCREEN1_PROBLEM.correctAnswer,
  choices: SCREEN1_PROBLEM.choices,
  explanation: '주어(issues)가 복수이므로 단수형 was handled는 제외. 문제(issues)가 처리되는 대상이므로 수동태 were handled가 정답이에요.',
}

const P5_INTRO_POINTS = [
  { text: '주어와 행위의 관계(능동/수동) 확인하기' },
  { text: '동사 뒤 목적어 유무로 태 판별하기' },
  { text: '주어의 수와 시간 부사로 시제 확정하기' },
]
/* 원본 마무리 멘트 (s5_closing) */
const CLOSING_SUMMARY_SCRIPT = '수고했어. 오늘 배운 거 요약 노트로 저장해둬. 나중에 헷갈릴 때 꺼내봐. MY PAGE에 쌓이니까 틈틈이 복습해.'

const STUDENT_VARS: Record<string, string> = {
  user_name: '지윤', target_score: '900', study_range: '파트 파이브 수동태',
  exam_date: '다음 달', daily_time: '하루 한 시간', learning_style: '집중형', management_style: '주도형', motivation_type: '목표 달성형',
  instructor_greeting: '자, 오늘은 파트 파이브 수동태를 같이 풀어보자. 빈칸 하나씩 짚어줄게. 시작하자.',
}

interface Props { onEnd?: () => void }

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

/* 문장 (words 배열 + blankIndex 기준으로 빈칸 렌더) */
function SentenceView({ q, filledText }: { q: P5Question; filledText?: string }) {
  return (
    <p className="text-base md:text-xl leading-loose text-[#1A2B4B] font-medium">
      {q.words.map((w, i) => (
        <span key={i}>
          {i === q.blankIndex ? (
            <span className={`inline-block min-w-[110px] text-center font-bold px-2 py-0.5 rounded border-b-2 mx-1 ${filledText ? 'border-[#2277F0] text-[#2277F0] bg-[#EFF6FF]' : 'border-gray-300 text-transparent'}`}>{filledText || '　'}</span>
          ) : (
            <>{w}{' '}</>
          )}
        </span>
      ))}
    </p>
  )
}

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
  const badge = { idle: 'bg-gray-200 text-gray-500', 'selected-correct': 'bg-green-500 text-white', 'selected-wrong': 'bg-red-500 text-white', 'reveal-correct': 'bg-green-500 text-white', dimmed: 'bg-gray-200 text-gray-400' }[state]
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

/* [  A  ] 형식의 다중 빈칸 요약 카드 파싱 */
type Segment = string | { blank: string }
function parseSummaryPrompt(prompt: string): Segment[] {
  const parts = prompt.split(/\[\s*([A-Z])\s*\]/g)
  return parts.map((p, i) => (i % 2 === 1 ? { blank: p } : p)).filter((s) => s !== '')
}

export default function Part5BlankScreen({ onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const userName = useOnboardingStore((s) => s.userName) || '민주'
  const introScript = buildTurns(userName).s0_intro.script

  // 수업·실전 문항은 Supabase DB에서 로드 (실패 시 lessonScenario 하드코딩 폴백)
  const lessonQuestion = useDbQuestions(
    useStableCodes([Q_CODES.p5Lesson]),
    (rows) => ({ ...toBlankProblem(rows[0], LESSON_QUESTION.number), explanation: LESSON_QUESTION.explanation }),
    LESSON_QUESTION,
  )
  const practiceProblems = useDbQuestions(
    useStableCodes(Q_CODES.p5Practice),
    (rows) => rows.map((r, i) => toBlankProblem(r, `Q${i + 1}`)),
    SCREEN3_PROBLEMS as P5Question[],
  )

  const [phase, setPhase] = useState<'intro' | 'lesson' | 'reading' | 'summary'>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [lessonAnswered, setLessonAnswered] = useState(false)
  const [lessonSelected, setLessonSelected] = useState<number | undefined>(undefined)
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text')
  const [panelOpen, setPanelOpen] = useState(true) // 강사 패널 접기 — 접으면 미니 카드
  const [inputText, setInputText] = useState('')
  // 카드별 · 블랭크별 입력값
  const [summaryInputs, setSummaryInputs] = useState<Record<string, string>>({})
  const [summaryChecked, setSummaryChecked] = useState(false)
  const draw = useDrawingTool()
  const mainRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([])
  // 지금 단계(stepIdx)의 버튼 후보 — 세션 상태 기준으로 서버가 내려줌 (텍스트 정규식 추측 X)
  const [quickReplies, setQuickReplies] = useState<string[] | undefined>(undefined)
  const ctxSentRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null) // /api/tutor 세션
  const prevLenRef = useRef(0) // 이미 처리한 메시지 개수
  // 엔진이 돌려준 quickReplies는 "이번 directive에 대한 버튼"일 뿐, 에이전트가 그걸 실제로
  // 말하기 전까진 화면에 띄우면 안 된다. 그래서 일단 여기 보류해뒀다가, 에이전트의 다음 발화가
  // 도착한 시점(= 실제로 그 질문을 한 시점)에 화면 state로 옮긴다.
  const pendingQuickRepliesRef = useRef<string[] | undefined>(undefined)
  // 세션 시작 시 첫 AI 발화는 항상 고정 인삿말(instructor_greeting)이라 버튼을 붙이면 안 된다 — 그 한 턴만 건너뛴다.
  const seenFirstAiTurnRef = useRef(false)
  const conversation = useConversation({
    // 텍스트 모드에서는 마이크를 음소거 → 입력은 오직 텍스트로만
    micMuted: chatMode === 'text',
    onMessage: (p: { source: string; message: string }) => {
      setMessages((prev) => [...prev, { role: p.source === 'user' ? 'user' : 'ai', text: p.message }])
      if (p.source !== 'user') {
        if (!seenFirstAiTurnRef.current) {
          seenFirstAiTurnRef.current = true
        } else {
          setQuickReplies(pendingQuickRepliesRef.current)
        }
      }
    },
  })
  const sendContextual = (text: string) => {
    try {
      ;(conversation as unknown as { sendContextualUpdate?: (t: string) => void }).sendContextualUpdate?.(text)
    } catch { /* noop */ }
  }
  const connected = conversation.status === 'connected'
  const connecting = conversation.status === 'connecting'
  const pickQuickReply = (label: string) => {
    if (!connected) return
    setQuickReplies(undefined)
    // sendText와 동일한 이유로 로컬 echo가 필요하다 (onMessage가 되돌려주지 않음).
    setMessages((prev) => [...prev, { role: 'user', text: label }])
    conversation.sendUserMessage(label)
  }

  const handleEnd = onEnd ?? (() => window.history.back())
  const total = practiceProblems.length

  useEffect(() => {
    if (phase !== 'intro') return
    void speakTTS(introScript, persona)
    return () => stopCurrentAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])
  useEffect(() => {
    if (phase !== 'lesson' && conversation.status !== 'disconnected') { try { conversation.endSession() } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])
  useEffect(() => () => { try { conversation.endSession() } catch { /* noop */ } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 연결되면 튜터 엔진 세션을 시작하고, 엔진이 만든 첫 directive(S1 단계 목표)를 주입
  useEffect(() => {
    if (connected && !ctxSentRef.current) {
      ctxSentRef.current = true
      ;(async () => {
        const res = await callTutor({ action: 'start', studentId: await (await import('@/lib/profile')).getLearnerId(STUDENT_ID), questionCode: TUTOR_QUESTION_CODE })
        if (res.sessionId) sessionIdRef.current = res.sessionId
        if (res.contextual) sendContextual(res.contextual)
        pendingQuickRepliesRef.current = res.quickReplies
      })()
    }
    if (!connected) {
      ctxSentRef.current = false
      sessionIdRef.current = null
      seenFirstAiTurnRef.current = false
      pendingQuickRepliesRef.current = undefined
      setQuickReplies(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  // 학생이 답할 때마다 엔진에 채점/전진(S1→S3→S4→S2→S6→S5→S7)을 요청하고, 돌려받은 directive만 주입
  useEffect(() => {
    if (messages.length <= prevLenRef.current) {
      prevLenRef.current = messages.length
      return
    }
    const last = messages[messages.length - 1]
    prevLenRef.current = messages.length
    if (!connected || last.role !== 'user' || !sessionIdRef.current) return
    setQuickReplies(undefined)
    ;(async () => {
      const res = await callTutor({ action: 'answer', sessionId: sessionIdRef.current, text: last.text })
      if (res.contextual) sendContextual(res.contextual)
      pendingQuickRepliesRef.current = res.quickReplies
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, connected])

  // ── 도입 ──
  if (phase === 'intro') {
    return (
      <LessonIntro tag="Part 5 수동태" script={introScript} points={P5_INTRO_POINTS}
        onStart={() => { stopCurrentAudio(); setMessages([]); setLessonAnswered(false); setLessonSelected(undefined); setPhase('lesson') }} onEnd={handleEnd} />
    )
  }

  const isLast = qIndex === total - 1
  const correctIndexOf = (q: P5Question) => q.choices.findIndex((c) => c.text === q.correctAnswer)

  // ── 수업 ──
  if (phase === 'lesson') {
    const q = lessonQuestion
    const correctIdx = correctIndexOf(q)
    const lastAi = [...messages].reverse().find((m) => m.role === 'ai')?.text ?? ''
    const startAgent = () => {
      setMessages([])
      seenFirstAiTurnRef.current = false
      pendingQuickRepliesRef.current = undefined
      setQuickReplies(undefined)
      conversation.startSession({ agentId: AGENT_ID, dynamicVariables: STUDENT_VARS }).catch(() => {})
    }
    const sendText = () => {
      const t = inputText.trim()
      if (!t || !connected) return
      // @11labs/react의 onMessage는 로컬에서 sendUserMessage로 보낸 텍스트를 되돌려주지 않는다
      // (에이전트 응답·실제 음성 STT만 콜백된다) — 그래서 직접 화면에 echo 해줘야 한다.
      setMessages((prev) => [...prev, { role: 'user', text: t }])
      conversation.sendUserMessage(t)
      setInputText('')
    }
    const goReading = () => { try { conversation.endSession() } catch { /* noop */ } stopCurrentAudio(); setPhase('reading') }
    const select = (i: number) => { if (lessonAnswered) return; setLessonSelected(i); setLessonAnswered(true) }
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
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'ai' ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-[#2277F0] text-white rounded-tr-sm'}`}>{m.text}</div>
                    </div>
                  ))}
                  {!!quickReplies?.length && (
                    <div className="flex flex-wrap gap-1.5">
                      {quickReplies.map((label) => (
                        <button key={label} onClick={() => pickQuickReply(label)}
                          className="px-3 py-1.5 rounded-lg border border-[#2277F0]/30 bg-white text-[#2277F0] text-xs font-semibold hover:bg-[#2277F0]/5">
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
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
                {lastAi && (
                  <div className="bg-gray-100 rounded-xl p-3 w-full my-3 text-center max-h-24 overflow-y-auto">
                    <p className="text-gray-600 text-[13px] leading-relaxed">{lastAi}</p>
                  </div>
                )}
                {!!quickReplies?.length && (
                  <div className="flex flex-wrap justify-center gap-1.5 mb-2">
                    {quickReplies.map((label) => (
                      <button key={label} onClick={() => pickQuickReply(label)}
                        className="px-3 py-1.5 rounded-lg border border-[#2277F0]/30 bg-white text-[#2277F0] text-xs font-semibold hover:bg-[#2277F0]/5">
                        {label}
                      </button>
                    ))}
                  </div>
                )}
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

          {/* 좌: 문장 + 빈칸 문제 */}
          <div ref={mainRef} className="flex-1 overflow-y-auto min-h-0 bg-white">
            <div className="max-w-2xl mx-auto w-full px-5 md:px-8 py-5 space-y-5">
              <span className="inline-block bg-[#2277F0]/10 text-[#2277F0] text-xs md:text-sm font-bold px-3 py-1 rounded-full">{SCREEN1_PROBLEM.partLabel}</span>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 md:p-5">
                <SentenceView q={q} filledText={lessonSelected !== undefined ? q.choices[lessonSelected].text : undefined} />
              </div>
              <div className="flex flex-col gap-2 md:gap-2.5">
                {q.choices.map((c, i) => {
                  let state: 'idle' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' | 'dimmed' = 'idle'
                  if (lessonAnswered) {
                    if (i === correctIdx) state = i === lessonSelected ? 'selected-correct' : 'reveal-correct'
                    else if (i === lessonSelected) state = 'selected-wrong'
                    else state = 'dimmed'
                  }
                  return <ChoiceCard key={c.id} label={c.id} text={c.text} state={state} disabled={lessonAnswered} onClick={() => select(i)} />
                })}
              </div>
              {lessonAnswered && (
                <div className="rounded-2xl border border-[#BFD9FF] bg-[#F0F5FF] p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={TEACHER_IMG} alt="AI 강사" className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-[#2277F0]/40" />
                    <span className="text-xs md:text-sm font-bold text-[#1A2B4B]">박혜원 AI 강사 해설</span>
                    <span className={`ml-auto text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-md ${lessonSelected === correctIdx ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{lessonSelected === correctIdx ? '✓ 정답' : '✕ 오답'}</span>
                  </div>
                  <p className="text-[13px] md:text-[15px] text-[#374151] leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 실전 ──
  if (phase !== 'summary') {
    const q = practiceProblems[qIndex]
    const correctIdx = correctIndexOf(q)
    const selected = answers[qIndex]
    const answered = selected !== undefined
    const select = (i: number) => { if (answered) return; setAnswers((a) => ({ ...a, [qIndex]: i })) }
    const next = () => { if (!isLast) setQIndex(qIndex + 1); else setPhase('summary') }
    return (
      <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
        <PhaseStepper active={2} onEnd={handleEnd} extra={<DrawToggleButton drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} />} />
        <DrawingOverlay {...draw} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full px-5 md:px-8 py-5 space-y-5">
            <div className="flex items-center gap-2">
              {practiceProblems.map((p, i) => {
                const ans = answers[i]
                const tabCls = i === qIndex
                  ? 'bg-[#2277F0] text-white'
                  : ans === undefined ? 'bg-gray-100 text-gray-400'
                  : ans === correctIndexOf(p) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                return <button key={p.number} onClick={() => setQIndex(i)} className={`w-9 h-9 md:w-10 md:h-10 rounded-full text-xs md:text-sm font-bold ${tabCls}`}>{p.number}</button>
              })}
              <span className="ml-auto text-xs md:text-sm text-gray-400 font-medium">{Object.keys(answers).length}/{total}</span>
            </div>

            <span className="inline-block bg-[#2277F0]/10 text-[#2277F0] text-xs md:text-sm font-bold px-3 py-1 rounded-full">Part 5 · 수동태</span>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 md:p-5">
              <SentenceView q={q} filledText={selected !== undefined ? q.choices[selected].text : undefined} />
            </div>
            <div className="flex flex-col gap-2 md:gap-2.5">
              {q.choices.map((c, i) => {
                let state: 'idle' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' | 'dimmed' = 'idle'
                if (answered) {
                  if (i === correctIdx) state = i === selected ? 'selected-correct' : 'reveal-correct'
                  else if (i === selected) state = 'selected-wrong'
                  else state = 'dimmed'
                }
                return <ChoiceCard key={c.id} label={c.id} text={c.text} state={state} disabled={answered} onClick={() => select(i)} />
              })}
            </div>
            {answered && (
              <div className="rounded-2xl border border-[#BFD9FF] bg-[#F0F5FF] p-4 md:p-5">
                <div className="flex items-center gap-2 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TEACHER_IMG} alt="AI 강사" className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-[#2277F0]/40" />
                  <span className="text-xs md:text-sm font-bold text-[#1A2B4B]">박혜원 AI 강사 해설</span>
                  <span className={`ml-auto text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-md ${selected === correctIdx ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selected === correctIdx ? '✓ 정답' : '✕ 오답'}</span>
                </div>
                <p className="text-[13px] md:text-[15px] text-[#374151] leading-relaxed">{q.explanation}</p>
              </div>
            )}
            <button onClick={next} disabled={!answered} className={`w-full py-4 rounded-2xl font-bold text-base md:text-lg ${answered ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>{isLast ? '완료하기 →' : '다음 문제 →'}</button>
          </div>
        </div>
      </div>
    )
  }

  // ── 정리 (원본 SCREEN4_CARDS 다중 빈칸) ──
  const correct = practiceProblems.filter((p, i) => answers[i] === correctIndexOf(p)).length
  const cardResults = SCREEN4_CARDS.map((card) =>
    card.blanks.every((b) => {
      const val = (summaryInputs[`${card.id}_${b}`] ?? '').replace(/\s/g, '')
      const keywords = card.keywords[b as keyof typeof card.keywords] as string[]
      return keywords.some((k) => val.includes(k.replace(/\s/g, '')))
    })
  )
  const allFilled = SCREEN4_CARDS.every((card) => card.blanks.every((b) => (summaryInputs[`${card.id}_${b}`] ?? '').trim().length > 0))
  const correctCount = cardResults.filter(Boolean).length

  return (
    <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
      <PhaseStepper active={3} onEnd={handleEnd} />
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TEACHER_IMG} alt="박혜원" className="w-12 h-12 rounded-full object-cover object-top border-2 border-[#2277F0]/30" />
            <div className="flex-1 min-w-0"><h2 className="text-lg md:text-xl font-bold text-[#1A2B4B]">오늘 수업 완료!</h2><p className="text-xs md:text-sm text-gray-500">Part 5 수동태 · 실전 {correct}/{total} 정답</p></div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2277F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <p className="text-sm md:text-base font-bold text-[#1A2B4B]">핵심 요약 — 빈칸을 채워보세요</p>
          </div>
          <div className="space-y-3 mb-6">
            {SCREEN4_CARDS.map((card, ci) => {
              const segments = parseSummaryPrompt(card.prompt)
              const ok = cardResults[ci]
              return (
                <div key={card.id} className={`rounded-2xl border p-4 ${summaryChecked ? (ok ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50') : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#D6EAFF] text-[#2277F0] text-xs font-bold flex items-center justify-center mt-0.5">{ci + 1}</span>
                    <p className="text-sm md:text-base text-[#1A2B4B] leading-loose">
                      {segments.map((seg, si) =>
                        typeof seg === 'string' ? <span key={si}>{seg}</span> : (
                          <span key={si}>
                            {summaryChecked ? (
                              (() => {
                                const key = `${card.id}_${seg.blank}`
                                const val = (summaryInputs[key] ?? '').replace(/\s/g, '')
                                const kw = card.keywords[seg.blank as keyof typeof card.keywords] as string[]
                                const blankOk = kw.some((k) => val.includes(k.replace(/\s/g, '')))
                                return (
                                  <>
                                    <span className={`font-bold ${blankOk ? 'text-green-700' : 'text-red-500 line-through'}`}>{summaryInputs[key]?.trim() || '　'}</span>
                                    {!blankOk && <span className="font-bold text-green-700 mx-1">→ {card.answers[seg.blank as keyof typeof card.answers]}</span>}
                                  </>
                                )
                              })()
                            ) : (
                              <input
                                value={summaryInputs[`${card.id}_${seg.blank}`] ?? ''}
                                onChange={(e) => setSummaryInputs((prev) => ({ ...prev, [`${card.id}_${seg.blank}`]: e.target.value }))}
                                className="mx-1 w-20 text-center border-b-2 border-[#2277F0] bg-[#EFF6FF] rounded-sm px-1 py-0.5 font-bold text-[#2277F0] outline-none"
                                placeholder={seg.blank}
                              />
                            )}
                          </span>
                        )
                      )}
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
              <p className="text-center text-sm font-bold text-[#2277F0] mb-3">요약 {correctCount}/{SCREEN4_CARDS.length} 정답!</p>
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
              <button onClick={() => { stopCurrentAudio(); setSummaryChecked(false); setSummaryInputs({}) }} className="w-full mt-2 py-3 text-sm font-bold text-gray-400 hover:text-gray-600">다시 채우기</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
