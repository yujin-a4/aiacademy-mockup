import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ── 공용 guest00 학습 기록 초기화 ──
   시연·내부 확인용 공용 계정은 기록이 쌓이면 '처음 들어온 학습자' 화면을 다시 볼 수 없다.
   학습 기록 테이블(learning_events·learner_progress·learner_answer_log)엔 삭제 정책이 없어서
   브라우저 anon 키로는 못 지운다 → 서버 service_role 로 지우되, **토큰의 주인이 guest00 일 때만**. */

const GUEST_EMAIL = 'guest00@ybm.co.kr'
const TABLES = ['learning_events', 'learner_progress', 'learner_answer_log'] as const

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svc) {
    return NextResponse.json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY 가 없어 초기화할 수 없습니다.' }, { status: 503 })
  }

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const admin = createClient(url, svc, { auth: { persistSession: false } })
  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  if (user.email !== GUEST_EMAIL) {
    return NextResponse.json({ error: 'guest00 계정에서만 초기화할 수 있습니다.' }, { status: 403 })
  }

  for (const t of TABLES) {
    const { error } = await admin.from(t).delete().eq('learner_id', user.id)
    if (error) return NextResponse.json({ error: `${t} 삭제 실패: ${error.message}` }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
