'use client'

import React from 'react'
import { useFontSettingsStore, FontSize, FontType } from '@/store/fontSettingsStore'

export default function FontSettingsController() {
  const { fontSize, fontType, setFontSize, setFontType } = useFontSettingsStore()

  const sizes: { value: FontSize; label: string; desc: string }[] = [
    { value: 'small', label: '작게', desc: '14px' },
    { value: 'normal', label: '보통', desc: '16px' },
    { value: 'large', label: '크게', desc: '19px' },
    { value: 'xlarge', label: '아주 크게', desc: '22px' },
  ]

  const types: { value: FontType; label: string; desc: string }[] = [
    { value: 'serif', label: '실전 시험 서체', desc: 'Times New Roman / Georgia' },
    { value: 'sans', label: '고딕 서체', desc: 'Pretendard / Sans-serif' },
  ]

  return (
    <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-sm space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-[#1C1B33]">보기 설정</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
          <path d="M4 20V7a3 3 0 0 1 3-3h1" /><path d="M13 20v-9a2 2 0 0 1 2-2h1" /><path d="M2 12h8" /><path d="M12 16h7" />
        </svg>
      </div>

      <div className="h-px bg-[#E5E7EB]" />

      {/* 글씨 크기 */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-[#9CA3AF]">글자 크기</label>
        <div className="grid grid-cols-4 gap-1.5">
          {sizes.map((s) => {
            const isSelected = fontSize === s.value
            return (
              <button
                key={s.value}
                onClick={() => setFontSize(s.value)}
                className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                    : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#C7D2FE]'
                }`}
              >
                <div>{s.label}</div>
                <div className="text-[9px] opacity-60 font-normal">{s.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 폰트 서체 */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-[#9CA3AF]">본문 서체</label>
        <div className="grid grid-cols-2 gap-1.5">
          {types.map((t) => {
            const isSelected = fontType === t.value
            return (
              <button
                key={t.value}
                onClick={() => setFontType(t.value)}
                className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                  isSelected
                    ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                    : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#C7D2FE]'
                }`}
              >
                <div>{t.label}</div>
                <div className="text-[9px] opacity-60 font-normal">{t.desc}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
