'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { SCREEN4_CARDS, buildTurns } from '@/data/lessonScenario'
import { speakTTS, stopCurrentAudio } from '@/lib/tts'

interface Screen4Props {
  onComplete: () => void
  onEnd: () => void
  onPrev?: () => void
}

type BlankFills = Record<string, string>
type SummarySegment = string | { blank: string }

/* ── Web Speech API 타입 ── */
interface SREvent extends Event {
  readonly resultIndex: number
  readonly results: { readonly length: number; [i: number]: { readonly isFinal: boolean; [j: number]: { readonly transcript: string } } }
}
interface SRInstance extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string
  onstart: ((e: Event) => void) | null
  onend:   ((e: Event) => void) | null
  onerror: ((e: Event) => void) | null
  onresult: ((e: SREvent) => void) | null
  start(): void; stop(): void; abort(): void
}

const CARD_META: { title: SummarySegment[]; body: SummarySegment[] }[] = [
  {
    title: [{ blank: 'A' }, '와의 관계 확인'],
    body:  ['주어가 직접 행위를 하는 주체면 ', { blank: 'B' }, ', 주어가 행위를 당하는 대상이면 ', { blank: 'C' }],
  },
  {
    title: [{ blank: 'A' }, ' 유무 확인'],
    body:  ['동사 뒤에 ', { blank: 'B' }, '가 있으면 ', { blank: 'C' }, ', 없으면 ', { blank: 'D' }],
  },
  {
    title: ['수, ', { blank: 'A' }, ' 확인'],
    body:  ['주어의 수를 확인하여 ', { blank: 'B' }, ' 맞추고, 시간 부사(next, last) 확인하여 ', { blank: 'C' }, ' 확인'],
  },
]

