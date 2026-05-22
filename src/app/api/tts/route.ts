import { NextRequest, NextResponse } from 'next/server'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

/* ── 강사 페르소나별 ElevenLabs 파라미터 ── */
const TTS_PARAMS: Record<string, { speed: number; stability: number; similarity_boost: number }> = {
  park:    { speed: 1.2, stability: 0.30, similarity_boost: 0.80 },
  jang:    { speed: 1.1, stability: 0.50, similarity_boost: 0.75 },
  kim:     { speed: 1.0, stability: 0.60, similarity_boost: 0.75 },
  p6tutor: { speed: 1.0, stability: 0.50, similarity_boost: 0.80 },
}

const DEFAULT_TTS = { speed: 1.0, stability: 0.50, similarity_boost: 0.75 }

/** TTS 전송 전 특수문자 정리 */
function sanitizeForTts(raw: string): string {
  return raw
    .replace(/_{4,}/g, '빈칸')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/'/g, "'")
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { text: rawText, persona = 'mentor' } = await req.json()

    if (!rawText) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const text = sanitizeForTts(rawText)
    const apiKey = process.env.ELEVENLABS_API_KEY
    const voiceId = process.env.ELEVENLABS_VOICE_ID

    if (!apiKey || !voiceId) {
      return NextResponse.json({ useNativeTts: true, text })
    }

    const { speed, stability, similarity_boost } = TTS_PARAMS[persona] ?? DEFAULT_TTS

    const res = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost,
          speed,
        },
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.warn('[ElevenLabs TTS] request failed:', res.status, errBody)
      return NextResponse.json({ useNativeTts: true, text })
    }

    const arrayBuffer = await res.arrayBuffer()
    const audioContent = Buffer.from(arrayBuffer).toString('base64')

    return NextResponse.json({ audioContent, useNativeTts: false })
  } catch (error) {
    console.error('[/api/tts] unexpected error', error)
    return NextResponse.json({ useNativeTts: true, text: '' })
  }
}
