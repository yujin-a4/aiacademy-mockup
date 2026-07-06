'use client'

import { useEffect, useState } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import VertexConvAIPanel from '@/components/part7/VertexConvAIPanel'
import { fetchLectureQuestions, type UiDbQuestion, type UiDbOption } from '@/data/db/questionStore'

// ── DB 기반 유형학습 수업 화면 (파트 공용) ──
// 왼쪽: 파트별 문항 표시(사진묘사/대화/담화/빈칸문장/지문) — 전부 DB content 필드에서 렌더.
// 오른쪽: Vertex 음성 튜터 패널이 같은 문항으로 lessonType='lesson' 세션(시트 레일)을 진행.
// 시트에 강의·문항이 추가되면 /lessons의 DB 수업 목록과 이 화면에 자동 반영된다.

interface Props {
  lectureCode: string
  onEnd: () => void
}

const PART_NAMES: Record<number, string> = {
  1: 'PART 1 사진 묘사', 2: 'PART 2 질의응답', 3: 'PART 3 짧은 대화', 4: 'PART 4 짧은 담화',
  5: 'PART 5 단문 공란', 6: 'PART 6 장문 공란', 7: 'PART 7 독해',
}

export default function DbLessonScreen({ lectureCode, onEnd }: Props) {
  const [questions, setQuestions] = useState<UiDbQuestion[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchLectureQuestions(lectureCode).then((rows) => { if (alive) setQuestions(rows) })
    return () => { alive = false }
  }, [lectureCode])

  if (!questions) {
    return (
      <div className="h-screen flex items-center justify-center bg-ybm-bg text-sm text-ybm-text-sub">
        수업 자료를 불러오는 중...
      </div>
    )
  }
  if (questions.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-ybm-bg">
        <p className="text-sm text-ybm-text-sub">이 강의({lectureCode})에 등록된 문항이 아직 없어요.</p>
        <button onClick={onEnd} className="px-4 py-2 rounded-xl bg-cr-accent text-white text-sm font-bold">돌아가기</button>
      </div>
    )
  }

  const q = questions[0] // 수업 대표 문항 = 강의의 첫 문항

  return (
    <ClassroomLayout
      partName={`${PART_NAMES[q.part] ?? `PART ${q.part}`} · 유형학습`}
      totalProblems={1}
      instructorSpeech=""
      instructorPanel={<VertexConvAIPanel questionCode={q.code} lessonType="lesson" />}
      onEnd={onEnd}
      toolbar={
        <div className="flex items-center px-4 py-2.5 gap-2">
          <span className="text-[11px] text-ybm-text-sub">
            강의 {lectureCode} · 문항 {q.code} — 진행은 오른쪽 AI 강사와 대화로
          </span>
          <button
            onClick={onEnd}
            className="ml-auto px-5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold text-sm transition-all active:scale-95 shrink-0"
          >
            수업 종료 →
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <PartContent q={q} />
        <ChoiceCard q={q} selected={selected} onSelect={setSelected} />
      </div>
    </ClassroomLayout>
  )
}

/* ── 파트별 문항 본문 렌더러 ── */

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-ybm-border shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-[#0EA5E9] text-white text-xs font-bold px-3 py-0.5 rounded-full">{label}</span>
      </div>
      {children}
    </div>
  )
}

