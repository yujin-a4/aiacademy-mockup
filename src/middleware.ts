import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 로그인 없이 접근 가능한 경로 (로그인 화면 자체).
const PUBLIC_PATHS = ['/']

/* 립싱크 실측 하네스(/lipsync-test)는 개발용이라 로그인을 거치지 않는다.
   프로덕션에서는 페이지·API 가 스스로 404 를 내므로(app/lipsync-test/page.tsx) 여기서도 빼둔다. */
const DEV_PATHS =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_LIPSYNC_TEST === '1'
    ? ['/lipsync-test']
    : []

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

  const isPublic =
    PUBLIC_PATHS.includes(request.nextUrl.pathname) || DEV_PATHS.includes(request.nextUrl.pathname)

  // 미로그인 상태로 보호 경로 직접 접근 → 로그인 화면으로.
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  // api·정적 자산·이미지/영상 파일은 제외하고 페이지 라우트만 검사.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|json|txt|js|css)$).*)',
  ],
}
