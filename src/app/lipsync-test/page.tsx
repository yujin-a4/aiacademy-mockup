import { notFound } from 'next/navigation'
import LipsyncTestClient from './LipsyncTestClient'

/**
 * 립싱크 실측 하네스 — **개발용 화면이다. 시연본에는 뜨지 않는다.**
 *
 * FGI 시연 사이트에 개발용 화면이 섞이면 안 되므로 배포 환경에서는 404 로 막는다.
 * 어느 화면에서도 이 경로로 링크하지 않으므로, 로컬에서 주소를 직접 쳐야만 열린다.
 * 실기기(모바일) 안정성 확인처럼 배포본에서 꼭 열어야 할 때만
 * NEXT_PUBLIC_ENABLE_LIPSYNC_TEST=1 을 켠다.
 */
const ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_LIPSYNC_TEST === '1'

export default function LipsyncTestPage() {
  if (!ENABLED) notFound()
  return <LipsyncTestClient />
}
