'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type ChatMode = 'text' | 'voice'

interface Message {
  role: 'user' | 'ai'
  text: string
}

interface Props {
  answers: Record<number, string>
  getCanvasImage: () => Promise<{ base64: string; hint: string } | null>
  drawingVersion?: number   // 필기 변경 시 증가 — 음성 모드에서 자동 반응 트리거
  isUserDrawing?: boolean   // 필기 중일 때 true — STT 일시정지용
}

export default function AIChatPanel({ answers, getCanvasImage, drawingVersion = 0, isUserDrawing = false }: Props) {
  const [mode, setMode]             = useState<ChatMode>('text')
  const [messages, setMessages]     = useState<Message[]>([
    { role: 'ai', text: '131~133번 풀어봐. 모르는 거 있으면 물어봐.' },
  ])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [listening, setListening]   = useState(false)
  const [interimText, setInterimText] = useState('')   // 인식 중 실시간 텍스트
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasLiveScreen, setHasLiveScreen] = useState(false)

  const bottomRef         = useRef<HTMLDivElement>(null)
  const audioRef          = useRef<HTMLAudioElement | null>(null)
  const recognRef         = useRef<SpeechRecognition | null>(null)
  const gotResultRef      = useRef(false)   // onresult 수신 여부 (no-speech 재시작 판단)
  const sendMessageRef    = useRef<(t: string) => void>(() => {})
  /** 음성 모드에서 2초마다 갱신되는 최신 캔버스 스냅샷 */
  const liveSnapshotRef   = useRef<{ base64: string; hint: string } | null>(null)
  const snapshotTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* ── Google Cloud TTS ── */
  const speakTTS = useCallback(async (text: string, onEnd?: () => void) => {
    stopAudio()
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona: 'p6tutor' }),
      })
      const data = await res.json()

      if (data.useNativeTts) {
        nativeSpeak(text, onEnd)
        return
      }
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
      audioRef.current = audio
      audio.onended = () => { audioRef.current = null; onEnd?.() }
      audio.onerror = () => { audioRef.current = null; onEnd?.() }
      await audio.play()
    } catch {
      nativeSpeak(text, onEnd)
    }
  }, [])

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }

  /* ── 음성 모드: 2초마다 화면 스냅샷 ── */
  useEffect(() => {
    if (mode !== 'voice') {
      clearInterval(snapshotTimerRef.current ?? undefined)
      snapshotTimerRef.current = null
      liveSnapshotRef.current  = null
      setHasLiveScreen(false)
      return
    }

    const capture = async () => {
      const img = await getCanvasImage()
      liveSnapshotRef.current = img
      setHasLiveScreen(!!img)
    }

    capture()
    snapshotTimerRef.current = setInterval(capture, 2000)
    return () => { clearInterval(snapshotTimerRef.current ?? undefined) }
  }, [mode, getCanvasImage])

  /* ── 메시지 전송 ── */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    stopAudio()
    setIsSpeaking(false)

    const answerSummary =
      Object.entries(answers).map(([q, a]) => `${q}번: ${a || '미선택'}`).join(', ') || '아직 선택 없음'

    // 음성 모드: 주기 스냅샷 사용 / 텍스트 모드: 요청 시 캡처
    const imgResult = mode === 'voice'
      ? liveSnapshotRef.current
      : await getCanvasImage()

    const imageBase64    = imgResult?.base64 ?? null
    const positionHint   = imgResult?.hint   ?? null

    const contextualMessage = imageBase64
      ? `[학생 현재 답안: ${answerSummary}]\n\n${positionHint ? `[필기 위치 힌트: ${positionHint}]\n` : ''}${userMsg}\n\n※ 첨부 이미지는 학생이 지문에 직접 표시(밑줄·형광펜·동그라미)한 스크린샷입니다. 힌트에 명시된 단락의 해당 단어·문장 위에 색깔 있는 선/표시를 찾아 정확히 특정한 뒤 답변해 주세요.`
      : `[학생 현재 답안: ${answerSummary}]\n\n${userMsg}`

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: contextualMessage,
          persona: 'p6tutor',
          history: messages.slice(-6).map((m) => ({
            role: m.role === 'ai' ? 'instructor' : 'user',
            text: m.text,
          })),
          ...(imageBase64 ? { imageBase64 } : {}),
        }),
      })
      const data = await res.json()
      const reply: string = data.dialogue ?? '죄송해요, 잠시 후 다시 시도해 주세요.'
      setMessages((prev) => [...prev, { role: 'ai', text: reply }])

      if (mode === 'voice') {
        setIsSpeaking(true)
        await speakTTS(stripMarkdown(reply), () => {
          setIsSpeaking(false)
          startListening()
        })
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: '연결에 문제가 생겼어요. 다시 시도해 주세요.' }])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, messages, answers, getCanvasImage, mode, speakTTS])

  /* sendMessage ref — stale closure 방지 */
  useEffect(() => { sendMessageRef.current = sendMessage }, [sendMessage])

  /* ── 필기 중 STT 일시정지 / 재시작 ── */
  useEffect(() => {
    if (isUserDrawing) {
      /* 필기 시작: STT 중단 */
      recognRef.current?.stop()
      recognRef.current = null
      setListening(false)
      setInterimText('')
    } else {
      /* 필기 끝: 음성 모드이고 AI가 말하거나 로딩 중이 아니면 500ms 후 재시작 */
      if (mode !== 'voice' || loading || isSpeaking) return
      const t = setTimeout(() => startListeningRef.current?.(), 500)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserDrawing])

  /* ── 음성 모드: 필기 변경 감지 → 자동 AI 반응 ── */
  const prevDrawingVersionRef = useRef(0)
  useEffect(() => {
    if (drawingVersion === 0) return                          // 초기값 무시
    if (drawingVersion === prevDrawingVersionRef.current) return
    prevDrawingVersionRef.current = drawingVersion

    if (mode !== 'voice') return                             // 음성 모드에서만
    if (loading || isSpeaking || listening) return           // AI/STT 사용 중이면 스킵

    sendMessageRef.current(
      '[필기 감지] 학생이 지문에 방금 표시를 했습니다. 표시된 부분을 이미지에서 확인하고, 어느 단어/문장인지 파악한 뒤 자연스럽게 "여기를 표시했군요!" 같은 반응과 함께 해당 부분에 대한 힌트나 설명을 2~3줄로 말해주세요.'
    )
  }, [drawingVersion, mode, loading, isSpeaking, listening])

  /* ── STT: 실시간 인식 텍스트 표시 + isFinal 시 자동 전송 ── */
  const startListening = useCallback(() => {
    /* 이미 인식 중이면 중복 시작 방지 */
    if (recognRef.current) return

    const SR =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SR) { alert('이 브라우저는 음성 입력을 지원하지 않아요.'); return }

    const recog = new SR()
    recog.lang            = 'ko-KR'
    recog.continuous      = true
    recog.interimResults  = true
    recog.maxAlternatives = 1
    gotResultRef.current  = false

    recog.onresult = (e) => {
      let interim = ''
      let final   = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      setInterimText(interim || final)

      if (final) {
        gotResultRef.current = true
        setInterimText('')
        // final 결과 수신 즉시 명시적으로 중단 후 전송 (중복 전송 방지)
        recognRef.current = null
        recog.stop()
        setListening(false)
        sendMessageRef.current(final)
      }
    }

    recog.onend = () => {
      /* ref가 이미 교체된 경우(stopListening 호출)엔 state 건드리지 않음 */
      if (recognRef.current !== recog) return
      recognRef.current = null
      setListening(false)
      setInterimText('')
      /* 자동 재시작은 하지 않음 — TTS 콜백 또는 버튼 클릭으로만 시작 */
    }

    recog.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('[STT error]', e.error)
      }
      /* onerror 후 onend가 따라오므로 여기서는 state 변경 안 함 */
    }

    recog.start()
    recognRef.current = recog
    setListening(true)
  }, [])

  /* startListening ref — TTS 콜백 / 필기 재시작용 */
  const startListeningRef = useRef(startListening)
  useEffect(() => { startListeningRef.current = startListening }, [startListening])

  const stopListening = useCallback(() => {
    if (!recognRef.current) return
    const recog = recognRef.current
    recognRef.current = null   // 먼저 null로 교체 → onend에서 재시작 안 함
    recog.stop()
    setListening(false)
    setInterimText('')
  }, [])

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening()
    } else {
      /* AI가 말하는 중이면 TTS 중단 후 마이크 시작 */
      if (isSpeaking) {
        stopAudio()
        setIsSpeaking(false)
      }
      startListening()
    }
  }, [listening, isSpeaking, startListening, stopListening])

  /* 음성 모드 진입 시 TTS 중지 후 자동 마이크 시작 */
  const handleModeSwitch = useCallback((next: ChatMode) => {
    if (next === mode) return
    stopAudio()
    stopListening()
    setListening(false)
    setIsSpeaking(false)
    setMode(next)
    if (next === 'voice') setTimeout(() => startListening(), 400)
  }, [mode, startListening, stopListening])



  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-ybm-border shadow-sm overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 px-4 py-3 border-b border-ybm-border flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/instructor/park.png" alt="AI 튜터" className="w-7 h-7 rounded-full object-cover object-top shrink-0 border border-violet-200" />
        <div>
          <p className="text-xs font-black text-[#1A2B4B] leading-none">AI 튜터 · 박혜원</p>
          <p className="text-[10px] text-ybm-text-sub leading-none mt-0.5">Gemini 2.0 Flash</p>
        </div>

        {/* 모드 토글 */}
        <div className="ml-auto flex items-center gap-1 bg-[#F5F7FA] rounded-lg p-0.5">
          <button
            onClick={() => handleModeSwitch('text')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all
              ${mode === 'text' ? 'bg-white text-[#6366F1] shadow-sm' : 'text-ybm-text-sub hover:text-[#1A2B4B]'}`}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1 3h10M1 6h8M1 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            텍스트
          </button>
          <button
            onClick={() => handleModeSwitch('voice')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all
              ${mode === 'voice' ? 'bg-white text-[#6366F1] shadow-sm' : 'text-ybm-text-sub hover:text-[#1A2B4B]'}`}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="4" y="1" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2 6c0 2.209 1.791 4 4 4s4-1.791 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M6 10v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            음성
          </button>
        </div>
      </div>

      {/* 화면 공유 상태 표시 (음성 모드) */}
      {mode === 'voice' && (
        <div className={`shrink-0 px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-medium
          ${hasLiveScreen ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-ybm-text-sub'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${hasLiveScreen ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          {hasLiveScreen ? 'AI가 지문 화면을 실시간으로 보고 있어요' : '필기하면 AI가 화면을 인식해요'}
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/instructor/park.png" alt="AI 튜터" className="w-6 h-6 rounded-full object-cover object-top shrink-0 mr-2 mt-0.5 border border-violet-200" />
            )}
            <div
              className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line
                ${msg.role === 'user'
                  ? 'bg-[#6366F1] text-white rounded-tr-sm'
                  : 'bg-[#F5F7FA] text-[#1A2B4B] rounded-tl-sm border border-ybm-border'}
              `}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/instructor/park.png" alt="AI 튜터" className="w-6 h-6 rounded-full object-cover object-top shrink-0 mr-2 mt-0.5 border border-violet-200" />
            <div className="bg-[#F5F7FA] border border-ybm-border px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#6366F1]"
                  style={{ animation: `dotBounce 1s ease-in-out ${i * 0.18}s infinite alternate` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── 음성 모드 UI ── */}
      {mode === 'voice' ? (
        <div className="shrink-0 px-4 pb-4 pt-2 flex flex-col items-center gap-3">
          <p className="text-[11px] text-ybm-text-sub font-medium text-center">
            {isSpeaking  ? 'AI 말하는 중 — 버튼 누르면 끊고 말할 수 있어요'
             : loading   ? 'AI가 생각 중...'
             : listening ? '듣고 있어요 — 말하면 자동 전송'
             : '마이크 버튼을 눌러 질문하세요'}
          </p>

          {/* 실시간 인식 텍스트 */}
          {interimText && (
            <div className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-center">
              <p className="text-sm text-[#6366F1] leading-snug">{interimText}</p>
            </div>
          )}

          {/* 마이크 버튼 */}
          <button
            onClick={toggleListening}
            disabled={loading}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md
              ${listening  ? 'bg-red-500 scale-110 shadow-red-200'
                : isSpeaking ? 'bg-amber-400 hover:bg-amber-500 active:scale-95'
                : 'bg-[#6366F1] hover:bg-[#4F46E5] active:scale-95'}
              disabled:opacity-60`}
          >
            {listening ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="5" y="5" width="10" height="10" rx="2" fill="white"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="7" y="2" width="8" height="11" rx="4" stroke="white" strokeWidth="1.8"/>
                <path d="M3 11c0 4.418 3.582 8 8 8s8-3.582 8-8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M11 19v2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* 파형 (녹음 중) */}
          {listening && (
            <div className="flex items-center gap-0.5 h-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="w-1 rounded-full bg-[#6366F1]"
                  style={{
                    height: `${8 + Math.sin((i / 11) * Math.PI) * 12}px`,
                    animation: `voiceWave 0.8s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate`,
                    opacity: 0.7 + (i % 3) * 0.1,
                  }}
                />
              ))}
            </div>
          )}

          {isSpeaking && (
            <button onClick={() => { stopAudio(); setIsSpeaking(false) }}
              className="text-[11px] font-medium text-ybm-text-sub hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="8" height="8" rx="1.5" fill="currentColor"/>
              </svg>
              말하기 중지
            </button>
          )}
        </div>

      ) : (
        /* ── 텍스트 모드 UI ── */
        <>
          <div className="shrink-0 px-3 pb-2 flex gap-1.5 overflow-x-auto">
            {['131번 힌트 줘', '132번 왜 수동태야?', '133번 설명해줘'].map((q) => (
              <button key={q} onClick={() => sendMessage(q)} disabled={loading}
                className="shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-violet-200 text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="shrink-0 px-3 pb-3 flex items-center gap-2">
            <button onClick={toggleListening}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all
                ${listening ? 'bg-red-500 text-white' : 'bg-[#F5F7FA] text-[#6366F1] border border-ybm-border hover:bg-violet-50'}`}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="1" width="6" height="8" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 8c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 14v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="질문을 입력하세요..."
              disabled={loading}
              className="flex-1 h-9 px-3 rounded-xl border border-ybm-border text-sm bg-[#F5F7FA] focus:outline-none focus:border-[#6366F1] focus:bg-white transition-colors disabled:opacity-50"
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M8 3l5 4-5 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes dotBounce {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes voiceWave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  )
}

/* ── 마크다운 기호 제거 (TTS 전처리) ── */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')          // 코드 블록
    .replace(/`([^`]*)`/g, '$1')             // 인라인 코드
    .replace(/^#{1,6}\s+/gm, '')             // 헤더 #
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1') // **bold** / *italic*
    .replace(/_{1,3}([^_\n]+)_{1,3}/g, '$1')   // __bold__ / _italic_
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [링크](url)
    .replace(/^[-*+]\s+/gm, '')              // 불릿 리스트
    .replace(/^\d+\.\s+/gm, '')              // 번호 리스트
    .replace(/^[-*_]{3,}\s*$/gm, '')         // 구분선
    .replace(/~~([^~]+)~~/g, '$1')           // ~~취소선~~
    .replace(/~+/g, '')                      // 남은 물결표
    .replace(/\n{3,}/g, '\n\n')              // 과도한 줄바꿈 정리
    .trim()
}

/* ── 브라우저 내장 TTS fallback ── */
function nativeSpeak(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const utt  = new SpeechSynthesisUtterance(text)
  utt.lang   = 'ko-KR'
  utt.rate   = 1.05
  const voices = window.speechSynthesis.getVoices()
  const koVoice = voices.find((v) => v.lang.startsWith('ko'))
  if (koVoice) utt.voice = koVoice
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
}
