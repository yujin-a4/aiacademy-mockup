import { NextResponse } from 'next/server'

/**
 * 클레온 SDK 키 전달 (립싱크 실측용)
 *
 * 클레온은 Anam 과 달리 **클라이언트에서 init({ sdk_key }) 를 호출하는 구조**라, 키가 결국 브라우저까지 간다.
 * 그래도 NEXT_PUBLIC_ 으로 두지는 않는다 — 그러면 빌드 산출물에 문자열이 박혀 배포본에 딸려 나간다.
 * 여기서 받아 쓰면 키는 .env.local 에만 남고, 이 라우트는 프로덕션에서 404 다.
 */
const ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_LIPSYNC_TEST === '1'

export async function GET() {
  if (!ENABLED) return new NextResponse('Not Found', { status: 404 })

  const sdkKey = process.env.KLLEON_SDK_KEY
  if (!sdkKey) {
    return NextResponse.json(
      { error: 'KLLEON_SDK_KEY_MISSING', hint: '.env.local 에 KLLEON_SDK_KEY 를 넣으세요.' },
      { status: 500 },
    )
  }
  return NextResponse.json({ sdkKey, avatarId: process.env.KLLEON_AVATAR_ID ?? '' })
}
