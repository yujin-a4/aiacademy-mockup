'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SimliClient, LogLevel } from 'simli-client'
import { SENTENCES, INSTRUCTORS, fetchInstructorMp3, mp3ToPcm16k, fileToPcm16k } from '../sentences'

/**
 * 립싱크 실측 — Simli 패널
 *
 * Anam·클레온과 **같은 문장·같은 강사 음성**을 넣고 입 모양만 비교한다.
 *
 * SDK 는 v3 (simli-client 3.x) 기준이다. v1/v2 예제와 생성자가 다르므로 주의:
 *   v1  SimliClient.Initialize({ apiKey, faceID, ... })   ← 키가 브라우저로 간다. 쓰지 않는다
 *   v3  new SimliClient(session_token, video, audio, ice) ← 키는 서버에만. 이쪽을 쓴다
 *
 * 오디오는 **PCM 16bit·16kHz·모노**를 Uint8Array 로 넣는다(문서에 명시).
 * 클레온과 달리 형식을 더듬을 필요가 없어 샘플레이트 선택 UI 도 없다.
 */

/** SDK 내부 워크렛이 3000 샘플(=6000바이트)씩 끊어 보낸다. 수동 전송도 같은 크기로 맞춘다. */
const CHUNK_BYTES = 6000

const RATE = 16000

/** 립싱크 엔진 선택. 어느 쪽이 한국어에 유리한지가 이번 실측의 관심사라 화면에서 바꿀 수 있게 둔다. */
const MODELS = [
  { id: '', label: '기본값', note: '업체 기본 모델. 먼저 이걸로 기준선을 잡는다' },
  { id: 'fasttalk', label: 'fasttalk', note: '지연이 짧은 대신 입 모양이 뭉개지는지 본다' },
  { id: 'artalk', label: 'artalk', note: '품질 우선. 지연이 수업 흐름을 끊는지 본다' },
] as const

type Phase = 'idle' | 'connecting' | 'live' | 'speaking'

