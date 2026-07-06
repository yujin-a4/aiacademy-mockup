import { NextRequest, NextResponse } from 'next/server'

const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text'

/** ElevenLabs Scribe STT — 배치 전사(파일 업로드 → 텍스트), 실시간 스트리밍 아님 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 })
    }

    const incoming = await req.formData()
    const audio = incoming.get('audio')
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'audio file is required' }, { status: 400 })
    }

    const upstream = new FormData()
    upstream.append('model_id', 'scribe_v1')
    upstream.append('file', audio, audio.name || 'audio.webm')

    const res = await fetch(ELEVENLABS_STT_URL, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: upstream,
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.warn('[ElevenLabs STT] request failed:', res.status, errBody)
      return NextResponse.json({ error: 'stt_failed' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ text: (data.text ?? '').trim() })
  } catch (error) {
    console.error('[/api/stt] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
