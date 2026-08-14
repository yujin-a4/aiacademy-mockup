'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@anam-ai/js-sdk'

/**
 * 립싱크 실측 하네스 (문서: playground works/ai-human-vendors/ai-human-test-guide.html)
 *
 * 하는 일 — ElevenLabs 강사 음성을 만들어 Anam 아바타에 그대로 흘린다.
 *   1) /api/tts        : 강사 voice 로 mp3 생성 (키는 서버에만)
 *   2) 브라우저        : mp3 → PCM 16kHz 모노로 변환 (가이드의 ffmpeg 단계를 여기서 대신한다)
 *   3) Anam SDK        : sendAudioChunk 로 밀어넣으면 그 소리에 입을 맞춘다
 *
 * 업체 비교가 목적이므로 **문장·음성을 고정**하는 것이 핵심이다. 프리셋 4개를 박아둔 이유.
 */

const SENTENCES: { id: string; label: string; hint: string; text: string }[] = [
  {
    id: '1',
    label: '① 기준선 — 한국어와 짧은 반응',
    hint: '여기서 어색하면 나머지는 볼 필요가 없다. 뒤쪽 짧은 말에서 입이 아예 안 열리는지 본다.',
    text: '자, 이 문제 같이 볼까요?\n사진 속 남자가 무엇을 하고 있는지 먼저 보세요.\n네.\n좋아요.\n맞아요.',
  },
  {
    id: '2',
    label: '② 핵심 — 한 문장 안에서 영어로 바뀜',
    hint: 'phone 의 f 발음에서 아랫입술이 윗니에 닿는지가 판별점. 한국어에 없는 입 모양이라 여기가 제일 잘 깨진다.',
    text:
      '이 문장에서 answer the phone이 정답이에요.\n남자가 전화를 받고 있으니까, pick up the phone도 같은 뜻이죠.\n' +
      '하지만 hang up은 반대예요. 전화를 끊는다는 뜻이니까요.\n그래서 정답은 answer the phone, 세 번째 보기입니다.',
  },
  {
    id: '3',
    label: '③ 숫자와 보기',
    hint: '수업에서 가장 자주 나오는 말인데 짧고 발음이 튀어서 잘 깨진다.',
    text: '3번 문제입니다.\n보기 A, B, C, D 중에서 골라 보세요.\n정답은 B, 42번 줄에 나와 있어요.',
  },
  {
    id: '4',
    label: '④ 긴 설명 — 30초 이상',
    hint: '뒤로 갈수록 입이 소리보다 밀리는지(드리프트)를 본다.',
    text:
      'Part 7 지문은 길어 보이지만 다 읽을 필요가 없어요.\n먼저 질문을 읽고, 무엇을 묻는지 확인한 다음에 지문으로 돌아가는 순서예요.\n' +
      '예를 들어 What is the purpose of the e-mail? 이라고 물으면,\n목적을 묻는 거니까 지문 맨 앞 두세 줄만 봐도 답이 나오는 경우가 많아요.\n' +
      '반대로 According to the article, when will the store reopen? 처럼\n구체적인 정보를 물으면, 그때는 키워드를 잡고 지문에서 그 부분만 찾으면 됩니다.\n' +
      '이렇게 질문 유형에 따라 읽는 방법이 달라지는 거예요.',
  },
]

const INSTRUCTORS = [
  { id: 'yun_daeun', name: '윤다은' },
  { id: 'lee_doyun', name: '이도윤' },
  { id: 'park_hyewon', name: '박혜원' },
]

/** mp3(base64) → PCM 16bit·16kHz·모노.
 *  Anam 이 요구하는 형식이 pcm_s16le/16000/1 인데, 형식이 어긋나면 립싱크가 통째로 밀린다(공식 문서 경고).
 *  OfflineAudioContext 가 디코딩과 리샘플링을 한 번에 해주므로 ffmpeg 없이 브라우저에서 끝난다. */
