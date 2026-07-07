'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const QUESTION = {
  key: 'ai_call_coaching',
  text: 'AI 강사가 정해진 시간에\n전화를 걸어준다면?',
  sub: '학습 관리를 위해 AI 강사가 직접 전화를 거는 기능이에요.',
  options: [
    { emoji: '🙌', label: '완전 좋아요', desc: '매일 기다릴 것 같아요', value: 'very_good' },
    { emoji: '👍', label: '좋은데, 시간은 제가 정할게요', desc: '원하는 시간대를 직접 설정하고 싶어요', value: 'good_if_flexible' },
    { emoji: '😅', label: '조금 부담스러울 것 같아요', desc: '전화보다는 알림이 더 편할 것 같아요', value: 'prefer_notification' },
    { emoji: '🙅', label: '필요 없을 것 같아요', desc: '스스로 챙기는 게 더 맞아요', value: 'not_needed' },
  ],
}

interface Props {
  onClose: () => void
  instructorName: string
  instructorThumb: string
}

export default function CallSurvey({ onClose, instructorName, instructorThumb }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSelect = (value: string) => {
    if (selected) return
    setSelected(value)
  }

  const handleSubmit = async () => {
    if (!selected || saving) return
    setSaving(true)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    await supabase.from('survey_responses').insert({
      user_id: session?.user?.id ?? null,
      question_key: QUESTION.key,
      answer: selected,
    }).then(({ error }) => {
      if (error) console.error('[survey] 저장 실패:', error.message)
    })

    setSaving(false)
    setSubmitted(true)
    setTimeout(onClose, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* 딤 배경 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 시트 */}
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up">

        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-[#E5E7EB] rounded-full" />
        </div>

        <div className="px-6 pb-8 pt-4">
          {/* 강사 프로필 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#DBEAFE] shrink-0">
              <img src={instructorThumb} alt={instructorName}
                className="w-full h-full object-cover object-top"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#2563EB]">{instructorName} 선생님이 물어봤어요</p>
              <p className="text-[11px] text-[#9CA3AF]">1분만 답해주시면 더 나은 서비스를 만들 수 있어요</p>
            </div>
            <button onClick={onClose} className="ml-auto text-[#9CA3AF] hover:text-[#6B7280] p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* 질문 */}
          <p className="text-[20px] font-black text-[#1C1B33] leading-snug mb-1 whitespace-pre-line">
            {QUESTION.text}
          </p>
          <p className="text-[12px] text-[#9CA3AF] mb-5">{QUESTION.sub}</p>

          {/* 선택지 */}
          <div className="flex flex-col gap-2.5 mb-5">
            {QUESTION.options.map(opt => {
              const isSelected = selected === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  disabled={!!selected}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-[#2563EB] bg-[#EFF6FF]'
                      : selected
                      ? 'border-[#F3F4F6] bg-[#FAFAFA] opacity-40'
                      : 'border-[#F3F4F6] bg-[#FAFAFA] hover:border-[#BFDBFE] hover:bg-[#EFF6FF]'
                  }`}
                >
                  <span className="text-[24px] shrink-0">{opt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-bold leading-snug ${isSelected ? 'text-[#2563EB]' : 'text-[#1C1B33]'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">{opt.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* 제출 버튼 or 완료 메시지 */}
          {submitted ? (
            <p className="text-center text-[13px] text-[#9CA3AF] py-2">응답이 기록되었습니다 ✓</p>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!selected || saving}
              className="w-full py-3.5 rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-30 bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
            >
              {saving ? '저장 중...' : '응답 제출하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
