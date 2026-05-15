'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'

const SCORE_OPTIONS = [600, 700, 750, 800, 900]
const PERIOD_OPTIONS = ['1개월', '2개월', '3개월', '6개월']
const TIME_OPTIONS = ['15분', '30분', '1시간', '1시간 이상']

export default function GoalSetting({ onNext }: { onNext: () => void }) {
  const store = useOnboardingStore()
  const [score, setScore] = useState<number | null>(store.targetScore)
  const [period, setPeriod] = useState<string | null>(store.studyPeriod)
  const [time, setTime] = useState<string | null>(store.dailyTime)

  const isReady = score && period && time

  const handleComplete = () => {
    if (!isReady) return
    store.setTargetScore(score)
    store.setStudyPeriod(period)
    store.setDailyTime(time)
    onNext()
  }

  return (
    <div className="flex flex-col min-h-screen bg-ybm-onboarding px-6 py-10 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-[-80px] right-[-60px] w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-[-40px] w-40 h-40 rounded-full bg-ybm-blue/20 blur-2xl pointer-events-none" />

      <div className="w-full max-w-sm mx-auto space-y-8 animate-fade-in z-10">
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto animate-bounce-in">
            <Image src="/img/와옹이_공부.png" alt="와옹이" fill className="object-contain" />
          </div>
          <div className="space-y-1">
            <h2 className="text-white text-xl font-extrabold tracking-tight">목표를 설정해볼까요?</h2>
            <p className="text-white/50 text-sm font-medium">3가지만 골라주시면 커리큘럼을 만들어드려요</p>
          </div>
        </div>

        <div className="space-y-6 bg-white/8 border border-white/15 rounded-2xl p-6 backdrop-blur-sm">
          {/* 목표 점수 */}
          <section className="space-y-3">
            <label className="text-white/60 text-[10px] font-extrabold uppercase tracking-widest block">
              목표 점수
            </label>
            <div className="flex flex-wrap gap-2">
              {SCORE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setScore(s)}
                  className={`flex-1 min-w-[60px] h-10 rounded-xl text-sm font-bold transition-all duration-200 border ${
                    score === s
                      ? 'bg-white text-ybm-blue border-white shadow-mid'
                      : 'bg-white/8 text-white/60 border-white/15 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {s === 900 ? '900+' : s}
                </button>
              ))}
            </div>
          </section>

          <div className="h-px bg-white/10" />

          {/* 학습 기간 */}
          <section className="space-y-3">
            <label className="text-white/60 text-[10px] font-extrabold uppercase tracking-widest block">
              학습 기간
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`h-10 rounded-xl text-[12px] font-bold transition-all duration-200 border ${
                    period === p
                      ? 'bg-white text-ybm-blue border-white shadow-mid'
                      : 'bg-white/8 text-white/60 border-white/15 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          <div className="h-px bg-white/10" />

          {/* 하루 학습 시간 */}
          <section className="space-y-3">
            <label className="text-white/60 text-[10px] font-extrabold uppercase tracking-widest block">
              하루 학습 시간
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`h-10 rounded-xl text-[13px] font-bold transition-all duration-200 border ${
                    time === t
                      ? 'bg-white text-ybm-blue border-white shadow-mid'
                      : 'bg-white/8 text-white/60 border-white/15 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>
        </div>

        <button
          onClick={handleComplete}
          disabled={!isReady}
          className="w-full bg-white text-ybm-blue rounded-2xl h-[56px] font-bold text-lg shadow-high disabled:opacity-30 transition-all active:scale-95 hover:bg-ybm-blue-light"
        >
          제안서 받기
        </button>
      </div>
    </div>
  )
}
