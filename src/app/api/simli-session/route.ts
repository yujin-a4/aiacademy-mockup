import { NextRequest, NextResponse } from 'next/server'

const SIMLI_API = 'https://api.simli.ai'

/**
 * Simli 세션 토큰 발급 (립싱크 실측용)
 *
 * Anam 과 같은 구조다 — API 키는 **서버에만** 두고 브라우저에는 단기 session_token 만 내려간다.
 * Simli SDK 는 v3 부터 생성자가 apiKey 가 아니라 session_token 을 받으므로 이 방식이 정공법이다.
 *
 *   POST {SIMLI_API}/compose/token  헤더 x-simli-api-key, 본문 = SimliSessionRequest → { session_token }
 *   GET  {SIMLI_API}/compose/ice    헤더 x-simli-api-key                             → RTCIceServer[]
 *
 * ICE 서버까지 여기서 같이 받아 내려준다. 클라이언트가 null 을 넘기면 SDK 가 자체 조회를 하는데,
 * 그러면 키가 브라우저에 있어야 하므로 그 경로는 쓸 수 없다.
 */
const ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_LIPSYNC_TEST === '1'

export async function POST(req: NextRequest) {
  if (!ENABLED) return new NextResponse('Not Found', { status: 404 })
  try {
    const apiKey = process.env.SIMLI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SIMLI_API_KEY_MISSING', hint: '.env.local 에 SIMLI_API_KEY 를 넣고 dev 서버를 다시 띄우세요.' },
        { status: 500 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const faceId = (body.faceId || process.env.SIMLI_FACE_ID || '').trim()
    if (!faceId) {
      return NextResponse.json(
        { error: 'FACE_ID_MISSING', hint: 'app.simli.com 에서 face id 를 복사해 화면에 붙여넣으세요.' },
        { status: 400 },
      )
    }

    /* handleSilence 는 끈다. 켜면 무음 구간에 Simli 가 자체 아이들 모션을 섞어 넣어
       "우리가 넣은 소리에만 반응한다"는 전제가 깨진다(공식 문서도 아티팩트를 이유로 false 를 권한다). */
    const config = {
      faceId,
      handleSilence: false,
      maxSessionLength: Number(body.maxSessionLength) || 600,
      maxIdleTime: Number(body.maxIdleTime) || 300,
      ...(body.model ? { model: body.model as 'fasttalk' | 'artalk' } : {}),
    }

    const tokenRes = await fetch(`${SIMLI_API}/compose/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-simli-api-key': apiKey },
      body: JSON.stringify(config),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => '')
      console.warn('[simli-session] token failed:', tokenRes.status, text)
      const hint =
        tokenRes.status === 401 || tokenRes.status === 403
          ? 'API 키가 거부되었습니다. app.simli.com 의 API key 를 .env.local 의 SIMLI_API_KEY 에 넣으세요.'
          : tokenRes.status === 404
            ? 'face id 를 찾지 못했습니다. 값을 다시 확인하세요.'
            : ''
      return NextResponse.json(
        { error: 'SIMLI_TOKEN_FAILED', status: tokenRes.status, body: text, hint },
        { status: 502 },
      )
    }

    const { session_token: sessionToken } = await tokenRes.json()

    /* ICE 조회가 실패해도 세션 자체는 살아 있다. null 로 내려보내면 SDK 가 기본값으로 붙어 보므로
       여기서 통째로 실패시키지 않는다 — 사내망에서만 막히는 경우가 있어서다. */
    let iceServers: RTCIceServer[] | null = null
    try {
      const iceRes = await fetch(`${SIMLI_API}/compose/ice`, {
        headers: { 'Content-Type': 'application/json', 'x-simli-api-key': apiKey },
      })
      if (iceRes.ok) iceServers = await iceRes.json()
      else console.warn('[simli-session] ice failed:', iceRes.status)
    } catch (e) {
      console.warn('[simli-session] ice error', e)
    }

    return NextResponse.json({ sessionToken, iceServers, faceId })
  } catch (error) {
    console.error('[/api/simli-session] unexpected error', error)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
