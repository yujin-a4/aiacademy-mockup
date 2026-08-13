'use client'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { fetchQuestionsByPart, groupByPassage, type UiDbQuestion } from '@/data/db/questionStore'
import { buildPracticeContent, practiceOnlyLesson } from '@/data/typeLearning/fromDb'
import { PracticeStage, type PracticeResult } from '@/components/type-lesson/TypeLessonPlayer'
import type { TypeLesson } from '@/data/typeLearning/types'
import { useWrongAnswerStore } from '@/store/wrongAnswerStore'

/** `next` = 채점 뒤 버튼 글자. 한 판이 무엇이냐에 따라 다르다(문항 하나 / 대화 하나 / 지문 하나) */
const PART_INFO: Record<string, { part: number; name: string; label: string; next: string }> = {
  p1: { part: 1, name: '사진 묘사', label: 'Part 1', next: '다음 문제 →' },
  p2: { part: 2, name: '질의응답', label: 'Part 2', next: '다음 문제 →' },
  p3: { part: 3, name: '짧은 대화', label: 'Part 3', next: '다음 대화 →' },
  p4: { part: 4, name: '짧은 담화', label: 'Part 4', next: '다음 담화 →' },
  p5: { part: 5, name: '단문 공란', label: 'Part 5', next: '다음 문제 →' },
  p6: { part: 6, name: '장문 공란', label: 'Part 6', next: '다음 지문 →' },
  p7: { part: 7, name: '장문 독해', label: 'Part 7', next: '다음 지문 →' },
}

/** 한 판 = 문항 1개인 파트. 문항끼리 독립이라 묶을 이유가 없다.
 *  P1 은 사진 한 장, P2 는 발화 한 개, P5 는 문장 한 개가 곧 문항이다.
 *  나머지(P3·P4·P6·P7)는 자료 하나에 문항이 여럿 딸려 있어 그 묶음이 한 판이다. */
const PER_QUESTION = new Set([1, 2, 5])

const BACK = '/my-learning?tab=part'

/** 한 판에 낼 문항 묶음 */
interface Round {
  /** 상단에 띄울 이름. P5 는 파트 이름, P6·P7 은 지문 종류('이메일'·'광고') */
  label: string
  questions: UiDbQuestion[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const BackArrow = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
)

export default function PartPracticePage() {
  const params = useParams()
  const router = useRouter()
  const partId = ((params?.partId as string) || '').toLowerCase()
  const info = PART_INFO[partId]

  const { addWrongAnswer } = useWrongAnswerStore()

  /* ── 한 판씩 이어서 푼다 ──
     끝이 정해져 있지 않다. 채점하면 그 자리에서 해설을 보고, 버튼을 누르면 다음 판으로 넘어간다.
     학습자가 그만두고 싶을 때 나간다.
       P5      : 문항끼리 독립이라 한 판 = 문항 1개
       P6·P7   : 지문 하나에 문항이 묶여 있어 한 판 = 지문 1개(이중·삼중이면 그 묶음)
     섞어 둔 순서대로 꺼내므로 한 바퀴를 다 돌 때까지 같은 판이 두 번 나오지 않는다. */
  const [rounds, setRounds] = useState<Round[]>([])
  const [cursor, setCursor] = useState(0)
  const [lesson, setLesson] = useState<TypeLesson | null>(null)
  const [tally, setTally] = useState({ solved: 0, correct: 0 })
  const [empty, setEmpty] = useState(false)
  /* 판이 바뀔 때마다 올린다 — PracticeStage 의 key 로 써서 새로 마운트시킨다.
     lesson 만 갈아 끼우면 그 안의 답·채점 상태가 앞 판 것으로 남아, 새 문항이 이미 채점된 채로 뜬다. */
  const [roundSeq, setRoundSeq] = useState(0)

  useEffect(() => {
    if (!info) return
    let alive = true
    fetchQuestionsByPart(info.part).then((rows) => {
      if (!alive) return
      if (rows.length === 0) { setEmpty(true); return }
      const next: Round[] = PER_QUESTION.has(info.part)
        ? rows.map((q) => ({ label: info.name, questions: [q] }))
        : groupByPassage(rows).map((g) => ({ label: g.label, questions: g.questions }))
      /* 못 만드는 판은 미리 버린다 — LC 는 음원 스크립트가 비면 buildPracticeContent 가 아무것도
         못 내는데, 그런 판이 순서에 섞여 있으면 화면이 '불러오는 중' 에서 멈춘다. */
      const usable = next.filter((r) => !!buildPracticeContent(info.part, r.questions))
      if (usable.length === 0) { setEmpty(true); return }
      setRounds(shuffle(usable))
      setCursor(0)
    }).catch(() => { if (alive) setEmpty(true) })
    return () => { alive = false }
  }, [info])

  useEffect(() => {
    if (!info || rounds.length === 0) return
    const r = rounds[cursor % rounds.length]
    const content = buildPracticeContent(info.part, r.questions)
    if (!content) return
    setLesson(practiceOnlyLesson(info.part, `${info.label} · ${r.label}`, content))
  }, [info, rounds, cursor])

  const handleDone = (score: PracticeResult) => {
    /* 틀린 문항을 오답노트로 넘긴다 — '파트별 연습을 풀면 틀린 문제가 자동으로 모입니다' */
    const qs = lesson?.practice?.questions ?? lesson?.content.questions ?? []
    score.results.forEach((ok, i) => {
      if (ok) return
      const q = qs[i]
      if (!q) return
      const chosen = q.options.findIndex((o) => o.label === score.answers[i])
      const correct = q.options.findIndex((o) => o.correct)
      if (chosen < 0 || correct < 0) return
      addWrongAnswer({
        partId,
        partLabel: info?.label ?? partId.toUpperCase(),
        questionText: q.q,
        choices: q.options.map((o) => o.text),
        chosenAnswer: chosen,
        correctAnswer: correct,
        explanation: q.options[correct]?.why ?? '',
        passageTitle: lesson?.title,
      })
    })

    setTally((t) => ({ solved: t.solved + score.total, correct: t.correct + score.correct }))
    setRoundSeq((s) => s + 1)
    const next = cursor + 1
    // 한 바퀴 다 돌면 순서를 다시 섞는다
    if (next >= rounds.length) { setRounds((r) => shuffle(r)); setCursor(0) } else { setCursor(next) }
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#6B7280] font-sans">
        파트를 찾을 수 없습니다.
      </div>
    )
  }

  if (empty) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans">
        <header className="px-6 py-4 flex items-center justify-between shrink-0">
          <button onClick={() => router.push(BACK)} className="p-2 -ml-2 text-[#6B7280]">{BackArrow}</button>
          <div className="font-bold text-[#1C1B33] text-[15px]">{info.label} · {info.name}</div>
          <div className="w-8" />
        </header>
        <p className="text-center text-[#6B7280] text-[14px] mt-16">이 파트에 등록된 문제가 없습니다.</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#6B7280] font-sans text-[14px]">
        문제를 불러오는 중…
      </div>
    )
  }

  return (
    <PracticeStage
      key={roundSeq}
      lesson={lesson}
      /* 수업 흐름(도입·유형 학습·실전 문제·핵심 요약) 밖이라 자기 이름 하나만 세운다 */
      steps={[lesson.title]}
      solvingHint={tally.solved > 0 ? `${tally.solved}문제 중 ${tally.correct}개 정답` : '직접 풀기'}
      nextLabel={info.next}
      onExit={() => router.push(BACK)}
      onDone={handleDone}
    />
  )
}
