'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'

interface InstructorPanelProps {
  speech: string
  isLoading?: boolean
  inputSlot?: React.ReactNode
  imageSrc?: string
  instructorName?: string
}

const CHAR_DELAY_MS = 28 // 한 글자당 딜레이

export default function InstructorPanel({
  speech,
  isLoading = false,
  inputSlot,
  imageSrc = '/instructor/park.png',
  instructorName = 'AI 강사',
}: InstructorPanelProps) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* speech가 바뀔 때마다 타자기 효과 */
  useEffect(() => {
    if (!speech || isLoading) {
      setDisplayed('')
      setIsTyping(false)
      return
    }

    setDisplayed('')
    setIsTyping(true)
    let idx = 0

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      idx += 1
      setDisplayed(speech.slice(0, idx))
      if (idx >= speech.length) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        setIsTyping(false)
      }
    }, CHAR_DELAY_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [speech, isLoading])

  return (
    <div className="flex flex-col h-full bg-cr-panel">

      {/* ── 태블릿: 강사 이미지 (세로 전체, 가로 꽉 채움) ── */}
      <div className="hidden lg:block relative w-full shrink-0" style={{ paddingTop: 68 }}>
        {imageSrc ? (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={instructorName}
              className="w-full h-auto block"
              style={{ display: 'block' }}
            />
            {/* 하단 뱃지 오버레이 */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <span className="bg-cr-accent/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                YBM AI 어학원
              </span>
              <span className="bg-black/30 text-white text-[10px] px-2 py-0.5 rounded-full">{instructorName}</span>
            </div>
          </div>
        ) : (
          <div className="w-full bg-cr-accent-light rounded-2xl flex items-center justify-center" style={{ height: 200 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-cr-accent/30">
              <circle cx="24" cy="18" r="10" stroke="currentColor" strokeWidth="2.5" />
              <path d="M6 44c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* ── 말풍선 ── */}
      <div className="mx-3 mt-2 mb-2 bg-white rounded-2xl shadow-sm border border-ybm-border/50 overflow-hidden">

        {/* 말풍선 헤더: 강사 이름 + 상태 인디케이터 */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1.5 border-b border-ybm-border/40">
          <span className="text-xs font-semibold text-cr-accent">{instructorName}</span>
          {isLoading ? (
            /* 생각 중 */
            <div className="flex items-center gap-1 ml-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-cr-accent/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          ) : isTyping ? (
            /* 말하는 중: 음파 바 애니메이션 */
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
            /* 완료: 체크 */
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="ml-0.5 opacity-50">
              <path d="M2.5 6.5l3 3 5-5" stroke="#2277F0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        {/* 말풍선 본문 */}
        <div className="px-4 py-3 min-h-[80px]">
          {isLoading ? (
            <LoadingDots />
          ) : (
            <p className="text-ybm-text text-sm leading-relaxed">
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

      {/* ── 입력 슬롯 ── */}
      {inputSlot && (
        <div className="px-3 pb-3">
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
