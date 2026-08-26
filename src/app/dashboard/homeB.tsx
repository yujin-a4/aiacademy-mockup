'use client'

/* ── 홈 B · 오늘의 학습 브리핑 (A/B 비교용 시안) ──
 *
 * A(강사 코칭 카드 + 스탯 2장)와 **같은 주소**에서 구조와 톤을 함께 바꾼 안이다.
 * 화면 오른쪽 아래 토글로 즉시 갈아끼우며 눈으로 비교하라고 만든 것이고, FGI 실험 조건이 아니다
 * — 그래서 A 를 맞춰 고칠 필요가 없다.
 *
 * **높이는 A 와 같은 400px 로 고정한다.** 토글할 때 아래 내용이 튀면 두 안을 비교할 수가 없다.
 *
 * ── 왜 이 모양인가 ────────────────────────────────────────────────
 * A 는 강사 얼굴과 응원 문구가 주인공이고, 정작 **오늘 뭘 해야 하는지가 화면에 없었다.**
 * CTA 도 /part5 로 고정이라 '이어서'가 안 됐다. B 는 반대로 간다:
 *   · 맨 위에 **약점 한 줄**, 그 아래 오늘 들을 강의 목록, 큰 CTA 하나로 닫는다.
 *   · 강사 얼굴은 걷는다. 남기는 건 말 한 줄뿐이다.
 *   · 둥근 카드·이모지 대신 **얇은 선과 여백**. 숫자는 크게, 등폭으로.
 *
 * ── 오늘 목록은 어디서 오나 ───────────────────────────────────────
 * **`lectures` 테이블(정규 42강)이 정본이다.** /lessons 커리큘럼이 쓰는 것과 같은 경로를 탄다:
 *   useCurriculumLectures() → seq 로 색인 → FGI_SCHEDULE 이 정한 그날 강의 3개 → 복습 1개.
 *   완료 여부는 useCompletedLectures()(learner_progress) 가 정본이고, 복습이 열리는 조건은
 *   curriculumSchedule.isReviewUnlocked 를 그대로 쓴다 — 규칙을 두 군데 쓰면 반드시 어긋난다.
 * '오늘'은 **강의를 다 듣지 않은 첫 Day**로 잡는다. 앱에 따로 날짜↔Day 매핑이 없어서다.
 * DB 가 없거나 비면(키 없는 환경) homeToday.TODAY_TASKS 로 degrade 한다 — 다른 스토어와 같은 규칙.
 *
 * 시간(분)은 lectures 에 없다. 지어내지 않고 **문항 수**를 그대로 보여준다.
 */

import Link from 'next/link'
import { useMemo } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useStreakDay } from '@/hooks/useStreakDay'
import {
  DEMO_DDAY,
  FGI_SCHEDULE,
  REVIEW_LABEL,
  isReviewUnlocked,
} from '@/data/curriculumSchedule'
import { useCurriculumLectures, useCompletedLectures, type DbLecture } from '@/data/db/questionStore'
import { displayLecture } from '@/data/lectureTitles'
import { TODAY_TASKS } from '@/data/homeToday'
import { INST_WEAK_COMMENTS, homeCoachLine, type CoachSituation } from '@/data/instructorData'

/* ── 시연 고정값 (앱에 대응 데이터가 없는 것들) ──
   실제 값이 생기면 이 두 덩어리만 걷어내면 된다. DEMO_DDAY 와 같은 취급이다. */

/** 시험 회차·접수 정보. 앱은 examDate(날짜) 하나만 갖고 있어서 회차·마감은 여기서 채운다. */
const DEMO_EXAM = {
  round: '정기 제402회',
  dateLabel: '09.20 SUN',
  applyDeadline: '9월 1일',
  applyRemain: '6일 남음',
}

/** 최고 연속 학습일. useStreakDay 는 '현재 연속'만 세고 최고 기록은 남기지 않는다. */
const DEMO_STREAK_BEST = 21

/* ── 화면이 그리는 한 줄 ── */
type RowStatus = 'done' | 'current' | 'todo' | 'locked'
interface Row {
  key: string
  title: string
  /** 오른쪽 끝에 붙는 값 — 실제 강의면 문항 수, degrade 면 예상 시간 */
  meta: string
  href: string
  status: RowStatus
  note?: string
}

