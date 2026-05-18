'use client'

import { useState } from 'react'

export type DrawingTool = 'pen' | 'highlighter' | 'eraser'

export interface DrawingState {
  tool: DrawingTool
  color: string
}

interface DrawingToolbarProps {
  onChange?: (state: DrawingState) => void
  onClearAll?: () => void
}

const PALETTE = [
  { color: '#1A1A1A', label: '검정' },
  { color: '#2277F0', label: '파랑' },
  { color: '#EF4444', label: '빨강' },
  { color: '#F7C948', label: '노랑' },
]

export default function DrawingToolbar({ onChange, onClearAll }: DrawingToolbarProps) {
  const [tool, setTool]   = useState<DrawingTool>('pen')
  const [color, setColor] = useState(PALETTE[0].color)

  const handleTool = (next: DrawingTool) => {
    setTool(next)
    onChange?.({ tool: next, color })
  }

  const handleColor = (next: string) => {
    setColor(next)
    onChange?.({ tool, color: next })
  }

  return (
    <div className="flex items-center gap-3 w-full px-1">

      {/* ── 도구 버튼 ── */}
      <div className="flex items-center gap-1.5">
        <ToolBtn label="연필" active={tool === 'pen'} onClick={() => handleTool('pen')}>
          <PenIcon />
        </ToolBtn>
        <ToolBtn label="형광펜" active={tool === 'highlighter'} onClick={() => handleTool('highlighter')}>
          <HighlighterIcon />
        </ToolBtn>
        <ToolBtn label="지우개" active={tool === 'eraser'} onClick={() => handleTool('eraser')}>
          <EraserIcon />
        </ToolBtn>
        <ToolBtn label="전체 지우기" active={false} danger onClick={() => onClearAll?.()}>
          <TrashIcon />
        </ToolBtn>
      </div>

      {/* 구분선 */}
      <div className="h-6 w-px bg-ybm-border shrink-0" />

      {/* ── 색상 팔레트 (4개 고정) ── */}
      <div className="flex items-center gap-2">
        {PALETTE.map(({ color: c, label }) => (
          <ColorDot key={c} c={c} label={label} selected={color === c} onClick={() => handleColor(c)} />
        ))}
      </div>

    </div>
  )
}

/* ── 도구 버튼 래퍼: 작은 사각형 스타일 ── */
function ToolBtn({ children, label, active, danger = false, onClick }: {
  children: React.ReactNode; label: string; active: boolean; danger?: boolean; onClick: () => void
}) {
  const bg    = danger ? '#FFF1F1' : active ? '#2277F0' : '#EEF2FF'
  const color = danger ? '#EF4444' : active ? '#ffffff' : '#2277F0'
  const shadow = active && !danger ? '0 2px 8px rgba(34,119,240,0.28)' : 'none'

  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center rounded-lg transition-all focus:outline-none hover:brightness-95"
      style={{ width: 36, height: 36, backgroundColor: bg, color, boxShadow: shadow }}
    >
      {children}
    </button>
  )
}

/* ── 펜 아이콘 ── */
function PenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M13.5 2.5a1.5 1.5 0 012.121 2.121L6.5 13.743l-2.828.707.707-2.828L13.5 2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ── 형광펜 아이콘 ── */
function HighlighterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="5" y="2" width="8" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 12l2 4 2-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ── 지우개 아이콘 ── */
function EraserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M6 14L2.5 10.5a1.5 1.5 0 010-2.121l6-6a1.5 1.5 0 012.121 0L15.5 7.257a1.5 1.5 0 010 2.121L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 14l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

/* ── 휴지통 아이콘 ── */
function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 5h12M7 5V3.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="4" y="5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7.5 8.5v4M10.5 8.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

/* ── 색상 원형 버튼 ── */
function ColorDot({ c, label, selected, onClick }: {
  c: string; label: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="rounded-full transition-transform hover:scale-110 active:scale-95 focus:outline-none shrink-0"
      style={{
        width: 26,
        height: 26,
        backgroundColor: c,
        boxShadow: selected
          ? `0 0 0 2.5px white, 0 0 0 4.5px ${c}`
          : '0 1px 4px rgba(0,0,0,0.28)',
      }}
    />
  )
}
