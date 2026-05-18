'use client'
import { useVocaStore } from '@/store/vocaStore'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useRef, useEffect } from 'react'
import ExitConfirmModal from '@/components/ExitConfirmModal'

function getCharDimensions(wordLength: number) {
  if (wordLength <= 5) return { boxW: 52, boxH: 60, fontSize: 24, gap: 8 }
  if (wordLength <= 7) return { boxW: 44, boxH: 52, fontSize: 20, gap: 8 }
  if (wordLength <= 9) return { boxW: 38, boxH: 46, fontSize: 17, gap: 6 }
  if (wordLength <= 12) return { boxW: 32, boxH: 40, fontSize: 14, gap: 5 }
  return { boxW: 26, boxH: 34, fontSize: 12, gap: 4 }
}

export default function DictationPage() {
  const { todayWords, currentIndex, setDictationResult, initTodayWords } = useVocaStore()
  const router = useRouter()

  const [inputVals, setInputVals] = useState<Record<number, string>>({})
  const [isEvaluated, setIsEvaluated] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

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

  // Randomly pick 2-3 indices to blank out
  const blankIndices = useMemo(() => {
    if (!word) return []
    const length = word.word.length
    const numBlanks = Math.min(length - 1, Math.floor(Math.random() * 2) + 2) // 2 or 3
    const indices = new Set<number>()
    while (indices.size < numBlanks) {
      indices.add(Math.floor(Math.random() * length))
    }
    return Array.from(indices)
  }, [word])

  useEffect(() => {
    // Reset state for new word
    setInputVals({})
    setIsEvaluated(false)
    // Focus first input
    const sortedBlanks = [...blankIndices].sort((a,b)=>a-b)
    if (sortedBlanks.length > 0) {
      setTimeout(() => {
        inputRefs.current[sortedBlanks[0]]?.focus()
      }, 100)
    }
  }, [word, blankIndices])

  if (isFinished) {
    router.push('/my-learning/voca/result')
    return null
  }

  const handleInput = (index: number, val: string) => {
    if (isEvaluated) return
    const char = val.slice(-1).toLowerCase()
    setInputVals(prev => ({ ...prev, [index]: char }))

    // Auto focus next
    if (char) {
      const sortedBlanks = [...blankIndices].sort((a,b)=>a-b)
      const currentPos = sortedBlanks.indexOf(index)
      if (currentPos < sortedBlanks.length - 1) {
        const nextIndex = sortedBlanks[currentPos + 1]
        inputRefs.current[nextIndex]?.focus()
      }
    }
  }

  const handleSubmit = () => {
    let isCorrect = true
    blankIndices.forEach(i => {
      if (inputVals[i] !== word.word[i].toLowerCase()) {
        isCorrect = false
      }
    })

    setIsEvaluated(true)

    setTimeout(() => {
      setDictationResult(word.id, isCorrect)
      if (currentIndex >= todayWords.length - 1) {
        router.push('/my-learning/voca/result')
      }
    }, 1500)
  }

  const isAllFilled = blankIndices.every(i => inputVals[i])
  const dims = getCharDimensions(word.word.length)
  const maskedExample = word.example.replace(new RegExp(word.word, 'gi'), '_'.repeat(word.word.length))

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
        <div className="font-bold text-[#1C1B33] text-[15px]">받아쓰기</div>
        <div className="w-8" />
      </header>

      <div className="px-6 max-w-[600px] mx-auto w-full">
        <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
          <div className="bg-[#4F46E5] h-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / todayWords.length) * 100}%` }} />
        </div>
        <p className="text-center text-[#6B7280] text-[12px] mt-2 font-medium">Question {currentIndex + 1} of {todayWords.length}</p>

        <div className="mt-12 bg-white rounded-3xl p-10 shadow-lg border border-[#ECEAF5] flex flex-col items-center text-center">
          <h2 className="text-[20px] font-bold text-[#1C1B33]">{word.meaning}</h2>
          <p className="mt-4 text-[#6B7280] text-[14px] italic">"{maskedExample}"</p>

          <div className="mt-10 flex flex-nowrap justify-center overflow-x-auto" style={{ gap: dims.gap }}>
            {word.word.split('').map((char, i) => {
              const isBlank = blankIndices.includes(i)
              if (isBlank) {
                const isWrong = isEvaluated && inputVals[i] !== char.toLowerCase()
                const isCorrect = isEvaluated && inputVals[i] === char.toLowerCase()

                return (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    value={isEvaluated && isWrong ? char.toLowerCase() : (inputVals[i] || '')}
                    onChange={(e) => handleInput(i, e.target.value)}
                    style={{ width: dims.boxW, height: dims.boxH, fontSize: dims.fontSize }}
                    className={`text-center font-bold rounded-xl border-2 outline-none transition-colors shadow-inner flex-shrink-0 ${
                      isCorrect ? 'bg-[#D1FAE5] border-[#10B981] text-[#059669]' :
                      isWrong ? 'bg-[#FEE2E2] border-[#EF4444] text-[#DC2626]' :
                      'bg-white border-[#D1D5DB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 text-[#1C1B33]'
                    }`}
                    disabled={isEvaluated}
                  />
                )
              }
              return (
                <span
                  key={i}
                  style={{ width: dims.boxW, height: dims.boxH, fontSize: dims.fontSize }}
                  className="flex items-center justify-center font-bold text-[#1C1B33] flex-shrink-0"
                >
                  {char.toLowerCase()}
                </span>
              )
            })}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!isAllFilled || isEvaluated}
            className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF] text-white py-4 rounded-2xl font-bold text-[16px] transition-colors shadow-lg shadow-[#4F46E5]/20"
          >
            {isEvaluated ? '다음 문제로 이동...' : '정답 확인'}
          </button>
        </div>
      </div>
    </div>
  )
}
