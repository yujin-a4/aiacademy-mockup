'use client'

interface ExitConfirmModalProps {
  isOpen: boolean
  onContinue: () => void
  onExit: () => void
}

export default function ExitConfirmModal({ isOpen, onContinue, onExit }: ExitConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(17, 16, 40, 0.45)', backdropFilter: 'blur(2px)' }}
      onClick={onContinue}
    >
      <div
        className="bg-white rounded-3xl p-7 w-full max-w-[340px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 아이콘 */}
        <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h2 className="text-[17px] font-bold text-[#1C1B33] mb-1.5">학습을 종료하시겠습니까?</h2>
        <p className="text-[13px] text-[#6B7280] leading-relaxed">
          지금 나가면 현재까지의 진행 상황이<br />저장되지 않아요.
        </p>

        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onExit}
            className="flex-1 border-2 border-[#E5E7EB] text-[#6B7280] py-3 rounded-2xl font-bold text-[14px] hover:bg-[#F9FAFB] transition-colors"
          >
            종료하기
          </button>
          <button
            onClick={onContinue}
            className="flex-[1.5] bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-3 rounded-2xl font-bold text-[15px] transition-colors shadow-lg shadow-[#2563EB]/25"
          >
            계속 학습하기
          </button>
        </div>
      </div>
    </div>
  )
}
