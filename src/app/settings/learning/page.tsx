'use client'
import Link from 'next/link'

const ITEMS = [
  { icon: '🎓', label: '강사 선택하기',  desc: '내 학습 스타일에 맞는 강사를 바꿀 수 있어요' },
  { icon: '🔔', label: '푸시알림 설정',  desc: '학습 알림, 데일리 리마인더 시간을 설정해요' },
]

export default function LearningSettings() {
  return (
    <div className="min-h-screen bg-[#F8FAFF] font-sans">
      <header className="px-6 py-4 flex items-center gap-3 bg-white border-b border-[#ECEAF5]">
        <Link href="/dashboard" className="p-2 -ml-2 text-[#6B7280]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <p className="text-[#1C1B33] font-bold text-[16px]">학습 설정</p>
      </header>

      <div className="max-w-[600px] mx-auto px-5 py-6 space-y-2">
        {ITEMS.map((item) => (
          <button
            key={item.label}
            className="w-full bg-white border border-[#ECEAF5] rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-[#C7D2FE] transition-colors text-left shadow-sm"
          >
            <span className="text-[22px] shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[#1C1B33] font-semibold text-[14px]">{item.label}</p>
              <p className="text-[#9CA3AF] text-[12px] mt-0.5">{item.desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" className="shrink-0"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ))}
      </div>
    </div>
  )
}
