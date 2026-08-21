import { INST_TTS_RATE } from '@/data/instructorData'
import { ttsCacheKey } from '@/lib/ttsText'
import ttsManifest from '@/data/ttsManifest.json'

/* ── 미리 만들어 둔 강사 음원 ──
   대본 수업은 **모든 학생이 똑같은 말을 듣는다.** 그런데 실시간 생성은 학생 수만큼 다시 만든다 —
   50명이면 50번, 300명이면 300번. 그래서 대본 발화는 `scripts/gen-scripted-tts.mjs` 로 미리
   만들어 두고, 여기서 파일이 있으면 그걸 튼다.

   **매니페스트에 없으면 조용히 실시간 생성으로 간다.** 이 폴백이 이 구조의 핵심이다 —
   대본이 바뀌어도, 학생 점수가 들어가는 문장("{맞은수}개")처럼 미리 만들 수 없는 줄이어도,
   레일만 있고 대본이 없는 강의여도 그냥 예전처럼 돈다. 미리 만든 것은 **빨라지는 것뿐**이다.

   미리 만들어 두면 좋은 이유가 비용만은 아니다.
     · 소리가 매번 똑같다 — 실시간 생성은 같은 문장도 억양이 조금씩 달라져서, FGI 참가자마다
       미묘하게 다른 수업을 들은 셈이 된다.
     · 현장 네트워크가 나빠도 강사가 말을 한다.
     · 사람이 미리 들어보고 이상한 발음을 잡을 수 있다(참가자가 처음 듣지 않는다). */
const PRERENDERED = ttsManifest as Record<string, string>

/** 미리 만들어 둔 mp3 주소. 없으면 undefined → 실시간 생성.
 *  ⚠️ `text` 는 **실제로 읽는 문자열**이어야 한다(화면 문장이 아니라 koLetters 를 거친 값). */
function prerenderedSrc(text: string, persona: string, instructor?: string): string | undefined {
  return PRERENDERED[ttsCacheKey(text, persona, instructor)]
}

/** 현재 재생 중인 오디오 인스턴스 (전역 추적) */
let _currentAudio: HTMLAudioElement | null = null
let _currentUnlockCleanup: (() => void) | null = null
let _playbackToken = 0

/** 음소거 상태 */
let _muted = false
let _muteListeners: Array<(muted: boolean) => void> = []

export function getMuted(): boolean { return _muted }

export function setMuted(muted: boolean) {
  _muted = muted
  if (_currentAudio) _currentAudio.muted = muted
  _muteListeners.forEach((fn) => fn(muted))
}

/** 음소거 상태 변경 구독. 반환값은 unsubscribe 함수. */
export function onMuteChange(fn: (muted: boolean) => void): () => void {
  _muteListeners.push(fn)
  return () => { _muteListeners = _muteListeners.filter((f) => f !== fn) }
}

/** 영상 종료를 기다리는 Promise resolver */
let _videoEndedResolve: (() => void) | null = null

/** InstructorPanel의 onVideoEnd에서 호출 */
export function notifyVideoEnded() {
  _videoEndedResolve?.()
  _videoEndedResolve = null
}

/** videoSrc 있는 턴에서 영상 끝날 때까지 대기 (최대 60초) */
export function waitForVideoEnd(): Promise<void> {
  return new Promise<void>((resolve) => {
    _videoEndedResolve = resolve
    setTimeout(() => {
      if (_videoEndedResolve === resolve) {
        _videoEndedResolve = null
        resolve()
      }
    }, 60000)
  })
}

