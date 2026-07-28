'use client'

/* 재사용 도입(intro) 화면 — Screen0(Part 5) 디자인 기반, 파트 공용.
   3단계 반응형: 폰(base) / 태블릿 세로(md:) / 태블릿 가로·PC(lg:)
   TTS는 부모가 담당. 이 컴포넌트는 시각(진행바 애니메이션)만 처리. */

import { useEffect, useState } from 'react'

export interface LessonIntroPoint {
  text: string
}

interface LessonIntroProps {
  /** 콘텐츠 태그 (예: "Part 7 장문 독해") */
  tag: string
  /** 강사 발화 (말풍선에 표시) */
  script: string
  /** 오늘 배울 내용 */
  points: LessonIntroPoint[]
  onStart: () => void
  /** 수업 대사를 아직 만드는 중인가. true 면 시작을 막는다 —
   *  생성 전에 들어가면 강사가 **시트에 적힌 옛 예시 문구**를 말해버린다(실제로 그랬다). */
  preparing?: boolean
  onEnd: () => void
  teacherImg?: string
  teacherName?: string
  phaseLabels?: string[]
}

function VoiceWave({ speaking }: { speaking: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-4 md:h-5">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-[3px] md:w-1 rounded-full bg-[#5BA8F5]"
          style={{
            height: speaking ? `${6 + ((i % 3) * 5)}px` : '4px',
            animation: speaking ? `ybmwave 0.8s ease-in-out ${i * 0.09}s infinite` : undefined,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes ybmwave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

export default function LessonIntro({
  tag,
  script,
  points,
  onStart,
  preparing = false,
  onEnd,
  teacherImg = '/image_reference/park-3.jpg',
  teacherName = '박혜원 선생님',
  phaseLabels = ['도입', '수업', '실전', '정리'],
}: LessonIntroProps) {
  const [introTime, setIntroTime] = useState(0)
  const [speaking, setSpeaking] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setIntroTime((n) => {
        if (n >= 100) { clearInterval(t); setSpeaking(false); return 100 }
        return n + 1
      })
    }, 80)
    return () => clearInterval(t)
  }, [])

  /* 상단 phase 스텝퍼 */
  const PhaseStepper = () => (
    <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 shrink-0">
      <button onClick={onEnd} className="p-1" aria-label="뒤로">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-7 md:h-7"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <div className="flex items-center gap-1.5 md:gap-2.5">
        {phaseLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5 md:gap-2.5">
            <div className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full text-[11px] md:text-[15px] font-bold ${i === 0 ? 'bg-[#2277F0] text-white' : 'bg-gray-100 text-gray-400'}`}>
              {label}
            </div>
            {i < phaseLabels.length - 1 && <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5 md:w-4 md:h-4"><path d="M9 18l6-6-6-6" /></svg>}
          </div>
        ))}
      </div>
      <button onClick={onEnd} className="text-[11px] md:text-sm text-gray-400 border border-gray-100 px-2.5 py-1 md:px-4 md:py-2 rounded-lg">종료</button>
    </div>
  )

  /* 강사 사진 패널 */
  const TeacherPhoto = ({ variant }: { variant: 'mobile' | 'tablet' }) => (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={teacherImg} alt={`AI 강사 ${teacherName}`} className="absolute inset-0 w-full h-full object-cover object-top" />
      <div className={`absolute inset-0 ${variant === 'mobile' ? 'bg-gradient-to-t from-black/80 via-black/20 to-black/10' : 'bg-gradient-to-l from-transparent to-black/20'}`} />
      <div className="absolute top-3 left-3 md:top-5 md:left-5 flex items-center gap-1.5 md:gap-2 bg-red-500 px-2 py-1 md:px-3 md:py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white animate-pulse" />
        <span className="text-white text-[10px] md:text-sm font-bold">AI 강사</span>
      </div>
      <div className="absolute top-3 right-3 md:top-5 md:right-5 w-7 h-7 md:w-10 md:h-10 bg-black/40 rounded-full flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 md:w-5 md:h-5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
      </div>
      {variant === 'mobile' && (
        <div className="absolute bottom-[44%] left-0 right-0 flex justify-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={teacherImg} alt={teacherName} className="w-4 h-4 rounded-full object-cover border border-white/30" />
            <VoiceWave speaking={speaking} />
            <span className="text-white text-[10px] font-medium">{teacherName}</span>
          </div>
        </div>
      )}
    </>
  )

  /* 강사 발화 말풍선 */
  const SpeechBubble = ({ dark }: { dark: boolean }) => (
    <div className={`rounded-2xl px-4 py-3 md:px-5 md:py-4 ${dark ? '' : 'bg-gray-50 border border-gray-100'}`}
      style={dark ? { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' } : undefined}>
      <div className={`flex items-start gap-2 md:gap-3 ${dark ? 'mb-2 md:mb-3' : 'mb-3'}`}>
        <div className={`bg-[#2277F0] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${dark ? 'w-5 h-5 md:w-8 md:h-8' : 'w-7 h-7 lg:w-8 lg:h-8'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={dark ? 'w-2.5 h-2.5 md:w-4 md:h-4' : 'w-3.5 h-3.5 lg:w-4 lg:h-4'}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /></svg>
        </div>
        <p className={`leading-relaxed ${dark ? 'text-sm md:text-lg text-white' : 'text-lg xl:text-xl text-gray-700'}`}>{script}</p>
      </div>
      <div className={`rounded-full overflow-hidden ${dark ? 'h-1 md:h-1.5 bg-white/20' : 'h-1.5 bg-gray-200'}`}>
        <div className={`h-full rounded-full transition-all duration-200 ${dark ? 'bg-white/70' : 'bg-[#2277F0]'}`} style={{ width: `${introTime}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className={`${dark ? 'text-[9px] md:text-xs text-white/40' : 'text-xs text-gray-400'}`}>0:00</span>
        <span className={`${dark ? 'text-[9px] md:text-xs text-white/40' : 'text-xs text-gray-400'}`}>0:08</span>
      </div>
    </div>
  )

  return (
    <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
      <PhaseStepper />

      {/* ════ 폰 / 태블릿 세로 (<lg): 강사 풀스크린 + 반투명 하단 카드 ════ */}
      <div className="flex-1 relative overflow-hidden lg:hidden">
        <TeacherPhoto variant="mobile" />

        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-5 md:pb-8 pt-4 md:pt-6"
          style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <div className="mb-3 md:mb-4"><SpeechBubble dark /></div>

          <div className="rounded-xl mb-3 md:mb-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <p className="text-[9px] md:text-sm font-bold text-white/50 uppercase tracking-widest px-3 md:px-5 pt-2.5 md:pt-4 pb-1.5 md:pb-2">오늘 배울 내용</p>
            {points.map((pt, i) => (
              <div key={pt.text} className="flex items-center gap-2.5 md:gap-3.5 px-3 md:px-5 py-1.5 md:py-3">
                <span className="shrink-0 w-5 h-5 md:w-7 md:h-7 rounded-full bg-white/25 text-white text-[10px] md:text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <span className="text-white/85 text-[11px] md:text-lg">{pt.text}</span>
              </div>
            ))}
            <div className="h-2" />
          </div>

          <button onClick={onStart} disabled={preparing}
            className="w-full bg-[#2277F0] text-white font-bold py-3 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-lg active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-wait">
            {preparing ? '수업 준비 중…' : '수업 시작하기 →'}
          </button>
        </div>
      </div>

      {/* ════ 태블릿 가로 / 데스크탑 (lg+): 콘텐츠 좌 / 강사 우 ════ */}
      <div className="hidden lg:flex flex-1 flex-row overflow-hidden">
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="px-10 xl:px-14 py-10 flex flex-col h-full max-w-3xl mx-auto w-full">
            <div className="mb-8">
              <span className="text-sm font-semibold text-gray-400">오늘의 수업</span>
              <h1 className="text-3xl xl:text-4xl font-black text-[#1A2B4B] mt-1.5 leading-tight">{tag}</h1>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl mb-8 overflow-hidden flex-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-6 pt-5 pb-3">오늘 배울 내용</p>
              {points.map((pt, i) => (
                <div key={pt.text} className="flex items-center gap-4 px-6 py-4 border-t border-gray-100">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#D6EAFF] text-[#2277F0] text-sm font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-lg text-gray-700">{pt.text}</span>
                </div>
              ))}
            </div>

            <button onClick={onStart} disabled={preparing}
              className="w-full bg-[#2277F0] text-white font-bold py-4 rounded-2xl text-lg hover:bg-[#1a66d4] transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-wait">
              {preparing ? '수업 준비 중…' : '수업 시작하기 →'}
            </button>
          </div>
        </div>

        <div className="w-[42%] relative bg-gray-900 shrink-0">
          <TeacherPhoto variant="tablet" />
          {/* 강사 발화 — 사진 하단 반투명 상자 */}
          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-5 pb-5 pt-4"
            style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            <div className="flex items-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={teacherImg} alt={teacherName} className="w-6 h-6 rounded-full object-cover border border-white/30" />
              <span className="text-white text-sm font-medium">{teacherName}</span>
              <span className="ml-auto"><VoiceWave speaking={speaking} /></span>
            </div>
            <SpeechBubble dark />
          </div>
        </div>
      </div>
    </div>
  )
}
