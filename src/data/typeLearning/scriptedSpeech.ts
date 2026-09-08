/**
 * 대본 수업에서 **앱이 얹는 맞장구**와, 그것 때문에 대본 첫머리를 떼는 규칙.
 *
 * 화면(TypeLessonPlayer)에서 여기로 옮겨 둔 이유 하나뿐이다:
 * **미리 음원을 만드는 생성기**(`scripts/gen-scripted-tts.mjs`)가 같은 규칙을 봐야 한다.
 * 학생이 못 맞힌 뒤에는 대본 줄이 `stripAck` 을 거친 모습으로 나가므로, 생성기가 이걸 모르면
 * 그 갈래만 미리 만들어 두지 못하고 실시간 생성으로 떨어진다(= 틀린 직후에만 강사가 늦게 말한다).
 *
 * ⚠️ 화면 컴포넌트를 import 하지 않는다 — 생성기가 Node 타입 스트리핑으로 이 파일을 그대로 읽는다.
 */

/** 대본 발화가 **앞의 답을 받아주는 말로 시작하는가** ("맞아요. 사람이 중심인 사진이니까…").
 *  콘텐츠팀은 강사가 학생 답을 받아주고 이어가도록 쓴다 — 시트 42개 답하는 턴 중 25개가 이 꼴이다.
 *  그 앞에 앱이 "좋아요, 맞았어요." 를 또 붙이면 강사가 같은 말을 두 번 한다.
 *
 *  ⚠️ **띄어쓰기를 사람이 맞춰 주지 않는다.** 시트에 "잘 했어요" 처럼 띄어 쓴 줄이 있어서
 *  "잘했어요" 만 보던 예전 목록이 그것들을 놓쳤고, 앱이 맞장구를 하나 더 얹어
 *  "잘했어요. 잘 했어요. are이 있죠?" 가 나갔다(실측). 낱말 사이 공백을 허용한다.
 *
 *  ⚠️ **목록에 없는 칭찬은 그대로 겹친다.** 24강 밑줄 턴 일곱 곳이 "잘 찾았어요." 로 시작하는데
 *     그게 목록에 없어 앱이 "좋아요, 맞았어요." 를 또 얹었다(실측). 대본을 새로 받으면
 *     **첫 문장의 칭찬 표현을 다시 훑어야 한다** — scripts 로 전수 확인하는 편이 빠르다. */
/** ⚠️ '정답이에요' 도 맞장구다 (09-03). 채점 줄이 "정답이에요. 잘 맞혔어요!" 로 시작하는데
 *  이 목록에 없어서, 앱이 앞에 "맞아요!" 를 얹고 곧바로 대본이 "정답이에요. 잘 맞혔어요!" 를
 *  말했다. ('정답은 B였어요' 는 안 걸린다 — 오답 갈래는 맞장구가 아니다.) */
export const ACK_OPENER = /^(정답이에요|정답입니다|맞\s*아요|맞\s*습니다|좋\s*아요|좋\s*습니다|좋\s*네요|그렇\s*죠|그래\s*요|정확\s*해요|정확\s*합니다|잘\s*했어요|잘\s*찾았어요|잘\s*하셨어요|완벽\s*해요|훌륭\s*해요|바로\s*그거|네[,\s])/

/** 맞았을 때 앱이 넣는 맞장구 — **돌려 쓴다.**
 *  한 수업에서 답하는 턴이 스무 번 넘는데 매번 "좋아요, 맞았어요." 면 녹음을 트는 것처럼 들린다.
 *  ⚠️ 지어낸 칭찬을 늘리지 않는다: 다 짧은 맞장구뿐이고, **내용은 대본이 말한다.**
 *  ⚠️ 여기 문구는 ACK_OPENER 로 시작해야 한다 — 다음 대본이 같은 말로 시작하면 앱이 비켜서는데
 *     (scriptWillAck), 그 판단이 이 목록과 같은 낱말을 본다. */
export const ACKS = ['좋아요, 맞았어요.', '네, 맞아요.', '정확해요.', '그렇죠.', '잘했어요.', '맞습니다.'] as const

/** ── 강사마다 맞장구가 다르다 (09-03) ──
 *  이도윤 대본이 **정오답 반응 줄을 통째로 뺐다**(개념학습본). 예전에는 줄마다
 *  "(정답) 맞아요. (오답) 다시 생각해보세요." 가 적혀 있어 앱이 비켜서기만 하면 됐는데,
 *  이제 그 문구를 시트가 **머리말의 공통 규칙**으로만 정해 두고 화면더러 말하라고 한다:
 *
 *    [스캐폴딩 질문 정오답 답변]
 *    - 정답일 때: 맞아요! / 잘했어요! / 그렇죠!
 *    - 오답일 때: 다시 한번 생각해보세요. / 아니에요. 다시 같이 봐볼게요.
 *
 *  ⚠️ 여기 문구도 ACK_OPENER 로 시작해야 한다(scriptWillAck 이 같은 낱말을 본다).
 *  ⚠️ 지어내지 않는다 — 시트에 적힌 것만 쓴다. 늘리고 싶으면 시트를 먼저 고칠 것. */
