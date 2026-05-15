'use client'
import { useState } from 'react'
import Image from 'next/image'
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-onboarding px-6 relative overflow-hidden">
      <div className="w-full max-w-sm space-y-10 animate-fade-in z-10">
        <div className="text-center space-y-6">
          <div className="relative w-28 h-28 mx-auto animate-bounce-in">
            <Image
              src={confirmed ? "/img/와옹이_기쁨.png" : "/img/와옹이_기본.png"}
              alt="와옹이"
              fill
              className="object-contain"
            />
          </div>
          <div className="bg-white rounded-2xl px-5 py-4 text-dark-navy text-base font-medium leading-relaxed shadow-high relative">
            {/* 말풍선 꼬리 */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-bottom-[10px] border-white" />
            {confirmed
              ? `${input}님, 반가워요! 딱 맞는 선생님을 찾아드릴게요 🎯`
              : '안녕하세요! 저는 AI 매니저 와옹이에요. 선생님을 연결해드릴게요'}
          </div>
        </div>

        {!confirmed ? (
          <div className="space-y-4">
            <p className="text-white/60 text-center text-sm font-bold uppercase tracking-widest">먼저 이름을 알려주세요</p>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              placeholder="이름 입력"
              autoFocus
              className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-4 text-white placeholder-white/30 outline-none focus:border-waong-lavender transition-all text-center text-lg font-bold"
            />
            <button
              onClick={handleConfirm}
              disabled={!input.trim()}
              className="w-full bg-waong-lavender text-dark-navy rounded-xl h-[52px] font-bold disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-95 shadow-mid"
            >
              확인
            </button>
          </div>
        ) : (
          <button
            onClick={onNext}
            className="w-full bg-white text-dark-navy rounded-xl h-[52px] font-bold animate-fade-in shadow-mid active:scale-95"
          >
            시작하기
          </button>
        )}
      </div>
    </div>
  )
}
