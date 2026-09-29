'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'
import { ensureBaselineAnswerLog } from '@/lib/profile'

/* ── guest00 전용 '학습 데이터 초기화' ──
   공용 시연 계정을 '처음 들어온 학습자' 상태로 되돌린다. 다른 계정에는 아예 안 보인다.
   DB 기록은 서버(api/guest-reset)가 지우고, 이 기기의 브라우저 기록은 여기서 지운다. */

const GUEST_EMAIL = 'guest00@ybm.co.kr'

/* 이 기기에 남는 학습 흔적. 글꼴 설정·GA 참가자 표시·홈 변형은 학습 기록이 아니라 남긴다. */
const LOCAL_KEYS = [
  'ybm_today_plan', 'ybm_just_done', 'ybm_review_done', 'ybm_session_history', 'streakStartDate',
  'wrong-answers', 'practice-stats', 'mock-test-attempts', 'voca-bookmarks',
]
const LOCAL_PREFIXES = ['ybm_weekly_report:', 'ybm_weekly_rx:']

function clearLocal() {
  try {
    for (const k of LOCAL_KEYS) localStorage.removeItem(k)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && LOCAL_PREFIXES.some((p) => k.startsWith(p))) localStorage.removeItem(k)
    }
  } catch { /* 저장소 막힘은 무시 — DB 쪽은 이미 지워졌다 */ }
}

export default function GuestResetButton() {
  const [isGuest, setIsGuest] = useState(false)
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    getSupabase()?.auth.getSession().then(({ data }) => {
      setIsGuest(data.session?.user.email === GUEST_EMAIL)
    }).catch(() => {})
  }, [])

  if (!isGuest) return null

  const run = async () => {
    setStep('busy')
    setError('')
    try {
      const { data } = await getSupabase()!.auth.getSession()
      const token = data.session?.access_token
      const res = await fetch('/api/guest-reset', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `초기화 실패 (${res.status})`)

      clearLocal()
      // 리포트가 텅 비지 않게 온보딩 때와 같은 기본 답안 로그를 다시 심는다
      if (data.session?.user.id) await ensureBaselineAnswerLog(data.session.user.id).catch(() => {})
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : '초기화에 실패했어요.')
      setStep('idle')
    }
  }

  return (
    /* 눈에 띌 이유가 없는 관리용 링크 — 글자는 작게, 누르는 자리는 손가락 크기(44px)로 */
    <div className="mt-8 mb-2 flex flex-col items-center">
      {step === 'confirm' ? (
        <div className="flex items-center gap-1 text-[12px] text-[#9CA3AF]">
          <span>기록을 모두 지울까요?</span>
          <button onClick={run} className="min-h-[44px] px-2 underline underline-offset-2 text-[#EF4444]">지우기</button>
          <button onClick={() => setStep('idle')} className="min-h-[44px] px-2 underline underline-offset-2">취소</button>
        </div>
      ) : (
        <button onClick={() => setStep('confirm')} disabled={step === 'busy'}
          className="min-h-[44px] px-3 text-[12px] text-[#9CA3AF] underline underline-offset-2">
          {step === 'busy' ? '초기화하는 중…' : '학습 데이터 초기화'}
        </button>
      )}
      {error && <p className="text-[11px] text-[#EF4444]">{error}</p>}
    </div>
  )
}
