'use client'

interface Props {
  onNextLesson?: () => void
  onReport?: () => void
  onHome: () => void
  /** 문구는 호출부가 상황에 맞게 바꾼다 (예: 오늘 분량이 남았는가) */
  nextLessonLabel?: string
  homeLabel?: string
  title?: string
  subtitle?: string
  /** 오늘 강사가 짚어 준 표현 — 없으면 이 칸은 안 그린다 (메모 73행) */
  expressions?: { en: string; ko: string }[]
}

export default function StepAction({
  onNextLesson, onReport, onHome, nextLessonLabel, homeLabel, title, subtitle, expressions,
}: Props) {
  /* 다음 버튼이 없으면 = 오늘 할 걸 다 했다는 뜻. 그때는 '홈으로'가 유일한 길이라
     흐린 텍스트 버튼이 아니라 주 버튼으로 세운다. */
  const homeIsPrimary = !onNextLesson
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 select-none">
      <div className="text-center mb-2 animate-fade-in-up">
        <p className="text-slate-800 font-bold text-lg">{title ?? '다음은 뭘 할까요?'}</p>
        <p className="text-slate-400 text-sm mt-1">{subtitle ?? '계속 학습하거나 홈으로 돌아가세요'}</p>
      </div>

      {/* ── 오늘 강사가 짚어 준 표현 ── (구현 중 메모 73행)
          "빈출 표현 정리가 눈에 보이지 않음 … 수업이 끝나고 그게 화면에 뜨면 좋겠음".
          수업 중에는 하단 트레이에 쌓이고, 끝나면 여기서 한 번에 보여준다. */}
      {!!expressions?.length && (
        <div className="w-full max-w-xs animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <p className="text-[11px] font-bold text-slate-400 mb-1.5">오늘 배운 표현 {expressions.length}개</p>
          <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
            {expressions.map((e) => (
              <div key={e.en} className="flex items-baseline gap-2 px-3 py-2">
                <span className="text-[12.5px] font-bold text-slate-700">{e.en}</span>
                <span className="text-[11.5px] text-slate-500 ml-auto text-right">{e.ko}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
        {onNextLesson && (
          <button
            onClick={onNextLesson}
            className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-base active:scale-95 transition-all animate-fade-in-up shadow-lg shadow-indigo-100 hover:bg-indigo-600"
            style={{ animationDelay: '0.1s' }}
          >
            {nextLessonLabel ?? '다음 강의 가기'} →
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
          className={`w-full active:scale-95 transition-all animate-fade-in-up ${
            homeIsPrimary
              ? 'py-4 rounded-2xl bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-100 hover:bg-indigo-600'
              : 'py-3 rounded-2xl text-slate-400 font-medium text-sm hover:text-slate-600'
          }`}
          style={{ animationDelay: onNextLesson ? '0.3s' : '0.1s' }}
        >
          {homeLabel ?? '홈으로'}
        </button>
      </div>
    </div>
  )
}
