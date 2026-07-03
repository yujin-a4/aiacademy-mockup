'use client'

/* 리스닝(Part 1~4) 공용 수업 화면 — 데이터(LCPart)로 구동.
   도입 → 수업(좌: 미디어+전체 문제 / 우: 강사 대화창=ElevenLabs 에이전트) → 실전 → 정리
   · 음원 재생은 강사(에이전트)가 client tool(play_audio/replay_sentence)로 제어 + 수동 탭.
   · 음원='listening' 목소리, 강사 발화=기본 목소리. 색: #2277F0. */

import React, { useEffect, useRef, useState } from 'react'
import type { LCPart, LCQuestion } from '@/data/lcData'
import LessonIntro from '@/components/lesson/LessonIntro'
import { speakTTS, stopCurrentAudio } from '@/lib/tts'
import { useClassroomStore } from '@/store/classroomStore'
import { useDrawingTool, DrawingOverlay, DrawToggleButton } from '@/components/DrawingOverlay'
import { useConversation } from '@11labs/react'

const LABELS = ['A', 'B', 'C', 'D']
const TEACHER_IMG = '/image_reference/park-2.jpg'
const INSTRUCTOR_PHOTO = '/image_reference/park-3.jpg'
const AUDIO_PERSONA = 'listening'
const DEFAULT_AGENT_ID = 'agent_2501kt0w00khfrr8869g2z5vnpaz'
const NUM_KO = ['', '원', '투', '쓰리', '포', '파이브', '식스', '세븐']

interface Props {
  part: LCPart
  onEnd?: () => void
}

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

