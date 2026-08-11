'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useMemo, useRef, useEffect } from 'react'
import AccountMenu from '@/components/AccountMenu'
import { useStreakDay } from '@/hooks/useStreakDay'
import { TYPE_LESSONS, type TypeLesson as TypeLessonData } from '@/data/typeLearning'
import { useCurriculumLectures, useCompletedLectures, type DbLecture } from '@/data/db/questionStore'
import { FGI_SCHEDULE, FGI_DEMO_SEQ, REVIEW_LABEL, demoLecturesOf, isReviewUnlocked, type ScheduleDay } from '@/data/curriculumSchedule'

/* ── 타입 ── */
type LessonStatus = 'done' | 'current' | 'upcoming' | 'locked'

/* 레슨 학습 노트 — Screen5형 리치 노트 */
interface NoteCompare {
  leftTitle: string; leftFormula: string; leftSub?: string; leftExample: string
  rightTitle: string; rightFormula: string; rightSub?: string; rightExample: string
}
interface NotePoint {
  title: string; desc: string
  examples?: { label: string; text: string }[]
  chip?: string
}
interface StudyNote {
  headline: string
  formula?: string
  compare?: NoteCompare
  checkpoint?: string
  points: NotePoint[]
}
interface Lesson {
  id: string; title: string; status: LessonStatus
  partLabel?: string; href?: string
  note?: StudyNote
}
/* 코스 비법 노트 — 코스 내 전 레슨 완료 시 잠금 해제 */
interface TipSection { label: string; points: string[] }
interface TipNote { category: string; title?: string; summary: string; coach?: string; sections: TipSection[] }

interface CourseData {
  id: number; emoji: string; accentColor: string
  title: string; duration: string; desc: string
  fullyLocked: boolean; lockReason?: string; lessons: Lesson[]
  tipNote?: TipNote
}

/* 뷰어용 평탄화 아이템 */
interface StudyNoteItem { id: string; partLabel: string; lessonTitle: string; note: StudyNote }
interface TipItem { courseId: number; courseTitle: string; tip: TipNote }

