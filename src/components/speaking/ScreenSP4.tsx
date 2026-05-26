'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import InputBar from '@/components/classroom/toolbar/InputBar'
import PhotoCard from './PhotoCard'
import ScriptPanel from './ScriptPanel'
import TimerRing from './TimerRing'
import { useClassroomStore } from '@/store/classroomStore'
import { SPEAKING_TURNS, OFFICE_PHOTO, OFFICE_SCRIPT } from '@/data/speakingScenario'
import { waitForVideoEnd, notifyVideoEnded, speakTurn } from '@/lib/tts'
import SpeakingNavBar from './SpeakingNavBar'

type TurnId = 'sp4_t1' | 'sp4_t2'

const WAVE_COUNT = 18
const WAVE_HEIGHTS = Array.from({ length: WAVE_COUNT }, (_, i) => {
  const t = i / (WAVE_COUNT - 1)
  return Math.round(8 + Math.sin(t * Math.PI) * 20)
})

interface Props { onComplete: () => void; onEnd: () => void }

export default function ScreenSP4({ onComplete, onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const [turnId, setTurnId]      = useState<TurnId>('sp4_t1')
  const [speech, setSpeech]      = useState('')
  const [videoSrc, setVideo]     = useState<string | undefined>()
  const [canInput, setCanInput]   = useState(false)
  const [timerRunning, setTimer]  = useState(false)
  const [isRecording, setRecording] = useState(false)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  const mountedRef        = useRef(false)
  const enteredRef        = useRef(false)
  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef  = useRef<() => void>(() => {})
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null)
  const audioChunksRef    = useRef<Blob[]>([])
  const streamRef         = useRef<MediaStream | null>(null)
  const audioRef          = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enterTurn = useCallback(async (id: TurnId) => {
    if (!mountedRef.current) return
    const turn = SPEAKING_TURNS[id]
    setTurnId(id)
    setCanInput(false)
    setSpeech(turn.script)
    setVideo(turn.videoSrc)

    if (turn.videoSrc) await waitForVideoEnd()
    else await speakTurn({ script: turn.script, persona })
    if (!mountedRef.current) return

    setCanInput(true)
  }, [persona])

  useEffect(() => {
    if (enteredRef.current) return
    enteredRef.current = true
    enterTurn('sp4_t1')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStartRecording = useCallback(async () => {
    if (!canInput || isRecording) return
    setRecording(true)
    setTimer(true)
    audioChunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setRecordedUrl(url)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
    } catch {
      // microphone permission denied — proceed without recording
    }
    setTimeout(() => startListeningRef.current(), 300)
  }, [canInput, isRecording])

  const handleRead = useCallback(async () => {
    if (!canInput) return
    stopListeningRef.current()
    setTimer(false)
    setRecording(false)
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setCanInput(false)
    await enterTurn('sp4_t2')
  }, [canInput, enterTurn])

  const handlePlayback = useCallback(() => {
    if (!recordedUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(recordedUrl)
      audioRef.current.onended = () => setIsPlaying(false)
    }
    if (isPlaying) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [recordedUrl, isPlaying])

  const currentTurn = SPEAKING_TURNS[turnId]

  return (
    <ClassroomLayout
      partName="TOEIC Speaking · Part 2"
      totalProblems={1}
      instructorSpeech={speech}
      instructorVideoSrc={videoSrc}
      onInstructorVideoEnd={notifyVideoEnded}
      onEnd={onEnd}
      panelOpen={panelOpen}
      onPanelToggle={() => setPanelOpen(v => !v)}
      toolbar={<SpeakingNavBar onNext={onComplete} highlighted={canInput && currentTurn.inputType === 'button'} />}
      instructorInput={
        <InputBar
          placeholder={!canInput ? '강사 설명 듣는 중...' : '스크립트를 소리내어 읽어보세요'}
          onReadyToListen={(s, st) => { startListeningRef.current = s; stopListeningRef.current = st }}
          onSpeechResult={handleRead}
          onListeningChange={() => {}}
          lang={currentTurn.lang ?? 'ko-KR'}
          actions={[]}
        />
      }
    >
      <div className="flex gap-4 h-full">

        {/* 왼쪽: 사진 카드 */}
        <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl border border-ybm-border shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="bg-[#2277F0] text-white text-sm font-bold px-3 py-1 rounded-full">STEP 4</span>
                <h2 className="text-3xl font-bold text-[#1A2B4B] mt-2 leading-tight">
                  스크립트를 보며 읽어봐요
                </h2>
                <p className="text-base text-ybm-text-sub mt-1">전체 흐름을 파악하고 소리내어 읽어보세요.</p>
              </div>
              <TimerRing seconds={30} running={timerRunning} onEnd={handleRead} size={96} />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <PhotoCard src={OFFICE_PHOTO} className="h-full rounded-none" />
          </div>
          {turnId === 'sp4_t1' && canInput && (
            <div className="px-5 pb-4 shrink-0">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-[#2277F0] text-white font-bold text-base hover:bg-[#1a66d4] active:scale-95 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="1" width="6" height="8" rx="3" stroke="white" strokeWidth="1.5"/>
                    <path d="M2 8c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M8 14v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  녹음 시작
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-[#F0F6FF] rounded-2xl px-4 py-2.5">
                  {/* Animated waveform */}
                  <div className="flex-1 flex items-end justify-center gap-[3px] h-10">
                    {WAVE_HEIGHTS.map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-[#2277F0]"
                        style={{
                          height: `${h}px`,
                          animation: `sp4Wave ${0.5 + (i % 5) * 0.08}s ease-in-out ${i * 30}ms infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  {/* 완료 button */}
                  <button
                    onClick={handleRead}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 active:scale-95 transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" fill="white"/>
                    </svg>
                    완료
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Playback after recording */}
          {turnId === 'sp4_t2' && recordedUrl && (
            <div className="px-5 pb-4 shrink-0">
              <button
                onClick={handlePlayback}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-base transition-all active:scale-95
                  ${isPlaying ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-white border-2 border-[#2277F0] text-[#2277F0] hover:bg-[#EFF6FF]'}`}
              >
                {isPlaying ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor"/>
                      <rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor"/>
                    </svg>
                    정지
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 2.5l10 5.5-10 5.5V2.5z" fill="currentColor"/>
                    </svg>
                    녹음 다시 듣기
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 오른쪽: 스크립트 카드 — 강사 패널과 같은 너비 */}
        <div className="w-[320px] xl:w-[360px] shrink-0 flex flex-col bg-white rounded-2xl border border-ybm-border shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-ybm-border/50 shrink-0 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#2277F0] shrink-0">
              <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 4h6M4 6.5h6M4 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-bold text-[#1A2B4B]">스크립트 예시</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            <ScriptPanel title="" lines={OFFICE_SCRIPT} mode="full" />
          </div>
        </div>

      </div>

      <style>{`
        @keyframes sp4Wave {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1.0); }
        }
      `}</style>
    </ClassroomLayout>
  )
}
