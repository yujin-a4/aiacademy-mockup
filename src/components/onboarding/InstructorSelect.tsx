'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'

const INSTRUCTORS = [
  {
    id: 'driller',
    emoji: '🔥',
    name: '드릴러',
    badge: '단기 목표 전문',
    desc: '빠르고 집중적인 반복 훈련으로 단기 점수 상승',
    quote: '"이거 또 틀렸네. 패턴 외워."',
    activeBorder: 'border-navy-mid',
    badgeCls: 'bg-dark-navy text-white',
    proposal: {
      plan: '4주 초집중 스피드 팩',
      target: 'Part 5 정답률 95% 달성',
      comment: '토익은 기세입니다. 저와 함께 숨 쉬듯 문제를 풀어내면 점수는 저절로 따라옵니다.',
      tags: ['#스파르타', '#패턴암기', '#단기완성']
    },
    chat: [
      { role: 'instructor', text: '반가워요! 점수, 단기간에 확 올리고 싶죠?' },
      { role: 'user', text: '네! 기초는 부족한데 가능할까요?' },
      { role: 'instructor', text: '그럼요. 이해보다 먼저 패턴을 몸에 익히게 해줄게요. 준비됐나요?' }
    ]
  },
  {
    id: 'mentor',
    emoji: '🤝',
    name: '멘토',
    badge: '꼼꼼 관리형',
    desc: '친근하고 꼼꼼한 1:1 코칭, 개념부터 탄탄하게',
    quote: '"헷갈릴 수 있어, 같이 보자."',
    activeBorder: 'border-waong-lavender',
    badgeCls: 'bg-waong-lavender text-dark-navy',
    proposal: {
      plan: '8주 탄탄 개념 코스',
      target: '문법 기초 완벽 마스터',
      comment: '모르는 건 부끄러운 게 아니에요. 하나씩 짚어가며 튼튼한 점수를 만들어봐요.',
      tags: ['#개념위주', '#친절코칭', '#기초탄탄']
    },
    chat: [
      { role: 'instructor', text: '안녕하세요! 토익 공부, 혼자 하기 많이 힘들었죠?' },
      { role: 'user', text: '네, 문법이 너무 헷갈려요.' },
      { role: 'instructor', text: '걱정 마세요. 제가 옆에서 아주 쉽게, 원리부터 설명해 드릴게요.' }
    ]
  },
  {
    id: 'realist',
    emoji: '💼',
    name: '리얼리스트',
    badge: '균형 코칭형',
    desc: '현실적인 목표와 균형 잡힌 피드백',
    quote: '"틀렸어, 근데 이건 잘하고 있어."',
    activeBorder: 'border-charcoal',
    badgeCls: 'bg-light-gray text-charcoal',
    proposal: {
      plan: '6주 실용 득점 전략',
      target: '가성비 위주 핵심 공략',
      comment: '나올 것만 합니다. 바쁜 시간 쪼개서 하는 공부, 가장 효율적으로 점수 내드릴게요.',
      tags: ['#효율극대화', '#핵심요약', '#가성비토익']
    },
    chat: [
      { role: 'instructor', text: '반가워요. 하루에 얼마나 공부할 수 있나요?' },
      { role: 'user', text: '퇴근하고 30분 정도요.' },
      { role: 'instructor', text: '충분합니다. 시험에 무조건 나오는 것만 딱 골라서 집중하죠.' }
    ]
  },
]