/* ── 커리큘럼 ── */
const COURSES: CourseData[] = [
  {
    id: 1, emoji: '', accentColor: '#16A34A',
    title: '문법 기초 다지기', duration: '3주',
    desc: '수동태, 시제, 접속사 — 진단에서 약했던 영역 집중',
    fullyLocked: false,
    lessons: [
      { id: 'l1', title: '수동태 기초 이해', status: 'done', partLabel: 'Part 5', href: '/part5',
        note: {
          headline: '수동태의 기본 형태',
          formula: 'be + p.p. (과거분사)',
          compare: {
            leftTitle: '능동태 (Active Voice)', leftFormula: 'S + V + O', leftSub: '(목적어 명사 필수)',
            leftExample: 'The manager reviewed the marketing budget. (매니저가 마케팅 예산을 검토했다.)',
            rightTitle: '수동태 (Passive Voice)', rightFormula: 'S + be + p.p.', rightSub: '(+ by 행위자)',
            rightExample: 'The marketing budget was reviewed (by the manager). (마케팅 예산이 검토되었다.)',
          },
          checkpoint: '동사 뒤에 목적어(명사)가 사라지고, 전치사구(by …)가 오거나 문장이 끝남.',
          points: [
            { title: '목적어 유무로 태 판별하기', desc: '빈칸 뒤에 목적어(명사)가 있으면 능동태, 없으면 수동태가 정답.',
              examples: [
                { label: '능동', text: 'The board approved the proposal.' },
                { label: '수동', text: 'The proposal was approved (by the board).' },
              ] },
            { title: "전치사 'by'와의 연계", desc: '빈칸 뒤에 by + 사람/부서/기관이 보인다면 수동태일 확률이 압도적으로 높음.',
              examples: [{ label: '예', text: 'The equipment was installed by the maintenance team.' }] },
            { title: '수동태 불가 동사(자동사) 암기', desc: '자동사는 수동태(be + p.p.) 자체가 불가능하므로 보기에서 가장 먼저 제외!',
              chip: 'appear, occur, remain, consist of, belong to, succeed, happen, exist 등' },
          ],
        } },
      { id: 'l2', title: 'be + p.p. 형태 연습', status: 'done', partLabel: 'Part 5', href: '/part5',
        note: {
          headline: '과거분사(p.p.) 만들기',
          formula: 'am / is / are / was / were + p.p.',
          compare: {
            leftTitle: '규칙 변화', leftFormula: '동사원형 + -ed', leftSub: '(대부분의 동사)',
            leftExample: 'review → reviewed, install → installed, complete → completed',
            rightTitle: '불규칙 변화', rightFormula: '형태 암기', rightSub: '(빈출 동사)',
            rightExample: 'write → written, send → sent, build → built, hold → held',
          },
          checkpoint: 'be동사의 시제는 문장 전체 시제에 맞추고, p.p. 형태는 그대로 둔다.',
          points: [
            { title: '규칙 p.p. = 과거형과 동일', desc: '대부분의 동사는 -ed를 붙이면 과거형과 과거분사가 같다.',
              examples: [{ label: '예', text: 'complete → completed → completed' }] },
            { title: '불규칙 p.p. 빈출 암기', desc: '토익에 자주 나오는 불규칙 동사는 통째로 외워야 빠르다.',
              chip: 'written, sent, built, held, made, given, taken, known, chosen' },
            { title: 'be동사로 시제 싣기', desc: 'is/are(현재), was/were(과거)로 시제를 조절하고 p.p.는 고정.',
              examples: [
                { label: '현재', text: 'The form is signed.' },
                { label: '과거', text: 'The form was signed.' },
              ] },
          ],
        } },
      { id: 'l3', title: '수동태 vs 능동태 구별', status: 'current', partLabel: 'Part 5', href: '/part5',
        note: {
          headline: '능동 · 수동 1초 판별법',
          formula: '빈칸 뒤 목적어 유무 확인',
          compare: {
            leftTitle: '능동태 신호', leftFormula: '빈칸 + 명사', leftSub: '뒤에 목적어가 온다',
            leftExample: 'The team ___ the report.  →  completed',
            rightTitle: '수동태 신호', rightFormula: '빈칸 + by / 마침표', rightSub: '목적어가 없다',
            rightExample: 'The report was ___ by the team.  →  completed',
          },
          checkpoint: '빈칸 뒤에 명사가 있으면 능동, 전치사·마침표면 수동.',
          points: [
            { title: '목적어부터 확인', desc: '의미보다 빈칸 바로 뒤 구조를 먼저 본다.',
              examples: [
                { label: '능동', text: 'will announce the results' },
                { label: '수동', text: 'will be announced soon' },
              ] },
            { title: 'by 단서 잡기', desc: '빈칸 뒤 by + 행위자가 보이면 수동 확정에 가깝다.',
              examples: [{ label: '예', text: 'was written by the author' }] },
            { title: '의미로 최종 점검', desc: '주어가 행위를 하는지 / 당하는지로 한 번 더 확인.',
              chip: '주어가 직접 한다 → 능동  /  주어가 당한다 → 수동' },
          ],
        } },
      { id: 'l4', title: '수동태 시제 변화', status: 'upcoming', partLabel: 'Part 5', href: '/part5',
        note: {
          headline: '시제별 수동태 형태',
          formula: 'be의 시제만 바꾸고 p.p.는 고정',
          compare: {
            leftTitle: '완료 수동', leftFormula: 'have/has been + p.p.', leftSub: '(과거 ~ 현재)',
            leftExample: 'The report has been submitted.',
            rightTitle: '미래 수동', rightFormula: 'will be + p.p.', rightSub: '(앞으로)',
            rightExample: 'The results will be announced.',
          },
          checkpoint: '시제 정보는 be(또는 have been, will be)에 싣고 p.p.는 변하지 않는다.',
          points: [
            { title: '현재완료 수동', desc: '과거에 일어나 현재까지 영향을 주는 일.',
              examples: [{ label: '예', text: 'has been approved by the manager' }] },
            { title: '진행 수동', desc: 'be + being + p.p. — 지금 진행 중인 수동.',
              examples: [{ label: '예', text: 'is being upgraded' }] },
            { title: '조동사 수동', desc: '조동사 + be + p.p. — 의무·가능 등을 표현.',
              chip: 'must be purchased, should be completed, can be found' },
          ],
        } },
      { id: 'l5', title: '실전 문제 적용', status: 'locked', partLabel: 'Part 5', href: '/part5',
        note: {
          headline: '수동태 실전 풀이 순서',
          formula: '① 목적어 → ② by → ③ 자동사 → ④ 시제',
          checkpoint: '구조(태)를 먼저 가르고, 시제는 마지막에 맞춘다.',
          points: [
            { title: '1단계 — 자동사 제외', desc: '보기에 자동사가 있으면 수동태 불가이므로 즉시 소거.',
              chip: 'appear, occur, remain, rise, happen, exist' },
            { title: '2단계 — 태 판별', desc: '목적어 유무 + by 단서로 능동/수동을 결정.',
              examples: [
                { label: '능동', text: '___ the budget' },
                { label: '수동', text: 'was ___ by the team' },
              ] },
            { title: '3단계 — 시제 일치', desc: '문장의 시간 표현(yesterday, since, will)에 be 시제를 맞춘다.',
              examples: [{ label: '예', text: 'will be released next week' }] },
          ],
        } },
    ],
    tipNote: {
      category: '수동태',
      title: '수동태 빠른 판별법',
      summary: 'Part 5·6에서 매 회차 2~3문제 출제되는 핵심 문법. 형태 · 태 판별 · 시제를 한 번에 묶어 정리했어요.',
      coach: '수동태는 의미 해석보다 "구조"가 먼저예요. 빈칸 뒤 목적어부터 보면 절반은 풀립니다.',
      sections: [
        { label: '핵심 개념', points: [
          '수동태 = be동사 + p.p. 주어가 동작을 "당하는" 관계일 때 쓴다.',
          '능동태의 목적어가 수동태의 주어로 올라간다. (The board approved it → It was approved.)',
          '행위자는 "by + 명사"로 붙지만 시험 문장에선 대부분 생략된다.',
        ] },
        { label: '시험 풀이 스킬', points: [
          '빈칸 뒤에 목적어(명사)가 있으면 능동, 없으면 수동 — 1초 판별법.',
          '빈칸 뒤 "by + 사람·부서"가 보이면 수동태일 확률이 압도적.',
          '보기에 능동·수동이 섞여 있으면 태부터 가르고, 시제는 그 다음에 본다.',
        ] },
        { label: '자주 나오는 함정', points: [
          '자동사(appear, occur, remain, rise, happen)는 수동태 자체가 불가능 — 보기에서 먼저 제외.',
          'be + -ing(진행)와 be + p.p.(수동)를 형태만 보고 헷갈리지 말 것 — 의미로 구분.',
          '감정동사는 사람 주어면 p.p.(interested), 사물 주어면 -ing(interesting).',
        ] },
        { label: '시제별 형태 & 빈출 예문', points: [
          '현재완료 수동: has/have been + p.p. — "The report has been submitted."',
          '미래 수동: will be + p.p. — "The results will be announced on Friday."',
          '진행 수동: is/are being + p.p. — "The system is being upgraded."',
          '조동사 수동: must/should be + p.p. — "Tickets must be purchased in advance."',
        ] },
      ],
    },
  },
  {
    id: 2, emoji: '', accentColor: '#F59E0B',
    title: '장문 공란 AI 실전', duration: '2주',
    desc: 'Part 6 — AI 강사와 함께 지문 흐름 속 빈칸 채우기',
    fullyLocked: false,
    lessons: [
      { id: 'l_p6_1', title: 'AI 강사와 실전 풀기', status: 'upcoming', partLabel: 'Part 6', href: '/part6' },
      { id: 'l_p6_2', title: '이메일·공지 지문 분석', status: 'locked', partLabel: 'Part 6' },
      { id: 'l_p6_3', title: '문장 삽입 전략 완성', status: 'locked', partLabel: 'Part 6' },
    ],
    tipNote: {
      category: '장문 공란 (Part 6)',
      summary: '빈칸이 문장 하나가 아니라 지문 전체 흐름 속에 있다는 점이 Part 5와의 결정적 차이.',
      coach: '빈칸 하나에 매몰되지 마세요. 지문 전체 흐름을 잡으면 보기가 저절로 좁혀집니다.',
      sections: [
        { label: '풀이 순서', points: [
          '빈칸 앞뒤 한 문장만 보지 말고 지문 전체 주제를 먼저 잡는다.',
          '어휘·문법 빈칸은 그 자리에서, 문장 삽입은 맨 마지막에 푼다.',
        ] },
        { label: '연결어 스킬', points: [
          'however/nevertheless = 앞뒤 대조, therefore/as a result = 인과 관계.',
          'in addition/moreover = 첨가, for example = 예시 — 신호어로 흐름을 추적.',
        ] },
        { label: '문장 삽입 함정', points: [
          '지시어(this, these, such)·연결어가 가리키는 대상이 바로 앞 문장에 있어야 자연스럽다.',
          '대명사가 갑자기 등장하면 그 앞에 사람·사물이 먼저 나와야 한다.',
          '삽입 문장의 시제·단복수가 앞뒤와 어긋나면 오답.',
        ] },
      ],
    },
  },
  {
    id: 3, emoji: '', accentColor: '#2563EB',
    title: '독해 실전 훈련', duration: '4주',
    desc: 'Part 7 — 장문 읽기 이해력 훈련',
    fullyLocked: false,
    lessons: [
      { id: 'l_p7_ai', title: 'AI 튜터와 함께 풀기', status: 'upcoming', partLabel: 'Part 7', href: '/part7-ai' },
      { id: 'l6', title: '장문 독해 — 단일지문', status: 'upcoming', partLabel: 'Part 7', href: '/part7' },
      { id: 'l_p7_convai', title: '일레븐랩스 에이전트 테스트', status: 'upcoming', partLabel: 'Part 7', href: '/part7-convai' },
      { id: 'l_p7_typecast', title: '타입캐스트 에이전트 테스트', status: 'upcoming', partLabel: 'Part 7', href: '/part7-typecast' },
      { id: 'l_p7_vertex', title: 'Vertex AI 에이전트 테스트', status: 'upcoming', partLabel: 'Part 7', href: '/part7-vertex' },
      { id: 'l_p7_vertex_convai', title: 'Vertex AI 음성 대화 테스트', status: 'upcoming', partLabel: 'Part 7', href: '/part7-vertex-convai' },
      { id: 'l7', title: 'Why 문제 풀이 전략', status: 'locked', partLabel: 'Part 7' },
      { id: 'l8', title: '추론 독해 완성', status: 'locked', partLabel: 'Part 7' },
      { id: 'l9', title: '복수지문 분석', status: 'locked', partLabel: 'Part 7' },
    ],
    tipNote: {
      category: '독해 전략 (Part 7)',
      summary: '시간 싸움. 지문을 전부 읽지 않고 질문이 묻는 곳만 빠르게 찾는 게 핵심이에요.',
      coach: '모든 문장을 읽으려 하지 마세요. 질문이 가리키는 곳만 정확히 찾는 게 고득점의 시작이에요.',
      sections: [
        { label: '시간 관리', points: [
          '질문을 먼저 읽고 키워드를 잡은 뒤 지문에서 위치를 스캔한다.',
          '한 지문에 너무 오래 머물지 말 것 — 막히면 표시하고 넘어간다.',
        ] },
        { label: '문제 유형별 스킬', points: [
          '주제·목적 문제는 첫 문단과 제목에 답이 있다.',
          'NOT/EXCEPT 문제는 보기를 지문과 하나씩 대조해 소거.',
          '추론(infer/suggest) 문제는 지문에 직접 쓰인 근거에서만 출발 — 상상 금지.',
          '동의어(meaning) 문제는 반드시 문맥에 넣어 확인.',
        ] },
        { label: '복수지문(연계) 팁', points: [
          '두 지문을 오가야 답이 나오는 연계 문제가 1~2개 숨어 있다.',
          '이메일+공지, 일정표+변경안내 조합이 단골 패턴.',
        ] },
      ],
    },
  },
  {
    id: 4, emoji: '', accentColor: '#7C3AED',
    title: '스피킹 도전', duration: '2주',
    desc: 'TOEIC Speaking — 사진 묘사부터 즉흥 말하기까지',
    fullyLocked: false,
    lessons: [
      { id: 'l10', title: '사진 묘사 30초 말하기', status: 'upcoming', partLabel: 'Speaking', href: '/speaking' },
      { id: 'l11', title: '인물·사물·배경 묘사 순서', status: 'locked', partLabel: 'Speaking' },
      { id: 'l12', title: '30초 즉흥 말하기 연습', status: 'locked', partLabel: 'Speaking' },
    ],
    tipNote: {
      category: '스피킹',
      summary: '사진 묘사부터 즉흥 말하기까지, 템플릿을 외워두면 시험장에서 당황하지 않아요.',
      coach: '완벽한 문장보다 끊기지 않는 흐름이 점수예요. 일단 입을 떼고 템플릿으로 채우세요.',
      sections: [
        { label: '사진 묘사 순서', points: [
          '전체 장소·상황 → 중심 인물 → 사물·배경 순으로 묘사한다.',
          '동작은 현재진행형(is + -ing)으로 표현.',
        ] },
        { label: '유용한 표현', points: [
          '확신이 없을 때: "It seems that…", "It looks like…"',
          '위치 표현: in the foreground/background, on the left/right.',
        ] },
        { label: '감점 줄이기', points: [
          '발음보다 끊김 없이 말하는 유창성이 점수에 더 크게 작용한다.',
          '모르는 단어에 멈추지 말고 아는 단어로 돌려 말하기.',
        ] },
      ],
    },
  },
  {
    id: 5, emoji: '', accentColor: '#6B7280',
    title: '실전 감각 만들기', duration: '5주',
    desc: '시간 내 풀기, 오답 패턴 분석',
    fullyLocked: true, lockReason: 'Book 1·2·3·4 완료 후 해제', lessons: [],
  },
]

