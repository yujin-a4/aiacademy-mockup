'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'

const INSTRUCTORS = [
  {
    id: 'park',
    image: '/instructor/park.png',
    emoji: '🔥',
    name: '박혜원',
    badge: '단기 목표 전문',
    desc: '빠르고 집중적인 반복 훈련으로 단기 점수 상승',
    quote: '"이거 또 틀렸네. 패턴 외워."',
    badgeCls: 'bg-red-50 text-red-600',
    accentLeft: '#EF4444',
    proposal: {
      plan: '4주 초집중 스피드 팩',
      target: 'Part 5 정답률 95% 달성',
      comment: '토익은 기세입니다. 저와 함께 숨 쉬듯 문제를 풀어내면 점수는 저절로 따라옵니다.',
      tags: ['#스파르타', '#패턴암기', '#단기완성'],
    },
    guideQuestions: [
      "선생님만의 단기 점수 상승 비결이 뭔가요?",
      "제가 기초가 많이 부족한데 따라갈 수 있을까요?",
      "하루에 몇 시간 정도 공부해야 하나요?"
    ],
    greeting: "반가워요! 박혜원입니다. 점수, 단기간에 확 올릴 준비 됐나요? 궁금한 게 있으면 물어보세요."
  },
  {
    id: 'jang',
    image: '/img/와옹이_열공.png',
    emoji: '🤝',
    name: '장연지',
    badge: '꼼꼼 관리형',
    desc: '친근하고 꼼꼼한 1:1 코칭, 개념부터 탄탄하게',
    quote: '"헷갈릴 수 있어, 같이 보자."',
    badgeCls: 'bg-blue-50 text-ybm-blue',
    accentLeft: '#2277F0',
    proposal: {
      plan: '8주 탄탄 개념 코스',
      target: '문법 기초 완벽 마스터',
      comment: '모르는 건 부끄러운 게 아니에요. 하나씩 짚어가며 튼튼한 점수를 만들어봐요.',
      tags: ['#개념위주', '#친절코칭', '#기초탄탄'],
    },
    guideQuestions: [
      "공부하다가 모르는 게 생기면 어떻게 질문하나요?",
      "의지가 약한데 잘 이끌어 주실 수 있나요?",
      "장연지 선생님 수업만의 특징은 무엇인가요?"
    ],
    greeting: "안녕하세요! 장연지입니다. 토익 공부, 혼자 하기 많이 힘들었죠? 제가 옆에서 하나하나 꼼꼼하게 도와줄게요. 😊"
  },
  {
    id: 'kim',
    image: '/img/와옹이_똑똑해.png',
    emoji: '💼',
    name: '김토익',
    badge: '균형 코칭형',
    desc: '현실적인 목표와 균형 잡힌 피드백',
    quote: '"틀렸어, 근데 이건 잘하고 있어."',
    badgeCls: 'bg-slate-100 text-slate-600',
    accentLeft: '#64748B',
    proposal: {
      plan: '6주 실용 득점 전략',
      target: '가성비 위주 핵심 공략',
      comment: '나올 것만 합니다. 바쁜 시간 쪼개서 하는 공부, 가장 효율적으로 점수 내드릴게요.',
      tags: ['#효율극대화', '#핵심요약', '#가성비토익'],
    },
    guideQuestions: [
      "직장인(학생)인데 가장 효율적인 공부법이 뭘까요?",
      "어떤 파트부터 집중적으로 공략해야 할까요?",
      "김토익 선생님의 실전 전략이 궁금합니다."
    ],
    greeting: "반갑습니다. 김토익입니다. 우리는 시간 낭비 없이 딱 나올 것만 합니다. 현실적인 목표부터 세워볼까요?"
  },
]

