'use client'

/* ── 복습 세션 — 하루를 닫는 자리 ──
 *
 * "동일 유형 오답 문제 풀이"(curriculumSchedule.REVIEW_LABEL). 그날 강의에서 **틀린 문항**이
 * 있으면 그 문항의 **유사 문항**을 낸다. 순서가 아니라 오답에 매단다.
 *
 * 다만 **빈손으로 돌려보내지 않는다**(메모 54행, 콘텐츠 파트 요청): 오답에서 온 것이 3개가
 * 안 되면 그날 복습 문항 중에서 무작위로 채우고, 5개에서 끊는다 → `reviewStore.useReviewPlan`.
 *
 * **강사가 없다.** 실전 화면(PracticeStage)을 그대로 재사용해 풀고 채점만 한다 — 시트에 복습
 * 대본이 없어서, 강사를 붙이면 통제 안 된 LLM 자유 발화가 된다(docs/tutor-control-plan.md).
 *
 * 짝은 DB 가 들고 있다: 복습 문항 `<강의코드>-R00n` 의 `content.review_of` 가 원문항 코드다.
 */
import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PracticeStage, type PracticeResult } from '@/components/type-lesson/TypeLessonPlayer'
import { useDbQuestions, useCurriculumLectures } from '@/data/db/questionStore'
import { buildReviewContent } from '@/data/typeLearning/fromDb'
import { useReviewPlan } from '@/data/db/reviewStore'
import { FGI_SCHEDULE, REVIEW_LABEL } from '@/data/curriculumSchedule'
import type { TypeLesson } from '@/data/typeLearning'

/** 실전 화면은 TypeLesson 한 벌을 받는다. 복습은 문항만 있으면 되므로 나머지는 자리만 채운다 */
const shell = (part: number, title: string): Omit<TypeLesson, 'content'> => ({
  id: `review-${part}`, typeNo: 0, area: part <= 4 ? 'LC' : 'RC', part,
  partName: `Part ${part}`, typeLabel: '복습', railCode: '', title, desc: REVIEW_LABEL,
  turns: [], recap: { sentences: [], closing: '' },
})

function Notice({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  return (
    <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#F5F8FE] px-6 text-center">
      <p className="text-[15px] font-bold text-[#0F172A]">{title}</p>
      <p className="text-sm text-gray-500 max-w-[380px] leading-relaxed">{body}</p>
      <button onClick={onBack} className="mt-1 px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold">
        내 학습으로
      </button>
    </div>
  )
}

export default function ReviewSessionPage() {
  const router = useRouter()
  const params = useParams<{ day: string }>()
  const day = Number(params.day)
  const back = () => router.push('/lessons')

  const lectures = useCurriculumLectures()
  const schedule = FGI_SCHEDULE.find((d) => d.day === day)

  /* 시간표는 강의를 **번호(seq)** 로 부르고 문항은 **코드**로 붙는다 → 한 번 옮겨 둔다 */
  const dayCodes = useMemo(() => {
    if (!schedule) return []
    const bySeq = new Map(lectures.filter((l) => l.seq != null).map((l) => [l.seq as number, l]))
    return schedule.lectures.map((s) => bySeq.get(s)?.code).filter(Boolean) as string[]
  }, [schedule, lectures])

  const plan = useReviewPlan(dayCodes)
  const [score, setScore] = useState<PracticeResult | null>(null)

  /* 낼 문항을 통째로 읽어 실전 화면이 쓰는 콘텐츠로 만든다.
     복습이 여러 강의에 걸치면 파트가 섞이는데, 실전 화면은 한 파트를 담는 그릇이다
     → **첫 문항의 파트로 묶고 나머지는 버린다.** 지금 시연 이틀(D1=1강 LC · D4=24강 RC)은
     복습 문항이 있는 강의가 하루에 하나뿐이라 실제로 버려지는 것이 없다. */
  const built = useDbQuestions(plan.codes, (rows) => {
    const part = rows[0]?.part
    const same = rows.filter((r) => r.part === part)
    const content = buildReviewContent(part, same)
    return content ? { part, content, dropped: rows.length - same.length } : null
  }, null as null | { part: number; content: TypeLesson['content']; dropped: number })

  if (!schedule) return <Notice title={`D${params.day} 는 시간표에 없는 날이에요.`} body="복습은 하루의 마지막 자리라, 시간표에 있는 날에서만 열려요." onBack={back} />
  if (plan.loading || !lectures.length) {
    return <div className="h-dvh flex items-center justify-center bg-[#F5F8FE] text-sm text-gray-500">복습할 문제를 고르는 중…</div>
  }

  /* 여기까지 비어 있으면 **그날 복습 문항 자체가 DB 에 없다.** 틀린 것이 없어도 무작위로
     채우기 때문에(메모 54행), 이제 빈 목록은 "오답이 없다"가 아니라 "낼 문항이 없다"이다. */
  if (!plan.codes.length) {
    return <Notice
      title={`D${day} 에는 아직 복습 문제가 준비되지 않았어요.`}
      body="이 날 강의에 짝지어 둔 복습 문항이 아직 없어요. 콘텐츠가 올라오면 여기서 바로 열려요."
      onBack={back} />
  }

  /* 오답에서 온 것과 무작위로 채운 것은 **학생에게 다른 자리**다 — 말을 섞지 않는다 */
  const allFilled = plan.filledCount === plan.codes.length

  if (!built) {
    return <div className="h-dvh flex items-center justify-center bg-[#F5F8FE] text-sm text-gray-500">문제를 불러오는 중…</div>
  }

  /* 채점까지가 복습이다 — 강사 코칭 단계로 넘기지 않는다 */
  if (score) {
    return <Notice
      title={`복습 ${score.total}문제 중 ${score.correct}개 맞혔어요.`}
      body={score.correct === score.total
        ? (allFilled ? '오늘은 틀린 문제가 없어서 복습으로 한 번 더 짚었어요. 여기까지예요.'
                     : '틀렸던 유형을 이번엔 다 맞혔어요. 오늘은 여기까지예요.')
        : '틀린 유형은 다음 복습에서 다시 만나요.'}
      onBack={back} />
  }

  const lesson: TypeLesson = { ...shell(built.part, `D${day} 복습`), content: built.content }

  return (
    <PracticeStage
      lesson={lesson}
      onExit={back}
      onDone={setScore}
      /* 복습은 수업 한 판의 4단계 흐름(도입·유형 학습·실전 문제·핵심 요약) 밖에 있다 —
         지나오지도 않을 단계가 회색으로 떠 있으면 아직 남은 것처럼 읽힌다. 자기 이름만 세운다. */
      steps={['복습']}
      solvingHint={allFilled ? '오늘 배운 유형으로 한 번 더 풀기' : '틀렸던 유형으로 다시 풀기'}
      /* 실전은 채점 뒤 강사와 오답을 같이 보지만 복습은 거기서 끝난다 */
      nextLabel="복습 마치기 →"
    />
  )
}
