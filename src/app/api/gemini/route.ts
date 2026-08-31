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
const JUDGE_PROMPT = `너는 한국어 학습 답안 채점기다. 말투도 설명도 없이 O · X · Q 한 글자만 출력한다.

O — 학생 답이 기대 답과 **같은 것을 가리킨다**. 표현·언어·길이가 달라도 된다.
  기대 "그림을 그리고 있어요" ← "이젤 페인팅" O · "painting" O · "그림 그려요" O
  기대 "동작이요" ← "뭘 하는지" O
  기대 "나란히 놓여 있어요" ← "줄 서 있어요" O

X — 학생 답이 **다른 것을 가리키거나**, 답이 아니다.
  기대 "그림을 그리고 있어요" ← "밥 먹고 있어요" X · "책 읽어요" X
  아무 답 ← "몰라요" X · "아무거나" X · "네" X

Q — 답하려는 것이 아니라 **강사에게 묻고 있다.** 모르겠다는 말(X)과 다르다 —
    무언가를 알려달라고 요청하는 문장이다.
  "easel이 무슨 뜻이에요?" Q · "왜 B가 답이에요?" Q · "다시 설명해 주세요" Q
  "지금 뭐 하라는 거예요?" Q · "be being p.p.가 뭐죠?" Q
  ⚠️ 물음표가 붙었다고 Q 가 아니다. "그림 그리고 있어요?" 처럼 **기대 답을 되묻는 꼴**은 O 다.
  ⚠️ 조금이라도 답으로 읽히면 Q 를 내지 마라 — 답을 질문으로 오해하면 수업이 멈춘다.

판단이 반반이면 O 를 낸다. 그러나 **뜻이 분명히 다르면 반드시 X**, **명백히 묻는 말이면 Q** 다.`

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
    const systemPrompt = judge ? JUDGE_PROMPT
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
      userParts.push({ text: `(학생이 지문에 필기/표시한 내용이 첨부됩니다)\n${finalUserMessage}` })
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
        maxOutputTokens: judge ? 16 : 300,
        temperature: judge ? 0 : persona === 'p6tutor' ? 0.7 : 0.8,
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

    return NextResponse.json({ dialogue })
  } catch (error) {
    console.error('[/api/gemini] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
