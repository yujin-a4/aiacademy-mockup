'use client'
import { useOnboardingStore } from '@/store/onboardingStore'
import { saveProfileToSupabase } from '@/lib/profile'

const INST_INFO: Record<string, { name: string; msg: (n: string, s: number | null, p: string | null) => string }> = {
  park_hyewon: {
    name: '박혜원',
    msg: (n, s, p) => `${n}님이라면 ${p ?? '2개월'} 안에 ${s ?? 700}점 넘을 수 있어요. 포기하지 마세요!`,
  },
  jang_yeonji: {
    name: '장연지',
    msg: (n, s, p) => `${n}님이라면 ${p ?? '2개월'} 안에 ${s ?? 700}점 넘을 수 있어요. 저만 믿으세요!`,
  },
  kim_toeic: {
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
  const { userName, selectedInstructor, targetScore, studyPeriod, saveCurrentProfile, ...profileFields } = useOnboardingStore()

  const handleComplete = async () => {
    console.log('[CurriculumConfirm] handleComplete called')
    try {
      saveCurrentProfile()
      const store = useOnboardingStore.getState()
      console.log('[CurriculumConfirm] store state:', store.userName, store.selectedInstructor)
      await saveProfileToSupabase(store)
    } catch (e) {
      console.error('[CurriculumConfirm] 저장 중 예외:', e)
    }
    onComplete()
  }
  const inst = INST_INFO[selectedInstructor ?? 'jang_yeonji'] ?? INST_INFO.jang_yeonji
  const curriculum = CURRICULUM[studyPeriod ?? '2개월'] ?? CURRICULUM['2개월']

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] animate-fade-in">
      <div className="px-4 py-10 max-w-[390px] mx-auto w-full flex-1 space-y-6 pb-36">
        <header className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-primary rounded-2xl animate-bounce-in">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-[#111318] font-bold text-[22px]">나의 커리큘럼</h2>
            <p className="text-[#6B7280] text-[14px]">{userName}님만을 위한 맞춤 코스</p>
          </div>
        </header>

        {/* 강사 정보 카드 */}
        <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <span className="text-primary font-black text-base">{inst.name.slice(0, 1)}</span>
            </div>
            <div>
              <p className="text-[#111318] font-bold text-[15px]">{inst.name} 선생님</p>
              <p className="text-[#6B7280] text-xs font-medium mt-0.5">{studyPeriod} · {targetScore}점 목표</p>
            </div>
          </div>
          <div className="bg-[#F3F4F6] rounded-xl p-4">
            <p className="text-[#374151] text-sm leading-relaxed">
              "{inst.msg(userName, targetScore, studyPeriod)}"
            </p>
          </div>
        </div>

        {/* 타임라인 */}
        <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-5">
          <p className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-[0.15em] mb-5">주간 로드맵</p>
          <div className="space-y-5 relative">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-[#D1D5DB]" />
            {curriculum.map((item, i) => (
              <div key={i} className="flex items-start gap-4 relative">
                <div className="w-5 h-5 rounded-full bg-white border-2 border-[#D1D5DB] flex items-center justify-center shrink-0 z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
                </div>
                <p className="text-[#374151] text-sm pt-0.5">{item}</p>
              </div>
            ))}
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 z-10">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <p className="text-[#111318] font-semibold text-sm">목표 점수 달성!</p>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 bg-white border-t border-[#D1D5DB] fixed bottom-0 left-0 w-full z-20">
        <div className="max-w-[390px] mx-auto space-y-2">
          <button
            onClick={handleComplete}
            className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-11 font-semibold text-[15px] transition-colors active:scale-[0.98]"
          >
            확인하고 시작하기
          </button>
          <button className="w-full h-10 text-[#6B7280] font-medium text-sm hover:text-[#374151] transition-colors">
            커리큘럼 수정하기
          </button>
        </div>
      </div>
    </div>
  )
}
