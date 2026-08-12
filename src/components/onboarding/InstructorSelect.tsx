'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { saveProfileToSupabase } from '@/lib/profile'
import { useCurriculumLectures, type DbLecture } from '@/data/db/questionStore'
import { getInstructorPlan, refToSeq, type InstructorPlan } from '@/data/instructorCurriculum'
import { displayLecture } from '@/data/lectureTitles'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'agent-id': string
          'dynamic-variables'?: string
        },
        HTMLElement
      >
    }
  }
}

// 강사별 핵심 매칭 코드 (C/S = 난이도, R/P = 동기유지)
const INST_CORE: Record<string, { difficulty: 'C' | 'S'; motivation: 'R' | 'P' }> = {
  park_hyewon: { difficulty: 'C', motivation: 'P' },
  yun_daeun:   { difficulty: 'S', motivation: 'P' },
  lee_doyun:   { difficulty: 'C', motivation: 'R' },
  seo_jian:    { difficulty: 'S', motivation: 'R' },
}

function getMatchScore(userDiff: string | null, userMot: string | null, instId: string): number {
  const core = INST_CORE[instId]
  if (!core) return 50
  let score = 50 // W/N(25) + D/M(25) 항상 충족
  if (userDiff && userDiff === core.difficulty) score += 30
  if (userMot && userMot === core.motivation) score += 20
  return score
}

type TabId = 'feature' | 'material' | 'curriculum'

/* 강사별 진도 페이스(주 N회). 커리큘럼 42강 ÷ perWeek 로 소요 주수를 계산한다 —
   화면에 쓰는 "총 42강"은 DB(lectures)에서 오고, 여기서 정하는 건 페이스뿐이다. */
const INST_PACE: Record<string, { perWeek: number; label: string }> = {
  park_hyewon: { perWeek: 5, label: '몰아치는 압축 진도' },
  yun_daeun:   { perWeek: 4, label: '핵심만 빠르게' },
  lee_doyun:   { perWeek: 4, label: '속도 훈련 반복' },
  seo_jian:    { perWeek: 3, label: '단계별로 차근차근' },
  oh_jungja:   { perWeek: 2, label: '절대 서두르지 않기' },
}

