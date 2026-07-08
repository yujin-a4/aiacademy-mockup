'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const STEPS_PREVIEW = [
  '4가지 질문으로 학습 유형 분석',
  '목표 점수와 시험일 설정',
  'AI 맞춤 커리큘럼 제안',
]

export default function NameInput({ onNext }: { onNext: () => void }) {
  const setUserName = useOnboardingStore((s) => s.setUserName)
  const [input, setInput] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    if (!input.trim()) return
    setUserName(input.trim())
    setConfirmed(true)
  }

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center p-4 gap-4">
      {/* 헤더 */}
      <div className="w-full max-w-[1032px] flex items-center gap-2.5">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
          <img src="/logo.svg" alt="YBM" className="w-4 h-4 brightness-0 invert"
            onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
        </div>
        <span className="text-[#374151] text-[13px] font-bold">YBM AI 어학원</span>
      </div>

      <div className="w-full max-w-[1032px] min-h-[600px] rounded-3xl overflow-hidden shadow-2xl shadow-black/10 flex flex-col md:flex-row">
        {/* ── 좌측 ── */}
        <div className="relative md:w-[45%] bg-gradient-to-br from-[#3B82F6] to-[#2563EB] p-8 md:p-10 flex flex-col justify-center overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-[#1D4ED8]/40 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[11px] font-black px-3.5 py-1 rounded-full tracking-widest mb-6 uppercase">
              STEP 1
            </span>
            <h2 className="text-white text-[28px] md:text-[34px] font-black leading-tight mb-4">
              먼저<br />이름을 알려주세요
            </h2>
            <p className="text-white/65 text-[14px] leading-relaxed mb-10">
              맞춤 학습 코스를 구성하는 데 사용돼요.
            </p>

            <div className="space-y-3">
              {STEPS_PREVIEW.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px] font-black">{i + 1}</span>
                  </div>
                  <p className="text-white/85 text-[13px] font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 우측 ── */}
        <div className="md:w-[55%] bg-white flex flex-col justify-center px-8 md:px-10 py-10">
          {!confirmed ? (
            <div className="animate-fade-in">
              <h3 className="text-[#0F172A] text-[22px] font-black mb-2">이름 입력</h3>
              <p className="text-[#64748B] text-[14px] mb-8">닉네임이나 이름을 입력해주세요</p>
              <div className="space-y-4">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                  placeholder="이름 입력"
                  autoFocus
                  className="w-full h-14 px-5 rounded-xl border-2 border-[#E5E7EB] focus:border-primary text-[#0F172A] placeholder-[#CBD5E1] outline-none transition-colors text-center text-[20px] font-bold"
                />
                <button
                  onClick={handleConfirm}
                  disabled={!input.trim()}
                  className="w-full h-12 bg-primary hover:bg-[#1D4ED8] disabled:opacity-35 text-white font-bold text-[15px] rounded-xl transition-all active:scale-[0.98]"
                >
                  확인
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center text-4xl">
                👋
              </div>
              <div>
                <h2 className="text-[#0F172A] text-[28px] md:text-[32px] font-black leading-tight">
                  반갑습니다,<br />
                  <span className="text-primary">{useOnboardingStore.getState().userName}</span>님!
                </h2>
                <p className="text-[#64748B] text-[14px] mt-3 leading-relaxed">
                  간단한 질문 4개로<br />딱 맞는 학습 스타일을 찾아드릴게요
                </p>
              </div>
              <button
                onClick={onNext}
                className="w-full flex items-center justify-center h-12 bg-primary hover:bg-[#1D4ED8] text-white font-bold text-[15px] rounded-xl transition-all active:scale-[0.98] gap-2"
              >
                시작하기
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
