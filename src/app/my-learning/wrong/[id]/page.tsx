'use client'
import { useWrongAnswerStore, SCAFFOLDING } from '@/store/wrongAnswerStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { useFontSettingsStore, FONT_SIZE_CLASSES } from '@/store/fontSettingsStore'
import FontSettingsController from '@/components/FontSettingsController'

const LABELS = ['A', 'B', 'C', 'D']

const INST_NAME: Record<string, string> = { park_hyewon: '박혜원', yun_daeun: '윤다은', lee_doyun: '이도윤', seo_jian: '서지안', oh_jungja: '오정자' }
const INST_COLOR: Record<string, { bg: string; tc: string; border: string }> = {
  park_hyewon:  { bg: '#FEF3C7', tc: '#B45309', border: '#FDE68A' },
  yun_daeun:    { bg: '#EFF6FF', tc: '#2563EB', border: '#C7D2FE' },
  lee_doyun:    { bg: '#F0FDF4', tc: '#059669', border: '#BBF7D0' },
  seo_jian:     { bg: '#F5F3FF', tc: '#7C3AED', border: '#DDD6FE' },
  oh_jungja:    { bg: '#FFF1F2', tc: '#BE123C', border: '#FECDD3' },
}

export default function WrongAnswerDetail() {
  const { id } = useParams() as { id: string }
  const { wrongAnswers, removeWrongAnswer } = useWrongAnswerStore()
  const { selectedInstructor: instructor } = useOnboardingStore()
  const router = useRouter()
  const { fontSize, fontType } = useFontSettingsStore()
  const [showSettings, setShowSettings] = useState(false)

  const item = wrongAnswers.find((w) => w.id === id)

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[#6B7280] font-sans">
        <p>오답 항목을 찾을 수 없습니다.</p>
        <Link href="/my-learning?tab=wrong" className="text-[#2563EB] font-semibold text-[14px]">돌아가기</Link>
      </div>
    )
  }

  const inst = instructor ?? 'park_hyewon'
  const instColor = INST_COLOR[inst] ?? INST_COLOR.park_hyewon
  const scaffolding = item.category ? SCAFFOLDING[item.category] : null
  const dateStr = new Date(item.timestamp).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  const sizeClasses = FONT_SIZE_CLASSES[fontSize] || FONT_SIZE_CLASSES.normal
  const fontStyleClass = fontType === 'serif' ? 'font-serif' : 'font-sans'

  const handleDelete = () => {
    removeWrongAnswer(item.id)
    router.push('/my-learning?tab=wrong')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans pb-24">
      {/* 헤더 */}
      <header className="px-6 pt-safe-4 pb-4 flex items-center gap-3 bg-[#F8FAFF] border-b border-[#DBEAFE]/30">
        <Link href="/my-learning?tab=wrong" className="p-2 -ml-2 text-[#6B7280]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-md">{item.partLabel}</span>
            {item.category && (
              <span className="text-[11px] font-bold bg-[#FEE2E2] text-[#DC2626] px-2 py-0.5 rounded-md">{item.category}</span>
            )}
          </div>
          <p className="text-[#9CA3AF] text-[11px] mt-0.5">{dateStr}</p>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="글자 크기"
            aria-expanded={showSettings}
            className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-bold transition-colors ${
              showSettings ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
              <path d="M4 20V7a3 3 0 0 1 3-3h1" /><path d="M13 20v-9a2 2 0 0 1 2-2h1" /><path d="M2 12h8" /><path d="M12 16h7" />
            </svg>
            가
          </button>
          {showSettings && (
            <>
              {/* 바깥을 누르면 접힌다 — 열어둔 패널이 문제를 가린 채 남으면 다시 버튼을
                  찾아 눌러야 한다. 화면 전체를 덮는 투명 판이 그 클릭을 받는다. */}
              <button
                aria-label="글자 크기 닫기"
                onClick={() => setShowSettings(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute right-0 mt-2 w-64 shadow-xl z-50">
                <FontSettingsController />
              </div>
            </>
          )}
        </div>
        <button onClick={handleDelete} className="text-[#9CA3AF] hover:text-[#DC2626] transition-colors p-2 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </header>

      <div className="px-6 max-w-[600px] mx-auto w-full space-y-4">

        {/* 지문 제목 (P6/P7) */}
        {item.passageTitle && (
          <div className="bg-white border border-[#DBEAFE] rounded-2xl px-4 py-3">
            <p className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider mb-1">지문</p>
            <p className={`text-[#374151] whitespace-pre-wrap ${fontStyleClass} ${sizeClasses.body}`}>{item.passageTitle}</p>
          </div>
        )}

        {/* 문제 */}
        <div className="bg-white border border-[#DBEAFE] rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider mb-2">문제</p>
          <p className={`text-[#1C1B33] font-medium ${fontStyleClass} ${sizeClasses.body}`}>{item.questionText}</p>
        </div>

        {/* 선택지 */}
        <div className="space-y-2">
          {item.choices.map((choice, i) => {
            const isCorrect = i === item.correctAnswer
            const isChosen  = i === item.chosenAnswer
            const isWrong   = isChosen && !isCorrect
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-[14px] ${
                  isCorrect ? 'bg-[#D1FAE5] border-[#10B981]' :
                  isWrong   ? 'bg-[#FEE2E2] border-[#EF4444]' :
                  'bg-white border-[#E5E7EB]'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${
                  isCorrect ? 'bg-[#10B981] text-white' :
                  isWrong   ? 'bg-[#EF4444] text-white' :
                  'bg-[#F3F4F6] text-[#6B7280]'
                }`}>
                  {LABELS[i]}
                </span>
                <span className={`font-medium ${fontStyleClass} ${sizeClasses.body} ${
                  isCorrect ? 'text-[#059669]' :
                  isWrong   ? 'text-[#DC2626]' :
                  'text-[#374151]'
                }`}>
                  {choice}
                </span>
                {isCorrect && (
                  <span className="ml-auto text-[11px] font-bold text-[#059669]">정답</span>
                )}
                {isWrong && (
                  <span className="ml-auto text-[11px] font-bold text-[#DC2626]">내 선택</span>
                )}
              </div>
            )
          })}
        </div>

        {/* 해설 */}
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-4 py-3">
          <p className="text-[12px] font-bold text-[#DC2626] mb-1.5">오답 해설</p>
          <p className="text-[#374151] text-[13px] leading-relaxed">{item.explanation}</p>
        </div>

        {/* AI 강사 스캐폴딩 힌트 */}
        {scaffolding && (
          <div className="rounded-2xl border-2 px-5 py-4" style={{ background: instColor.bg, borderColor: instColor.border }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] text-white shrink-0"
                style={{ background: instColor.tc }}>
                {INST_NAME[inst]?.[0] ?? 'A'}
              </div>
              <div>
                <p className="text-[12px] font-bold" style={{ color: instColor.tc }}>{INST_NAME[inst] ?? '강사'} 선생님의 힌트</p>
                <p className="text-[10px] text-[#9CA3AF]">{item.category} 유형 스캐폴딩</p>
              </div>
              <div className="ml-auto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={instColor.tc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: instColor.tc }}>{scaffolding}</p>
          </div>
        )}

      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8FAFF] via-[#F8FAFF] to-transparent">
        <div className="max-w-[600px] mx-auto">
          <Link
            href={`/my-learning/wrong/review?partId=${item.partId}`}
            className="block w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-4 rounded-2xl font-bold text-[15px] transition-colors shadow-lg shadow-[#2563EB]/20 text-center"
          >
            {item.partLabel} 오답만 복습하기
          </Link>
        </div>
      </div>
    </div>
  )
}
