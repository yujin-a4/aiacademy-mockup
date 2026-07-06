'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Vertex AI 에이전트 패널 — ElevenLabsConvAIPanel의 Vertex 버전 ──
// 역할분담은 docs/tutor-engine.md와 동일: /api/tutor(DB 기반 레일 엔진)가 진행순서·정오판정·근거를
// 전부 소유하고, 여기(Vertex+Gemini)는 그 directive를 박혜원 말투로 "옮겨 말하기"만 한다.
// STT는 ElevenLabs Scribe(/api/stt, 배치 전사 — 실시간 스트리밍 아님. 그래서 "녹음→정지→전송" 방식),
// TTS는 ElevenLabs 보이스(/api/tts) — Gemini는 내용을 지어내지 않는다.
const INSTRUCTOR_NAME = '박혜원'
const INSTRUCTOR_IMG  = '/instructor/park.png'
const PERSONA         = 'p7tutor'
const QUESTION_NUMBER = 148 // 기본값 (part7-vertex-convai 레거시 화면용)
const STUDENT_ID      = 'demo'

interface PanelProps {
  /** DB question_code — 지정 시 legacy questionNumber 대신 이 문항으로 세션 시작 */
  questionCode?: string
  /** 'lesson'(유형학습 레일) | 'practice'(실전 태그 코칭). 미지정 시 엔진 기본 동작 */
  lessonType?: 'lesson' | 'practice'
}

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

/** /api/tutor(DB 레일 엔진) 호출 — 진행/채점/힌트는 전부 여기서 결정됨 */
async function callTutor(payload: Record<string, unknown>): Promise<{
  contextual?: string; sessionId?: string; done?: boolean; grade?: string
}> {
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return {}
  return res.json()
}

/** /api/tutor-vertex directive 렌더 모드 — Gemini는 문장으로 옮기기만, 내용은 안 지어냄 */
async function renderDirective(directive: string): Promise<string> {
  const res = await fetch('/api/tutor-vertex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directive }),
  })
  const data = await res.json()
  return data.dialogue ?? '음, 잠시만.'
}

