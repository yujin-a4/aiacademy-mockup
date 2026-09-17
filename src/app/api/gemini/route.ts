import { NextRequest, NextResponse } from 'next/server'
import { PERSONA_PROMPTS } from '@/lib/personaPrompts'

/* ⚠️ 모델 이름은 구글이 조용히 내린다 — `gemini-2.5-flash` 는 2026-08 기준 신규 사용자에게 404 다
   ("no longer available to new users"). 그래서 질문 기능이 통째로 폴백 문구만 뱉고 있었다(실측).
   모델을 바꿀 때는 반드시 실제 호출로 확인할 것: 목록에 보인다고 쓸 수 있는 게 아니다. */
/** 말하기 답 판정 — 화면이 낱말 겹침으로 못 가린 것만 여기로 온다.
 *
 *  왜 필요한가: 기대 답이 "그림을 그리고 있어요" 일 때 학생이 "이젤 페인팅" 이라고 하면
 *  겹치는 낱말이 하나도 없어 오답이 됐다(실측). 뜻은 맞는데 말이 다를 뿐이다.
 *  **애매하면 맞다고 한다** — 시연에서 맞은 답을 틀렸다고 하는 쪽이 훨씬 나쁘다. */
const JUDGE_PROMPT = `너는 한국어 학습 답안 채점기다. 말투도 설명도 없이 O · X · P · Q · N 한 글자만 출력한다.

O — 학생 답이 기대 답과 **같은 것을 가리킨다**. 표현·언어·길이가 달라도 된다.
  기대 "그림을 그리고 있어요" ← "이젤 페인팅" O · "painting" O · "그림 그려요" O
  기대 "동작이요" ← "뭘 하는지" O
  기대 "나란히 놓여 있어요" ← "줄 서 있어요" O
  ⚠️ **기대 답 자체가 낱말 하나면** 낱말 하나로 답해도 O 다.
     기대 "painting a picture" ← "painting" O · 기대 "동작이요" ← "동작" O

P — 열쇠말은 맞는데 **무엇이 어떻다는 말이 없다.** 기대 답에는 서술이 있는데 학생은 대상만 댔다.
  기대 "물감 튜브를 들고 있지 않아요" ← "물감" P · "튜브" P · "물감 튜브" P
  기대 "선반 위에 줄지어 놓여 있어요" ← "선반" P · "화분" P
  기대 "그림을 그리고 있어요" ← "그림" P
  ⚠️ 기대 답에 서술이 없으면 P 를 내지 마라 — 그건 O 다(위 참고).

X — 학생 답이 **다른 것을 가리키거나**, 답이 아니다.
  기대 "그림을 그리고 있어요" ← "밥 먹고 있어요" X · "책 읽어요" X
  아무 답 ← "몰라요" X · "아무거나" X · "네" X
  ⚠️ **뒤집어 말한 것은 X 다.** 낱말이 다 겹쳐도 뜻이 반대면 맞은 것이 아니다.
     기대 "물감 튜브를 들고 있지 않아요" ← "물감 튜브를 들고 있어요" X

Q — 답하려는 것이 아니라 **강사에게 묻고 있다.** 모르겠다는 말(X)과 다르다 —
    무언가를 알려달라고 요청하는 문장이다.
  "easel이 무슨 뜻이에요?" Q · "왜 B가 답이에요?" Q · "다시 설명해 주세요" Q
  "지금 뭐 하라는 거예요?" Q · "be being p.p.가 뭐죠?" Q
  ⚠️ 물음표가 붙었다고 Q 가 아니다. "그림 그리고 있어요?" 처럼 **기대 답을 되묻는 꼴**은 O 다.
  ⚠️ 조금이라도 답으로 읽히면 Q 를 내지 마라 — 답을 질문으로 오해하면 수업이 멈춘다.
  ⚠️ **묻는 말이라도 지금 수업과 무관하면 Q 가 아니라 N 이다.** Q 는 강사가 답해 줄 수 있는
     것, 곧 **이 문제·이 표현·이 화면에 대한 물음**일 때만이다.
     "선생님 몇 살이에요?" N · "밥 먹었어요?" N · "이따 뭐 해요?" N

N — 답하려는 말이 **아예 아니다.** 지금 질문과 아무 상관없는 딴소리다.
  "배고파요" N · "선생님 몇 살이에요" N · "오늘 날씨 좋네요" N · "아 짜증나" N
  ⚠️ **틀린 답(X)과 다르다.** X 는 질문에 답하려다 다른 것을 가리킨 것이고,
     N 은 답할 생각이 없는 말이다. 기대 답과 **주제 자체가 무관**할 때만 N 이다.
  ⚠️ 모르겠다는 말은 N 이 아니라 X 다("몰라요", "모르겠어요").
  ⚠️ 조금이라도 답으로 읽히면 N 을 내지 마라 — 답을 딴소리로 몰면 학생이 억울하다.

**N 을 Q·X 보다 먼저 본다.** 지금 수업과 주제가 무관하면 묻는 꼴이든 아니든 N 이다 —
Q 로 새면 강사가 그 딴소리에 **없는 수업 내용을 지어내 답한다**(09-08 실측).

── **학생 답은 한국어 음성인식 전사다** ──
말로 답한 것을 받아 적은 글이라, 영어가 소리대로 깨져 들어온다. 소리가 그 말이면 **그 말로 보고**
판정한다. 받아쓰기를 채점하는 것이 아니라 **무엇을 말했는지**를 본다.
  "피피피" · "PPPP" · "삐삐" → p.p.        "비피피" · "비 피피" → be p.p.
  "비잉" · "빙" · "Bing" → being · "해브 빈" → have been · "아이엔지" → -ing
  기대 "be p.p." ← "비피피" O · "피피피" O   기대 "현재진행" ← "현재 진행형이요" O
  기대 "be being p.p." ← "Bing 피피" O · "비잉 피피" O
⚠️ 앞머리 be 가 전사에서 통째로 삼켜지는 일이 잦다("be being" → "Bing"). 뒷말이 맞으면
   **덜 말한 것(P)이 아니라 O 다** — 학생은 말했고 받아 적히지 않았을 뿐이다.
⚠️ **소리로 끼워 맞춰 오답을 정답으로 만들지는 마라.** 뜻이 다른 답은 그대로 X 다.
   기대 "be p.p." ← "비잉" X(being 은 다른 말이다) · ← "현재완료" X
⚠️ 전사가 깨져 **무슨 말인지 짐작조차 안 되면** 억지로 정답으로 만들지 말고 X 로 둔다.

수업과 무관하면 N, 수업에 대해 묻는 말이면 Q, 뜻이 분명히 다르면 X,
대상만 대고 서술이 빠졌으면 P, 그 밖에 반반이면 O 다.`