export default function InstructorSelect({ onNext }: { onNext: () => void }) {
  const { userName, setSelectedInstructor } = useOnboardingStore()
  const [view, setView] = useState<'list' | 'proposal' | 'chat'>('list')
  const [selectedInst, setSelectedInst] = useState<any>(null)
  
  // 음성 대화 관련 상태
  const [isTalking, setIsTalking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ role: 'instructor' | 'user', text: string }[]>([])
  const [sttText, setSttText] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  const handleConfirm = (id: string) => {
    setSelectedInstructor(id)
    onNext()
  }

  const goToDetail = (type: 'proposal' | 'chat', inst: any) => {
    setSelectedInst(inst)
    setView(type)
    setChatHistory([{ role: 'instructor', text: inst.greeting }])
    window.scrollTo(0, 0)
    
    // 첫 인사 발화 (사용자 인터랙션 직후이므로 가능)
    if (type === 'chat') {
      setTimeout(() => playTTS(inst.greeting, inst.id), 500)
    }
  }

  // TTS 호출 함수
  const playTTS = async (text: string, persona: string) => {
    // 이전 음성 중단
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    window.speechSynthesis.cancel()

    setIsTalking(true)

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona })
      })
      const data = await res.json()

      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        audioRef.current = audio
        audio.onended = () => setIsTalking(false)
        audio.onerror = () => setIsTalking(false)
        await audio.play()
      } else {
        // Fallback to native TTS
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'ko-KR'
        utterance.onend = () => setIsTalking(false)
        utterance.onerror = () => setIsTalking(false)
        window.speechSynthesis.speak(utterance)
      }
    } catch (e) {
      console.error('TTS failed', e)
      setIsTalking(false)
    }
  }

  // Gemini API 호출 및 대화 진행
  const processConversation = async (userMsg: string) => {
    if (!userMsg.trim() || isTalking) return
    
    setIsTalking(true)
    const newHistory = [...chatHistory, { role: 'user' as const, text: userMsg }]
    setChatHistory(newHistory)
    setSttText('')

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          persona: selectedInst.id,
          history: newHistory
        })
      })
      const data = await res.json()
      const instructorMsg = data.dialogue
      
      setChatHistory(prev => [...prev, { role: 'instructor', text: instructorMsg }])
      // playTTS 내부에서 setIsTalking(true)를 유지하므로 여기서 false로 돌리지 않음
      await playTTS(instructorMsg, selectedInst.id)
    } catch (e) {
      console.error('Conversation failed', e)
      setIsTalking(false)
    }
  }

  // STT 시작
  const startRecording = () => {
    if (isRecording || isTalking) return
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.interimResults = true
    
    recognition.onstart = () => setIsRecording(true)
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('')
      setSttText(transcript)
    }
    recognition.onend = () => {
      setIsRecording(false)
      // end 이벤트 시점에 sttText가 최신이 아닐 수 있어 transcript 변수를 따로 관리하거나 
      // result 이벤트에서 최종 결과인 경우에만 텍스트를 확정 짓는 방식이 안전함
    }
    
    // 최종 결과 처리
    recognition.onspeechend = () => {
      recognition.stop()
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  // 녹음 종료 및 대화 프로세스 시작
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      // 약간의 지연 후 텍스트 확인 및 처리
      setTimeout(() => {
        if (sttText) processConversation(sttText)
      }, 500)
    }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause()
      if (recognitionRef.current) recognitionRef.current.stop()
      window.speechSynthesis.cancel()
    }
  }, [])

  if (view === 'list') {
    return (
      <div className="flex flex-col min-h-screen bg-ybm-onboarding px-6 py-10 animate-fade-in relative overflow-hidden font-sans">
        <div className="absolute top-[-60px] right-[-40px] w-56 h-56 rounded-full bg-ybm-blue/5 blur-3xl pointer-events-none" />

        <div className="max-w-sm mx-auto w-full flex-1 space-y-8 z-10">
          <header className="text-center space-y-4 pb-2">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-float">
              <span className="text-3xl">📧</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-slate-900 font-extrabold text-2xl tracking-tight">제안서 도착!</h2>
              <p className="text-slate-500 text-sm font-medium">{userName}님께 도착한 3개의 맞춤 제안서</p>
            </div>
          </header>

          <div className="space-y-5">
            {INSTRUCTORS.map((inst) => (
              <div
                key={inst.id}
                className="bg-white border border-slate-200 rounded-[24px] p-4 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                {/* 배경 장식 */}
                <div 
                  className="absolute top-0 right-0 w-24 h-24 opacity-[0.03] pointer-events-none transition-transform group-hover:scale-110"
                  style={{ backgroundColor: inst.accentLeft, borderRadius: '0 0 0 100%' }}
                />

                <div className="flex gap-4">
                  {/* 사진 영역 */}
                  <div className="relative w-24 h-28 shrink-0 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-inner">
                    <Image
                      src={inst.image}
                      alt={inst.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>

                  {/* 텍스트 영역 */}
                  <div className="flex-1 py-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-extrabold text-lg">{inst.name}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-tight ${inst.badgeCls}`}>
                          {inst.badge}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[13px] leading-snug font-medium line-clamp-2">
                        {inst.desc}
                      </p>
                    </div>
                    <p className="text-slate-400 text-[11px] font-medium italic">
                      {inst.quote}
                    </p>
                  </div>
                </div>

                {/* 하단 액션 버튼 */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex gap-2">
                    <button
                      onClick={() => goToDetail('proposal', inst)}
                      className="flex-1 h-11 text-[12px] font-bold bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
                    >
                      제안서
                    </button>
                    <button
                      onClick={() => goToDetail('chat', inst)}
                      className="flex-1 h-11 text-[12px] font-bold bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
                    >
                      1분 대화
                    </button>
                  </div>
                  <button
                    onClick={() => handleConfirm(inst.id)}
                    className="h-11 text-[12px] font-bold bg-ybm-blue text-white rounded-xl shadow-sm active:scale-95 transition-all hover:opacity-95 flex items-center justify-center gap-1.5"
                  >
                    수업 시작
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-ybm-onboarding animate-fade-in font-sans">
      {/* 상단 헤더 */}
      <header className="flex items-center px-6 py-4 bg-white/80 border-b border-slate-200 backdrop-blur-md sticky top-0 z-20">
        <button
          onClick={() => { setView('list'); setChatHistory([]); window.speechSynthesis.cancel(); }}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="ml-2 text-slate-900 font-extrabold tracking-tight">
          {view === 'proposal' ? '📋 제안서' : '💬 1분 대화'}
        </h3>
      </header>

      <div className="flex-1 px-6 py-8 overflow-y-auto pb-48">
        <div className="max-w-sm mx-auto w-full">
          {view === 'proposal' ? (
            <div className="space-y-8">
              {/* 강사 헤더 */}
              <div className="text-center space-y-4">
                <div className="relative w-32 h-40 mx-auto rounded-[32px] overflow-hidden bg-white border-4 border-white shadow-xl animate-float">
                  <Image
                    src={selectedInst.image}
                    alt={selectedInst.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-slate-900 text-3xl font-extrabold tracking-tight">{selectedInst.name}</h4>
                  <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold ${selectedInst.badgeCls}`}>
                    {selectedInst.badge}
                  </span>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {selectedInst.proposal.tags.map((tag: string) => (
                    <span key={tag} className="text-[11px] px-2.5 py-1 bg-white text-slate-500 rounded-full font-bold border border-slate-100 shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 제안서 카드 */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-[32px] p-7 space-y-6 relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: selectedInst.accentLeft + '33' }} />
                  <div>
                    <label className="text-slate-400 text-[10px] font-extrabold uppercase tracking-[0.15em] mb-2.5 block">
                      추천 플랜
                    </label>
                    <p className="text-slate-900 text-2xl font-extrabold">{selectedInst.proposal.plan}</p>
                  </div>
                  <div className="h-px bg-slate-50" />
                  <div>
                    <label className="text-slate-400 text-[10px] font-extrabold uppercase tracking-[0.15em] mb-2.5 block">
                      목표 달성
                    </label>
                    <p className="text-slate-900 text-2xl font-extrabold">{selectedInst.proposal.target}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-[28px] p-7 relative">
                  <span className="absolute -top-3 left-7 bg-white border border-slate-200 text-ybm-blue text-[10px] font-extrabold px-3.5 py-1.5 rounded-full shadow-sm">
                    선생님 한마디
                  </span>
                  <p className="text-slate-600 leading-relaxed font-bold pt-2 text-[15px]">
                    "{selectedInst.proposal.comment}"
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 음성 대화 메인 비주얼 */}
              <div className="text-center space-y-6">
                <div className="relative w-40 h-40 mx-auto">
                  {/* 파형 애니메이션 (녹음 중일 때) */}
                  {isRecording && (
                    <div className="absolute inset-[-15px] rounded-full border-2 border-ybm-blue/20 animate-ping" />
                  )}
                  {isTalking && (
                    <div className="absolute inset-[-10px] rounded-[45px] border-4 border-ybm-blue/10 animate-pulse" />
                  )}
                  <div className={`relative w-full h-full rounded-[40px] overflow-hidden border-4 border-white shadow-2xl transition-transform duration-500 ${isRecording ? 'scale-110' : 'scale-100'}`}>
                    <Image
                      src={selectedInst.image}
                      alt={selectedInst.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-slate-900 text-2xl font-extrabold">{selectedInst.name}</h4>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isTalking ? 'bg-ybm-blue animate-pulse' : 'bg-success'}`} />
                    <span className="text-slate-500 text-sm font-bold">
                      {isTalking ? '선생님이 말씀하시는 중...' : isRecording ? '듣고 있어요...' : '온라인 대화 가능'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 채팅 메시지 (최근 대화만 말풍선으로) */}
              <div className="space-y-4 min-h-[120px]">
                {chatHistory.slice(-2).map((c, i) => (
                  <div key={i} className={`flex ${c.role === 'instructor' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-[24px] px-6 py-4 text-[15px] font-bold leading-relaxed shadow-sm ${
                      c.role === 'instructor' ? 'bg-white text-slate-800' : 'bg-ybm-blue text-white shadow-blue'
                    }`}>
                      {c.text}
                    </div>
                  </div>
                ))}
                {sttText && (
                  <div className="flex justify-end animate-fade-in">
                    <div className="max-w-[85%] rounded-[24px] px-6 py-4 text-[15px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
                      {sttText}
                    </div>
                  </div>
                )}
              </div>

              {/* 가이드 질문 */}
              <div className="space-y-3 pt-4">
                <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest text-center">도움이 필요하신가요?</p>
                <div className="flex flex-col gap-2">
                  {selectedInst.guideQuestions.map((q: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => processConversation(q)}
                      disabled={isTalking || isRecording}
                      className="bg-white border border-slate-100 text-slate-600 px-5 py-3.5 rounded-2xl text-[13px] font-bold text-left hover:bg-slate-50 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 컨트롤러 (1분 대화 전용) */}
      {view === 'chat' && (
        <div className="p-8 bg-white/80 backdrop-blur-xl border-t border-slate-100 fixed bottom-0 left-0 w-full z-20 flex justify-center">
          <div className="max-w-sm w-full flex flex-col items-center gap-4">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isTalking}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-50 ${
                isRecording ? 'bg-red-500 shadow-red-200 animate-pulse' : 'bg-ybm-blue shadow-blue-100'
              }`}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            <p className="text-slate-500 text-[12px] font-bold">
              {isRecording ? '말씀을 끝내면 손을 떼주세요' : '버튼을 누른 채로 말씀하세요'}
            </p>
          </div>
        </div>
      )}

      {/* 하단 버튼 (공통) */}
      {view !== 'chat' && (
        <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200 fixed bottom-0 left-0 w-full z-20">
          <div className="max-w-sm mx-auto">
            <button
              onClick={() => handleConfirm(selectedInst.id)}
              className="w-full bg-ybm-blue text-white rounded-[22px] h-[60px] font-extrabold text-lg shadow-blue active:scale-95 transition-all hover:opacity-95"
            >
              {selectedInst.name}과 함께 시작하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
