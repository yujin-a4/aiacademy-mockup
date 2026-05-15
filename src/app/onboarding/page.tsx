'use client'
import { useState } from 'react'
import NameInput from '@/components/onboarding/NameInput'
import QuizCard from '@/components/onboarding/QuizCard'
import GoalSetting from '@/components/onboarding/GoalSetting'
import LoadingScreen from '@/components/onboarding/LoadingScreen'
import InstructorSelect from '@/components/onboarding/InstructorSelect'
import CurriculumConfirm from '@/components/onboarding/CurriculumConfirm'
import { useRouter } from 'next/navigation'

// step 1=Name 2=Quiz 3=Goal 4=Loading 5=Instructor 6=Curriculum
export default function OnboardingPage() {
  const [step, setStep] = useState(1) // 홈에서 버튼을 누르고 오므로 바로 이름 입력(1)부터 시작
  const router = useRouter()
  const next = () => setStep((s) => s + 1)

  return (
    <main className="min-h-screen bg-ybm-bg overflow-hidden">
      {step === 1 && <NameInput onNext={next} />}
      {step === 2 && <QuizCard onComplete={next} />}
      {step === 3 && <GoalSetting onNext={next} />}
      {step === 4 && <LoadingScreen onNext={next} />}
      {step === 5 && <InstructorSelect onNext={next} />}
      {step === 6 && <CurriculumConfirm onComplete={() => router.push('/')} />}
    </main>
  )
}
