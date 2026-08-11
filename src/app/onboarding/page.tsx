'use client'
import { useEffect, useRef, useState } from 'react'
import { track, secSince } from '@/lib/analytics'
import NameInput from '@/components/onboarding/NameInput'
import QuizCard from '@/components/onboarding/QuizCard'
import GoalSetting from '@/components/onboarding/GoalSetting'
import LoadingScreen from '@/components/onboarding/LoadingScreen'
import InstructorSelect from '@/components/onboarding/InstructorSelect'
import CurriculumConfirm from '@/components/onboarding/CurriculumConfirm'
import DiagnosisLoading from '@/components/onboarding/DiagnosisLoading'
import DiagnosisResult from '@/components/onboarding/DiagnosisResult'
import CurriculumLoading from '@/components/onboarding/CurriculumLoading'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/store/onboardingStore'
import { createClient } from '@/lib/supabase'

// step 1=Name 2=Quiz 3=Goal 4=DiagnosisLoading 5=Diagnosis 6=CurriculumLoading 7=Instructor 8=Curriculum
/* 단계 이름 — GA 리포트에서 번호만 보면 어디서 떨어졌는지 못 읽는다 */
const STEP_NAME: Record<number, string> = {
  1: '이름', 2: '진단퀴즈', 3: '목표설정', 4: '진단중', 5: '진단결과',
  6: '커리큘럼생성중', 7: '강사선택', 8: '커리큘럼확인',
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const router = useRouter()
  const store = useOnboardingStore()

  /* ── 온보딩 퍼널 (GA) ──
     "온보딩이 길다"는 인상은 다들 갖고 있는데 **어느 단계에서** 지치는지는 아무도 모른다.
     단계마다 도달을 남기고, 직전 단계에 얼마나 머물렀는지를 같이 실어 병목을 짚는다. */
  const stepAtRef = useRef(Date.now())
  const startedAtRef = useRef(Date.now())
  useEffect(() => {
    track('onboarding_step', {
      step, name: STEP_NAME[step] ?? String(step),
      prev_sec: secSince(stepAtRef.current),
      total_sec: secSince(startedAtRef.current),
    })
    stepAtRef.current = Date.now()
  }, [step])

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.replace('/')
  }

  const next = () => setStep((s) => s + 1)

  const handleSkipToDiagnosis = () => {
    store.setUserName('토익초보')
    store.setTargetScore(750)
    store.setStudyRange('LC+RC')
    store.setRangeAxis('W')
    store.setRhythm('M')
    store.setDifficulty('S')
    store.setMotivation('R')
    store.setDailyTime('1시간')

    const threeMonthsLater = new Date()
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
    const examDate = threeMonthsLater.toISOString().split('T')[0]
    store.setExamDate(examDate)
    store.setStudyPeriod('3개월')

    setStep(5) // 진단 결과 단계로 이동
  }

  const handleSkipToInstructor = () => {
    store.setUserName('지윤')
    store.setTargetScore(750)
    store.setStudyRange('LC+RC')
    store.setRangeAxis('N')
    store.setRhythm('M')
    store.setDifficulty('S')
    store.setMotivation('P')
    store.setDailyTime('1시간')

    const threeMonthsLater = new Date()
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
    const examDate = threeMonthsLater.toISOString().split('T')[0]
    store.setExamDate(examDate)
    store.setStudyPeriod('3개월')

    setStep(7) // 강사 선택 단계로 이동
  }

  return (
    <main className="min-h-screen bg-ybm-bg overflow-hidden relative">
      {/* 건너뛰기 버튼 그룹 */}
      {step < 6 && (
        <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="text-[#9CA3AF] text-[12px] font-medium hover:text-[#EF4444] transition-colors bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#E5E7EB]"
          >
            로그아웃
          </button>
          <button
            onClick={handleSkipToInstructor}
            className="text-[#9CA3AF] text-[12px] font-medium hover:text-[#6B7280] transition-colors bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#E5E7EB]"
          >
            강사 선택으로
          </button>
          <button
            onClick={handleSkipToDiagnosis}
            className="text-[#9CA3AF] text-[12px] font-medium hover:text-[#6B7280] transition-colors bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#E5E7EB]"
          >
            진단결과 바로가기
          </button>
        </div>
      )}

      {step === 1 && <NameInput onNext={next} />}
      {step === 2 && <QuizCard onComplete={next} onBack={() => setStep(1)} />}
      {step === 3 && <GoalSetting onNext={next} />}
      {step === 4 && <DiagnosisLoading onNext={next} />}
      {step === 5 && <DiagnosisResult onNext={next} onBack={() => setStep(3)} />}
      {step === 6 && <CurriculumLoading onNext={next} />}
      {step === 7 && <InstructorSelect onNext={next} onBack={() => setStep(3)} />}
      {step === 8 && <CurriculumConfirm onComplete={() => router.push('/dashboard')} />}
    </main>
  )
}