const INSTRUCTORS = [
  {
    id: 'park_hyewon',
    name: '박혜원',
    isReal: true, // 실제 YBM 스타강사
    tag: '#스파르타압축형',
    video: '/video/video-park5_0812.mp4',
    videoJiyun: '/video/video-park5_0812.mp4',
    videoObjectPosition: 'center 25%', // 머리 잘림 방지 — 영상 아래로
    thumbnail: '/instructor/park-2.jpg',
    badge: '목표 자극 전문',
    desc: '어려운 문제도 점수로 연결하는 오답 소거·압축 전략. 단호하지만 확실한 코칭.',
    quote: '"이 선택지 왜 고른 거야. 소거 기준부터 다시."',
    badgeCls: 'bg-[#FEF9C3] text-[#B45309]',
    matchingDesc: '도전적인 문제를 즐기고 목표 자극으로 동기를 찾는 성향에 딱 맞아요.',
    recommendations: [
      '목표 점수까지 강하게 드라이브 걸고 싶은 분',
      '어려운 문제에 도전해야 실력이 느는 분',
      '팩폭도 감수하고 결과를 내고 싶은 분',
    ],
    stats: { satisfaction: '4.9/5', students: '8,200+', avgIncrease: '+145점' },
    proposal: {
      plan: '750점 목표 · 4주(1개월) 압축 커리큘럼',
      target: 'LC 우선 전략 + 오답 소거·실전 압축 코칭',
      comment: '선택지 소거 기준을 먼저 잡아줄게요. 어려운 문제도 점수로 연결하는 방법, 저랑 함께 훈련해요.',
      tags: ['#스파르타', '#오답소거', '#압축전략', '#목표자극', '#고득점'],
    },
    curriculum: [
      { week: '1주차', title: 'LC Part 2·1 기반 + RC Part 5 병행', detail: 'Part 2(의문사·일반·기타 의문문)와 Part 1으로 듣기 점수 기반을 먼저 만들고, RC Part 5 기본 문법(품사·명사·형용사·시제)을 매일 조금씩 병행합니다.', part: 'LC 2·1 / RC 5', goal: 'LC 듣기 점수 기반 형성' },
      { week: '2주차', title: 'LC Part 3·4 확장 + RC Part 5·6 정리', detail: 'Part 3 대화 유형으로 확장하면서 RC Part 5 후반 문법과 Part 6 연결어·문맥, Part 7 기본 지문에 진입합니다.', part: 'LC 3·4 / RC 5·6', goal: 'RC 핵심 문법 완성' },
      { week: '3주차', title: 'LC Part 4 마무리 + RC Part 7 집중', detail: 'Part 4 안내·광고·뉴스로 LC를 마무리하고, RC Part 7을 단일 지문부터 이중·삼중 지문까지 집중 학습해 독해를 완성합니다.', part: 'LC 4 / RC 7', goal: '정규 수업 마무리' },
      { week: '4주차', title: '오답 기반 시험 직전 특강', detail: '1~3주차 학습 데이터에서 많이 틀린 유형을 골라 시험 직전 특강으로 약점을 보완하고, 실전 모의고사·핵심 요약 노트로 마무리합니다.', part: '전 파트', goal: '약점 보완 · 목표 점수 도달' },
    ],
    guideQuestions: [
      '선생님, 오답 소거 기준 어떻게 잡아야 하나요?',
      '어려운 문제에서 자꾸 시간을 잃는데, 어떻게 해야 하나요?',
      '목표 점수까지 가장 빠른 길이 뭔가요?',
    ],
    greeting: '반가워요, 박혜원입니다. 점수, 확실히 올릴 준비 됐나요? 어려운 문제도 소거 기준만 잡으면 돼요. 궁금한 거 물어보세요.',
    agentId: 'agent_6101kshnwxb7e5jbshccv5a3c9wa',
  },
  {
    id: 'yun_daeun',
    name: '윤다은',
    isReal: false, // AI 휴먼
    tag: '#하이텐션핵심형',
    video: '/video/video-yun-0812.mp4',
    videoJiyun: '/video/video-yun-0812.mp4',
    thumbnail: '/image_reference/jang.png',
    badge: '핵심 포인트 전문',
    desc: 'LC 정답 타이밍과 RC 근거 키워드를 빠르게 짚어주는 에너지 넘치는 코칭.',
    quote: '"여기서 잡아야 할 건 딱 이 부분이에요!"',
    badgeCls: 'bg-[#FFF0F3] text-[#E11D48]',
    matchingDesc: '안정적으로 쌓아가면서 목표 자극으로 동기를 찾는 성향에 딱 맞아요.',
    recommendations: [
      'LC 정답 타이밍을 자주 놓치는 분',
      'RC에서 근거 키워드를 못 잡는 분',
      '핵심만 빠르게 짚어주는 코칭이 필요한 분',
    ],
    stats: { satisfaction: '4.8/5', students: '6,500+', avgIncrease: '+128점' },
    proposal: {
      plan: '5주 핵심 포인트 집중 코스',
      target: 'LC 정답 타이밍 + RC 근거 키워드 완성',
      comment: '군더더기 없이 핵심만 빠르게요. LC는 타이밍, RC는 근거 키워드 — 이것만 잡으면 점수 올라가요!',
      tags: ['#핵심포인트', '#정답타이밍', '#근거키워드', '#하이텐션', '#빠른피드백'],
    },
    curriculum: [
      { week: '1주차', title: 'LC 정답 타이밍 훈련', detail: '어디서 답이 나오는지 타이밍을 먼저 파악하는 훈련을 합니다.', part: 'Part 1~4', goal: 'LC 정답률 75%+' },
      { week: '2주차', title: 'RC 근거 키워드 찾기', detail: '정답 근거가 되는 키워드를 빠르게 표시하는 연습을 합니다.', part: 'Part 5/6', goal: '근거 파악 속도 향상' },
      { week: '3~4주차', title: '핵심 포인트 실전 적용', detail: 'LC 타이밍과 RC 근거를 실전 문제에 바로 적용하는 훈련을 합니다.', part: '전 파트', goal: '정답률 78%+' },
      { week: '5주차', title: '실전 모의고사 마무리', detail: '전체 흐름으로 풀고 핵심 포인트를 놓친 문제만 집중 보강합니다.', part: '전 파트', goal: '목표 점수 도달' },
    ],
    guideQuestions: [
      '선생님, LC에서 정답 타이밍 잡는 법 알려주세요!',
      'RC에서 근거 키워드를 못 찾겠어요, 어떻게 해야 하나요?',
      '윤다은 선생님 코칭 스타일이 궁금해요!',
    ],
    greeting: '안녕하세요 윤다은입니다! 빠르게 핵심만 가요. LC는 타이밍, RC는 키워드 — 딱 이것만 잡으면 점수 나와요!',
    agentId: 'agent_6101kshnwxb7e5jbshccv5a3c9wa',
  },
  {
    id: 'lee_doyun',
    name: '이도윤',
    isReal: false, // AI 휴먼
    tag: '#직청직독형',
    video: '/instructor/leedoyoon02.mp4',
    videoJiyun: '/instructor/leedoyoon02.mp4',
    videoObjectPosition: 'center 25%', // 머리 잘림 방지 — 영상 아래로
    thumbnail: '/instructor/lee-2.png',
    badge: '직청직독 전문',
    desc: '영어를 영어 어순 그대로 처리하는 직청직독 방식으로 처리 속도와 점수를 동시에 올립니다.',
    quote: '"번역하려고 멈추는 순간 이미 늦어요."',
    badgeCls: 'bg-[#EFF6FF] text-[#1D4ED8]',
    matchingDesc: '도전적인 문제를 즐기고 성취 보상으로 동기를 찾는 성향에 딱 맞아요.',
    recommendations: [
      '번역 습관 때문에 속도가 느린 분',
      '어려운 문장을 바로 이해하고 싶은 분',
      '처리 속도 향상을 성취감으로 느끼고 싶은 분',
    ],
    stats: { satisfaction: '4.8/5', students: '7,100+', avgIncrease: '+138점' },
    proposal: {
      plan: '6주 직청직독 집중 코스',
      target: 'LC/RC 처리 속도 2배 향상',
      comment: '영어를 한국어로 바꾸지 않고 바로 이해하는 방법이 있어요. 의미 덩어리로 처리하면 속도와 정확도가 동시에 올라가요.',
      tags: ['#직청직독', '#의미덩어리', '#처리속도', '#고난도정복', '#논리형코칭'],
    },
    curriculum: [
      { week: '1~2주차', title: '의미 덩어리 읽기 훈련', detail: '영어를 끊어 읽고 덩어리째 이해하는 훈련을 합니다.', part: 'Part 6/7', goal: '독해 속도 향상' },
      { week: '3주차', title: 'LC 직청 훈련', detail: '들리는 순서대로 의미를 파악하는 직청 훈련을 합니다.', part: 'Part 3/4', goal: 'LC 정답률 78%+' },
      { week: '4~5주차', title: '고난도 문장 처리', detail: '복잡한 문장도 의미 덩어리로 빠르게 처리하는 실전 훈련을 합니다.', part: '전 파트', goal: '처리 속도 2배' },
      { week: '6주차', title: '실전 속독 마무리', detail: '시간 제한 내 직청직독으로 전 파트를 풀고 속도를 점검합니다.', part: '전 파트', goal: '목표 점수 도달' },
    ],
    guideQuestions: [
      '직청직독, 어떻게 시작해야 하나요?',
      '긴 문장이 나오면 번역하게 되는데 어떻게 해야 하나요?',
      '이도윤 선생님만의 직청직독 비법이 궁금해요.',
    ],
    greeting: '안녕하세요, 이도윤입니다. 영어를 한국어 어순으로 끌고 오면 늦어요. 들리는 순서, 읽히는 순서 그대로 이해하는 법, 같이 훈련해봐요.',
    agentId: 'agent_6101kshnwxb7e5jbshccv5a3c9wa',
  },
  {
    id: 'seo_jian',
    name: '서지안',
    isReal: true, // 실제 YBM 스타강사
    tag: '#흐름구조형',
    video: '/video/video-jung.mp4',
    videoJiyun: '/video/video-jung.mp4',
    thumbnail: '/image_reference/jung.png',
    badge: '흐름 구조화 전문',
    desc: '3단계 청취 흐름과 RC 글 구조화로 단계별 성취감을 쌓아가는 차분한 코칭.',
    quote: '"흐름을 잡으면 답이 보여요."',
    badgeCls: 'bg-[#F0FDF4] text-[#059669]',
    matchingDesc: '안정적으로 쌓아가면서 성취 보상으로 동기를 찾는 성향에 딱 맞아요.',
    recommendations: [
      '체계적으로 차근차근 공부하고 싶은 분',
      'LC 전체 흐름을 놓치는 분',
      'RC에서 글 구조를 잘 못 잡는 분',
    ],
    stats: { satisfaction: '4.9/5', students: '5,800+', avgIncrease: '+122점' },
    proposal: {
      plan: '6주 흐름 구조화 코스',
      target: 'LC 3단계 청취 + RC 글 구조 파악 완성',
      comment: 'LC는 전체 상황→핵심 정보→정답 단서, RC는 목적·전개·근거 위치 — 흐름만 잡으면 답이 보여요.',
      tags: ['#흐름구조', '#3단계청취', '#글구조화', '#성취감누적', '#차분한코칭'],
    },
    curriculum: [
      { week: '1~2주차', title: 'LC 3단계 청취 훈련', detail: '전체 상황→핵심 정보→정답 단서 순서로 듣는 훈련을 합니다.', part: 'Part 3/4', goal: 'LC 정답률 75%+' },
      { week: '3~4주차', title: 'RC 글 구조 파악', detail: '지문의 목적·전개·근거 위치를 구조화해서 읽는 훈련을 합니다.', part: 'Part 6/7', goal: '구조 파악 속도 향상' },
      { week: '5주차', title: '흐름 오류 교정', detail: '어느 단계에서 흐름을 놓쳤는지 찾아 교정하는 집중 훈련을 합니다.', part: '전 파트', goal: '정답률 77%+' },
      { week: '6주차', title: '실전 흐름 적용', detail: '실전 문제에서 흐름 구조를 그대로 적용하며 마무리합니다.', part: '전 파트', goal: '목표 점수 도달' },
    ],
    guideQuestions: [
      'LC에서 흐름을 잡는 게 어려운데 어떻게 해야 하나요?',
      'RC 지문이 길면 구조를 어떻게 파악해야 하나요?',
      '서지안 선생님의 단계별 학습법이 궁금해요.',
    ],
    greeting: '안녕하세요, 서지안입니다. 차분하게, 단계적으로 가요. LC는 흐름, RC는 구조 — 이것만 잡으면 토익은 생각보다 어렵지 않아요.',
    agentId: 'agent_6101kshnwxb7e5jbshccv5a3c9wa',
  },
  {
    id: 'oh_jungja',
    name: '오정자',
    isReal: false, // AI 휴먼
    tag: '#시니어맞춤형',
    video: '/video/video-6.mp4',
    videoJiyun: '/video/video-6.mp4',
    thumbnail: '/image_reference/ojungja.jpg',
    badge: '시니어 전용',
    desc: '30년 경력 국어 교사 출신. 절대 서두르지 않고, 절대 포기시키지 않는 토익계의 할머니.',
    quote: '"급하면 체해요. 천천히, 같이 봐요."',
    badgeCls: 'bg-[#FAF5FF] text-[#7C3AED]',
    matchingDesc: '느긋한 설명과 무한한 인내심이 필요한 모든 분께 99% 이상 맞아요.',
    recommendations: [
      '몇 번을 물어봐도 눈치 보기 싫은 분',
      '빠른 강의가 무서운 분',
      '손주한테 자랑하고 싶은 분',
    ],
    stats: { satisfaction: '5.0/5', students: '2,100+', avgIncrease: '+88점' },
    proposal: {
      plan: '12주 느긋한 정복 코스',
      target: '토익 500점 → 당당하게 합격',
      comment: '서두르지 마세요. 제가 이해할 때까지 몇 번이든 다시 설명해드려요. 포기는 없습니다.',
      tags: ['#천천히', '#반복또반복', '#눈치제로', '#포기금지', '#시니어화이팅'],
    },
    curriculum: [
      { week: '1~2주차', title: '알파벳은 알죠? 그럼 됐어요', detail: '영어 문장 구조를 그림과 한글 풀이로 완전히 이해합니다. 절대 외우라고 안 해요.', part: '기초 문법', goal: '문장 읽기 가능' },
      { week: '3~5주차', title: '자주 나오는 단어 100개만', detail: '딱 100개만 해요. 매일 10개씩, 매번 복습. 나머지는 어차피 몰라도 돼요.', part: 'Part 5 어휘', goal: '핵심 어휘 암기' },
      { week: '6~9주차', title: '듣기는 천천히 들으면 돼요', detail: 'LC는 두 번 틀어드려요. 한 번은 그냥 듣고, 한 번은 받아쓰고.', part: 'Part 1~4', goal: 'LC 정답률 60%+' },
      { week: '10~12주차', title: '실전 모의고사 (화장실 먼저 다녀오고)', detail: '실제 시험 시간 맞춰 풀어봐요. 2시간 앉아있는 연습이 제일 중요해요.', part: '전 파트', goal: '500점 이상 달성' },
    ],
    guideQuestions: [
      '선생님, 영어가 너무 어려운데 저 같은 사람도 붙을 수 있을까요?',
      '외운 단어가 다음날이면 기억이 안 나요, 왜 그럴까요?',
      '시험 당일 긴장되면 어떻게 마음을 잡나요?',
    ],
    greeting: '어이구, 왔어요? 나 오정자예요. 걱정 마요, 내가 다 설명해줄게요. 몇 번이고. 정말이에요, 몇 번이고.',
    agentId: 'agent_6101kshnwxb7e5jbshccv5a3c9wa',
  },
]


