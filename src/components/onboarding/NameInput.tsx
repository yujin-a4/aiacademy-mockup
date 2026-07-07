'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

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
    <div className="flex flex-col min-h-screen bg-[#F8FAFF]">

      {/* 상단 바 */}
      <header className="flex items-center px-6 md:px-12 py-4 md:py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <img src="/logo.svg" alt="YBM" className="w-4 h-4 brightness-0 invert"
              onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
          </div>
          <span className="text-[#374151] text-[13px] font-bold hidden sm:block">YBM AI 어학원</span>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pb-10">
        <div className="w-full max-w-[520px]">

          {!confirmed ? (
            <div className="animate-fade-in">
              {/* 타이틀 */}
              <div className="text-center mb-8 md:mb-10">
                <span className="inline-block bg-primary text-white text-[11px] font-black px-3.5 py-1 rounded-full tracking-widest mb-4 uppercase">
                  STEP 1
                </span>
                <h2 className="text-[#0F172A] text-[26px] md:text-[32px] font-black leading-tight">
                  먼저<br />이름을 알려주세요
                </h2>
                <p className="text-[#64748B] text-[14px] mt-3">
                  맞춤 학습 코스를 구성하는 데 사용돼요
                </p>
              </div>

              {/* 입력 카드 */}
              <div className="bg-white border-2 border-[#E5E7EB] rounded-2xl p-6 md:p-8 space-y-4">
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
                  className="w-full h-12 bg-primary hover:bg-primary-600 disabled:opacity-35 text-white font-bold text-[15px] rounded-xl transition-all active:scale-[0.98]"
                >
                  확인
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in text-center space-y-6">
              {/* 환영 아이콘 */}
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center text-4xl">
                👋
              </div>

              {/* 환영 메시지 */}
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
                className="w-full max-w-[280px] mx-auto flex items-center justify-center h-12 bg-primary hover:bg-primary-600 text-white font-bold text-[15px] rounded-xl transition-all active:scale-[0.98] gap-2"
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
