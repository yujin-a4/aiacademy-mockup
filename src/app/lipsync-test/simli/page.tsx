import { notFound } from 'next/navigation'
import SimliPanel from './SimliPanel'

/** 립싱크 실측 — Simli 패널. 개발용이라 시연본에서는 404 (../page.tsx 와 같은 조건). */
const ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_LIPSYNC_TEST === '1'

export default function SimliTestPage() {
  if (!ENABLED) notFound()
  return <SimliPanel />
}
