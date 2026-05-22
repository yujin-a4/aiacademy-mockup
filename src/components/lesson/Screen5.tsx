'use client'

import { useEffect, useRef, useState } from 'react'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { buildTurns } from '@/data/lessonScenario'
import { speakAndWait, stopCurrentAudio } from '@/lib/tts'

interface Screen5Props {
  onComplete: () => void
}

export default function Screen5({ onComplete }: Screen5Props) {
  const persona  = useClassroomStore((s) => s.persona)
  const userName = useOnboardingStore((s) => s.userName) || '민주'
  const TURNS    = buildTurns(userName)

  const [isPlaying, setPlaying] = useState(true)
  const [saved, setSaved]       = useState(false)
  const playedRef = useRef(false)

  useEffect(() => {
    if (playedRef.current) return
    playedRef.current = true
    const turn = TURNS.s5_closing
    speakAndWait(turn.script, persona).then(() => setPlaying(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDownload = () => {
    setSaved(true)
    window.alert('요약 노트가 MY PAGE에 저장되었습니다. (PDF 다운로드 준비 중)')
  }

  return (
    <div className="h-dvh flex flex-col bg-ybm-bg overflow-y-auto">
      {/* 헤더 */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-ybm-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#2277F0] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="1" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5"/>
              <path d="M5 5h6M5 8h6M5 11h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-sm text-[#1A2B4B]">오늘의 학습 요약 노트</span>
        </div>
        <button
          onClick={() => { stopCurrentAudio(); onComplete() }}
          className="text-xs text-ybm-text-sub hover:text-ybm-text transition-colors"
        >
          학습 완료
        </button>
      </header>

      {/* 강사 마무리 말풍선 */}
      {(isPlaying || !saved) && (
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-ybm-border p-4 flex items-start gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#2277F0]/10 flex items-center justify-center shrink-0">
            <span className="text-lg"></span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#2277F0] mb-1">박혜원 AI 강사</p>
            <p className={`text-sm text-ybm-text leading-relaxed ${isPlaying ? 'animate-pulse text-ybm-text-sub' : ''}`}>
              {isPlaying ? '마무리 말씀 중...' : TURNS.s5_closing.script}
            </p>
          </div>
        </div>
      )}

      {/* 노트 본문 */}
      <div className="flex-1 px-4 pb-6 pt-4 flex flex-col gap-4">

        {/* 제목 카드 */}
        <div className="bg-[#2277F0] rounded-2xl p-5 text-white">
          <p className="text-xs font-semibold opacity-80 mb-1">Part 5 문법</p>
          <h2 className="text-xl font-bold">수동태의 기본 형태</h2>
          <p className="mt-2 text-sm opacity-90 font-mono bg-white/20 inline-block px-3 py-1 rounded-lg">
            be + p.p. (과거분사)
          </p>
        </div>

        {/* 비교표 */}
        <div className="bg-white rounded-2xl border border-ybm-border overflow-hidden shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-ybm-border">
            <div className="p-4 bg-gray-50">
              <p className="text-xs font-bold text-ybm-text-sub mb-2 uppercase tracking-wide">능동태 (Active)</p>
              <p className="text-sm font-mono text-ybm-text">S + V + O</p>
              <p className="text-xs text-ybm-text-sub mt-1">(목적어 명사 필수)</p>
            </div>
            <div className="p-4 bg-blue-50">
              <p className="text-xs font-bold text-[#2277F0] mb-2 uppercase tracking-wide">수동태 (Passive)</p>
              <p className="text-sm font-mono text-[#2277F0]">S + be + p.p.</p>
              <p className="text-xs text-[#2277F0]/70 mt-1">(+ by 행위자)</p>
            </div>
          </div>
          <div className="border-t border-ybm-border divide-x divide-ybm-border grid grid-cols-2">
            <div className="p-3 text-xs text-ybm-text-sub leading-relaxed">
              The manager reviewed the marketing budget.
            </div>
            <div className="p-3 text-xs text-[#2277F0]/80 leading-relaxed">
              The marketing budget was reviewed (by the manager).
            </div>
          </div>
        </div>

        {/* Check Point */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1.5">✅ Check Point</p>
          <p className="text-sm text-amber-800 leading-relaxed">
            동사 뒤에 목적어(명사)가 사라지고, 전치사(by …)가 오거나 문장이 끝남.
          </p>
        </div>

        {/* 토익 빈출 포인트 */}
        <div className="bg-white rounded-2xl border border-ybm-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-ybm-border bg-[#2277F0]/5">
            <p className="font-bold text-sm text-[#2277F0]">토익 빈출 포인트</p>
          </div>
          <div className="flex flex-col divide-y divide-ybm-border">
            <PointItem
              number="1"
              title="목적어 유무로 태 판별하기"
              description="빈칸 뒤에 목적어(명사)가 있으면 능동태, 없으면 수동태가 정답."
              examples={[
                { type: '능동', text: 'The board approved the proposal.' },
                { type: '수동', text: 'The proposal was approved (by the board).' },
              ]}
            />
            <PointItem
              number="2"
              title="전치사 'by'와의 관계"
              description="빈칸 뒤에 by + 사람/부서/기관이 보인다면 수동태일 확률이 압도적으로 높음."
              examples={[
                { type: '예', text: 'The equipment was installed by the maintenance team.' },
              ]}
            />
            <PointItem
              number="3"
              title="수동태 불가 동사(자동사) 암기"
              description="자동사는 수동태(be + p.p.) 자체가 불가능하므로 보기에서 가장 먼저 제외!"
              chip="appear, occur, remain, consist of, belong to, happen, exist"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold border-2 transition-all
              ${saved
                ? 'border-green-400 text-green-600 bg-green-50'
                : 'border-[#2277F0] text-[#2277F0] bg-white hover:bg-blue-50'}
            `}
          >
            {saved ? '✓ MY PAGE 저장됨' : 'PDF 다운로드'}
          </button>
          <button
            onClick={() => { stopCurrentAudio(); onComplete() }}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold bg-[#2277F0] text-white hover:bg-[#1a66d4] active:scale-[0.98] transition-all shadow-sm"
          >
            학습 완료 →
          </button>
        </div>
      </div>
    </div>
  )
}

function PointItem({
  number,
  title,
  description,
  examples,
  chip,
}: {
  number: string
  title: string
  description: string
  examples?: { type: string; text: string }[]
  chip?: string
}) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-[#2277F0] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {number}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-ybm-text mb-1">{title}</p>
          <p className="text-xs text-ybm-text-sub leading-relaxed mb-2">{description}</p>
          {examples && (
            <div className="flex flex-col gap-1">
              {examples.map((ex) => (
                <div key={ex.type} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-ybm-text-sub shrink-0 mt-0.5 w-6">{ex.type}</span>
                  <span className="text-xs font-mono text-ybm-text leading-relaxed">{ex.text}</span>
                </div>
              ))}
            </div>
          )}
          {chip && (
            <p className="mt-1.5 text-xs bg-ybm-bg rounded-lg px-3 py-1.5 text-ybm-text-sub font-mono leading-relaxed">
              {chip}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
