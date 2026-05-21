'use client'

import { useRouter } from 'next/navigation'

interface Lesson {
  id: string
  num: string
  label: string      // TOEIC / TOEIC Speaking
  part: string       // Part 5 · 문법·어휘
  title: string
  desc: string
  href: string
  color: string
  icon: React.ReactNode
}

const LESSONS: Lesson[] = [
  {
    id: 'part5',
    num: '01',
    label: 'TOEIC',
    part: 'Part 5 · 문법·어휘',
    title: '단문 공백 채우기',
    desc: '수동태 vs 능동태 — 주어·동사 관계 파악하기',
    href: '/part5',
    color: '#2277F0',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'part7',
    num: '02',
    label: 'TOEIC',
    part: 'Part 7 · 독해',
    title: '장문 독해 — 단일지문',
    desc: 'Why 문제 풀이 전략 — 판매 광고 지문',
    href: '/part7',
    color: '#0EA5E9',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 8h8M6 11h8M6 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'speaking',
    num: '03',
    label: 'TOEIC Speaking',
    part: 'Part 2 · 스피킹',
    title: '사진 묘사 30초 말하기',
    desc: '장소·인물·사물·전체 분위기 순서로 말하기',
    href: '/speaking',
    color: '#7C3AED',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="7" y="2" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M4 10c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 16v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-ybm-border px-4 h-14 flex items-center gap-3 shrink-0">
        <a href="/dashboard" className="w-7 h-7 rounded-lg bg-[#2277F0] flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
            <path d="M3 14V6l6-4 6 4v8" stroke="white" strokeWidth="1.7" strokeLinejoin="round"/>
            <rect x="6.5" y="9" width="5" height="5" rx="0.5" stroke="white" strokeWidth="1.4"/>
          </svg>
        </a>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[#2277F0] uppercase leading-none tracking-wider">YBM AI</p>
          <p className="text-sm font-black text-[#1A2B4B] leading-tight">TOEIC 집중 과외</p>
        </div>
        <span className="text-xs text-ybm-text-sub font-medium">{LESSONS.length}개 수업</span>
      </header>

      {/* Course summary */}
      <div className="bg-white border-b border-ybm-border px-5 py-4 shrink-0">
        <p className="text-xs text-ybm-text-sub mb-1">전체 커리큘럼</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#E8F0FE] rounded-full overflow-hidden">
            <div className="h-full w-0 bg-[#2277F0] rounded-full" />
          </div>
          <span className="text-xs font-bold text-ybm-text-sub shrink-0">0 / {LESSONS.length} 완료</span>
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 px-4 pt-5 pb-10 flex flex-col gap-0">
        {/* 시나리오 기반 커리큘럼 */}
        <div className="flex flex-col">
          {LESSONS.map((lesson, idx) => (
            <div key={lesson.id} className="flex gap-0">

              {/* Left: number + connector line */}
              <div className="flex flex-col items-center shrink-0 mr-4" style={{ width: 40 }}>
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm text-white shadow-sm"
                  style={{ backgroundColor: lesson.color }}
                >
                  {lesson.num}
                </div>
                {idx < LESSONS.length - 1 && (
                  <div className="w-px flex-1 mt-1 mb-0" style={{ minHeight: 28, background: '#E2E8F0' }} />
                )}
              </div>

              {/* Right: card */}
              <div className={`flex-1 min-w-0 ${idx < LESSONS.length - 1 ? 'pb-4' : 'pb-0'}`}>
                <div
                  onClick={() => router.push(lesson.href)}
                  className="bg-white rounded-2xl border border-ybm-border shadow-sm px-4 py-4 cursor-pointer hover:shadow-md hover:-translate-y-px active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${lesson.color}15`, color: lesson.color }}
                    >
                      {lesson.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: `${lesson.color}15`, color: lesson.color }}
                        >
                          {lesson.label}
                        </span>
                        <span className="text-[11px] text-ybm-text-sub">{lesson.part}</span>
                      </div>
                      <p className="text-[15px] font-bold text-[#1A2B4B] leading-snug">{lesson.title}</p>
                      <p className="text-xs text-ybm-text-sub mt-0.5 leading-relaxed">{lesson.desc}</p>
                    </div>

                    {/* Play button */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${lesson.color}15` }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 2l7 4-7 4V2z" fill={lesson.color}/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3 mt-6 mb-4">
          <div className="flex-1 h-px bg-ybm-border" />
          <span className="text-xs font-bold text-ybm-text-sub px-2 shrink-0">AI 실시간 튜터 · 테스트</span>
          <div className="flex-1 h-px bg-ybm-border" />
        </div>

        {/* 테스트 카드 */}
        <div
          onClick={() => router.push('/part6')}
          className="bg-white rounded-2xl border border-dashed border-violet-300 shadow-sm px-4 py-4 cursor-pointer hover:shadow-md hover:-translate-y-px active:scale-[0.99] transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-violet-50 text-[#6366F1]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-[#6366F1]">TOEIC</span>
                <span className="text-[11px] text-ybm-text-sub">Part 6 · 장문 빈칸</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-600">테스트</span>
              </div>
              <p className="text-[15px] font-bold text-[#1A2B4B] leading-snug">AI 튜터와 함께 풀기</p>
              <p className="text-xs text-ybm-text-sub mt-0.5 leading-relaxed">시나리오 없이 AI와 자유롭게 대화하며 문제 풀기</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-violet-50">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 2l7 4-7 4V2z" fill="#6366F1"/>
              </svg>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
