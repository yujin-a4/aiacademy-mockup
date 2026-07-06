import { NextRequest, NextResponse } from 'next/server'
import { PERSONA_PROMPTS } from '@/lib/personaPrompts'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      problem,
      correctAnswer,
      userAnswer,
      persona = 'jang',
      history = [],
      imageBase64,        // 필기 캔버스 이미지 (base64 PNG, 선택)
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
        maxOutputTokens: 300,
        temperature: persona === 'p6tutor' ? 0.7 : 0.8,
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
