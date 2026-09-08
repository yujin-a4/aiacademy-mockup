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
/* ── iOS 는 **첫 재생이 손가락에서 나와야** 한다 (메모 114행) ──
 *  아이패드에서 보기 음원이 "화면에는 되는 것처럼 나오는데 안 들린다" 는 보고의 원인이다.
 *  turn 이 넘어가며 앱이 스스로 트는 소리는 제스처가 아니라서 `play()` 가 거절되고
 *  (NotAllowedError), 그러면 브라우저 TTS 로 떨어지는데 **그것도 iOS 에서는 제스처가 없으면
 *  안 난다.** 그래서 아무 소리도 안 나면서 화면만 재생 중으로 보인다.
 *
 *  고치는 법은 하나뿐이다 — **학생의 첫 탭에서 이 오디오 요소를 한 번 깨워 둔다.** 한 번
 *  깨어난 요소는 그다음부터 앱이 스스로 틀어도 소리가 난다(같은 요소를 계속 쓰는 이유이기도 하다).
 *  ⚠️ 소리 없는 짧은 wav 로 깨운다. src 없이 play() 하면 그 자체가 에러가 된다.
 *  ⚠️ 이걸로도 안 들리면 남는 것은 **아이패드 무음 스위치**다 — HTML 오디오는 그걸 따른다. */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA='
let _unlocked = false
function armUnlock() {
  if (typeof window === 'undefined' || _unlocked) return
  const wake = () => {
    _unlocked = true
    const a = _audioEl ?? (_audioEl = new Audio())
    const keep = a.src
    a.src = SILENT_WAV
    a.play().then(() => { a.pause(); a.currentTime = 0; if (keep) a.src = keep })
      .catch((e) => { console.warn('[음원] 잠금 풀기 실패', e); _unlocked = false })
    document.removeEventListener('touchend', wake)
    document.removeEventListener('click', wake)
  }
  document.addEventListener('touchend', wake, { once: true })
  document.addEventListener('click', wake, { once: true })
}
if (typeof window !== 'undefined') armUnlock()

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
    a.play().catch((e) => {
      /* 왜 못 틀었는지 남긴다 — 아이패드에서 "안 들린다" 는 보고를 글자 하나로 가려낼 수 없었다.
         NotAllowedError 면 잠금이고, 그 밖이면 파일·형식 문제다. */
      console.warn('[음원] 재생 거부', (e as Error)?.name, src.slice(-40), { unlocked: _unlocked })
      fin(false)
    })
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
