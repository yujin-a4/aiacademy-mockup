'use client'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { fetchQuestionsByPart, groupByPassage, questionCategory, type UiDbQuestion } from '@/data/db/questionStore'
import { buildPracticeContent, practiceOnlyLesson } from '@/data/typeLearning/fromDb'
import { PracticeStage, type PracticeResult } from '@/components/type-lesson/TypeLessonPlayer'
import type { TypeLesson } from '@/data/typeLearning/types'
import { useWrongAnswerStore } from '@/store/wrongAnswerStore'
import { usePracticeStatsStore, todayTally, startOfToday } from '@/store/practiceStatsStore'
import { stopCurrentAudio } from '@/lib/tts'

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
  const wrongAnswers = useWrongAnswerStore((s) => s.wrongAnswers)
  const days = usePracticeStatsStore((s) => s.days)
  const addResult = usePracticeStatsStore((s) => s.addResult)

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
  /* 나가기를 한 번에 통과시키지 않는다 — 연습은 끝이 없어서 '잘못 눌렀다'가 곧 이탈이다.
     그만두기를 고르면 바로 나가는 게 아니라 오늘 성적을 한 장 보여주고 나간다. */
  const [askExit, setAskExit] = useState(false)
  const [showResult, setShowResult] = useState(false)

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
    /* 오답노트가 유형별로 묶으려면 유형 이름이 있어야 한다 — 화면 문항(QuestionItem)에는 없고
       DB 행(UiDbQuestion)에만 있다. 이 판의 DB 행은 순서가 화면 문항과 같다. */
    const dbQs = rounds[cursor % rounds.length]?.questions ?? []
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
        /* 발문이 없는 파트(P5)는 빈칸 문장이 곧 문항이다 — 오답노트에 빈 줄을 남기지 않는다 */
        questionText: q.q || (lesson?.practice ?? lesson?.content)?.passages?.[0]?.sentences?.[i]?.en || '',
        choices: q.options.map((o) => o.text),
        chosenAnswer: chosen,
        correctAnswer: correct,
        ...(questionCategory(dbQs[i]) ? { category: questionCategory(dbQs[i])! } : {}),
        explanation: q.options[correct]?.why ?? '',
        passageTitle: lesson?.title,
      })
    })

    setTally((t) => ({ solved: t.solved + score.total, correct: t.correct + score.correct }))
    /* 화면 밖으로도 남긴다 — 컴포넌트 state 만으로는 나갔다 오면 오늘 푼 게 0 이 된다 */
    addResult(partId, score.total, score.correct)
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
        <header className="px-6 pt-safe-4 pb-4 flex items-center justify-between shrink-0">
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

  /* ── 오늘의 결과 ──
     연습에는 '제출' 이 없어서 성적을 볼 자리가 없었다. 그만두는 순간이 유일한 자리다.
     이번에 푼 것과 **오늘 이 파트 누적**을 같이 보여준다 — 나갔다 다시 들어와 이어 푼 것까지
     한 줄로 세어야 "오늘 얼마나 했나"가 맞는다. */
  if (showResult) {
    const today = todayTally(days, partId)
    const rate = today.solved ? Math.round((today.correct / today.solved) * 100) : 0
    const wrongToday = wrongAnswers.filter((w) => w.partId === partId && w.timestamp >= startOfToday())
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans">
        <header className="px-6 pt-safe-4 pb-4 flex items-center justify-between shrink-0">
          <button onClick={() => router.push(BACK)} className="p-2 -ml-2 text-[#6B7280]" aria-label="연습 목록으로">{BackArrow}</button>
          <div className="font-bold text-[#1C1B33] text-[15px]">{info.label} · {info.name}</div>
          <div className="w-8" />
        </header>

        <div className="flex-1 px-6 pb-8 max-w-[520px] w-full mx-auto">
          <p className="text-[12px] text-[#9CA3AF] mt-2">오늘 {info.label} 연습</p>
          <p className="text-[16px] text-[#1C1B33] mt-1 mb-5">
            {today.solved}문항 중 <span className="font-bold text-[#2563EB]">{today.correct}개</span>를 맞혔어요
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[['푼 문항', `${today.solved}`], ['정답', `${today.correct}`], ['정답률', `${rate}%`]].map(([k, v]) => (
              <div key={k} className="bg-white border border-[#DBEAFE] rounded-xl px-3 py-3.5 text-center">
                <div className="text-[11px] font-semibold text-[#9CA3AF]">{k}</div>
                <div className="text-[19px] font-bold text-[#2563EB] mt-0.5">{v}</div>
              </div>
            ))}
          </div>

          {/* 방금 앉은 자리에서 푼 몫 — 오늘 누적과 다르면 그것도 알려준다 */}
          {tally.solved !== today.solved && (
            <p className="text-[12px] text-[#6B7280] mb-4">
              이번에 푼 것은 {tally.solved}문항 중 {tally.correct}개 정답이에요.
            </p>
          )}

          {wrongToday.length > 0 ? (
            <button
              onClick={() => router.push('/my-learning?tab=wrong')}
              className="w-full text-left bg-white border-l-4 border-[#06B6D4] border-y border-r border-[#DBEAFE] rounded-r-xl px-4 py-3.5 mb-3 hover:bg-[#F8FAFF] transition-colors"
            >
              <p className="text-[13px] font-semibold text-[#1C1B33]">
                오늘 틀린 {wrongToday.length}문제가 AI 오답노트에 담겼어요
              </p>
              <p className="text-[12px] text-[#6B7280] mt-0.5">AI 강사가 스캐폴딩 힌트를 준비해뒀어요 · 오답노트 보기 →</p>
            </button>
          ) : (
            <p className="text-[13px] text-[#6B7280] mb-3">오늘 이 파트에서 틀린 문제가 없어요.</p>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => { setShowResult(false); setRoundSeq((n) => n + 1) }}
              className="flex-1 py-3 rounded-xl border border-[#DBEAFE] bg-white text-[#374151] font-bold text-[13px] hover:bg-[#F8FAFF] transition-colors"
            >
              이어서 풀기
            </button>
            <button
              onClick={() => router.push(BACK)}
              className="flex-1 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[13px] transition-colors"
            >
              연습 목록으로
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <PracticeStage
      key={roundSeq}
      lesson={lesson}
      /* 수업 흐름(도입·유형 학습·실전 문제·핵심 요약) 밖이라 자기 이름 하나만 세운다 */
      steps={[lesson.title]}
      /* 자율학습은 시험지처럼 — 문항을 감싼 카드를 벗긴다 */
      paperLook
      solvingHint={tally.solved > 0 ? `${tally.solved}문제 중 ${tally.correct}개 정답` : '직접 풀기'}
      nextLabel={info.next}
      /* 아직 한 문제도 안 풀었으면 묻지 않는다 — 물어볼 기록이 없다 */
      onExit={() => { if (tally.solved === 0) router.push(BACK); else setAskExit(true) }}
      onDone={handleDone}
    />

    {/* ── 그만두기 확인 ──
        실전 모의고사와 같은 자리·같은 말투다. 겁주지 않는다 — 기록은 남고 언제든 이어 푼다. */}
    {askExit && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6 font-sans">
        <div role="dialog" aria-modal="true" aria-labelledby="practice-exit-title"
          className="w-full max-w-sm bg-white rounded-sm border border-[#E5E7EB] shadow-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <h2 id="practice-exit-title" className="text-[16px] font-black text-[#1C1B33]">정말 그만하시겠어요?</h2>
            <p className="text-[13px] text-[#6B7280] leading-relaxed">
              지금까지 {tally.solved}문항을 풀었어요. 기록은 저장되고 결과를 보여드릴게요.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAskExit(false)}
              className="flex-1 py-2.5 rounded-sm border border-[#DBEAFE] bg-white text-[#374151] font-bold text-[13px] hover:bg-[#F8FAFF] transition-colors"
            >
              계속 풀기
            </button>
            <button
              onClick={() => { stopCurrentAudio(); setAskExit(false); setShowResult(true) }}
              className="flex-1 py-2.5 rounded-sm bg-[#1C1B33] hover:bg-[#33324D] text-white font-bold text-[13px] transition-colors"
            >
              그만두기
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
