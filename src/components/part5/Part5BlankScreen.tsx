'use client'

/* Part 5 단문 공란 — 도입 → 수업(좌: 문장+빈칸 / 우: 강사 대화창) → 실전 → 정리
   원래 P5_QUESTIONS 데이터 그대로 사용. 지문 없이 문장별 빈칸. 색: #2277F0. */

import React, { useEffect, useRef, useState } from 'react'
import { P5_QUESTIONS } from '@/data/rcData'
import LessonIntro from '@/components/lesson/LessonIntro'
import { speakTTS, stopCurrentAudio } from '@/lib/tts'
import { useClassroomStore } from '@/store/classroomStore'
import { useDrawingTool, DrawingOverlay, DrawToggleButton } from '@/components/DrawingOverlay'
import { useConversation } from '@11labs/react'

const LABELS = ['A', 'B', 'C', 'D']
const TEACHER_IMG = '/image_reference/park-2.jpg'
const INSTRUCTOR_PHOTO = '/image_reference/park-3.jpg'
const AGENT_ID = 'agent_2501kt0w00khfrr8869g2z5vnpaz'
const SET = P5_QUESTIONS.slice(0, 5)

const P5_INTRO_SCRIPT =
  '안녕하세요! 오늘은 Part 5 단문 공란을 배울 거예요. 빈칸 자리의 문법과 문맥을 보고 알맞은 단어를 고르는 전략을 익혀볼게요. 준비됐죠? 😊'
const P5_INTRO_POINTS = [
  { text: '빈칸 자리의 품사·문장 성분 파악' },
  { text: '태·시제·수일치 등 문법 단서 확인' },
  { text: '문맥·어휘로 최종 확정' },
]
const SUMMARY_CARDS = [
  { before: '단문 공란은 빈칸 자리의 ', blank: '품사', after: '부터 확인한다.', accept: ['품사', '문법'] },
  { before: '', blank: '태·시제', after: ' 같은 문법 단서를 본다.', accept: ['태', '시제', '문법'] },
  { before: '남으면 ', blank: '문맥', after: '과 어휘로 확정한다.', accept: ['문맥', '어휘'] },
]
const CLOSING_SUMMARY_SCRIPT =
  '오늘 배운 Part 5 핵심! 빈칸 자리의 품사를 먼저 잡고, 태와 시제, 수일치 같은 문법 단서를 보고, 문맥으로 확정하세요. 수고 많았어요!'
const STUDENT_VARS: Record<string, string> = {
  user_name: '지윤', target_score: '900', study_range: '파트 파이브 단문 공란',
  exam_date: '다음 달', daily_time: '하루 한 시간', learning_style: '집중형', management_style: '주도형', motivation_type: '목표 달성형',
  instructor_greeting: '자, 오늘은 파트 파이브 단문 공란을 같이 풀어보자. 빈칸 하나씩 짚어줄게. 시작하자.',
}

interface Props { onEnd?: () => void }

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

/* 문장 (빈칸 하이라이트 + 선택 단어 채움) */
function SentenceView({ sentence, filled }: { sentence: string; filled?: string }) {
  const parts = sentence.split('_______')
  return (
    <p className="text-base md:text-xl leading-loose text-[#1A2B4B] font-medium">
      {parts[0]}
      <span className={`inline-block min-w-[100px] text-center font-bold px-2 py-0.5 rounded border-b-2 mx-1 ${filled ? 'border-[#2277F0] text-[#2277F0] bg-[#EFF6FF]' : 'border-gray-300 text-transparent'}`}>{filled || '　'}</span>
      {parts[1]}
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
      <span className="font-medium leading-snug">{text}</span>
    </button>
  )
}

