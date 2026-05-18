'use client'

import { useRouter } from 'next/navigation'

const COURSES = [
  {
    id: 'part5',
    label: 'Part 5',
    sub: '문법 · 어휘',
    desc: '수동태, 시제, 품사 등\n토익 문법 핵심 공략',
    available: true,
  },
  {
    id: 'part7',
    label: 'Part 7',
    sub: '독해',
    desc: '지문 분석, 추론, 세부사항\n독해 속도 향상',
    available: false,
  },
  {
    id: 'speaking',
    label: 'TOEIC Speaking',
    sub: '스피킹',
    desc: 'Read a Text Aloud,\nRespond to Questions',
    available: false,
  },
]

export default function CoursesPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-ybm-bg flex flex-col items-center justify-center px-5 py-10">

      {/* 헤더 */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ybm-blue mb-4 shadow-md">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="5" y="3" width="18" height="22" rx="3" stroke="white" strokeWidth="1.8"/>
            <path d="M9 9h10M9 13h10M9 17h6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-ybm-text">수업 선택</h1>
        <p className="text-sm text-ybm-text-sub mt-1">오늘 학습할 영역을 골라주세요</p>
      </div>

      {/* 과목 카드 목록 */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {COURSES.map((course) => (
          <button
            key={course.id}
            disabled={!course.available}
            onClick={() => course.available && router.push('/classroom')}
            className={`w-full text-left rounded-2xl border-2 p-5 transition-all
              ${course.available
                ? 'border-ybm-blue bg-white hover:bg-[#F0F6FF] active:scale-[0.98] shadow-card cursor-pointer'
                : 'border-ybm-border bg-white opacity-60 cursor-not-allowed'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm
                  ${course.available ? 'bg-ybm-blue-light text-ybm-blue' : 'bg-ybm-bg text-ybm-text-sub'}
                `}>
                  {course.id === 'part5' ? 'P5' : course.id === 'part7' ? 'P7' : 'TS'}
                </div>
                <div>
                  <p className="font-bold text-base text-ybm-text">{course.label}</p>
                  <p className="text-xs text-ybm-text-sub">{course.sub}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0
                ${course.available ? 'bg-ybm-blue-light text-ybm-blue' : 'bg-ybm-bg text-ybm-text-sub'}
              `}>
                {course.available ? '수강 가능' : '준비중'}
              </span>
            </div>

            <p className="mt-3 text-sm text-ybm-text-sub leading-relaxed whitespace-pre-line pl-[60px]">
              {course.desc}
            </p>

            {course.available && (
              <div className="mt-3 pl-[60px] flex items-center gap-1 text-ybm-blue text-sm font-semibold">
                수업 시작하기
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => router.back()}
        className="mt-6 text-sm text-ybm-text-sub hover:text-ybm-text transition-colors"
      >
        ← 대시보드로 돌아가기
      </button>
    </main>
  )
}
