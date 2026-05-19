'use client'
import Link from 'next/link'

const ITEMS = [
  { icon: '📢', label: '공지사항',  desc: '앱 업데이트 및 서비스 안내를 확인하세요',  danger: false },
  { icon: '💬', label: '문의하기',  desc: '불편한 점이나 제안 사항을 보내주세요',     danger: false },
  { icon: '📄', label: '이용약관',  desc: '서비스 이용약관 및 개인정보처리방침',      danger: false },
]

export default function AccountSettings() {
  return (
    <div className="min-h-screen bg-[#F8FAFF] font-sans">
      <header className="px-6 py-4 flex items-center gap-3 bg-white border-b border-[#ECEAF5]">
        <Link href="/dashboard" className="p-2 -ml-2 text-[#6B7280]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <p className="text-[#1C1B33] font-bold text-[16px]">계정 설정</p>
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

        {/* 로그아웃 */}
        <div className="pt-2">
          <button className="w-full bg-white border border-[#ECEAF5] rounded-2xl px-5 py-4 flex items-center gap-4 hover:bg-[#FEF2F2] hover:border-[#FECACA] transition-colors text-left shadow-sm">
            <span className="text-[22px] shrink-0">🚪</span>
            <div className="flex-1 min-w-0">
              <p className="text-[#DC2626] font-semibold text-[14px]">로그아웃</p>
              <p className="text-[#9CA3AF] text-[12px] mt-0.5">앱에서 로그아웃합니다</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
