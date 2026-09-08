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
  /* ⚠️ v3 의 stability 는 세 구간이다 — 0.0 Creative(표현이 살지만 **헛소리가 난다**),
     0.5 Natural(원본 녹음에 가장 가까움), 1.0 Robust(안정적이지만 v2 처럼 밋밋하고
     **오디오 태그에 반응하지 않는다**).
     0.60 → 0.20 → 0.5 → 0.4 로 온 자리다. 0.60 은 밋밋했고, 0.20 은 발음이 자주 뭉갰다.
     강약을 안정성으로 사려던 것이 잘못이었다 — 강약은 **목소리 자체가** 갖고 있어야 한다.
     그렇게 다시 뽑은 목소리(8RPnlah…)에 0.5 와 0.3 을 들어보고 그 사이로 정했다(09-03).
     ⚠️ 1.0 으로는 올리지 말 것 — [whispers]·[excited] 태그가 통째로 안 먹는다.
     ⚠️ 이 값은 캐시 키에 안 들어간다 — 바꾸면 `--force` 로 다시 만들어야 소리가 바뀐다. */
  kim:     { speed: 1.0, stability: 0.40, similarity_boost: 0.75 },
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
  /* 구현 중 메모 59·60·63·67행 — 한국어 문장에 섞인 영어를 한글로 읽어 버렸다
     ("are" → [아레], "be" → [베], "tie" → [티]). 문법 설명에 계속 나오는 낱말들이라 그때마다
     귀에 걸린다. 화면 글자는 그대로 are·be·tie 다 — 읽을 때만 바꾼다. */
  are: '/ɑːr/',
  be: '/biː/',
  tie: '/taɪ/',
}

/** 이 자리의 앞이나 뒤가 **또 다른 영어**인가 (사이의 공백은 넘어간다). */
function besideEnglish(text: string, at: number, len: number): boolean {
  return /[A-Za-z]\s?$/.test(text.slice(0, at)) || /^\s?[A-Za-z]/.test(text.slice(at + len))
}

/** IPA 를 끼운다 — **다만 옆이 영어면 그대로 둔다** (09-07 실측).
 *
 *  이 표는 한국어 문장에 홀로 낀 영어를 한글로 읽어 버리는 것을 막으려고 넣었다
 *  ("are" → [아레], "be" → [베]). 그 자리에서는 지금도 잘 듣는다.
 *
 *  그런데 **뒤에 영어가 이어지는 자리**에서는 오히려 탈이 났다 — 슬래시가 낱말 사이를
 *  갈라서 "에이의 /ɑːr/ standardizing은" 이 "are (한 박) standardizing" 으로 끊겼다.
 *  거기서는 이미 영어 문맥이라 IPA 가 없어도 영어로 읽는다(견본 대조 확인).
 *  슬래시만 뗀 꼴(`ɑːr standardizing`)은 더 이상했다 — 표기가 문제가 아니라 **자리**가 문제다.
 *
 *  한글이 바로 붙는 자리는 건드리지 않는다("be동사", "are이", "easel은") — 거기가 이 표의 본업이다. */
export function applyPronunciation(raw: string): string {
  return Object.entries(IPA).reduce(
    (s, [word, ipa]) => s.replace(new RegExp(`\\b${word}\\b`, 'gi'),
      (m: string, at: number, text: string) => (besideEnglish(text, at, m.length) ? m : ipa)),
    raw,
  )
}

/* ── v3 오디오 태그 ──────────────────────────────────────────────────
   v3 는 `[curious]` 처럼 대괄호 지시를 받아 연기를 바꾼다. 일레븐랩스 UI 의 'Enhance' 버튼이
   이걸 자동으로 넣어 주지만 **API 로는 못 부른다**(문서에 엔드포인트가 없다) — 그래서 우리가 넣는다.

   ⚠️ **여기 목록에 있는 것만 쓴다.** 문서에 없는 태그는 모델이 그대로 소리내어 읽는다.
      예전에 `[pause]` 를 넣었다가 강사가 "포즈" 라고 읽은 사고가 정확히 이것이다 —
      `[pause]` 는 v3 에 **존재하지 않는 태그**다(쉼은 줄바꿈으로 준다, spaceSentences 참고).
   ⚠️ v3 전용이다. multilingual v2 는 태그를 모르고 통째로 읽는다 — 부르는 쪽에서 모델을 본다. */
