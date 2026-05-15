'use client'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'

const INST_INFO: Record<string, { emoji: string; name: string; msg: (n: string, s: number | null, p: string | null) => string }> = {
  driller: {
    emoji: '🔥',
    name: '드릴러',
    msg: (n, s, p) => `${n}님이라면 ${p ?? '2개월'} 안에 ${s ?? 700}점 넘을 수 있어요. 포기하지 마세요!`,
  },
  mentor: {
    emoji: '🤝',
    name: '멘토',
    msg: (n, s, p) => `${n}님이라면 ${p ?? '2개월'} 안에 ${s ?? 700}점 넘을 수 있어요. 저만 믿으세요!`,
  },
  realist: {
    emoji: '💼',
    name: '리얼리스트',
    msg: (n, s, p) => `${p ?? '2개월'} 플랜이면 ${s ?? 700}점 충분히 가능해요, ${n}님.`,
  },
}

const CURRICULUM: Record<string, string[]> = {
  '1개월': ['1주차: Part 5 문법 기초', '2주차: 어휘 집중 훈련', '3주차: 실전 풀이 연습', '4주차: 모의고사 + 총정리'],
  '2개월': ['1~2주차: Part 5 문법 기초', '3~4주차: 시제·조동사·어휘', '5~6주차: 실전 유형 훈련', '7주차: 모의고사 풀이', '8주차: 최종 점검'],
  '3개월': ['1~2주차: 문법 기초', '3~4주차: 어휘 전략', '5~7주차: Part 5 실전', '8~10주차: Part 6 도입', '11주차: 모의고사', '12주차: 최종 점검'],
  '6개월': ['1~4주차: 문법·어휘 기초', '5~8주차: Part 5·6 완성', '9~12주차: Part 7 전략', '13~16주차: 실전 모의고사', '17~20주차: 약점 보완', '21~24주차: 최종 점검 + 실전'],
}

export default function CurriculumConfirm({ onComplete }: { onComplete: () => void }) {
  const { userName, selectedInstructor, targetScore, studyPeriod } = useOnboardingStore()
  const inst = INST_INFO[selectedInstructor ?? 'mentor']
  const curriculum = CURRICULUM[studyPeriod ?? '2개월'] ?? CURRICULUM['2개월']

  return (
    <div className="flex flex-col min-h-screen bg-off-white px-6 py-10 animate-fade-in relative overflow-hidden">
      <div className="max-w-sm mx-auto w-full flex-1 space-y-8 z-10 pb-32">
        <header className="text-center space-y-6">
          <div className="relative w-32 h-32 mx-auto animate-bounce-in">
            <Image src="/img/와옹이_응원.png" alt="와옹이" fill className="object-contain" />
          </div>
          <div className="space-y-2">
            <h2 className="text-dark-navy font-extrabold text-3xl tracking-tight uppercase font-display italic">My Curriculum</h2>
            <p className="text-waong-lavender font-bold">{userName}님만을 위한 맞춤 코스</p>
          </div>
        </header>

        <div className="space-y-6">
          {/* 강사 정보 섹션 */}
          <div className="bg-white border border-light-gray rounded-default p-6 shadow-low relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-waong-lavender" />
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">{inst.emoji}</span>
              <div>
                <p className="text-dark-navy font-bold text-lg">{inst.name} 선생님</p>
                <p className="text-mid-gray text-xs font-bold uppercase tracking-widest">{studyPeriod} · {targetScore}점 목표</p>
              </div>
            </div>
            <div className="bg-off-white rounded-xl p-4 border border-light-gray italic">
              <p className="text-charcoal/80 text-sm leading-relaxed font-medium">"{inst.msg(userName, targetScore, studyPeriod)}"</p>
            </div>
          </div>

          {/* 타임라인 섹션 */}
          <div className="space-y-4 px-2">
            <label className="text-dark-navy text-xs font-extrabold uppercase tracking-widest block mb-6 px-1">Weekly Roadmap</label>
            <div className="space-y-6 relative">
              {/* 타임라인 선 */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-light-gray" />
              
              {curriculum.map((item, i) => (
                <div key={i} className="flex items-start gap-5 relative group">
                  <div className="w-6 h-6 rounded-full bg-white border-4 border-light-gray flex items-center justify-center shrink-0 z-10 group-hover:border-waong-lavender transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-light-gray group-hover:bg-waong-lavender" />
                  </div>
                  <p className="text-charcoal font-bold text-sm pt-0.5">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-light-gray fixed bottom-0 left-0 w-full z-20">
        <div className="max-w-sm mx-auto space-y-3">
          <button
            onClick={onComplete}
            className="w-full bg-dark-navy text-white rounded-default h-[56px] font-bold text-lg shadow-mid active:scale-95 transition-transform uppercase tracking-wider italic"
          >
            Confirm & Start
          </button>
          <button className="w-full h-12 text-mid-gray font-bold text-sm hover:text-dark-navy transition-colors">
            Modify Curriculum
          </button>
        </div>
      </div>
    </div>
  )
}
