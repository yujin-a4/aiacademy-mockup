/** 현재 재생 중인 오디오 인스턴스 (전역 추적) */
let _currentAudio: HTMLAudioElement | null = null

/** 현재 재생 중인 오디오를 즉시 중단한다. */
export function stopCurrentAudio() {
  if (_currentAudio) {
    _currentAudio.pause()
    _currentAudio = null
  }
}

/** 로컬 MP3/오디오 파일을 재생하고 종료까지 대기.
 *  autoplay가 막히면 첫 사용자 제스처(click/touchstart)를 기다려 재생. */
export async function playLocalAudio(src: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(src)
    _currentAudio = audio

    const done = () => { _currentAudio = null; resolve() }
    audio.onended = done
    audio.onerror  = done

    audio.play().catch((err) => {
      if (err?.name !== 'NotAllowedError') {
        done()
        return
      }
      // 브라우저 autoplay 정책으로 차단됨 → 첫 제스처 대기 후 재시도
      const unlock = () => {
        audio.play().catch(done)
      }
      document.addEventListener('click',      unlock, { once: true })
      document.addEventListener('touchstart', unlock, { once: true })
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
  /* React가 setSpeech 등 state update를 flush하고 화면에 반영할 시간 확보 */
  await new Promise<void>((r) => setTimeout(r, 0))
  if (opts.audioSrc) {
    return playLocalAudio(opts.audioSrc)
  }
  return speakAndWait(opts.script, opts.persona)
}

export async function speakAndWait(text: string, persona: string): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
      })
      const data = await res.json()

      if (!data.useNativeTts && data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        _currentAudio = audio
        const done = () => { _currentAudio = null; resolve() }
        audio.onended = done
        audio.onerror = done
        await audio.play().catch(done)
        return
      }
    } catch { /* fall through */ }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'ko-KR'
      utt.rate = persona === 'driller' ? 1.2 : 0.95
      utt.onend = () => resolve()
      utt.onerror = () => resolve()
      window.speechSynthesis.speak(utt)
    } else {
      resolve()
    }
  })
}
