import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * env 키가 없는 환경(예: Vercel에 아직 등록 안 한 경우)에서도 빌드/임포트 시점에 죽지 않도록
 * 지연 생성한다. 다른 API 라우트들처럼 "키 없으면 graceful degrade" 원칙을 따른다.
 *
 * ── 브라우저에서는 **로그인 세션을 공유하는 클라이언트**여야 한다 ──
 * 로그인(app/page.tsx)과 프로필(lib/profile.ts)은 `@supabase/ssr` 의 createBrowserClient 를
 * 쓴다 — 세션이 **쿠키**에 있다. 여기서 `@supabase/supabase-js` 의 createClient 를 쓰면 세션을
 * localStorage 에서 찾다가 못 찾아 **늘 비로그인**으로 돈다. 그러면 이런 일이 벌어진다(실측):
 *   · 학습 기록(learning_events·learner_progress)이 로그인 계정이 아니라 **데모 계정**에 쌓인다
 *     → FGI 참가자를 계정으로 가르려던 것이 통째로 무너진다
 *   · 반대로 읽는 쪽(getLearnerId)은 쿠키를 봐서 **로그인 uid** 로 조회한다
 *     → 방금 끝낸 강의가 '완료' 로 안 잡히고 복습이 영원히 잠긴다
 * 서버(api/tutor → lib/tutorDb)는 쿠키가 없으므로 예전대로 세션 없는 anon 클라이언트를 쓴다.
 */
let client: SupabaseClient | null = null
export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null
  if (!client) {
    client = typeof window === 'undefined'
      ? createClient(supabaseUrl, supabaseAnonKey)
      : createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}
