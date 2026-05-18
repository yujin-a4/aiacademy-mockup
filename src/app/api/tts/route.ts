import { NextRequest, NextResponse } from 'next/server'

/* ── 강사 페르소나별 TTS 파라미터 ── */
const TTS_PARAMS: Record<string, { speakingRate: number; pitch: number; voiceName: string }> = {
  park: { speakingRate: 1.45, pitch: -2.5, voiceName: 'ko-KR-Wavenet-C' }, // 박혜원: 랩하듯 아주 빠르고 시크한 톤
  jang: { speakingRate: 1.10, pitch:  4.5, voiceName: 'ko-KR-Wavenet-A' }, // 장연지: 애교 있고 활발하며 톤이 높음
  kim:  { speakingRate: 1.05, pitch:  0.0, voiceName: 'ko-KR-Standard-C' }, // 김토익: 정석적이고 신뢰감 있는 표준어
}

const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

export async function POST(req: NextRequest) {
  try {
    const { text, persona = 'mentor' } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY

    /* API 키가 없으면 클라이언트에게 브라우저 TTS를 쓰도록 신호 */
    if (!apiKey) {
      return NextResponse.json({ useNativeTts: true, text })
    }

    const { speakingRate, pitch, voiceName } = TTS_PARAMS[persona] ?? TTS_PARAMS.mentor

    const ttsRes = await fetch(`${TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ko-KR', name: voiceName },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch,
        },
      }),
    })

    if (!ttsRes.ok) {
      /* TTS API 실패 시 브라우저 TTS로 fallback */
      console.warn('[TTS API] request failed, signaling native fallback')
      return NextResponse.json({ useNativeTts: true, text })
    }

    const data = await ttsRes.json()
    const audioContent: string | null = data.audioContent ?? null

    if (!audioContent) {
      return NextResponse.json({ useNativeTts: true, text })
    }

    return NextResponse.json({ audioContent, useNativeTts: false })
  } catch (error) {
    console.error('[/api/tts] unexpected error', error)
    return NextResponse.json({ useNativeTts: true, text: '' })
  }
}
