import { NextResponse } from 'next/server'

const ADVICE_API_URL = 'https://korean-advice-open-api.vercel.app/api/advice'

type AdviceApiResponse = {
  message?: unknown
  author?: unknown
}

export async function GET() {
  try {
    const adviceRes = await fetch(ADVICE_API_URL, { cache: 'no-store' })

    if (!adviceRes.ok) {
      return NextResponse.json(
        { error: 'Advice API request failed' },
        { status: 502 },
      )
    }

    const data = (await adviceRes.json()) as AdviceApiResponse

    if (typeof data.message !== 'string' || typeof data.author !== 'string') {
      return NextResponse.json(
        { error: 'Unexpected advice API response' },
        { status: 502 },
      )
    }

    return NextResponse.json(
      { message: data.message, author: data.author },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[/api/advice] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
