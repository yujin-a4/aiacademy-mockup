import { NextRequest, NextResponse } from 'next/server'
import { INST_VOICE } from '@/data/instructorData'

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
    const { text: rawText, persona = 'mentor', instructor } = await req.json()

    if (!rawText) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const text = sanitizeForTts(rawText)
    const apiKey = process.env.ELEVENLABS_API_KEY
    // persona === 'listening' → 듣기 음원 목소리, 그 외 → 강사(기본) 목소리
    const isListening = persona === 'listening'
    /* 강사를 알려주면 **그 강사 목소리**로 읽는다. 안 알려주면 예전처럼 기본 목소리.
       (persona 는 말투 파라미터일 뿐 목소리를 고르지 않는다 — 그래서 전에는 전부 같은 목소리였다) */
    const instructorVoice = (instructor && INST_VOICE[instructor]) || process.env.ELEVENLABS_VOICE_ID
    const audioVoice = process.env.ELEVENLABS_AUDIO_VOICE_ID ?? instructorVoice
    const voiceId = isListening ? audioVoice : instructorVoice

    if (!apiKey || !voiceId) {
      return NextResponse.json({ useNativeTts: true, text })
    }

    const { speed, stability, similarity_boost } = isListening ? DEFAULT_TTS : (TTS_PARAMS[persona] ?? DEFAULT_TTS)

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
