'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { GA_ON, identify, initParticipant, isInternalPath, markFirstSeen, pageview } from '@/lib/analytics'

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
