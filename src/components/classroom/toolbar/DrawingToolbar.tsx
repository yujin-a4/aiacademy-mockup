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

const DEFAULT_COLOR: Record<DrawingTool, string> = {
  pen:         '#EF4444',
  highlighter: '#F7C948',
  eraser:      '#1A1A1A',
}

export default function DrawingToolbar({ onChange, onClearAll }: DrawingToolbarProps) {
  const [tool, setTool]   = useState<DrawingTool>('pen')
  const [color, setColor] = useState(DEFAULT_COLOR['pen'])

  const handleTool = (next: DrawingTool) => {
    const nextColor = DEFAULT_COLOR[next]
    setTool(next)
    setColor(nextColor)
    onChange?.({ tool: next, color: nextColor })
  }

  const handleColor = (next: string) => {
    setColor(next)
    onChange?.({ tool, color: next })
  }

  return (
    <div className="flex items-center gap-3 w-full px-1">

      {/* ── 도구 버튼 ── */}
      <div className="flex items-center gap-2">
        <StationeryBtn label="연필" active={tool === 'pen'} onClick={() => handleTool('pen')}>
          <PencilIcon />
        </StationeryBtn>
        <StationeryBtn label="형광펜" active={tool === 'highlighter'} onClick={() => handleTool('highlighter')}>
          <HighlighterIcon />
        </StationeryBtn>
        <StationeryBtn label="지우개" active={tool === 'eraser'} onClick={() => handleTool('eraser')}>
          <EraserIcon />
        </StationeryBtn>
        <button
          aria-label="전체 지우기"
          onClick={() => onClearAll?.()}
          className="flex items-center justify-center rounded-lg transition-all hover:brightness-95 active:scale-95 ml-1"
          style={{ width: 34, height: 34, backgroundColor: '#FFF1F1', color: '#EF4444' }}
        >
          <TrashIcon />
        </button>
      </div>

      {/* 구분선 */}
      <div className="h-6 w-px bg-ybm-border shrink-0" />

      {/* ── 색상 팔레트 ── */}
      <div className="flex items-center gap-2">
        {PALETTE.map(({ color: c, label }) => (
          <ColorDot key={c} c={c} label={label} selected={color === c} onClick={() => handleColor(c)} />
        ))}
      </div>

    </div>
  )
}

/* ── 스테이셔너리 버튼 래퍼 ── */
function StationeryBtn({ children, label, active, onClick }: {
  children: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center rounded-xl transition-all focus:outline-none hover:scale-105 active:scale-95"
      style={{
        width: 42,
        height: 42,
        border: active ? '2.5px solid #2277F0' : '2.5px solid transparent',
        background: active ? '#EFF6FF' : 'transparent',
        padding: 5,
      }}
    >
      {children}
    </button>
  )
}

/* ── 연필 아이콘 (심이 위쪽) ── */
function PencilIcon() {
  return (
    <svg width="16" height="32" viewBox="0 0 16 32" fill="none">
      {/* 깎인 나무 (위로 뾰족, 아래로 넓어짐) */}
      <path d="M2 20 L8 2 L14 20 Z" fill="#FDE68A"/>
      <path d="M2 20 L5.5 20 L8 2 Z" fill="#FEF3C7"/>
      <path d="M10.5 20 L14 20 L8 2 Z" fill="#D97706" fillOpacity="0.25"/>
      {/* 심 — 검정 */}
      <path d="M6.6 7 L8 1 L9.4 7 Z" fill="#111111"/>
      {/* 몸통 */}
      <rect x="2" y="20" width="12" height="11" fill="#CBD5E1"/>
      <rect x="2" y="20" width="4" height="11" fill="#E2E8F0"/>
      <rect x="10" y="20" width="4" height="11" fill="#94A3B8"/>
    </svg>
  )
}

/* ── 형광펜 아이콘 (팁이 위쪽) ── */
function HighlighterIcon() {
  return (
    <svg width="16" height="32" viewBox="0 0 16 32" fill="none">
      {/* 끌날 팁 — 노란색 (위) */}
      <path d="M3 12 L2.5 1 L8.5 1 L13 12 Z" fill="#FCD34D"/>
      <path d="M3 12 L2.5 1 L5.5 1 Z" fill="#FDE68A"/>
      <path d="M9.5 1 L13 12 L8.5 1 Z" fill="#D97706" fillOpacity="0.3"/>
      {/* 연결부 */}
      <rect x="3" y="12" width="10" height="3" fill="#9CA3AF"/>
      {/* 몸통 — 회색 */}
      <rect x="2" y="15" width="12" height="16" rx="1" fill="#CBD5E1"/>
      <rect x="2" y="15" width="4" height="16" fill="#E2E8F0"/>
      <rect x="10" y="15" width="4" height="16" fill="#94A3B8"/>
    </svg>
  )
}

/* ── 지우개 아이콘 ── */
function EraserIcon() {
  return (
    <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
      {/* 몸통 (핑크) */}
      <rect x="1" y="1" width="24" height="12" rx="2.5" fill="#FCA5A5"/>
      <rect x="1" y="1" width="7" height="12" rx="2.5" fill="#FECACA"/>
      <rect x="20" y="1" width="5" height="12" rx="2" fill="#F87171" fillOpacity="0.35"/>
      <rect x="1" y="1" width="24" height="12" rx="2.5" stroke="#F87171" strokeWidth="0.7"/>
      {/* 아래 흰 띠 (지워진 면) */}
      <rect x="1" y="11" width="24" height="8" rx="2" fill="#F3F4F6"/>
      <rect x="1" y="11" width="24" height="8" rx="2" stroke="#E5E7EB" strokeWidth="0.7"/>
      {/* 줄무늬 */}
      <path d="M5 5.5h16" stroke="#F87171" strokeWidth="1" strokeLinecap="round" strokeDasharray="3 2"/>
    </svg>
  )
}

/* ── 휴지통 아이콘 ── */
function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
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
