import { NextRequest, NextResponse } from 'next/server'

const ANAM_SESSION_URL = 'https://api.anam.ai/v1/auth/session-token'

/**
 * Anam 세션 토큰 발급 (립싱크 실측용)
 *
 * API 키는 **서버에만** 둔다. 브라우저에는 여기서 받은 단기 sessionToken 만 내려간다.
 * enableAudioPassthrough: true 가 핵심 — 켜지 않으면 Anam 이 외부 음성을 아예 받지 않고
 * 자기네 LLM·TTS 로 말한다. 우리는 ElevenLabs 강사 음성을 그대로 넣는 것이 목적이므로 반드시 켠다.
 */
/* 화면과 같은 조건으로 막는다 — 시연본에서는 이 엔드포인트도 존재하지 않는 것처럼 굴어야 한다 */
const ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_LIPSYNC_TEST === '1'

export async function POST(req: NextRequest) {
  if (!ENABLED) return new NextResponse('Not Found', { status: 404 })
  try {
    const apiKey = process.env.ANAM_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANAM_API_KEY_MISSING', hint: '.env.local 에 ANAM_API_KEY 를 넣고 dev 서버를 다시 띄우세요.' },
        { status: 500 },
      )
    }

    const { id: rawId, kind } = await req.json().catch(() => ({}))
    const id = (rawId || process.env.ANAM_AVATAR_ID || '').trim()
    if (!id) {
      return NextResponse.json(
        { error: 'ID_MISSING', hint: 'lab.anam.ai 에서 페르소나 id(또는 아바타 id)를 복사해 화면에 붙여넣으세요.' },
        { status: 400 },
      )
    }

    /* Anam 은 두 가지 형태를 받는다 (api-reference/create-session-token).
       · persona : Lab 에서 만들어 저장해 둔 페르소나를 그대로 불러온다 → { personaId }
       · avatar  : 아바타만 지정하고 나머지는 런타임에 구성한다      → { avatarId, avatarModel }
       둘 다 uuid 라 생김새로는 구분되지 않으므로 화면에서 어느 쪽인지 골라 보낸다. */
    const personaConfig =
      kind === 'avatar'
        ? { avatarId: id, avatarModel: 'cara-4', enableAudioPassthrough: true }
        : { personaId: id, enableAudioPassthrough: true }

    const res = await fetch(ANAM_SESSION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ personaConfig }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('[anam-session] failed:', res.status, body)
      /* 401 은 거의 항상 키를 잘못 넣은 경우다. 페르소나 id 와 API 키가 둘 다 uuid 로 보여서
         자리를 바꿔 넣기 쉬우므로, 원인을 짚어 준다. */
      const hint =
        res.status === 401
          ? 'API 키가 거부되었습니다. lab.anam.ai/api-keys 에서 "Create API key" 로 만든 값을 .env.local 의 ANAM_API_KEY 에 넣으세요. 페르소나·아바타 id 를 넣으면 이 오류가 납니다.'
          : res.status === 404
            ? '해당 id 를 찾지 못했습니다. 화면에서 페르소나/아바타 구분을 바꿔 보세요.'
            : ''
      return NextResponse.json({ error: 'ANAM_SESSION_FAILED', status: res.status, body, hint }, { status: 502 })
    }

    const { sessionToken } = await res.json()
    return NextResponse.json({ sessionToken })
  } catch (error) {
    console.error('[/api/anam-session] unexpected error', error)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