/** 현재 재생 중인 오디오를 즉시 중단한다. */
export function stopCurrentAudio() {
  _playbackToken += 1
  _currentUnlockCleanup?.()
  _currentUnlockCleanup = null

  if (_currentAudio) {
    _currentAudio.pause()
    _currentAudio = null
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/** 로컬 MP3/오디오 파일을 재생하고 종료까지 대기.
 *  autoplay가 막히면 첫 사용자 제스처(click/touchstart)를 기다려 재생. */
export async function playLocalAudio(src: string): Promise<void> {
  stopCurrentAudio()
  const token = ++_playbackToken

  return new Promise((resolve) => {
    const audio = new Audio(src)
    audio.muted = _muted
    _currentAudio = audio
    let settled = false

    const cleanupUnlock = () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
      if (_currentUnlockCleanup === cleanupUnlock) _currentUnlockCleanup = null
    }
    const done = () => {
      if (settled) return
      settled = true
      cleanupUnlock()
      if (_currentAudio === audio && _playbackToken === token) _currentAudio = null
      resolve()
    }
    const unlock = () => {
      cleanupUnlock()
      if (_currentAudio !== audio || _playbackToken !== token) {
        done()
        return
      }
      audio.play().catch(done)
    }
    audio.onended = done
    audio.onerror  = done

    audio.play().catch((err) => {
      if (err?.name !== 'NotAllowedError') {
        done()
        return
      }
      // 브라우저 autoplay 정책으로 차단됨 → 첫 제스처 대기 후 재시도
      document.addEventListener('click',      unlock, { once: true })
      document.addEventListener('touchstart', unlock, { once: true })
      _currentUnlockCleanup = cleanupUnlock
    })
  })
}

/**
 * audioSrc가 있으면 로컬 파일을 재생, 없으면 TTS fallback.
 * 오디오 시작 전에 React 렌더링이 완료될 수 있도록 매크로태스크(setTimeout 0)로 한 틱 양보.
 */
export async function speakTurn(
  opts: { audioSrc?: string; script: string; persona: string },
): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 0))
  if (opts.audioSrc) {
    return playLocalAudio(opts.audioSrc)
  }
  // videoSrc가 있거나 오디오 파일이 없으면 TTS 없이 즉시 종료
}

/* ── 받아둔 음원 ──
   같은 문장을 두 번 만들지 않는다. 이게 있어서 **다음 줄을 미리 받아두는 것**(prefetchTTS)이
   가능해진다 — 지금 줄이 나가는 동안 받아두면 다음 턴의 대기가 0이 된다.
   ⚠️ Audio 객체가 아니라 **주소(data URL)** 를 담는다. Audio 를 재사용하면 이미 끝까지 재생된
      상태(currentTime=끝)가 남아 두 번째 재생이 소리 없이 즉시 끝난다.
   메모리 상한을 두는 이유: 한 줄이 수백 KB 라 수업 한 바퀴를 다 담으면 태블릿에서 부담이 된다. */
const _ttsCache = new Map<string, string>()
const _ttsInflight = new Map<string, Promise<string | null>>()
const TTS_CACHE_MAX = 10

function ttsKey(text: string, persona: string, instructor?: string): string {
  return `${instructor ?? ''}|${persona}|${text}`
}

function loadTTS(text: string, persona: string, instructor?: string): Promise<string | null> {
  /* 미리 만들어 둔 파일이 먼저다 — 네트워크도 크레딧도 쓰지 않는다.
     메모리 캐시에 담지 않는 이유: 주소가 정적 파일이라 브라우저가 알아서 캐시한다. */
  const pre = prerenderedSrc(text, persona, instructor)
  if (pre) return Promise.resolve(pre)

  const k = ttsKey(text, persona, instructor)
  const hit = _ttsCache.get(k)
  if (hit) return Promise.resolve(hit)
  const flying = _ttsInflight.get(k)
  if (flying) return flying          // 미리 받는 중이면 **그 요청에 올라탄다**(두 번 만들지 않는다)

  const p = (async () => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona, instructor }),
      })
      const data = await res.json()
      if (!data.useNativeTts && data.audioContent) {
        const src = `data:audio/mp3;base64,${data.audioContent}`
        if (_ttsCache.size >= TTS_CACHE_MAX) _ttsCache.delete(_ttsCache.keys().next().value as string)
        _ttsCache.set(k, src)
        return src
      }
    } catch { /* fall through */ }
    return null
  })()
  _ttsInflight.set(k, p)
  void p.finally(() => { _ttsInflight.delete(k) })
  return p
}

/** 이 문장을 **미리 받아둔다.** 지금 나가는 발화가 끝나기 전에 다음 발화를 받아두는 용도라
 *  결과를 기다리지 않는다(실패해도 조용히 넘어간다 — 그때 가서 정상 경로로 다시 받는다).
 *  ⚠️ `speakTTS` 에 넘기는 것과 **똑같은 문자열**을 줘야 한다(koLetters 를 거쳤다면 그것까지) —
 *     한 글자라도 다르면 캐시가 빗나가서 미리 받은 보람이 없다. */
