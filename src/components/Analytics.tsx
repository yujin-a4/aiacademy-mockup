'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { GA_ON, identify, initParticipant, isInternalPath, markFirstSeen, pageview, setParticipantFromAccount } from '@/lib/analytics'

/**
 * 화면이 바뀔 때마다 page_view 를 보낸다.
 * SPA 라 브라우저가 페이지를 새로 열지 않으므로 라우터를 직접 듣는다.
 *
 * `useSearchParams` 는 App Router 에서 Suspense 경계 안에 있어야 한다 —
 * 없으면 이걸 쓰는 트리 전체가 정적 렌더링에서 빠진다.
 */
function RouteTracker() {
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    /* 참가자 표식을 **page_view 보다 먼저** 세운다 — 첫 화면부터 cohort 가 붙어야
       "참가자가 처음 어디로 들어왔나" 가 fgi 쪽에 남는다 */
    initParticipant(new URLSearchParams(search.toString()))
    identify()
    markFirstSeen()
    const qs = search.toString()
    pageview(pathname + (qs ? `?${qs}` : ''))
  }, [pathname, search])

  /* ── 계정으로 참가자 확정 ──
     사람마다 계정을 따로 주므로 **로그인 아이디가 곧 참가자**다(`fgi01@…` → `FGI01`).
     로그인은 화면 이동과 따로 일어나니 여기서 세션을 한 번 붙잡는다. 로그인 직후에도,
     이미 로그인된 채로 다시 열었을 때도 같은 자리에서 잡힌다.
     Supabase 가 안 붙는 환경(키 없음)에서는 조용히 지나간다 — 링크 표식만으로 계속 굴러간다. */
  const bound = useRef(false)
  useEffect(() => {
    /* 화면을 옮길 때마다 다시 묻지 않는다 — 한 번 붙으면 끝이다. 로그인 전에는 계정이 없으니
       다음 화면에서 또 본다(로그인은 화면 이동으로 나타난다). */
    if (bound.current) return
    let alive = true
    createClient().auth.getUser()
      .then(({ data }) => { if (alive && setParticipantFromAccount(data.user?.email)) bound.current = !!data.user })
      .catch(() => { /* 비로그인·세션 만료 */ })
    return () => { alive = false }
  }, [pathname])

  return null
}

export default function Analytics() {
  const pathname = usePathname()
  /* 태그 자체는 layout 이 서버 HTML 에 심는다(구글 설치 확인이 소스를 읽기 때문).
     여기서는 SPA 화면 이동과 참가자 표식만 맡는다. */
  if (!GA_ON || isInternalPath(pathname)) return null
  return (
    <Suspense fallback={null}>
      <RouteTracker />
    </Suspense>
  )
}
