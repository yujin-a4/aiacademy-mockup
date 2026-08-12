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

/** TTS 오디오를 미리 fetch해서 Audio 객체로 반환. 실패 시 null. */
/** @param instructor 강사 id — 주면 **그 강사 목소리**로 읽는다(없으면 기본 목소리) */
export async function fetchTTSAudio(text: string, persona: string, instructor?: string): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, persona, instructor }),
    })
    const data = await res.json()
    if (!data.useNativeTts && data.audioContent) {
      return new Audio(`data:audio/mp3;base64,${data.audioContent}`)
    }
  } catch { /* fall through */ }
  return null
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
      resolve()
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

/* ── 한국어 발화 안에 홀로 선 알파벳 ── */
const LETTER_KO: Record<string, string> = {
  A: '에이', B: '비', C: '씨', D: '디', E: '이', F: '에프', G: '지', H: '에이치', I: '아이',
  J: '제이', K: '케이', L: '엘', M: '엠', N: '엔', O: '오', P: '피', Q: '큐', R: '알',
  S: '에스', T: '티', U: '유', V: '브이', W: '더블유', X: '엑스', Y: '와이', Z: '지',
}

/**
 * 한국어 문장 속 **홀로 선 대문자 한 글자**를 한글 음으로 바꾼다 — "D에서는" → "디에서는".
 * 한국어 목소리에 알파벳을 그대로 주면 발음이 뭉개진다(실측: "B예요" 가 알아들을 수 없는 소리).
 * **화면에 보이는 글자는 그대로 A·B·C·D 다** — 읽을 때만 바꾼다.
 *
 * 손대지 않는 것
 *  · 영어 단어 속 글자 — 앞뒤에 알파벳이 붙어 있으면 건드리지 않는다("an easel", "AI")
 *  · 소문자 — 영어 문장의 관사 'a' 가 "에이" 로 읽히면 안 된다("paint a picture")
 * 그래서 이 함수는 **한국어 발화 전용**이다. 영어 지문·보기 낭독에는 쓰지 말 것.
 */
export function koLetters(text: string): string {
  return text.replace(/(?<![A-Za-z])([A-Z])(?![A-Za-z])/g, (m) => LETTER_KO[m] ?? m)
}

/** fetchTTSAudio + playAndWait + speechSynthesis fallback.
 *  fetch 완료 후 토큰을 재확인해 화면 전환 중에 fetch가 끝난 경우 재생을 막는다. */
export async function speakTTS(text: string, persona: string, instructor?: string): Promise<void> {
  const token = _playbackToken
  const audio = await fetchTTSAudio(text, persona, instructor)
  if (_playbackToken !== token) return  // fetch 중 stopCurrentAudio 호출됨
  if (audio) {
    await playAndWait(audio)
  } else {
    if (_playbackToken !== token) return
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
  try {
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
