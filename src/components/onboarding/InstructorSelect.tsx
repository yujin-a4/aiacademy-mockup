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
    badgeCls: 'bg-white/20 text-white',
    accentLeft: '#FFFFFF',
    proposal: {
      plan: '4주 초집중 스피드 팩',
      target: 'Part 5 정답률 95% 달성',
      comment: '토익은 기세입니다. 저와 함께 숨 쉬듯 문제를 풀어내면 점수는 저절로 따라옵니다.',
      tags: ['#스파르타', '#패턴암기', '#단기완성'],
    },
    chat: [
      { role: 'instructor', text: '반가워요! 점수, 단기간에 확 올리고 싶죠?' },
      { role: 'user', text: '네! 기초는 부족한데 가능할까요?' },
      { role: 'instructor', text: '그럼요. 이해보다 먼저 패턴을 몸에 익히게 해줄게요. 준비됐나요?' },
    ],
  },
  {
    id: 'mentor',
    emoji: '🤝',
    name: '멘토',
    badge: '꼼꼼 관리형',
    desc: '친근하고 꼼꼼한 1:1 코칭, 개념부터 탄탄하게',
    quote: '"헷갈릴 수 있어, 같이 보자."',
    badgeCls: 'bg-white/20 text-white',
    accentLeft: 'rgba(255,255,255,0.4)',
    proposal: {
      plan: '8주 탄탄 개념 코스',
      target: '문법 기초 완벽 마스터',
      comment: '모르는 건 부끄러운 게 아니에요. 하나씩 짚어가며 튼튼한 점수를 만들어봐요.',
      tags: ['#개념위주', '#친절코칭', '#기초탄탄'],
    },
    chat: [
      { role: 'instructor', text: '안녕하세요! 토익 공부, 혼자 하기 많이 힘들었죠?' },
      { role: 'user', text: '네, 문법이 너무 헷갈려요.' },
      { role: 'instructor', text: '걱정 마세요. 제가 옆에서 아주 쉽게, 원리부터 설명해 드릴게요.' },
    ],
  },
  {
    id: 'realist',
    emoji: '💼',
    name: '리얼리스트',
    badge: '균형 코칭형',
    desc: '현실적인 목표와 균형 잡힌 피드백',
    quote: '"틀렸어, 근데 이건 잘하고 있어."',
    badgeCls: 'bg-white/20 text-white',
    accentLeft: 'rgba(255,255,255,0.2)',
    proposal: {
      plan: '6주 실용 득점 전략',
      target: '가성비 위주 핵심 공략',
      comment: '나올 것만 합니다. 바쁜 시간 쪼개서 하는 공부, 가장 효율적으로 점수 내드릴게요.',
      tags: ['#효율극대화', '#핵심요약', '#가성비토익'],
    },
    chat: [
      { role: 'instructor', text: '반가워요. 하루에 얼마나 공부할 수 있나요?' },
      { role: 'user', text: '퇴근하고 30분 정도요.' },
      { role: 'instructor', text: '충분합니다. 시험에 무조건 나오는 것만 딱 골라서 집중하죠.' },
    ],
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
      <div className="flex flex-col min-h-screen bg-ybm-onboarding px-6 py-10 animate-fade-in relative overflow-hidden">
        <div className="absolute top-[-60px] right-[-40px] w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="max-w-sm mx-auto w-full flex-1 space-y-6 z-10">
          <header className="text-center space-y-4 pb-2">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center bg-white/10 rounded-2xl border border-white/20 animate-float">
              <span className="text-3xl">📧</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-white font-bold text-2xl tracking-tight">제안서 도착!</h2>
              <p className="text-white/50 text-sm font-medium">{userName}님께 도착한 3개의 맞춤 제안서</p>
            </div>
          </header>

          <div className="space-y-4">
            {INSTRUCTORS.map((inst) => (
              <div
                key={inst.id}
                className="bg-white/10 border border-white/15 backdrop-blur-sm rounded-2xl p-5 flex flex-col gap-4 border-l-4"
                style={{ borderLeftColor: inst.accentLeft }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-5xl">{inst.emoji}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-lg">{inst.name}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${inst.badgeCls}`}>
                        {inst.badge}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm leading-snug">{inst.desc}</p>
                    <p className="text-white/30 text-xs italic mt-1">{inst.quote}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => goToDetail('proposal', inst)}
                    className="h-10 text-[11px] font-bold border border-white/25 text-white/70 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                  >
                    의뢰서
                  </button>
                  <button
                    onClick={() => goToDetail('chat', inst)}
                    className="h-10 text-[11px] font-bold border border-white/25 text-white/70 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                  >
                    1분 대화
                  </button>
                  <button
                    onClick={() => handleConfirm(inst.id)}
                    className="h-10 text-[11px] font-bold bg-white text-ybm-blue rounded-xl shadow-mid active:scale-95 transition-transform hover:bg-ybm-blue-light"
                  >
                    수업 시작
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
    <div className="flex flex-col min-h-screen bg-ybm-onboarding animate-fade-in">
      {/* 상단 헤더 */}
      <header className="flex items-center px-6 py-4 bg-white/10 border-b border-white/15 backdrop-blur-md sticky top-0 z-20">
        <button
          onClick={() => setView('list')}
          className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="ml-2 text-white font-extrabold tracking-tight">
          {view === 'proposal' ? '📋 제안서' : '💬 1분 대화'}
        </h3>
      </header>

      <div className="flex-1 px-6 py-8 overflow-y-auto pb-32">
        <div className="max-w-sm mx-auto w-full">
          {view === 'proposal' ? (
            <div className="space-y-8">
              {/* 강사 헤더 */}
              <div className="text-center space-y-4">
                <span className="text-8xl block animate-float">{selectedInst.emoji}</span>
                <div className="space-y-2">
                  <h4 className="text-white text-3xl font-extrabold tracking-tight">{selectedInst.name}</h4>
                  <span className="inline-block text-xs px-3 py-1 rounded-full font-bold bg-white/20 text-white">
                    {selectedInst.badge}
                  </span>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {selectedInst.proposal.tags.map((tag: string) => (
                    <span key={tag} className="text-[11px] px-2.5 py-1 bg-white/15 text-white/80 rounded-full font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 제안서 카드 */}
              <div className="space-y-4">
                <div className="bg-white/10 border border-white/15 rounded-2xl p-6 space-y-5 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/40" />
                  <div>
                    <label className="text-white/40 text-[10px] font-extrabold uppercase tracking-widest mb-2 block">
                      추천 플랜
                    </label>
                    <p className="text-white text-xl font-bold">{selectedInst.proposal.plan}</p>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div>
                    <label className="text-white/40 text-[10px] font-extrabold uppercase tracking-widest mb-2 block">
                      목표
                    </label>
                    <p className="text-white text-xl font-bold">{selectedInst.proposal.target}</p>
                  </div>
                </div>

                <div className="bg-white/8 border border-dashed border-white/25 rounded-2xl p-6 relative">
                  <span className="absolute -top-3 left-5 bg-white text-ybm-blue text-[10px] font-extrabold px-3 py-1 rounded-full shadow-mid">
                    선생님 한마디
                  </span>
                  <p className="text-white/80 leading-relaxed italic font-medium pt-2">
                    "{selectedInst.proposal.comment}"
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 강사 상태 카드 */}
              <div className="bg-white/10 border border-white/15 backdrop-blur-sm rounded-2xl flex items-center gap-4 p-4">
                <span className="text-4xl">{selectedInst.emoji}</span>
                <div>
                  <p className="text-white font-bold text-lg leading-none">{selectedInst.name}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-white/50 text-xs font-bold">온라인</span>
                  </div>
                </div>
              </div>

              {/* 채팅 버블 */}
              <div className="space-y-5">
                {selectedInst.chat.map((c: any, i: number) => (
                  <div
                    key={i}
                    className={`flex ${c.role === 'instructor' ? 'justify-start' : 'justify-end'} animate-fade-in`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] font-medium leading-relaxed ${
                      c.role === 'instructor'
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'bg-white text-ybm-blue shadow-mid'
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

      {/* 하단 버튼 */}
      <div className="p-6 bg-white/10 backdrop-blur-xl border-t border-white/15 fixed bottom-0 left-0 w-full z-20">
        <div className="max-w-sm mx-auto">
          <button
            onClick={() => handleConfirm(selectedInst.id)}
            className="w-full bg-white text-ybm-blue rounded-2xl h-[56px] font-bold text-lg shadow-high active:scale-95 transition-all hover:bg-ybm-blue-light"
          >
            {selectedInst.name}과 함께 시작하기 →
          </button>
        </div>
      </div>
    </div>
  )
}
