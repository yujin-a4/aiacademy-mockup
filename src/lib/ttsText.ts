/**
 * 강사 음성으로 나갈 **문자열을 다듬는 규칙**과, 그 발화의 **캐시 키**.
 *
 * ── 왜 따로 뺐나 ───────────────────────────────────────────────────
 * 같은 문장을 두 곳에서 만든다.
 *   · 실시간  : `src/app/api/tts/route.ts`
 *   · 미리 생성: `scripts/gen-scripted-tts.mjs`
 * 다듬는 규칙이 조금이라도 어긋나면 **미리 만들어 둔 소리와 실시간 소리가 달라진다.**
 * (대본 강의는 그 둘이 한 수업 안에서 섞여 나가므로 바로 티가 난다.)
 * 그래서 규칙은 여기 한 벌만 둔다.
 *
 * ⚠️ **이 파일에는 import 를 두지 않는다.** 생성기가 Node 타입 스트리핑
 *    (`node --experimental-strip-types`)으로 이 파일을 그대로 읽는다 — `@/` 별칭이 끼면
 *    Node 가 해석하지 못한다.
 */

/** 강사를 안 알려줬을 때 쓰는 모델 */
export const DEFAULT_TTS_MODEL = 'eleven_multilingual_v2'

/** 강사 페르소나별 ElevenLabs 파라미터 */
export const TTS_PARAMS: Record<string, { speed: number; stability: number; similarity_boost: number }> = {
  park:    { speed: 1.2, stability: 0.30, similarity_boost: 0.80 },
  jang:    { speed: 1.1, stability: 0.50, similarity_boost: 0.75 },
  kim:     { speed: 1.0, stability: 0.60, similarity_boost: 0.75 },
  p6tutor: { speed: 1.0, stability: 0.50, similarity_boost: 0.80 },
}

export const DEFAULT_TTS = { speed: 1.0, stability: 0.50, similarity_boost: 0.75 }

/** TTS 전송 전 특수문자 정리 */
export function sanitizeForTts(raw: string): string {
  return raw
    .replace(/_{4,}/g, '빈칸')
    /* 화면에서 핵심을 굵게 하려고 시트가 찍는 표시다(TutorText). 소리에는 아무 뜻이 없으니
       뗀다 — 두면 강사가 "별표별표" 를 읽는다. 작은따옴표는 그대로 둔다(읽어도 문제없다). */
    .replace(/\*\*/g, '')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/'/g, "'")
    .trim()
}

/** 문장 끝에서 **한 박자 쉬게** 한다 — 마침표 뒤의 공백을 줄바꿈으로 바꾼다.
 *
 *  줄바꿈을 쓰는 이유: v3 는 `<break time=…>` 를 안 받고, `[pause]` 류 태그는 모델이 그대로
 *  읽어 버리는 사고가 있다. 줄바꿈은 그냥 글자라 읽힐 수가 없고, 문서가 권하는 방식이기도 하다.
 *
 *  건드리지 않는 것
 *   · 숫자 사이의 점 — "3.5초" 를 "3 / 5초" 로 끊으면 안 된다
 *   · 이미 줄이 바뀐 자리 — 공백이 있는 경우만 바꾼다(줄바꿈이 겹치면 사이가 너무 벌어진다)
 *  **화면 글자는 이걸 거치지 않는다.** 읽는 문자열에만 손댄다. */
export function spaceSentences(raw: string): string {
  return raw.replace(/([.!?])[ \t]+(?=[^\s\d])/g, '$1\n\n')
}

/* ── 발음 사전 ──
   강사가 자꾸 틀리게 읽는 낱말을 여기 적는다. v3 는 **슬래시로 감싼 IPA 를 그대로 알아듣는다**
   (`/ˈiːzəl/`) — 일레븐랩스에 사전 파일을 올리거나 API 로 등록할 필요가 없다.
   ⚠️ v3 전용이다. 다른 모델(박혜원 = multilingual v2)은 IPA 를 못 알아들어 슬래시째 읽거나
      뭉갠다. 그래서 부르는 쪽에서 **모델을 보고** 건다.
   ⚠️ 화면 글자는 그대로 'easel' 이다 — 읽을 때만 바꾼다(koLetters 와 같은 규칙). */
const IPA: Record<string, string> = {
  easel: '/ˈiːzəl/',
}

export function applyPronunciation(raw: string): string {
  return Object.entries(IPA).reduce(
    (s, [word, ipa]) => s.replace(new RegExp(`\\b${word}\\b`, 'gi'), ipa),
    raw,
  )
}

/**
 * 이 발화의 **캐시 키** — 미리 만들어 둔 mp3 를 찾는 이름.
 *
 * `src/lib/tts.ts` 의 메모리 캐시 키와 **같은 값을 재료로 쓴다**(강사·페르소나·문자열).
 * 셋 중 하나만 달라도 다른 소리가 되기 때문이다 — 목소리(강사)·말투 파라미터(페르소나)·문장.
 *
 * ⚠️ 넘기는 문자열은 **화면 문장이 아니라 실제로 읽는 문자열**이어야 한다.
 *    수업 화면은 `koLetters()` 를 거친 값을 보내므로(홀로 선 알파벳 → 한글 음), 생성기도
 *    반드시 같은 것을 거친 뒤에 키를 만들어야 맞아떨어진다.
 *
 * 해시를 쓰는 이유: 문장이 그대로 파일명이 될 수 없다(길이·한글·따옴표).
 * FNV-1a 를 오프셋만 바꿔 두 번 돌린다 — 32비트 하나로는 수백 개에서도 겹칠 수 있다.
 */
export function ttsCacheKey(text: string, persona: string, instructor?: string): string {
  const seed = `${instructor ?? ''}|${persona}|${text}`
  const fnv = (offset: number): string => {
    let x = offset
    for (let i = 0; i < seed.length; i++) {
      x ^= seed.charCodeAt(i)
      x = Math.imul(x, 0x01000193) >>> 0
    }
    return x.toString(16).padStart(8, '0')
  }
  return fnv(0x811c9dc5) + fnv(0x7fffffff)
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
