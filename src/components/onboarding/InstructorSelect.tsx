'use client'
import { useState, useEffect, useRef } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const INSTRUCTORS = [
  {
    id: 'park',
    name: '박혜원',
    tag: '#단기집중형',
    video: '/video/video-park.mp4',
    videoJiyun: '/video/video-park3.mp4',
    thumbnail: '/image_reference/park-2.jpg',
    badge: '단기 목표 전문',
    desc: '빠르고 집중적인 반복 훈련으로 단기 점수 상승을 이끌어냅니다.',
    quote: '"이거 또 틀렸네. 패턴 외워."',
    badgeCls: 'bg-[#FEF9C3] text-[#B45309]',
    matching: '99%',
    matchingDesc: '계획적인 학습 습관과 빠른 피드백을 선호하는 성향이 잘 맞아요.',
    recommendations: [
      '단기간에 점수를 올리고 싶은 분',
      '문법과 어휘에서 자주 틀리는 분',
      '반복 훈련으로 확실히 잡고 싶은 분',
    ],
    stats: { satisfaction: '4.9/5', students: '8,200+', avgIncrease: '+145점' },
    proposal: {
      plan: '4주 초집중 스피드 팩',
      target: 'Part 5 정답률 95% 달성',
      comment: '빠르고 집중적인 반복 훈련으로 Part 5 문법 약점과 빈출 어휘를 단기간에 잡아주는 튜터예요.',
      tags: ['#스파르타', '#연어', '#문법패턴', '#고득점전략', '#파트5전문'],
    },
    curriculum: [
      { week: '1주차', title: '핵심 빈출 어휘 정복', detail: '가장 많이 출제되는 Part 5 어휘와 연어(collocation)를 집중 암기합니다.', part: 'Part 5 어휘', goal: '정답률 65%+' },
      { week: '2주차', title: '문법 패턴 훈련', detail: '자주 틀리는 문법 패턴을 공식화하여 기계적으로 풀어내는 연습을 합니다.', part: 'Part 5 문법', goal: '정답률 70%+' },
      { week: '3주차', title: '오답 소거법 마스터', detail: '오답의 함정을 피하고 빠르게 소거하는 실전 노하우를 습득합니다.', part: 'Part 6/7 독해', goal: '정답률 75%+' },
      { week: '4주차', title: '실전 모의고사 3회', detail: '시간 제한 내에 풀이하는 강도 높은 실전 훈련으로 마무리합니다.', part: '실전 전 파트', goal: '750점 도달' },
    ],
    guideQuestions: [
      '선생님만의 단기 점수 상승 비결이 뭔가요?',
      '제가 기초가 많이 부족한데 따라갈 수 있을까요?',
      '하루에 몇 시간 정도 공부해야 하나요?',
    ],
    greeting: '반가워요! 박혜원입니다. 점수, 단기간에 확 올릴 준비 됐나요? 궁금한 게 있으면 물어보세요.',
  },
  {
    id: 'jang',
    name: '장연지',
    tag: '#꼼꼼관리형',
    video: '/video/video-jang.mp4',
    videoJiyun: '/video/video-jang2.mp4',
    thumbnail: '/image_reference/jang.png',
    badge: '꼼꼼 관리형',
    desc: '친근하고 꼼꼼한 코칭으로 기초 개념부터 탄탄하게 다져주는 파트너입니다.',
    quote: '"헷갈릴 수 있어, 같이 보자."',
    badgeCls: 'bg-[#EFF6FF] text-[#2563EB]',
    matching: '88%',
    matchingDesc: '꼼꼼하고 차근차근 배우고 싶어하는 성향에 잘 맞아요.',
    recommendations: [
      '기초부터 탄탄히 쌓고 싶은 분',
      '꼼꼼한 피드백이 필요한 분',
      '혼자 공부하기 어려운 분',
    ],
    stats: { satisfaction: '4.8/5', students: '6,100+', avgIncrease: '+120점' },
    proposal: {
      plan: '8주 탄탄 개념 코스',
      target: '문법 기초 완벽 마스터',
      comment: '모르는 건 부끄러운 게 아니에요. 하나씩 짚어가며 튼튼한 점수를 만들어봐요.',
      tags: ['#개념위주', '#친절코칭', '#기초탄탄'],
    },
    curriculum: [
      { week: '1~2주차', title: '동사와 시제 기초', detail: '문장의 뼈대가 되는 동사의 성질과 시제의 기본 개념을 확실히 잡습니다.', part: 'Part 5', goal: '정답률 60%+' },
      { week: '3~4주차', title: '품사 완벽 분해', detail: '명사, 대명사, 형용사, 부사의 쓰임과 위치를 구조적으로 이해합니다.', part: 'Part 5', goal: '정답률 65%+' },
      { week: '5~6주차', title: '문장의 확장', detail: '전치사구, 접속사, 관계대명사를 활용하여 길고 복잡한 문장을 분석합니다.', part: 'Part 6', goal: '정답률 70%+' },
      { week: '7~8주차', title: '독해 적용 훈련', detail: '배운 문법 개념을 Part 6, 7의 지문 속에서 실제로 확인하고 해석합니다.', part: 'Part 7', goal: '정답률 75%+' },
    ],
    guideQuestions: [
      '공부하다가 모르는 게 생기면 어떻게 질문하나요?',
      '의지가 약한데 잘 이끌어 주실 수 있나요?',
      '장연지 선생님 수업만의 특징은 무엇인가요?',
    ],
    greeting: '안녕하세요! 장연지입니다. 토익 공부, 혼자 하기 많이 힘들었죠? 제가 옆에서 하나하나 꼼꼼하게 도와줄게요.',
  },
  {
    id: 'kim',
    name: '김토익',
    tag: '#균형코칭형',
    video: '/video/video-kim.mp4',
    videoJiyun: '/video/video-kim2.mp4',
    thumbnail: '/image_reference/kim.png',
    badge: '균형 코칭형',
    desc: '바쁜 일상 속에서도 현실적인 목표와 가장 효율적인 가성비 전략을 제공합니다.',
    quote: '"틀렸어, 근데 이건 잘하고 있어."',
    badgeCls: 'bg-[#F0FDF4] text-[#059669]',
    matching: '85%',
    matchingDesc: '현실적이고 효율을 중시하는 성향에 잘 맞아요.',
    recommendations: [
      '바쁜 직장인·학생',
      '가성비 좋은 공부법을 원하는 분',
      '균형 잡힌 LC+RC 향상이 필요한 분',
    ],
    stats: { satisfaction: '4.7/5', students: '9,400+', avgIncrease: '+130점' },
    proposal: {
      plan: '6주 실용 득점 전략',
      target: '가성비 위주 핵심 공략',
      comment: '나올 것만 합니다. 바쁜 시간 쪼개서 하는 공부, 가장 효율적으로 점수 내드릴게요.',
      tags: ['#효율극대화', '#핵심요약', '#가성비토익'],
    },
    curriculum: [
      { week: '1주차', title: 'LC/RC 약점 진단', detail: '정밀한 진단 평가를 통해 가장 빠르고 효율적으로 점수를 올릴 파트를 탐색합니다.', part: '전 파트', goal: '약점 파악' },
      { week: '2~3주차', title: '핵심 득점 파트 집중', detail: '개인별 강점에 맞춰 점수 올리기 쉬운 파트(예: Part 2, 5)부터 공략합니다.', part: 'Part 2/5', goal: '정답률 75%+' },
      { week: '4~5주차', title: '오답 데이터 분석', detail: 'AI 리포트를 기반으로 반복적으로 틀리는 오답 유형만 집중적으로 리뷰합니다.', part: 'Part 6/7', goal: '정답률 70%+' },
      { week: '6주차', title: '실전 페이스 조절', detail: '2시간 연속 풀이 체력을 기르고, 시험장과 동일한 환경에서 전략을 점검합니다.', part: '전 파트', goal: '목표 점수 도달' },
    ],
    guideQuestions: [
      '직장인(학생)인데 가장 효율적인 공부법이 뭘까요?',
      '어떤 파트부터 집중적으로 공략해야 할까요?',
      '김토익 선생님의 실전 전략이 궁금합니다.',
    ],
    greeting: '반갑습니다. 김토익입니다. 우리는 시간 낭비 없이 딱 나올 것만 합니다. 현실적인 목표부터 세워볼까요?',
  },
  {
    id: 'jeong',
    name: '정은순',
    tag: '#감성멘토형',
    video: '/video/video-jung.mp4',
    videoJiyun: '/video/video-jung2.mp4',
    thumbnail: '/image_reference/jung.png',
    badge: '감성 멘토형',
    desc: '공감과 격려로 학습 동기를 꾸준히 유지시켜주는 따뜻한 멘토입니다.',
    quote: '"틀려도 괜찮아. 같이 다시 해보자."',
    badgeCls: 'bg-[#FFF7ED] text-[#C2410C]',
    matching: '89%',
    matchingDesc: '감정적 지지와 꾸준한 동기부여를 원하는 성향에 잘 맞아요.',
    recommendations: [
      '포기했다 다시 시작하는 분',
      '스트레스 없이 천천히 쌓고 싶은 분',
      '어휘를 이야기로 외우고 싶은 분',
    ],
    stats: { satisfaction: '4.9/5', students: '7,300+', avgIncrease: '+115점' },
    proposal: {
      plan: '10주 감성 몰입 코스',
      target: '어휘·독해 자신감 완성',
      comment: '암기가 아니라 이해로, 이해가 아니라 감각으로 토익을 익히는 방법을 알려드릴게요.',
      tags: ['#스토리텔링', '#감성학습', '#어휘완성', '#꾸준함'],
    },
    curriculum: [
      { week: '1~2주차', title: '연상 어휘 훈련', detail: '단어를 이야기와 이미지로 연결해 장기 기억에 자연스럽게 새깁니다.', part: 'Part 5/6', goal: '어휘 정확도 70%+' },
      { week: '3~4주차', title: '감정 독해법', detail: '지문의 흐름과 감정선을 파악하며 빠르게 핵심을 잡는 훈련을 합니다.', part: 'Part 7', goal: '독해 속도 향상' },
      { week: '5~7주차', title: '반복 패턴 내재화', detail: '자주 나오는 출제 패턴을 감각적으로 익혀 무의식적으로 반응하게 합니다.', part: 'Part 5/6', goal: '정답률 75%+' },
      { week: '8~10주차', title: '실전 적용 마무리', detail: '실전 모의고사와 오답 분석을 통해 실력을 점수로 전환합니다.', part: '전 파트', goal: '목표 점수 도달' },
    ],
    guideQuestions: [
      '어휘가 너무 안 외워지는데 어떻게 해야 할까요?',
      '공부하다 지칠 때 어떻게 동기 유지를 하나요?',
      '정은순 선생님만의 감성 학습법이 궁금해요.',
    ],
    greeting: '안녕하세요, 정은순입니다. 토익, 어렵고 지치죠? 괜찮아요. 우리 같이 천천히, 그렇지만 확실하게 해봐요.',
  },
  {
    id: 'lee',
    name: '이인호',
    tag: '#데이터기반형',
    video: '/video/video-lee.mp4',
    videoJiyun: '/video/video-lee2.mp4',
    thumbnail: '/image_reference/lee.png',
    badge: '데이터 기반형',
    desc: '출제 패턴 분석과 통계 기반 전략으로 최단 경로를 설계하는 전략가입니다.',
    quote: '"패턴이 보이면 점수가 보인다."',
    badgeCls: 'bg-[#EFF6FF] text-[#1D4ED8]',
    matching: '87%',
    matchingDesc: '논리적이고 체계적인 학습을 선호하는 성향에 잘 맞아요.',
    recommendations: [
      '이미 기초는 있지만 점수가 안 오르는 분',
      '왜 틀리는지 정확히 알고 싶은 분',
      '전략적으로 고득점을 노리는 분',
    ],
    stats: { satisfaction: '4.8/5', students: '5,600+', avgIncrease: '+160점' },
    proposal: {
      plan: '5주 데이터 드리븐 전략',
      target: '최빈 출제 유형 완전 정복',
      comment: '감으로 푸는 시대는 끝났어요. 출제 데이터와 오답 패턴으로 최단 경로를 짜드립니다.',
      tags: ['#패턴분석', '#데이터학습', '#고득점전략', '#오답제로'],
    },
    curriculum: [
      { week: '1주차', title: '출제 빈도 분석', detail: '최근 3년 기출 데이터를 분석해 고빈도 유형만 선별하여 학습 범위를 최소화합니다.', part: '전 파트', goal: '전략 수립' },
      { week: '2주차', title: 'LC 패턴 집중 공략', detail: '반복 출제되는 LC 함정 유형을 데이터로 정리해 오답 확률을 낮춥니다.', part: 'Part 1~4', goal: '정답률 80%+' },
      { week: '3~4주차', title: 'RC 공식 마스터', detail: '통계적으로 가장 자주 나오는 문법·어휘 공식을 체계적으로 정복합니다.', part: 'Part 5/6', goal: '정답률 85%+' },
      { week: '5주차', title: '오답 제로 마무리', detail: '개인 오답 데이터를 기반으로 취약 유형만 압축 반복해 실전에서 실수를 없앱니다.', part: '전 파트', goal: '목표 점수 도달' },
    ],
    guideQuestions: [
      '기출 패턴 분석, 어디서부터 시작하면 될까요?',
      '점수가 오르다가 정체되는 이유가 뭔가요?',
      '이인호 선생님의 데이터 학습법이 궁금합니다.',
    ],
    greeting: '안녕하세요, 이인호입니다. 감이 아닌 데이터로 공부해본 적 있나요? 한 번 해보면 다시는 예전 방식으로 못 돌아갑니다.',
  },
  {
    id: 'oh',
    name: '오정자',
    tag: '#시니어맞춤형',
    video: '/video/video-6.mp4',
    thumbnail: '/image_reference/ojungja.jpg',
    badge: '시니어 전용',
    desc: '30년 경력 국어 교사 출신. 절대 서두르지 않고, 절대 포기시키지 않는 토익계의 할머니.',
    quote: '"급하면 체해요. 천천히, 같이 봐요."',
    badgeCls: 'bg-[#FAF5FF] text-[#7C3AED]',
    matching: '99%',
    matchingDesc: '느긋한 설명과 무한한 인내심이 필요한 모든 분께 99% 이상 맞아요. (나머지 1%는 선생님이 졸릴 때)',
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
      { week: '3~5주차', title: '자주 나오는 단어 100개만', detail: '딱 100개만 해요. 100개. 매일 10개씩, 매번 복습. 나머지는 어차피 몰라도 돼요.', part: 'Part 5 어휘', goal: '핵심 어휘 암기' },
      { week: '6~9주차', title: '듣기는 천천히 들으면 돼요', detail: 'LC는 두 번 틀어드려요. 한 번은 그냥 듣고, 한 번은 받아쓰고. 요즘 세상 참 좋아졌어요.', part: 'Part 1~4', goal: 'LC 정답률 60%+' },
      { week: '10~12주차', title: '실전 모의고사 (화장실 먼저 다녀오고)', detail: '실제 시험 시간 맞춰 풀어봐요. 2시간 앉아있는 연습이 제일 중요해요.', part: '전 파트', goal: '500점 이상 달성' },
    ],
    guideQuestions: [
      '선생님, 영어가 너무 어려운데 저 같은 사람도 붙을 수 있을까요?',
      '외운 단어가 다음날이면 기억이 안 나요, 왜 그럴까요?',
      '시험 당일 긴장되면 어떻게 마음을 잡나요?',
    ],
    greeting: '어이구, 왔어요? 나 오정자예요. 걱정 마요, 내가 다 설명해줄게요. 몇 번이고. 정말이에요, 몇 번이고.',
  },
]


