/* ── 유형학습 플레이어용 브라우저 TTS (문장 단위) ──
   음원은 "문장별 분리"가 확정 방침 — 지금은 브라우저 SpeechSynthesis로 문장 단위 재생하고,
   다음주 DB 연동 때 문장별 mp3(URL)로 같은 인터페이스를 유지한 채 교체한다.
   전역 tts.ts(stopCurrentAudio)와 별개 시퀀스 토큰을 쓰되, cancel은 speechSynthesis 공용. */

let _seq = 0

export function stopVoice() {
  _seq += 1
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  _audioEl?.pause()
}

function speakOne(text: string, lang: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { resolve(); return }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = rate
    let done = false
    const fin = () => { if (!done) { done = true; resolve() } }
    u.onend = fin
    u.onerror = fin
    // onend가 안 오는 브라우저 대비 상한
    setTimeout(fin, Math.max(4000, text.length * 120))
    window.speechSynthesis.speak(u)
  })
}

/** mp3 하나 재생. 로드/재생 실패 시 false를 돌려 TTS로 폴백하게 한다. */
let _audioEl: HTMLAudioElement | null = null
function playFile(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(false); return }
    const a = _audioEl ?? (_audioEl = new Audio())
    let done = false
    const fin = (ok: boolean) => {
      if (done) return
      done = true
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('error', onErr)
      resolve(ok)
    }
    const onEnd = () => fin(true)
    const onErr = () => fin(false)
    a.addEventListener('ended', onEnd)
    a.addEventListener('error', onErr)
    a.src = src
    a.currentTime = 0
    a.play().catch(() => fin(false))
  })
}

export function stopFile() {
  _audioEl?.pause()
}

/** 영어 문장들을 순서대로 재생. onItem(id)로 재생 중 문장 강조, 끝나면 onItem(null).
 *  item.src(생성된 mp3)가 있으면 그 파일을 재생하고, 없거나 실패하면 브라우저 TTS로 폴백한다. */
export async function speakEnglishSeq(
  items: { id: string; text: string; src?: string }[],
  onItem?: (id: string | null) => void,
): Promise<void> {
  const my = ++_seq
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  stopFile()
  for (const it of items) {
    if (my !== _seq) { onItem?.(null); return }
    onItem?.(it.id)
    const playedFile = it.src ? await playFile(it.src) : false
    if (my !== _seq) { onItem?.(null); return }
    if (!playedFile) await speakOne(it.text, 'en-US', 0.95)
  }
  if (my === _seq) onItem?.(null)
}

/** 강사 발화(한국어). 새 발화가 시작되면 이전 것은 취소된다. */
export async function speakKorean(text: string): Promise<void> {
  const my = ++_seq
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  if (my !== _seq) return
  await speakOne(text, 'ko-KR', 1.0)
}