export default function VertexConvAIPanel({ questionCode, lessonType }: PanelProps = {}) {
  const [started, setStarted]       = useState(false)
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [listening, setListening]   = useState(false)   // 녹음 중
  const [transcribing, setTranscribing] = useState(false) // Scribe 전사 대기 중
  const [thinking, setThinking]     = useState(false)
  const [speaking, setSpeaking]     = useState(false)
  const [input, setInput]           = useState('')

  const audioRef        = useRef<HTMLAudioElement | null>(null)
  const mediaStreamRef  = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const msgEndRef       = useRef<HTMLDivElement | null>(null)
  const inputRef        = useRef<HTMLInputElement | null>(null)
  const sendMessageRef  = useRef<(t: string) => void>(() => {})
  const sessionIdRef    = useRef<string | null>(null)
  const sessionDoneRef  = useRef(false)

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── ElevenLabs TTS 재생 (네이티브 폴백 포함) ── */
  const speak = useCallback((text: string, onEnd?: () => void) => {
    stopAudio()
    ;(async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, persona: PERSONA }),
        })
        const data = await res.json()
        if (data.useNativeTts) { nativeSpeak(text, onEnd); return }
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        audioRef.current = audio
        audio.onended = () => { audioRef.current = null; onEnd?.() }
        audio.onerror = () => { audioRef.current = null; onEnd?.() }
        await audio.play()
      } catch {
        nativeSpeak(text, onEnd)
      }
    })()
  }, [])

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }

  /* ── STT: ElevenLabs Scribe(배치 전사) — 녹음 시작 → 정지 누르면 업로드 후 전사 결과로 전송 ── */
  const startListening = useCallback(async () => {
    if (mediaRecorderRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
        mediaRecorderRef.current = null
        setListening(false)

        if (blob.size < 1000) return // 너무 짧으면(무음 등) 무시
        setTranscribing(true)
        try {
          const form = new FormData()
          form.append('audio', blob, 'speech.webm')
          const res = await fetch('/api/stt', { method: 'POST', body: form })
          const data = await res.json()
          setTranscribing(false)
          if (data.text) sendMessageRef.current(data.text)
        } catch {
          setTranscribing(false)
        }
      }
      mr.start()
      mediaRecorderRef.current = mr
      setListening(true)
    } catch {
      alert('마이크 권한이 필요해요.')
    }
  }, [])

  const startListeningRef = useRef(startListening)
  useEffect(() => { startListeningRef.current = startListening }, [startListening])

  /** 녹음 중지 — mr.onstop이 업로드/전사/전송까지 처리 */
  const stopListening = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  /** 세션 종료 시 — 전송 없이 그냥 중단 */
  const cancelListening = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr) { mr.onstop = null; mr.stop() }
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    mediaStreamRef.current = null
    mediaRecorderRef.current = null
    setListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (listening) { stopListening(); return }
    if (speaking) { stopAudio(); setSpeaking(false) }
    startListening()
  }, [listening, speaking, startListening, stopListening])

  /* ── 학생 발화 → /api/tutor(레일 엔진, 정답판정+진행) → /api/tutor-vertex(말투 렌더) → TTS → 다시 듣기 ── */
  const sendMessage = useCallback(async (text: string) => {
    const userMsg = text.trim()
    if (!userMsg || thinking || sessionDoneRef.current || !sessionIdRef.current) return
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setThinking(true)

    try {
      const { contextual, done } = await callTutor({
        action: 'answer', sessionId: sessionIdRef.current, text: userMsg,
      })
      sessionDoneRef.current = !!done
      const reply = contextual ? await renderDirective(contextual) : '음, 다시 말해줄래?'
      setMessages(prev => [...prev, { role: 'ai', text: reply }])
      setThinking(false)
      setSpeaking(true)
      speak(reply, () => {
        setSpeaking(false)
        if (!sessionDoneRef.current) startListeningRef.current()
      })
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '연결에 문제가 생겼어요. 다시 시도해 주세요.' }])
      setThinking(false)
    }
  }, [thinking, speak])

  useEffect(() => { sendMessageRef.current = sendMessage }, [sendMessage])

  /* ── 텍스트 입력 전송: 마이크 중이면 끊고 텍스트로 보냄 (음성/텍스트 동일 경로) ── */
  const sendText = useCallback(() => {
    const text = input.trim()
    if (!text) return
    if (listening) stopListening()
    setInput('')
    sendMessageRef.current(text)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [input, listening, stopListening])

  const startCall = useCallback(async () => {
    setStarted(true)
    setMessages([])
    setThinking(true)
    sessionIdRef.current = null
    sessionDoneRef.current = false

    const { sessionId, contextual } = await callTutor({
      action: 'start', studentId: STUDENT_ID,
      ...(questionCode
        ? { questionCode, ...(lessonType ? { lessonType } : {}) }
        : { questionNumber: QUESTION_NUMBER }),
    })
    sessionIdRef.current = sessionId ?? null
    setThinking(false)

    if (!sessionId || !contextual) {
      const errMsg = '엔진 연결에 실패했어요. /api/tutor 응답을 확인해 주세요.'
      setMessages([{ role: 'ai', text: errMsg }])
      return
    }
    const greeting = await renderDirective(contextual)
    setMessages([{ role: 'ai', text: greeting }])
    setSpeaking(true)
    speak(greeting, () => { setSpeaking(false); startListeningRef.current() })
  }, [speak, questionCode, lessonType])

  const endCall = useCallback(() => {
    stopAudio()
    cancelListening()
    setStarted(false)
    setSpeaking(false)
    setThinking(false)
    setTranscribing(false)
    sessionIdRef.current = null
    sessionDoneRef.current = false
  }, [cancelListening])

  useEffect(() => () => { stopAudio(); cancelListening() }, [cancelListening])

  return (
    <div className="flex flex-col h-full bg-cr-panel">

      {/* ── 헤더 (강사 아바타 + 엔진 표시) ── */}
      <div className="shrink-0 px-4 py-3 border-b border-ybm-border flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={INSTRUCTOR_IMG} alt={INSTRUCTOR_NAME} className="w-7 h-7 rounded-full object-cover object-top shrink-0 border border-blue-200" />
        <div>
          <p className="text-xs font-black text-[#1A2B4B] leading-none">AI 튜터 · {INSTRUCTOR_NAME}</p>
          <p className="text-[10px] text-ybm-text-sub leading-none mt-0.5">Vertex AI · ElevenLabs TTS</p>
        </div>
        {started && (
          <span className="ml-auto flex items-center gap-1 bg-blue-50 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* ── 상태 표시줄 ── */}
      <div className="mx-3 mt-2 flex items-center gap-2 shrink-0">
        <span className={`w-2 h-2 rounded-full transition-colors ${
          started ? (speaking ? 'bg-amber-400 animate-pulse' : listening ? 'bg-green-500 animate-pulse' : 'bg-ybm-text-sub/40') : 'bg-ybm-text-sub/40'
        }`} />
        <span className="text-xs text-ybm-text-sub">
          {!started ? '대화 대기 중'
            : speaking ? `${INSTRUCTOR_NAME} 말하는 중...`
            : transcribing ? '음성 전사 중(Scribe)...'
            : thinking ? 'AI가 생각 중...'
            : listening ? '녹음 중 — 다 말했으면 버튼을 다시 눌러 전송'
            : '마이크 버튼을 눌러 녹음 시작'}
        </span>
      </div>

      {/* ── 대화 transcript ── */}
      <div className="flex-1 flex flex-col min-h-0 p-3 gap-2">
        <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-ybm-border p-3 flex flex-col gap-2">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
              <p className="text-xs text-ybm-text-sub leading-relaxed">
                {INSTRUCTOR_NAME}(Vertex AI 두뇌 + 일레븐랩스 목소리)과<br />실시간 음성으로 대화하며 수업을 진행하세요.
              </p>
              <p className="text-[11px] text-ybm-text-sub/70">
                마이크 버튼을 눌러 녹음 시작, 다 말했으면 다시 눌러 전송하세요.
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
          {transcribing && (
            <div className="flex justify-end">
              <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed bg-cr-accent/40 text-white rounded-br-sm italic">
                (Scribe로 전사 중...)
              </div>
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* ── 하단 컨트롤 ── */}
        {started ? (
          <div className="flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={toggleListening}
              disabled={thinking || transcribing}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md
                ${listening ? 'bg-red-500 scale-110 shadow-red-200'
                  : speaking ? 'bg-amber-400 hover:bg-amber-500 active:scale-95'
                  : 'bg-cr-accent hover:opacity-90 active:scale-95'}
                disabled:opacity-60`}
            >
              {listening ? (
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <rect x="5" y="5" width="10" height="10" rx="2" fill="white"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <rect x="7" y="2" width="8" height="11" rx="4" stroke="white" strokeWidth="1.8"/>
                  <path d="M3 11c0 4.418 3.582 8 8 8s8-3.582 8-8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M11 19v2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            <div className="w-full flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText()}
                placeholder="메시지 입력 (음성 대화 중에도 가능)"
                disabled={thinking}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-ybm-border focus:outline-none focus:border-cr-accent bg-white disabled:opacity-50"
              />
              <button
                onClick={sendText}
                disabled={!input.trim() || thinking}
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
            className="w-full py-3 rounded-xl bg-cr-accent text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shrink-0"
          >
            🎙 {INSTRUCTOR_NAME} 선생님과 대화 시작하기
          </button>
        )}
      </div>

      {/* ── 테스트 정보: 이 엔진이 어떻게 동작하는지 ── */}
      <div className="shrink-0 mx-3 mb-3 px-3 py-2 rounded-xl bg-ybm-bg border border-ybm-border text-[10px] leading-relaxed text-ybm-text-sub">
        <p className="font-bold text-ybm-text mb-1">이 화면 구조: ElevenLabs Scribe STT + Vertex AI(Gemini) + ElevenLabs TTS</p>
        <p>학생 발화(녹음) → <code className="px-1 bg-white rounded">/api/stt</code>(ElevenLabs Scribe, 배치 전사 — 실시간 스트리밍이 아니라서 녹음 종료 후에만 텍스트로 변환)
          → <code className="px-1 bg-white rounded">/api/tutor</code>(DB 레일 엔진, ElevenLabs 패널과 동일)가 채점·진행 결정
          → 그 지시를 <code className="px-1 bg-white rounded">/api/tutor-vertex</code>의 렌더 모드로 보내 Gemini가 "내용은 안 지어내고 말투로만" 옮김
          → ElevenLabs TTS로 발화. Scribe가 실시간이 아니라서 자동 이어듣기 대신 "녹음→정지→전송"을 매 턴 눌러야 함.</p>
      </div>
    </div>
  )
}

/* ── 브라우저 내장 TTS fallback ── */
function nativeSpeak(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'ko-KR'
  utt.rate = 1.05
  const voices = window.speechSynthesis.getVoices()
  const koVoice = voices.find(v => v.lang.startsWith('ko'))
  if (koVoice) utt.voice = koVoice
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
}