function TaskRow({ row, index }: { row: Row; index: number }) {
  const body = (
    <div className="flex items-center gap-4 py-2.5">
      <span
        className={`w-6 shrink-0 text-[12px] font-bold tabular-nums ${
          row.status === 'current' ? 'text-[#2563EB]' : 'text-[#C4C7CE]'
        }`}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-[15px] ${
          row.status === 'current'
            ? 'font-bold text-[#111827]'
            : row.status === 'done'
            ? 'font-medium text-[#9CA3AF]'
            : 'font-medium text-[#B4B7BE]'
        }`}
      >
        {row.title}
      </span>
      <span className="shrink-0 text-[12px] tabular-nums text-[#9CA3AF]">{row.meta}</span>
    </div>
  )

  // 잠긴 줄은 누를 수 없다 — 왜 막혔는지 한 줄 달아준다.
  if (row.status === 'locked') {
    return (
      <div className="border-b border-[#F0F1F4] last:border-b-0">
        {body}
        {row.note && <p className="-mt-0.5 pb-2 pl-10 text-[11px] text-[#C4C7CE]">{row.note}</p>}
      </div>
    )
  }

  return (
    <Link
      href={row.href}
      className="block border-b border-[#F0F1F4] transition-colors last:border-b-0 hover:bg-[#FAFBFC]"
    >
      {body}
    </Link>
  )
}

/* ── 오른쪽 카드 껍데기 ── */
function SideCard({ label, right, children, className = '' }: {
  label: string
  right?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded border border-[#E5E7EB] bg-white p-4 ${className}`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[12px] font-semibold text-[#6B7280]">{label}</p>
        {right}
      </div>
      {children}
    </div>
  )
}

export default function HomeB() {
  const { targetScore, currentLcScore, currentRcScore, selectedInstructor } = useOnboardingStore()
  const streakDay = useStreakDay()

  const lectures = useCurriculumLectures()
  const doneCodes = useCompletedLectures()

  /* ── 오늘 목록 만들기 ── */
  const plan = useMemo(() => {
    const bySeq = new Map<number, DbLecture>()
    for (const l of lectures) if (l.seq != null) bySeq.set(l.seq, l)

    const doneSeq = new Set<number>()
    for (const l of lectures) if (l.seq != null && doneCodes.has(l.code)) doneSeq.add(l.seq)

    // '오늘' = 강의를 다 듣지 않은 첫 Day. 전부 끝났으면 마지막 Day 를 그대로 보여준다.
    const day =
      FGI_SCHEDULE.find((d) => d.lectures.some((s) => !doneSeq.has(s))) ??
      FGI_SCHEDULE[FGI_SCHEDULE.length - 1]

    // 시간표의 seq 중 lectures 테이블에 실제로 있는 것만 세운다 (문항 미준비분은 빠질 수 있다)
    const todays = day.lectures.map((s) => bySeq.get(s)).filter((l): l is DbLecture => !!l)

    // DB 가 비면(키 없음·조회 실패) 시연 고정 목록으로 degrade
    if (todays.length === 0) {
      const rows: Row[] = TODAY_TASKS.map((t) => ({
        key: t.id,
        title: t.title,
        meta: `${t.minutes}분`,
        href: t.href,
        status: t.status === 'locked' ? 'locked' : t.status,
        note: t.lockNote,
      }))
      return {
        rows,
        next: rows.find((r) => r.status === 'current') ?? null,
        dayNo: null as number | null,
        headline: '오늘의 학습',
        totalMeta: `${TODAY_TASKS.filter((t) => t.kind !== 'REVIEW').reduce((s, t) => s + t.minutes, 0)}분`,
        lectureCount: TODAY_TASKS.filter((t) => t.kind !== 'REVIEW').length,
        allLecturesDone: false,
        /** 약점 한 줄이 집을 파트 (INST_WEAK_COMMENTS 의 키) */
        weakKey: 'P5' as string | undefined,
      }
    }

    const firstUndone = todays.find((l) => !doneCodes.has(l.code)) ?? null
    const rows: Row[] = todays.map((l) => ({
      key: l.code,
      title: displayLecture(l.code, l.title).name,
      meta: `${l.questionCount}문항`,
      href: `/lecture/${l.code}`,
      status: doneCodes.has(l.code) ? 'done' : l.code === firstUndone?.code ? 'current' : 'todo',
    }))

    // 복습은 그날 강의를 다 들어야 열린다(시연 강의가 있는 날은 예외 — isReviewUnlocked 가 판단)
    const reviewOpen = isReviewUnlocked(day, doneSeq)
    rows.push({
      key: `review-${day.day}`,
      title: REVIEW_LABEL,
      meta: '복습',
      href: `/review/${day.day}`,
      status: reviewOpen ? (firstUndone ? 'todo' : 'current') : 'locked',
      note: reviewOpen ? undefined : '오늘 강의를 끝내면 열려요',
    })

    const parts = Array.from(new Set(todays.map((l) => `${l.lcRc} Part ${l.part}`)))
    return {
      rows,
      next: rows.find((r) => r.status === 'current') ?? null,
      dayNo: day.day,
      headline: `${parts.join(' · ')} ${todays.length}강 + 복습 1세트`,
      totalMeta: `총 ${todays.reduce((s, l) => s + l.questionCount, 0)}문항`,
      lectureCount: todays.length,
      allLecturesDone: !firstUndone,
      /* 오늘 강의의 파트 중 약점 멘트가 **실제로 있는** 첫 파트. 화면에 뜬 강의와 물려 돌아간다 */
      weakKey: todays.map((l) => `P${l.part}`).find((p) => INST_WEAK_COMMENTS.park_hyewon[p]),
    }
  }, [lectures, doneCodes])

  /** CTA 문구 — 무엇이 다음인지에 따라 갈린다 */
  const cta = !plan.next
    ? '오늘 학습 완료'
    : plan.allLecturesDone
    ? '오늘 복습 열기'
    : plan.rows.some((r) => r.status === 'done')
    ? '이어서 학습하기'
    : '오늘의 학습 시작'

  const recentScore =
    currentLcScore != null && currentRcScore != null ? currentLcScore + currentRcScore : null

  /* ── 한마디 — 이미 있는 룰베이스 두 개에서 고른다. 없는 통계를 지어내지 않는다 ──
     1순위: INST_WEAK_COMMENTS[강사][오늘 파트] — "P5에서 시간 다 쓰면 뒤가 무너져…" 식의 약점 지적.
             오늘 목록에 뜬 파트로 키를 잡으니 화면과 어긋나지 않는다.
     2순위: 오늘 파트에 약점 멘트가 없으면 homeCoachLine(진행 상태 3구간)으로 떨어진다. */
  const inst = selectedInstructor ?? 'park_hyewon'
  const situation: CoachSituation = plan.allLecturesDone
    ? 'done'
    : plan.rows.some((r) => r.status === 'done')
    ? 'resume'
    : 'start'
  const coachLine =
    (plan.weakKey ? INST_WEAK_COMMENTS[inst]?.[plan.weakKey] : undefined) ??
    homeCoachLine(inst, situation)

  return (
    // 높이를 A(400px 코칭 카드)와 맞춘다. 본문 서체 명시 — body 는 Noto Sans KR 이라 font-sans 를 걸어야 Pretendard.
    <div className="flex w-full max-w-[1080px] flex-col gap-3 font-sans md:h-[400px]">

      {/* ── ① AI 강사의 한마디 — 한 줄 ── */}
      <div className="flex shrink-0 items-center gap-3 rounded border border-[#E5E7EB] bg-white px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#EFF6FF] text-[10px] font-bold text-[#2563EB]">
          AI
        </span>
        <p className="shrink-0 text-[13px] font-bold text-[#111827]">AI 강사의 한마디</p>
        <p className="min-w-0 flex-1 truncate text-[13px] text-[#4B5563]">{coachLine}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">

        {/* ── ② 오늘의 학습 (주인공) ── */}
        <div className="flex min-h-0 flex-col rounded border border-[#E5E7EB] bg-white p-5">
          <p className="text-[12px] font-semibold text-[#2563EB]">
            오늘의 학습
            {plan.dayNo != null && ` · Day ${plan.dayNo}`}
            {` · ${plan.lectureCount}단계 · ${plan.totalMeta}`}
          </p>
          <h2 className="mt-2 text-[24px] font-bold leading-tight tracking-tight text-[#111827]">
            {plan.headline}
          </h2>

          {/* 줄이 늘어도 CTA 가 밀려나지 않게 목록만 접힌다 — 400px 안에서 머리와 CTA 는 항상 보인다 */}
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {plan.rows.map((row, i) => <TaskRow key={row.key} row={row} index={i} />)}
          </div>

          {plan.next ? (
            <Link
              href={plan.next.href}
              className="mt-4 flex shrink-0 items-center justify-between rounded bg-[#2563EB] px-5 py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-[#1D4ED8]"
            >
              {cta}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div className="mt-4 shrink-0 rounded bg-[#F3F4F6] px-5 py-3.5 text-center text-[16px] font-bold text-[#9CA3AF]">
              {cta}
            </div>
          )}
        </div>

        {/* ── ③ 오른쪽 지표 두 장 — 둘이 반반씩 나눠 갖는다 ── */}
        <div className="flex min-h-0 flex-col gap-4">

          <SideCard
            label="연속 학습"
            right={<span className="text-[11px] text-[#9CA3AF]">최고 {DEMO_STREAK_BEST}일</span>}
            className="flex flex-1 flex-col"
          >
            <p className="mt-2 text-[36px] font-bold leading-none tabular-nums tracking-tight text-[#111827]">
              {streakDay}
              <span className="ml-2 text-[13px] font-semibold text-[#6B7280]">일째</span>
            </p>
            {/* 최근 14일. 하루하루의 기록은 없어서 '최근 연속분만 채운다'로 읽는다.
                justify-between 으로 카드 폭을 꽉 채운다 — 점 개수가 바뀌어도 간격이 알아서 맞는다. */}
            <div className="mt-auto flex justify-between pt-4">
              {Array.from({ length: 14 }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full ${
                    i >= 14 - Math.min(streakDay, 14) ? 'bg-[#6B7280]' : 'bg-[#E5E7EB]'
                  }`}
                />
              ))}
            </div>
          </SideCard>

          <SideCard
            label="토익 시험"
            right={<span className="text-[11px] tabular-nums text-[#9CA3AF]">{DEMO_EXAM.dateLabel}</span>}
            className="flex flex-1 flex-col"
          >
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-[36px] font-bold leading-none tabular-nums tracking-tight text-[#111827]">
                {DEMO_DDAY ?? 'D-?'}
              </p>
              <p className="text-[12px] text-[#9CA3AF]">{DEMO_EXAM.round}</p>
            </div>

            <div className="mt-auto space-y-1.5 border-t border-[#F0F1F4] pt-3 text-[12px]">
              <div className="flex items-baseline justify-between">
                <span className="text-[#9CA3AF]">접수 마감</span>
                <span className="font-medium text-[#6B7280]">
                  {DEMO_EXAM.applyDeadline} · {DEMO_EXAM.applyRemain}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[#9CA3AF]">목표 / 최근</span>
                <span className="font-semibold tabular-nums text-[#111827]">
                  {targetScore ?? '—'} <span className="text-[#D1D5DB]">/</span> {recentScore ?? '—'}
                </span>
              </div>
            </div>
          </SideCard>
        </div>
      </div>
    </div>
  )
}

/* ── A|B 토글 ──
   검토용 스위치라 화면 흐름에 끼지 않게 떠 있는다. 모바일에서는 하단 네비를 피해 위로 올린다.
   통화 화면(z-50)보다는 아래에 둔다 — 전화가 오는데 토글이 그 위에 뜨면 안 된다. */
export function HomeVariantToggle({
  variant,
  onChange,
}: {
  variant: 'a' | 'b'
  onChange: (v: 'a' | 'b') => void
}) {
  return (
    <div className="fixed bottom-24 right-4 z-40 flex items-center gap-0.5 rounded-full border border-[#DBEAFE] bg-white/95 p-1 shadow-lg backdrop-blur md:bottom-6">
      {(['a', 'b'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
            variant === v ? 'bg-[#2563EB] text-white' : 'text-[#9CA3AF] hover:text-[#2563EB]'
          }`}
        >
          홈 {v.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
