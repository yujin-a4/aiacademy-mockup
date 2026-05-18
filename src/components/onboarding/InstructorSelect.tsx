'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useRouter } from 'next/navigation'

const INSTRUCTORS = [
  {
    id: 'park',
    image: '/instructor/park-2.jpg',
    name: '박혜원',
    badge: '단기 목표 전문',
    desc: '빠르고 집중적인 반복 훈련으로 단기 점수 상승을 이끌어냅니다.',
    quote: '"이거 또 틀렸네. 패턴 외워."',
    badgeCls: 'bg-[#FEF9C3] text-[#B45309]',
    accentLeft: '#D97706',
    proposal: {
      plan: '4주 초집중 스피드 팩',
      target: 'Part 5 정답률 95% 달성',
      comment: '토익은 기세입니다. 저와 함께 숨 쉬듯 문제를 풀어내면 점수는 저절로 따라옵니다.',
      tags: ['#스파르타', '#패턴암기', '#단기완성'],
    },
    curriculum: [
      { week: '1주차', title: '핵심 빈출 어휘 정복', detail: '가장 많이 출제되는 Part 5 어휘와 연어(collocation)를 집중 암기합니다.' },
      { week: '2주차', title: '문법 패턴 훈련', detail: '자주 틀리는 문법 패턴을 공식화하여 기계적으로 풀어내는 연습을 합니다.' },
      { week: '3주차', title: '오답 소거법 마스터', detail: '오답의 함정을 피하고 빠르게 소거하는 실전 노하우를 습득합니다.' },
      { week: '4주차', title: '실전 모의고사 3회', detail: '시간 제한 내에 풀이하는 강도 높은 실전 훈련으로 마무리합니다.' },
    ],
    guideQuestions: [
      "선생님만의 단기 점수 상승 비결이 뭔가요?",
      "제가 기초가 많이 부족한데 따라갈 수 있을까요?",
      "하루에 몇 시간 정도 공부해야 하나요?"
    ],
    greeting: "반가워요! 박혜원입니다. 점수, 단기간에 확 올릴 준비 됐나요? 궁금한 게 있으면 물어보세요."
  },
  {
    id: 'jang',
    image: '', 
    name: '장연지',
    badge: '꼼꼼 관리형',
    desc: '친근하고 꼼꼼한 코칭으로 기초 개념부터 탄탄하게 다져주는 파트너입니다.',
    quote: '"헷갈릴 수 있어, 같이 보자."',
    badgeCls: 'bg-[#EEF2FF] text-[#4F46E5]',
    accentLeft: '#1A3FD4',
    proposal: {
      plan: '8주 탄탄 개념 코스',
      target: '문법 기초 완벽 마스터',
      comment: '모르는 건 부끄러운 게 아니에요. 하나씩 짚어가며 튼튼한 점수를 만들어봐요.',
      tags: ['#개념위주', '#친절코칭', '#기초탄탄'],
    },
    curriculum: [
      { week: '1~2주차', title: '동사와 시제 기초', detail: '문장의 뼈대가 되는 동사의 성질과 시제의 기본 개념을 확실히 잡습니다.' },
      { week: '3~4주차', title: '품사 완벽 분해', detail: '명사, 대명사, 형용사, 부사의 쓰임과 위치를 구조적으로 이해합니다.' },
      { week: '5~6주차', title: '문장의 확장', detail: '전치사구, 접속사, 관계대명사를 활용하여 길고 복잡한 문장을 분석합니다.' },
      { week: '7~8주차', title: '독해 적용 훈련', detail: '배운 문법 개념을 Part 6, 7의 지문 속에서 실제로 확인하고 해석합니다.' },
    ],
    guideQuestions: [
      "공부하다가 모르는 게 생기면 어떻게 질문하나요?",
      "의지가 약한데 잘 이끌어 주실 수 있나요?",
      "장연지 선생님 수업만의 특징은 무엇인가요?"
    ],
    greeting: "안녕하세요! 장연지입니다. 토익 공부, 혼자 하기 많이 힘들었죠? 제가 옆에서 하나하나 꼼꼼하게 도와줄게요."
  },
  {
    id: 'kim',
    image: '',
    name: '김토익',
    badge: '균형 코칭형',
    desc: '바쁜 일상 속에서도 현실적인 목표와 가장 효율적인 가성비 전략을 제공합니다.',
    quote: '"틀렸어, 근데 이건 잘하고 있어."',
    badgeCls: 'bg-[#F0FDF4] text-[#059669]',
    accentLeft: '#6B7280',
    proposal: {
      plan: '6주 실용 득점 전략',
      target: '가성비 위주 핵심 공략',
      comment: '나올 것만 합니다. 바쁜 시간 쪼개서 하는 공부, 가장 효율적으로 점수 내드릴게요.',
      tags: ['#효율극대화', '#핵심요약', '#가성비토익'],
    },
    curriculum: [
      { week: '1주차', title: 'LC/RC 약점 진단', detail: '정밀한 진단 평가를 통해 가장 빠르고 효율적으로 점수를 올릴 파트를 탐색합니다.' },
      { week: '2~3주차', title: '핵심 득점 파트 집중', detail: '개인별 강점에 맞춰 점수 올리기 쉬운 파트(예: Part 2, 5)부터 공략합니다.' },
      { week: '4~5주차', title: '오답 데이터 분석', 상: 'AI 리포트를 기반으로 반복적으로 틀리는 오답 유형만 집중적으로 리뷰합니다.' },
      { week: '6주차', title: '실전 페이스 조절', detail: '2시간 연속 풀이 체력을 기르고, 시험장과 동일한 환경에서 전략을 점검합니다.' },
    ],
    guideQuestions: [
      "직장인(학생)인데 가장 효율적인 공부법이 뭘까요?",
      "어떤 파트부터 집중적으로 공략해야 할까요?",
      "김토익 선생님의 실전 전략이 궁금합니다."
    ],
    greeting: "반갑습니다. 김토익입니다. 우리는 시간 낭비 없이 딱 나올 것만 합니다. 현실적인 목표부터 세워볼까요?"
  },
]

