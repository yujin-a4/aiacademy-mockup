'use client'

interface Props {
  onNextLesson?: () => void
  onReport?: () => void
  onHome: () => void
}

export default function StepAction({ onNextLesson, onReport, onHome }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 select-none">
      <div className="text-center mb-2 animate-fade-in-up">
        <p className="text-slate-800 font-bold text-lg">다음은 뭘 할까요?</p>
        <p className="text-slate-400 text-sm mt-1">계속 학습하거나 홈으로 돌아가세요</p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
        {onNextLesson && (
          <button
            onClick={onNextLesson}
            className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-base active:scale-95 transition-all animate-fade-in-up shadow-lg shadow-indigo-100 hover:bg-indigo-600"
            style={{ animationDelay: '0.1s' }}
          >
            다음 강의 가기 →
          </button>
        )}

        {onReport && (
          <button
            onClick={onReport}
            className="w-full py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-base active:scale-95 transition-all animate-fade-in-up hover:bg-slate-100"
            style={{ animationDelay: '0.2s' }}
          >
            리포트 바로가기 ↗
          </button>
        )}

        <button
          onClick={onHome}
          className="w-full py-3 rounded-2xl text-slate-400 font-medium text-sm active:scale-95 transition-all animate-fade-in-up hover:text-slate-600"
          style={{ animationDelay: onNextLesson ? '0.3s' : '0.1s' }}
        >
          홈으로
        </button>
      </div>
    </div>
  )
}