export const ACKS_BY_INST: Record<string, readonly string[]> = {
  lee_doyun: ['맞아요!', '잘했어요!', '그렇죠!'],
}

/** 못 맞혔을 때 한 번 더 시켜보는 말. 강사 지정이 없으면 예전 문구를 쓴다. */
export const RETRY_BY_INST: Record<string, readonly string[]> = {
  lee_doyun: ['다시 한번 생각해보세요.', '아니에요. 다시 같이 봐볼게요.'],
}
/* 내보내는 이유는 하나 — **미리 음원을 만드는 생성기가 이것도 모아야 한다.**
   강사 지정이 없는 강사(윤다은)는 이 줄을 말하는데, 목록에 없어서 매번 실시간으로 떨어졌다. */
export const RETRY_DEFAULT = ['다시 한번 생각해 볼까요?'] as const

/** ── 되묻지 않는 강사가 오답에서 **한 마디만 얹고 넘어갈 때** 쓰는 말 ──
 *
 *  되묻기를 끈 강사(INST_RETRY_SCAFFOLD=false)는 답을 다시 받지 않는다. 그렇다고 아무 말도
 *  없이 넘어가면 학생은 자기 답이 어떻게 됐는지 못 듣는다 — 틀렸다는 것은 화면만 말한다.
 *  그래서 **답은 안 받되 말은 한다.**
 *  ⚠️ RETRY_BY_INST 의 "다시 한번 생각해보세요" 계열을 여기에 쓰면 안 된다 —
 *     다시 생각하라고 해놓고 답을 안 받으면 앞뒤가 안 맞는다. 넘어가는 말이어야 한다.
 *  ⚠️ 미리 음원을 만드는 생성기(gen-scripted-tts.mjs)가 이것도 모아야 한다. */
export const MOVE_ON_BY_INST: Record<string, string> = {
  lee_doyun: '아니에요. 다시 같이 봐볼게요.',
}

/** ── 학생이 **딴소리를 했을 때** 하는 말 (판정 N) ──
 *
 *  틀린 답이 아니라 답할 생각이 없는 말이다("배고파요"). 예전에는 이런 말이 판정기의
 *  "그 밖에 반반이면 O" 에 걸려 **정답 처리**됐다 — 강사가 "맞아요" 하고 다음 설명으로
 *  넘어갔다(09-08 실측). 못 알아들었다고 말하고 수업으로 돌아온다.
 *  ⚠️ 미리 음원을 만드는 생성기(gen-scripted-tts.mjs)가 이것도 모아야 한다. */
export const OFF_TOPIC_BY_INST: Record<string, readonly string[]> = {
  lee_doyun: ['음, 무슨 말인지 잘 모르겠어요. 수업 이어갈게요.', '지금은 수업에 집중해 볼까요?'],
}
export const OFF_TOPIC_DEFAULT = ['음, 무슨 말인지 잘 모르겠어요. 수업 이어갈게요.'] as const

export const offTopicLine = (n: number, instructor?: string): string => {
  const pool = (instructor && OFF_TOPIC_BY_INST[instructor]) || OFF_TOPIC_DEFAULT
  return pool[n % pool.length]
}

export const ackLine = (n: number, instructor?: string): string => {
  const pool = (instructor && ACKS_BY_INST[instructor]) || ACKS
  return pool[n % pool.length]
}

export const retryLine = (n: number, instructor?: string): string => {
  const pool = (instructor && RETRY_BY_INST[instructor]) || RETRY_DEFAULT
  return pool[n % pool.length]
}

/** 대본 첫머리의 맞장구를 뗀다 — "맞아요. 인물이 …" → "인물이 …".
 *  뗄 것이 없거나 떼면 문장이 없어지는 줄은 그대로 둔다(맞장구만 있는 줄도 있다). */
export function stripAck(text: string): string {
  let t = text.trim()
  /* **맞장구 한 마디만** 뗀다. 문장째로 자르면 맞장구 뒤에 붙은 내용까지 사라진다 —
     "맞아요, is painting이 핵심이에요." 에서 답을 알려주는 말이 통째로 날아갔다(실측).
     "네, 맞아요." 처럼 두 마디가 겹칠 수 있어 두 번까지 본다. */
  for (let i = 0; i < 2; i++) {
    const m = t.match(ACK_OPENER)
    if (!m) break
    const cut = t.slice(m[0].length).replace(/^[\s,.!?~…]+/, '')
    /* 너무 짧게 남으면 되돌린다 — 맞장구가 문장의 전부인 줄("좋아요, 잘했어요!")도 있다 */
    if (cut.length < 10) break
    t = cut
  }
  return t === text.trim() ? text : t
}
