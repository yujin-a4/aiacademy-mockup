import { NextRequest, NextResponse } from 'next/server'

/* ── 강사 페르소나별 TTS 파라미터 ── */
const TTS_PARAMS: Record<string, { speakingRate: number; pitch: number; voiceName: string }> = {
  park:    { speakingRate: 1.45, pitch: -2.5, voiceName: 'ko-KR-Neural2-C' },
  jang:    { speakingRate: 1.10, pitch:  4.5, voiceName: 'ko-KR-Wavenet-A' },
  kim:     { speakingRate: 1.05, pitch:  0.0, voiceName: 'ko-KR-Standard-C' },
  p6tutor: { speakingRate: 1.05, pitch:  1.0, voiceName: 'ko-KR-Neural2-A' },
}

const DEFAULT_TTS = { speakingRate: 1.05, pitch: 0.0, voiceName: 'ko-KR-Neural2-A' }

const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

// Neural2 한국어 목소리 → 성별이 맞는 영어 목소리 매핑
const EN_VOICE: Record<string, string> = {
  'ko-KR-Neural2-A': 'en-US-Neural2-F',  // female
  'ko-KR-Neural2-B': 'en-US-Neural2-F',  // female
  'ko-KR-Neural2-C': 'en-US-Neural2-D',  // male
  'ko-KR-Neural2-D': 'en-US-Neural2-D',  // male
}

type Segment = { lang: 'ko' | 'en'; text: string }

/** 텍스트를 한국어/영어 구간으로 분리 */
function splitByLanguage(text: string): Segment[] {
  const segments: Segment[] = []
  const re = /[A-Za-z][A-Za-z0-9'.,-]*(?:\s+[A-Za-z][A-Za-z0-9'.,-]*)*/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ lang: 'ko', text: text.slice(last, m.index) })
    segments.push({ lang: 'en', text: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ lang: 'ko', text: text.slice(last) })

  return segments.filter(s => s.text.trim())
}

/** 단일 구간 TTS 호출 → MP3 Buffer */
async function fetchAudio(
  text: string, voiceName: string, langCode: string,
  speakingRate: number, pitch: number, apiKey: string,
): Promise<Buffer | null> {
  const res = await fetch(`${TTS_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: langCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3', speakingRate, pitch },
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.audioContent ? Buffer.from(data.audioContent, 'base64') : null
}

/** TTS 전송 전 특수문자 정리 */
function sanitizeForTts(raw: string): string {
  return raw
    .replace(/_{4,}/g, '빈칸')          // ______  → 빈칸
    .replace(/['']/g, "'")              // 꺾인 아포스트로피 → 직선
    .replace(/[""]/g, '"')              // 꺾인 따옴표 → 직선
    .replace(/'/g, "'")                 // 오른쪽 단일 인용부호
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { text: rawText, persona = 'mentor' } = await req.json()

    if (!rawText) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const text = sanitizeForTts(rawText)

    const apiKey = process.env.GOOGLE_TTS_API_KEY

    if (!apiKey) {
      return NextResponse.json({ useNativeTts: true, text })
    }

    const { speakingRate, pitch, voiceName } = TTS_PARAMS[persona] ?? DEFAULT_TTS
    const enVoice = EN_VOICE[voiceName]

    // Neural2 목소리 + 영어 구간이 있는 경우: 구간별 분리 후 병렬 TTS → MP3 합산
    if (enVoice) {
      const segments = splitByLanguage(text)
      const hasEnglish = segments.some(s => s.lang === 'en')

      if (hasEnglish) {
        const buffers = await Promise.all(
          segments.map(seg =>
            fetchAudio(
              seg.text,
              seg.lang === 'en' ? enVoice : voiceName,
              seg.lang === 'en' ? 'en-US' : 'ko-KR',
              speakingRate,
              seg.lang === 'en' ? 0 : pitch,  // 영어 구간은 pitch 보정 없음
              apiKey,
            )
          )
        )

        const valid = buffers.filter((b): b is Buffer => b !== null)
        if (valid.length > 0) {
          const audioContent = Buffer.concat(valid).toString('base64')
          return NextResponse.json({ audioContent, useNativeTts: false })
        }
        // 병렬 호출 전체 실패 시 단일 호출로 폴백
      }
    }

    // 영어 없거나 WaveNet/Standard 목소리: 기존 단일 호출
    const ttsRes = await fetch(`${TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ko-KR', name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate, pitch },
      }),
    })

    if (!ttsRes.ok) {
      const errBody = await ttsRes.text().catch(() => '')
      console.warn('[TTS API] request failed:', ttsRes.status, errBody)
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
