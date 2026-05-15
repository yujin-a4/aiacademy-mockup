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
    <div className="flex flex-col min-h-screen bg-onboarding px-6 py-10 relative overflow-hidden">
      <div className="w-full max-w-sm mx-auto space-y-8 animate-fade-in z-10">
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto animate-bounce-in">
            <Image src="/img/와옹이_공부.png" alt="와옹이" fill className="object-contain" />
          </div>
          <h2 className="text-white text-xl font-bold">목표를 설정해볼까요?</h2>
        </div>

        <div className="space-y-6 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-high">
          {/* 목표 점수 */}
          <section className="space-y-3">
            <label className="text-waong-lavender text-[10px] font-bold uppercase tracking-widest">Target Score</label>
            <div className="flex flex-wrap gap-2">
              {SCORE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setScore(s)}
                  className={`flex-1 min-w-[60px] h-10 rounded-sharp text-sm font-bold transition-all ${
                    score === s ? 'bg-waong-lavender text-dark-navy' : 'bg-white/5 text-white/40 border border-white/10'
                  }`}
                >
                  {s === 900 ? '900+' : s}
                </button>
              ))}
            </div>
          </section>

          {/* 학습 기간 */}
          <section className="space-y-3">
            <label className="text-waong-lavender text-[10px] font-bold uppercase tracking-widest">Study Period</label>
            <div className="grid grid-cols-4 gap-2">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`h-10 rounded-sharp text-[12px] font-bold transition-all ${
                    period === p ? 'bg-waong-lavender text-dark-navy' : 'bg-white/5 text-white/40 border border-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          {/* 하루 학습 시간 */}
          <section className="space-y-3">
            <label className="text-waong-lavender text-[10px] font-bold uppercase tracking-widest">Daily Time</label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`h-10 rounded-sharp text-[13px] font-bold transition-all ${
                    time === t ? 'bg-waong-lavender text-dark-navy' : 'bg-white/5 text-white/40 border border-white/10'
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
          className="w-full bg-white text-dark-navy rounded-xl h-[56px] font-bold text-lg shadow-mid disabled:opacity-30 transition-all active:scale-95"
        >
          제안서 받기
        </button>
      </div>
    </div>
  )
}