export default function Screen4({ onComplete, onEnd, onPrev }: Screen4Props) {
  const persona  = useClassroomStore(s => s.persona)
  const userName = useOnboardingStore(s => s.userName) || '민주'
  const TURNS    = buildTurns(userName)

  const [speech, setSpeech]           = useState('')
  const [isPlaying, setPlaying]       = useState(false)
  const [fills, setFills]             = useState<BlankFills[]>(SCREEN4_CARDS.map(() => ({})))
  const [fillCorrect, setFillCorrect] = useState<Record<string, boolean>[]>(SCREEN4_CARDS.map(() => ({})))
  const [cardDone, setCardDone]       = useState<boolean[]>(SCREEN4_CARDS.map(() => false))
  const [activeCard, setActiveCard]   = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [showAnswers, setShowAnswers] = useState(false)

  const recognRef      = useRef<SRInstance | null>(null)
  const speechBufRef   = useRef('')
  const isRecordingRef = useRef(false)
  const activeCardRef  = useRef(0)
  const mountedRef     = useRef(true)
  const startedRef     = useRef(false)

  useEffect(() => {
    activeCardRef.current = activeCard
  }, [activeCard])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopCurrentAudio()
      isRecordingRef.current = false
      try { recognRef.current?.stop() } catch (_) {}
    }
  }, [])

  /* 오프닝 TTS */
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const run = async () => {
      const text = TURNS.s4_opening.script
      setSpeech(text)
      setPlaying(true)
      await speakTTS(text, persona)
      if (mountedRef.current) setPlaying(false)
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 빈칸 채우기 처리 */
  const processCard = useCallback((text: string, cardIdx: number) => {
    const card  = SCREEN4_CARDS[cardIdx]
    const lower = text.toLowerCase()
    const newFills: BlankFills                = {}
    const newCorrect: Record<string, boolean> = {}

    card.blanks.forEach(blank => {
      const keywords = card.keywords[blank as keyof typeof card.keywords] as string[]
      const matched  = keywords.some(kw => lower.includes(kw))
      const answer   = card.answers[blank as keyof typeof card.answers] as string
      newFills[blank]   = matched ? answer : '✗'
      newCorrect[blank] = matched
    })

    setFills(prev => prev.map((f, i) => i === cardIdx ? newFills : f))
    setFillCorrect(prev => prev.map((f, i) => i === cardIdx ? newCorrect : f))
    setCardDone(prev => { const next = [...prev]; next[cardIdx] = true; return next })
    if (cardIdx + 1 < SCREEN4_CARDS.length) setActiveCard(cardIdx + 1)
  }, [])

  /* Web Speech API 시작 */
  const startSR = useCallback(() => {
    const SRCtor = (
      (window as unknown as { SpeechRecognition?: new () => SRInstance; webkitSpeechRecognition?: new () => SRInstance })
        .SpeechRecognition ??
      (window as unknown as { SpeechRecognition?: new () => SRInstance; webkitSpeechRecognition?: new () => SRInstance })
        .webkitSpeechRecognition
    )
    if (!SRCtor) { alert('이 브라우저는 음성 인식을 지원하지 않습니다. (Chrome 권장)'); return }

    const rec = new SRCtor()
    rec.lang           = 'ko-KR'
    rec.continuous     = true
    rec.interimResults = true

    rec.onresult = (e: SREvent) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else                      interim += t
      }
      if (final) speechBufRef.current = (speechBufRef.current + ' ' + final).trim()
      setInterimText(interim || speechBufRef.current)
    }
    rec.onerror = () => {}
    rec.onend = () => {
      /* Chrome이 예기치 않게 종료한 경우 자동 재시작 */
      if (isRecordingRef.current) {
        setTimeout(() => { if (isRecordingRef.current) startSR() }, 200)
      }
    }
    recognRef.current = rec
    rec.start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 마이크 토글 (시작 / 중지+처리) */
  const handleMicToggle = useCallback((cardIdx: number) => {
    if (isPlaying) return

    if (isRecording) {
      /* 중지 → 처리 */
      isRecordingRef.current = false
      try { recognRef.current?.stop() } catch (_) {}
      recognRef.current = null
      const text = speechBufRef.current.trim()
      speechBufRef.current = ''
      setInterimText('')
      setIsRecording(false)
      if (text) processCard(text, cardIdx)
    } else {
      /* 시작 */
      speechBufRef.current = ''
      setInterimText('')
      isRecordingRef.current = true
      setIsRecording(true)
      startSR()
    }
  }, [isPlaying, isRecording, processCard, startSR])

  /* 정답 보기 */
  const handleShowAnswers = useCallback(() => {
    setShowAnswers(true)
    setFills(SCREEN4_CARDS.map(card => {
      const f: BlankFills = {}
      card.blanks.forEach(blank => { f[blank] = card.answers[blank as keyof typeof card.answers] as string })
      return f
    }))
    setFillCorrect(SCREEN4_CARDS.map(card => {
      const c: Record<string, boolean> = {}
      card.blanks.forEach(blank => { c[blank] = true })
      return c
    }))
    setCardDone(SCREEN4_CARDS.map(() => true))
  }, [])

  const allDone = cardDone.every(Boolean)

  return (
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={speech}
      instructorLoading={false}
      instructorVideoSrc={undefined}
      onEnd={onEnd}
      toolbar={
        <div className="flex items-center px-4 py-3 gap-2">
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              disabled={!onPrev}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                ${!onPrev ? 'opacity-30 cursor-not-allowed text-ybm-text-sub' : 'text-ybm-text hover:bg-ybm-bg active:scale-95'}`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              이전
            </button>
            <button
              onClick={() => { stopCurrentAudio(); allDone || showAnswers ? onComplete() : onEnd() }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#2277F0] text-white hover:bg-[#1a66d4] shadow-sm active:scale-95 transition-all"
            >
              {allDone || showAnswers ? '요약 노트 보기' : '종료'}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 h-full">

        {/* 헤더 */}
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

        {/* 카드 영역 */}
        <div className="ybm-card px-5 pt-4 pb-5 flex flex-col gap-4 flex-1">

          {/* 안내 + 정답 보기 */}
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-[#1A2B4B]">오늘 배운 내용을 직접 설명해 보세요</p>
            {allDone && !showAnswers && (
              <button
                onClick={handleShowAnswers}
                className="shrink-0 ml-3 px-3 py-1.5 bg-[#2277F0] text-white text-xs font-bold rounded-lg hover:bg-[#1a66d4] active:scale-95 transition-all"
              >
                정답 보기
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 flex-1">
            {SCREEN4_CARDS.map((c, i) => {
              const isCurrent   = i === activeCard && !allDone
              const isDone      = cardDone[i]
              const isRecordNow = isRecording && i === activeCard
              const meta        = CARD_META[i]

              return (
                <div
                  key={c.id}
                  className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all bg-white
                    ${isCurrent ? 'border-[#2277F0]' : isDone ? 'border-green-300' : 'border-ybm-border'}
                  `}
                >
                  {/* 번호 + 마이크 + 제목 */}
                  <div className="flex items-center gap-2">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0 text-white
                      ${isDone ? 'bg-green-500' : 'bg-[#2277F0]'}`}>
                      {isDone ? '✓' : i + 1}
                    </span>

                    {isCurrent && (
                      <button
                        onClick={() => handleMicToggle(i)}
                        disabled={isPlaying}
                        aria-label={isRecordNow ? '녹음 중지' : '녹음 시작'}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all
                          ${isPlaying ? 'opacity-30 cursor-not-allowed bg-ybm-bg text-ybm-text-sub'
                          : isRecordNow
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-[#2277F0]/10 text-[#2277F0] hover:bg-[#2277F0]/20 active:scale-95'}`}
                      >
                        {isRecordNow
                          ? <span className="w-3 h-3 rounded-sm bg-white inline-block" />
                          : <MicIcon />}
                      </button>
                    )}

                    <span className="text-base font-bold text-[#1A2B4B] leading-9 flex-1">
                      {renderSummarySegments(meta.title, fills[i], fillCorrect[i])}
                    </span>
                  </div>

                  {/* 빈칸 문장 */}
                  <div className="text-sm text-ybm-text-sub font-semibold leading-9 pl-2">
                    {renderSummarySegments(meta.body, fills[i], fillCorrect[i])}
                  </div>

                  {/* 실시간 인식 텍스트 */}
                  {isRecordNow && (
                    <p className="text-xs text-red-500 italic min-h-[16px]">
                      {interimText ? `"${interimText}"` : '말을 마치면 버튼을 다시 눌러 제출하세요'}
                    </p>
                  )}

                  {/* 힌트 */}
                  {isCurrent && !isRecordNow && !isDone && (
                    <p className="text-xs text-[#2277F0]/70">{c.hint}</p>
                  )}
                </div>
              )
            })}
          </div>

          {showAnswers && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center shrink-0">
              <p className="text-green-700 font-semibold text-sm">정답을 모두 확인했어요! 요약 노트로 이동하세요.</p>
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
  correct: Record<string, boolean>,
) {
  return segments.map((segment, index) => {
    if (typeof segment === 'string') return segment

    const filled  = fills[segment.blank]
    const isRight = correct[segment.blank]
    const display = filled
      ? (filled.length > 10 ? filled.slice(0, 10) + '…' : filled)
      : ' '

    return (
      <span
        key={`${segment.blank}-${index}`}
        className={`mx-1 inline-flex min-w-[60px] items-end justify-center border-b-2 px-1 text-sm font-bold leading-7 transition-colors
          ${filled
            ? isRight ? 'border-green-400 text-green-700' : 'border-red-400 text-red-600'
            : 'border-[#CBD5E1] text-[#CBD5E1]'}
        `}
      >
        {filled || '   '}
      </span>
    )
  })
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <rect x="6" y="1.5" width="6" height="8" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 9.5c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 15.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
