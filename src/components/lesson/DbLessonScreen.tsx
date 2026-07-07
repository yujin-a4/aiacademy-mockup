'use client'

import { useEffect, useRef, useState } from 'react'
import { useConversation } from '@11labs/react'
import { fetchLectureQuestions, type UiDbQuestion } from '@/data/db/questionStore'

// ── DB 기반 유형학습 수업 화면 (파트 공용, 신버전 UI) ──
// 좌: 파트별 문항 표시(사진/질문/대화/담화/빈칸문장/지문) — DB content 필드에서 렌더.
// 우: 박혜원 ElevenLabs 에이전트 — /api/tutor(lessonType='lesson', 시트 레일)가 진행을 소유하고
//     에이전트는 directive를 말투로 렌더한다 (ElevenLabsConvAIPanel과 동일한 하이브리드).
const AGENT_ID    = 'agent_2501kt0w00khfrr8869g2z5vnpaz'
const TEACHER_IMG = '/instructor/park.png'
const STUDENT_ID  = 'demo'

interface Props {
  lectureCode: string
  onEnd: () => void
}

const PART_NAMES: Record<number, string> = {
  1: 'Part 1 사진 묘사', 2: 'Part 2 질의응답', 3: 'Part 3 짧은 대화', 4: 'Part 4 짧은 담화',
  5: 'Part 5 단문 공란', 6: 'Part 6 장문 공란', 7: 'Part 7 독해',
}

async function callTutor(payload: Record<string, unknown>): Promise<{ contextual?: string; sessionId?: string }> {
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return {}
  return res.json()
}

