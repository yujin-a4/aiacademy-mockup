'use client'

import { useState, useEffect } from 'react'
import ClassroomTopNav from './ClassroomTopNav'
import InstructorPanel from './InstructorPanel'
import InstructorPip from './InstructorPip'
import MobileInstructorBar from './MobileInstructorBar'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

interface ClassroomLayoutProps {
  partName: string
  totalProblems: number
  instructorSpeech: string
  instructorLoading?: boolean
  /** 강사 영상 src (없으면 이미지 표시) */
  instructorVideoSrc?: string
  /** 영상 재생 완료 콜백 */
  onInstructorVideoEnd?: () => void
  onEnd?: () => void
  children: React.ReactNode
  toolbar?: React.ReactNode
  instructorInput?: React.ReactNode
  onPipMic?: () => void
  pipListening?: boolean
  /** 외부에서 패널 열림/닫힘을 제어할 때 사용. 미제공 시 내부 토글 상태로 동작 */
  panelOpen?: boolean
  onPanelToggle?: () => void
  /** true이면 패널 닫혔을 때 플로팅 PIP를 숨김 */
  disablePip?: boolean
}

export default function ClassroomLayout({
  partName,
  totalProblems,
  instructorSpeech,
  instructorLoading = false,
  instructorVideoSrc,
  onInstructorVideoEnd,
  onEnd,
  children,
  toolbar,
  instructorInput,
  onPipMic,
  pipListening = false,
  panelOpen: controlledOpen,
  onPanelToggle,
  disablePip = false,
}: ClassroomLayoutProps) {
  const isDesktop = useIsDesktop()

  // ── 데스크탑/태블릿 패널 상태 ──
  const [internalOpen, setInternalOpen] = useState(true)
  const panelOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const handleToggle = () => {
    if (controlledOpen !== undefined) onPanelToggle?.()
    else setInternalOpen((v) => !v)
  }

  // ── 모바일 강사 바 상태 ──
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true)

  // 강사가 새 발화를 시작하면 자동으로 펼침
  useEffect(() => {
    if (instructorSpeech) setMobilePanelOpen(true)
  }, [instructorSpeech])

  return (
    <div className="h-dvh flex flex-col bg-ybm-bg overflow-hidden">

      {/* ─── 공통: 상단 네비바 ─── */}
      <ClassroomTopNav
        partName={partName}
        totalProblems={totalProblems}
        onEnd={onEnd}
      />

      {/* ════════════════════════════════════════
          모바일/태블릿 세로 레이아웃 (< lg / 1024px)
          강사 헤더 접이식 + 문제 영역 풀스크린
      ════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 lg:hidden">

        <MobileInstructorBar
          speech={instructorSpeech}
          isLoading={instructorLoading}
          videoSrc={!isDesktop ? instructorVideoSrc : undefined}
          onVideoEnd={onInstructorVideoEnd}
          inputSlot={instructorInput}
          isOpen={mobilePanelOpen}
          onToggle={() => setMobilePanelOpen((v) => !v)}
        />

        {/* 문제 메인 영역 */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 min-h-0">
          {children}
        </main>
      </div>

      {/* ════════════════════════════════════════
          데스크탑 레이아웃 (lg 이상 / 1024px+)
          기존 사이드바 레이아웃 그대로 유지
      ════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-1 flex-col lg:flex-row overflow-hidden min-h-0 relative">

        {/* ── 강사 패널 ── */}
        <aside
          className={`order-1 lg:order-2 lg:shrink-0 lg:h-full transition-all duration-300 ease-in-out overflow-hidden
            ${panelOpen ? 'lg:w-[320px] xl:w-[360px]' : 'lg:w-0 xl:w-0 opacity-0 pointer-events-none'}
          `}
        >
          <div className="w-[320px] xl:w-[360px] h-full">
            <InstructorPanel
              speech={instructorSpeech}
              isLoading={instructorLoading}
              videoSrc={isDesktop ? instructorVideoSrc : undefined}
              onVideoEnd={onInstructorVideoEnd}
              inputSlot={instructorInput}
            />
          </div>
        </aside>

        {/* ── 콘텐츠 영역 ── */}
        <main className="order-2 lg:order-1 flex-1 overflow-y-auto p-4 min-h-0">
          {children}
        </main>

        {/* ── 패널 토글 탭 ── */}
        <button
          onClick={handleToggle}
          aria-label={panelOpen ? '강사 패널 접기' : '강사 패널 열기'}
          className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 z-20
            items-center justify-center
            w-5 h-14 rounded-l-xl
            bg-white border border-ybm-border border-r-0
            shadow-sm hover:bg-ybm-bg transition-all duration-300
            ${panelOpen ? 'right-[320px] xl:right-[360px]' : 'right-0'}
          `}
        >
          <svg
            width="10" height="16" viewBox="0 0 10 16" fill="none"
            className={`text-ybm-text-sub transition-transform duration-300 ${panelOpen ? 'rotate-180' : ''}`}
          >
            <path d="M7 2L2 8l5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ─── 공통: 하단 툴바 ─── */}
      {toolbar && (
        <div className="shrink-0 border-t border-ybm-border bg-white">
          {toolbar}
        </div>
      )}

      {/* ─── 플로팅 PIP (데스크탑 패널 닫혔을 때만) ─── */}
      {!panelOpen && !disablePip && (
        <div className="hidden lg:block">
          <InstructorPip
            speech={instructorSpeech}
            isLoading={instructorLoading}
            onOpen={handleToggle}
            onMic={() => onPipMic?.()}
            isListening={pipListening}
          />
        </div>
      )}
    </div>
  )
}