export function prefetchTTS(text: string, persona: string, instructor?: string): void {
  void loadTTS(text, persona, instructor)
}

/** TTS 오디오를 미리 fetch해서 Audio 객체로 반환. 실패 시 null. */
/** @param instructor 강사 id — 주면 **그 강사 목소리**로 읽는다(없으면 기본 목소리) */
export async function fetchTTSAudio(text: string, persona: string, instructor?: string): Promise<HTMLAudioElement | null> {
  const src = await loadTTS(text, persona, instructor)
  if (!src) return null
  const audio = new Audio(src)
  /* 이 강사가 느리게 말하기로 돼 있으면 여기서 늦춘다 — v3 는 생성 단계에서 속도를 못 준다.
     preservesPitch 를 켜지 않으면 목소리가 굵어져 다른 사람이 된다.
     **강사 목소리에만** 건다 — 문제 음원(playLocalAudio)은 시험 자료라 손대면 안 된다. */
  const rate = instructor ? INST_TTS_RATE[instructor] : undefined
  if (rate && rate !== 1) {
    audio.preservesPitch = true
    audio.playbackRate = rate
  }
  /* 디코더가 준비되기 전에 play() 하면 **첫 음절이 얇게 날아간다.** data URI 라 대개 즉시
     끝나지만, 재생 속도를 바꾼 목소리는 시간을 늘였다 줄이는 처리가 앞에 붙어 더 걸린다.
     기다리다 못 듣는 게 더 나쁘므로 상한을 두고, 넘으면 그냥 재생한다. */
  await waitReady(audio)
  return audio
}

/** 소리 앞뒤가 잘려 들리지 않도록 두는 여유 (ms) */
const HEAD_WAIT_MS = 400
const TAIL_HOLD_MS = 220

function waitReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= 3 /* HAVE_FUTURE_DATA */) return Promise.resolve()
  return new Promise((resolve) => {
    let settled = false
    const done = () => { if (settled) return; settled = true; clearTimeout(timer); resolve() }
    const timer = setTimeout(done, HEAD_WAIT_MS)
    audio.addEventListener('canplaythrough', done, { once: true })
    audio.addEventListener('error', done, { once: true })
  })
}

/** fetch 완료 후 재생 전에 취소 여부를 확인하고 싶을 때 사용. */
export function getPlaybackToken(): number { return _playbackToken }

/** 이미 준비된 Audio 객체를 재생하고 종료까지 대기.
 *  autoplay 차단(NotAllowedError) 시 다음 사용자 제스처까지 대기 후 재시도. */
export async function playAndWait(audio: HTMLAudioElement): Promise<void> {
  stopCurrentAudio()
  const token = ++_playbackToken
  audio.muted = _muted
  _currentAudio = audio
  return new Promise((resolve) => {
    let settled = false

    const cleanupUnlock = () => {
      document.removeEventListener('click', tryUnlock)
      document.removeEventListener('touchstart', tryUnlock)
      if (_currentUnlockCleanup === cleanupUnlock) _currentUnlockCleanup = null
    }

    const done = () => {
      if (settled) return
      settled = true
      cleanupUnlock()
      if (_currentAudio === audio && _playbackToken === token) _currentAudio = null
      /* ── 꼬리 여유 ──
         onended 는 **미디어 시계** 기준이라 소리가 실제로 스피커에서 사라지기 전에 온다.
         재생 속도를 바꾼 목소리(INST_TTS_RATE)는 시간을 늘였다 줄이는 처리가 파이프라인에
         남아 있어 그 차이가 더 벌어진다. 곧바로 다음 동작으로 넘어가면 꼬리가 잘린 것처럼
         들린다 — 말과 말 사이에 숨 쉴 자리를 두는 뜻도 겸한다. */
      setTimeout(resolve, TAIL_HOLD_MS)
    }

    const tryUnlock = () => {
      cleanupUnlock()
      if (_currentAudio !== audio || _playbackToken !== token) { done(); return }
      audio.play().catch(done)
    }

    audio.onended = done
    audio.onerror = done
    audio.play().catch((err) => {
      if ((err as Error)?.name !== 'NotAllowedError') { done(); return }
      // autoplay 차단 → 다음 클릭/터치 시 재시도
      document.addEventListener('click', tryUnlock, { once: true })
      document.addEventListener('touchstart', tryUnlock, { once: true })
      _currentUnlockCleanup = cleanupUnlock
    })
  })
}