async function mp3ToPcm16k(base64: string): Promise<Int16Array> {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

  const tmp = new AudioContext()
  const decoded = await tmp.decodeAudioData(bytes.buffer)
  void tmp.close()

  // 16kHz 모노로 다시 렌더 — 채널 합치기와 리샘플링을 브라우저가 알아서 한다
  const frames = Math.ceil(decoded.duration * 16000)
  const off = new OfflineAudioContext(1, frames, 16000)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start()
  const rendered = await off.startRendering()

  const f32 = rendered.getChannelData(0)
  const pcm = new Int16Array(f32.length)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return pcm
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  const STEP = 0x8000 // 한 번에 넘기면 인자 개수 한계로 터진다
  for (let i = 0; i < bytes.length; i += STEP) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + STEP)))
  }
  return btoa(s)
}

type Phase = 'idle' | 'connecting' | 'live' | 'speaking'

export default function LipsyncTestClient() {
  const [avatarId, setAvatarId] = useState('')
  const [idKind, setIdKind] = useState<'persona' | 'avatar'>('persona')
  const [instructor, setInstructor] = useState('yun_daeun')
  const [picked, setPicked] = useState(SENTENCES[1]) // ②가 핵심이라 기본값
  const [custom, setCustom] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [log, setLog] = useState<string[]>([])

  const clientRef = useRef<ReturnType<typeof createClient> | null>(null)
  const streamRef = useRef<{ sendAudioChunk: (b: string) => void; endSequence: () => void } | null>(null)

  const say = useCallback((m: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString('ko-KR')}  ${m}`, ...prev].slice(0, 40))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('anam-avatar-id')
    if (saved) setAvatarId(saved)
  }, [])

  useEffect(() => () => { clientRef.current?.stopStreaming?.() }, [])

  /* ── 세션 시작 ── */
  const start = useCallback(async () => {
    if (!avatarId.trim()) { say('아바타 id를 먼저 넣으세요.'); return }
    setPhase('connecting')
    localStorage.setItem('anam-avatar-id', avatarId.trim())
    try {
      const res = await fetch('/api/anam-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: avatarId.trim(), kind: idKind }),
      })
      const data = await res.json()
      if (!res.ok) {
        say(`세션 발급 실패 (${data.status ?? res.status}) — ${data.hint || data.body || data.error}`)
        setPhase('idle')
        return
      }

      // disableInputAudio: 학생 마이크를 쓰지 않는다. 우리가 넣는 음성에만 반응해야 비교가 성립한다
      const client = createClient(data.sessionToken, { disableInputAudio: true })
      clientRef.current = client
      await client.streamToVideoElement('anam-video')
      streamRef.current = client.createAgentAudioInputStream({
        encoding: 'pcm_s16le',
        sampleRate: 16000,
        channels: 1,
      })
      setPhase('live')
      say('세션 연결됨. 문장을 골라 「이 문장 말하기」를 누르세요.')
    } catch (e) {
      say(`세션 오류 — ${e instanceof Error ? e.message : String(e)}`)
      setPhase('idle')
    }
  }, [avatarId, say])

  /* ── 말하기: TTS → 변환 → 전송 ── */
  const speak = useCallback(async () => {
    const text = (custom.trim() || picked.text).replace(/\n/g, ' ')
    const stream = streamRef.current
    if (!stream) { say('세션이 없습니다.'); return }
    setPhase('speaking')
    try {
      say('ElevenLabs 음성 생성 중…')
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, instructor }),
      })
      const data = await res.json()
      /* /api/tts 는 키가 없든 호출이 실패하든 똑같이 useNativeTts 로 떨어진다(시연 중 멈추지 않으려고).
         여기서는 원인을 알아야 하므로 둘 다 짚어 준다. 자세한 사유는 dev 서버 콘솔에 찍힌다. */
      if (!data.audioContent) {
        say('TTS 실패 — ① .env.local 에 ELEVENLABS_API_KEY 가 있는지 ② 그 계정에 이 강사 voice 가 있는지 확인하세요. (서버 콘솔에 상세 사유)')
        setPhase('live')
        return
      }

      const pcm = await mp3ToPcm16k(data.audioContent)
      const secs = (pcm.length / 16000).toFixed(1)
      say(`변환 완료 — ${secs}초, PCM 16kHz 모노`)

      // 1초 단위로 쪼개 보낸다. Anam 은 실시간보다 빨리 받아 버퍼링하므로 기다릴 필요가 없다
      const bytes = new Uint8Array(pcm.buffer)
      const CHUNK = 16000 * 2
      for (let i = 0; i < bytes.length; i += CHUNK) {
        stream.sendAudioChunk(toBase64(bytes.subarray(i, i + CHUNK)))
      }
      stream.endSequence()
      say(`전송 완료 — ${Math.ceil(bytes.length / CHUNK)}개 조각. 지금부터 녹화해서 0.25배속으로 보세요.`)
    } catch (e) {
      say(`오류 — ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setPhase('live')
    }
  }, [custom, picked, instructor, say])

  const stop = useCallback(() => {
    clientRef.current?.stopStreaming?.()
    clientRef.current = null
    streamRef.current = null
    setPhase('idle')
    say('세션 종료.')
  }, [say])

  const live = phase === 'live' || phase === 'speaking'

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">립싱크 실측 하네스 — Anam × ElevenLabs</h1>
        <p className="mt-2 text-sm text-slate-600">
          강사 음성을 그대로 아바타에 흘려 <b>한국어·한영 혼용에서 입 모양이 맞는지</b>를 본다.
          키는 서버에만 있고 브라우저에는 단기 세션 토큰만 내려온다.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* 영상 */}
          <div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video id="anam-video" autoPlay playsInline className="aspect-[4/3] w-full object-cover" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {!live ? (
                <button
                  onClick={start}
                  disabled={phase === 'connecting'}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {phase === 'connecting' ? '연결 중…' : '세션 시작'}
                </button>
              ) : (
                <>
                  <button
                    onClick={speak}
                    disabled={phase === 'speaking'}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {phase === 'speaking' ? '전송 중…' : '이 문장 말하기'}
                  </button>
                  <button onClick={stop} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
                    세션 종료
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 설정 */}
          <div className="space-y-4 text-sm">
            <div>
              <span className="font-semibold">Anam id</span>
              <div className="mt-1 flex gap-1">
                {(['persona', 'avatar'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setIdKind(k)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                      idKind === k ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    {k === 'persona' ? '페르소나 id' : '아바타 id'}
                  </button>
                ))}
              </div>
              <input
                value={avatarId}
                onChange={(e) => setAvatarId(e.target.value)}
                placeholder="lab.anam.ai 에서 복사한 uuid"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-slate-500">
                둘 다 uuid라 생김새로 구분되지 않는다. 실패하면 반대쪽으로 바꿔 본다.
                <b className="text-slate-700"> API 키는 여기가 아니라 <code>.env.local</code></b> 에 넣는다.
              </p>
            </div>

            <label className="block">
              <span className="font-semibold">강사 목소리</span>
              <select
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {INSTRUCTORS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </label>

            <div>
              <span className="font-semibold">문장</span>
              <div className="mt-1 space-y-1">
                {SENTENCES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setPicked(s); setCustom('') }}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-xs ${
                      picked.id === s.id && !custom ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    }`}
                  >
                    <b>{s.label}</b>
                    <span className="mt-0.5 block text-slate-500">{s.hint}</span>
                  </button>
                ))}
              </div>
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="직접 입력하면 이쪽이 우선"
                rows={2}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>

        <pre className="mt-6 max-h-56 overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
          {log.length ? log.join('\n') : '기록이 여기에 표시됩니다.'}
        </pre>
      </div>
    </main>
  )
}