export const V3_TAGS = ['curious', 'sarcastic', 'whispers', 'excited', 'mischievously',
  'sighs', 'exhales', 'laughs'] as const

/** 읽는 문자열에서 태그를 뗀다 — **화면과 에이전트는 태그를 보면 안 된다.**
 *  말풍선에 대괄호가 뜨고, 에이전트한테 넘기면 그걸 지시로 착각한다. 소리로만 나가야 한다. */
export function stripAudioTags(raw: string): string {
  return raw.replace(/\[[a-z ]+\]\s*/gi, '').replace(/\s{2,}/g, ' ').trim()
}

/** 되묻는 줄에 물음조를 **자동으로** 건다.
 *
 *  재치·속삭임·강조는 자동으로 못 건다 — 어디가 곁말이고 어디가 한 방인지는 글자만 봐서
 *  알 수 없다. 그건 **대본에 직접 적는다**(scripts/tone/lee_doyun_wit.json).
 *  예전에는 꼬리 문장을 글자로 맞춰 걸었는데, 대본을 손보는 순간 조용히 안 걸렸다(09-03 실측:
 *  "반은 맞는 선택지예요" → "반만 맞는 선택지죠" 로 바뀌자 태그가 전부 사라졌다).
 *  물음표는 글자가 아니라 **문장부호**라 그 사고가 없다 — 그래서 이것만 자동이다.
 *
 *  ⚠️ **줄머리에 붙이면 안 된다.** v3 태그는 그 자리부터 줄 끝까지 걸린다. 줄머리에 두면
 *     설명 문장까지 통째로 물음조가 된다. 그래서 **마지막 문장 앞**에 끼운다.
 *  ⚠️ 대본이 이미 태그를 갖고 있으면 손대지 않는다 — 사람이 적은 것이 우선이다. */
export function applyAudioTags(raw: string): string {
  const t = raw.trim()
  if (!t || t.includes('[')) return raw
  if (!/[?？]\s*$/.test(t)) return raw
  /* ⚠️ 끝의 물음표를 먼저 떼고 그 앞 문장 경계를 찾는다. 안 떼면 정규식이 그 물음표를 잡아서
     태그가 줄 맨 끝에 붙는다 — 다 읽고 나서 지시가 오니 아무 효과가 없다(실측). */
  const cut = t.replace(/[?？]\s*$/, '').search(/[.!?？][^.!?？]*$/)
  if (cut < 0) return `[curious] ${t}`
  return `${t.slice(0, cut + 1)} [curious]${t.slice(cut + 1)}`
}

/* ── 읽는 법을 정해 둔 말 ──
   IPA 와 달리 **모델을 가리지 않는다.** 한국어를 이상하게 읽거나(세는 말), 기호를 제멋대로
   읽는 것(`+`, `~`)을 글자 단계에서 바로잡는다. 구현 중 메모 61·62·65·66·69~73행.
   ⚠️ 화면 글자는 그대로다 — 읽는 문자열에만 손댄다. */
