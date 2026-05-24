'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface InstructorPanelProps {
  speech: string
  isLoading?: boolean
  inputSlot?: React.ReactNode
  imageSrc?: string
  videoSrc?: string
  onVideoEnd?: () => void
  instructorName?: string
}

const CHAR_DELAY_MS = 30 // 영상 없는 턴의 고정 타이핑 속도

export default function InstructorPanel({
  speech,
  isLoading = false,
  inputSlot,
  imageSrc = '/instructor/park.png',
  videoSrc,
  onVideoEnd,
  instructorName = 'AI 강사',
}: InstructorPanelProps) {
  const [videoError, setVideoError] = useState(false)
  const [displayed, setDisplayed]   = useState('')
  const [isTyping, setIsTyping]     = useState(false)

  /* videoSrc가 바뀌면 이전 에러 상태 초기화 */
  useEffect(() => { setVideoError(false) }, [videoSrc])

  const videoRef    = useRef<HTMLVideoElement | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCharRef = useRef(-1)
  const speechRef   = useRef(speech)
  const speechBoxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { speechRef.current = speech }, [speech])

  /* 타이핑 중 말풍선 하단 자동 스크롤 */
  useEffect(() => {
    if (speechBoxRef.current) {
      speechBoxRef.current.scrollTop = speechBoxRef.current.scrollHeight
    }
  }, [displayed])

  /* ── 영상 없는 턴: 고정 속도 타이핑 ── */
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    lastCharRef.current = -1

    if (videoSrc && !videoError) {
      /* 영상 턴은 onLoadedMetadata에서 interval 시작 → 여기서는 초기화만 */
      setDisplayed('')
      setIsTyping(true)
      return () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      }
    }

    if (!speech) { setDisplayed(''); setIsTyping(false); return }

    setDisplayed('')
    setIsTyping(true)
    let idx = 0
    timerRef.current = setInterval(() => {
      idx += 1
      setDisplayed(speech.slice(0, idx))
      if (idx >= speech.length) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        setIsTyping(false)
      }
    }, CHAR_DELAY_MS)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [speech, videoSrc, videoError])

  /* ── 영상 duration 확인 후 50ms 폴링 시작 ── */
  const startVideoSync = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    lastCharRef.current = -1

    timerRef.current = setInterval(() => {
      const v   = videoRef.current
      const cur = speechRef.current
      if (!v || !v.duration || isNaN(v.duration) || !cur) return

      const progress  = Math.min(v.currentTime / v.duration, 1)
      const charCount = Math.floor(progress * cur.length)

      if (charCount !== lastCharRef.current) {
        lastCharRef.current = charCount
        setDisplayed(cur.slice(0, charCount))
        setIsTyping(progress < 1)
      }

      if (progress >= 1) {
        clearInterval(timerRef.current!)
        timerRef.current = null
      }
    }, 50)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    startVideoSync()
  }, [startVideoSync])

  /* 이미 캐시된 영상은 loadedmetadata가 이미 지나갔을 수 있어 onPlay로도 보장 */
  const handlePlay = useCallback(() => {
    if (!timerRef.current) startVideoSync()
  }, [startVideoSync])

  const handleVideoEnded = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setDisplayed(speechRef.current)
    setIsTyping(false)
    onVideoEnd?.()
  }, [onVideoEnd])

  const handleVideoError = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setVideoError(true)
    onVideoEnd?.()
  }, [onVideoEnd])

  return (
    <div className="flex flex-col h-full bg-cr-panel">

      {/* ── 강사 영상 or 이미지 ── */}
      <div className="relative w-full shrink-0 lg:pt-[68px]">
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
          {videoSrc && !videoError ? (
            <video
              ref={videoRef}
              key={videoSrc}
              src={videoSrc}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center top' }}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
            />
          ) : imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={instructorName}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center top' }}
            />
          ) : (
            <div className="absolute inset-0 bg-cr-accent-light flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-cr-accent/30">
                <circle cx="24" cy="18" r="10" stroke="currentColor" strokeWidth="2.5" />
                <path d="M6 44c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="bg-cr-accent/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              YBM AI 어학원
            </span>
            <span className="bg-black/30 text-white text-[10px] px-2 py-0.5 rounded-full">{instructorName}</span>
          </div>
        </div>
      </div>

      {/* ── 말풍선 ── */}
      <div className="mx-3 mt-2 mb-2 bg-white rounded-2xl shadow-sm border border-ybm-border/50 overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-3 pb-1.5 border-b border-ybm-border/40">
          <span className="text-sm font-semibold text-cr-accent">{instructorName}</span>
          {isLoading ? (
            <div className="flex items-center gap-1 ml-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-cr-accent/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          ) : isTyping ? (
            <div className="flex items-center gap-[2px] ml-1" style={{ height: 14 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 2.5,
                    backgroundColor: '#2277F0',
                    animation: `speakBar ${0.4 + i * 0.08}s ease-in-out ${i * 60}ms infinite alternate`,
                    height: 8,
                  }}
                />
              ))}
              <style>{`
                @keyframes speakBar {
                  from { transform: scaleY(0.25); opacity: 0.5; }
                  to   { transform: scaleY(1);    opacity: 1; }
                }
              `}</style>
            </div>
          ) : (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="ml-0.5 opacity-50">
              <path d="M2.5 6.5l3 3 5-5" stroke="#2277F0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <div ref={speechBoxRef} className="px-4 py-3 h-[112px] overflow-y-auto">
          {isLoading ? (
            <LoadingDots />
          ) : (
            <p className="text-ybm-text text-base leading-relaxed">
              {displayed}
              {isTyping && (
                <span
                  className="inline-block w-[2px] h-[1em] bg-cr-accent ml-0.5 align-middle rounded-full"
                  style={{ animation: 'cursorBlink 0.7s step-end infinite' }}
                />
              )}
              <style>{`
                @keyframes cursorBlink {
                  0%, 100% { opacity: 1; }
                  50%       { opacity: 0; }
                }
              `}</style>
            </p>
          )}
        </div>
      </div>

      {inputSlot && (
        <div className="px-3 pb-2">
          {inputSlot}
        </div>
      )}

    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 h-10 px-1">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="w-2 h-2 bg-cr-accent rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </div>
  )
}
