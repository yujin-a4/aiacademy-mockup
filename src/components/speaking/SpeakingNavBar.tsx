'use client'

import { useSpeakingStore } from '@/store/speakingStore'
import { stopCurrentAudio } from '@/lib/tts'

interface Props {
  onNext: () => void
  highlighted?: boolean
}

const TOTAL_SCREENS = 8

export default function SpeakingNavBar({ onNext, highlighted = false }: Props) {
  const { currentScreen, prevScreen } = useSpeakingStore()
  const isLast = currentScreen === TOTAL_SCREENS - 1

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        onClick={() => { stopCurrentAudio(); prevScreen() }}
        disabled={currentScreen === 0}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
          ${currentScreen === 0
            ? 'opacity-30 cursor-not-allowed text-ybm-text-sub'
            : 'text-ybm-text hover:bg-ybm-bg active:scale-95'}
        `}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        이전 단계
      </button>

      <span className="text-xs text-ybm-text-sub tabular-nums font-medium">
        {currentScreen + 1} / 8
      </span>

      <button
        onClick={() => { stopCurrentAudio(); onNext() }}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all duration-300
          ${highlighted
            ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4] shadow-sm'
            : 'text-ybm-text hover:bg-ybm-bg'}
        `}
      >
        {isLast ? '학습 종료' : '다음 단계'}
        {isLast ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7l3 3 6-6" stroke={highlighted ? 'white' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l5 4-5 4" stroke={highlighted ? 'white' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  )
}
