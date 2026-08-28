'use client'

/* ── 마이크 버튼 (ElevenLabs Scribe STT — 녹음 → 정지 → 전사) ──
   08-28 에 브라우저 내장 Web Speech(`webkitSpeechRecognition`)에서 갈아탔다. 이유 셋:
   ① **브라우저마다 뒤가 다르다.** 크롬은 구글, 엣지는 마이크로소프트로 간다. 엣지에서
      에러 하나 없이 빈 결과만 돌아와서, 학생 눈에는 "말해도 아무 일이 없는 화면"이 됐다(실측).
   ② 우리가 3사 비교로 고른 엔진이 따로 있는데, 정작 학생이 말하는 화면 하나가 그 평가에
      **없던 엔진**을 쓰고 있었다.
   ③ Scribe 는 서버(`/api/stt`)를 타므로 브라우저와 무관하게 같은 결과가 나온다.

   ⚠️ **실시간이 아니다.** 배치 전사라 "녹음 → 정지 → 전송" 이다. 그래서 중간 결과가 없고,
      정지를 눌러야 글자가 나온다. 버튼이 그 순서를 그대로 말해 준다. */

import { useEffect, useRef, useState } from 'react'

/** 파형 그림판 — **마이크 원 둘레**에 두른다. 버튼(40px)보다 크게 잡고 바깥으로 넘치게 두어,
 *  녹음 중에 켜져도 **줄 높이가 밀리지 않는다**(`-inset-3` 로 레이아웃 밖에 그린다). */
const RING = 64
/** 소리가 없을 때의 둘레 반지름. 버튼 반지름(20)보다 살짝 밖이라 테두리를 감싸듯 보인다 */
const RING_R = 24
/** 소리 크기가 밀어내는 폭 */
const RING_AMP = 7

/** 녹음한 소리가 이만큼도 안 움직였으면 **마이크가 죽은 것**으로 본다.
 *  128 을 가운데로 하는 파형에서 speech 는 쉽게 5~60 을 넘긴다. 무음은 0~1 이다. */
const SILENCE_PEAK = 2

/** ── Scribe 는 **말이 아닌 소리에 대괄호 딱지**를 붙여 돌려준다 ──
 *  아무 말 없이 녹음을 끝내면 "[마이크 테스트]", 신호음을 넣으면 "[통화 연결음]" 이 온다(실측).
 *  그건 학생이 한 말이 아니다 — 그대로 받으면 빈칸에 "[마이크 테스트]" 가 박히고, 채점기는
 *  그걸 오답으로 세어 버린다. 딱지를 떼고 **남는 말이 없으면 못 알아들은 것으로 친다.** */
const stripNonSpeech = (t: string) =>
  t.replace(/[[(][^\])]*[\])]/g, ' ').replace(/\s+/g, ' ').trim()

type Phase = 'idle' | 'recording' | 'sending'