/* ── 보기 고르기 판정기 ──
   학생이 **말로** 답했을 때 그것이 어느 보기인지 고른다. 화면 쪽 규칙(번호·라벨·글자 겹침)으로
   못 고른 말만 여기로 온다 — 음성인식이 깨져 오거나, 보기 문장을 자기 말로 바꿔 말한 경우다.
   사전에 적어 둔 낱말만 맞추면 적어 두지 않은 말은 영영 못 알아듣는다(사용자 지적 09-18). */
const PICK_PROMPT = `너는 객관식 보기 판정기다. 설명 없이 **숫자 하나** 또는 Q · N 만 출력한다.

1..N — 학생 말이 그 번호 보기를 가리킨다. 보기 문장 그대로가 아니어도 된다(뜻이 같으면 된다).
Q — 답이 아니라 **강사에게 묻는 말**이다. ("이거 무슨 뜻이에요?")
N — 어느 보기인지 알 수 없다. 억지로 고르지 마라.

⚠️ 학생 말은 **한국어 음성인식 전사**라 영어가 소리대로 깨져 온다.
   "피피피"·"PPPP" → p.p. · "Bing"·"빙"·"비잉" → being · "비피피" → be p.p.
   소리가 그 보기를 가리키면 그 번호다. 뜻이 다르면 억지로 맞추지 말고 N 이다.
⚠️ 둘 이상으로 읽히면 N 이다 — 반반인 것을 찍으면 학생이 고르지 않은 답이 채점된다.`