export default function InstructorSelect({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  const { userName, setSelectedInstructor, targetScore, studyRange, examDate } = useOnboardingStore()

  const showOjungja = targetScore === 600 && studyRange === 'LC' && examDate === '2026-12-27'
  const visibleInstructors = showOjungja ? INSTRUCTORS : INSTRUCTORS.filter(i => i.id !== 'oh')

  const [view, setView] = useState<'list' | 'detail'>('list')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({})
  const [isTablet, setIsTablet] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>(new Array(INSTRUCTORS.length).fill(null)) // 최대 크기로 고정
  const touchStartX = useRef(0)

  const [activeTab, setActiveTab] = useState<'proposal' | 'chat' | 'curriculum'>('proposal')
  const [selectedInst, setSelectedInst] = useState<(typeof INSTRUCTORS)[0] | null>(null)
  const [isTalking, setIsTalking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ role: 'instructor' | 'user'; text: string }[]>([])
  const [sttText, setSttText] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const tabSectionRef = useRef<HTMLDivElement | null>(null)

  /* ── video autoplay on focus change ── */
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === focusedIndex) {
        v.muted = isMuted
        v.currentTime = 0
        v.play().catch(() => {
          v.muted = true
          v.play().catch(() => {})
        })
      } else {
        v.pause()
      }
    })
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

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause()
      if (recognitionRef.current) recognitionRef.current.stop()
      window.speechSynthesis.cancel()
    }
  }, [])

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

  const handleConfirm = (id: string) => {
    setSelectedInstructor(id)
    window.location.href = '/dashboard'
  }

  const goToDetail = (inst: (typeof INSTRUCTORS)[0]) => {
    setSelectedInst(inst)
    setView('detail')
    setActiveTab('proposal')
    setChatHistory([{ role: 'instructor', text: inst.greeting }])
    window.scrollTo(0, 0)
  }

  const handleTabChange = (tab: 'proposal' | 'chat' | 'curriculum') => {
    setActiveTab(tab)
    if (tab === 'chat') {
      setTimeout(() => tabSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
    if (tab === 'chat' && chatHistory.length === 1 && selectedInst) {
      setTimeout(() => playTTS(selectedInst.greeting, selectedInst.id), 500)
    } else {
      if (audioRef.current) audioRef.current.pause()
      window.speechSynthesis.cancel()
    }
  }

  const playTTS = async (text: string, persona: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    window.speechSynthesis.cancel()
    setIsTalking(true)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
      })
      const data = await res.json()
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        audioRef.current = audio
        audio.onended = () => setIsTalking(false)
        audio.onerror = () => setIsTalking(false)
        await audio.play()
      } else {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'ko-KR'
        utterance.onend = () => setIsTalking(false)
        utterance.onerror = () => setIsTalking(false)
        window.speechSynthesis.speak(utterance)
      }
    } catch { setIsTalking(false) }
  }

  const processConversation = async (userMsg: string) => {
    if (!userMsg.trim() || isTalking || !selectedInst) return
    setIsTalking(true)
    const newHistory = [...chatHistory, { role: 'user' as const, text: userMsg }]
    setChatHistory(newHistory)
    setSttText('')
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, persona: selectedInst.id, history: newHistory }),
      })
      const data = await res.json()
      const instructorMsg = data.dialogue
      setChatHistory(prev => [...prev, { role: 'instructor', text: instructorMsg }])
      await playTTS(instructorMsg, selectedInst.id)
    } catch { setIsTalking(false) }
  }

  const startRecording = () => {
    if (isRecording || isTalking) return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { alert('이 브라우저는 음성 인식을 지원하지 않습니다.'); return }
    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.interimResults = true
    recognition.onstart = () => setIsRecording(true)
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('')
      setSttText(transcript)
    }
    recognition.onend = () => setIsRecording(false)
    recognition.onspeechend = () => recognition.stop()
    recognitionRef.current = recognition
    recognition.start()
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setTimeout(() => { if (sttText) processConversation(sttText) }, 500)
    }
  }

  /* ═══════════════════════════════════════
     LIST VIEW — 카드 슬라이드
  ═══════════════════════════════════════ */
  if (view === 'list') {
    const focused = visibleInstructors[focusedIndex]
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#EAF1FF] via-[#F3F4F6] to-[#F0F0F8] overflow-hidden select-none relative">
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
            AI 추천 강사를 선택해 주세요.
          </h1>
          <p className="text-[#6B7280] text-[13px] mt-1 text-center">카드를 좌우로 넘겨보세요.</p>
        </div>

        {/* Card Slider */}
        <div
          className="relative flex-shrink-0"
          style={{ height: isTablet ? '420px' : '340px' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {visibleInstructors.map((inst, i) => {
            const offset = wrappedOffset(i, focusedIndex, visibleInstructors.length)
            const absOffset = Math.abs(offset)
            const isActive = offset === 0
            const isVisible = isTablet ? absOffset <= 2 : absOffset <= 1

            const cardW = isTablet ? 220 : 220
            const cardH = isTablet ? 360 : 300
            const spacing = isTablet ? 215 : 200
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

                  {/* Match 배지 */}
                  <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-full text-[11px] font-bold pointer-events-none ${
                    inst.id === 'park'
                      ? 'bg-[#2563EB] text-white px-3 py-1 shadow-lg shadow-[#2563EB]/50'
                      : 'bg-black/40 backdrop-blur-sm text-white/65 px-2.5 py-[3px] font-medium'
                  }`}>
                    {`${inst.matching} Match`}
                  </div>

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
        <div className="text-center mt-5 px-6 transition-all duration-300">
          <h2 className="text-[#111318] text-[22px] font-bold">{focused.name}</h2>
          <p className="text-[#2563EB] text-[14px] font-semibold mt-1">{focused.tag}</p>
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
          onClick={() => { setView('list'); setChatHistory([]); window.speechSynthesis.cancel() }}
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
                <button
                  onClick={() => handleTabChange('chat')}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] py-3 rounded-xl font-bold text-[14px] transition-colors border border-[#DBEAFE] active:scale-[0.98]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  선생님과 상담하기
                </button>
              </div>

              {/* 정보 */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-[28px] font-black text-[#1C1B33]">{selectedInst.name}</h2>
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
                    <span className="text-[#2563EB] font-black text-[16px]">
                      {userName}님의 성향과 {selectedInst.matching} 매칭
                    </span>
                    <span className="text-[16px]"></span>
                  </div>
                  <p className="text-[#5B5A72] text-[14px] leading-relaxed">{selectedInst.matchingDesc}</p>
                </div>

                <p className="text-[#1C1B33] text-[15px] leading-relaxed font-medium">{selectedInst.proposal.comment}</p>

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
              </div>

              {/* 추천 & CTA */}
              <div className="w-full md:w-[280px] shrink-0 space-y-4">
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

                <div className="space-y-2.5">
                  <button
                    onClick={() => { setSelectedInstructor(selectedInst.id); window.location.href = 'https://aiacademy-classroom.vercel.app/' }}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-4 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#2563EB]/20"
                  >
                    샘플 수업 시작하기
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleConfirm(selectedInst.id)}
                    className="w-full bg-white border border-[#DBEAFE] text-[#2563EB] py-4 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 hover:bg-[#F8FAFF]"
                  >
                    이 강사 선택하기
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 탭 메뉴 */}
          <div ref={tabSectionRef} className="flex border-b border-[#DBEAFE] mb-8">
            {[
              { id: 'proposal', label: 'Study Plan' },
              { id: 'curriculum', label: '맞춤 교재' },
              { id: 'chat', label: '1분 대화' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as 'proposal' | 'chat' | 'curriculum')}
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

          {/* 탭 콘텐츠 */}
          <div className="animate-fade-in">
            {activeTab === 'proposal' && (
              <div className="bg-white rounded-3xl border border-[#DBEAFE] p-10">
                <div className="max-w-[720px] space-y-10">
                  <section>
                    <h4 className="text-[#1C1B33] font-black text-[20px] mb-4">학습 제안 배경</h4>
                    <p className="text-[#5B5A72] text-[16px] leading-relaxed">
                      {userName}님의 학습 패턴은 단기간에 집중하여 성과를 내는 것에 최적화되어 있습니다.
                      따라서 불필요한 이론 설명보다는 실전에서 바로 활용 가능한 패턴 위주의 학습을 제안합니다.
                    </p>
                  </section>
                  <section className="grid grid-cols-2 gap-8">
                    <div className="bg-[#F8FAFF] p-6 rounded-2xl border border-[#EFF6FF]">
                      <span className="text-[#9CA3AF] text-[12px] font-bold uppercase block mb-1">추천 플랜</span>
                      <p className="text-[#1C1B33] text-[18px] font-black">{selectedInst.proposal.plan}</p>
                    </div>
                    <div className="bg-[#F8FAFF] p-6 rounded-2xl border border-[#EFF6FF]">
                      <span className="text-[#9CA3AF] text-[12px] font-bold uppercase block mb-1">목표 달성</span>
                      <p className="text-[#2563EB] text-[18px] font-black">{selectedInst.proposal.target}</p>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'curriculum' && (
              <div className="bg-white rounded-3xl border border-[#DBEAFE] p-10 space-y-10">

                {/* ── 교재 카드 ── */}
                <div>
                  <h4 className="text-[#1C1B33] font-black text-[20px] mb-1">맞춤 교재</h4>
                  <p className="text-[#9CA3AF] text-[14px] mb-6">{userName}님을 위해 구성된 전용 교재예요.</p>

                  <div className="flex gap-7 items-start">
                    {/* 북 커버 — /public/curriculum-cover.png 로 이미지 교체 가능 */}
                    {/* 북커버 — /public/curriculum-cover.png 교체 시 자동 반영 */}
                    <div
                      className="relative w-[120px] shrink-0"
                      style={{ aspectRatio: '3/4', perspective: '600px' }}
                    >
                      {/* 두께감 레이어 (페이지 스택) */}
                      <div className="absolute inset-0 rounded-r-xl" style={{ background: 'linear-gradient(160deg, #1d4ed8, #60a5fa)', transform: 'translate(7px, 4px)', opacity: 0.28 }} />
                      <div className="absolute inset-0 rounded-r-xl" style={{ background: 'linear-gradient(160deg, #1e3faa, #3b82f6)', transform: 'translate(4px, 2px)', opacity: 0.45 }} />

                      {/* 메인 커버 */}
                      <div
                        className="absolute inset-0 rounded-r-xl overflow-hidden"
                        style={{
                          backgroundImage: "url('/curriculum-cover.png'), linear-gradient(160deg, #1E3A8A 0%, #2563EB 55%, #60A5FA 100%)",
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          transform: 'rotateY(-6deg)',
                          boxShadow: '-6px 10px 24px rgba(30,58,138,0.35)',
                        }}
                      >
                        {/* 책등 그림자 */}
                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/25" />
                        {/* 골드 장식 라인 */}
                        <div className="absolute inset-x-4 top-4 h-[1px] bg-amber-400/60" />
                        <div className="absolute inset-x-4 bottom-4 h-[1px] bg-amber-400/60" />
                        {/* 텍스트 — 볼드 없음 */}
                        <div className="absolute inset-0 flex flex-col justify-between p-4 pl-5">
                          <p className="text-white/50 text-[8px] uppercase tracking-widest">YBM AI TOEIC</p>
                          <div className="space-y-1">
                            <p className="text-white text-[12px] leading-snug drop-shadow">
                              {userName}님의<br />TOEIC {targetScore}<br />완성 교재
                            </p>
                            <p className="text-amber-300/80 text-[9px] mt-1">{selectedInst.name} 강사</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 교재 메타 정보 */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-[#9CA3AF] text-[11px] font-bold uppercase tracking-wide">교재명</p>
                        <p className="text-[#1C1B33] font-black text-[17px] leading-snug mt-0.5">
                          {userName}님의 TOEIC {targetScore} 완성 교재
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] text-[12px] font-bold rounded-lg border border-[#DBEAFE]">
                          {studyRange ?? 'LC+RC'}
                        </span>
                        <span className="px-2.5 py-1 bg-[#ECFDF5] text-[#059669] text-[12px] font-bold rounded-lg border border-[#D1FAE5]">
                          {selectedInst.proposal.plan}
                        </span>
                        <span className="px-2.5 py-1 bg-[#FFF7ED] text-[#C2410C] text-[12px] font-bold rounded-lg border border-[#FED7AA]">
                          목표 {targetScore}점
                        </span>
                      </div>

                      <div className="border-t border-[#F3F4F6] pt-3 space-y-1">
                        <p className="text-[#9CA3AF] text-[11px] font-bold uppercase tracking-wide">담당 강사</p>
                        <div className="flex items-center gap-2">
                          <img src={selectedInst.thumbnail} alt={selectedInst.name} className="w-7 h-7 rounded-full object-cover border-2 border-[#DBEAFE]" />
                          <span className="text-[#1C1B33] font-bold text-[14px]">{selectedInst.name} 강사</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${selectedInst.badgeCls}`}>{selectedInst.badge}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        <p className="text-emerald-600 text-[12px] font-bold">교재 구성이 완료되었습니다</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 목차 (로드맵) ── */}
                <div>
                  <h4 className="text-[#1C1B33] font-black text-[20px] mb-1">목차</h4>
                  <p className="text-[#9CA3AF] text-[14px] mb-6">단계별로 실력을 확실히 끌어올리는 학습 로드맵이에요.</p>
                  <div className="overflow-hidden border border-[#DBEAFE] rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFF] border-b border-[#DBEAFE]">
                          <th className="px-6 py-4 text-[13px] font-bold text-[#9CA3AF] w-20 text-center">주차</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-[#9CA3AF]">단원명</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-[#9CA3AF] w-40">집중 파트</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-[#9CA3AF] w-40">목표</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DBEAFE]">
                        {selectedInst.curriculum.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#F8FAFF]/50 transition-colors group cursor-pointer">
                            <td className="px-6 py-6 text-center">
                              <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] font-black text-[13px] flex items-center justify-center mx-auto">
                                {idx + 1}
                              </div>
                              <span className="text-[11px] font-bold text-[#9CA3AF] mt-1 block">{item.week}</span>
                            </td>
                            <td className="px-6 py-6">
                              <h5 className="text-[#1C1B33] font-bold text-[16px] mb-1">{item.title}</h5>
                              <p className="text-[#9CA3AF] text-[13px] leading-relaxed">{item.detail}</p>
                            </td>
                            <td className="px-6 py-6">
                              <span className="inline-block px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-[12px] font-bold rounded-lg border border-[#EDE9FE]">
                                {item.part || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex items-center justify-between group-hover:pr-2 transition-all">
                                <span className="text-[#1C1B33] text-[14px] font-bold">{item.goal || '-'}</span>
                                <svg className="text-[#D1D5DB] group-hover:text-[#2563EB] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M9 18l6-6-6-6"/>
                                </svg>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 flex items-center gap-2.5 px-5 py-4 bg-[#F8FAFF] rounded-xl border border-[#EFF6FF]">
                    <div className="w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-[10px] shrink-0">ℹ</div>
                    <p className="text-[#6B7280] text-[13px] font-medium">매주 학습 진행 상황을 분석하여 커리큘럼을 유연하게 조정해 드려요.</p>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'chat' && (
              <div className="bg-white rounded-3xl border border-[#DBEAFE] p-10 pb-20">
                <div className="max-w-[600px] mx-auto space-y-8">
                  <div className="text-center space-y-4">
                    <div className="relative w-24 h-24 mx-auto">
                      {isRecording && <div className="absolute inset-[-6px] rounded-full border-2 border-[#2563EB] animate-ping opacity-50" />}
                      {isTalking && <div className="absolute inset-[-3px] rounded-full border-[3px] border-[#2563EB] animate-pulse opacity-20" />}
                      <div className={`relative w-full h-full rounded-full overflow-hidden border-2 border-[#EFF6FF] bg-[#F3F4F6] transition-transform duration-500 ${isRecording ? 'scale-105' : 'scale-100'}`}>
                        <img src={selectedInst.thumbnail} alt={selectedInst.name} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isTalking ? 'bg-[#2563EB] animate-pulse' : 'bg-[#10B981]'}`} />
                      <span className="text-[#6B7280] text-[13px] font-bold">
                        {isTalking ? '선생님이 말씀하시는 중...' : isRecording ? '듣고 있어요...' : 'AI 온라인 대화 중'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 min-h-[200px]">
                    {chatHistory.slice(-4).map((c, i) => (
                      <div key={i} className={`flex ${c.role === 'instructor' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                        <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] font-medium leading-relaxed shadow-sm ${
                          c.role === 'instructor' ? 'bg-[#F8FAFF] border border-[#EFF6FF] text-[#1C1B33]' : 'bg-[#2563EB] text-white'
                        }`}>
                          {c.text}
                        </div>
                      </div>
                    ))}
                    {sttText && (
                      <div className="flex justify-end animate-fade-in">
                        <div className="max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] font-medium bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]">
                          {sttText}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <p className="text-[#9CA3AF] text-[11px] font-bold uppercase tracking-widest text-center mb-2">선생님께 물어보세요</p>
                    {selectedInst.guideQuestions.map((q: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => processConversation(q)}
                        disabled={isTalking || isRecording}
                        className="w-full bg-white border border-[#DBEAFE] text-[#374151] px-5 py-4 rounded-2xl text-[14px] font-bold text-left hover:border-[#2563EB] hover:text-[#2563EB] transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        &ldquo;{q}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