export default function InstructorSelect({ onNext }: { onNext: () => void }) {
  const { userName, setSelectedInstructor } = useOnboardingStore()
  const [view, setView] = useState<'list' | 'proposal' | 'chat'>('list')
  const [selectedInst, setSelectedInst] = useState<any>(null)

  const handleConfirm = (id: string) => {
    setSelectedInstructor(id)
    onNext()
  }

  const goToDetail = (type: 'proposal' | 'chat', inst: any) => {
    setSelectedInst(inst)
    setView(type)
    window.scrollTo(0, 0)
  }

  if (view === 'list') {
    return (
      <div className="flex flex-col min-h-screen bg-off-white px-6 py-10 animate-fade-in">
        <div className="max-w-sm mx-auto w-full flex-1 space-y-6">
          <header className="text-center space-y-4 pb-4">
            <div className="relative w-20 h-20 mx-auto animate-float">
              <Image src="/img/와옹이_궁금.png" alt="와옹이" fill className="object-contain" />
            </div>
            <div className="space-y-1">
              <h2 className="text-dark-navy font-extrabold text-2xl tracking-tight uppercase font-display italic">Special Offers</h2>
              <p className="text-mid-gray text-sm font-medium">{userName}님께 도착한 3개의 제안서</p>
            </div>
          </header>

          <div className="space-y-4">
            {INSTRUCTORS.map((inst) => (
              <div key={inst.id} className="bg-white border border-light-gray rounded-default p-5 shadow-low flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <span className="text-5xl">{inst.emoji}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-dark-navy font-bold text-lg">{inst.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-sharp font-bold ${inst.badgeCls}`}>
                        {inst.badge}
                      </span>
                    </div>
                    <p className="text-charcoal/70 text-sm leading-snug">{inst.desc}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => goToDetail('proposal', inst)} className="h-10 text-[11px] font-bold border border-light-gray text-charcoal rounded-default hover:bg-off-white transition-colors">의뢰서</button>
                  <button onClick={() => goToDetail('chat', inst)} className="h-10 text-[11px] font-bold border border-light-gray text-charcoal rounded-default hover:bg-off-white transition-colors">1분 대화</button>
                  <button onClick={() => handleConfirm(inst.id)} className="h-10 text-[11px] font-bold bg-dark-navy text-white rounded-default shadow-low active:scale-95 transition-transform">수업 시작</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-off-white animate-fade-in">
      <header className="flex items-center p-6 bg-white border-b border-light-gray sticky top-0 z-20">
        <button onClick={() => setView('list')} className="p-2 -ml-2 text-dark-navy/40 hover:text-dark-navy">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h3 className="ml-2 text-dark-navy font-extrabold tracking-tight uppercase font-display italic">
          {view === 'proposal' ? 'Proposal' : 'Chat Sample'}
        </h3>
      </header>

      <div className="flex-1 px-6 py-8 overflow-y-auto pb-32">
        <div className="max-w-sm mx-auto w-full">
          {view === 'proposal' ? (
            <div className="space-y-10">
              <div className="text-center space-y-4">
                <span className="text-8xl block animate-float">{selectedInst.emoji}</span>
                <div className="space-y-1">
                  <h4 className="text-dark-navy text-3xl font-extrabold tracking-tight italic uppercase font-display">{selectedInst.name}</h4>
                  <p className="text-waong-lavender font-bold text-lg">{selectedInst.badge}</p>
                </div>
                <div className="flex justify-center gap-2">
                  {selectedInst.proposal.tags.map((tag: string) => (
                    <span key={tag} className="text-[11px] px-2 py-1 bg-light-gray text-mid-gray rounded-sharp font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white border border-light-gray rounded-default p-6 space-y-5 shadow-low relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-dark-navy" />
                  <div>
                    <label className="text-mid-gray text-[10px] font-bold uppercase tracking-widest mb-1 block">Recommended Plan</label>
                    <p className="text-dark-navy text-xl font-bold italic">{selectedInst.proposal.plan}</p>
                  </div>
                  <div className="h-px bg-light-gray" />
                  <div>
                    <label className="text-mid-gray text-[10px] font-bold uppercase tracking-widest mb-1 block">Expected Goal</label>
                    <p className="text-dark-navy text-xl font-bold italic">{selectedInst.proposal.target}</p>
                  </div>
                </div>

                <div className="bg-waong-lavender/10 border-2 border-dashed border-waong-lavender/30 rounded-default p-6 relative">
                  <span className="absolute -top-3 left-6 bg-waong-lavender text-white text-[10px] font-extrabold px-3 py-1 rounded-sharp shadow-low">INSTRUCTOR'S MESSAGE</span>
                  <p className="text-charcoal leading-relaxed italic font-medium pt-2">
                    "{selectedInst.proposal.comment}"
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-4 bg-white p-4 rounded-default shadow-low border border-light-gray">
                <span className="text-4xl">{selectedInst.emoji}</span>
                <div>
                  <p className="text-dark-navy font-bold text-lg leading-none">{selectedInst.name}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-mid-gray text-xs font-bold">Online Now</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-5">
                {selectedInst.chat.map((c: any, i: number) => (
                  <div key={i} className={`flex ${c.role === 'instructor' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-default px-5 py-3.5 text-[15px] font-medium leading-relaxed shadow-low ${
                      c.role === 'instructor' 
                        ? 'bg-white text-dark-navy border border-light-gray' 
                        : 'bg-dark-navy text-white'
                    }`}>
                      {c.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-light-gray fixed bottom-0 left-0 w-full z-20">
        <div className="max-w-sm mx-auto">
          <button
            onClick={() => handleConfirm(selectedInst.id)}
            className="w-full bg-dark-navy text-white rounded-default h-[56px] font-bold text-lg shadow-mid active:scale-95 transition-transform uppercase tracking-wider italic"
          >
            Start with {selectedInst.name}
          </button>
        </div>
      </div>
    </div>
  )
}
