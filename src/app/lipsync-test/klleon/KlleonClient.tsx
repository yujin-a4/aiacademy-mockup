'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  SENTENCES, INSTRUCTORS, fetchInstructorMp3, mp3ToPcm16k, fileToPcm16k, toBase64, pcmToWav,
} from '../sentences'

/**
 * 립싱크 실측 — 클레온(Klleon) 패널
 *
 * Anam 과 같은 문장·같은 강사 음성을 넣고 입 모양만 비교한다.
 *
 * ⚠ SDK 가 두 갈래다. 우리 체험 키는 **v1** 에서만 통한다(실측으로 확인).
 *     v1: web.sdk.klleon.io/{ver}/klleon-chat.umd.js · window.KlleonChat
 *         · 오디오  startAudioEcho / endAudioEcho
 *         · 이벤트  onStatusEvent / onChatEvent / onErrorEvent, 준비신호 VIDEO_CAN_PLAY
 *         · 검증    saas.klleon.io/api/v1/chat/connection-status  → success:true
 *     v2: klleon.k1.klleon.io/{ver}/klleon-sdk.umd.js · window.KlleonSDK
 *         · 같은 키로 /v2/... 호출 시 UNAUTHORIZED → 체험에 포함되지 않은 버전
 *
 * 넣을 오디오 형식은 문서에 없다. 형식이 틀리면 립싱크가 통째로 밀리므로,
 * "이상하다"고 판정하기 전에 아래 세 형식을 모두 시도해야 한다.
 */

const SDK_URL = 'https://web.sdk.klleon.io/1.2.0/klleon-chat.umd.js'

/** 0.1MB 초과는 SDK 가 자체적으로 걸러 낸다(getBase64Size → isOverFileSize). 여유를 두고 자른다. */
const RAW_CHUNK = 60000

/** 넣는 소리가 **배속으로 들리면 이 값이 틀린 것**이다.
 *  우리가 만든 레이트보다 업체가 높게 해석하면 그 비율만큼 빨라진다(16k 를 24k 로 읽으면 1.5배).
 *  문서에 값이 없으므로, 소리가 정상 속도로 들리는 값을 찾는 것이 곧 형식을 알아내는 것이다. */
const RATES = [16000, 22050, 24000, 32000, 44100, 48000]

type Fmt = 'pcm' | 'wav' | 'mp3'
const FMTS: { id: Fmt; label: string; note: string }[] = [
  { id: 'pcm', label: 'PCM 16k', note: '조각내어 연속 전송. 연속 전송을 전제한 API 라 이쪽이 유력' },
  { id: 'wav', label: 'WAV 16k', note: '헤더 포함 1회. 0.1MB(≈3초) 넘으면 SDK 가 거른다' },
  { id: 'mp3', label: 'MP3', note: 'ElevenLabs 원본 그대로 1회' },
]

interface KlleonChatSdk {
  init: (o: { sdk_key: string; avatar_id: string; enable_microphone?: boolean; log_level?: string }) => Promise<void>
  onStatusEvent: (cb: (s: string) => void) => void
  onErrorEvent?: (cb: (e: { code?: string; message?: string }) => void) => void
  onChatEvent?: (cb: (d: { chat_type?: string; message?: string }) => void) => void
  startAudioEcho: (audio: string) => void
  endAudioEcho: () => void
  destroy?: () => void
}
declare global {
  interface Window { KlleonChat?: KlleonChatSdk }
}

type Phase = 'idle' | 'connecting' | 'live' | 'speaking'