// Video Component for "Harry Potter Portrait" effect
function MovingPortrait({ src, fallback, alt, className }: { src?: string, fallback: string, alt: string, className?: string }) {
  const [videoError, setVideoError] = useState(false)

  if (!src || videoError) {
    if (!fallback) {
      return <div className={`w-full h-full bg-[#E5E7EB] flex items-center justify-center ${className || ''}`} />
    }
    return <Image src={fallback} alt={alt} fill className={`object-cover ${className || ''}`} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.classList.add('bg-[#E5E7EB]') }} />
  }

  return (
    <video 
      src={src} 
      autoPlay 
      loop 
      muted 
      playsInline
      className={`absolute inset-0 w-full h-full object-cover ${className || ''}`}
      onError={() => setVideoError(true)}
    />
  )
}

export default function InstructorSelect({ onNext }: { onNext: () => void }) {
  const { userName, setSelectedInstructor } = useOnboardingStore()
  const router = useRouter()
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [activeTab, setActiveTab] = useState<'proposal' | 'chat' | 'curriculum'>('proposal')
  const [selectedInst, setSelectedInst] = useState<any>(null)

  const [isTalking, setIsTalking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ role: 'instructor' | 'user', text: string }[]>([])
  const [sttText, setSttText] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  const handleConfirm = (id: string) => {
    setSelectedInstructor(id)
    router.push('/classroom')
  }

  const goToDetail = (inst: any) => {
    setSelectedInst(inst)
    setView('detail')
    setActiveTab('proposal')
    setChatHistory([{ role: 'instructor', text: inst.greeting }])
    window.scrollTo(0, 0)
  }

  const handleTabChange = (tab: 'proposal' | 'chat' | 'curriculum') => {
    setActiveTab(tab)
    if (tab === 'chat' && chatHistory.length === 1) {
      setTimeout(() => playTTS(selectedInst.greeting, selectedInst.id), 500)
    } else {
      if (audioRef.current) { audioRef.current.pause() }
      window.speechSynthesis.cancel()
    }
  }

  const playTTS = async (text: string, persona: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    window.speechSynthesis.cancel()
    setIsTalking(true)
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, persona }) })
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
    } catch (e) { console.error('TTS failed', e); setIsTalking(false) }
  }

  const processConversation = async (userMsg: string) => {
    if (!userMsg.trim() || isTalking) return
    setIsTalking(true)
    const newHistory = [...chatHistory, { role: 'user' as const, text: userMsg }]
    setChatHistory(newHistory)
    setSttText('')
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg, persona: selectedInst.id, history: newHistory }) })
      const data = await res.json()
      const instructorMsg = data.dialogue
      setChatHistory(prev => [...prev, { role: 'instructor', text: instructorMsg }])
      await playTTS(instructorMsg, selectedInst.id)
    } catch (e) { console.error('Conversation failed', e); setIsTalking(false) }
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
      const transcript = Array.from(event.results).map((r: any) => r[0]).map((r: any) => r.transcript).join('')
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

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause()
      if (recognitionRef.current) recognitionRef.current.stop()
      window.speechSynthesis.cancel()
    }
  }, [])

  /* ── 강사 목록 (Grid 뷰 - 소형화 및 영상 적용) ── */
  if (view === 'list') {
    return (
      <div className="flex flex-col min-h-screen bg-[#F8FAFF] px-6 py-12 animate-fade-in font-sans">
        <div className="max-w-[840px] mx-auto w-full flex-1">
          <header className="text-center space-y-3 mb-10">
            <div className="inline-flex items-center gap-2 bg-[#EEF2FF] text-[#4F46E5] font-bold text-[12px] px-3 py-1.5 rounded-full mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
              AI 매칭 리포트
            </div>
            <h1 className="text-[#1C1B33] font-black text-[22px] md:text-[26px] leading-tight">최고의 성과를 함께할 파트너를 선택하세요</h1>
            <p className="text-[#6B7280] text-[13px] md:text-[14px] mt-2">당신의 학습 패턴과 성향을 바탕으로, 가장 큰 시너지를 줄 수 있는 AI 휴먼들입니다.</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-20">
            {INSTRUCTORS.map((inst) => (
              <div 
                key={inst.id} 
                onClick={() => goToDetail(inst)}
                className="bg-white rounded-[20px] border border-[#ECEAF5] hover:border-[#8AA4F6] transition-all overflow-hidden flex flex-col shadow-sm hover:shadow-md cursor-pointer group"
              >
                <div className="relative aspect-[4/5] w-full bg-[#F3F4F6] overflow-hidden">
                  <MovingPortrait src={inst.video} fallback={inst.image} alt={inst.name} className="group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-[#F59E0B] to-[#FCD34D] text-white font-bold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    ✨ 최적의 매치
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className={`font-bold text-[12px] ${inst.badgeCls.split(' ')[1]}`}>{inst.badge}</p>
                    <h3 className="text-[18px] md:text-[20px] font-black text-[#1C1B33] mt-0.5">{inst.name}</h3>
                    <p className="text-[#6B7280] text-[13px] mt-2.5 leading-relaxed line-clamp-3">{inst.desc}</p>
                  </div>
                  <button className="w-full mt-5 bg-[#EEF2FF] text-[#4F46E5] font-bold py-2.5 rounded-xl group-hover:bg-[#4F46E5] group-hover:text-white transition-colors text-[13px]">
                    상세 프로필 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── 제안서 / 탭 뷰 ── */
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFF] animate-fade-in font-sans pb-32">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-[#ECEAF5] sticky top-0 z-30 shadow-sm">
        <button
          onClick={() => { setView('list'); setChatHistory([]); window.speechSynthesis.cancel() }}
          className="p-2 -ml-2 text-[#6B7280] hover:text-[#111318] transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h3 className="text-[#1C1B33] font-bold text-[16px]">
          상세 프로필
        </h3>
        <div className="w-10" />
      </header>

      {/* 강사 기본 정보 헤더 영역 */}
      <div className="bg-white px-6 py-6 border-b border-[#ECEAF5]">
        <div className="max-w-[600px] mx-auto flex flex-col items-center text-center">
          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-[#EEF2FF] shadow-sm mb-3 bg-[#F3F4F6]">
            <MovingPortrait src={selectedInst.video} fallback={selectedInst.image} alt={selectedInst.name} />
          </div>
          <h2 className="text-[24px] font-black text-[#1C1B33]">{selectedInst.name}</h2>
          <span className={`inline-block mt-1.5 text-[12px] px-2.5 py-0.5 rounded-full font-bold ${selectedInst.badgeCls}`}>{selectedInst.badge}</span>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="sticky top-[58px] z-20 bg-white/90 backdrop-blur-md border-b border-[#ECEAF5]">
        <div className="max-w-[600px] mx-auto flex">
          {[
            { id: 'proposal', label: '제안서' },
            { id: 'curriculum', label: '맞춤 커리큘럼' },
            { id: 'chat', label: '1분 대화' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex-1 py-3.5 text-[14px] font-bold transition-all relative ${
                activeTab === tab.id ? 'text-[#4F46E5]' : 'text-[#9CA3AF] hover:text-[#6B7280]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#4F46E5] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 px-4 py-6">
        <div className="max-w-[600px] mx-auto w-full">

          {/* ── 1. 제안서 뷰 ── */}
          {activeTab === 'proposal' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-wrap gap-2">
                {selectedInst.proposal.tags.map((tag: string) => (
                  <span key={tag} className="text-[12px] px-2.5 py-1 bg-white text-[#4F46E5] rounded-full font-bold border border-[#C7D2FE] shadow-sm">{tag}</span>
                ))}
              </div>

              <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#ECEAF5]">
                <div>
                  <label className="text-[#9CA3AF] text-[11px] font-bold uppercase tracking-widest mb-1 block">추천 플랜</label>
                  <p className="text-[#1C1B33] text-[20px] font-black">{selectedInst.proposal.plan}</p>
                </div>
                <div className="h-px bg-[#ECEAF5] my-5" />
                <div>
                  <label className="text-[#9CA3AF] text-[11px] font-bold uppercase tracking-widest mb-1 block">목표 달성</label>
                  <p className="text-[#4F46E5] text-[20px] font-black">{selectedInst.proposal.target}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] rounded-[20px] p-5 shadow-sm border border-[#C7D2FE]">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-[18px]">💬</span>
                  <span className="text-[#4F46E5] font-bold text-[13px]">선생님의 코멘트</span>
                </div>
                <p className="text-[#1C1B33] leading-relaxed font-medium text-[15px]">
                  "{selectedInst.proposal.comment}"
                </p>
              </div>
            </div>
          )}

          {/* ── 2. 맞춤 커리큘럼 뷰 ── */}
          {activeTab === 'curriculum' && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="text-[#1C1B33] font-bold text-[16px] mb-3">맞춤 로드맵</h4>
              {selectedInst.curriculum.map((item: any, idx: number) => (
                <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-[#ECEAF5] flex gap-3">
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] font-black text-[12px]">
                      {idx + 1}
                    </div>
                    {idx !== selectedInst.curriculum.length - 1 && (
                      <div className="w-[1.5px] h-full bg-[#E0E7FF] mt-1.5" />
                    )}
                  </div>
                  <div className="pb-1">
                    <span className="text-[#6B7280] font-bold text-[11px] uppercase">{item.week}</span>
                    <h5 className="text-[#1C1B33] font-bold text-[15px] mt-0.5">{item.title}</h5>
                    <p className="text-[#6B7280] text-[13px] mt-1.5 leading-relaxed">{item.detail || item.상}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── 3. 1분 대화 뷰 ── */}
          {activeTab === 'chat' && (
            <div className="space-y-5 animate-fade-in pb-20">
              <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#ECEAF5] text-center space-y-3">
                <div className="relative w-20 h-20 mx-auto">
                  {isRecording && <div className="absolute inset-[-6px] rounded-full border-2 border-[#4F46E5] animate-ping opacity-50" />}
                  {isTalking && <div className="absolute inset-[-3px] rounded-full border-[3px] border-[#4F46E5] animate-pulse opacity-20" />}
                  <div className={`relative w-full h-full rounded-full overflow-hidden border-2 border-[#EEF2FF] transition-transform duration-500 ${isRecording ? 'scale-105' : 'scale-100'} bg-[#F3F4F6]`}>
                    <MovingPortrait src={selectedInst.video} fallback={selectedInst.image} alt={selectedInst.name} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isTalking ? 'bg-[#4F46E5] animate-pulse' : 'bg-[#10B981]'}`} />
                    <span className="text-[#6B7280] text-[13px] font-bold">
                      {isTalking ? '선생님이 말씀하시는 중...' : isRecording ? '듣고 있어요...' : 'AI 온라인 대화 중'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 min-h-[140px]">
                {chatHistory.slice(-2).map((c, i) => (
                  <div key={i} className={`flex ${c.role === 'instructor' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] font-medium leading-relaxed shadow-sm ${
                      c.role === 'instructor' ? 'bg-white border border-[#ECEAF5] text-[#1C1B33]' : 'bg-[#4F46E5] text-white'
                    }`}>
                      {c.text}
                    </div>
                  </div>
                ))}
                {sttText && (
                  <div className="flex justify-end animate-fade-in">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-[14px] font-medium bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]">
                      {sttText}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-6">
                <p className="text-[#9CA3AF] text-[11px] font-bold uppercase tracking-widest text-center mb-3">어떤 내용이 궁금하신가요?</p>
                {selectedInst.guideQuestions.map((q: string, i: number) => (
                  <button key={i} onClick={() => processConversation(q)} disabled={isTalking || isRecording}
                    className="w-full bg-white border border-[#ECEAF5] text-[#374151] px-4 py-3.5 rounded-xl text-[13px] font-bold text-left hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm">
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 CTA 영역 */}
      <div className="p-4 bg-white/95 backdrop-blur-md border-t border-[#ECEAF5] fixed bottom-0 left-0 w-full z-40">
        <div className="max-w-[600px] mx-auto flex items-center gap-2.5">
          
          {/* 마이크 버튼 (채팅 탭에서만 활성화) */}
          {activeTab === 'chat' && (
            <button
              onMouseDown={startRecording} onMouseUp={stopRecording}
              onTouchStart={startRecording} onTouchEnd={stopRecording}
              disabled={isTalking}
              className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shadow-sm ${
                isRecording ? 'bg-[#EF4444] animate-pulse' : 'bg-white border border-[#ECEAF5] hover:border-[#4F46E5]'
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isRecording ? 'white' : '#4F46E5'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isRecording ? (
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="white" />
                ) : (
                  <>
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
                  </>
                )}
              </svg>
            </button>
          )}

          <button 
            onClick={() => handleConfirm(selectedInst.id)} 
            className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl h-12 font-bold text-[15px] transition-colors active:scale-[0.98] shadow-md shadow-[#4F46E5]/20 flex items-center justify-center gap-1.5"
          >
            샘플 수업 시작하기
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
