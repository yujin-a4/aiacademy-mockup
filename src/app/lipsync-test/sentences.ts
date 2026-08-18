/** 실측용 고정 문장·강사 목록.
 *  업체 비교가 목적이므로 **어느 업체 화면에서도 똑같은 문장**을 써야 한다. 그래서 한곳에 둔다. */

export interface TestSentence {
  id: string
  label: string
  hint: string
  text: string
}

export const SENTENCES: TestSentence[] = [
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

export const INSTRUCTORS = [
  { id: 'yun_daeun', name: '윤다은' },
  { id: 'lee_doyun', name: '이도윤' },
  { id: 'park_hyewon', name: '박혜원' },
]

/** 강사 음성으로 mp3 를 받아온다. 키는 서버에만 있으므로 기존 /api/tts 를 그대로 쓴다. */
export async function fetchInstructorMp3(text: string, instructor: string): Promise<string | null> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.replace(/\n/g, ' '), instructor }),
  })
  const data = await res.json()
  return data.audioContent ?? null
}

/** mp3(base64) → PCM 16bit·모노. 샘플레이트는 업체가 요구하는 값으로 맞춘다.
 *  **레이트가 어긋나면 그 비율만큼 빨라지거나 느려진다** — 배속 재생처럼 들리면 이 값을 의심한다. */
export async function mp3ToPcm16k(base64: string, rate = 16000): Promise<Int16Array> {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytesToPcm16k(bytes, rate)
}

/** 직접 고른 음성 파일 → PCM. ElevenLabs 가 막혀도 립싱크는 볼 수 있어야 하므로 둔다.
 *  브라우저가 디코딩하므로 mp3·wav·m4a 등 재생 가능한 형식이면 다 된다. */
export async function fileToPcm16k(file: File, rate = 16000): Promise<Int16Array> {
  return bytesToPcm16k(new Uint8Array(await file.arrayBuffer()), rate)
}

async function bytesToPcm16k(bytes: Uint8Array, rate = 16000): Promise<Int16Array> {
  const tmp = new AudioContext()
  const decoded = await tmp.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer)
  void tmp.close()

  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate)
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

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  const STEP = 0x8000 // 한 번에 넘기면 인자 개수 한계로 터진다
  for (let i = 0; i < bytes.length; i += STEP) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + STEP)))
  }
  return btoa(s)
}

/** PCM 앞에 44바이트 WAV 헤더를 붙인다 — 업체가 컨테이너를 요구할 때 쓴다. */
export function pcmToWav(pcm: Int16Array, sampleRate = 16000): Uint8Array {
  const out = new Uint8Array(44 + pcm.byteLength)
  const dv = new DataView(out.buffer)
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); dv.setUint32(4, 36 + pcm.byteLength, true); w(8, 'WAVE')
  w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true)
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true)
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true)
  w(36, 'data'); dv.setUint32(40, pcm.byteLength, true)
  out.set(new Uint8Array(pcm.buffer), 44)
  return out
}
