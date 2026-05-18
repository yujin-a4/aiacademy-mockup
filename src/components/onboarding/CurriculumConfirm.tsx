'use client'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'

const INST_INFO: Record<string, { emoji: string; name: string; msg: (n: string, s: number | null, p: string | null) => string }> = {
  park: {
    emoji: '🔥',
    name: '박혜원',
    msg: (n, s, p) => `${n}님이라면 ${p ?? '2개월'} 안에 ${s ?? 700}점 넘을 수 있어요. 포기하지 마세요!`,
  },
  jang: {
    emoji: '🤝',
    name: '장연지',
    msg: (n, s, p) => `${n}님이라면 ${p ?? '2개월'} 안에 ${s ?? 700}점 넘을 수 있어요. 저만 믿으세요!`,
  },
  kim: {
    emoji: '💼',
    name: '김토익',
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
  const { userName, selectedInstructor, targetScore, studyPeriod, saveCurrentProfile } = useOnboardingStore()
  const inst = INST_INFO[selectedInstructor ?? 'mentor']
  const curriculum = CURRICULUM[studyPeriod ?? '2개월'] ?? CURRICULUM['2개월']

  return (
    <div className="flex flex-col min-h-screen bg-ybm-onboarding animate-fade-in relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-[-60px] right-[-40px] w-56 h-56 rounded-full bg-ybm-blue/5 blur-3xl pointer-events-none" />

      <div className="px-6 py-10 max-w-sm mx-auto w-full flex-1 space-y-8 z-10 pb-36">
        <header className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm animate-bounce-in">
            <span className="text-4xl">🎓</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-slate-900 font-bold text-3xl tracking-tight">나의 커리큘럼</h2>
            <p className="text-slate-500 font-medium">{userName}님만을 위한 맞춤 코스</p>
          </div>
        </header>

        <div className="space-y-6">
          {/* 강사 정보 카드 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-ybm-blue/20" />
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">{inst.emoji}</span>
              <div>
                <p className="text-slate-900 font-bold text-lg">{inst.name} 선생님</p>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">
                  {studyPeriod} · {targetScore}점 목표
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                "{inst.msg(userName, targetScore, studyPeriod)}"
              </p>
            </div>
          </div>

          {/* 타임라인 */}
          <div className="space-y-4 px-2">
            <label className="text-slate-500 text-xs font-extrabold uppercase tracking-widest block mb-6 px-1">
              📅 주간 로드맵
            </label>
            <div className="space-y-6 relative">
              {/* 타임라인 선 */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />

              {curriculum.map((item, i) => (
                <div key={i} className="flex items-start gap-5 relative group">
                  <div className="w-6 h-6 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center shrink-0 z-10 group-hover:border-ybm-blue/30 transition-colors duration-200 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-ybm-blue transition-colors duration-200" />
                  </div>
                  <p className="text-slate-600 font-semibold text-sm pt-0.5 group-hover:text-slate-900 transition-colors">{item}</p>
                </div>
              ))}

              {/* 완료 마크 */}
              <div className="flex items-center gap-5">
                <div className="w-6 h-6 rounded-full bg-ybm-blue flex items-center justify-center shrink-0 z-10 shadow-md">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-slate-900 font-bold text-sm">목표 점수 달성! 🏆</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200 fixed bottom-0 left-0 w-full z-20">
        <div className="max-w-sm mx-auto space-y-3">
          <button
            onClick={() => { saveCurrentProfile(); onComplete(); }}
            className="w-full bg-ybm-blue text-white rounded-2xl h-[56px] font-bold text-lg shadow-lg active:scale-95 transition-all hover:opacity-90"
          >
            확인하고 시작하기 🚀
          </button>
          <button className="w-full h-10 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">
            커리큘럼 수정하기
          </button>
        </div>
      </div>
    </div>
  )
}
