'use client'
import { useVocaStore } from '@/store/vocaStore'
import { useRouter } from 'next/navigation'

export default function ResultPage() {
  const { todayWords, flashcardResults, quizResults, dictationResults, resetProgress } = useVocaStore()
  const router = useRouter()

  if (!todayWords || todayWords.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">학습 기록이 없습니다.</div>
  }

  // Combine incorrect or difficult words
  const reviewWords = todayWords.filter(w => {
    const fc = flashcardResults[w.id]
    const qr = quizResults[w.id]
    const dr = dictationResults[w.id]
    
    // Include if user didn't know or got it wrong in any mode
    if (fc === 'unknown' || fc === 'confused') return true
    if (qr === false) return true
    if (dr === false) return true
    return false
  })

  const handleFinish = () => {
    resetProgress()
    router.push('/my-learning?tab=voca')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] font-sans pb-24">
      <div className="bg-gradient-to-br from-[#2563EB] to-[#7C3AED] pt-16 pb-20 px-6 text-center rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-xl" />
        
        <div className="relative z-10 w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-inner">
          <span className="text-[40px]">🎉</span>
        </div>
        <h1 className="relative z-10 text-[28px] font-black text-white">학습 완료!</h1>
        <p className="relative z-10 text-white/90 mt-2 text-[15px] font-medium">오늘의 할당량을 모두 마쳤습니다. 대단해요!</p>
      </div>

      <div className="max-w-[600px] mx-auto px-6 -mt-10 relative z-10">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-[#DBEAFE]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[18px] font-bold text-[#1C1B33]">오답 복습 노트</h2>
            <span className="bg-[#FEE2E2] text-[#DC2626] font-bold text-[12px] px-3 py-1 rounded-full border border-[#FECACA]">
              {reviewWords.length} 단어
            </span>
          </div>

          {reviewWords.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-[40px] block mb-2">✨</span>
              <p className="text-[#1C1B33] font-bold text-[16px]">완벽합니다!</p>
              <p className="text-[#6B7280] text-[13px] mt-1">모든 단어를 완벽하게 익혔습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewWords.map(w => (
                <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAFAFA] border border-[#DBEAFE] hover:border-[#2563EB] transition-colors">
                  <div>
                    <p className="text-[16px] font-bold text-[#1C1B33]">{w.word}</p>
                    <p className="text-[#6B7280] text-[13px] mt-0.5">{w.meaning}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {flashcardResults[w.id] && flashcardResults[w.id] !== 'know' && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${flashcardResults[w.id] === 'unknown' ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]' : 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'}`}>
                        {flashcardResults[w.id] === 'unknown' ? '플래시카드 몰라요' : '플래시카드 헷갈려요'}
                      </span>
                    )}
                    {quizResults[w.id] === false && <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">퀴즈 오답</span>}
                    {dictationResults[w.id] === false && <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">받아쓰기 오답</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8FAFF] via-[#F8FAFF] to-transparent z-20">
        <div className="max-w-[600px] mx-auto">
          <button 
            onClick={handleFinish}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-4 rounded-2xl font-bold text-[16px] transition-colors shadow-lg shadow-[#2563EB]/30"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