const TERM_KO: Array<[RegExp, string]> = [
  /* 문법 용어 'ing' 를 [잉] 으로 붙여 읽는다.
  * ⚠️ **낱말 속 ing 는 절대 건드리면 안 된다** — 낱말 경계를 빼면 "painting" 이 "pa아이엔쥐" 가 된다. */
  [/\bing\b/gi, '아이엔쥐'],
  /* "be + p.p." 의 `+` 를 세 가지로 읽었다(안 읽음 / 플러스 / 플러) — 하나로 고정한다 */
  [/\s*\+\s*/g, ' 플러스 '],
  /* ── `p.p.` 는 **마침표를 떼고 한글로** 읽는다 (09-04 · 09-07 실측) ──
     ① 마침표가 문제였다. v3 는 마침표를 문장 끝으로 본다 — "has/have been p.p.는 be p.p.랑…"
        한 줄에 마침표가 넷이라 모델이 **다섯 문장**으로 읽어 뚝뚝 끊겼다(3회 평균 6.04→4.18초).
     ② 그래서 `PP` 로 뗐더니 이번엔 **한 글자로 읽었다** — "be p.p" 가 [비 피]·[비피] 로
        들린다는 보고가 두 번. 뽑을 때마다 갈리는 자리라 510개 중에 섞여 들어온다.
     한글로 적으면 한 글자로 읽힐 수가 없다. 느려질까 봐 미뤘는데 재보니 **0.38초 차이**로
     3회 편차 안이었다(PP 6.14 / 피피 6.52). 끊김을 만드는 건 마침표지 글자 수가 아니다.
     ⚠️ **화면 글자는 그대로 `p.p.` 다** — 이 표는 읽는 문자열에만 걸린다(sayableTerms). */
  /* ⚠️ 끝의 `\s*\.?` 를 `(?:\s*\.)?` 로 적는다 — 앞의 꼴은 마침표가 없을 때도 뒤 공백을
     먹어서 "p.p 형태" 가 "피피형태" 로 붙었다(09-08 실측). */
  [/\bp\s*\.\s*p(?:\s*\.)?/gi, '피피'],
  /* 영문 사이 슬래시("has/have", "is/are")도 한 박 쉬게 만든다. 읽을 때는 띄어 읽으면 된다 —
     화면에는 슬래시가 그대로 남는다.
     ⚠️ 앞뒤가 **영문일 때만** 바꾼다. 한글 사이 슬래시나 날짜·분수를 건드리면 안 된다. */
  [/(?<=[A-Za-z])\s*\/\s*(?=[A-Za-z])/g, ' '],
]

/** 토익 파트 번호를 읽는 말로 — 강사들이 영어 수사로 부른다 ("파트 원", "파트 파이브") */
const PART_NO = ['', '원', '투', '쓰리', '포', '파이브', '식스', '세븐']

/** 세는 말은 고유어로 — "5문제"를 [오 문제] 로 읽었다 (메모 66·69행) */
const KO_COUNT = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열']

