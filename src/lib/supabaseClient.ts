import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * env 키가 없는 환경(예: Vercel에 아직 등록 안 한 경우)에서도 빌드/임포트 시점에 죽지 않도록
 * 지연 생성한다. 다른 API 라우트들처럼 "키 없으면 graceful degrade" 원칙을 따른다.
 */
let client: SupabaseClient | null = null
export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey)
  return client
}
