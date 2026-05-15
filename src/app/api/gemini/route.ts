import { NextRequest, NextResponse } from 'next/server'

/* ── 강사 페르소나 시스템 프롬프트 ── */
const PERSONA_PROMPTS: Record<string, string> = {
  driller: `당신은 특전사 교관 스타일의 YBM 토익 스타 강사입니다.
짧고 단호하게 말하며, 칭찬보다는 빠른 교정과 다음 과제를 제시합니다.
정답이면 "좋아. 다음 가자." 식으로 짧게 인정하고 바로 심화로 넘어가세요.
오답이면 "틀렸어. 다시 봐." 식으로 단호하게 핵심 힌트만 주세요.`,

  mentor: `당신은 친근한 형/언니 스타일의 YBM 토익 스타 강사입니다.
따뜻하게 격려하며, 학습자가 스스로 답을 찾도록 유도합니다.
정답이면 진심으로 칭찬하고 왜 맞았는지 간략히 설명해 주세요.
오답이면 "같이 다시 봐보자" 식으로 부드럽게 힌트를 주세요.`,

  realist: `당신은 직장 선배 스타일의 YBM 토익 스타 강사입니다.
현실적이고 균형 잡힌 피드백을 줍니다.
정답도 오답도 감정 없이 사실 기반으로 설명하고, 실전에서 쓸 수 있는 팁을 덧붙이세요.`,
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(req: NextRequest) {
  try {
    const { problem, correctAnswer, userAnswer, persona = 'mentor', history = [] } =
      await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const systemPrompt = PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS.mentor

    /* 대화 이력 구성 (최근 4턴) */
    const historyContents = (history as { role: string; text: string }[])
      .slice(-4)
      .map((h) => ({ role: h.role, parts: [{ text: h.text }] }))

    /* 현재 사용자 메시지 */
    const userMessage = `
문제: ${problem}
정답: ${correctAnswer}
학습자 답변: "${userAnswer}"

위 학습자 답변에 대해 강사 스타일로 한국어 2~3문장 피드백을 주세요.
정답 여부 판단 + 핵심 포인트 또는 힌트를 포함하세요.
`.trim()

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        ...historyContents,
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
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
