'use client'

/* ── 화면 갤러리 (개발·검토용) ──
   완료 화면과 실전 화면에서 **나올 수 있는 상태를 URL 하나로 재현**한다.

   왜 필요한가: 이 상태들은 실제로 돌려서는 만들기 어렵다. 완료 화면의 성취 문구는 만점·80%·
   첫 완주 같은 조건이 맞아야 나오고, 스텝은 2~3초마다 자동으로 넘어가서 붙잡을 수가 없다.
   실전 화면도 파트마다 골격이 다른데 매번 수업을 처음부터 돌려야 닿는다.

   그래서 여기서는
     · 완료 화면은 스텝 컴포넌트를 **직접** 그린다. onNext 를 빈 함수로 줘서 자동 전환을 멈춘다.
     · 성취 문구는 하드코딩하지 않고 **computeBadges 를 실제로 호출해서** 뽑는다.
       문구를 고치면 갤러리도 같이 바뀌어야지, 따로 놀면 검토용으로 못 쓴다.
     · 실전 화면은 PracticeStage 를 로컬 샘플 강의로 띄운다.

   수업 화면(강의별)은 여기서 다시 그리지 않는다 — **실제 라우트를 같은 기기 프레임에 끼워** 보여준다.
   문항·레일이 DB에서 오므로 갤러리가 흉내 내면 금세 진짜와 달라진다. 목록도 DB에서 읽어
   42강을 그대로 세우고, 문항이 없는 강의는 없다고 적는다(= 콘텐츠 진행 상황이 곧 목록이다).

   /dev/screens                  → 목록
   /dev/screens?s=<id>           → 그 화면만 전체 화면으로 (스크린샷용)
   /dev/screens?s=lecture:<코드>  → 그 강의 수업 화면(실제 /lecture/<코드>)을 기기 프레임 안에 */

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useCurriculumLectures } from '@/data/db/questionStore'
import StepOpening from '@/components/session/steps/StepOpening'
import StepAccuracy from '@/components/session/steps/StepAccuracy'
import StepBadge from '@/components/session/steps/StepBadge'
import StepAction from '@/components/session/steps/StepAction'
import { computeBadges } from '@/lib/sessionBadges'
import { PracticeStage } from '@/components/type-lesson/TypeLessonPlayer'
import ContentView, { type ContentState } from '@/components/type-lesson/ContentView'
import { getTypeLesson } from '@/data/typeLearning'

const noop = () => {}

/* 기기 기준 = **iPad Air 가로**. 수업은 태블릿에서 도는 화면이라 데스크탑 전체 폭으로 캡처하면
   실제 비율과 다르다. 뷰포트를 이 크기로 고정해서 그린다. */
const DEVICE = { w: 1180, h: 820, label: 'iPad Air · 가로 1180×820' }

