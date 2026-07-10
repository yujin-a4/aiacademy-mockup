'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useConversation } from '@11labs/react'

const AGENT_ID = 'agent_2501kt0w00khfrr8869g2z5vnpaz'
// Supabase questions.question_code — 문항 사실(지문·보기·정답·근거·오답태그)은 전부 DB에서 온다
const QUESTION_CODE = 'RC-P7-03-Q006' // Part7 자동차 광고 148번 (why 이유)
const STUDENT_ID = 'demo'
const INSTRUCTOR_NAME = '박혜원'
const INSTRUCTOR_IMG  = '/instructor/park.png'

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

// ── 에이전트 프롬프트가 참조하는 dynamic variable 전부 채운다 ──
// (값은 데모용. 실제 학생 데이터/온보딩 스토어와 연결하려면 여기만 교체)
const STUDENT_VARS: Record<string, string> = {
  user_name:        '지윤',
  target_score:     '900',
  study_range:      '파트 세븐 장문 독해',
  exam_date:        '다음 달',
  daily_time:       '하루 한 시간',
  learning_style:   '집중형',
  management_style: '주도형',
  motivation_type:  '목표 달성형',
  // 오프닝 첫 마디 = 오늘 수업 선언 (음성 최적화: 숫자/특수문자 없이)
  instructor_greeting:
    '자, 오늘은 파트 세븐 백사십팔 번 문제 같이 풀어볼 거야. 차를 왜 파는지 묻는 문제야. 준비됐지? 바로 시작하자.',
}

// 수업 흐름(레일)·정오판정·단계전진·힌트·Fading은 전부 백엔드(/api/tutor)가 소유한다.
// 이 컴포넌트는 학생 발화를 엔진에 보내고, 돌려받은 directive를 에이전트에 주입(말투 렌더)만 한다.
async function callTutor(payload: Record<string, unknown>): Promise<{ contextual?: string; sessionId?: string; done?: boolean; grade?: string }> {
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return {}
  return res.json()
}