/* 코스 완료 여부 — 비법 노트 잠금 해제 기준 */
const isCourseComplete = (c: CourseData) =>
  c.lessons.length > 0 && c.lessons.every(l => l.status === 'done')

/* ── 네비게이션 ── */
const NAV = [
  { label: '홈',      href: '/dashboard',  active: false },
  { label: '내 학습', href: '/lessons',     active: true },
  { label: '현황',    href: '/status',     active: false },
  { label: '자율학습', href: '/my-learning', active: false },
]
const NAV_ICONS = [
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill={a?'#2563EB':'none'} stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
]

function Sidebar() {
  const [open, setOpen] = useState(false)
  return (
    <aside className={`hidden md:flex flex-col bg-[#F8FAFF] border-r border-[#DBEAFE] h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 overflow-hidden ${open ? 'w-[240px]' : 'w-[56px]'}`}>
      <div className={`flex items-center min-h-[60px] shrink-0 ${open ? 'px-5 justify-between' : 'justify-center'}`}>
        {open && (
          <Link href="/dashboard" className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[10px] tracking-tight">YBM</span>
            </div>
            <span className="text-[#1C1B33] font-bold text-[15px]">AI Course</span>
          </Link>
        )}
        <button onClick={() => setOpen(!open)} className="w-7 h-7 rounded-lg bg-[#DBEAFE] flex items-center justify-center transition-all shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>
      <nav className={`flex-1 space-y-0.5 ${open ? 'px-3' : 'px-2'}`}>
        {NAV.map((item, i) => {
          const cls = `w-full flex items-center rounded-xl text-[13px] font-medium transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${item.active ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]'}`
          return (
            <Link key={item.label} href={item.href} className={cls}>
              <span className="shrink-0">{NAV_ICONS[i](item.active)}</span>
              {open && <span className="animate-fade-in">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      <div className={`${open ? 'px-3' : 'px-2'} mb-3`}>
        <div className="mb-2 h-px bg-[#DBEAFE]" />
        <Link href="/settings/account" className={`w-full flex items-center rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {open && <span className="animate-fade-in">설정</span>}
        </Link>
      </div>
    </aside>
  )
}

function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#DBEAFE] flex items-center justify-around px-2 pt-2 pb-6 z-50">
      {NAV.slice(0, 4).map((item, i) => (
        <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 min-w-[52px] py-1 ${item.active ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>
          {NAV_ICONS[i](item.active)}
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
      <Link href="/settings/account" className="flex flex-col items-center gap-1 min-w-[52px] py-1 text-[#9CA3AF]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span className="text-[10px] font-medium">설정</span>
      </Link>
    </nav>
  )
}

/* ── 리치 학습 노트 카드 (Screen5 디자인) ── */
function RichNoteCard({ note, partLabel, lessonTitle }: { note: StudyNote; partLabel: string; lessonTitle: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#EEF2F7] bg-[#F7FAFF]">
        <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5"/><path d="M5 5h6M5 8h6M5 11h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-[#94A3B8] font-semibold truncate">{partLabel} · {lessonTitle}</p>
          <h2 className="text-[17px] font-bold text-[#2563EB] leading-tight">{note.headline}</h2>
        </div>
      </div>

      <div className="p-4 md:p-5 flex flex-col gap-4">
        {/* 공식 */}
        {note.formula && (
          <div className="bg-[#EEF4FF] border border-[#DBEAFE] rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-[11px] font-bold text-white bg-[#2563EB] px-2 py-1 rounded-md shrink-0">공식</span>
            <span className="text-[15px] font-bold font-mono text-[#1C1B33]">{note.formula}</span>
          </div>
        )}

        {/* 능동 / 수동 비교표 */}
        {note.compare && (
          <div className="rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="grid grid-cols-2">
              <div className="p-3.5 bg-[#F4F6FB] border-r border-[#E5E7EB]">
                <p className="text-[12px] font-bold text-[#475569] text-center mb-2">{note.compare.leftTitle}</p>
                <p className="text-[14px] font-mono font-semibold text-center text-[#1C1B33]">{note.compare.leftFormula}</p>
                {note.compare.leftSub && <p className="text-[11px] text-[#94A3B8] text-center mt-1">{note.compare.leftSub}</p>}
              </div>
              <div className="p-3.5 bg-[#F0FBF4]">
                <p className="text-[12px] font-bold text-[#059669] text-center mb-2">{note.compare.rightTitle}</p>
                <p className="text-[14px] font-mono font-semibold text-center text-[#1C1B33]">{note.compare.rightFormula}</p>
                {note.compare.rightSub && <p className="text-[11px] text-[#10B981] text-center mt-1">{note.compare.rightSub}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-[#E5E7EB]">
              <div className="p-3 text-[12px] text-[#475569] leading-relaxed border-r border-[#E5E7EB]">{note.compare.leftExample}</div>
              <div className="p-3 text-[12px] text-[#047857] leading-relaxed">{note.compare.rightExample}</div>
            </div>
          </div>
        )}

        {/* Check Point */}
        {note.checkpoint && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 flex items-start gap-2.5">
            <span className="text-[10px] font-bold text-white bg-[#16A34A] px-2 py-0.5 rounded-md shrink-0 mt-0.5 whitespace-nowrap">Check point</span>
            <p className="text-[13px] text-[#713F12] leading-relaxed flex-1">{note.checkpoint}</p>
          </div>
        )}

        {/* 토익 빈출 포인트 */}
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFDF5] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#FDE68A] flex items-center gap-2 flex-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>
            <p className="text-[13px] font-bold text-[#B45309]">토익 빈출 포인트</p>
            <span className="text-[10px] text-[#D97706]">토익에서는 이렇게 출제됩니다!</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#FDE68A]">
            {note.points.map((pt, i) => (
              <div key={i} className="p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#D97706] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-[13px] font-bold text-[#1C1B33]">{pt.title}</p>
                </div>
                <p className="text-[12px] text-[#64748B] leading-relaxed mb-2">{pt.desc}</p>
                {pt.examples && (
                  <div className="space-y-1.5">
                    {pt.examples.map((ex, j) => (
                      <div key={j} className="flex items-start gap-1.5">
                        <span className="text-[10px] font-bold text-[#94A3B8] bg-[#F1F5F9] px-1.5 py-0.5 rounded shrink-0">{ex.label}</span>
                        <span className="text-[11px] font-mono text-[#334155] leading-relaxed">{ex.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {pt.chip && (
                  <p className="mt-1.5 text-[11px] font-mono text-[#475569] bg-[#F1F5F9] rounded-lg px-2.5 py-1.5 leading-relaxed">{pt.chip}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 비법 노트 카드 (AI 강사 프리미엄/스킬 톤) ── */
function TipSkillCard({ tip, courseTitle }: { tip: TipNote; courseTitle: string }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#FDE68A] shadow-sm">
      {/* 헤더 — 라이트 앰버 */}
      <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-5 py-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-10 w-36 h-36 bg-[#F59E0B]/10 rounded-full" />
        <div className="flex items-center gap-2 mb-3 relative z-10">
          <span className="text-[10px] font-black tracking-[0.12em] text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-1 rounded-md">AI 강사 비법</span>
          <span className="text-[11px] text-[#9CA3AF] truncate">{courseTitle}</span>
        </div>
        <h2 className="text-[20px] font-bold leading-snug text-[#1C1B33] relative z-10">{tip.category} 만점 공략</h2>
        <p className="text-[12px] text-[#6B7280] mt-2 leading-relaxed relative z-10">{tip.summary}</p>
        {tip.coach && (
          <div className="mt-4 flex items-start gap-2.5 bg-white border border-[#FDE68A] rounded-xl p-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-[#F59E0B] flex items-center justify-center text-[15px] shrink-0">🎯</div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-[#B45309] mb-0.5">강사의 한마디</p>
              <p className="text-[12px] text-[#374151] leading-relaxed">{tip.coach}</p>
            </div>
          </div>
        )}
      </div>
      {/* 섹션 — 스킬 카드 */}
      <div className="bg-white p-4 flex flex-col gap-3">
        {tip.sections.map((sec, si) => (
          <div key={si} className="rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F8FAFF] border-b border-[#EEF2F7]">
              <span className="w-5 h-5 rounded-md bg-[#F59E0B] text-white text-[11px] font-black flex items-center justify-center shrink-0">{si + 1}</span>
              <p className="text-[13px] font-bold text-[#1C1B33]">{sec.label}</p>
            </div>
            <div className="p-3.5 space-y-2.5">
              {sec.points.map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B" className="shrink-0 mt-1"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>
                  <p className="text-[13px] text-[#374151] leading-relaxed flex-1">{pt}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 노트 뷰어 (풀스크린 스와이프 캐러셀 + PDF) ── */
function NoteViewer({ kind, startIndex, studyNotes, tipNotes, autoPrint, onClose }: {
  kind: 'study' | 'tip'
  startIndex: number
  studyNotes: StudyNoteItem[]
  tipNotes: TipItem[]
  autoPrint?: boolean
  onClose: () => void
}) {
  const pages = kind === 'study' ? studyNotes.length : tipNotes.length
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), pages - 1))
  const startX = useRef<number | null>(null)
  const go = (d: number) => setIndex(i => Math.min(pages - 1, Math.max(0, i + d)))
  const title = kind === 'study' ? '학습 노트' : 'AI 강사 비법 노트'

  useEffect(() => {
    if (autoPrint && pages > 0) {
      const t = setTimeout(() => window.print(), 350)
      return () => clearTimeout(t)
    }
  }, [autoPrint, pages])

  return (
    <div className="fixed inset-0 z-[120] bg-[#0E1525] flex flex-col print:static print:bg-white print:block">

      {/* 화면용 인터랙티브 뷰 */}
      <div className="flex-1 flex flex-col min-h-0 print:hidden">
        {/* 상단 바 */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
          <button onClick={onClose} className="flex items-center gap-1.5 text-white/80 hover:text-white text-[13px] font-semibold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            닫기
          </button>
          <div className="flex items-center gap-2 text-white">
            <span className="text-[13px] font-bold">{title}</span>
            <span className="text-[12px] text-white/50">{index + 1} / {pages}</span>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 text-[12px] font-bold text-[#1C1B33] bg-white hover:bg-white/90 px-3 py-1.5 rounded-lg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            PDF
          </button>
        </div>

        {/* 캐러셀 */}
        <div
          className="flex-1 overflow-hidden relative"
          onTouchStart={(e) => { startX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (startX.current == null) return
            const dx = e.changedTouches[0].clientX - startX.current
            if (dx < -50) go(1)
            else if (dx > 50) go(-1)
            startX.current = null
          }}
        >
          <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
            {kind === 'study'
              ? studyNotes.map((it, i) => (
                  <div key={i} className="w-full shrink-0 h-full overflow-y-auto px-4 py-5">
                    <div className="max-w-[640px] mx-auto pb-10">
                      <RichNoteCard note={it.note} partLabel={it.partLabel} lessonTitle={it.lessonTitle} />
                    </div>
                  </div>
                ))
              : tipNotes.map((it, i) => (
                  <div key={i} className="w-full shrink-0 h-full overflow-y-auto px-4 py-5">
                    <div className="max-w-[640px] mx-auto pb-10">
                      <TipSkillCard tip={it.tip} courseTitle={it.courseTitle} />
                    </div>
                  </div>
                ))}
          </div>

          {/* 좌우 화살표 (데스크탑) */}
          {index > 0 && (
            <button onClick={() => go(-1)} className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white items-center justify-center shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1B33" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          {index < pages - 1 && (
            <button onClick={() => go(1)} className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white items-center justify-center shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1B33" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}
        </div>

        {/* 하단 점 인디케이터 */}
        <div className="shrink-0 flex items-center justify-center gap-1.5 py-3.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/35'}`} />
          ))}
        </div>
      </div>

      {/* 인쇄용 (현재 노트만) */}
      <div className="hidden print:block p-6">
        {kind === 'study' && studyNotes[index] && (
          <RichNoteCard note={studyNotes[index].note} partLabel={studyNotes[index].partLabel} lessonTitle={studyNotes[index].lessonTitle} />
        )}
        {kind === 'tip' && tipNotes[index] && (
          <TipSkillCard tip={tipNotes[index].tip} courseTitle={tipNotes[index].courseTitle} />
        )}
      </div>
    </div>
  )
}

/* ── 코스 섹션 ── */
function CourseSection({ course, onOpenStudy, onOpenTip, labelPrefix = 'Book', collapsible, defaultOpen = true }: {
  course: CourseData
  onOpenStudy: (lessonId: string) => void
  onOpenTip: (courseId: number) => void
  labelPrefix?: string
  /* 헤더를 눌러 접었다 펼 수 있게 한다. '기존 콘텐츠'(구버전 아카이브)처럼
     늘 펼쳐 둘 이유가 없는 섹션에만 켠다. */
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(collapsible ? defaultOpen : true)
  // labelPrefix가 있으면 "Part 5 · 제목", 없으면 제목만 ("기존 콘텐츠")
  const heading = labelPrefix ? `${labelPrefix} ${course.id} · ${course.title}` : course.title
  // 접을 수 있으면 헤더 전체가 토글 버튼, 아니면 그냥 상자
  const Header = collapsible ? 'button' : 'div'
  const headerProps = collapsible ? { type: 'button' as const, onClick: () => setOpen(o => !o) } : {}

  if (course.fullyLocked) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#C4C9D4]">{heading}</p>
            <p className="text-[11px] text-[#D1D5DB] mt-0.5">{course.desc}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {course.lockReason && <span className="text-[10px] text-[#D1D5DB]">0개</span>}
            <div className="w-7 h-7 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
          </div>
        </div>
        {course.lockReason && (
          <p className="text-[10px] text-[#E5E7EB] mt-2.5 text-center bg-[#F9FAFB] rounded-lg py-1.5">{course.lockReason}</p>
        )}
      </div>
    )
  }

  const doneCount = course.lessons.filter(l => l.status === 'done').length
  const complete  = isCourseComplete(course)

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-[0_1px_10px_rgba(0,0,0,0.06)]">

      {/* 코스 헤더 */}
      <Header
        {...headerProps}
        className={`w-full text-left px-4 pt-4 pb-3 ${open ? 'border-b border-[#F3F4F6]' : ''} ${collapsible ? 'hover:bg-[#FAFBFF] transition-colors' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="text-[#1C1B33] font-bold text-[14px]">{heading}</p>
            </div>
            <p className="text-[#9CA3AF] text-[12px]">{course.desc}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2 pl-2">
            <div className="text-right">
              <p className="text-[13px] font-black text-[#2563EB]">{doneCount} / {course.lessons.length}</p>
              <p className="text-[10px] text-[#D1D5DB] font-medium">완료</p>
            </div>
            {collapsible && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            )}
          </div>
        </div>
      </Header>

      {/* 강의 타임라인 */}
      <div className={`relative px-4 py-2 ${open ? '' : 'hidden'}`}>
        <div className="absolute left-[28px] top-0 bottom-0 w-px bg-[#F0F0F0]" />

        {course.lessons.map((lesson) => {
          /* 완료 */
          if (lesson.status === 'done') return (
            <div key={lesson.id} className="relative flex items-center gap-3 py-2.5">
              <div className="relative z-10 w-5 h-5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="text-[13px] text-[#C4C9D4] line-through flex-1 min-w-0 truncate">{lesson.title}</span>
              {lesson.note && (
                <button
                  onClick={() => onOpenStudy(lesson.id)}
                  className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-1 rounded-md hover:bg-[#DBEAFE] transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  노트 보기
                </button>
              )}
              {lesson.partLabel && <span className="text-[10px] bg-[#F9FAFB] text-[#D1D5DB] px-1.5 py-0.5 rounded-md shrink-0">{lesson.partLabel}</span>}
            </div>
          )

          /* 오늘의 수업 */
          if (lesson.status === 'current') return (
            <div key={lesson.id} className="relative my-2.5 -mx-1">
              <div className="rounded-2xl overflow-hidden border border-[#C7D2FE] shadow-[0_4px_20px_rgba(37,99,235,0.16)]">
                <div className="bg-white px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-[#2563EB] shrink-0">
                        ▶ 오늘의 수업
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] shrink-0">
                         지금 여기
                      </span>
                    </div>
                    {lesson.partLabel && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] shrink-0">{lesson.partLabel}</span>
                    )}
                  </div>
                  <p className="text-[#1C1B33] font-bold text-[15px]">{lesson.title}</p>
                </div>
                <button
                  onClick={() => lesson.href && router.push(lesson.href)}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] py-3 font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  시작하기
                </button>
              </div>
            </div>
          )

          /* 미시작 (접근 가능) */
          if (lesson.status === 'upcoming') return (
            <button
              key={lesson.id}
              onClick={() => lesson.href && router.push(lesson.href)}
              className="relative w-full flex items-center gap-3 py-2.5 text-left group"
            >
              <div className="relative z-10 w-5 h-5 rounded-full border-2 border-[#D1D5DB] bg-white flex items-center justify-center shrink-0 group-hover:border-[#6B7280] transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] group-hover:bg-[#6B7280] transition-colors" />
              </div>
              <span className="text-[13px] text-[#374151] flex-1 min-w-0 truncate group-hover:text-[#1C1B33] transition-colors">{lesson.title}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 group-hover:stroke-[#9CA3AF] transition-colors"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )

          /* 잠금 */
          return (
            <div key={lesson.id} className="relative flex items-center gap-3 py-2.5 opacity-30">
              <div className="relative z-10 w-5 h-5 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <span className="text-[13px] text-[#6B7280] flex-1 min-w-0 truncate">{lesson.title}</span>
              {lesson.partLabel && <span className="text-[10px] bg-[#F3F4F6] text-[#9CA3AF] px-1.5 py-0.5 rounded-md shrink-0">{lesson.partLabel}</span>}
            </div>
          )
        })}
      </div>

      {/* Book 비법 노트 — 전 레슨 완료 시 해제 */}
      {course.tipNote && open && (
        <div className="px-4 pb-4 pt-1">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" className="shrink-0">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <p className="text-[13px] font-bold text-[#1C1B33]">강사의 비법 노트</p>
              <span className="text-[11px] text-[#9CA3AF]">
                {complete ? `비법 노트 ${course.tipNote.sections.length}개가 열렸어요` : '이번 Book을 완료하면 비법 노트가 열려요'}
              </span>
            </div>
            {complete ? (
              <button
                onClick={() => onOpenTip(course.id)}
                className="w-full flex items-center gap-2.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-left hover:bg-[#FEF3C7] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B" className="shrink-0"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>
                <span className="text-[12px] font-bold text-[#1C1B33] flex-1 min-w-0 truncate">{course.tipNote.title ?? course.tipNote.category}</span>
                <span className="text-[11px] font-bold text-[#B45309] shrink-0">열람하기</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" className="shrink-0"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ) : (
              <div className="w-full flex items-center gap-2.5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" className="shrink-0"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span className="text-[12px] font-semibold text-[#6B7280] flex-1 min-w-0 truncate">{course.tipNote.title ?? course.tipNote.category}</span>
                <span className="text-[11px] text-[#9CA3AF] shrink-0">완료 시 해제</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 문항 유형 그리드 (캐치잇 소통용) ──
   콘텐츠팀이 정의한 15유형("문항 유형(0703)" 시트) 그대로 보여준다.
   목적은 학습이 아니라 **"문제 유형에 따라 화면이 어떻게 바뀌는지"를 보여주는 것** —
   사진이 있는지, 듣기인지, 지문이 몇 개인지, 표가 붙는지.

   예전에는 카드가 /type-lesson 샘플 화면으로 갔는데, 그 화면은 07-21 결정으로 격하됐고
   지금은 제거했다. **대표 강의를 골라 정본(/lecture)으로 보낸다** — 캐치잇이 보는 화면이
   실제 학습 화면과 같아야 소통이 된다.
   문항이 아직 없는 유형은 '문항 준비 중'으로 잠긴다(그 자체가 진행 현황이 된다). */
/* 대표 강의는 **그 강의의 수업 세트**가 유형과 같은 것으로 고른다.
   카드를 누르면 수업으로 들어가므로, 실전 세트만 그 유형인 강의를 걸면 화면이 딴 걸 보여준다. */
const TYPE_LECTURE: Record<string, string> = {
  t01: 'LC-P1-01',   // 사진 묘사
  t02: 'LC-P2-01',   // 질의응답
  t03: 'LC-P3-01',   // 대화
  t04: 'LC-P3-05',   // 대화 + 시각자료(표)
  t05: 'LC-P4-02',   // 담화 일반형 — 전화 메시지 (P4-01 수업은 시각자료형이라 t06 이 쓴다)
  t07: 'RC-P5-08',   // 단문 빈칸
  t08: 'RC-P6-01',   // 장문 빈칸
  t09: 'RC-P7-01',   // 1지문 일반형 — 이메일 지문(유형 설명과 같다. 예전엔 광고 강의를 걸었었다)
  t10: 'RC-P7-06',   // 1지문 표/자료형 — 예약 확인서(양식)
  t11: 'RC-P7-05',   // 1지문 대화형 — 문자 대화
  t06: 'LC-P4-01',   // 담화 표/자료형 — 안내 담화 + 워크숍 일정표
  t12: 'RC-P7-07',   // 2지문 일반형 — 공지 + 이메일
  t15: 'RC-P7-08',   // 3지문 표/자료형 — 이메일 + 버스 시간표 + 공지
}

/* 강의 하나가 수업/실전에 **서로 다른 지문 변종**을 담는 경우가 있다.
   이중·삼중은 커리큘럼에 강의가 하나씩뿐이라(RC-P7-07·08) 일반형과 표형이 한 강의 안에 산다.
   그 변종을 보여주려면 실전 세트로 바로 들어가야 한다 → `?stage=practice`. */
const TYPE_PRACTICE: Record<string, string> = {
  t13: 'RC-P7-07',   // 2지문 표/자료형 — 실전 세트가 이메일 + 일정표
  t14: 'RC-P7-08',   // 3지문 일반형   — 실전 세트가 기사 + 이메일 + 평면도
}

/* 아직 대표 강의가 없는 유형 — **왜 없는지**를 카드에 적는다.
   이 그리드는 캐치잇에게 "화면이 유형마다 어떻게 다른가"를 보여주는 자리이고,
   빈 칸이 곧 콘텐츠 진행 현황이라 이유까지 보여야 다음에 뭘 넣을지가 읽힌다. */
const TYPE_PENDING: Record<string, string> = {}

function TypeCard({ t, lecture }: { t: TypeLessonData; lecture?: DbLecture }) {
  const router = useRouter()
  const lc = t.area === 'LC'
  const playable = !!lecture && lecture.questionCount > 0
  const viaPractice = !!TYPE_PRACTICE[t.id]
  return (
    <button
      disabled={!playable}
      onClick={() => playable && router.push(`/lecture/${lecture!.code}${viaPractice ? '?stage=practice' : ''}`)}
      className={`group text-left bg-white rounded-2xl border p-4 transition-all ${
        playable
          ? 'border-[#E5E7EB] hover:border-[#2563EB] hover:shadow-[0_4px_20px_rgba(37,99,235,0.12)] active:scale-[0.99]'
          : 'border-[#F1F3F7] opacity-60 cursor-default'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${lc ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F0FDF4] text-[#16A34A]'}`}>
          Part {t.part}
        </span>
        <span className="text-[10px] font-semibold text-[#9CA3AF] bg-[#F9FAFB] px-2 py-0.5 rounded-md truncate">{t.typeLabel}</span>
        {playable && (
          <span className="text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded-md ml-auto shrink-0">
            {lecture!.questionCount}문항
          </span>
        )}
      </div>
      <p className={`text-[14px] font-bold mb-1 transition-colors ${playable ? 'text-[#1C1B33] group-hover:text-[#2563EB]' : 'text-[#9CA3AF]'}`}>{t.title}</p>
      <p className="text-[12px] text-[#6B7280] leading-relaxed line-clamp-2 mb-3">{t.desc}</p>
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${playable ? 'text-[#2563EB]' : 'text-[#C4C9D4]'}`}>
        {playable
          ? `${lecture!.code} ${viaPractice ? '실전 세트로 보기' : '로 보기'}`
          : `문항 준비 중${TYPE_PENDING[t.id] ? ` · ${TYPE_PENDING[t.id]}` : ''}`}
        {playable && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M9 18l6-6-6-6"/></svg>
        )}
      </span>
    </button>
  )
}

/* ── 커리큘럼 강의 그리드 (내 학습의 정본 축) ──
   lectures 테이블(정규 42강 + 데모)을 파트별로 나열. 문항 있는 강의만 플레이 가능(→ /lecture/[code]).
   문항 수(questionCount)만으로 가른다 — 파트 제한은 위 PLAYABLE_PARTS 로 뺐다. */
const PART_NAME: Record<number, string> = {
  1: '사진 묘사', 2: '질의·응답', 3: '짧은 대화', 4: '짧은 담화',
  5: '단문 빈칸', 6: '장문 빈칸', 7: '독해',
}
const PART_DESC: Record<number, string> = {
  1: '사진 속 인물·사물을 알맞게 묘사한 문장 고르기',
  2: '질문과 평서문에 어울리는 응답 고르기',
  3: '두 사람의 대화를 듣고 3문항 풀기',
  4: '한 사람의 담화를 듣고 3문항 풀기',
  5: '문장 빈칸에 맞는 문법·어휘 고르기',
  6: '지문 흐름을 따라 빈칸 4개 채우기',
  7: '단일·복수 지문을 읽고 정보 찾기',
}
/* 문항이 들어 있고 화면이 도는 파트. LC(2·3·4)는 화면 형판이 없어 막아뒀었는데,
   2026-07-28 에 LC 화면을 붙이고 교재 문항까지 넣어서 열었다. */
const PLAYABLE_PARTS = new Set([1, 2, 3, 4, 5, 6, 7])

/* 실전 최소 3문제 원칙 — 1~2문항짜리 placeholder는 누르면 깨지므로 "준비 중"으로.
   실제 강의는 모두 4문항 이상(수업+실전 3). questionCount는 전체 문항 수. */
const MIN_PLAYABLE = 4

const isPlayable = (l: DbLecture) => l.questionCount >= MIN_PLAYABLE && PLAYABLE_PARTS.has(l.part)

/* DB 제목은 "LC1강 — 인물 중심 vs 사물·상태 중심 …" 꼴이다.
   한 줄짜리 타임라인에 통째로 넣으면 번호 때문에 제목이 잘린다 → 번호를 칩으로 떼어낸다. */
function splitTitle(title: string): { no: string | null; name: string } {
  const m = /^([A-Za-z]*\d+강)\s*[—–-]\s*(.+)$/.exec(title)
  return m ? { no: m[1], name: m[2] } : { no: null, name: title }
}

/* ── 하루 = 카드 하나 ──
   커리큘럼을 파트별로 세우면 "오늘 뭘 하면 되는지"가 화면에 없다. 학습자가 여는 단위는 파트가
   아니라 **하루**다 — 강의 셋을 듣고 복습 하나로 닫는다. 그래서 카드의 단위를 Day 로 바꾼다.
   파트별로 세우던 PartSection 은 지웠다. 두 보기를 다 두면 어느 쪽이 정본인지 흐려진다. */
function DaySection({ day, bySeq, doneSeq }: {
  day: ScheduleDay; bySeq: Map<number, DbLecture>; doneSeq: Set<number>
}) {
  const router = useRouter()
  const items = day.lectures.map((seq) => ({ seq, lec: bySeq.get(seq) }))
  const ready = items.filter((i) => i.lec && isPlayable(i.lec)).length
  const reviewOpen = isReviewUnlocked(day, doneSeq)

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-[0_1px_10px_rgba(0,0,0,0.06)]">

      {/* 하루 머리 — Day 가 제일 크다. 주차는 그 옆에 작게 */}
      <div className="px-4 pt-4 pb-3 border-b border-[#F3F4F6] flex items-center gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-[#EFF6FF] flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold text-[#93C5FD] leading-none">DAY</span>
          <span className="text-[15px] font-black text-[#2563EB] leading-none mt-0.5">{day.day}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#1C1B33] font-bold text-[14px]">{day.week}주차 · {day.day}일차</p>
          {/* 하루가 무엇으로 이뤄지는지 한 줄 — 매일 같은 모양이라 한 번 읽으면 그만이다 */}
          <p className="text-[#9CA3AF] text-[12px]">강의 3개 + 복습 1개</p>
        </div>
        <div className="shrink-0 text-right pl-2">
          <p className="text-[13px] font-black text-[#2563EB]">{ready} / {items.length}</p>
          <p className="text-[10px] text-[#D1D5DB] font-medium">수강 가능</p>
        </div>
      </div>

      <div className="relative px-4 py-2">
        <div className="absolute left-[28px] top-0 bottom-0 w-px bg-[#F0F0F0]" />

        {items.map(({ seq, lec }) => {
          /* 시간표에는 있는데 DB 에 아직 없는 강의 — 콘텐츠가 덜 들어온 상태다 */
          if (!lec) return (
            <div key={seq} className="relative flex items-center gap-3 py-2.5 opacity-40">
              <div className="relative z-10 w-5 h-5 rounded-full bg-[#F3F4F6] shrink-0" />
              <span className="text-[13px] text-[#6B7280] flex-1 min-w-0 truncate">{seq}강</span>
              <span className="text-[10px] font-semibold text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded-md shrink-0">준비 중</span>
            </div>
          )

          const { name } = splitTitle(lec.title)
          const lc = lec.lcRc === 'LC'

          /* ── 오늘의 수업 — 목록 안에서 그 줄만 카드로 부푼다 ──
             위에 따로 빼지 않는다. 빼면 같은 강의가 화면에 두 번 나오고, 목록에서 그게 어느 날
             무엇 다음인지가 사라진다. 아래 '기존 콘텐츠'(CourseSection)가 쓰는 방식과 같다 —
             줄 하나가 그 자리에서 커지고 시작 버튼을 단다. */
          if (FGI_DEMO_SEQ.has(seq) && isPlayable(lec)) {
            const done = doneSeq.has(seq)
            return (
              <div key={lec.code} className="relative my-2.5 -mx-1">
                <div className="rounded-2xl overflow-hidden border border-[#C7D2FE] shadow-[0_4px_20px_rgba(37,99,235,0.16)]">
                  <div className="bg-white px-4 pt-4 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-[#2563EB] shrink-0">
                          ▶ 오늘의 수업
                        </span>
                        {/* 한 번 들은 뒤에도 자리는 그대로다 — 시연 중 되돌아갈 길이 사라지면 안 된다 */}
                        {done && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] shrink-0">수강 완료</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                        lc ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F0FDF4] text-[#16A34A]'
                      }`}>Part {lec.part}</span>
                    </div>
                    <p className="text-[#1C1B33] font-bold text-[15px] leading-snug">{name}</p>
                  </div>
                  <button onClick={() => router.push(`/lecture/${lec.code}`)}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] py-3 font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.99]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    {done ? '다시 듣기' : '시작하기'}
                  </button>
                </div>
              </div>
            )
          }

          /* 하루 안에 LC·RC 가 섞여 있다 → 파트 칩을 줄마다 둔다. 파트별 보기에서는 헤더가
             그 일을 해서 필요 없었지만, 여기서는 줄마다 파트가 다르다. */
          const partChip = (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
              lc ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F0FDF4] text-[#16A34A]'
            }`}>P{lec.part}</span>
          )

          if (isPlayable(lec)) return (
            <button key={lec.code} onClick={() => router.push(`/lecture/${lec.code}`)}
              className="relative w-full flex items-center gap-2.5 py-2.5 text-left group">
              <div className="relative z-10 w-5 h-5 rounded-full border-2 border-[#D1D5DB] bg-white flex items-center justify-center shrink-0 group-hover:border-[#2563EB] transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] group-hover:bg-[#2563EB] transition-colors" />
              </div>
              {partChip}
              <span className="text-[13px] text-[#374151] flex-1 min-w-0 truncate group-hover:text-[#2563EB] transition-colors">{name}</span>
              <span className="text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] px-1.5 py-0.5 rounded-md shrink-0">{lec.questionCount}문항</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 group-hover:stroke-[#2563EB] transition-colors"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )

          return (
            <div key={lec.code} className="relative flex items-center gap-2.5 py-2.5 opacity-40">
              <div className="relative z-10 w-5 h-5 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              {partChip}
              <span className="text-[13px] text-[#6B7280] flex-1 min-w-0 truncate">{name}</span>
              <span className="text-[10px] font-semibold text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded-md shrink-0">준비 중</span>
            </div>
          )
        })}

        {/* ── 복습 — 하루를 닫는 자리 ──
            강의가 아니라 세션이다. 그날 강의에서 틀린 유형으로 새 문제를 낸다.
            잠겨 있을 때도 **자리는 보인다** — 하루가 강의 셋으로 끝나는 게 아니라는 걸
            화면이 먼저 말해줘야 한다.
            색은 열렸을 때만 쓴다. 못 누르는 줄에 색을 주면 어디를 봐야 할지 흐려진다. */}
        <div className={`relative flex items-center gap-2.5 py-2.5 border-t border-dashed mt-1 ${
          reviewOpen ? 'border-[#DBEAFE]' : 'border-[#F1F5F9]'
        }`} title={reviewOpen
          ? '이날 강의에서 틀린 유형으로 새 문제를 냅니다'
          : demoLecturesOf(day).length
            ? '시연 강의를 끝내면 열려요'
            : '이날 강의를 모두 끝내면 열려요'}>
          <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
            reviewOpen ? 'bg-[#EFF6FF]' : 'bg-[#F3F4F6]'
          }`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={reviewOpen ? '#2563EB' : '#9CA3AF'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" /></svg>
          </div>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
            reviewOpen ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#6B7280]'
          }`}>복습</span>
          <span className={`text-[13px] flex-1 min-w-0 truncate ${reviewOpen ? 'text-[#374151]' : 'text-[#6B7280]'}`}>{REVIEW_LABEL}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
            reviewOpen ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#9CA3AF]'
          }`}>{reviewOpen ? '열림' : '잠김'}</span>
        </div>
      </div>
    </div>
  )
}