export default function InstructorSelect({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  const {
    userName, setSelectedInstructor,
    targetScore, studyRange, examDate, rangeAxis,
    difficulty, motivation, studyPeriod, dailyTime,
  } = useOnboardingStore()

  const showOjungja = targetScore === 600 && studyRange === 'LC' && examDate === '2026-12-27'
  const baseList = showOjungja ? INSTRUCTORS : INSTRUCTORS.filter(i => i.id !== 'oh_jungja')

  // 동적 매칭: C/S(30점) + R/P(20점) + 기본 50점
  const matchScores: Record<string, number> = {}
  for (const inst of baseList) matchScores[inst.id] = getMatchScore(difficulty, motivation, inst.id)
  const visibleInstructors = [...baseList].sort((a, b) => (matchScores[b.id] ?? 0) - (matchScores[a.id] ?? 0))
  const recommendedId = visibleInstructors[0]?.id ?? null

  const [view, setView] = useState<'list' | 'detail'>('list')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({})
  const [isTablet, setIsTablet] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>(new Array(INSTRUCTORS.length).fill(null))
  const videoInitialized = useRef(false)
  const touchStartX = useRef(0)

  const [activeTab, setActiveTab] = useState<TabId>('feature')
  const [selectedInst, setSelectedInst] = useState<(typeof INSTRUCTORS)[0] | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const tabSectionRef = useRef<HTMLDivElement | null>(null)

  /* ── video autoplay on focus change ── */
  useEffect(() => {
    const play = () => {
      videoRefs.current.forEach((v, i) => {
        if (!v) return
        if (i === focusedIndex) {
          v.muted = isMuted
          v.currentTime = 0
          v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
        } else {
          v.pause()
        }
      })
    }

    if (!videoInitialized.current) {
      videoInitialized.current = true
      const t = setTimeout(play, 1000)
      return () => clearTimeout(t)
    } else {
      play()
    }
  }, [focusedIndex])

  /* ── mute 토글 시 현재 영상에 즉시 반영 ── */
  useEffect(() => {
    const v = videoRefs.current[focusedIndex]
    if (v) v.muted = isMuted
  }, [isMuted])

  /* ── 태블릿 감지 ── */
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* ── 키보드 좌우 화살표 ── */
  useEffect(() => {
    if (view !== 'list') return
    const len = visibleInstructors.length
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setFocusedIndex(prev => (prev - 1 + len) % len)
      else if (e.key === 'ArrowRight') setFocusedIndex(prev => (prev + 1) % len)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [view, visibleInstructors.length])

  const goPrev = () => setFocusedIndex(prev => (prev - 1 + visibleInstructors.length) % visibleInstructors.length)
  const goNext = () => setFocusedIndex(prev => (prev + 1) % visibleInstructors.length)

  function wrappedOffset(i: number, focused: number, total: number): number {
    let offset = i - focused
    if (offset > total / 2) offset -= total
    if (offset < -total / 2) offset += total
    return offset
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50) goNext()
    else if (diff < -50) goPrev()
  }

  const handleConfirm = async (id: string) => {
    setSelectedInstructor(id)
    console.log('[InstructorSelect] handleConfirm 저장 시작, instructor:', id)
    try {
      await saveProfileToSupabase(useOnboardingStore.getState())
    } catch (e: any) {
      console.error('[InstructorSelect] 저장 실패:', e)
      alert(`프로필 저장 실패 (개발 디버그)\n${e?.message ?? e}`)
      return
    }
    window.location.href = '/dashboard'
  }

  const goToDetail = (inst: (typeof INSTRUCTORS)[0]) => {
    setSelectedInst(inst)
    setView('detail')
    setActiveTab('feature')
    window.scrollTo(0, 0)
  }

  /* ═══════════════════════════════════════
     LIST VIEW — 카드 슬라이드
  ═══════════════════════════════════════ */
  if (view === 'list') {
    const focused = visibleInstructors[focusedIndex]
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#C7D9FF] via-[#E8EFFE] to-[#F5F7FF] overflow-hidden select-none relative">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 z-50 p-2 text-[#6B7280] hover:text-[#111318] transition-colors rounded-full bg-white/50 backdrop-blur-sm border border-[#E5E7EB] hover:bg-white active:scale-95"
            aria-label="이전 단계로 이동"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {/* Header */}
        <div className="pt-12 pb-4 px-5">
          <h1 className="text-[#111318] text-[18px] font-bold leading-snug text-center">
            {userName ? `${userName}님의 성향을 바탕으로` : '분석된 성향을 바탕으로'}
          </h1>
          <p className="text-[#374151] text-[14px] font-medium mt-0.5 text-center">각 코치가 맞춤 프로그램을 제안했어요.</p>
          <p className="text-[#9CA3AF] text-[12px] mt-2 text-center">카드를 좌우로 넘겨 비교해보세요.</p>
        </div>

        {/* Card Slider */}
        <div
          className="relative flex-shrink-0 mt-8"
          style={{ height: isTablet ? '480px' : '400px' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {visibleInstructors.map((inst, i) => {
            const offset = wrappedOffset(i, focusedIndex, visibleInstructors.length)
            const absOffset = Math.abs(offset)
            const isActive = offset === 0
            const isVisible = isTablet ? absOffset <= 2 : absOffset <= 1

            const cardW = isTablet ? 250 : 245
            const cardH = isTablet ? 420 : 355
            const spacing = isTablet ? 240 : 230
            const scale = isActive ? 1 : absOffset === 1 ? 0.85 : 0.70
            const opacity = isActive ? 1 : absOffset === 1 ? 0.65 : 0.40
            const blur = isActive ? 'none' : absOffset === 1 ? 'blur(1.5px)' : 'blur(2.5px)'
            const videoSrc = (userName === '지윤' && inst.videoJiyun) ? inst.videoJiyun : inst.video
            const showVideo = !!videoSrc && !videoErrors[inst.id]

            return (
              <div
                key={inst.id}
                className="absolute"
                style={{
                  width: `${cardW}px`,
                  height: `${cardH}px`,
                  top: '50%',
                  left: '50%',
                  transform: `translateX(calc(-50% + ${offset * spacing}px)) translateY(-50%) scale(${scale})`,
                  opacity: isVisible ? opacity : 0,
                  filter: blur,
                  transition: isVisible ? 'all 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
                  zIndex: isActive ? 10 : absOffset === 1 ? 6 : 3,
                  cursor: isActive ? 'default' : 'pointer',
                  pointerEvents: isVisible ? 'auto' : 'none',
                }}
                onClick={() => { if (!isActive) setFocusedIndex(i) }}
              >
                {/* 추천/매칭 배지 — overflow-hidden 바깥에 위치 */}
                {inst.id === recommendedId ? (
                  <div className="absolute -top-[40px] left-1/2 -translate-x-1/2 z-20 pointer-events-none whitespace-nowrap">
                    <div className="bg-[#2563EB] text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md shadow-[#2563EB]/40">
                      <span>★</span>
                      <span>AI 추천</span>
                      <span className="opacity-75">· {matchScores[inst.id] ?? 50}% 매칭</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute -top-[40px] left-1/2 -translate-x-1/2 z-20 pointer-events-none whitespace-nowrap">
                    <div className="bg-gray-700 text-white/80 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      {`${matchScores[inst.id] ?? 50}% MATCH`}
                    </div>
                  </div>
                )}

                <div
                  className={`w-full h-full rounded-[22px] overflow-hidden relative group ${
                    isActive
                      ? 'ring-[3px] ring-[#2563EB] shadow-2xl shadow-[#2563EB]/30'
                      : 'ring-1 ring-[#E5E7EB]'
                  }`}
                >
                  {showVideo ? (
                    <video
                      ref={el => { videoRefs.current[i] = el }}
                      src={videoSrc}
                      poster={inst.thumbnail}
                      playsInline
                      loop
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectPosition: (inst as any).videoObjectPosition ?? 'center' }}
                      onError={() => setVideoErrors(prev => ({ ...prev, [inst.id]: true }))}
                    />
                  ) : (
                    <img
                      src={inst.thumbnail}
                      alt={inst.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {/* hover overlay + 버튼 (active 카드만) */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex flex-col justify-end p-3 gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); goToDetail(inst) }}
                        className="w-full bg-white text-[#1C1B33] rounded-xl h-10 font-semibold text-[13px] hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors active:scale-[0.98]"
                      >
                        {inst.name} 강사 자세히 보기
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleConfirm(inst.id) }}
                        className="w-full bg-[#2563EB] text-white rounded-xl h-10 font-semibold text-[13px] hover:bg-[#1D4ED8] transition-colors active:scale-[0.98]"
                      >
                        바로 선택하기
                      </button>
                    </div>
                  )}

                  {/* 음소거 토글 버튼 */}
                  {isActive && showVideo && (
                    <button
                      onClick={e => { e.stopPropagation(); setIsMuted(m => !m) }}
                      className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:bg-black/70"
                    >
                      {isMuted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      )}
                    </button>
                  )}

                  {/* 강사 유형 배지 — 우측 하단 */}
                  <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm ${
                      inst.isReal
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#7C3AED] text-white'
                    }`}>
                      {inst.isReal ? 'YBM 스타 강사' : 'AI 휴먼 강사'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Prev arrow */}
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-md"
          >
            <svg width="16" height="16" fill="none" stroke="#374151" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Next arrow */}
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-md"
          >
            <svg width="16" height="16" fill="none" stroke="#374151" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Instructor name + tag */}
        <div className="text-center mt-4 px-6 transition-all duration-300">
          <h2 className="text-[#111318] text-[22px] font-bold">{focused.name}</h2>
          <span className="inline-block mt-1.5 text-[12px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-3 py-1 rounded-full">{focused.tag}</span>
        </div>

        {/* Indicator dots */}
        <div className="flex justify-center gap-1.5 mt-3 mb-10">
          {visibleInstructors.map((_, i) => (
            <button
              key={i}
              onClick={() => setFocusedIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === focusedIndex ? 'w-5 h-2 bg-[#2563EB]' : 'w-2 h-2 bg-[#D1D5DB]'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════
     DETAIL VIEW
  ═══════════════════════════════════════ */
  if (!selectedInst) return null

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#EAF1FF] via-[#F8FAFF] to-[#F0F0F8] animate-fade-in font-sans">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#DBEAFE] sticky top-0 z-30 shadow-sm">
        <button
          onClick={() => setView('list')}
          className="p-2 -ml-2 text-[#6B7280] hover:text-[#111318] transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-[#1C1B33] font-bold text-[16px]">상세 프로필</h3>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-[1000px] mx-auto w-full px-6 py-8">

          {/* 강사 프로필 상단 */}
          <div className="bg-white rounded-[24px] border border-[#DBEAFE] p-8 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* 이미지 */}
              <div className="w-full md:w-[240px] shrink-0">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#F3F4F6] border border-[#DBEAFE]">
                  <img src={selectedInst.thumbnail} alt={selectedInst.name} className="absolute inset-0 w-full h-full object-cover" />
                </div>
              </div>

              {/* 정보 */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-[28px] font-bold text-[#1C1B33]">{selectedInst.name}</h2>
                  <span className={`text-[12px] px-2.5 py-0.5 rounded-full font-bold ${selectedInst.badgeCls}`}>
                    {selectedInst.badge}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedInst.proposal.tags.map((tag: string) => (
                    <span key={tag} className="text-[13px] px-3 py-1 bg-[#F8FAFF] text-[#2563EB] rounded-lg font-bold border border-[#EFF6FF]">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="bg-[#EFF6FF] rounded-2xl p-5 border border-[#EDE9FE]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[#2563EB] font-semibold text-[16px]">
                      {userName}님의 성향과 {matchScores[selectedInst.id] ?? 50}% 매칭
                    </span>
                    <span className="text-[16px]"></span>
                  </div>
                  <p className="text-[#5B5A72] text-[14px] leading-relaxed">{selectedInst.matchingDesc}</p>
                </div>

                <p className="text-[#1C1B33] text-[15px] leading-relaxed font-medium">{selectedInst.proposal.comment}</p>

                {/* 스탯(만족도·수강생·점수상승) 숨김 — 현재 불필요 (표시하려면 false→true) */}
                {(false as boolean) && selectedInst && (
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  {[
                    { icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>, label: '강의 만족도', value: selectedInst.stats.satisfaction },
                    { icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>, label: '누적 수강생', value: selectedInst.stats.students },
                    { icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>, label: '평균 점수 상승', value: selectedInst.stats.avgIncrease },
                  ].map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">{stat.icon}</svg>
                      </div>
                      <div className="text-[13px]">
                        <span className="text-[#9CA3AF] mr-1.5">{stat.label}</span>
                        <span className="text-[#1C1B33] font-bold">{stat.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>

              {/* 추천 & CTA */}
              <div className="w-full md:w-[280px] shrink-0 space-y-4">
                {/* '이런 분께 추천해요' 숨김 — 현재 불필요 (표시하려면 false→true) */}
                {(false as boolean) && selectedInst && (
                <div className="bg-[#F8FAFF] rounded-2xl p-6 border border-[#DBEAFE]">
                  <h4 className="text-[#1C1B33] font-bold text-[14px] mb-4">이런 분께 추천해요</h4>
                  <ul className="space-y-3">
                    {selectedInst.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="mt-1 w-4 h-4 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3.5">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        </div>
                        <span className="text-[#5B5A72] text-[13px] leading-tight font-medium">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                )}

                <div className="space-y-2.5">
                  <button
                    onClick={() => handleConfirm(selectedInst.id)}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-4 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#2563EB]/20"
                  >
                    이 강사 선택하기
                  </button>
                  <button
                    onClick={async () => {
                      setSelectedInstructor(selectedInst.id)
                      await saveProfileToSupabase(useOnboardingStore.getState()).catch(e =>
                        console.error('[InstructorSelect] 저장 실패:', e)
                      )
                      window.location.href = '/lessons'
                    }}
                    className="w-full bg-white border border-[#DBEAFE] text-[#2563EB] py-4 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 hover:bg-[#F8FAFF]"
                  >
                    샘플 수업 시작하기
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── 탭 (강사 특징 / 맞춤 커리큘럼) ── */}
          <div ref={tabSectionRef} className="flex border-b border-[#DBEAFE] mb-8">
            {[
              { id: 'feature', label: '강의 소개' },
              { id: 'curriculum', label: '커리큘럼' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`px-10 py-4 text-[15px] font-bold transition-all relative ${
                  activeTab === tab.id ? 'text-[#2563EB]' : 'text-[#9CA3AF] hover:text-[#6B7280]'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-[#2563EB] rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          <div className="animate-fade-in">
            {activeTab === 'feature' && (
              <section className="bg-white rounded-3xl border border-[#DBEAFE] p-10">
                <h4 className="text-[#1C1B33] font-bold text-[20px] mb-1">
                  {userName ? `${userName}님께 이 설계를 제안하는 이유` : '이 설계를 제안하는 이유'}
                </h4>
                <p className="text-[#9CA3AF] text-[14px] mb-8">{selectedInst.tag} · {selectedInst.badge}</p>

                {/* 진도 타임라인(StudyPlanTimeline)은 보류 — 되살리려면 여기서 렌더하면 된다 */}

                {/* 학습 제안 배경 — 온보딩 응답(C/S·R/P·목표점수) + 강사 전략 조합 */}
                <div className="bg-[#EFF6FF] rounded-2xl p-6 border border-[#DBEAFE]">
                  <span className="text-[#2563EB] text-[12px] font-bold block mb-2">학습 제안 배경</span>
                  <p className="text-[#1C1B33] text-[15px] leading-relaxed">
                    {proposalBackground(
                      userName, difficulty, motivation, targetScore,
                      selectedInst.name, selectedInst.proposal.target,
                    )}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div className="bg-[#F8FAFF] rounded-2xl p-6 border border-[#EFF6FF]">
                    <span className="text-[#9CA3AF] text-[12px] font-bold block mb-1">추천 플랜</span>
                    <p className="text-[#1C1B33] text-[17px] font-bold">{selectedInst.proposal.plan}</p>
                  </div>
                  <div className="bg-[#F8FAFF] rounded-2xl p-6 border border-[#EFF6FF]">
                    <span className="text-[#9CA3AF] text-[12px] font-bold block mb-1">목표 달성</span>
                    <p className="text-[#2563EB] text-[17px] font-bold">{selectedInst.proposal.target}</p>
                  </div>
                </div>

              </section>
            )}

            {/* 교재 안내(MaterialGuide) 탭은 보류 — 되살리려면 탭 목록에 다시 넣으면 된다 */}

            {activeTab === 'curriculum' && (
              <InstructorCurriculum
                inst={selectedInst}
                userName={userName}
                targetScore={targetScore}
                rangeAxis={rangeAxis}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   맞춤 커리큘럼 — DB 정규 42강
   ───────────────────────────────────────
   강의 목록·총 강수는 전부 lectures 테이블에서 온다(하드코딩 주차표를 대체).
   문항 유무(수업 가능/준비 중)는 여기서 표시하지 않는다 — 이 화면의 강의는 클릭 대상이
   아니고, 커리큘럼은 "무엇을 배우는지"를 보여주는 자리다. 진입 게이팅은 /lessons 가 한다.
   ═══════════════════════════════════════ */
const PART_NAME: Record<number, string> = {
  1: '사진 묘사', 2: '질의·응답', 3: '짧은 대화', 4: '짧은 담화',
  5: '단문 빈칸', 6: '장문 빈칸', 7: '독해',
}

/* ── Study Plan 타임라인 ──
   기획 원문: "시험 예정일과 목표 점수를 기반으로 기간 내 목표 달성 수치를 시각화".
   점수 성장 곡선은 시작점(현재 점수·진단 레벨)이 있어야 그릴 수 있는데 온보딩이 그걸 안 받는다.
   그래서 받는 값(시험일·목표점수·커리큘럼 기간)만으로 그릴 수 있는 진도 타임라인으로 낸다.
   현재 점수 문항이 생기면 여기에 곡선을 얹으면 된다. */
function StudyPlanTimeline({
  userName, examDate, targetScore, curriculumDays, weeks,
}: {
  userName: string | null
  examDate: string | null
  targetScore: number | null
  curriculumDays: number
  weeks: { label: string; title: string }[]
}) {
  if (!examDate) return null

  const MS_DAY = 86400000
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dday = Math.max(0, Math.round((new Date(examDate).getTime() - today.getTime()) / MS_DAY))
  /* 커리큘럼은 시험 직전에 붙는다(1개월 완성반이 시험 한 달 전에 열리는 것과 같다).
     그래서 막대 왼쪽(오늘 쪽)은 아직 비어 있고, 오른쪽 끝에 커리큘럼 구간이 붙는다.
     — 왼쪽부터 채우면 이미 진행된 진도처럼 읽힌다. */
  const short = curriculumDays > dday
  const leadDays = Math.max(0, dday - curriculumDays)
  const coursePct = dday > 0 ? Math.min(100, Math.round((curriculumDays / dday) * 100)) : 100
  const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  const examLabel = fmt(new Date(examDate))
  const startLabel = fmt(new Date(new Date(examDate).getTime() - curriculumDays * MS_DAY))

  return (
    <div className="bg-white rounded-2xl border border-[#DBEAFE] p-6 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <span className="text-[#1C1B33] text-[16px] font-bold">
          {userName ? `${userName}님의 진도 계획` : '진도 계획'}
        </span>
        <span className="text-[#2563EB] text-[14px] font-bold">
          시험까지 {dday}일{targetScore ? ` · 목표 ${targetScore}점` : ''}
        </span>
      </div>

      {/* 오늘 → 시험일 막대. 커리큘럼(파랑)은 오른쪽 끝(시험일)에 붙는다 */}
      <div className="flex justify-between text-[11px] font-bold text-[#9CA3AF] mb-1.5">
        <span>오늘</span>
        <span>{examLabel} 시험</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-[#F3F4F6]">
        <div className="bg-[#F3F4F6]" style={{ width: `${100 - coursePct}%` }} />
        <div className="bg-[#2563EB]" style={{ width: `${coursePct}%` }} />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
        {!short && leadDays > 0 && (
          <span className="text-[12px] font-bold text-[#9CA3AF]">□ 시작 전 {leadDays}일</span>
        )}
        <span className="text-[12px] font-bold text-[#2563EB]">■ 커리큘럼 {curriculumDays}일</span>
      </div>

      <p className="text-[13px] leading-relaxed mt-3 pt-3 border-t border-[#EFF6FF]">
        {short ? (
          <span className="text-[#B45309] font-bold">
            커리큘럼이 {curriculumDays - dday}일 넘칩니다 — 시험일을 미루거나 진도를 당겨야 해요.
          </span>
        ) : leadDays > 0 ? (
          <span className="text-[#5B5A72]">
            <span className="text-[#1C1B33] font-bold">{startLabel}</span>부터 시작하면 시험일에 딱 맞아요.
            지금 시작하면 {leadDays}일 여유가 생깁니다.
          </span>
        ) : (
          <span className="text-[#5B5A72]">오늘 시작하면 시험일에 딱 맞아요.</span>
        )}
      </p>

      {/* 주차 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
        {weeks.map((w) => (
          <div key={w.label} className="bg-[#F8FAFF] rounded-xl px-3 py-2.5 border border-[#EFF6FF]">
            <span className="text-[#2563EB] text-[11px] font-bold block">{w.label}</span>
            <span className="text-[#1C1B33] text-[12px] font-semibold leading-snug line-clamp-2">{w.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* 학습 제안 배경 — 온보딩 응답(C/S · R/P · 목표점수)과 강사 전략을 조합해 만든다.
   예전 Study Plan 탭은 모든 강사·모든 사용자에게 같은 문구가 나갔다. 그 자리를 실제 응답으로 채운다. */
const DIFF_TEXT: Record<string, string> = {
  C: '어려운 문제에 부딪힐 때 실력이 붙는',
  S: '기본부터 안정적으로 쌓아가는',
}
const MOT_TEXT: Record<string, string> = {
  P: '목표 자극에 반응하는',
  R: '성취가 눈에 보일 때 움직이는',
}

function proposalBackground(
  userName: string | null, difficulty: string | null, motivation: string | null,
  targetScore: number | null, instName: string, strategy: string,
): string {
  const who = userName ? `${userName}님은` : '분석 결과'
  const traits = [difficulty && DIFF_TEXT[difficulty], motivation && MOT_TEXT[motivation]]
    .filter(Boolean).join(', ')
  const first = traits ? `${who} ${traits} 유형이에요.` : `${who} 아직 성향 진단 전이에요.`
  const goal = targetScore ? `목표 ${targetScore}점까지` : '목표 점수까지'
  return `${first} 그래서 ${instName} 강사는 ${goal} ${strategy}로 가는 설계를 제안합니다.`
}

function InstructorCurriculum({
  inst, userName, targetScore, rangeAxis,
}: {
  inst: {
    id: string
    name: string
    proposal: { plan: string; target: string }
    curriculum: { week: string; title: string; detail: string; part: string; goal: string }[]
  }
  userName: string | null
  targetScore: number | null
  rangeAxis: 'W' | 'N' | null
}) {
  const lectures = useCurriculumLectures()
  const [showAll, setShowAll] = useState(false)
  const pace = INST_PACE[inst.id] ?? { perWeek: 4, label: '' }

  /* 정규 커리큘럼만 — 데모 강의(RC-P7-99)는 seq 가 null 이라 함께 걸러진다 */
  const curriculum = useMemo(
    () => lectures
      .filter((l) => !l.isDemo && l.seq != null)
      .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)),
    [lectures],
  )

  const total = curriculum.length

  /* DB 로딩 실패·미연결이면 섹션 자체를 감춘다 — 빈 표를 보여주느니 없는 게 낫다 */
  if (!total) return null

  const weeks = Math.ceil(total / pace.perWeek)
  const perMonth = pace.perWeek * 4

  /* 강좌 요약 — 실제 YBM 강좌 표기(목표점수 / 주N회(월N회) / N주반)를 따른다.
     값은 전부 실측이다: 강수는 DB, 목표점수는 온보딩 응답, 회차는 INST_PACE 산술.
     '강의 구분(종합반/LC/RC)'은 뺐다 — 배치표가 이미 LC·RC를 다 담고 있어 중복이다. */
  /* 설계 시트가 있는 강사는 일자 배치(D1~D20)로, 없으면 42강 평면 목록으로 폴백한다 */
  const plan = getInstructorPlan(inst.id, rangeAxis)
  const planDays = plan ? plan.weeks.reduce((n, w) => n + w.days.length, 0) : 0

  const summary = plan
    ? [
        { label: '목표 점수', value: targetScore ? `${targetScore} 목표` : plan.headline.split(' · ')[1] ?? '진단 후 확정' },
        { label: '수업 횟수', value: `주 5일 (총 ${planDays}일)` },
        { label: '수강 기간', value: `${plan.weeks.length}주 완성` },
      ]
    : [
        { label: '목표 점수', value: targetScore ? `${targetScore} 목표` : '진단 후 확정' },
        { label: '수업 횟수', value: `주 ${pace.perWeek}회 (월 ${perMonth}회)` },
        { label: '수강 기간', value: `${weeks}주 완성` },
      ]

  return (
    <section className="bg-white rounded-3xl border border-[#DBEAFE] p-10">
      <h4 className="text-[#1C1B33] font-bold text-[20px] mb-1">
        {userName ? `${userName}님을 위한 맞춤 커리큘럼` : '맞춤 커리큘럼'}
      </h4>
      <p className="text-[#9CA3AF] text-[14px] mb-6">
        총 {total}강{plan ? ` · ${plan.headline}` : pace.label && ` · ${pace.label}`}
      </p>

      {/* 강좌 기본정보 */}
      <div className="grid grid-cols-3 gap-px bg-[#DBEAFE] border border-[#DBEAFE] rounded-2xl overflow-hidden mb-6">
        {summary.map((s) => (
          <div key={s.label} className="bg-white px-4 py-4">
            <span className="text-[#9CA3AF] text-[12px] font-bold block mb-1">{s.label}</span>
            <span className="text-[#1C1B33] text-[15px] font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {plan ? (
        <DayPlanView plan={plan} instName={inst.name} curriculum={curriculum} />
      ) : (
      <>
      {/* 설계 시트가 없는 강사 — 강사별 주차 설계를 보여준다.
          강 단위 배치는 콘텐츠팀 시트가 나오기 전까지 만들지 않는다(지어내면 실제 수업과 어긋난다). */}
      <div className="space-y-3">
        {inst.curriculum.map((w, i) => (
          <div key={i} className="border border-[#DBEAFE] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F8FAFF]">
              <span className="shrink-0 px-2.5 h-7 rounded-md bg-[#2563EB] text-white text-[12px] font-bold flex items-center">
                {w.week}
              </span>
              <span className="flex-1 min-w-0 text-[#1C1B33] text-[14px] font-bold">{w.title}</span>
              <span className="shrink-0 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-md border border-[#DBEAFE]">
                {w.part}
              </span>
            </div>
            <div className="px-5 py-4">
              <p className="text-[#5B5A72] text-[13px] leading-relaxed">{w.detail}</p>
              <p className="text-[#1C1B33] text-[13px] font-bold mt-2">
                <span className="text-[#2563EB]">목표</span> · {w.goal}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAll((v) => !v)}
        className="mt-4 w-full py-3 rounded-xl border border-[#DBEAFE] text-[#2563EB] text-[14px] font-bold hover:bg-[#F8FAFF] transition-colors"
      >
        {showAll ? '강의 목록 접기' : `전체 ${total}강 목록 보기`}
      </button>

      {showAll && (
      <ul className="mt-4 border border-[#DBEAFE] rounded-2xl divide-y divide-[#EFF6FF] overflow-hidden">
        {curriculum.map((l) => (
          <li key={l.code} className="flex items-center gap-4 px-5 py-4 bg-white">
            <span className="w-11 shrink-0 text-[12px] font-bold text-center text-[#2563EB]">
              {l.seq}강
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold truncate text-[#1C1B33]">
                {displayLecture(l.code, l.title).name}
              </p>
              <span className="text-[12px] text-[#6B7280]">
                {l.lcRc} Part {l.part} · {PART_NAME[l.part] ?? '-'}
              </span>
            </div>
          </li>
        ))}
      </ul>
      )}
      </>
      )}
    </section>
  )
}

/* ── 일자 배치(D1~D20) 뷰 ──
   주차 아코디언 + 설계 기준 접기로 세로 길이를 눌렀다. 강의 칩의 제목은
   전부 DB(curriculum) 조인 결과다 — 시트에는 강 번호만 있고 제목은 DB가 정본이다. */
function DayPlanView({
  plan, instName, curriculum,
}: { plan: InstructorPlan; instName: string; curriculum: DbLecture[] }) {
  const [openWeeks, setOpenWeeks] = useState<number[]>([1])

  const bySeq = useMemo(() => {
    const m = new Map<number, DbLecture>()
    for (const l of curriculum) if (l.seq != null) m.set(l.seq, l)
    return m
  }, [curriculum])

  const toggleWeek = (w: number) =>
    setOpenWeeks((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]))

  return (
    <div className="space-y-4">
      {/* 설계 기준(plan.principles) 노출은 보류 — 데이터는 instructorCurriculum.ts 에 남아 있다 */}

      {/* 주차별 일자 배치 */}
      {plan.weeks.map((w) => {
        const open = openWeeks.includes(w.week)
        return (
          <div key={w.week} className="border border-[#DBEAFE] rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleWeek(w.week)}
              className="w-full flex items-center gap-3 px-5 py-4 bg-[#F8FAFF] hover:bg-[#EFF6FF] transition-colors text-left"
            >
              <span className="shrink-0 w-12 h-7 rounded-md bg-[#2563EB] text-white text-[12px] font-bold flex items-center justify-center">
                {w.week}주차
              </span>
              <span className="flex-1 min-w-0 text-[#1C1B33] text-[14px] font-bold">{w.title}</span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5"
                className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {open && (
              <div>
                <ul className="divide-y divide-[#EFF6FF]">
                  {w.days.map((d) => (
                    <li key={d.day} className="px-5 py-4 flex flex-col md:flex-row md:gap-4">
                      <span className="shrink-0 md:w-12 text-[#9CA3AF] text-[12px] font-bold mb-2 md:mb-0 md:pt-1">
                        D{d.day}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2">
                          {d.items.map((item, i) => {
                            const seq = item.ref ? refToSeq(item.ref) : null
                            const lec = seq != null ? bySeq.get(seq) : undefined
                            /* 문항 유무(수업 가능/준비 중)는 표시하지 않는다 — 이 칩은 클릭이 안 되고,
                               커리큘럼은 "무엇을 배우는지"를 보여주는 자리다. 진입 게이팅은 /lessons 가 한다 */
                            const label = lec
                              ? displayLecture(lec.code, lec.title).name
                              : item.text ?? item.ref ?? ''
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border bg-white border-[#BFDBFE] text-[#1C1B33]"
                              >
                                {label}
                              </span>
                            )
                          })}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {d.review && (
                            <span className="text-[#9CA3AF] text-[12px]">복습 · {d.review}</span>
                          )}
                          {d.material && (
                            <span className="text-[#B45309] text-[12px] font-semibold bg-[#FEF9C3] px-2 py-0.5 rounded">
                              학습 자료 · {d.material}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {w.goal && (
                  <p className="px-5 py-3 bg-[#F8FAFF] text-[#5B5A72] text-[13px] leading-relaxed border-t border-[#EFF6FF]">
                    <span className="text-[#2563EB] font-bold">목표</span> · {w.goal}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}
