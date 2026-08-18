import { NextRequest, NextResponse } from 'next/server'
import { INST_VOICE, INST_TTS_MODEL, INST_SENTENCE_PAUSE } from '@/data/instructorData'

const DEFAULT_TTS_MODEL = 'eleven_multilingual_v2'

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

/** 문장 끝에서 **한 박자 쉬게** 한다 — 마침표 뒤의 공백을 줄바꿈으로 바꾼다.
 *
 *  줄바꿈을 쓰는 이유: v3 는 `<break time=…>` 를 안 받고, `[pause]` 류 태그는 모델이 그대로
 *  읽어 버리는 사고가 있다. 줄바꿈은 그냥 글자라 읽힐 수가 없고, 문서가 권하는 방식이기도 하다.
 *
 *  건드리지 않는 것
 *   · 숫자 사이의 점 — "3.5초" 를 "3 / 5초" 로 끊으면 안 된다
 *   · 이미 줄이 바뀐 자리 — 공백이 있는 경우만 바꾼다(줄바꿈이 겹치면 사이가 너무 벌어진다)
 *  **화면 글자는 이걸 거치지 않는다.** 읽는 문자열에만 손댄다. */
function spaceSentences(raw: string): string {
  return raw.replace(/([.!?])[ \t]+(?=[^\s\d])/g, '$1\n\n')
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

    /* 모델은 **강사**를 따라간다(듣기 음원은 언제나 기본 모델). 목소리와 모델은 한 세트라
       목소리만 바꾸고 모델을 안 바꾸면 발음이 뽑을 때와 달라진다.
       v3 은 speed 를 받지 않는다 — 넣으면 400 이 떨어져 통째로 브라우저 TTS 로 폴백한다.
       (stability 는 v3 에서 3단계로 취급된다: 0.0 Creative / 0.5 Natural / 1.0 Robust) */
    const modelId = (!isListening && instructor && INST_TTS_MODEL[instructor]) || DEFAULT_TTS_MODEL
    const supportsSpeed = modelId !== 'eleven_v3'

    /* 문장 사이를 한 박자 벌린다 — 이 강사에게 켜져 있을 때만(듣기 음원은 대상이 아니다).
       `text` 는 그대로 둔다 — 브라우저 TTS 폴백으로 돌려보내는 값이라 손대면 그쪽까지 바뀐다. */
    const speech = !isListening && instructor && INST_SENTENCE_PAUSE[instructor]
      ? spaceSentences(text)
      : text

    const res = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: speech,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost,
          ...(supportsSpeed ? { speed } : {}),
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