export default function ElevenLabsConvAIPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput]       = useState('')
  const [isMicMuted, setMicMuted] = useState(false)

  const gainNodeRef = useRef<GainNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const msgEndRef   = useRef<HTMLDivElement | null>(null)
  const inputRef    = useRef<HTMLInputElement | null>(null)
  const ctxSentRef   = useRef(false)
  const sessionIdRef = useRef<string | null>(null)  // /api/tutor 세션
  const prevLenRef   = useRef(0)                     // 이미 처리한 메시지 개수

  // ── ElevenLabs 실시간 대화 (위젯 X, 프로그래매틱) ──
  const conversation = useConversation({
    onMessage: (props: { source: string; message: string }) => {
      const { source, message } = props
      setMessages(prev => [...prev, { role: source === 'user' ? 'user' : 'ai', text: message }])
    },
  })

  const connected  = conversation.status === 'connected'
  const connecting = conversation.status === 'connecting'

  // 말로 읽히지 않는 컨텍스트 주입 헬퍼
  const sendContextual = useCallback((text: string) => {
    try {
      ;(conversation as unknown as { sendContextualUpdate?: (t: string) => void })
        .sendContextualUpdate?.(text)
    } catch { /* noop */ }
  }, [conversation])

  // 대화 transcript 자동 스크롤
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 연결되면 튜터 엔진 세션을 시작하고, 엔진이 만든 첫 directive를 주입
  useEffect(() => {
    if (connected && !ctxSentRef.current) {
      ctxSentRef.current = true
      ;(async () => {
        const res = await callTutor({ action: 'start', studentId: await (await import('@/lib/profile')).getLearnerId(STUDENT_ID), questionCode: QUESTION_CODE })
        if (res.sessionId) sessionIdRef.current = res.sessionId
        if (res.contextual) sendContextual(res.contextual)
      })()
    }
    if (!connected) {
      ctxSentRef.current = false
      sessionIdRef.current = null
    }
  }, [connected, sendContextual])

  // 학생이 답할 때마다 엔진에 채점/전진을 요청하고, 돌려받은 directive만 주입
  useEffect(() => {
    if (messages.length <= prevLenRef.current) {
      prevLenRef.current = messages.length
      return
    }
    const last = messages[messages.length - 1]
    prevLenRef.current = messages.length
    if (!connected || last.role !== 'user' || !sessionIdRef.current) return

    ;(async () => {
      const res = await callTutor({ action: 'answer', sessionId: sessionIdRef.current, text: last.text })
      if (res.contextual) sendContextual(res.contextual)
    })()
  }, [messages, connected, sendContextual])

  // 언마운트 시 세션 정리
  useEffect(() => {
    return () => {
      conversation.endSession()
      audioCtxRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 대화 시작: getUserMedia를 가로채 GainNode를 끼워 마이크 음소거 제어 ──
  const startCall = useCallback(async () => {
    setMicMuted(false)
    setMessages([])
    sessionIdRef.current = null
    prevLenRef.current = 0
    ctxSentRef.current = false
    gainNodeRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null

    const originalGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      navigator.mediaDevices.getUserMedia = originalGUM
      const rawStream = await originalGUM(constraints)
      if (!rawStream.getAudioTracks().length) return rawStream

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(rawStream)
      const gain   = audioCtx.createGain()
      gainNodeRef.current = gain
      const dest   = audioCtx.createMediaStreamDestination()
      source.connect(gain)
      gain.connect(dest)
      rawStream.getVideoTracks().forEach(t => dest.stream.addTrack(t))
      return dest.stream
    }

    try {
      await conversation.startSession({
        agentId: AGENT_ID,
        dynamicVariables: STUDENT_VARS,
      })
    } catch {
      navigator.mediaDevices.getUserMedia = originalGUM
    }
  }, [conversation])

  const endCall = useCallback(() => {
    conversation.endSession()
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    gainNodeRef.current = null
  }, [conversation])

  const toggleMic = useCallback(() => {
    setMicMuted(prev => {
      const next = !prev
      if (gainNodeRef.current) gainNodeRef.current.gain.value = next ? 0 : 1
      return next
    })
  }, [])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || !connected) return
    setMessages(prev => [...prev, { role: 'user', text }])
    conversation.sendUserMessage(text)
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [input, connected, conversation])

  return (
    <div className="flex flex-col h-full bg-cr-panel">

      {/* ── 헤더 (강사 아바타 + 엔진 표시) ── */}
      <div className="shrink-0 px-4 py-3 border-b border-ybm-border flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={INSTRUCTOR_IMG} alt={INSTRUCTOR_NAME} className="w-7 h-7 rounded-full object-cover object-top shrink-0 border border-red-200" />
        <div>
          <p className="text-xs font-black text-[#1A2B4B] leading-none">AI 튜터 · {INSTRUCTOR_NAME}</p>
          <p className="text-[10px] text-ybm-text-sub leading-none mt-0.5">ElevenLabs ConvAI</p>
        </div>
        {connected && (
          <span className="ml-auto flex items-center gap-1 bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* ── 상태 표시줄 ── */}
      <div className="mx-3 mt-2 flex items-center gap-2 shrink-0">
        <span className={`w-2 h-2 rounded-full transition-colors ${
          connected ? 'bg-green-500 animate-pulse' : connecting ? 'bg-amber-400 animate-pulse' : 'bg-ybm-text-sub/40'
        }`} />
        <span className="text-xs text-ybm-text-sub">
          {connected
            ? conversation.isSpeaking ? `${INSTRUCTOR_NAME} 말하는 중...` : '듣고 있어요'
            : connecting ? '연결 중...' : '대화 대기 중'}
        </span>
        {connected && (
          <button
            onClick={toggleMic}
            className={`ml-auto flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${
              isMicMuted ? 'bg-red-50 text-red-500' : 'text-ybm-text-sub hover:bg-ybm-bg'
            }`}
            title={isMicMuted ? '마이크 켜기' : '마이크 음소거'}
          >
            {isMicMuted ? '🔇 음소거됨' : '🎙 마이크 ON'}
          </button>
        )}
      </div>

      {/* ── 대화 transcript ── */}
      <div className="flex-1 flex flex-col min-h-0 p-3 gap-2">
        <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-ybm-border p-3 flex flex-col gap-2">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
              <p className="text-xs text-ybm-text-sub leading-relaxed">
                {INSTRUCTOR_NAME}과 실시간 음성으로<br />대화하며 수업을 진행하세요.
              </p>
              <p className="text-[11px] text-ybm-text-sub/70">
                아래 버튼을 누르면 마이크로 대화가 시작돼요.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cr-accent text-white rounded-br-sm'
                    : 'bg-ybm-bg text-ybm-text rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={msgEndRef} />
        </div>

        {/* ── 하단 컨트롤 ── */}
        {connected ? (
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="메시지 입력 (음성 대화 중에도 가능)"
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-ybm-border focus:outline-none focus:border-cr-accent bg-white"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="px-3 py-2 bg-cr-accent text-white rounded-xl text-xs font-semibold disabled:opacity-40 transition-opacity"
              >
                전송
              </button>
            </div>
            <button
              onClick={endCall}
              className="w-full py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors"
            >
              대화 종료
            </button>
          </div>
        ) : (
          <button
            onClick={startCall}
            disabled={connecting}
            className="w-full py-3 rounded-xl bg-cr-accent text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 shrink-0"
          >
            {connecting ? (
              '연결 중...'
            ) : (
              <>🎙 {INSTRUCTOR_NAME} 선생님과 대화 시작하기</>
            )}
          </button>
        )}
      </div>

      {/* ── 테스트 정보: 이 엔진이 어떻게 동작하는지 ── */}
      <div className="shrink-0 mx-3 mb-3 px-3 py-2 rounded-xl bg-ybm-bg border border-ybm-border text-[10px] leading-relaxed text-ybm-text-sub">
        <p className="font-bold text-ybm-text mb-1">이 화면 구조: ElevenLabs ConvAI</p>
        <p>학생 발화 → ElevenLabs 자체 STT → <code className="px-1 bg-white rounded">/api/tutor</code>(DB 레일 엔진)가 채점·진행 결정
          → 그 지시를 <code className="px-1 bg-white rounded">sendContextualUpdate</code>로 에이전트에 주입 → ElevenLabs 자체 LLM이 문장을 만들어 자체 TTS로 발화.
          턴마다 DB가 개입하지만, 마지막 "어떻게 말할지"는 ElevenLabs 쪽 블랙박스가 결정.</p>
      </div>
    </div>
  )
}