export default function SimliPanel() {
  const [faceId, setFaceId] = useState('')
  const [model, setModel] = useState<string>('')
  const [instructor, setInstructor] = useState('yun_daeun')
  const [picked, setPicked] = useState(SENTENCES[1]) // ②가 핵심이라 기본값
  const [custom, setCustom] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [log, setLog] = useState<string[]>([])

  const clientRef = useRef<SimliClient | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const say = useCallback((m: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString('ko-KR')}  ${m}`, ...prev].slice(0, 40))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('simli-face-id')
    if (saved) setFaceId(saved)
  }, [])

  useEffect(() => () => { void clientRef.current?.stop() }, [])

  /* ── 세션 시작 ── */
  const start = useCallback(async () => {
    const video = videoRef.current
    const audio = audioRef.current
    if (!video || !audio) { say('영상 요소가 아직 준비되지 않았습니다.'); return }

    setPhase('connecting')
    try {
      const res = await fetch('/api/simli-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceId: faceId.trim(), model: model || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        say(`세션 발급 실패 (${data.status ?? res.status}) — ${data.hint || data.body || data.error}`)
        setPhase('idle')
        return
      }
      if (faceId.trim()) localStorage.setItem('simli-face-id', faceId.trim())
      if (!data.iceServers) say('⚠ ICE 서버를 못 받았습니다. 연결이 안 붙으면 이 줄을 의심하세요.')

      const client = new SimliClient(
        data.sessionToken,
        video,
        audio,
        data.iceServers ?? null,
        LogLevel.ERROR, // DEBUG 가 기본이라 콘솔이 묻힌다. 우리 기록은 아래 로그창에 남긴다
      )
      clientRef.current = client

      client.on('start', () => { setPhase('live'); say('세션 연결됨. 문장을 골라 「이 문장 말하기」를 누르세요.') })
      client.on('stop', () => { setPhase('idle'); say('세션이 종료되었습니다.') })
      client.on('error', (d) => say(`오류 — ${d}`))
      client.on('startup_error', (m) => { setPhase('idle'); say(`시작 실패 — ${m}`) })
      /* speaking/silent 는 판정에 직접 쓴다 — 소리를 다 보낸 뒤 silent 까지 걸린 시간이 곧 꼬리 지연이다 */
      client.on('speaking', () => say('· speaking'))
      client.on('silent', () => say('· silent'))

      await client.start()
      say('start() 반환됨. connected 이벤트를 기다립니다.')
    } catch (e) {
      say(`세션 오류 — ${e instanceof Error ? e.message : String(e)}`)
      setPhase('idle')
    }
  }, [faceId, model, say])

  /* ── 말하기: TTS → PCM 16k → 전송 ── */
  const speak = useCallback(async () => {
    const client = clientRef.current
    if (!client) { say('세션이 없습니다.'); return }
    setPhase('speaking')
    try {
      /* 음성 출처 — 고른 파일이 있으면 그것을 쓴다. ElevenLabs 가 막혀도 립싱크는 봐야 하기 때문. */
      let pcm: Int16Array
      if (file) {
        say(`파일 사용 — ${file.name}`)
        pcm = await fileToPcm16k(file, RATE)
      } else {
        const text = (custom.trim() || picked.text).replace(/\n/g, ' ')
        say('ElevenLabs 음성 생성 중…')
        const mp3 = await fetchInstructorMp3(text, instructor)
        if (!mp3) {
          say('TTS 실패 — ELEVENLABS 키/계정을 확인하거나, 아래에서 음성 파일을 직접 고르세요.')
          setPhase('live'); return
        }
        pcm = await mp3ToPcm16k(mp3, RATE)
      }

      say(`변환 완료 — ${(pcm.length / RATE).toFixed(1)}초, PCM 16kHz 모노`)

      /* 앞 문장이 남아 있으면 섞인다. 매번 비우고 시작해야 같은 조건이 된다. */
      client.ClearBuffer()

      const bytes = new Uint8Array(pcm.buffer)
      let n = 0
      for (let i = 0; i < bytes.length; i += CHUNK_BYTES) {
        client.sendAudioData(bytes.subarray(i, i + CHUNK_BYTES))
        n++
      }
      say(`전송 완료 — ${n}개 조각(조각당 ${(CHUNK_BYTES / (RATE * 2) * 1000).toFixed(0)}ms). 지금부터 녹화해서 0.25배속으로 보세요.`)
    } catch (e) {
      say(`오류 — ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setPhase('live')
    }
  }, [custom, picked, instructor, file, say])

  const stop = useCallback(async () => {
    await clientRef.current?.stop()
    clientRef.current = null
    setPhase('idle')
    say('세션 종료.')
  }, [say])

  const live = phase === 'live' || phase === 'speaking'

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">립싱크 실측 — Simli × ElevenLabs</h1>
          <Link href="/lipsync-test" className="text-sm text-blue-600 underline">Anam 패널 →</Link>
          <Link href="/lipsync-test/klleon" className="text-sm text-blue-600 underline">클레온 패널 →</Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Anam·클레온과 <b>같은 문장·같은 강사 음성</b>을 넣어 입 모양만 비교한다.
          오디오 형식이 <b>PCM 16kHz 모노</b>로 문서에 명시되어 있어 형식을 더듬을 필요가 없다.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* 영상 */}
          <div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} autoPlay playsInline className="aspect-[4/3] w-full object-cover" />
              {/* SDK 가 오디오 트랙을 따로 붙인다. 화면에는 필요 없지만 DOM 에 있어야 한다 */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio ref={audioRef} autoPlay />
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
                  <button
                    onClick={() => { clientRef.current?.ClearBuffer(); say('버퍼 비움.') }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                  >
                    말 끊기
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
            <label className="block">
              <span className="font-semibold">face id</span>
              <input
                value={faceId}
                onChange={(e) => setFaceId(e.target.value)}
                placeholder="app.simli.com 에서 복사"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <span className="mt-1 block text-xs text-slate-500">
                비워 두면 <code>.env.local</code> 의 <code>SIMLI_FACE_ID</code> 를 쓴다.
                <b className="text-slate-700"> API 키는 여기가 아니라 <code>.env.local</code></b> 의 <code>SIMLI_API_KEY</code> 에 넣는다.
              </span>
            </label>

            <div>
              <span className="font-semibold">립싱크 모델</span>
              <div className="mt-1 space-y-1">
                {MODELS.map((m) => (
                  <button
                    key={m.id || 'default'}
                    onClick={() => setModel(m.id)}
                    disabled={live}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-xs disabled:opacity-40 ${
                      model === m.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    }`}
                  >
                    <b>{m.label}</b>
                    <span className="mt-0.5 block text-slate-500">{m.note}</span>
                  </button>
                ))}
              </div>
              <span className="mt-1 block text-xs text-slate-500">세션 시작 전에 고른다. 바꾸려면 세션을 다시 연다.</span>
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

            <label className="block">
              <span className="font-semibold">음성 파일로 대신하기 <span className="text-xs font-normal text-slate-500">(선택)</span></span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <span className="mt-1 block text-xs text-slate-500">
                {file
                  ? '이 파일을 보냅니다 — 아래 문장 선택은 무시됩니다.'
                  : '업체 간 비교라면 세 패널에 같은 파일을 넣는 쪽이 가장 확실하다.'}
              </span>
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
