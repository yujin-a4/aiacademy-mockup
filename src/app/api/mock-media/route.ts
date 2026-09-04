import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * `/mock/…` 로컬 경로 → Supabase Storage 서명 URL (교재 음원·사진).
 *
 * ── 왜 라우트로 빼나 ──
 * `api/mock-test` 안에만 있던 일이다. 회차 풀이 화면은 서버에서 문항을 받아 가니 거기서 같이
 * 서명하면 됐지만, **파트별 연습은 브라우저가 Supabase 를 직접 읽는다**(anon 키). 버킷이
 * 비공개라 anon 으로는 파일을 못 받는다 — 서명은 service_role 이 있는 서버만 할 수 있다.
 * 화면이 경로 목록을 던지면 서명해서 돌려준다.
 *
 * 여는 것은 **경로 목록에 있는 것뿐**이다. 목록을 못 내놓으면 아무것도 안 준다 —
 * 버킷을 공개로 돌리는 것과는 다르다(그러면 URL 만 알면 교재 전체가 새어 나간다).
 */

const BUCKET = 'mock'
/* 연습은 한 판이 몇 분이다. 회차 풀이(4시간)만큼 길 이유가 없다 */
const SIGN_TTL = 60 * 60

export async function POST(req: NextRequest) {
  let paths: string[] = []
  try {
    const body = await req.json()
    paths = Array.isArray(body?.paths) ? body.paths.filter((p: unknown) => typeof p === 'string') : []
  } catch {
    return NextResponse.json({ error: '경로 목록을 읽지 못했습니다.' }, { status: 400 })
  }

  paths = Array.from(new Set(paths.filter((p) => p.startsWith('/mock/'))))
  if (paths.length === 0) return NextResponse.json({ signed: {}, error: null })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svc) {
    /* 로컬 개발은 public/mock 에 원본이 있어 경로 그대로 돌아간다. 배포에는 그 폴더가 없다 —
       그때 조용히 비워 보내면 화면이 '브라우저가 자동재생을 막았다' 고 엉뚱한 말을 한다. */
    return NextResponse.json({
      signed: {},
      error: '서버에 SUPABASE_SERVICE_ROLE_KEY 가 없어 음원·사진 주소를 만들지 못했습니다.',
    })
  }

  try {
    const res = await fetch(`${url}/storage/v1/object/sign/${BUCKET}`, {
      method: 'POST',
      headers: { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paths: paths.map((p) => p.replace(/^\/mock\//, '')),
        expiresIn: SIGN_TTL,
      }),
    })
    if (!res.ok) {
      return NextResponse.json({ signed: {}, error: `Storage 서명 요청이 실패했습니다 (${res.status}).` })
    }
    const list = (await res.json()) as { path: string; signedURL: string | null }[]
    const signed: Record<string, string> = {}
    for (const r of list) {
      if (r.signedURL) signed[`/mock/${r.path}`] = `${url}/storage/v1${r.signedURL}`
    }
    const missing = paths.length - Object.keys(signed).length
    return NextResponse.json({
      signed,
      error: missing > 0 ? `음원·사진 ${missing}개를 Storage 에서 찾지 못했습니다.` : null,
    })
  } catch {
    return NextResponse.json({ signed: {}, error: 'Storage 에 연결하지 못했습니다.' })
  }
}