function PartContent({ q }: { q: UiDbQuestion }) {
  const c = q.content
  switch (q.part) {
    case 1:
      return (
        <Card label="사진">
          {/* 목업: 실제 사진 파일이 DB에 없어 핵심 요소 설명으로 대체 표시 */}
          <div className="rounded-xl border-2 border-dashed border-ybm-border bg-ybm-bg px-6 py-10 text-center">
            <p className="text-3xl mb-3">📷</p>
            <p className="text-sm font-semibold text-[#1A2B4B] mb-1">{c.photo_type ?? '사진'}</p>
            <p className="text-xs text-ybm-text-sub leading-relaxed">{c.key_elements ?? ''}</p>
          </div>
          <p className="mt-3 text-xs text-ybm-text-sub">사진을 보고 가장 알맞은 묘사를 고르세요. (음원은 AI 강사가 진행)</p>
        </Card>
      )
    case 2:
      return (
        <Card label="질문">
          <p className="text-sm leading-relaxed text-[#1A2B4B] font-medium">{c.question_text ?? ''}</p>
          {c.question_type && <p className="mt-2 text-xs text-ybm-text-sub">질문 유형: {c.question_type}</p>}
        </Card>
      )
    case 3:
      return (
        <Card label="대화">
          <div className="flex flex-col gap-2 text-sm leading-relaxed text-[#1A2B4B]">
            {[c.dialogue_open, c.dialogue_mid, c.dialogue_end].filter(Boolean).map((line, i) => (
              <p key={i} className="bg-ybm-bg rounded-xl px-4 py-2.5">{line}</p>
            ))}
          </div>
          {c.question_text && <p className="mt-3 text-sm font-semibold text-[#1A2B4B]">Q. {c.question_text}</p>}
        </Card>
      )
    case 4:
      return (
        <Card label="담화">
          <div className="flex flex-col gap-2 text-sm leading-relaxed text-[#1A2B4B]">
            {[c.talk_open, c.talk_mid, c.talk_end].filter(Boolean).map((line, i) => (
              <p key={i} className="bg-ybm-bg rounded-xl px-4 py-2.5">{line}</p>
            ))}
          </div>
          {c.question_text && <p className="mt-3 text-sm font-semibold text-[#1A2B4B]">Q. {c.question_text}</p>}
        </Card>
      )
    case 5:
      return (
        <Card label="문장">
          <p className="text-base leading-relaxed text-[#1A2B4B] font-medium">{c.blank_sentence ?? ''}</p>
          {c.grammar_point && <p className="mt-2 text-xs text-ybm-text-sub">문법 포인트: {c.grammar_point}</p>}
        </Card>
      )
    case 6:
      return (
        <Card label="지문">
          <p className="text-sm leading-relaxed text-[#1A2B4B] whitespace-pre-line">{c.passage_context ?? ''}</p>
          {c.question_text && <p className="mt-3 text-sm font-semibold text-[#1A2B4B]">Q. {c.question_text}</p>}
        </Card>
      )
    case 7:
    default:
      return (
        <Card label="지문">
          <p className="text-sm leading-relaxed text-[#1A2B4B] whitespace-pre-line">{c.passage_text ?? ''}</p>
          {c.question_text && <p className="mt-4 text-sm font-bold text-[#1A2B4B]">{c.question_number ? `${c.question_number}. ` : ''}{c.question_text}</p>}
        </Card>
      )
  }
}

/* ── 보기 카드 (공통) — 수업이라 정오 표시 없이 선택만 ── */

function ChoiceCard({ q, selected, onSelect }: {
  q: UiDbQuestion
  selected: string | null
  onSelect: (label: string) => void
}) {
  return (
    <Card label="보기">
      <div className="flex flex-col gap-2">
        {q.options.map((o: UiDbOption) => {
          const isSelected = selected === o.label
          return (
            <button
              key={o.label}
              onClick={() => onSelect(o.label)}
              className={`flex items-center gap-3 w-full text-left rounded-xl px-4 py-2.5 transition-all active:scale-[0.98] border
                ${isSelected
                  ? 'bg-[#EFF6FF] border-[#0EA5E9] text-[#0EA5E9]'
                  : 'bg-white border-ybm-border text-[#1A2B4B] hover:bg-[#EFF6FF] hover:border-[#0EA5E9]'}`}
            >
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold
                ${isSelected ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white' : 'border-ybm-border text-ybm-text-sub'}`}>
                {o.label}
              </span>
              <span className="text-sm leading-snug flex-1">{o.text}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-ybm-text-sub">답은 AI 강사와의 대화(음성/텍스트)로 말해 주세요 — 화면 선택은 메모용이에요.</p>
    </Card>
  )
}
