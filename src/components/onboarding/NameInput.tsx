'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

interface Props {
  onNext: () => void
}

export default function NameInput({ onNext }: Props) {
  const setUserName = useOnboardingStore((s) => s.setUserName)
  const [input, setInput] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    if (!input.trim()) return
    setUserName(input.trim())
    setConfirmed(true)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] px-4 py-10">
      <div className="w-full max-w-[390px] mx-auto flex flex-col flex-1 animate-fade-in">

        <div className="flex-1 flex flex-col justify-center space-y-8">
          <div className="text-center space-y-5">
            <div className="w-20 h-20 mx-auto flex items-center justify-center animate-bounce-in">
              <img src="/favicon.png" alt="YBM Logo" className="w-full h-full object-contain" />
            </div>
            <div className="bg-white border border-[#D1D5DB] rounded-2xl px-5 py-4 text-[#111318] text-[15px] font-medium leading-relaxed relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-white" />
              {confirmed
                ? <>{input}님, 반갑습니다!<br/>최적화된 학습 코스를 구성해 드릴게요.</>
                : '안녕하세요! YBM AI 코스에 오신 것을 환영합니다.'}
            </div>
          </div>

          {!confirmed && (
            <div className="space-y-3">
              <p className="text-[#6B7280] text-center text-xs font-bold uppercase tracking-widest">
                먼저 이름을 알려주세요
              </p>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                placeholder="이름 입력"
                autoFocus
                className="w-full bg-white border border-[#D1D5DB] focus:border-primary rounded-2xl px-4 py-4 text-[#111318] placeholder-[#6B7280] outline-none transition-colors text-center text-[17px] font-bold"
              />
            </div>
          )}
        </div>

        <div className="space-y-2 pb-2">
          {!confirmed ? (
            <button
              onClick={handleConfirm}
              disabled={!input.trim()}
              className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-11 font-semibold text-[15px] disabled:opacity-40 transition-colors active:scale-[0.98]"
            >
              확인
            </button>
          ) : (
            <button
              onClick={onNext}
              className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-11 font-semibold text-[15px] animate-fade-in transition-colors active:scale-[0.98]"
            >
              시작하기
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
