'use client'
import { useVocaStore } from '@/store/vocaStore'
import { VOCA_DATA } from '@/data/vocaData'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import ExitConfirmModal from '@/components/ExitConfirmModal'

export default function QuizPage() {
  const { todayWords, currentIndex, setQuizResult, initTodayWords } = useVocaStore()
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showExitModal, setShowExitModal] = useState(false)

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

  // Generate 4 options
  const options = useMemo(() => {
    if (!word) return []
    const wrongAnswers = VOCA_DATA
      .filter(w => w.id !== word.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(w => ({ id: w.id, text: w.meaning }))
    
    const allOptions = [...wrongAnswers, { id: word.id, text: word.meaning }]
    return allOptions.sort(() => 0.5 - Math.random())
  }, [word])

  if (isFinished) {
    router.push('/my-learning/voca/result')
    return null
  }

  const handleSelect = (optionId: number) => {
    if (selectedOption !== null) return // Prevent multiple clicks
    setSelectedOption(optionId)
    
    const isCorrect = optionId === word.id
    
    setTimeout(() => {
      setSelectedOption(null)
      setQuizResult(word.id, isCorrect)
      if (currentIndex >= todayWords.length - 1) {
        router.push('/my-learning/voca/result')
      }
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans pb-10">
      <ExitConfirmModal
        isOpen={showExitModal}
        onContinue={() => setShowExitModal(false)}
        onExit={() => router.push('/my-learning')}
      />
      <header className="px-6 py-4 flex items-center justify-between">
        <button onClick={() => setShowExitModal(true)} className="p-2 -ml-2 text-[#6B7280]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="font-bold text-[#1C1B33] text-[15px]">단어 퀴즈</div>
        <div className="w-8" />
      </header>

      <div className="px-6 max-w-[600px] mx-auto w-full">
        <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
          <div className="bg-[#4F46E5] h-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / todayWords.length) * 100}%` }} />
        </div>
        <p className="text-center text-[#6B7280] text-[12px] mt-2 font-medium">Question {currentIndex + 1} of {todayWords.length}</p>

        <div className="mt-12 bg-white rounded-3xl p-10 shadow-lg border border-[#ECEAF5] flex flex-col items-center text-center">
          <span className="text-[#9CA3AF] text-[13px] font-bold uppercase tracking-widest mb-3">Choose the correct meaning</span>
          <h2 className="text-[40px] font-black text-[#1C1B33] break-all">{word.word}</h2>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {options.map((opt) => {
            const isSelected = selectedOption === opt.id
            const isCorrectAnswer = opt.id === word.id
            const showCorrect = selectedOption !== null && isCorrectAnswer
            const showWrong = selectedOption !== null && isSelected && !isCorrectAnswer
            
            let btnClass = "bg-white border-[#ECEAF5] text-[#1C1B33] hover:border-[#4F46E5] hover:bg-[#EEF2FF]"
            if (showCorrect) btnClass = "bg-[#10B981] border-[#10B981] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10 relative"
            if (showWrong) btnClass = "bg-[#EF4444] border-[#EF4444] text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] z-10 relative"

            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={`w-full p-5 rounded-2xl border-2 text-[16px] font-bold transition-all active:scale-[0.98] text-left ${btnClass}`}
              >
                {opt.text}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
