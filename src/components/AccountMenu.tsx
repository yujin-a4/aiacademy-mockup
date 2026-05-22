'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const MENU = [
  { icon: '', label: '학습 설정', href: '/settings/learning' },
  { icon: '', label: '계정 설정', href: '/settings/account' },
]

export default function AccountMenu({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* 아바타 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#2563EB] flex items-center justify-center text-white font-black text-[13px] shrink-0 select-none transition-transform active:scale-90"
      >
        {userName ? userName[0].toUpperCase() : 'U'}
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[220px] bg-white border border-[#DBEAFE] rounded-2xl shadow-xl shadow-black/10 z-50 overflow-hidden animate-fade-in">
          {/* 유저 정보 */}
          <div className="px-4 py-3.5 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#2563EB] flex items-center justify-center text-white font-black text-[13px] shrink-0">
                {userName ? userName[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[#1C1B33] font-bold text-[13px] truncate">{userName || '학습자'}님</p>
                <p className="text-[#9CA3AF] text-[11px]">TOEIC 준비 중</p>
              </div>
            </div>
          </div>

          {/* 메뉴 */}
          <div className="py-1">
            {MENU.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8FAFF] transition-colors"
              >
                <span className="text-[15px] w-5 text-center shrink-0">{item.icon}</span>
                <span className="text-[13px] font-medium text-[#374151]">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
