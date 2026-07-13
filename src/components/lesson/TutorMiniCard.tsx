'use client'

/* 접힌 강사 패널의 미니 카드 — 우하단 플로팅, 탭하면 패널 복귀. (UI 실험: 강사 패널 접기) */

interface Props {
  imgSrc: string
  name?: string
  connected: boolean
  isSpeaking?: boolean
  lastAi?: string
  onOpen: () => void
}

export default function TutorMiniCard({ imgSrc, name = '박혜원 AI 강사', connected, isSpeaking = false, lastAi, onOpen }: Props) {
  return (
    <button
      onClick={onOpen}
      aria-label="강사 패널 열기"
      className="fixed bottom-5 right-4 z-30 flex items-center gap-3 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg pl-2.5 pr-4 py-2.5 max-w-[320px] text-left hover:shadow-xl transition-shadow"
      style={{ boxShadow: '0 4px 24px rgba(34,119,240,0.14), 0 1px 4px rgba(0,0,0,0.08)' }}
    >
      <span className={`relative shrink-0 block w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${connected && isSpeaking ? 'border-[#2277F0] shadow-[0_0_14px_rgba(34,119,240,0.5)]' : 'border-[#2277F0]/30'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt={name} className="w-full h-full object-cover object-top" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-[12px] font-bold text-gray-600">{name}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
        </span>
        <span className="block text-[12px] text-gray-500 leading-snug line-clamp-2">
          {lastAi || (connected ? '강사가 곧 말을 걸어요…' : '탭하면 강사 패널이 열려요')}
        </span>
      </span>
      <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
    </button>
  )
}

/* 패널 헤더용 접기 버튼 */
export function PanelCollapseButton({ onCollapse }: { onCollapse: () => void }) {
  return (
    <button onClick={onCollapse} aria-label="강사 패널 접기" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 14h6v6M20 10h-6V4" /></svg>
    </button>
  )
}
