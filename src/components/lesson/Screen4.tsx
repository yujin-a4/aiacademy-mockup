'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import InputBar from '@/components/classroom/toolbar/InputBar'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { SCREEN4_CARDS, buildTurns } from '@/data/lessonScenario'
import { speakAndWait, stopCurrentAudio } from '@/lib/tts'

interface Screen4Props {
  onComplete: () => void
  onEnd: () => void
}

type BlankFills = Record<string, string>

export default function Screen4({ onComplete, onEnd }: Screen4Props) {
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

  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef  = useRef<() => void>(() => {})
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

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

  return (
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={speech}
      instructorLoading={isPlaying}
      instructorVideoSrc={
        done ? TURNS.s4_conclusion.videoSrc
        : cardIdx === 0 ? TURNS.s4_opening.videoSrc
        : cardIdx === 1 ? TURNS.s4_card2_prompt.videoSrc
        : TURNS.s4_card3_prompt.videoSrc
      }
      onEnd={onEnd}
      instructorInput={
        <InputBar
          placeholder={
            isPlaying       ? '강사 설명 듣는 중...' :
            activeBlank     ? `"${SCREEN4_CARDS[cardIdx].answers[activeBlank as keyof typeof card.answers]}"를 음성으로 말해 보세요` :
            done            ? '모든 카드를 완성했어요!' : ''
          }
          clearTrigger={clearInput}
          onReadyToListen={(start, stop) => {
            startListeningRef.current = start
            stopListeningRef.current  = stop
          }}
          onSpeechResult={handleVoice}
          actions={
            done && !isPlaying
              ? [{ label: '요약 노트 보기 →', onClick: () => { stopCurrentAudio(); onComplete() } }]
              : []
          }
        />
      }
    >
      <div className="flex flex-col gap-5 h-full">

        {/* 헤더 */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#2277F0]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v4M9 12v4M2 9h4M12 9h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="3" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="font-bold text-base text-[#1A2B4B]">3단계 · 핵심 요약 설명</span>
          <span className="ml-auto text-xs text-ybm-text-sub">
            {cardDone.filter(Boolean).length}/{SCREEN4_CARDS.length} 완성
          </span>
        </div>

        {/* 진행 카드들 */}
        <div className="flex flex-col gap-3">
          {SCREEN4_CARDS.map((c, i) => {
            const isCurrent = i === cardIdx && !done
            const isDone    = cardDone[i]
            const cardFills = fills[i]

            return (
              <div
                key={c.id}
                className={`rounded-2xl border-2 p-5 transition-all
                  ${isCurrent ? 'border-[#2277F0] bg-blue-50/60 shadow-sm'
                  : isDone    ? 'border-green-300 bg-green-50/40'
                  : 'border-ybm-border bg-white opacity-50'}
                `}
              >
                {/* 카드 번호 + 완료 표시 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${isDone ? 'bg-green-400 text-white' : isCurrent ? 'bg-[#2277F0] text-white' : 'bg-ybm-bg text-ybm-text-sub'}
                  `}>
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span className="text-sm font-semibold text-ybm-text">
                    {i === 0 ? '주어와의 관계' : i === 1 ? '목적어 유무' : '수 · 시제 확인'}
                  </span>
                </div>

                {/* 빈칸 텍스트 */}
                <p className="text-ybm-text text-sm leading-relaxed">
                  {renderBlanks(c.prompt, c.blanks, cardFills, activeBlank, isCurrent)}
                </p>

                {/* 힌트 */}
                {isCurrent && activeBlank && !isPlaying && (
                  <p className="mt-2 text-xs text-[#2277F0]/70">
                    💬 {c.hint}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {done && !isPlaying && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-green-700 font-semibold">🎉 모든 핵심 내용을 정리했어요!</p>
            <p className="text-green-600 text-sm mt-1">요약 노트로 저장할게요.</p>
          </div>
        )}
      </div>
    </ClassroomLayout>
  )
}

function renderBlanks(
  prompt: string,
  blanks: string[],
  fills: BlankFills,
  activeBlank: string | null,
  isCurrent: boolean,
) {
  let result = prompt
  const parts: React.ReactNode[] = []
  let remaining = result

  for (const blank of blanks) {
    const placeholder = `[  ${blank}  ]`
    const idx = remaining.indexOf(placeholder)
    if (idx === -1) continue

    parts.push(remaining.slice(0, idx))

    const filled = fills[blank]
    const isActive = isCurrent && activeBlank === blank

    parts.push(
      <span
        key={blank}
        className={`inline-block min-w-[60px] text-center font-bold px-3 py-0.5 rounded-lg border-b-2 mx-1 transition-all
          ${filled ? 'border-green-400 text-green-700 bg-green-50'
          : isActive ? 'border-[#2277F0] text-[#2277F0] bg-blue-50 animate-pulse'
          : 'border-ybm-border text-ybm-text-sub'}
        `}
      >
        {filled || (isActive ? '?' : '　　')}
      </span>
    )

    remaining = remaining.slice(idx + placeholder.length)
  }

  parts.push(remaining)
  return parts
}
