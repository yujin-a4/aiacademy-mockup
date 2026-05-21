'use client'
import { useState } from 'react'
import NameInput from '@/components/onboarding/NameInput'
import QuizCard from '@/components/onboarding/QuizCard'
import GoalSetting from '@/components/onboarding/GoalSetting'
import LoadingScreen from '@/components/onboarding/LoadingScreen'
import InstructorSelect from '@/components/onboarding/InstructorSelect'
import CurriculumConfirm from '@/components/onboarding/CurriculumConfirm'
import DiagnosisResult from '@/components/onboarding/DiagnosisResult'
import CurriculumLoading from '@/components/onboarding/CurriculumLoading'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/store/onboardingStore'

// step 1=Name 2=Quiz 3=Goal 4=Diagnosis 5=CurriculumLoading 6=Instructor 7=Curriculum
export default function OnboardingPage() {
  const [step, setStep] = useState(1) // 홈에서 버튼을 누르고 오므로 바로 이름 입력(1)부터 시작
  const router = useRouter()
  const store = useOnboardingStore()

  const next = () => setStep((s) => s + 1)

  const handleSkip = () => {
    store.setUserName('토익초보')
    store.setTargetScore(750)
    store.setStudyRange('LC+RC')
    store.setLearningStyle('꼼꼼')
    store.setManagementStyle('스스로')
    store.setMotivationType('성취감')
    store.setDailyTime('1시간')

    // 기본 시험일 설정 (약 3개월 후)
    const threeMonthsLater = new Date()
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
    const examDate = threeMonthsLater.toISOString().split('T')[0]
    store.setExamDate(examDate)
    store.setStudyPeriod('3개월')
    store.setSelectedInstructor('park')
    
    // 프로필 저장
    store.saveCurrentProfile()
    
    router.push('/dashboard')
  }

  const handleSkipToInstructor = () => {
    store.setUserName('토익초보')
    store.setTargetScore(750)
    store.setStudyRange('LC+RC')
    store.setLearningStyle('꼼꼼')
    store.setManagementStyle('스스로')
    store.setMotivationType('성취감')
    store.setDailyTime('1시간')

    const threeMonthsLater = new Date()
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
    const examDate = threeMonthsLater.toISOString().split('T')[0]
    store.setExamDate(examDate)
    store.setStudyPeriod('3개월')

    setStep(6) // 강사 선택 단계로 이동
  }

  return (
    <main className="min-h-screen bg-ybm-bg overflow-hidden relative">
      {/* 건너뛰기 버튼 그룹 */}
      {step < 5 && (
        <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
          <button 
            onClick={handleSkipToInstructor}
            className="text-[#9CA3AF] text-[12px] font-medium hover:text-[#6B7280] transition-colors bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#E5E7EB]"
          >
            강사 선택으로
          </button>
          <button 
            onClick={handleSkip}
            className="text-[#9CA3AF] text-[12px] font-medium hover:text-[#6B7280] transition-colors bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#E5E7EB]"
          >
            바로 시작하기
          </button>
        </div>
      )}

      {step === 1 && <NameInput onNext={next} />}
      {step === 2 && <QuizCard onComplete={next} />}
      {step === 3 && <GoalSetting onNext={next} />}
      {step === 4 && <DiagnosisResult onNext={next} />}
      {step === 5 && <CurriculumLoading onNext={next} />}
      {step === 6 && <InstructorSelect onNext={next} onBack={() => setStep(3)} />}
      {step === 7 && <CurriculumConfirm onComplete={() => router.push('/dashboard')} />}
    </main>
  )
}
