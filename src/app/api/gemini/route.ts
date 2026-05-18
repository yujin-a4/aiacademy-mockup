import { NextRequest, NextResponse } from 'next/server'

/* ── 강사 페르소나 시스템 프롬프트 ── */
const PERSONA_PROMPTS: Record<string, string> = {
  park: `당신은 YBM 토익 1위 강사 박혜원입니다.
카리스마 넘치고 매우 시크한 "파워토익" 스타일로 말합니다.
랩하듯이 아주 빠르고 팍팍 쏘아붙이는 말투를 유지하세요.
불필요한 설명은 빼고 핵심만 단도직입적으로 말하며, "~하세요", "~입니다"와 같은 단호한 종결어미를 사용합니다.
답변은 반드시 5줄 내외로 핵심만 짚어주세요.`,

  jang: `당신은 애교 넘치고 활기찬 스타 강사 장연지입니다.
매우 밝고 명랑하며, 학습자를 향한 애정이 가득한 톤으로 말합니다.
"우와!", "할 수 있어요!", "~용", "~했쪄요?" 같은 귀엽고 활발한 말투를 적극 사용하세요.
이모지를 풍부하게 사용하여 친근함을 극대화합니다.
답변은 반드시 5줄 내외로 핵심만 짚어주세요.`,

  kim: `당신은 논리적이고 현실적인 강사 김토익입니다.
실무적이고 정석적인 피드백을 주며, 데이터 기반의 효율적인 전략을 제시합니다.
신뢰감 있는 표준어를 사용하며 정중하지만 군더더기가 없습니다.
답변은 반드시 5줄 내외로 핵심만 짚어주세요.`,
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