/** 지금 나가는 강사 음원의 재생 위치. 없으면(아직 받는 중이거나 브라우저 TTS) null.
 *  화면이 **말과 글자를 맞추는 데** 쓴다 — 글자를 시간으로 흘려보내면 소리와 어긋나지만,
 *  재생 위치를 따라가면 어긋날 수가 없다. */
export function playbackProgress(): { current: number; duration: number } | null {
  const a = _currentAudio
  if (!a || !Number.isFinite(a.duration) || a.duration <= 0) return null
  return { current: a.currentTime, duration: a.duration }
}

/* koLetters 는 ttsText.ts 로 옮겼다 — 미리 음원을 만드는 생성기가 **같은 변환**을 거쳐야
   캐시 키가 맞아떨어진다. 여기서는 예전처럼 '@/lib/tts' 에서 가져다 쓰도록 다시 내보낸다. */
export { koLetters } from '@/lib/ttsText'

/** fetchTTSAudio + playAndWait + speechSynthesis fallback.
 *  fetch 완료 후 토큰을 재확인해 화면 전환 중에 fetch가 끝난 경우 재생을 막는다.
 *
 *  @param onStart **소리가 나가기 직전**에 한 번 불린다 — 화면이 글자를 내보내기 시작하는 신호다.
 *    이게 없으면 화면은 "음원이 언제 오는가"를 시간으로 추측할 수밖에 없고, 모델이 느려지면
 *    (v3) 추측이 빗나가 글자가 소리보다 먼저 흐른다. 받는 데 걸린 시간과 무관하게 정확하다.
 *    `hasAudio` 는 강사 음원으로 나가는지(true) 브라우저 TTS 로 떨어졌는지(false)를 알려준다 —
 *    브라우저 TTS 는 재생 위치를 읽을 수 없어 화면이 글자를 흘리는 방식을 갈라야 한다. */
export async function speakTTS(
  text: string, persona: string, instructor?: string,
  onStart?: (hasAudio: boolean) => void,
): Promise<void> {
  const token = _playbackToken
  const audio = await fetchTTSAudio(text, persona, instructor)
  if (_playbackToken !== token) return  // fetch 중 stopCurrentAudio 호출됨
  if (audio) {
    onStart?.(true)
    await playAndWait(audio)
  } else {
    if (_playbackToken !== token) return
    onStart?.(false)
    await new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window)) { resolve(); return }
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'ko-KR'
      utt.rate = persona === 'driller' ? 1.2 : 0.95
      let settled = false
      const done = () => { if (settled) return; settled = true; resolve() }
      utt.onend = done
      utt.onerror = done
      setTimeout(done, Math.max(4000, text.length * 200))
      window.speechSynthesis.speak(utt)
    })
  }
}

export async function speakAndWait(text: string, persona: string): Promise<void> {
  stopCurrentAudio()
  const token = ++_playbackToken

  let audio: HTMLAudioElement | null = null
  const pre = prerenderedSrc(text, persona)
  if (pre) {
    audio = new Audio(pre)
  } else try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, persona }),
    })
    const data = await res.json()
    if (!data.useNativeTts && data.audioContent) {
      audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
    }
  } catch { /* fall through to native */ }

  if (_playbackToken !== token) return

  if (audio) {
    // playAndWait handles autoplay unlock
    await playAndWait(audio)
    return
  }

  // native TTS fallback
  if (!('speechSynthesis' in window)) return
  await new Promise<void>((resolve) => {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'ko-KR'
    utt.rate = persona === 'driller' ? 1.2 : 0.95
    let settled = false
    const done = () => { if (settled) return; settled = true; resolve() }
    utt.onend = done
    utt.onerror = done
    setTimeout(done, Math.max(4000, text.length * 200))
    window.speechSynthesis.speak(utt)
  })
}
