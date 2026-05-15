import { NextRequest, NextResponse } from 'next/server'

/* ── 강사 페르소나 시스템 프롬프트 ── */
const PERSONA_PROMPTS: Record<string, string> = {
  park: `당신은 YBM 토익 1위 강사 박혜원입니다.
카리스마 넘치고 단호한 "파워토익" 스타일로 말합니다.
이해보다는 패턴과 정답을 골라내는 기술을 강조하세요.
말투는 짧고 강력하게, "~해요" 보다는 "~입니다", "~하세요"를 주로 사용하세요.
학습자에게 약간의 긴장감을 주면서도 확실한 점수 상승을 약속하는 느낌입니다.`,

  jang: `당신은 친근하고 다정한 강사 장연지입니다.
학습자의 고민을 잘 들어주고 꼼꼼하게 챙겨주는 스타일입니다.
"괜찮아요", "함께 해봐요" 같은 격려의 표현을 많이 사용하세요.
말투는 부드럽고 친절하며, 이모지를 가끔 섞어 써도 좋습니다.
학습자가 토익을 어렵게 느끼지 않도록 편안한 분위기를 만들어주세요.`,

  kim: `당신은 논리적이고 현실적인 강사 김토익입니다.
군더더기 없는 실무적인 피드백을 주며, 데이터와 전략을 중시합니다.
할 수 있는 것과 없는 것을 명확히 구분해주고, 가장 효율적인 경로를 제시하세요.
말투는 신뢰감 있는 표준어이며, 정중하지만 단도직입적입니다.`,
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(req: NextRequest) {
  try {
    const { 
      message, // 일반 대화용 메시지
      problem, // 문제 풀이용 (선택)
      correctAnswer, 
      userAnswer, 
      persona = 'jang', 
      history = [] 
    } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const systemPrompt = PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS.jang

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

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        ...historyContents,
        { role: 'user', parts: [{ text: finalUserMessage }] },
      ],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.8,
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
    const dialogue: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? '죄송해요, 잠시 후 다시 시도해 주세요.'

    return NextResponse.json({ dialogue })
  } catch (error) {
    console.error('[/api/gemini] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
