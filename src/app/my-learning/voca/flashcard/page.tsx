'use client'
import { useVocaStore } from '@/store/vocaStore'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function FlashcardPage() {
  const { todayWords, currentIndex, setFlashcardResult, initTodayWords } = useVocaStore()
  const router = useRouter()
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    if (todayWords.length === 0) {
      initTodayWords()
    }
  }, [todayWords, initTodayWords])

  if (!todayWords || todayWords.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">데이터를 불러오는 중...</div>
  }

  const word = todayWords[currentIndex]
  const isFinished = currentIndex >= todayWords.length

  if (isFinished) {
    router.push('/my-learning/voca/result')
    return null
  }

  const handleResult = (status: 'know' | 'confused' | 'unknown') => {
    setIsFlipped(false)
    setFlashcardResult(word.id, status)
    if (currentIndex >= todayWords.length - 1) {
      router.push('/my-learning/voca/result')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans">
      <header className="px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.push('/my-learning')} className="p-2 -ml-2 text-[#6B7280]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="font-bold text-[#1C1B33] text-[15px]">플래시카드 학습</div>
        <div className="w-8" />
      </header>

      <div className="px-6 max-w-[600px] mx-auto w-full">
        <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
          <div className="bg-[#4F46E5] h-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / todayWords.length) * 100}%` }} />
        </div>
        <p className="text-center text-[#6B7280] text-[12px] mt-2 font-medium">{currentIndex + 1} / {todayWords.length}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 mt-4">
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative w-full max-w-[340px] aspect-[3/4] cursor-pointer group perspective-1000"
        >
          {/* Card Container */}
          <div className={`relative w-full h-full transition-all duration-300 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl border border-[#ECEAF5] flex flex-col items-center justify-center p-8">
              <h2 className="text-[28px] sm:text-[32px] font-black text-[#1C1B33] break-keep text-center leading-tight">{word.word}</h2>
              <p className="absolute bottom-6 text-[#9CA3AF] text-[13px] font-semibold tracking-wider uppercase">Tap to flip</p>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 rotate-y-180 text-white">
              <h2 className="text-[28px] font-bold text-center leading-snug">{word.meaning}</h2>
              <div className="w-12 h-1 bg-white/20 rounded-full my-6 shrink-0" />
              <p className="text-center text-white/80 text-[15px] leading-relaxed italic overflow-y-auto">"{word.example}"</p>
            </div>

          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8FAFF] via-[#F8FAFF] to-transparent z-10">
        <div className="max-w-[400px] mx-auto flex gap-3">
          <button onClick={() => handleResult('unknown')} className="flex-1 bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] py-4 rounded-2xl font-bold text-[15px] transition-colors active:scale-95 shadow-sm">
            몰라요
          </button>
          <button onClick={() => handleResult('confused')} className="flex-1 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#D97706] py-4 rounded-2xl font-bold text-[15px] transition-colors active:scale-95 shadow-sm">
            헷갈려요
          </button>
          <button onClick={() => handleResult('know')} className="flex-1 bg-[#D1FAE5] hover:bg-[#A7F3D0] text-[#059669] py-4 rounded-2xl font-bold text-[15px] transition-colors active:scale-95 shadow-sm">
            알아요
          </button>
        </div>
      </div>
    </div>
  )
}