export default function MicButton({ lang, onResult, onInterim, onStart, className, label }: {
  /** 'ko-KR' · 'en-US' — Scribe 에 언어 힌트로 넘긴다(앞 두 글자만) */
  lang: string
  onResult: (t: string) => void
  /** ── 말하는 **도중**에 들리는 말 (읽어가는 자리를 표시하는 용도) ──
   *  ⚠️ 이건 **Scribe 가 아니라 브라우저 내장 인식**이다. Scribe 는 배치 전사라 중간 결과가
   *     없어서, 실시간 표시를 하려면 이것 말고 방법이 없다. 대신 **답으로는 절대 쓰지 않는다** —
   *     브라우저마다 뒤가 달라 믿을 수 없어서 갈아탄 것이 그것이다(엣지는 빈 결과만 준다).
   *     못 받으면 강조가 안 될 뿐, 답은 Scribe 가 그대로 낸다. 녹음이 끝나면 '' 로 부른다. */
  onInterim?: (t: string) => void
  /** 녹음이 **시작된** 순간. 다시 말하는 자리에서 앞서 넣은 답을 비우는 데 쓴다 */
  onStart?: () => void
  className?: string
  /** 버튼 옆에 붙는 한 마디 — 무엇을 말해야 하는지 알려 준다 */
  label?: string
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  /** 무엇이 잘못됐는지 **학생에게 보이는** 한 마디. 조용히 실패하지 않는다 —
   *  오늘 하루를 태운 게 정확히 "아무 말 없이 아무 일도 안 일어남" 이었다. */
  const [problem, setProblem] = useState<string | null>(null)
  // SSR과 첫 클라이언트 렌더가 같아야 하므로(hydration) 지원 여부는 마운트 후 판별
  const [supported, setSupported] = useState(false)

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const acRef = useRef<AudioContext | null>(null)
  const anRef = useRef<AnalyserNode | null>(null)
  /** 실시간 강조용 브라우저 인식기 — 있으면 쓰고 없으면 만다 */
  const previewRef = useRef<SpeechRecognition | null>(null)
  const rafRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  /** 녹음하는 동안 본 최대 진폭 — 정지할 때 "소리가 있었나"를 이걸로 가른다 */
  const peakRef = useRef(0)

  /** 마이크·계측기를 놓는다. 놓지 않으면 탭에 녹음 표시가 남고 다음 녹음이 어긋난다. */
  const release = () => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    try { acRef.current?.close() } catch { /* noop */ }
    acRef.current = null
    anRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recRef.current = null
    try { previewRef.current?.stop() } catch { /* noop */ }
    previewRef.current = null
    onInterim?.('')
  }

  /** 읽어가는 자리를 비추기 위한 **곁다리 인식**. 실패해도 아무 말 안 하고 넘어간다 —
   *  이건 답을 만드는 길이 아니라 **화면을 거들 뿐**이다. */
  const startPreview = () => {
    if (!onInterim) return
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return
    try {
      const rec = new Ctor()
      rec.lang = lang
      rec.interimResults = true
      rec.continuous = true
      let done = ''
      rec.onresult = (e: SpeechRecognitionEvent) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) done += t; else interim += t
        }
        onInterim(`${done}${interim}`.trim())
      }
      rec.onerror = () => { /* 강조가 안 될 뿐이다 */ }
      previewRef.current = rec
      rec.start()
    } catch { /* noop */ }
  }

  useEffect(() => {
    setSupported(!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined')
    return () => {
      try { recRef.current?.state === 'recording' && recRef.current.stop() } catch { /* noop */ }
      release()
    }
  }, [])

  if (!supported) return null

  const start = async () => {
    setProblem(null)
    peakRef.current = 0
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      const name = (e as Error).name
      setProblem(name === 'NotAllowedError' ? '마이크가 막혀 있어요 (주소창 자물쇠에서 허용)'
        : '마이크를 열 수 없어요 (다른 프로그램이 쓰는 중일 수 있어요)')
      return
    }
    streamRef.current = stream

    /* ── 소리가 실제로 들어오는지 **재면서** 녹음한다 ──
       마이크 권한이 열려 있어도 장치가 무음을 주는 일이 있다(08-28 실측: 입력 레벨이 계속 0).
       그걸 모르면 빈 전사만 돌아와서 "인식을 못 했다" 로 잘못 읽는다. 여기서 갈라 준다. */
    try {
      const ac = new AudioContext()
      acRef.current = ac
      const an = ac.createAnalyser()
      an.fftSize = 1024
      ac.createMediaStreamSource(stream).connect(an)
      anRef.current = an
      const buf = new Uint8Array(an.fftSize)
      /* 재는 김에 **그린다** — 학생이 "지금 내 말이 들어가고 있나"를 눈으로 알아야 한다.
         Scribe 는 배치 전사라 말하는 중에 글자를 띄워 줄 수가 없다(중간 결과가 없다).
         그래서 글자 대신 **소리 자체**를 보여준다. */
      const POINTS = 72
      const draw = () => {
        rafRef.current = requestAnimationFrame(draw)
        an.getByteTimeDomainData(buf)
        for (let i = 0; i < buf.length; i++) { const d = Math.abs(buf[i] - 128); if (d > peakRef.current) peakRef.current = d }
        const cv = canvasRef.current
        const ctx = cv?.getContext('2d')
        if (!cv || !ctx) return
        const dpr = window.devicePixelRatio || 1
        if (cv.width !== RING * dpr) { cv.width = RING * dpr; cv.height = RING * dpr }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, RING, RING)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#EF4444'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        const c = RING / 2
        const step = Math.max(1, Math.floor(buf.length / POINTS))
        for (let i = 0; i <= POINTS; i++) {
          /* 마지막 점은 첫 점과 같게 이어 **닫힌 고리**로 만든다 — 이음매가 보이면 튄다 */
          const s = (i % POINTS) * step
          const v = (buf[Math.min(s, buf.length - 1)] - 128) / 128
          const r = RING_R + v * RING_AMP
          const a = (i / POINTS) * Math.PI * 2 - Math.PI / 2
          const x = c + Math.cos(a) * r
          const y = c + Math.sin(a) * r
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
      }
      draw()
    } catch { /* 계측이 안 되면 녹음은 그대로 간다 — 없어도 되는 장치다 */ }

    const chunks: Blob[] = []
    const rec = new MediaRecorder(stream)
    recRef.current = rec
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    rec.onstop = () => {
      const quiet = acRef.current !== null && peakRef.current <= SILENCE_PEAK
      release()
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
      if (quiet || blob.size < 1000) {
        setPhase('idle')
        /* 학생에게는 **할 일 한 마디**만 준다 — 화면에 장치 설명을 늘어놓아 봐야 읽지 않는다.
           다만 진짜 원인은 남긴다: 이건 "못 알아들었다" 가 아니라 **마이크가 무음** 이라는 뜻이고,
           그 둘을 구분 못 해서 08-28 오전을 통째로 헤맸다. 콘솔에만 적는다. */
        console.log('[정리] 녹음에 소리가 없었다 — 윈도우 소리 설정의 입력 장치를 확인할 것',
          { peak: peakRef.current, bytes: blob.size })
        setProblem('다시 말씀해 주세요')
        return
      }
      void send(blob)
    }
    rec.start()
    startPreview()
    setPhase('recording')
    /* 앞서 넣은 답을 여기서 비운다 — 다시 말하는 중에 **옛 답이 칸에 남아 있으면**
       무엇이 지금 들어가는 말인지 알 수 없다(08-28 지적). 문장도 다시 흐려져 읽어가는
       자리가 처음부터 켜진다. */
    onStart?.()
  }

  const send = async (blob: Blob) => {
    setPhase('sending')
    try {
      const form = new FormData()
      form.append('audio', blob, 'audio.webm')
      form.append('language_code', lang.slice(0, 2))
      const res = await fetch('/api/stt', { method: 'POST', body: form })
      if (!res.ok) {
        setProblem('옮기지 못했어요. 잠시 뒤 다시 해 주세요')
        return
      }
      const { text } = (await res.json()) as { text?: string }
      const said = stripNonSpeech(text ?? '')
      if (!said) { setProblem('다시 말씀해 주세요'); return }
      onResult(said)
    } catch {
      setProblem('보내지 못했어요. 연결을 확인해 주세요')
    } finally {
      setPhase('idle')
    }
  }

  const toggle = () => {
    if (phase === 'sending') return
    if (phase === 'recording') {
      try { recRef.current?.stop() } catch { release(); setPhase('idle') }
      return
    }
    void start()
  }

  const button = (
    <button type="button" onClick={toggle} aria-label="음성 입력" disabled={phase === 'sending'}
      /* 못 알아들었으면 **버튼이 직접 알린다** — 빨간 테두리로 한 번 흔들린다.
         옆 글자만으로는 눈이 문장에 가 있어서 지나친다. 다시 누르면 원래대로 돌아온다. */
      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
        phase === 'recording' ? 'bg-[#EF4444] border-[#EF4444] text-white animate-pulse'
          : phase === 'sending' ? 'bg-[#F1F5F9] border-[#E2E8F0] text-[#94A3B8]'
            : problem ? 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C] animate-shake'
              : 'bg-white border-[#BFDBFE] text-[#2563EB] hover:bg-[#EFF6FF]'
      } ${className ?? ''}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
      </svg>
    </button>
  )
  /* 파형은 **버튼을 감싸는 고리**다. `-inset-3` 로 레이아웃 밖에 그려서 줄 높이가 안 밀린다. */
  const mic = (
    <span className="relative inline-flex shrink-0">
      {phase === 'recording' && (
        <canvas ref={canvasRef} aria-hidden
          className="absolute -inset-3 pointer-events-none"
          style={{ width: RING, height: RING }} />
      )}
      <span className="relative">{button}</span>
    </span>
  )

  /* ── 옆에 무슨 글자를 붙일 것인가 ──
     · 잘못된 것이 있으면 **그 말이 먼저**다. 조용히 실패하지 않는다.
     · `label` 을 안 준 자리(문장 옆에 버튼만 세운 자리)에서는 **평소에 아무 글자도 안 붙인다** —
       같은 지시문이 문항마다 되풀이되면 화면이 그 말로 뒤덮인다. 지시는 위에 한 번만 있다.
       다만 '옮기는 중' 은 남긴다. 그 몇 초 동안 아무 표시가 없으면 멈춘 것으로 읽힌다. */
  const line = problem
    ?? (phase === 'sending' ? '옮기는 중…'
      : phase === 'recording' ? (label ? '듣고 있어요… 다 말하면 마이크를 다시 눌러 주세요' : null)
        : label ?? null)

  if (!line) return mic
  return (
    <div className="flex items-center gap-2">
      {mic}
      {line && (
        <span className={`text-[12px] font-semibold whitespace-nowrap ${
          problem ? 'text-[#B91C1C]' : phase === 'recording' ? 'text-[#B91C1C]' : 'text-[#64748B]'
        }`}>{line}</span>
      )}
    </div>
  )
}
