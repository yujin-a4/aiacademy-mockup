'use client'

import WaongMotion from '@/components/mascot/WaongMotion'

interface AnswerFeedbackProps {
  correct: boolean
  /** 오답일 때 알려줄 정답 */
  correctAnswer: string
  explanation: string
}

/**
 * 문제를 고른 뒤 아래에 붙는 해설 박스.
 *
 * Screen2 와 `/dev/screens` 갤러리가 **이걸 같이 쓴다** — 갤러리가 마크업을 흉내 내면
 * 문구를 고쳤을 때 따로 놀아서 검토용으로 못 쓰게 된다.
 */
export default function AnswerFeedback({ correct, correctAnswer, explanation }: AnswerFeedbackProps) {
  return (
    <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2
      ${correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
    `}>
      {/* 정답이면 와옹이가 전구를 켠다. 오답은 이모지 그대로 — 틀린 걸 축하할 일은 아니다. */}
      {correct
        ? <WaongMotion name="idea" size={76} className="shrink-0 -my-2 -ml-2" />
        : <span className="shrink-0 text-base">❌</span>}
      <div>
        <p className={`font-bold text-xs mb-0.5 ${correct ? 'text-green-700' : 'text-red-600'}`}>
          {correct ? '정답!' : `오답 — 정답: ${correctAnswer}`}
        </p>
        <p className="text-ybm-text-sub leading-relaxed">{explanation}</p>
      </div>
    </div>
  )
}
