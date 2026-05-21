'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Props {
  speech: string
  isLoading?: boolean
  videoSrc?: string
  imageSrc?: string
  onVideoEnd?: () => void
  inputSlot?: React.ReactNode
  isOpen: boolean
  onToggle: () => void
}

const CHAR_DELAY = 28

export default function MobileInstructorBar({
  speech,
  isLoading = false,
  videoSrc,
  imageSrc = '/instructor/park.png',
  onVideoEnd,
  inputSlot,
  isOpen,
  onToggle,
}: Props) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping]   = useState(false)
  const [videoError, setVideoError] = useState(false)

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef   = useRef<HTMLVideoElement | null>(null)
  const speechRef  = useRef(speech)
  const speechBoxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { setVideoError(false) }, [videoSrc])
  useEffect(() => { speechRef.current = speech }, [speech])

  // 말풍선 자동 스크롤
  useEffect(() => {
    if (speechBoxRef.current) {
      speechBoxRef.current.scrollTop = speechBoxRef.current.scrollHeight
    }
  }, [displayed])

  // 타이핑 애니메이션
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (!speech || isLoading) { setDisplayed(''); setIsTyping(false); return }

    setDisplayed('')
    setIsTyping(true)
    let idx = 0
    timerRef.current = setInterval(() => {
      idx++
      setDisplayed(speech.slice(0, idx))
      if (idx >= speech.length) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        setIsTyping(false)
      }
    }, CHAR_DELAY)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [speech, videoSrc, isLoading])

  // 영상 있을 때는 타이핑을 영상과 동기화
  const startVideoSync = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    timerRef.current = setInterval(() => {
      const v = videoRef.current
      const cur = speechRef.current
      if (!v || !v.duration || isNaN(v.duration) || !cur) return
      const progress = Math.min(v.currentTime / v.duration, 1)
      setDisplayed(cur.slice(0, Math.floor(progress * cur.length)))
      setIsTyping(progress < 1)
      if (progress >= 1) { clearInterval(timerRef.current!); timerRef.current = null }
    }, 50)
  }, [])

  return (
    <div
      className={`
        shrink-0 bg-white border-b border-ybm-border overflow-hidden
        transition-all duration-300 ease-in-out
        ${isOpen ? 'max-h-[320px]' : 'max-h-[52px] md:max-h-[68px]'}
      `}
    >
      {isOpen ? (
        /* ── 펼쳐진 상태 (고정 높이) ── */
        <div className="flex gap-3 md:gap-5 px-3 py-3 md:px-5 md:py-4">

          {/* 강사 영상 or 이미지 */}
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl overflow-hidden shrink-0 bg-cr-panel self-start">
            {videoSrc && !videoError ? (
              <video
                ref={videoRef}
                key={videoSrc}
                src={videoSrc}
                autoPlay
                playsInline
                poster={imageSrc}
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center top' }}
                onLoadedMetadata={startVideoSync}
                onPlay={() => { if (!timerRef.current) startVideoSync() }}
                onEnded={() => {
                  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
                  setDisplayed(speechRef.current)
                  setIsTyping(false)
                  onVideoEnd?.()
                }}
                onError={() => { setVideoError(true); onVideoEnd?.() }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt="AI 강사"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center top' }}
              />
            )}
          </div>

          {/* 오른쪽: 말풍선 + inputSlot */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">

            {/* 강사명 + 음파 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs md:text-sm font-semibold text-cr-accent">AI 강사</span>
              {isTyping && (
                <div className="flex items-center gap-[2px]" style={{ height: 10 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="rounded-full bg-cr-accent"
                      style={{
                        width: 2, height: 6,
                        animation: `mobileWave ${0.4 + i * 0.1}s ease-in-out ${i * 60}ms infinite alternate`,
                      }}
                    />
                  ))}
                  <style>{`@keyframes mobileWave { from{transform:scaleY(0.25)} to{transform:scaleY(1)} }`}</style>
                </div>
              )}
            </div>

            {/* 말풍선 텍스트 — 정확히 3줄 높이 고정, 넘치면 내부 스크롤 */}
            <div
              ref={speechBoxRef}
              className="text-sm md:text-base text-ybm-text leading-relaxed overflow-y-auto"
              style={{ height: 'calc(3 * 1.625em)' }}
            >
              {isLoading ? (
                <div className="flex items-center gap-1 h-5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-cr-accent/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              ) : (
                <>
                  {displayed}
                  {isTyping && (
                    <span
                      className="inline-block w-[1.5px] h-[0.9em] bg-cr-accent ml-[1px] align-middle rounded-full"
                      style={{ animation: 'mobileCursor 0.7s step-end infinite' }}
                    />
                  )}
                  <style>{`@keyframes mobileCursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
                </>
              )}
            </div>

            {/* inputSlot */}
            {inputSlot && <div className="shrink-0 pt-1">{inputSlot}</div>}
          </div>

          {/* 접기 버튼 */}
          <button
            onClick={onToggle}
            aria-label="강사 패널 접기"
            className="shrink-0 self-start w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-ybm-text-sub hover:bg-ybm-bg transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 8L6 4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : (
        /* ── 접힌 상태 (슬림 바) ── */
        <button
          onClick={onToggle}
          aria-label="강사 패널 열기"
          className="w-full h-[52px] md:h-[68px] flex items-center gap-2.5 md:gap-4 px-3 md:px-5 text-left"
        >
          {/* 작은 아바타 */}
          <div className="w-8 h-8 md:w-11 md:h-11 rounded-full overflow-hidden shrink-0 bg-cr-panel border border-ybm-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="AI 강사"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center top' }}
            />
          </div>

          {/* 말풍선 한 줄 */}
          <p className="flex-1 text-sm md:text-base text-ybm-text line-clamp-1 min-w-0">
            {displayed || speech || '…'}
          </p>

          {/* 펼치기 화살표 */}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-ybm-text-sub">
            <path d="M2 4L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
