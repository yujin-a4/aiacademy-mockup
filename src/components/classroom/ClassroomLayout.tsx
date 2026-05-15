'use client'

import { useState } from 'react'
import ClassroomTopNav from './ClassroomTopNav'
import InstructorPanel from './InstructorPanel'
import InstructorPip from './InstructorPip'

interface ClassroomLayoutProps {
  partName: string
  totalProblems: number
  instructorSpeech: string
  instructorLoading?: boolean
  onEnd?: () => void
  children: React.ReactNode
  toolbar?: React.ReactNode
  instructorInput?: React.ReactNode
  /** PIP 마이크 버튼 동작 (패널 닫혔을 때) */
  onPipMic?: () => void
  /** PIP에서 마이크가 활성화됐는지 여부 */
  pipListening?: boolean
}

export default function ClassroomLayout({
  partName,
  totalProblems,
  instructorSpeech,
  instructorLoading = false,
  onEnd,
  children,
  toolbar,
  instructorInput,
  onPipMic,
  pipListening = false,
}: ClassroomLayoutProps) {
  const [panelOpen, setPanelOpen] = useState(true)

  return (
    <div className="h-dvh flex flex-col bg-ybm-bg overflow-hidden">
      {/* 상단 네비바 */}
      <ClassroomTopNav
        partName={partName}
        totalProblems={totalProblems}
        onEnd={onEnd}
      />

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">

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
              inputSlot={instructorInput}
            />
          </div>
        </aside>

        {/* ── 콘텐츠 영역 ── */}
        <main className="order-2 lg:order-1 flex-1 overflow-y-auto p-4 min-h-0">
          {children}
        </main>

        {/* ── 패널 토글 탭 (태블릿 전용) ── */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
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
            <path d="M7 2L2 8l5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* 하단 툴바 */}
      {toolbar && (
        <div className="shrink-0 border-t border-ybm-border bg-white">
          {toolbar}
        </div>
      )}

      {/* ── 플로팅 PIP (패널 닫혔을 때만 표시) ── */}
      {!panelOpen && (
        <InstructorPip
          speech={instructorSpeech}
          isLoading={instructorLoading}
          onOpen={() => setPanelOpen(true)}
          onMic={() => onPipMic?.()}
          isListening={pipListening}
        />
      )}
    </div>
  )
}