/** 고정 크기 뷰포트를 화면에 맞게 축소해서 보여준다 — 레이아웃은 1180×820 그대로 계산된다 */
function DeviceFrame({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => {
      // 좌우/상하 여백을 조금 남기고 꽉 채운다. 확대는 하지 않는다(1배 초과 금지)
      const s = Math.min((window.innerWidth - 32) / DEVICE.w, (window.innerHeight - 32) / DEVICE.h, 1)
      setScale(s)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return (
    <div className="fixed inset-0 bg-[#E9EDF5] flex items-center justify-center overflow-hidden">
      <div style={{ width: DEVICE.w, height: DEVICE.h, transform: `scale(${scale})` }}
        className="shrink-0 origin-center bg-white rounded-[18px] border border-[#CBD5E1] overflow-hidden shadow-[0_10px_50px_rgba(15,23,42,0.16)]">
        {/* 안쪽은 자기가 화면 전체라고 믿어야 한다.
            실전 화면 루트가 h-dvh(=브라우저 뷰포트 높이)라 그대로 두면 프레임 820px 을 무시하고
            실제 창 높이로 늘어난다. 이 프레임 안에서만 100%로 바꾼다. */}
        <style>{`.device-vp .h-dvh{height:100%!important}.device-vp .min-h-dvh{min-height:100%!important}`}</style>
        <div className="device-vp w-full h-full flex flex-col">{children}</div>
      </div>
    </div>
  )
}

/** 성취 문구 하나를 id 로 집어온다 — 실제 규칙을 태워서 뽑으므로 문구가 어긋나지 않는다 */
function feedback(
  id: string,
  input: Parameters<typeof computeBadges>[0],
  results: boolean[],
) {
  const all = computeBadges(input, results)
  return all.find((b) => b.id === id) ?? all[0]
}

interface Screen {
  id: string
  group: '완료 화면' | '실전 화면' | '수업 화면'
  label: string
  note: string
  render: () => React.ReactNode
}

function practice(lessonId: string) {
  const lesson = getTypeLesson(lessonId)
  if (!lesson) return <div className="p-8 text-sm">샘플 강의 {lessonId} 없음</div>
  return <PracticeStage lesson={lesson} onExit={noop} onDone={noop} />
}

const SCREENS: Screen[] = [
  /* ── 완료 화면 ── */
  {
    id: 'end-opening', group: '완료 화면', label: '① 수업 완료 + 풀이시간',
    note: '항상 나온다. 2초 뒤 자동으로 다음으로 넘어간다.',
    render: () => <StepOpening partName="Part 5 · 단문 빈칸 — 동사 시제" elapsedSeconds={372} onNext={noop} />,
  },
  {
    id: 'end-accuracy-perfect', group: '완료 화면', label: '② 실전 정답률 — 만점',
    note: '실전을 다 맞힌 경우.',
    render: () => <StepAccuracy correctCount={4} totalCount={4} results={[true, true, true, true]} onNext={noop} />,
  },
  {
    id: 'end-accuracy-partial', group: '완료 화면', label: '② 실전 정답률 — 일부 오답',
    note: '문항별 점이 하나씩 찍힌다(초록=정답, 빨강=오답).',
    render: () => <StepAccuracy correctCount={3} totalCount={5} results={[true, false, true, true, false]} onNext={noop} />,
  },
  {
    id: 'end-fb-perfect', group: '완료 화면', label: '③ 성취 — 완벽 풀이 🏆',
    note: '실전 만점일 때.',
    render: () => (
      <StepBadge badge={feedback('perfect', { correctCount: 4, totalCount: 4, isFirstTime: false }, [true, true, true, true])}
        badgeIndex={1} totalBadges={1} onNext={noop} />
    ),
  },
  {
    id: 'end-fb-high', group: '완료 화면', label: '③ 성취 — 실전 고득점 🎯',
    note: '실전 80% 이상이지만 만점은 아닐 때. 만점이면 이 문구 대신 완벽 풀이가 나간다.',
    render: () => (
      <StepBadge badge={feedback('high-score', { correctCount: 4, totalCount: 5, isFirstTime: false }, [true, true, true, true, false])}
        badgeIndex={1} totalBadges={1} onNext={noop} />
    ),
  },
  {
    id: 'end-fb-recap', group: '완료 화면', label: '③ 성취 — 표현 완벽 정리 🧠',
    note: '세션 정리(핵심 문장 채우기)를 다 맞혔을 때. 실전 정답률과 별개 축이다.',
    render: () => (
      <StepBadge badge={feedback('recap-perfect', { correctCount: 2, totalCount: 5, isFirstTime: false, recap: { correct: 3, total: 3 } }, [true, false, true, false, false])}
        badgeIndex={1} totalBadges={1} onNext={noop} />
    ),
  },
  {
    id: 'end-fb-first', group: '완료 화면', label: '③ 성취 — 첫 완주 🌟',
    note: '이 파트를 처음 완료했을 때.',
    render: () => (
      <StepBadge badge={feedback('first', { correctCount: 2, totalCount: 5, isFirstTime: true }, [true, false, true, false, false])}
        badgeIndex={1} totalBadges={1} onNext={noop} />
    ),
  },
  {
    id: 'end-fb-none', group: '완료 화면', label: '③ 성취 — 해당 없음',
    note: '조건을 하나도 못 채우면 이 스텝 자체가 안 나온다(정답률 → 바로 다음 행동). 참고용 빈 상태.',
    render: () => (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-slate-800 font-bold text-lg">성취 문구 없음</p>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
          만점·80%·정리만점·첫완주 중 아무것도 해당하지 않으면 이 스텝을 건너뛴다.
          잘한 게 없으면 말하지 않는다.
        </p>
      </div>
    ),
  },
  {
    id: 'end-action-remaining', group: '완료 화면', label: '④ 다음 행동 — 오늘 분량 남음',
    note: '오늘 목표(3강)를 아직 못 채웠고 다음 강의가 있을 때.',
    render: () => (
      <StepAction onNextLesson={noop} onHome={noop}
        nextLessonLabel="다음 수업 · 동사의 태" homeLabel="내 학습으로"
        title="오늘 2강 남았어요" subtitle="이어서 하면 오늘 목표를 채울 수 있어요" />
    ),
  },
  {
    id: 'end-action-done', group: '완료 화면', label: '④ 다음 행동 — 오늘 분량 완료',
    note: '오늘 목표를 다 채웠을 때. 다음 버튼이 없어 내 학습이 주 버튼이 된다.',
    render: () => (
      <StepAction onHome={noop} homeLabel="내 학습으로 돌아가기"
        title="오늘 분량을 다 했어요!" subtitle="내일 이어서 만나요. 오늘은 여기까지!" />
    ),
  },

  /* ── 실전 화면 (파트별 골격) ── */
  {
    id: 'practice-p1', group: '실전 화면', label: 'Part 1 — 사진 묘사',
    note: '사진 + 보기. 보기 내용은 음성이라 A/B/C/D만 보인다. 사진 옆에 문항 음원 버튼.',
    render: () => practice('t01'),
  },
  {
    id: 'practice-p2', group: '실전 화면', label: 'Part 2 — 질의응답',
    note: '질문도 보기도 음성. 상단 배너의 [음원 듣기]가 유일한 입력 경로다.',
    render: () => practice('t02'),
  },
  {
    id: 'practice-p3', group: '실전 화면', label: 'Part 3 — 짧은 대화',
    note: '보기는 실제 시험지에 인쇄되므로 그대로 보인다. 스크립트는 채점 전 잠금.',
    render: () => practice('t03'),
  },
  {
    id: 'practice-p4', group: '실전 화면', label: 'Part 4 — 짧은 담화',
    note: '표/시각자료가 있으면 음원 듣는 동안 상시 노출.',
    render: () => practice('t05'),
  },
  {
    id: 'review-wrong-pick', group: '실전 화면', label: '틀린 문제 다시 풀기 — 내가 고른 오답',
    note: '리뷰 단계에서 실전 때 고른 오답이 그대로 빨갛게 남는다. 채점 전이라 정답은 아직 안 열린다.',
    render: () => {
      const lesson = getTypeLesson('t07')
      if (!lesson) return null
      const q = lesson.content.questions[0]
      const myWrong = q.options.find((o) => !o.correct)!
      const st: ContentState = {
        revealedScript: 'all', revealedOptions: { 0: 'all' },
        playingId: null, marks: new Set(), tutorMarks: new Set(), onTapWord: noop,
        answerMode: 'single', focusQ: 0,
        answers: { 0: myWrong.label },
        graded: new Set(),                               // 채점 전 — 정답을 아직 안 연다
        wrongPicks: new Set([`0:${myWrong.label}`]),     // 실전에서 고른 오답
        onSelect: noop, showKo: false,
      }
      return (
        <div className="flex-1 min-h-0 overflow-y-auto p-10 bg-[#F5F8FE]">
          <div className="max-w-[560px] mx-auto"><ContentView lesson={lesson} st={st} /></div>
        </div>
      )
    },
  },
  {
    id: 'practice-p5', group: '실전 화면', label: 'Part 5 — 단문 빈칸',
    note: '문장 카드 + 보기. 문항이 여러 개면 한 쌍씩 넘긴다.',
    render: () => practice('t07'),
  },
  {
    id: 'practice-p6', group: '실전 화면', label: 'Part 6 — 장문 빈칸 (2분할)',
    note: '지문(좌) | 문항(우). 가운데 핸들로 폭 조절.',
    render: () => practice('t08'),
  },
  {
    id: 'practice-p7', group: '실전 화면', label: 'Part 7 — 1지문 독해 (2분할)',
    note: '지문(좌) | 문항(우). 하단 페이저로 문항을 넘긴다.',
    render: () => practice('t09'),
  },
  {
    id: 'practice-p7-multi', group: '실전 화면', label: 'Part 7 — 이중지문 (2분할)',
    note: '지문이 여러 개면 좌측 칸에 지문 탭이 생긴다.',
    render: () => practice('t13'),
  },
]

/* ── 수업 화면(강의별) — 실제 라우트를 그대로 끼운다 ──
   마이크는 허용해 둔다. 강사 대화는 도입에서 "수업 시작하기"를 눌러야 시작하므로,
   목록에서 열었다고 세션이 붙지는 않는다(= 그냥 열어보는 것만으로는 비용이 안 든다). */
function LectureFrame({ code }: { code: string }) {
  return (
    <iframe src={`/lecture/${code}`} title={`${code} 수업 화면`} allow="microphone"
      className="w-full h-full border-0" />
  )
}

/** 파트별 강의 목록 — 문항이 없는 강의는 링크 대신 '문항 없음'으로 둔다 */
function LectureList() {
  const lectures = useCurriculumLectures()
  if (!lectures.length) {
    return <p className="text-[12px] text-[#9CA3AF]">강의 목록을 못 읽었어요 — Supabase 환경변수를 확인하세요.</p>
  }
  const parts = Array.from(new Set(lectures.map((l) => l.part))).sort((a, b) => a - b)
  const ready = lectures.filter((l) => l.questionCount > 0).length
  return (
    <>
      <p className="text-[11.5px] text-[#6B7280] mb-2">
        커리큘럼 {lectures.length}강 중 <b className="text-[#2563EB]">문항 있는 {ready}강</b>이 열립니다.
        누르면 실제 수업 화면이 같은 기기 프레임 안에서 뜹니다.
      </p>
      {parts.map((p) => (
        <div key={p} className="mb-3">
          <p className="text-[11px] font-black text-[#94A3B8] mb-1.5">Part {p}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {lectures.filter((l) => l.part === p).map((l) => (
              l.questionCount > 0 ? (
                <a key={l.code} href={`/dev/screens?s=lecture:${l.code}`}
                  className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 hover:border-[#93C5FD] transition-colors">
                  <span className="shrink-0 text-[10px] font-mono font-bold text-[#2563EB]">{l.code}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#1C1B33]">{l.title}</span>
                  <span className="shrink-0 text-[10px] text-[#9CA3AF]">문항 {l.questionCount}</span>
                </a>
              ) : (
                <div key={l.code}
                  className="flex items-center gap-2 bg-[#F8FAFC] border border-dashed border-[#E5E7EB] rounded-xl px-3 py-2">
                  <span className="shrink-0 text-[10px] font-mono font-bold text-[#CBD5E1]">{l.code}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#C4C9D4]">{l.title}</span>
                  <span className="shrink-0 text-[10px] text-[#C4C9D4]">문항 없음</span>
                </div>
              )
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function Gallery() {
  const search = useSearchParams()
  const router = useRouter()
  const id = search.get('s')
  const lectureCode = id?.startsWith('lecture:') ? id.slice('lecture:'.length) : null
  const current: Screen | undefined = lectureCode
    ? { id: id!, group: '수업 화면', label: `${lectureCode} 수업 화면`, note: '실제 /lecture 라우트',
      render: () => <LectureFrame code={lectureCode} /> }
    : SCREENS.find((s) => s.id === id)

  /* 단일 화면 — 전체 화면으로. 스크린샷에 군더더기가 안 들어가야 하므로 라벨을 얇게 띄운다.
     ?frame=phone — 폰 폭(420px)으로 좁혀서 그린다. 완료 화면은 모바일 기준으로 만든 레이아웃이라
     데스크탑 전체 폭으로 캡처하면 양옆이 텅 비어 검토가 안 된다. */
  if (current) {
    /* ?frame=raw — 기기 프레임 없이 브라우저 전체 폭으로. 기본은 iPad Air 가로 */
    const raw = search.get('frame') === 'raw'
    const body = raw
      ? <div className="fixed inset-0 bg-white flex flex-col">{current.render()}</div>
      : <DeviceFrame>{current.render()}</DeviceFrame>
    return (
      <>
        {body}
        <div className="fixed top-2 left-2 z-[100] flex items-center gap-1.5">
          <button onClick={() => router.push('/dev/screens')}
            className="text-[10px] font-bold text-slate-500 bg-white/90 backdrop-blur border border-slate-200 rounded-lg px-2 py-1 hover:text-slate-800">
            ← 목록
          </button>
          {!raw && <span className="text-[10px] font-semibold text-slate-400 bg-white/80 rounded-lg px-2 py-1">{DEVICE.label}</span>}
          {/* 프레임 안은 좁아서 실제로 수업을 끝까지 돌려보긴 불편하다 — 진짜 창으로 나가는 문을 둔다 */}
          {lectureCode && (
            <a href={`/lecture/${lectureCode}`} target="_blank" rel="noreferrer"
              className="text-[10px] font-bold text-slate-500 bg-white/90 backdrop-blur border border-slate-200 rounded-lg px-2 py-1 hover:text-slate-800">
              새 탭에서 열기 ↗
            </a>
          )}
        </div>
      </>
    )
  }

  const groups = ['완료 화면', '실전 화면'] as const
  return (
    <div className="min-h-dvh bg-[#F5F8FE] px-5 py-8">
      <div className="max-w-[760px] mx-auto">
        <h1 className="text-[20px] font-black text-[#1C1B33]">화면 갤러리</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          강의별 수업 화면 + 완료·실전 화면에서 나올 수 있는 상태. 검토·캡처용 개발 페이지입니다.
        </p>
        <p className="text-[12px] font-bold text-[#2563EB] mt-1.5">기기 기준 · {DEVICE.label}</p>

        {/* 수업 화면은 강의(=문항 유형)마다 달라서 대표 몇 개로는 검토가 안 된다 — 42강을 다 세운다 */}
        <div className="mt-7">
          <p className="text-[12px] font-black text-[#2563EB] mb-2">수업 화면 · 강의별</p>
          <LectureList />
        </div>

        {groups.map((g) => (
          <div key={g} className="mt-7">
            <p className="text-[12px] font-black text-[#2563EB] mb-2">{g}</p>
            <div className="flex flex-col gap-2">
              {SCREENS.filter((s) => s.group === g).map((s) => (
                <a key={s.id} href={`/dev/screens?s=${s.id}`}
                  className="block bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 hover:border-[#93C5FD] transition-colors">
                  <p className="text-[13px] font-bold text-[#1C1B33]">{s.label}</p>
                  <p className="text-[11.5px] text-[#6B7280] mt-0.5 leading-relaxed">{s.note}</p>
                  <p className="text-[10px] text-[#C4C9D4] mt-1 font-mono">?s={s.id}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DevScreensPage() {
  return (
    <Suspense fallback={null}>
      <Gallery />
    </Suspense>
  )
}