export function sayableTerms(raw: string): string {
  let t = raw
  /* ── `p.p.` 앞의 조동사 덩어리를 **통째로 한글 음으로** 옮긴다 (09-08 실측) ──
     마침표를 뗀 뒤에도 "has have been 피피는 be 피피랑" 은 뚝뚝 끊겼다. 남은 원인은 마침표가
     아니라 **영어 낱말이 낱개로 박혀 있는 것**이다 — `be` 한 낱말 때문에 언어가 튀고, 모델은
     낱말마다 어느 쪽으로 읽을지 다시 정한다. 한글로 적으면 그냥 이어 읽는다.
     ⚠️ 조합을 하나씩 적지 않는다 — 대본에 `will be` · `is/are being` · `have been` · `are`
        까지 여덟 가지가 있었다(실측). 낱말별로 옮기면 새 조합이 와도 저절로 걸린다.
     ⚠️ TERM_KO 의 `p.p.`→`피피` 보다 **먼저** 돌아야 한다. 뒤에 두면 원문이 이미 바뀌어 있다.
     ⚠️ 덩어리 안의 `be` 는 여기서 한글이 되므로 applyPronunciation 의 `/biː/` 가 안 걸린다.
        그게 맞다 — 그 IPA 는 `be` 가 홀로 설 때의 것이고, 세 번 나온 `be` 중 하나만 걸려
        같은 낱말이 자리마다 다르게 읽히던 원인이었다.
     ⚠️ **화면 글자는 그대로 `p.p.` 다** — 읽는 문자열에만 걸린다. */
  const AUX_KO: Record<string, string> = {
    has: '해즈', have: '해브', is: '이즈', are: '아', was: '워즈', were: '워',
    will: '윌', be: '비', been: '빈', being: '비잉', get: '겟', got: '갓',
  }
  /* ⚠️ 정규식은 **리터럴로** 적는다. 템플릿 문자열로 조립하면 `\b` 가 정규식 경계가 아니라
     백스페이스 문자로 들어가 아무것도 안 걸린다(09-08 실측 — 조용히 원문 그대로 나갔다). */
  const AUX_RUN = /\b(?:(?:has|have|is|are|was|were|will|be|been|being|get|got)\b[\s/+]*)+p\s*\.\s*p(?:\s*\.)?/gi
  /* `+` 도 같이 집는다 — "be + p.p." 를 덩어리에서 빼면 `be` 만 IPA 로 바뀌어
     "/biː/ 플러스 피피" 가 된다(실측). 사이 기호까지 한 덩어리라야 이어 읽는다. */
  const AUX_WORD = /\+|\b(?:has|have|is|are|was|were|will|be|been|being|get|got)\b/g
  t = t.replace(AUX_RUN, (m) =>
    `${(m.toLowerCase().match(AUX_WORD) ?? []).map((w) => AUX_KO[w] ?? '플러스').join(' ')} 피피`)
  for (const [re, rep] of TERM_KO) t = t.replace(re, rep)
  /* ── `Part 1` 의 숫자를 **읽는 말로** 바꾼다 (09-04 실측) ──
     영어 낱말 뒤에 아라비아 숫자가 붙으니 모델이 어느 언어로 읽을지 못 정하고 뭉갠다 —
     이도윤 새 목소리가 "파트 운" 이라고 읽었다. **다시 뽑아도 같아서**(두 번) 글자를 고친다.
     ⚠️ **화면 글자는 `Part 1` 그대로다** — 읽는 문자열에만 걸린다.
     ⚠️ 아래 '세는 말' 규칙에 `(?<!Part\s)` 예외가 있는 건 "Part 1 문제" 가 "파트 한 문제" 가
        되던 것을 막으려던 것인데, 여기서 숫자를 먼저 없애므로 이제 그쪽은 저절로 안 걸린다. */
  /* ⚠️ `\b` 를 **영문 쪽에만** 건다. JS 의 `\b` 는 `[A-Za-z0-9_]` 기준이라 한글 앞에는
     낱말 경계가 없다 — `\b파트` 로 적으면 "파트 5" 가 통째로 안 걸린다(실측). */
  t = t.replace(/(?:\bPart|파트)\s*([1-7])\b/gi, (_m, n) => `파트 ${PART_NO[Number(n)]}`)
  /* 뜻풀이의 물결표 — "~에 기대다" 의 `~` 를 얼버무리거나 이상하게 읽는다.
     콘텐츠 파트가 적어 준 대로 [무엇무엇] 으로 읽힌다. `~로` 만 조사가 달라진다(무엇무엇으로). */
  t = t.replace(/~\s*로(?![가-힣])/g, '무엇무엇으로').replace(/~\s*(?=[가-힣])/g, '무엇무엇')
  /* 물결표에 붙어 있던 조사를 '무엇무엇' 뒤에 맞게 고친다 — 'be divided with ~는' 을
     그대로 두면 "무엇무엇는" 이 된다(받침이 있으니 '은' 이라야 한다). */
  t = t.replace(/무엇무엇(는|를|가|와)/g, (_m, jo) =>
    '무엇무엇' + ({ 는: '은', 를: '을', 가: '이', 와: '과' } as Record<string, string>)[jo])
  /* ⚠️ **파트 번호를 세는 말로 바꾸면 안 된다** — "Part 1 문제" 가 "Part 한 문제" 가 된다(실측). */
  t = t.replace(/(?<!Part\s)(?<!파트\s)(\d+)\s*(문제|자리)/g, (m, n, unit) => {
    const i = Number(n)
    return i >= 1 && i <= 10 ? `${KO_COUNT[i]} ${unit}` : m
  })
  return t
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

/* ── 조사 고르기 ──
   **철자가 아니라 한국어로 읽히는 소리로 고른다.** 끝이 자음이면 은·이·을·과, 모음이면 는·가·를·와.

   영단어가 까다롭다 — 끝자음의 **종류**가 가른다.
   · ㅁ·ㄴ·ㅇ·ㄹ·r 은 **받침으로 남는다** → 자음: line[라인]**은** · easel[이젤]**은** · are[아r]**이**
   · 그 밖의 자음(t·d·k·p·s·f·ch…)은 **'으/이' 가 붙어** 모음으로 끝난다
     → replacement[리플레이스먼트]**는** · standardized[스탠더다이즈드]**는** · base[베이스]**는**
   'are' 를 /ɑːr/ 로 읽기로 정해 둔 것이 곧 "are이" 의 근거다(위 IPA 사전, 구현 중 메모 66행).
   여기 두는 이유: 판단 근거인 발음 사전(IPA·LETTER_KO)이 이 파일에 있다. */

/** 한국어로 읽었을 때 **받침으로 끝나는 소리**들 — 이것만 자음으로 센다 */
const KEEPS_BATCHIM = 'mnŋlrɹ'

/** 그 낱말을 **읽었을 때** 자음으로 끝나는가. 모르면 null */
export function endsConsonant(raw: string): boolean | null {
  const w = raw.trim().replace(/[)\]'"''""·.…]+$/g, '').trim()
  if (!w) return null
  const last = w.slice(-1)
  const code = last.charCodeAt(0)

  /* 한글은 받침이 곧 답이다 */
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0

  /* 숫자는 읽는 말의 받침 — 영·일·삼·육·칠·팔 은 자음, 이·사·오·구 는 모음 */
  if (/[0-9]/.test(last)) return '013678'.includes(last)

  /* 홀로 선 알파벳 한 글자는 한글 음으로 (A 에이 → 모음 · L 엘 → 자음) */
  if (/^[A-Za-z]$/.test(w)) {
    const ko = LETTER_KO[w.toUpperCase()]
    return ko ? endsConsonant(ko) : null
  }
  if (!/[A-Za-z]/.test(last)) return null

  /* 발음을 적어 둔 낱말은 그 IPA 의 끝소리로 (여기가 정본이다) */
  const ipa = IPA[w.toLowerCase()]
  if (ipa) return KEEPS_BATCHIM.includes(ipa.replace(/[/ˈˌː.]/g, '').slice(-1))

  /* 사전에 없는 영단어는 철자로 짐작한다 — **짐작이라 IPA 사전이 늘 우선한다.**
     묵음 e 는 떼고 본다(line → n 받침 · base → s 라 '스'). */
  let en = w.toLowerCase().replace(/[^a-z]/g, '')
  if (!en) return null
  if (en.length > 3 && en.endsWith('e') && !'aeiou'.includes(en.slice(-2, -1))) en = en.slice(0, -1)
  if (en.endsWith('ng')) return true                    // -ing → [잉] 받침
  if (/[aeiouyw]$/.test(en)) return false               // 모음으로 끝난다 (easy·the·now)
  return /[mnlr]$/.test(en)                             // 받침으로 남는 자음만 자음으로 센다
}

/** 앞말에 맞는 조사. 모르면 모음 쪽(는·가·를·와)으로 둔다 — 어색해도 틀린 티가 덜 난다. */
export function koJosa(word: string, pair: '은는' | '이가' | '을를' | '과와'): string {
  const table = { 은는: ['은', '는'], 이가: ['이', '가'], 을를: ['을', '를'], 과와: ['과', '와'] }
  const [con, vow] = table[pair]
  return endsConsonant(word) ? con : vow
}