function CurriculumGrid() {
  const lectures = useCurriculumLectures()
  const doneCodes = useCompletedLectures()
  /* 시간표는 seq(커리큘럼 42강 번호)로 강의를 부른다 → 번호로 찾을 수 있게 한 번 말아둔다 */
  const bySeq = useMemo(() => {
    const map = new Map<number, DbLecture>()
    for (const l of lectures) if (l.seq != null) map.set(l.seq, l)
    return map
  }, [lectures])
  /* 완료 기록은 강의 코드로 오고 시간표는 번호로 센다 → 한 번만 번호로 옮겨둔다 */
  const doneSeq = useMemo(() => {
    const s = new Set<number>()
    for (const l of lectures) if (l.seq != null && doneCodes.has(l.code)) s.add(l.seq)
    return s
  }, [lectures, doneCodes])

  if (lectures.length === 0) return null
  return (
    <div className="space-y-3">
      {([1, 2] as const).map((week) => (
        <div key={week} className="space-y-3">
          {/* 주차 머리 — 카드가 아니라 구분선 한 줄. 카드로 만들면 Day 카드와 무게가 같아진다 */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[12px] font-black text-[#1C1B33]">{week}주차</span>
            <span className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-[11px] font-semibold text-[#9CA3AF]">
              D{(week - 1) * 6 + 1}–D{week * 6}
            </span>
          </div>
          {FGI_SCHEDULE.filter((d) => d.week === week).map((d) => (
            <DaySection key={d.day} day={d} bySeq={bySeq} doneSeq={doneSeq} />
          ))}
        </div>
      ))}
    </div>
  )
}

function TypeGrid() {
  const lectures = useCurriculumLectures()
  const byCode = useMemo(() => new Map(lectures.map((l) => [l.code, l])), [lectures])

  const parts = useMemo(() => {
    const map = new Map<number, TypeLessonData[]>()
    for (const t of TYPE_LESSONS) {
      if (!map.has(t.part)) map.set(t.part, [])
      map.get(t.part)!.push(t)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [])

  const ready = TYPE_LESSONS.filter((t) => {
    const l = byCode.get(TYPE_LECTURE[t.id] ?? TYPE_PRACTICE[t.id] ?? '')
    return l && l.questionCount > 0
  }).length

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#BFDBFE] rounded-2xl px-4 py-3 shadow-[0_1px_8px_rgba(37,99,235,0.06)]">
        <p className="text-[13px] font-bold text-[#1C1B33]">
          문항 유형별 화면 <span className="text-[#2563EB]">{TYPE_LESSONS.length}</span>
          <span className="text-[11px] font-semibold text-[#9CA3AF] ml-1.5">· 지금 볼 수 있는 유형 {ready}</span>
        </p>
        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
          같은 커리큘럼 안에서도 문제 유형에 따라 화면이 달라집니다 — 사진이 있는지, 듣기인지, 지문이 몇 개인지, 표가 붙는지.
          카드를 누르면 그 유형의 대표 강의로 들어가요.
        </p>
      </div>
      {parts.map(([part, lessons]) => {
        const lc = lessons[0].area === 'LC'
        return (
          <div key={part}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${lc ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F0FDF4] text-[#16A34A]'}`}>
                Part {part}
              </span>
              <p className="text-[12px] font-bold text-[#374151]">{lessons[0].partName}</p>
              <span className="text-[11px] text-[#C4C9D4]">{lessons.length}유형</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {lessons.map((t) => (
                <TypeCard key={t.id} t={t} lecture={byCode.get(TYPE_LECTURE[t.id] ?? TYPE_PRACTICE[t.id] ?? '')} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── 메인 ── */
export default function LessonsPage() {
  const { userName, targetScore, examDate } = useOnboardingStore()
  const streakDay = useStreakDay()

  const studyNotes = useMemo<StudyNoteItem[]>(
    () => COURSES.flatMap(c =>
      c.lessons
        .filter(l => l.status === 'done' && l.note)
        .map(l => ({ id: l.id, partLabel: l.partLabel ?? '학습 노트', lessonTitle: l.title, note: l.note! }))
    ),
    []
  )
  /* 내 노트함 — 노트가 있는 전 레슨 (완료=열림 / 미완료=잠김) */
  const allNotes = useMemo(
    () => COURSES.flatMap(c => c.lessons.filter(l => l.note).map(l => ({ id: l.id, partLabel: l.partLabel ?? '학습 노트', lessonTitle: l.title, locked: l.status !== 'done' }))),
    []
  )
  const tipNotes = useMemo<TipItem[]>(
    () => COURSES
      .filter(c => isCourseComplete(c) && c.tipNote)
      .map(c => ({ courseId: c.id, courseTitle: c.title, tip: c.tipNote! })),
    []
  )

  /* 진도율 — 전체 레슨 완료 수 기반 실계산 */
  const { bookCount, totalLessons, doneLessons, overallPct } = useMemo(() => {
    const lessons = COURSES.flatMap(c => c.lessons)
    const done = lessons.filter(l => l.status === 'done').length
    return {
      bookCount: COURSES.length,
      totalLessons: lessons.length,
      doneLessons: done,
      overallPct: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
    }
  }, [])

  /* 오늘 수업 일정 — 활성 Book에서 이미 들은 레슨 + 오늘 들을 레슨으로 실계산 */
  const { todayDone, todayTotal, todayComplete } = useMemo(() => {
    const activeBook = COURSES.find(c => c.lessons.some(l => l.status === 'current'))
    const relevant = activeBook
      ? activeBook.lessons.filter(l => l.status === 'done' || l.status === 'current')
      : []
    const done = relevant.filter(l => l.status === 'done').length
    const total = relevant.length
    return { todayDone: done, todayTotal: total, todayComplete: total > 0 && done === total }
  }, [])

  const [viewer, setViewer] = useState<{ kind: 'study' | 'tip'; index: number; autoPrint?: boolean } | null>(null)
  const [notesTab, setNotesTab] = useState<'lessons' | 'notes'>('lessons')
  /* 학습 뷰 전환 — 커리큘럼(FGI용 정규 42강) ↔ 유형별(개발사 소통용 15유형 샘플). 임시 토글. */
  const [lessonView, setLessonView] = useState<'curriculum' | 'type'>('curriculum')
  const openStudy = (lessonId: string) => {
    const i = studyNotes.findIndex(n => n.id === lessonId)
    setViewer({ kind: 'study', index: i < 0 ? 0 : i })
  }
  const openTip = (courseId: number) => {
    const i = tipNotes.findIndex(t => t.courseId === courseId)
    setViewer({ kind: 'tip', index: i < 0 ? 0 : i })
  }

  const ddayLabel = useMemo(() => {
    if (!examDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
  }, [examDate])

  /* 기존 콘텐츠 — 구버전 아카이브. 앞으로 새 버전을 수정해도 여기는 그대로 보존.
     · 맨 위: 15유형 그리드로 개편되기 전 파트 목록에서 백업한 Part 1·6 샘플 하나씩
     · 잠긴(locked) 레슨 제거
     · 제목 중복 제거 (하나만)
     · Part 5는 구버전 도입 화면으로: href '/part5' → '/part5-legacy' */
  const legacyCourse = useMemo<CourseData>(() => {
    const backup: Lesson[] = [
      { id: 'bk-p1', title: '[백업] 사진 묘사 — 유형학습 (강사 에이전트)', status: 'upcoming', partLabel: 'Part 1', href: '/lesson/LC-P1-01' },
      { id: 'bk-p6', title: '[백업] 장문 공란 — 분할 화면 + 강사 모달', status: 'upcoming', partLabel: 'Part 6', href: '/part6-split' },
    ]
    const seen = new Set<string>()
    const lessons = backup.concat(
      COURSES.flatMap(c => c.lessons)
        .filter(l => {
          if (l.status === 'locked') return false
          if (seen.has(l.title)) return false
          seen.add(l.title)
          return true
        })
        .map(l => (l.href === '/part5' ? { ...l, href: '/part5-legacy' } : l))
    )
    return {
      id: 0,
      emoji: '📦',
      accentColor: '#6B7280',
      title: '기존 콘텐츠',
      duration: '',
      desc: '이전 버전 학습 콘텐츠 (구버전 보존)',
      fullyLocked: false,
      lessons,
    }
  }, [])

  return (
    <>
      <div className={`flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33] ${viewer ? 'print:hidden' : ''}`}>
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* 모바일 헤더 */}
          <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <p className="text-[#1C1B33] text-[20px] font-bold">내 학습</p>
              <div className="flex items-center gap-2">
                {ddayLabel && (
                  <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#C7D2FE] px-2.5 py-1 rounded-full">
                    {ddayLabel}
                  </span>
                )}
                <span className="text-[11px] font-bold text-[#F59E0B] bg-[#FEF9C3] border border-[#FDE68A] px-2.5 py-1 rounded-full">
                   12일
                </span>
                <AccountMenu userName={userName ?? ''} />
              </div>
            </div>
          </header>

          {/* 데스크탑 헤더 */}
          <header className="hidden md:flex px-8 py-4 items-center justify-between bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
            <p className="text-[#1C1B33] font-bold text-[20px]">내 학습</p>
            <div className="flex items-center gap-2">
              {ddayLabel && (
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#C7D2FE] px-3 py-1.5 rounded-full">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  토익 {ddayLabel}
                </span>
              )}
              <span className="text-[12px] font-bold text-[#F59E0B] bg-[#FEF9C3] border border-[#FDE68A] px-3 py-1.5 rounded-full">
                 12일 연속
              </span>
              <AccountMenu userName={userName ?? ''} />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-28 md:pb-10">
            <div className="max-w-[680px] mx-auto w-full space-y-3">

              {/* 상단 탭 */}
              <div className="flex border-b border-[#DBEAFE] mb-1">
                {([['lessons', '학습'], ['notes', '내 노트함']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setNotesTab(key)}
                    className={`px-5 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-all ${notesTab === key ? 'text-[#2563EB] border-[#2563EB] font-bold' : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'}`}>
                    {label}{key === 'notes' && allNotes.length > 0 ? ` (${allNotes.length})` : ''}
                  </button>
                ))}
              </div>

              {notesTab === 'lessons' ? (
                <div className="space-y-3">

              {/* 플랜 배너 — 블루 그라디언트 */}
              <div className="bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#60A5FA] rounded-2xl px-5 py-5 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full" />
                <div className="absolute right-24 bottom-2 w-16 h-16 bg-white/5 rounded-full" />
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="min-w-0">
                    <p className="text-white font-bold text-[18px] leading-snug mb-2.5">
                      지윤님의 플랜
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">{streakDay}일차</span>
                      {targetScore && (
                        <span className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">목표 {targetScore}점</span>
                      )}
                      {ddayLabel && (
                        <span className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">토익 {ddayLabel}</span>
                      )}
                    </div>
                  </div>
                  {/* 진도 링 */}
                  <div className="relative w-[84px] h-[84px] shrink-0">
                    <svg width="84" height="84" viewBox="0 0 84 84" className="absolute inset-0 -rotate-90">
                      <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
                      <circle cx="42" cy="42" r="34" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={2 * Math.PI * 34 * (1 - overallPct / 100)} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white text-[22px] font-black leading-none">{bookCount}</span>
                      <span className="text-white/70 text-[10px] font-bold leading-none mt-0.5">Books</span>
                    </div>
                  </div>
                </div>
                {/* 전체 진도 바 */}
                <div className="flex items-center gap-2.5 mt-4 relative z-10">
                  <span className="text-[11px] font-semibold text-white/80 shrink-0">전체 진도</span>
                  <div className="flex-1 h-2 bg-white/25 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                  </div>
                  <span className="text-[12px] font-black text-white shrink-0">{overallPct}%</span>
                </div>
              </div>

              {/* 오늘 수업 일정 */}
              <div className="bg-white border border-[#BFDBFE] rounded-2xl px-4 py-3 shadow-[0_1px_8px_rgba(37,99,235,0.06)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${todayComplete ? 'bg-[#2563EB]' : 'bg-[#EFF6FF]'}`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={todayComplete ? 'white' : '#60A5FA'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-[#1C1B33] text-[13px] font-bold flex-1 min-w-0">
                    {todayComplete
                      ? '오늘 수업 일정을 완료했어요!'
                      : `오늘 수업 일정 · ${todayTotal - todayDone}개 남았어요`}
                  </p>
                  <span className="text-[12px] font-bold text-[#2563EB] shrink-0">{todayDone}/{todayTotal} 완료</span>
                </div>
                <div className="h-1.5 bg-[#DBEAFE] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${todayTotal ? Math.round(todayDone / todayTotal * 100) : 0}%` }} />
                </div>
              </div>

              {/* 학습 뷰 토글 — 커리큘럼(FGI) ↔ 유형별(개발사 소통) */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-xl w-fit">
                  <button
                    onClick={() => setLessonView('curriculum')}
                    className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all ${lessonView === 'curriculum' ? 'bg-white text-[#2563EB] shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'text-[#94A3B8] hover:text-[#64748B]'}`}
                  >
                    📚 정규 커리큘럼
                  </button>
                  <button
                    onClick={() => setLessonView('type')}
                    className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all ${lessonView === 'type' ? 'bg-white text-[#2563EB] shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'text-[#94A3B8] hover:text-[#64748B]'}`}
                  >
                    🧩 문항 유형별
                  </button>
                </div>
                <span className="text-[11px] font-bold text-[#EF4444]">← UI 확인용 임시 버튼</span>
              </div>

              {lessonView === 'curriculum'
                ? /* 커리큘럼 정규 수업 — lectures 테이블(정본). 문항 준비된 강의부터 플레이 가능 */
                  <CurriculumGrid />
                : /* 15문항 유형 그리드 — 유형별 샘플 수업 (개발사 소통용) */
                  <TypeGrid />
              }

              {/* ── 기존 콘텐츠 — 이전 Book 콘텐츠 전체를 하나의 book으로 ── */}
              <div className="pt-4">
                <CourseSection course={legacyCourse} labelPrefix="" collapsible defaultOpen={false} onOpenStudy={openStudy} onOpenTip={openTip} />
              </div>
                </div>
              ) : (
                /* ── 내 노트함 ── */
                <div className="pt-2">
                  {allNotes.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-16">아직 노트가 없어요. 수업을 완료하면 학습 노트가 열려요.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {allNotes.map((n) => n.locked ? (
                        <div key={n.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 opacity-80">
                          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center mb-2.5">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                          </div>
                          <span className="text-[10px] font-bold text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-md">{n.partLabel}</span>
                          <p className="text-[13px] font-semibold text-[#9CA3AF] mt-1.5 line-clamp-2">{n.lessonTitle}</p>
                          <p className="text-[11px] text-[#C4C9D4] mt-2">완료 시 열려요</p>
                        </div>
                      ) : (
                        <button key={n.id} onClick={() => openStudy(n.id)} className="text-left rounded-2xl border border-[#BFDBFE] bg-[#F8FAFF] p-4 hover:border-[#2563EB] hover:shadow-md transition-all">
                          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center mb-2.5">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                          </div>
                          <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md">{n.partLabel}</span>
                          <p className="text-[13px] font-semibold text-[#1C1B33] mt-1.5 line-clamp-2">{n.lessonTitle}</p>
                          <p className="text-[11px] text-[#2563EB] font-bold mt-2">노트 열기 →</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </main>
        </div>

        <BottomNav />
      </div>

      {viewer && (
        <NoteViewer
          kind={viewer.kind}
          startIndex={viewer.index}
          studyNotes={studyNotes}
          tipNotes={tipNotes}
          autoPrint={viewer.autoPrint}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  )
}
