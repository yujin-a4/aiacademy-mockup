'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { INSTRUCTOR_ROSTER, INST_NAME, INST_THUMBS, hasOwnAgent } from '@/data/instructorData'

/* 학습 설정 — 강사 변경.
   강사를 바꾸면 selectedInstructor 하나만 갱신되고, 대시보드·수업 화면·튜터 에이전트가 모두 그걸 따라간다.
   ※ 스캐폴딩 레일은 아직 이도윤 ver 한 벌뿐이라 강사를 바꿔도 "짚는 순서"는 같고 목소리·얼굴·화법만 바뀐다.
     테스트 중 혼동하지 않게 카드에 그 사실을 표시해 둔다. */
export default function LearningSettings() {
  const selected = useOnboardingStore((s) => s.selectedInstructor)
  const setSelectedInstructor = useOnboardingStore((s) => s.setSelectedInstructor)
  const [open, setOpen] = useState(true)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const pick = (id: string) => {
    setSelectedInstructor(id)
    setSavedAt(id)
    setTimeout(() => setSavedAt(null), 1800)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] font-sans">
      <header className="px-6 py-4 flex items-center gap-3 bg-white border-b border-[#DBEAFE]">
        <Link href="/dashboard" className="p-2 -ml-2 text-[#6B7280]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <p className="text-[#1C1B33] font-bold text-[16px]">학습 설정</p>
      </header>

      <div className="max-w-[600px] mx-auto px-5 py-6 space-y-2">
        {/* 강사 선택하기 */}
        <div className="bg-white border border-[#DBEAFE] rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#FAFCFF] transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[#1C1B33] font-semibold text-[14px]">강사 선택하기</p>
              <p className="text-[#9CA3AF] text-[12px] mt-0.5">
                {selected ? `현재 ${INST_NAME[selected] ?? '미선택'} 선생님` : '내 학습 스타일에 맞는 강사를 바꿀 수 있어요'}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"
              className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6"/></svg>
          </button>

          {open && (
            <div className="px-4 pb-4 space-y-2 border-t border-[#EFF6FF] pt-3">
              {INSTRUCTOR_ROSTER.map((inst) => {
                const active = selected === inst.id
                return (
                  <button
                    key={inst.id}
                    onClick={() => pick(inst.id)}
                    className={`w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left border transition-all ${
                      active ? 'border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#2563EB]/30' : 'border-[#E5E7EB] bg-white hover:border-[#C7D2FE]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={INST_THUMBS[inst.id]} alt={INST_NAME[inst.id]}
                      className="w-11 h-11 rounded-full object-cover object-top border border-[#DBEAFE] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[14px] font-bold text-[#1C1B33]">{INST_NAME[inst.id]}</span>
                        <span className="text-[11px] font-semibold text-[#2563EB]">{inst.tag}</span>
                        {!hasOwnAgent(inst.id) && (
                          <span className="text-[10px] font-semibold text-[#B45309] bg-[#FEF3C7] rounded px-1.5 py-0.5">
                            전용 음성 없음
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#6B7280] mt-0.5 leading-snug">{inst.desc}</p>
                    </div>
                    {active && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </button>
                )
              })}

              {savedAt && (
                <p className="text-[12px] font-semibold text-[#15803D] bg-[#DCFCE7] rounded-lg px-3 py-2 animate-fade-in">
                  {INST_NAME[savedAt]} 선생님으로 변경했어요. 대시보드와 수업에 바로 반영돼요.
                </p>
              )}

              <p className="text-[11px] text-[#9CA3AF] leading-relaxed pt-1">
                ※ 현재 스캐폴딩 수업 단계는 이도윤 선생님 버전 한 벌만 준비돼 있어요.
                다른 선생님을 골라도 짚어주는 순서는 같고 목소리·화법이 달라집니다.
              </p>
            </div>
          )}
        </div>

        {/* 푸시알림 설정 (미구현) */}
        <button className="w-full bg-white border border-[#DBEAFE] rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-[#C7D2FE] transition-colors text-left shadow-sm">
          <div className="flex-1 min-w-0">
            <p className="text-[#1C1B33] font-semibold text-[14px]">푸시알림 설정</p>
            <p className="text-[#9CA3AF] text-[12px] mt-0.5">학습 알림, 데일리 리마인더 시간을 설정해요</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" className="shrink-0"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  )
}