function ChoiceCard({ label, text, state, onClick, disabled, audioOnly, onReplay }: {
  label: string; text: string; state: 'idle' | 'correct' | 'wrong' | 'dimmed'; onClick: () => void; disabled: boolean
  audioOnly?: boolean; onReplay?: () => void
}) {
  const box = {
    idle: 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#2277F0]/50 hover:bg-[#2277F0]/5',
    correct: 'bg-green-50 border-green-400 text-green-800',
    wrong: 'bg-red-50 border-red-400 text-red-800',
    dimmed: 'bg-gray-50 border-gray-100 text-gray-400',
  }[state]
  const badge = { idle: 'bg-gray-200 text-gray-500', correct: 'bg-green-500 text-white', wrong: 'bg-red-500 text-white', dimmed: 'bg-gray-200 text-gray-400' }[state]
  return (
    <button onClick={onClick} disabled={disabled} className={`w-full flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl border text-left transition-all text-sm md:text-base ${box}`}>
      <span className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold flex-shrink-0 ${badge}`}>{label}</span>
      {audioOnly
        ? (onReplay
          ? <span className="flex items-center gap-2 text-sm text-gray-500 font-medium"><span onClick={(e) => { e.stopPropagation(); onReplay() }} role="button" aria-label="보기 다시 듣기" className="w-8 h-8 rounded-full bg-white border border-[#BFD9FF] flex items-center justify-center text-[#2277F0] hover:bg-[#EFF6FF]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></svg></span>다시 듣기</span>
          : <span className="text-sm text-gray-400 font-medium">🔊 음성 보기</span>)
        : <span className="font-medium leading-snug flex-1">{text}</span>}
      {state === 'correct' && (
        <span className="ml-auto shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </span>
      )}
      {state === 'wrong' && (
        <span className="ml-auto shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </span>
      )}
    </button>
  )
}

/* 실전용 오디오 재생바 (자유 재생) */
function AudioBar({ media }: { media: Extract<LCPart['media'], { kind: 'audio' }> }) {
  const [playing, setPlaying] = useState(false)
  const [prog, setProg] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const play = () => {
    stopCurrentAudio(); void speakTTS(media.playText, AUDIO_PERSONA)
    setPlaying(true); setProg(0)
    const dur = Math.max(3000, media.playText.length * 62)
    const start = Date.now()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => { const p = Math.min(100, ((Date.now() - start) / dur) * 100); setProg(p); if (p >= 100 && timerRef.current) { clearInterval(timerRef.current); setPlaying(false) } }, 80)
  }
  const stop = () => { stopCurrentAudio(); setPlaying(false); if (timerRef.current) clearInterval(timerRef.current) }
  return (
    <div className="bg-[#F0F5FF] border border-[#BFD9FF] rounded-2xl p-4 md:p-5 flex items-center gap-3">
      <button onClick={playing ? stop : play} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#2277F0] flex items-center justify-center shrink-0 shadow-md active:scale-95" aria-label={playing ? '정지' : '재생'}>
        {playing ? <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 md:w-6 md:h-6"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg> : <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 md:w-6 md:h-6 ml-0.5"><polygon points="6 4 20 12 6 20 6 4" /></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm font-bold text-[#1A2B4B] mb-1.5">{media.label}</p>
        <div className="h-1.5 bg-[#DBEAFE] rounded-full overflow-hidden"><div className="h-full bg-[#2277F0] rounded-full transition-all duration-100" style={{ width: `${prog}%` }} /></div>
      </div>
    </div>
  )
}

export default function ListeningScreen({ part, onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const [phase, setPhase] = useState<'intro' | 'lesson' | 'reading' | 'summary'>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [summaryInputs, setSummaryInputs] = useState<string[]>(part.summary.map(() => ''))
  const [summaryChecked, setSummaryChecked] = useState(false)
  const draw = useDrawingTool()
  const mainRef = useRef<HTMLDivElement>(null)

  // 강사 대화 (ElevenLabs 에이전트)
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([])
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text')
  const [inputText, setInputText] = useState('')
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioProg, setAudioProg] = useState(0)
  const [lessonQIndex, setLessonQIndex] = useState(0) // 수업 문항 전환
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playRef = useRef<(i: number) => Promise<void>>(async () => {})
  const conversation = useConversation({
    onConnect: () => console.log('[ConvAI] connected'),
    onDisconnect: () => console.log('[ConvAI] disconnected'),
    onError: (e: unknown) => console.warn('[ConvAI] error', e),
    onMessage: (p: { source: string; message: string }) => setMessages((prev) => [...prev, { role: p.source === 'user' ? 'user' : 'ai', text: p.message }]),
    clientTools: {
      // 음원 재생이 끝날 때까지 대기한 뒤 반환 → 그동안 강사는 조용히 기다림
      play_audio: async () => { console.log('[tool] play_audio 호출됨'); await playRef.current(-1); return '음원 재생을 마쳤습니다. 이제 학생에게 무엇을 들었는지 짧게 확인 질문을 하세요.' },
      replay_sentence: async (params: { index?: number | string }) => { console.log('[tool] replay_sentence 호출됨', params); await playRef.current(Number(params?.index ?? 0)); return '해당 문장 재생을 마쳤습니다. 이어서 설명하세요.' },
    },
  })
  const connected = conversation.status === 'connected'
  const connecting = conversation.status === 'connecting'

  const agentId = part.agentId ?? DEFAULT_AGENT_ID
  const agentVars: Record<string, string> = {
    user_name: '지윤', target_score: '900', study_range: `파트 ${NUM_KO[part.no] ?? part.no} ${part.name}`,
    exam_date: '다음 달', daily_time: '하루 한 시간', learning_style: '집중형', management_style: '주도형', motivation_type: '목표 달성형',
    instructor_greeting: part.agentGreeting ?? `자, 오늘은 파트 ${NUM_KO[part.no] ?? part.no} ${part.name}을 같이 풀어보자. 잘 듣고 하나씩 짚어줄게. 시작하자.`,
  }

  const handleEnd = onEnd ?? (() => window.history.back())
  const total = part.questions.length
  const isLast = qIndex === total - 1
  const isPhoto = part.media.kind === 'photo'
  const photoFallback = part.media.kind === 'photo' ? part.media.imageUrl : ''

  // 음원 재생 (강사 client tool + 수동 탭 공용)
  // 강사(client tool)가 호출 → 재생바 구동 + 음원 재생. 재생이 끝날 때까지 대기(Promise).
  const playSeg = async (i: number) => {
    stopCurrentAudio()
    let text: string
    if (part.media.kind === 'audio') text = i < 0 ? (part.questions[lessonQIndex].audioText ?? part.media.playText) : (part.media.transcript?.[i]?.text ?? part.media.playText)
    else text = part.questions[lessonQIndex].choices.map((c, k) => `${LABELS[k]}. ${c}`).join(', ')
    setAudioPlaying(true); setAudioProg(0)
    const dur = Math.max(2500, text.length * 60)
    const start = Date.now()
    if (audioTimerRef.current) clearInterval(audioTimerRef.current)
    audioTimerRef.current = setInterval(() => { setAudioProg(Math.min(100, ((Date.now() - start) / dur) * 100)) }, 80)
    // 실제 음성 재생 + 예상 길이 중 늦게 끝나는 쪽까지 대기
    await Promise.all([speakTTS(text, AUDIO_PERSONA).catch(() => {}), new Promise((r) => setTimeout(r, dur))])
    if (audioTimerRef.current) clearInterval(audioTimerRef.current)
    setAudioProg(100); setAudioPlaying(false)
  }
  playRef.current = playSeg
  const playOpt = (question: LCQuestion, i: number) => { stopCurrentAudio(); void speakTTS(`${LABELS[i]}. ${question.choices[i]}`, AUDIO_PERSONA) }
  const playAllOpts = (question: LCQuestion) => { stopCurrentAudio(); void speakTTS(question.choices.map((c, i) => `${LABELS[i]}. ${c}`).join(', '), AUDIO_PERSONA) }

  // 수업을 벗어나면 세션 종료
  useEffect(() => {
    if (phase !== 'lesson' && conversation.status !== 'disconnected') { try { conversation.endSession() } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])
  useEffect(() => () => { try { conversation.endSession() } catch { /* noop */ } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 도입 ──
  if (phase === 'intro') {
    return (
      <LessonIntro tag={`Part ${part.no} ${part.name}`} script={part.introScript} points={part.introPoints}
        onStart={() => { stopCurrentAudio(); setMessages([]); setLessonQIndex(0); setPhase('lesson') }} onEnd={handleEnd} />
    )
  }

  // ── 수업 (좌: 미디어 + 전체 문제 / 우: 강사 대화창) ──
  if (phase === 'lesson') {
    const lastAi = [...messages].reverse().find((m) => m.role === 'ai')?.text ?? ''
    const startAgent = () => { setMessages([]); conversation.startSession({ agentId, dynamicVariables: agentVars }).catch(() => {}) }
    const sendText = () => { const t = inputText.trim(); if (!t || !connected) return; conversation.sendUserMessage(t); setInputText('') }
    const goReading = () => { try { conversation.endSession() } catch { /* noop */ } stopCurrentAudio(); setPhase('reading') }
    return (
      <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
        <PhaseStepper active={1} onEnd={handleEnd} extra={<DrawToggleButton drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} />} />
        <DrawingOverlay {...draw} bounds={mainRef} />
        <div className="flex-1 flex flex-col-reverse lg:flex-row-reverse min-h-0">
          {/* 강사 대화창 (우 / 모바일 하단) */}
          <aside className="shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col h-[46%] lg:h-auto lg:w-[360px] min-h-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TEACHER_IMG} alt="박혜원" className="w-7 h-7 rounded-full object-cover object-top border border-[#2277F0]/40" />
                <span className="text-[13px] font-bold text-gray-600">박혜원 AI 강사</span>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
              <div className="flex items-center gap-1 bg-gray-50 rounded-full p-0.5">
                <button onClick={() => setChatMode('text')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${chatMode === 'text' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M8 16h8" /></svg>텍스트
                </button>
                <button onClick={() => setChatMode('voice')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${chatMode === 'voice' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" /></svg>음성
                </button>
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
                  <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5"><input className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none" placeholder="메시지 입력..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendText() }} /></div>
                  <button onClick={sendText} disabled={!inputText.trim()} className="w-9 h-9 bg-[#2277F0] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40" aria-label="전송"><svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg></button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-5 py-5 min-h-0">
                <div className={`w-24 h-24 rounded-full overflow-hidden border-4 mb-3 transition-all ${conversation.isSpeaking ? 'border-[#2277F0] shadow-[0_0_24px_rgba(34,119,240,0.55)]' : 'border-[#2277F0]/25'}`}>
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

          {/* 좌: 재생바(강사 주도) + 전체 문제 — 수동 재생/스크립트 없음 */}
          <div ref={mainRef} className="flex-1 overflow-y-auto min-h-0 bg-white">
            <div className="max-w-2xl mx-auto w-full px-5 md:px-8 py-5 space-y-5">
              {/* 음원 재생바 — 강사가 "들어보자" 할 때만 재생 (컨트롤 없음) */}
              <div className="bg-[#F0F5FF] border border-[#BFD9FF] rounded-2xl p-4 md:p-5 flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${audioPlaying ? 'bg-[#2277F0]' : 'bg-[#BFD9FF]'}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-bold text-[#1A2B4B] mb-1.5">듣기 음원{audioPlaying ? ' · 재생 중…' : ' · 강사가 들려줄 거예요'}</p>
                  <div className="h-1.5 bg-[#DBEAFE] rounded-full overflow-hidden"><div className="h-full bg-[#2277F0] rounded-full transition-all duration-100" style={{ width: `${audioProg}%` }} /></div>
                </div>
              </div>

              {/* 문항 탭 — 한 번에 하나씩 */}
              {total > 1 && (
                <div className="flex items-center gap-2">
                  {part.questions.map((_, i) => (
                    <button key={i} onClick={() => setLessonQIndex(i)} className={`w-9 h-9 md:w-10 md:h-10 rounded-full text-xs md:text-sm font-bold transition-all ${i === lessonQIndex ? 'bg-[#2277F0] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>Q{i + 1}</button>
                  ))}
                  <span className="ml-auto text-xs md:text-sm text-gray-400 font-medium">{lessonQIndex + 1} / {total}</span>
                </div>
              )}
              {(() => {
                const qq = part.questions[lessonQIndex]
                return (
                  <div className="space-y-3">
                    {isPhoto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qq.imageUrl ?? photoFallback} alt="문제 사진" className="w-full rounded-2xl object-cover border border-gray-100" style={{ maxHeight: 280 }} />
                    )}
                    <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed"><span className="text-[#2277F0] font-bold mr-1.5">{lessonQIndex + 1}.</span>{qq.prompt}</p>
                    <div className="flex flex-col gap-2 md:gap-2.5">
                      {qq.choices.map((c, i) => (<ChoiceCard key={i} label={LABELS[i]} text={c} state="idle" disabled audioOnly={isPhoto} onClick={() => {}} />))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 실전 (자유 재생 플레이어) ──
  if (phase !== 'summary') {
    const q = part.questions[qIndex]
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
              {part.questions.map((_, i) => (
                <button key={i} onClick={() => setQIndex(i)} className={`w-9 h-9 md:w-10 md:h-10 rounded-full text-xs md:text-sm font-bold transition-all ${i === qIndex ? 'bg-[#2277F0] text-white' : answers[i] !== undefined ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>Q{i + 1}</button>
              ))}
              <span className="ml-auto text-xs md:text-sm text-gray-400 font-medium">{Object.keys(answers).length}/{total}</span>
            </div>

            {part.media.kind === 'photo' ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.imageUrl ?? photoFallback} alt="문제 사진" className="w-full rounded-2xl object-cover border border-gray-100" style={{ maxHeight: 300 }} />
                <button onClick={() => playAllOpts(q)} className="mt-3 flex items-center gap-1.5 text-xs font-bold text-white bg-[#2277F0] rounded-full px-3.5 py-2"><svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><polygon points="6 4 20 12 6 20 6 4" /></svg>보기 듣기 (A~D)</button>
              </div>
            ) : (
              <AudioBar media={part.media} />
            )}

            <div>
              <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed mb-3"><span className="text-[#2277F0] font-bold mr-1.5">Q{qIndex + 1}.</span>{q.prompt}</p>
              <div className="flex flex-col gap-2 md:gap-2.5">
                {q.choices.map((c, i) => {
                  let state: 'idle' | 'correct' | 'wrong' | 'dimmed' = 'idle'
                  if (answered) state = i === q.answer ? 'correct' : i === selected ? 'wrong' : 'dimmed'
                  return <ChoiceCard key={i} label={LABELS[i]} text={c} state={state} disabled={answered} audioOnly={isPhoto && !answered} onReplay={isPhoto ? () => playOpt(q, i) : undefined} onClick={() => select(i)} />
                })}
              </div>
              {answered && (
                <div className="mt-3 rounded-xl bg-[#F0F5FF] border border-[#BFD9FF] p-4">
                  <p className={`text-xs font-bold mb-1 ${selected === q.answer ? 'text-green-700' : 'text-red-600'}`}>{selected === q.answer ? '✓ 정답' : '✕ 오답'}</p>
                  <p className="text-[13px] md:text-sm text-[#374151] leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
            <button onClick={next} disabled={!answered} className={`w-full py-4 rounded-2xl font-bold text-base md:text-lg transition-all ${answered ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>{isLast ? '완료하기 →' : '다음 문제 →'}</button>
          </div>
        </div>
      </div>
    )
  }

  // ── 정리 (요약 빈칸 + 강사 마무리) ──
  const correct = part.questions.filter((_, i) => answers[i] === part.questions[i].answer).length
  const results = part.summary.map((c, i) => c.accept.some((a) => summaryInputs[i].replace(/\s/g, '').toLowerCase().includes(a.toLowerCase())))
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
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-[#1A2B4B]">오늘 수업 완료!</h2>
              <p className="text-xs md:text-sm text-gray-500">Part {part.no} {part.name} · 실전 {correct}/{total} 정답</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2277F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <p className="text-sm md:text-base font-bold text-[#1A2B4B]">핵심 요약 — 빈칸을 채워보세요</p>
          </div>
          <div className="space-y-3 mb-6">
            {part.summary.map((c, i) => {
              const ok = results[i]
              return (
                <div key={i} className={`rounded-2xl border p-4 transition-colors ${summaryChecked ? (ok ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50') : 'border-gray-200 bg-gray-50'}`}>
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
            <button onClick={() => { setSummaryChecked(true); void speakTTS(part.closing, persona) }} disabled={!allFilled} className={`w-full py-4 rounded-2xl font-bold text-base md:text-lg transition-all ${allFilled ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>채점하기</button>
          ) : (
            <>
              <p className="text-center text-sm font-bold text-[#2277F0] mb-3">요약 {correctCount}/{part.summary.length} 정답!</p>
              <div className="rounded-2xl border border-[#BFD9FF] bg-[#F0F5FF] p-4 md:p-5 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={INSTRUCTOR_PHOTO} alt="박혜원" className="w-12 h-12 rounded-full object-cover object-top border-2 border-[#2277F0]/40" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A2B4B]">박혜원 AI 강사</p>
                    <p className="text-[11px] text-[#2277F0] font-semibold">오늘 학습 마무리 🎓</p>
                  </div>
                  <button onClick={() => void speakTTS(part.closing, persona)} className="w-9 h-9 rounded-full bg-white border border-[#BFD9FF] flex items-center justify-center text-[#2277F0] hover:bg-[#EFF6FF]" title="다시 듣기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></svg></button>
                </div>
                <p className="text-sm md:text-[15px] text-[#374151] leading-relaxed">{part.closing}</p>
              </div>
              <button onClick={() => { stopCurrentAudio(); handleEnd() }} className="w-full py-4 rounded-2xl bg-[#2277F0] text-white font-bold text-base md:text-lg hover:bg-[#1a66d4]">학습 마치기 →</button>
              <button onClick={() => { stopCurrentAudio(); setSummaryChecked(false); setSummaryInputs(part.summary.map(() => '')) }} className="w-full mt-2 py-3 text-sm font-bold text-gray-400 hover:text-gray-600">다시 채우기</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
