import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 로그인 없이 접근 가능한 경로 (로그인 화면 자체).
const PUBLIC_PATHS = ['/']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublic = PUBLIC_PATHS.includes(request.nextUrl.pathname)

  // 미로그인 상태로 보호 경로 직접 접근 → 로그인 화면으로.
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  // api·정적 자산·이미지/영상/폰트/음원 파일은 제외하고 페이지 라우트만 검사.
  //
  // ⚠️ **폰트를 빠뜨리면 폰트가 통째로 안 뜬다** (08-28 실측). `@font-face` 로 받는 폰트는
  //    같은 출처라도 **쿠키를 안 실어 보낸다**(credentials omit). 그래서 미들웨어 눈에는 늘
  //    미로그인이라 `/` 로 307 튕기고, 브라우저는 돌아온 HTML 을 폰트로 파싱한다
  //    ("OTS parsing error: invalid sfntVersion: 1008813135" — 저 숫자가 곧 `<!DO` 다).
  //    페이지는 멀쩡히 뜨는데 글꼴만 폴백으로 바뀌어서, 눈으로는 원인을 못 찾는다.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm|mp3|wav|m4a|ttf|otf|woff|woff2|ico|json|txt|js|css)$).*)',
  ],
}