export default function DbLessonScreen({ lectureCode, onEnd }: Props) {
  const [questions, setQuestions] = useState<UiDbQuestion[] | null>(null)
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text')
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([])

  const sessionIdRef = useRef<string | null>(null)
  const ctxSentRef   = useRef(false)
  const prevLenRef   = useRef(0)

  const conversation = useConversation({
    onMessage: (p: { source: string; message: string }) =>
      setMessages((prev) => [...prev, { role: p.source === 'user' ? 'user' : 'ai', text: p.message }]),
  })
  const connected  = conversation.status === 'connected'
  const connecting = conversation.status === 'connecting'

  useEffect(() => {
    let alive = true
    fetchLectureQuestions(lectureCode).then((rows) => { if (alive) setQuestions(rows) })
    return () => { alive = false }
  }, [lectureCode])

  const q = questions?.[0] ?? null // 수업 대표 문항 = 강의의 첫 문항

  const sendContextual = (text: string) => {
    try {
      ;(conversation as unknown as { sendContextualUpdate?: (t: string) => void }).sendContextualUpdate?.(text)
    } catch { /* noop */ }
  }

  // 연결되면 튜터 엔진(lesson 모드) 세션 시작 → 첫 directive 주입
  useEffect(() => {
    if (connected && !ctxSentRef.current && q) {
      ctxSentRef.current = true
      ;(async () => {
        const res = await callTutor({ action: 'start', studentId: STUDENT_ID, questionCode: q.code, lessonType: 'lesson' })
        if (res.sessionId) sessionIdRef.current = res.sessionId
        if (res.contextual) sendContextual(res.contextual)
      })()
    }
    if (!connected) {
      ctxSentRef.current = false
      sessionIdRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, q])

  // 학생 발화마다 엔진에 전달 → 다음 단계 directive 주입
  useEffect(() => {
    if (messages.length <= prevLenRef.current) { prevLenRef.current = messages.length; return }
    const last = messages[messages.length - 1]
    prevLenRef.current = messages.length
    if (!connected || last.role !== 'user' || !sessionIdRef.current) return
    ;(async () => {
      const res = await callTutor({ action: 'answer', sessionId: sessionIdRef.current, text: last.text })
      if (res.contextual) sendContextual(res.contextual)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, connected])

  useEffect(() => () => { try { conversation.endSession() } catch { /* noop */ } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!questions) {
    return <div className="h-dvh flex items-center justify-center bg-[#f0f4f8] text-sm text-gray-400">수업 자료를 불러오는 중…</div>
  }
  if (!q) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#f0f4f8]">
        <p className="text-sm text-gray-500">이 강의({lectureCode})에 등록된 문항이 아직 없어요.</p>
        <button onClick={onEnd} className="px-5 py-2.5 rounded-xl bg-[#2277F0] text-white text-sm font-bold">돌아가기</button>
      </div>
    )
  }

  const greeting = [
    `자, 오늘은 ${PART_NAMES[q.part] ?? `파트 ${q.part}`} 유형학습이야. 이 문제 같이 볼 거야. 준비됐지? 바로 시작하자.`,
  ].join(' ')

  const startAgent = () => {
    setMessages([])
    conversation.startSession({
      agentId: AGENT_ID,
      dynamicVariables: {
        user_name: '지윤',
        target_score: '900',
        study_range: PART_NAMES[q.part] ?? `파트 ${q.part}`,
        exam_date: '다음 달',
        daily_time: '하루 한 시간',
        learning_style: '집중형',
        management_style: '주도형',
        motivation_type: '목표 달성형',
        instructor_greeting: greeting,
      },
    }).catch(() => {})
  }
  const sendText = () => {
    const t = inputText.trim()
    if (!t || !connected) return
    conversation.sendUserMessage(t)
    setMessages((prev) => [...prev, { role: 'user', text: t }])
    setInputText('')
  }
  const lastAi = [...messages].reverse().find((m) => m.role === 'ai')?.text ?? ''

  return (
    <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="bg-[#2277F0]/10 text-[#2277F0] text-xs font-bold px-3 py-1 rounded-full">{PART_NAMES[q.part] ?? `Part ${q.part}`}</span>
          <span className="text-[13px] font-bold text-gray-600">유형학습</span>
        </div>
        <button onClick={onEnd} className="text-[13px] font-bold text-gray-400 hover:text-gray-600">수업 종료 ✕</button>
      </div>

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
              <button onClick={() => setChatMode('text')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${chatMode === 'text' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M8 16h8" /></svg>
                텍스트
              </button>
              <button onClick={() => setChatMode('voice')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${chatMode === 'voice' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" /></svg>
                음성
              </button>
            </div>
          </div>

          {!connected ? (
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
        </aside>

        {/* 좌: 파트별 문항 본문 + 보기 */}
        <div className="flex-1 flex flex-col min-h-0 bg-white overflow-y-auto">
          <div className="px-5 md:px-8 py-4 md:py-5">
            <PartContent q={q} />
            <div className="flex flex-col gap-2 md:gap-2.5 mt-4">
              {q.options.map((o) => (
                <div key={o.label} className="flex items-center gap-3 rounded-xl px-4 py-3 border border-gray-200 bg-white">
                  <span className="w-6 h-6 rounded-full border-2 border-gray-300 text-gray-400 flex items-center justify-center shrink-0 text-xs font-bold">{o.label}</span>
                  <span className="text-sm md:text-[15px] leading-snug text-[#1A2B4B]">{o.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 파트별 문항 본문 렌더러 ── */

function Label({ children }: { children: React.ReactNode }) {
  return <span className="bg-[#2277F0]/10 text-[#2277F0] text-xs md:text-sm font-bold px-3 py-1 rounded-full">{children}</span>
}

function PartContent({ q }: { q: UiDbQuestion }) {
  const c = q.content
  switch (q.part) {
    case 1:
      return (
        <div>
          <div className="mb-3"><Label>사진</Label></div>
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-[#f0f4f8] px-6 py-12 text-center">
            <p className="text-3xl mb-3">📷</p>
            <p className="text-sm font-semibold text-[#1A2B4B] mb-1">{c.photo_type ?? ''}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{c.key_elements ?? ''}</p>
          </div>
        </div>
      )
    case 2:
      return (
        <div>
          <div className="mb-3"><Label>질문</Label></div>
          <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed">{c.question_text ?? ''}</p>
        </div>
      )
    case 3:
    case 4: {
      const lines = q.part === 3
        ? [c.dialogue_open, c.dialogue_mid, c.dialogue_end]
        : [c.talk_open, c.talk_mid, c.talk_end]
      return (
        <div>
          <div className="mb-3"><Label>{q.part === 3 ? '대화' : '담화'}</Label></div>
          <div className="flex flex-col gap-2">
            {lines.filter(Boolean).map((line, i) => (
              <p key={i} className="bg-[#f0f4f8] rounded-xl px-4 py-2.5 text-sm leading-relaxed text-[#1A2B4B]">{line}</p>
            ))}
          </div>
          {c.question_text && (
            <p className="mt-4 text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed">{c.question_text}</p>
          )}
        </div>
      )
    }
    case 5:
      return (
        <div>
          <div className="mb-3"><Label>문장</Label></div>
          <p className="text-[15px] md:text-lg leading-relaxed text-[#1A2B4B] font-medium">{c.blank_sentence ?? ''}</p>
        </div>
      )
    case 6:
      return (
        <div>
          <div className="mb-3"><Label>지문</Label></div>
          <p className="whitespace-pre-line leading-relaxed text-[#1A2B4B] text-sm md:text-base">{c.passage_context ?? ''}</p>
          {c.question_text && (
            <p className="mt-4 text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed">{c.question_text}</p>
          )}
        </div>
      )
    case 7:
    default:
      return (
        <div>
          <div className="mb-3"><Label>지문</Label></div>
          <p className="whitespace-pre-line leading-relaxed text-[#1A2B4B] text-sm md:text-base">{c.passage_text ?? ''}</p>
          {c.question_text && (
            <p className="mt-4 text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed">
              {c.question_number ? <span className="text-[#2277F0] font-bold mr-1.5">{c.question_number}.</span> : null}
              {c.question_text}
            </p>
          )}
        </div>
      )
  }
}
