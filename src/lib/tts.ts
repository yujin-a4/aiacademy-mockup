/** 현재 재생 중인 오디오 인스턴스 (전역 추적) */
let _currentAudio: HTMLAudioElement | null = null
let _currentUnlockCleanup: (() => void) | null = null
let _playbackToken = 0

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
export async function fetchTTSAudio(text: string, persona: string): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, persona }),
    })
    const data = await res.json()
    if (!data.useNativeTts && data.audioContent) {
      return new Audio(`data:audio/mp3;base64,${data.audioContent}`)
    }
  } catch { /* fall through */ }
  return null
}

/** 이미 준비된 Audio 객체를 재생하고 종료까지 대기. */
export async function playAndWait(audio: HTMLAudioElement): Promise<void> {
  stopCurrentAudio()
  const token = ++_playbackToken
  _currentAudio = audio
  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      if (_currentAudio === audio && _playbackToken === token) _currentAudio = null
      resolve()
    }
    audio.onended = done
    audio.onerror = done
    audio.play().catch(done)
  })
}

/** fetchTTSAudio + playAndWait + speechSynthesis fallback.
 *  토큰을 fetch 완료 후에만 설정하므로 이전 화면 cleanup의 stopCurrentAudio()와 충돌하지 않는다. */
export async function speakTTS(text: string, persona: string): Promise<void> {
  const audio = await fetchTTSAudio(text, persona)
  if (audio) {
    await playAndWait(audio)
  } else {
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

  return new Promise(async (resolve) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
      })
      const data = await res.json()

      if (_playbackToken !== token) {
        resolve()
        return
      }

      if (!data.useNativeTts && data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        _currentAudio = audio
        let settled = false
        const done = () => {
          if (settled) return
          settled = true
          if (_currentAudio === audio && _playbackToken === token) _currentAudio = null
          resolve()
        }
        audio.onended = done
        audio.onerror = done
        await audio.play().catch(done)
        return
      }
    } catch { /* fall through */ }

    if (_playbackToken !== token) {
      resolve()
      return
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'ko-KR'
      utt.rate = persona === 'driller' ? 1.2 : 0.95
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        resolve()
      }
      utt.onend = done
      utt.onerror = done
      // Chrome bug: speechSynthesis.onend sometimes doesn't fire
      setTimeout(done, Math.max(4000, text.length * 200))
      window.speechSynthesis.speak(utt)
    } else {
      resolve()
    }
  })
}
