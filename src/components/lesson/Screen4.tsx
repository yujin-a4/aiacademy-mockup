'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import { LessonToolbar } from './Screen1'
import InputBar from '@/components/classroom/toolbar/InputBar'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { SCREEN4_CARDS, buildTurns } from '@/data/lessonScenario'
import { speakAndWait, stopCurrentAudio } from '@/lib/tts'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'

interface Screen4Props {
  onComplete: () => void
  onEnd: () => void
  onPrev?: () => void
}

type BlankFills = Record<string, string>
type SummarySegment = string | { blank: string }

export default function Screen4({ onComplete, onEnd, onPrev }: Screen4Props) {
  const persona  = useClassroomStore((s) => s.persona)
  const userName = useOnboardingStore((s) => s.userName) || '민주'
  const TURNS    = buildTurns(userName)

  const [cardIdx, setCardIdx]   = useState(0)
  const [speech, setSpeech]     = useState('')
  const [isPlaying, setPlaying] = useState(false)
  const [fills, setFills]       = useState<BlankFills[]>(SCREEN4_CARDS.map(() => ({})))
  const [activeBlank, setActiveBlank] = useState<string | null>(null)
  const [cardDone, setCardDone] = useState<boolean[]>([false, false, false])
  const [done, setDone]         = useState(false)
  const [clearInput, setClearInput] = useState(0)
  const [drawingState, setDrawing]  = useState<DrawingState>({ tool: 'pen', color: '#EF4444' })
  const [clearCanvas, setClear]     = useState(0)

  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef  = useRef<() => void>(() => {})
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => {
      mountedRef.current = false
      stopCurrentAudio()
    }
  }, [])

  const CARD_PROMPTS = [
    TURNS.s4_opening.script,
    TURNS.s4_card2_prompt.script,
    TURNS.s4_card3_prompt.script,
  ]

  const enterCard = useCallback(async (idx: number) => {
    if (idx >= SCREEN4_CARDS.length) return
    const card = SCREEN4_CARDS[idx]
    const prompt = CARD_PROMPTS[idx]
    setSpeech(prompt)
    setPlaying(true)
    await new Promise<void>((r) => setTimeout(r, 0))
    await speakAndWait(prompt, persona)
    if (!mountedRef.current) return
    setPlaying(false)
    setActiveBlank(card.blanks[0])
    startListeningRef.current()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona])

  useEffect(() => {
    enterCard(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* STT 결과 → 빈칸 채우기 */
  const handleVoice = useCallback(async (text: string) => {
    if (!activeBlank || isPlaying) return
    stopListeningRef.current()

    const card = SCREEN4_CARDS[cardIdx]
    const keywords = card.keywords[activeBlank as keyof typeof card.keywords] as string[]

    const lower = text.toLowerCase()
    const matched = keywords.some((kw) => lower.includes(kw))
    const answer = card.answers[activeBlank as keyof typeof card.answers] as string

    const newFills = fills.map((f, i) => i === cardIdx ? { ...f, [activeBlank]: matched ? answer : text } : f)
    setFills(newFills)
    setClearInput((n) => n + 1)

    const nextBlankIdx = card.blanks.indexOf(activeBlank) + 1
    if (nextBlankIdx < card.blanks.length) {
      setActiveBlank(card.blanks[nextBlankIdx])
      const promptNext = `다음, ${card.blanks[nextBlankIdx]}는?`
      setSpeech(promptNext)
      setPlaying(true)
      await new Promise<void>((r) => setTimeout(r, 0))
      await speakAndWait(promptNext, persona)
      if (!mountedRef.current) return
      setPlaying(false)
      startListeningRef.current()
    } else {
      setActiveBlank(null)
      const newCardDone = [...cardDone]
      newCardDone[cardIdx] = true
      setCardDone(newCardDone)

      const nextCardIdx = cardIdx + 1
      if (nextCardIdx < SCREEN4_CARDS.length) {
        setCardIdx(nextCardIdx)
        await new Promise((r) => setTimeout(r, 500))
        await enterCard(nextCardIdx)
      } else {
        setDone(true)
        const conclusionText = TURNS.s4_conclusion.script
        setSpeech(conclusionText)
        setPlaying(true)
        await new Promise<void>((r) => setTimeout(r, 0))
        await speakAndWait(conclusionText, persona)
        if (mountedRef.current) setPlaying(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBlank, isPlaying, cardIdx, fills, cardDone, persona])

  const card = SCREEN4_CARDS[cardIdx]

  const CARD_META = [
    {
      title: [{ blank: 'A' }, '와의 관계 확인'] as SummarySegment[],
      body: ['주어가 직접 행위를 하는 주체면 ', { blank: 'B' }, ', 주어가 행위를 당하는 대상이면 ', { blank: 'C' }] as SummarySegment[],
    },
    {
      title: [{ blank: 'A' }, ' 유무 확인'] as SummarySegment[],
      body: ['동사 뒤에 ', { blank: 'B' }, '가 있으면 ', { blank: 'C' }, ', 없으면 ', { blank: 'D' }] as SummarySegment[],
    },
    {
      title: ['수, ', { blank: 'A' }, ' 확인'] as SummarySegment[],
      body: ['주어의 수를 확인하여 ', { blank: 'B' }, ' 맞추고, 시간 부사(next, last) 확인하여 ', { blank: 'C' }, ' 확인'] as SummarySegment[],
    },
  ]

  return (
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={speech}
      instructorLoading={false}
      instructorVideoSrc={undefined}
      onEnd={onEnd}
      toolbar={
        <LessonToolbar
          drawing={drawingState}
          onDrawingChange={setDrawing}
          onClearAll={() => setClear((n) => n + 1)}
          onPrev={onPrev}
          onNext={done
            ? () => { stopCurrentAudio(); onComplete() }
            : () => { stopCurrentAudio(); onEnd() }}
          nextLabel={done ? '요약 노트 보기' : '종료'}
          nextEnabled={done ? !isPlaying : true}
        />
      }
      instructorInput={
        <InputBar
          placeholder={
            isPlaying   ? '강사 설명 듣는 중...' :
            activeBlank ? `"${SCREEN4_CARDS[cardIdx].answers[activeBlank as keyof typeof card.answers]}"를 음성으로 말해 보세요` :
            done        ? '모든 카드를 완성했어요!' : ''
          }
          clearTrigger={clearInput}
          onReadyToListen={(start, stop) => {
            startListeningRef.current = start
            stopListeningRef.current  = stop
          }}
          onSpeechResult={handleVoice}
          actions={[]}
        />
      }
    >
      <div className="relative flex flex-col gap-4 h-full">
        <CanvasOverlay tool={drawingState.tool} color={drawingState.color} clearTrigger={clearCanvas} />

        {/* 헤더 - 다른 페이지와 동일한 스타일 */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#2277F0]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v4M9 12v4M2 9h4M12 9h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="3" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="font-bold text-base text-[#1A2B4B]">핵심 요약</span>
          <span className="ml-auto text-xs text-ybm-text-sub font-medium">
            {cardDone.filter(Boolean).length} / {SCREEN4_CARDS.length} 완성
          </span>
        </div>

        {/* 흰색 박스 — 안내 문구 + 카드 3개 */}
        <div className="ybm-card px-5 pt-4 pb-5 flex flex-col gap-4 flex-1">
          <p className="text-lg font-bold text-[#1A2B4B]">오늘 배운 내용을 직접 설명해 보세요</p>

          <div className="grid grid-cols-1 gap-3 flex-1">
            {SCREEN4_CARDS.map((c, i) => {
              const isCurrent = i === cardIdx && !done
              const isDone    = cardDone[i]
              const cardFills = fills[i]
              const meta      = CARD_META[i]

              return (
                <div
                  key={c.id}
                  className={`rounded-2xl border-2 p-4 flex flex-col gap-4 transition-all
                    ${isCurrent ? 'border-[#2277F0]'
                    : isDone    ? 'border-green-300'
                    : 'border-ybm-border'} bg-white
                  `}
                >
                  {/* 번호 + 제목 */}
                  <div className="flex items-start gap-2">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0 bg-[#2277F0] text-white">
                      {isDone ? '✓' : i + 1}
                    </span>
                    <span className="text-lg font-bold text-[#1A2B4B] leading-9">
                      {renderSummarySegments(meta.title, cardFills, activeBlank, isCurrent)}
                    </span>
                  </div>

                  {/* 빈칸 문장 */}
                  <div className="text-base text-ybm-text-sub font-semibold leading-9 flex-1">
                    {renderSummarySegments(meta.body, cardFills, activeBlank, isCurrent)}
                  </div>

                  {/* 힌트 */}
                  {isCurrent && activeBlank && !isPlaying && (
                    <p className="text-xs text-[#2277F0]/70">💬 {c.hint}</p>
                  )}
                </div>
              )
            })}
          </div>

          {done && !isPlaying && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center shrink-0">
              <p className="text-green-700 font-semibold text-sm">🎉 모든 핵심 내용을 정리했어요! 요약 노트로 이동하세요.</p>
            </div>
          )}
        </div>
      </div>
    </ClassroomLayout>
  )
}

function renderSummarySegments(
  segments: SummarySegment[],
  fills: BlankFills,
  activeBlank: string | null,
  isCurrent: boolean,
) {
  return segments.map((segment, index) => {
    if (typeof segment === 'string') return segment

    const filled = fills[segment.blank]
    const isActive = isCurrent && activeBlank === segment.blank

    return (
      <span
        key={`${segment.blank}-${index}`}
        className={`mx-1 inline-flex min-w-[70px] items-end justify-center border-b-2 px-1 text-base font-bold leading-7 transition-colors
          ${filled ? 'border-green-400 text-green-700'
          : isActive ? 'border-[#2277F0] text-[#2277F0]'
          : 'border-[#CBD5E1] text-[#CBD5E1]'}
        `}
      >
        {filled || (isActive ? '?' : '\u00A0')}
      </span>
    )
  })
}