export default function Part5BlankScreen({ onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const [phase, setPhase] = useState<'intro' | 'lesson' | 'reading' | 'summary'>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [lessonQIndex, setLessonQIndex] = useState(0)
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text')
  const [inputText, setInputText] = useState('')
  const [summaryInputs, setSummaryInputs] = useState(['', '', ''])
  const [summaryChecked, setSummaryChecked] = useState(false)
  const draw = useDrawingTool()
  const mainRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([])
  const conversation = useConversation({
    onMessage: (p: { source: string; message: string }) => setMessages((prev) => [...prev, { role: p.source === 'user' ? 'user' : 'ai', text: p.message }]),
  })
  const connected = conversation.status === 'connected'
  const connecting = conversation.status === 'connecting'

  const handleEnd = onEnd ?? (() => window.history.back())
  const total = SET.length
  const isLast = qIndex === total - 1

  useEffect(() => {
    if (phase !== 'intro') return
    void speakTTS(P5_INTRO_SCRIPT, persona)
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
      <LessonIntro tag="Part 5 단문 공란" script={P5_INTRO_SCRIPT} points={P5_INTRO_POINTS}
        onStart={() => { stopCurrentAudio(); setMessages([]); setLessonQIndex(0); setPhase('lesson') }} onEnd={handleEnd} />
    )
  }

  // 문항 카드 (수업/실전 공용)
  const QuestionBlock = ({ q, selected, answered, onSelect }: { q: typeof SET[number]; selected?: number; answered: boolean; onSelect: (i: number) => void }) => (
    <div className="space-y-4">
      <span className="inline-block bg-[#2277F0]/10 text-[#2277F0] text-xs md:text-sm font-bold px-3 py-1 rounded-full">{q.category}</span>
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 md:p-5">
        <SentenceView sentence={q.sentence} filled={selected !== undefined ? q.choices[selected] : undefined} />
      </div>
      <div className="flex flex-col gap-2 md:gap-2.5">
        {q.choices.map((c, i) => {
          let state: 'idle' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' | 'dimmed' = 'idle'
          if (answered) {
            if (i === q.answer) state = i === selected ? 'selected-correct' : 'reveal-correct'
            else if (i === selected) state = 'selected-wrong'
            else state = 'dimmed'
          }
          return <ChoiceCard key={i} label={LABELS[i]} text={c} state={state} disabled={answered} onClick={() => onSelect(i)} />
        })}
      </div>
      {answered && (
        <div className="rounded-2xl border border-[#BFD9FF] bg-[#F0F5FF] p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TEACHER_IMG} alt="AI 강사" className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-[#2277F0]/40" />
            <span className="text-xs md:text-sm font-bold text-[#1A2B4B]">박혜원 AI 강사 해설</span>
            <span className={`ml-auto text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-md ${selected === q.answer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selected === q.answer ? '✓ 정답' : '✕ 오답'}</span>
          </div>
          <p className="text-[13px] md:text-[15px] text-[#374151] leading-relaxed">{q.explanation}</p>
        </div>
      )}
    </div>
  )

  // ── 수업 ──
  if (phase === 'lesson') {
    const q = SET[lessonQIndex]
    const lastAi = [...messages].reverse().find((m) => m.role === 'ai')?.text ?? ''
    const startAgent = () => { setMessages([]); conversation.startSession({ agentId: AGENT_ID, dynamicVariables: STUDENT_VARS }).catch(() => {}) }
    const sendText = () => { const t = inputText.trim(); if (!t || !connected) return; conversation.sendUserMessage(t); setInputText('') }
    const goReading = () => { try { conversation.endSession() } catch { /* noop */ } stopCurrentAudio(); setPhase('reading') }
    return (
      <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
        <PhaseStepper active={1} onEnd={handleEnd} extra={<DrawToggleButton drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} />} />
        <DrawingOverlay {...draw} bounds={mainRef} />
        <div className="flex-1 flex flex-col-reverse lg:flex-row-reverse min-h-0">
          {/* 강사 대화창 */}
          <aside className="shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col h-[46%] lg:h-auto lg:w-[360px] min-h-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TEACHER_IMG} alt="박혜원" className="w-7 h-7 rounded-full object-cover object-top border border-[#2277F0]/40" />
                <span className="text-[13px] font-bold text-gray-600">박혜원 AI 강사</span>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
              <div className="flex items-center gap-1 bg-gray-50 rounded-full p-0.5">
                <button onClick={() => setChatMode('text')} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${chatMode === 'text' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>텍스트</button>
                <button onClick={() => setChatMode('voice')} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${chatMode === 'voice' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>음성</button>
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

          {/* 좌: 문장 + 빈칸 문제 (문항 탭) */}
          <div ref={mainRef} className="flex-1 overflow-y-auto min-h-0 bg-white">
            <div className="max-w-2xl mx-auto w-full px-5 md:px-8 py-5 space-y-5">
              <div className="flex items-center gap-2">
                {SET.map((_, i) => (
                  <button key={i} onClick={() => setLessonQIndex(i)} className={`w-9 h-9 md:w-10 md:h-10 rounded-full text-xs md:text-sm font-bold ${i === lessonQIndex ? 'bg-[#2277F0] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>Q{i + 1}</button>
                ))}
                <span className="ml-auto text-xs text-gray-400 font-medium">{lessonQIndex + 1} / {total}</span>
              </div>
              <QuestionBlock q={q} answered={false} onSelect={() => {}} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 실전 ──
  if (phase !== 'summary') {
    const q = SET[qIndex]
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
              {SET.map((_, i) => (
                <button key={i} onClick={() => setQIndex(i)} className={`w-9 h-9 md:w-10 md:h-10 rounded-full text-xs md:text-sm font-bold ${i === qIndex ? 'bg-[#2277F0] text-white' : answers[i] !== undefined ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>Q{i + 1}</button>
              ))}
              <span className="ml-auto text-xs md:text-sm text-gray-400 font-medium">{Object.keys(answers).length}/{total}</span>
            </div>
            <QuestionBlock q={q} selected={selected} answered={answered} onSelect={select} />
            <button onClick={next} disabled={!answered} className={`w-full py-4 rounded-2xl font-bold text-base md:text-lg ${answered ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>{isLast ? '완료하기 →' : '다음 문제 →'}</button>
          </div>
        </div>
      </div>
    )
  }

  // ── 정리 ──
  const correct = SET.filter((_, i) => answers[i] === SET[i].answer).length
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
            <div className="flex-1 min-w-0"><h2 className="text-lg md:text-xl font-bold text-[#1A2B4B]">오늘 수업 완료!</h2><p className="text-xs md:text-sm text-gray-500">Part 5 단문 공란 · 실전 {correct}/{total} 정답</p></div>
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