export default function KlleonClient() {
  const [avatarId, setAvatarId] = useState('')
  const [instructor, setInstructor] = useState('yun_daeun')
  const [picked, setPicked] = useState(SENTENCES[1])
  const [fmt, setFmt] = useState<Fmt>('pcm')
  const [rate, setRate] = useState(24000)
  const [phase, setPhase] = useState<Phase>('idle')
  const [log, setLog] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const sdkRef = useRef<KlleonChatSdk | null>(null)

  const say = useCallback((m: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString('ko-KR')}  ${m}`, ...prev].slice(0, 40))
  }, [])

  useEffect(() => {
    void fetch('/api/klleon-key')
      .then((r) => r.json())
      .then((d) => { if (d.avatarId) setAvatarId((v) => v || d.avatarId) })
      .catch(() => {})
  }, [])

  useEffect(() => () => { sdkRef.current?.destroy?.() }, [])

  const loadSdk = useCallback(async (): Promise<KlleonChatSdk> => {
    if (window.KlleonChat) return window.KlleonChat
    await new Promise<void>((resolve, reject) => {
      const el = document.createElement('script')
      el.src = SDK_URL
      el.onload = () => resolve()
      el.onerror = () => reject(new Error('SDK 스크립트를 불러오지 못했습니다'))
      document.head.appendChild(el)
    })
    if (!window.KlleonChat) throw new Error('window.KlleonChat 이 없습니다')
    return window.KlleonChat
  }, [])

  const start = useCallback(async () => {
    setPhase('connecting')
    try {
      const keyRes = await fetch('/api/klleon-key')
      const key = await keyRes.json()
      if (!keyRes.ok) { say(`키 오류 — ${key.hint ?? key.error}`); setPhase('idle'); return }

      const id = avatarId.trim() || key.avatarId
      if (!id) { say('아바타 id 가 없습니다.'); setPhase('idle'); return }

      say('SDK(v1) 불러오는 중…')
      const sdk = await loadSdk()
      sdkRef.current = sdk

      sdk.onStatusEvent((s) => {
        say(`상태: ${s}`)
        // v1 은 VIDEO_CAN_PLAY 부터 메서드 호출이 가능하다
        if (s === 'VIDEO_CAN_PLAY') setPhase('live')
      })
      sdk.onErrorEvent?.((e) => say(`SDK 오류 — ${e?.code ?? ''} ${e?.message ?? ''}`))
      sdk.onChatEvent?.((d) => { if (d?.chat_type && d.chat_type !== 'TEXT') say(`이벤트: ${d.chat_type}`) })

      // 마이크는 끈다 — 우리가 넣는 음성에만 반응해야 비교가 성립한다
      await sdk.init({ sdk_key: key.sdkKey, avatar_id: id, enable_microphone: false, log_level: 'debug' })
      say('init 호출됨. VIDEO_CAN_PLAY 를 기다립니다.')
    } catch (e) {
      say(`시작 실패 — ${e instanceof Error ? e.message : String(e)}`)
      setPhase('idle')
    }
  }, [avatarId, loadSdk, say])

  const speak = useCallback(async () => {
    const sdk = sdkRef.current
    if (!sdk) { say('세션이 없습니다.'); return }
    setPhase('speaking')
    try {
      /* 음성 출처 — 고른 파일이 있으면 그것을 쓴다. ElevenLabs 계정이 막혀도 립싱크는 봐야 하기 때문. */
      let mp3: string | null = null
      let pcmFromFile: Int16Array | null = null
      if (file) {
        say(`파일 사용 — ${file.name}`)
        pcmFromFile = await fileToPcm16k(file, rate)
      } else {
        say('ElevenLabs 음성 생성 중…')
        mp3 = await fetchInstructorMp3(picked.text, instructor)
        if (!mp3) {
          say('TTS 실패 — ELEVENLABS 키/계정을 확인하거나, 아래에서 음성 파일을 직접 고르세요.')
          setPhase('live'); return
        }
      }

      if (fmt === 'mp3' && mp3) {
        if (mp3.length > 100000) say(`⚠ Base64 ${mp3.length}자 — 0.1MB 제한 초과라 SDK 가 거를 수 있습니다`)
        sdk.startAudioEcho(mp3)
        say(`MP3 그대로 1회 전송 (${Math.round((mp3.length * 3) / 4 / 1024)}KB)`)
      } else {
        const pcm = pcmFromFile ?? await mp3ToPcm16k(mp3!, rate)
        say(`변환 완료 — ${(pcm.length / rate).toFixed(1)}초, PCM ${rate}Hz 모노`)
        if (fmt === 'wav') {
          const b64 = toBase64(pcmToWav(pcm, rate))
          if (b64.length > 100000) say(`⚠ Base64 ${b64.length}자 — 제한 초과. 짧은 문장(③)으로 시도하세요.`)
          sdk.startAudioEcho(b64)
          say('WAV 1회 전송')
        } else {
          const bytes = new Uint8Array(pcm.buffer)
          let n = 0
          for (let i = 0; i < bytes.length; i += RAW_CHUNK) {
            sdk.startAudioEcho(toBase64(bytes.subarray(i, i + RAW_CHUNK)))
            n++
          }
          say(`PCM ${n}조각 전송 (조각당 ${(RAW_CHUNK / (rate * 2)).toFixed(1)}초)`)
        }
      }
      sdk.endAudioEcho()
      say('endAudioEcho 호출. 지금부터 녹화해서 0.25배속으로 보세요.')
    } catch (e) {
      say(`오류 — ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setPhase('live')
    }
  }, [picked, instructor, fmt, file, rate, say])

  const stop = useCallback(() => {
    sdkRef.current?.destroy?.()
    sdkRef.current = null
    setPhase('idle')
    say('세션 종료.')
  }, [say])

  const live = phase === 'live' || phase === 'speaking'

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">립싱크 실측 — 클레온 × ElevenLabs</h1>
          <Link href="/lipsync-test" className="text-sm text-blue-600 underline">Anam 패널 →</Link>
          <Link href="/lipsync-test/simli" className="text-sm text-blue-600 underline">Simli 패널 →</Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Anam 과 <b>같은 문장·같은 강사 음성</b>을 넣어 입 모양만 비교한다.
          체험 키가 통하는 <b>v1 SDK</b>(<code>klleon-chat.umd.js</code>)를 쓴다.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
              {/* SDK 가 이 커스텀 엘리먼트에 영상을 붙인다. init 前에 DOM 에 있어야 한다 */}
              {/* @ts-expect-error 클레온 SDK 가 정의하는 커스텀 엘리먼트 */}
              <avatar-container style={{ width: '100%', aspectRatio: '4 / 3', display: 'block' }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {!live ? (
                <button onClick={start} disabled={phase === 'connecting'}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  {phase === 'connecting' ? '연결 중…' : '세션 시작'}
                </button>
              ) : (
                <>
                  <button onClick={speak} disabled={phase === 'speaking'}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                    {phase === 'speaking' ? '전송 중…' : '이 문장 말하기'}
                  </button>
                  <button onClick={stop} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
                    세션 종료
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <label className="block">
              <span className="font-semibold">아바타 id</span>
              <input value={avatarId} onChange={(e) => setAvatarId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              <span className="mt-1 block text-xs text-slate-500">
                SDK 키는 <code>.env.local</code> 에서 읽는다. 등록 도메인이 <b>localhost:3000</b> 이므로 포트가 3000 이어야 한다.
              </span>
            </label>

            <div>
              <span className="font-semibold">오디오 형식 <span className="text-xs font-normal text-amber-700">문서에 없음 — 바꿔가며 시도</span></span>
              <div className="mt-1 space-y-1">
                {FMTS.map((f) => (
                  <button key={f.id} onClick={() => setFmt(f.id)}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-xs ${
                      fmt === f.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                    <b>{f.label}</b>
                    <span className="mt-0.5 block text-slate-500">{f.note}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="font-semibold">샘플레이트 <span className="text-xs font-normal text-amber-700">배속으로 들리면 이 값</span></span>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {RATES.map((r) => (
                  <button key={r} onClick={() => setRate(r)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                      rate === r ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600'}`}>
                    {(r / 1000).toFixed(r % 1000 ? 2 : 0)}k
                  </button>
                ))}
              </div>
              <span className="mt-1 block text-xs text-slate-500">
                빠르게 들리면 <b>더 큰 값</b>, 느리게 들리면 <b>더 작은 값</b>으로. 소리가 정상 속도로 들리는 값이 정답이다.
              </span>
            </div>

            <label className="block">
              <span className="font-semibold">강사 목소리</span>
              <select value={instructor} onChange={(e) => setInstructor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                {INSTRUCTORS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="font-semibold">음성 파일로 대신하기 <span className="text-xs font-normal text-slate-500">(선택)</span></span>
              <input type="file" accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
              <span className="mt-1 block text-xs text-slate-500">
                {file
                  ? `이 파일을 보냅니다 — 아래 문장 선택은 무시됩니다.`
                  : 'ElevenLabs 가 막혔을 때 미리 받아둔 mp3·wav 를 직접 넣는다. 립싱크만 보면 되므로 목소리 출처는 상관없다.'}
              </span>
            </label>

            <div>
              <span className="font-semibold">문장</span>
              <div className="mt-1 space-y-1">
                {SENTENCES.map((s) => (
                  <button key={s.id} onClick={() => setPicked(s)}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-xs ${
                      picked.id === s.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                    <b>{s.label}</b>
                    <span className="mt-0.5 block text-slate-500">{s.hint}</span>
                  </button>
                ))}
              </div>
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
