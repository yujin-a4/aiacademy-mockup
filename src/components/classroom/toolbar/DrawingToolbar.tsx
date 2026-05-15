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

const PALETTE_BASE = [
  { color: '#1A1A1A', label: '검정' },
  { color: '#2277F0', label: '파랑' },
  { color: '#EF4444', label: '빨강' },
  { color: '#F7C948', label: '노랑' },
]

const PALETTE_MORE = [
  { color: '#22C55E', label: '초록' },
  { color: '#A855F7', label: '보라' },
  { color: '#F97316', label: '주황' },
  { color: '#EC4899', label: '핑크' },
]

export default function DrawingToolbar({ onChange, onClearAll }: DrawingToolbarProps) {
  const [tool, setTool]     = useState<DrawingTool>('pen')
  const [color, setColor]   = useState(PALETTE_BASE[0].color)
  const [showMore, setShowMore] = useState(false)

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
      <div className="flex items-end gap-0.5">
        <ToolBtn label="연필" active={tool === 'pen'} onClick={() => handleTool('pen')}>
          <PencilSvg bodyColor="#2C2C2C" tipColor="#F5DEB3" active={tool === 'pen' && color !== '#2277F0'} />
        </ToolBtn>
        <ToolBtn label="파란 연필" active={tool === 'pen' && color === '#2277F0'} onClick={() => { handleColor('#2277F0'); handleTool('pen') }}>
          <PencilSvg bodyColor="#2277F0" tipColor="#cce0ff" active={tool === 'pen' && color === '#2277F0'} />
        </ToolBtn>
        <ToolBtn label="형광펜" active={tool === 'highlighter'} onClick={() => handleTool('highlighter')}>
          <MarkerSvg active={tool === 'highlighter'} />
        </ToolBtn>
        <ToolBtn label="지우개" active={tool === 'eraser'} onClick={() => handleTool('eraser')}>
          <EraserSvg active={tool === 'eraser'} />
        </ToolBtn>
        <ToolBtn label="전체 지우기" active={false} onClick={() => onClearAll?.()}>
          <TrashToolSvg />
        </ToolBtn>
      </div>

      {/* 구분선 */}
      <div className="h-8 w-px bg-ybm-border shrink-0" />

      {/* ── 색상 팔레트 ── */}
      <div className="flex items-center gap-2">
        {PALETTE_BASE.map(({ color: c, label }) => (
          <ColorDot key={c} c={c} label={label} selected={color === c} onClick={() => handleColor(c)} size={26} />
        ))}

        {/* 더보기 */}
        <button
          onClick={() => setShowMore((v) => !v)}
          className="w-[26px] h-[26px] rounded-full border-2 border-ybm-border bg-white flex items-center justify-center hover:bg-ybm-bg transition-colors shrink-0"
          aria-label="더 많은 색상"
        >
          <span className="text-ybm-text-sub text-[10px] font-bold leading-none tracking-tighter">···</span>
        </button>

        {/* 확장 팔레트 */}
        {showMore && PALETTE_MORE.map(({ color: c, label }) => (
          <ColorDot key={c} c={c} label={label} selected={color === c} size={22}
            onClick={() => { handleColor(c); setShowMore(false) }}
          />
        ))}
      </div>

    </div>
  )
}

/* ── 색상 원형 버튼 ── */
function ColorDot({ c, label, selected, onClick, size }: {
  c: string; label: string; selected: boolean; onClick: () => void; size: number
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="rounded-full transition-transform hover:scale-110 active:scale-95 focus:outline-none shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: c,
        boxShadow: selected
          ? `0 0 0 2.5px white, 0 0 0 4.5px ${c}`
          : '0 1px 4px rgba(0,0,0,0.28)',
      }}
    />
  )
}

/* ── 도구 버튼 래퍼 ── */
function ToolBtn({ children, label, active, onClick }: {
  children: React.ReactNode; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`flex items-end justify-center rounded-xl transition-all p-1.5
        ${active ? 'bg-blue-50 ring-2 ring-[#2277F0] ring-offset-1' : 'hover:bg-ybm-bg'}
      `}
      style={{ minWidth: 44, minHeight: 52 }}
    >
      {children}
    </button>
  )
}

/* ── 연필 SVG ── */
function PencilSvg({ bodyColor, tipColor, active }: { bodyColor: string; tipColor: string; active?: boolean }) {
  return (
    <svg width="22" height="46" viewBox="0 0 22 46" fill="none" style={{ opacity: active ? 1 : 0.72 }}>
      <rect x="7" y="1" width="8" height="5" rx="2" fill="#F9A8C9" />
      <rect x="6" y="5.5" width="10" height="2" rx="0.5" fill="#D1D5DB" />
      <rect x="6" y="7" width="10" height="24" rx="1" fill={bodyColor} />
      <path d="M6 31 L11 44 L16 31 Z" fill={tipColor} />
      <path d="M10 40 L11 44 L12 40" fill="#4A4A4A" />
    </svg>
  )
}

/* ── 형광펜 SVG ── */
function MarkerSvg({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="46" viewBox="0 0 22 46" fill="none" style={{ opacity: active ? 1 : 0.72 }}>
      <rect x="6" y="1" width="10" height="8" rx="3" fill="#1A1A1A" />
      <rect x="5" y="8" width="12" height="26" rx="2" fill="#F7C948" />
      <rect x="5" y="22" width="12" height="3" fill="#E5B800" />
      <path d="M7 34 L11 44 L15 34 Z" fill="#2C2C2C" />
    </svg>
  )
}

/* ── 지우개 SVG ── */
function EraserSvg({ active }: { active?: boolean }) {
  return (
    <svg width="26" height="42" viewBox="0 0 26 42" fill="none" style={{ opacity: active ? 1 : 0.72 }}>
      <rect x="3" y="10" width="20" height="24" rx="3" fill="#F9A8C9" />
      <rect x="3" y="28" width="20" height="6" rx="2" fill="#93C5FD" />
      <rect x="3" y="8" width="20" height="4" rx="1.5" fill="#D1D5DB" />
      <rect x="1" y="37" width="24" height="3" rx="1.5" fill="#9CA3AF" />
    </svg>
  )
}

/* ── 툴바용 휴지통 SVG (연필과 같은 높이 스타일) ── */
function TrashToolSvg() {
  return (
    <svg width="22" height="28" viewBox="0 0 22 28" fill="none">
      <path d="M4 8h14M8 8V6a1 1 0 011-1h4a1 1 0 011 1v2" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="4" y="8" width="14" height="16" rx="2" stroke="#EF4444" strokeWidth="1.5"/>
      <path d="M9 13v6M13 13v6" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
