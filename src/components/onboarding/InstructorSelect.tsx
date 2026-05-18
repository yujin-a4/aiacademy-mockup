'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'

const INSTRUCTORS = [
  {
    id: 'park',
    image: '/instructor/park.png',
    name: '박혜원',
    badge: '단기 목표 전문',
    desc: '빠르고 집중적인 반복 훈련으로 단기 점수 상승',
    quote: '"이거 또 틀렸네. 패턴 외워."',
    badgeCls: 'bg-[#FEF9C3] text-[#B45309]',
    accentLeft: '#D97706',
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
    name: '장연지',
    badge: '꼼꼼 관리형',
    desc: '친근하고 꼼꼼한 1:1 코칭, 개념부터 탄탄하게',
    quote: '"헷갈릴 수 있어, 같이 보자."',
    badgeCls: 'bg-primary-50 text-primary',
    accentLeft: '#1A3FD4',
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
    greeting: "안녕하세요! 장연지입니다. 토익 공부, 혼자 하기 많이 힘들었죠? 제가 옆에서 하나하나 꼼꼼하게 도와줄게요."
  },
  {
    id: 'kim',
    image: '/img/와옹이_똑똑해.png',
    name: '김토익',
    badge: '균형 코칭형',
    desc: '현실적인 목표와 균형 잡힌 피드백',
    quote: '"틀렸어, 근데 이건 잘하고 있어."',
    badgeCls: 'bg-[#F3F4F6] text-[#374151]',
    accentLeft: '#6B7280',
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
    if (type === 'chat') {
      setTimeout(() => playTTS(inst.greeting, inst.id), 500)
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

  /* ── 강사 목록 ── */
  if (view === 'list') {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] px-4 py-10 animate-fade-in">
        <div className="max-w-[390px] mx-auto w-full flex-1 space-y-6">
          <header className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto flex items-center justify-center bg-primary-50 border border-primary-100 rounded-2xl animate-float">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A3FD4" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div>
              <h2 className="text-[#111318] font-bold text-[22px]">제안서 도착!</h2>
              <p className="text-[#6B7280] text-[14px] mt-1">{userName}님께 도착한 3개의 맞춤 제안서</p>
            </div>
          </header>

          <div className="space-y-3">
            {INSTRUCTORS.map((inst) => (
              <div key={inst.id} className="bg-white border border-[#D1D5DB] rounded-[14px] p-4 hover:border-[#8AA4F6] transition-colors">
                <div className="flex gap-3">
                  <div className="relative w-20 h-24 shrink-0 rounded-xl overflow-hidden bg-[#F3F4F6] border border-[#D1D5DB]">
                    <Image src={inst.image} alt={inst.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 py-0.5 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[#111318] font-bold text-[17px]">{inst.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-[4px] font-semibold ${inst.badgeCls}`}>{inst.badge}</span>
                      </div>
                      <p className="text-[#374151] text-[13px] leading-snug line-clamp-2">{inst.desc}</p>
                    </div>
                    <p className="text-[#6B7280] text-[11px] font-medium">{inst.quote}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button onClick={() => goToDetail('proposal', inst)} className="h-10 text-[13px] font-medium bg-[#F3F4F6] text-[#374151] rounded-[8px] hover:bg-primary-50 hover:text-primary transition-colors border border-[#D1D5DB]">
                    제안서
                  </button>
                  <button onClick={() => goToDetail('chat', inst)} className="h-10 text-[13px] font-medium bg-[#F3F4F6] text-[#374151] rounded-[8px] hover:bg-accent-light hover:text-accent transition-colors border border-[#D1D5DB]">
                    1분 대화
                  </button>
                  <button onClick={() => handleConfirm(inst.id)} className="h-10 text-[13px] font-semibold bg-primary-500 hover:bg-primary-400 text-white rounded-[8px] transition-colors active:scale-[0.98] flex items-center justify-center gap-1">
                    수업 시작
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── 제안서 / 채팅 뷰 ── */
  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] animate-fade-in">
      {/* 헤더 */}
      <header className="flex items-center px-4 py-3.5 bg-white border-b border-[#D1D5DB] sticky top-0 z-20">
        <button
          onClick={() => { setView('list'); setChatHistory([]); window.speechSynthesis.cancel() }}
          className="p-2 -ml-2 text-[#6B7280] hover:text-[#111318] transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h3 className="ml-2 text-[#111318] font-bold text-[17px]">
          {view === 'proposal' ? '제안서' : '1분 대화'}
        </h3>
      </header>

      <div className="flex-1 px-4 py-6 overflow-y-auto pb-40">
        <div className="max-w-[390px] mx-auto w-full">

          {/* ── 제안서 뷰 ── */}
          {view === 'proposal' && (
            <div className="space-y-5">
              <div className="text-center space-y-3">
                <div className="relative w-28 h-36 mx-auto rounded-2xl overflow-hidden border border-[#D1D5DB]">
                  <Image src={selectedInst.image} alt={selectedInst.name} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="text-[#111318] text-[22px] font-bold">{selectedInst.name}</h4>
                  <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-[4px] font-semibold ${selectedInst.badgeCls}`}>{selectedInst.badge}</span>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {selectedInst.proposal.tags.map((tag: string) => (
                    <span key={tag} className="text-[11px] px-2.5 py-1 bg-white text-[#6B7280] rounded-[4px] font-medium border border-[#D1D5DB]">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-5 space-y-5">
                <div>
                  <label className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-[0.15em] mb-2 block">추천 플랜</label>
                  <p className="text-[#111318] text-[22px] font-bold">{selectedInst.proposal.plan}</p>
                </div>
                <div className="h-px bg-[#F3F4F6]" />
                <div>
                  <label className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-[0.15em] mb-2 block">목표 달성</label>
                  <p className="text-[#111318] text-[22px] font-bold">{selectedInst.proposal.target}</p>
                </div>
              </div>

              <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-[11px] font-semibold bg-accent-light text-accent px-2 py-0.5 rounded-[4px]">AI 추천</span>
                  <span className="text-[#6B7280] text-xs">선생님 한마디</span>
                </div>
                <p className="text-[#374151] leading-relaxed font-medium text-[15px]">
                  "{selectedInst.proposal.comment}"
                </p>
              </div>
            </div>
          )}

          {/* ── 채팅 뷰 ── */}
          {view === 'chat' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="relative w-32 h-32 mx-auto">
                  {isRecording && <div className="absolute inset-[-12px] rounded-full border-2 border-primary/20 animate-ping" />}
                  {isTalking && <div className="absolute inset-[-8px] rounded-2xl border-4 border-primary/10 animate-pulse" />}
                  <div className={`relative w-full h-full rounded-2xl overflow-hidden border border-[#D1D5DB] transition-transform duration-500 ${isRecording ? 'scale-105' : 'scale-100'}`}>
                    <Image src={selectedInst.image} alt={selectedInst.name} fill className="object-cover" />
                  </div>
                </div>
                <div>
                  <h4 className="text-[#111318] text-[22px] font-bold">{selectedInst.name}</h4>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${isTalking ? 'bg-primary animate-pulse' : 'bg-[#10B981]'}`} />
                    <span className="text-[#6B7280] text-sm font-medium">
                      {isTalking ? '선생님이 말씀하시는 중...' : isRecording ? '듣고 있어요...' : '온라인 대화 가능'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 min-h-[120px]">
                {chatHistory.slice(-2).map((c, i) => (
                  <div key={i} className={`flex ${c.role === 'instructor' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] font-medium leading-relaxed ${
                      c.role === 'instructor' ? 'bg-white border border-[#D1D5DB] text-[#111318]' : 'bg-primary text-white'
                    }`}>
                      {c.text}
                    </div>
                  </div>
                ))}
                {sttText && (
                  <div className="flex justify-end animate-fade-in">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-[15px] font-medium bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]">
                      {sttText}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-widest text-center">도움이 필요하신가요?</p>
                {selectedInst.guideQuestions.map((q: string, i: number) => (
                  <button key={i} onClick={() => processConversation(q)} disabled={isTalking || isRecording}
                    className="w-full bg-white border border-[#D1D5DB] text-[#374151] px-4 py-3 rounded-[10px] text-[13px] font-medium text-left hover:border-primary hover:text-primary transition-colors active:scale-[0.98] disabled:opacity-50">
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 — 마이크 (채팅 전용) */}
      {view === 'chat' && (
        <div className="p-6 bg-white border-t border-[#D1D5DB] fixed bottom-0 left-0 w-full z-20 flex justify-center">
          <div className="max-w-[390px] w-full flex flex-col items-center gap-3">
            <button
              onMouseDown={startRecording} onMouseUp={stopRecording}
              onTouchStart={startRecording} onTouchEnd={stopRecording}
              disabled={isTalking}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 ${
                isRecording ? 'bg-[#EF4444] animate-pulse' : 'bg-primary-500 hover:bg-primary-400'
              }`}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            <p className="text-[#6B7280] text-xs font-medium">
              {isRecording ? '말씀을 끝내면 손을 떼주세요' : '버튼을 누른 채로 말씀하세요'}
            </p>
          </div>
        </div>
      )}

      {/* 하단 — 수업 시작 (제안서 뷰) */}
      {view === 'proposal' && (
        <div className="p-4 bg-white border-t border-[#D1D5DB] fixed bottom-0 left-0 w-full z-20">
          <div className="max-w-[390px] mx-auto">
            <button onClick={() => handleConfirm(selectedInst.id)} className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-11 font-semibold text-[15px] transition-colors active:scale-[0.98]">
              {selectedInst.name}과 함께 시작하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