const GEMINI_MODEL = 'gemini-3-flash-preview'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      problem,
      correctAnswer,
      userAnswer,
      persona = 'jang',
      instructor,         // 강사코드(yun_daeun …) — 있으면 **이쪽이 말투를 정한다**
      judge,              // true 면 말투를 벗고 **O/X 판정기**로 쓴다 (아래 JUDGE_PROMPT)
      pick,               // true 면 **보기 고르기 판정기**로 쓴다 (PICK_PROMPT) — 숫자 하나만 답한다
      history = [],
      imageBase64,        // 필기 캔버스 이미지 (base64 PNG, 선택)
    } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    /* ── 말투를 정하는 것은 강사다 ──
       `persona`(park·jang·kim…)는 원래 **TTS 파라미터**(말 속도·안정성)를 고르는 키였는데,
       그 키로 시스템 프롬프트까지 골라서 강사와 다른 사람이 답하고 있었다:
       윤다은 → 'jang' → "애교 넘치는 장연지" (실측). 강사코드가 오면 그쪽을 먼저 본다.
       강사별 프롬프트가 아직 없는 강사는 예전대로 persona 로 떨어진다. */
    const systemPrompt = pick ? PICK_PROMPT
      : judge ? JUDGE_PROMPT
      : (instructor && PERSONA_PROMPTS[instructor])
      ?? PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS.jang

    /* 대화 이력 구성 (최근 6턴으로 확장) */
    const historyContents = (history as { role: string; text: string }[])
      .slice(-6)
      .map((h) => ({ 
        role: h.role === 'instructor' ? 'model' : 'user', 
        parts: [{ text: h.text }] 
      }))

    /* 사용자 메시지 구성 (문제 풀이 혹은 일반 대화) */
    let finalUserMessage = message || userAnswer;
    if (problem) {
      finalUserMessage = `
문제: ${problem}
정답: ${correctAnswer}
학습자 답변: "${userAnswer}"

위 상황에 대해 당신의 스타일로 피드백을 주세요.
`.trim()
    }

    /* 이미지가 있으면 멀티모달 파트로 구성 */
    const userParts: object[] = []
    if (imageBase64) {
      userParts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } })
      /* 필기가 얹혀 있을 때도 있고, **필기 없이 화면 사진만** 올 때도 있다(자유 질문).
         여기서 "필기/표시한 내용" 이라고 못박으면 그림에 없는 필기를 찾는다 — 무엇이 실렸는지는
         아래 본문이 이미 말해 준다(구현 중 메모 74행). */
      userParts.push({ text: `(학생이 지금 보고 있는 화면 그림이 첨부됩니다)\n${finalUserMessage}` })
    } else {
      userParts.push({ text: finalUserMessage })
    }

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        ...historyContents,
        { role: 'user', parts: userParts },
      ],
      generationConfig: {
        /* 판정은 한 글자면 되지만 **한도를 넉넉히 준다** — 4 로 조였더니 응답이 통째로 잘려
           빈 내용에 finishReason=MAX_TOKENS 만 왔다(실측). 빈 답은 '정답' 으로 떨어지므로
           판정이 사실상 꺼진 채로 전부 통과했다. 온도는 0 — 같은 답은 매번 같게 나와야 한다. */
        maxOutputTokens: judge || pick ? 16 : 300,
        temperature: judge || pick ? 0 : persona === 'p6tutor' ? 0.7 : 0.8,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[Gemini API error]', errText)
      return NextResponse.json({ error: 'Gemini API request failed' }, { status: 502 })
    }

    const data = await geminiRes.json()
    const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? []
    const textPart = parts.find((p) => !p.thought && p.text)
    const dialogue: string = textPart?.text ?? '죄송해요, 잠시 후 다시 시도해 주세요.'

    /* ── 판정기가 **무엇을 받고 무엇이라 답했는지** 그대로 남긴다 (09-18) ──
       "말은 맞게 했는데 틀렸다고 한다" 를 쫓으려면 판정기에 들어간 글자를 봐야 한다. 화면
       콘솔은 태블릿에서 열기 어려우니 **dev 서버 터미널**에 찍는다 — 태블릿으로 수업을 돌려도
       이 PC 에서 그대로 읽힌다. 수업 대화(judge·pick 아님)는 안 찍는다(발화가 통째로 흘러
       읽을 수가 없다). */
    if (judge || pick) {
      console.log(`\n[${pick ? 'pick' : 'judge'}] ← 받은 것\n${finalUserMessage}\n[${pick ? 'pick' : 'judge'}] → 답: ${dialogue.trim()}\n`)
    }

    return NextResponse.json({ dialogue })
  } catch (error) {
    console.error('[/api/gemini] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
