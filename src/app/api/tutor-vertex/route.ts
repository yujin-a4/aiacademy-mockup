import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { PERSONA_PROMPTS } from '@/lib/personaPrompts'

/**
 * /api/gemini(Gemini API 키)와 같은 페르소나/요청·응답 형식을 쓰는 테스트용 쌍둥이 엔드포인트.
 * 차이는 호출 경로뿐: 여기는 GCP Vertex AI(서비스 계정 인증)를 통해 gemini-3.5-flash를 부른다.
 * ElevenLabs 에이전트는 건드리지 않음 — 별도 비교 테스트용.
 *
 * 두 가지 모드:
 * - 기본(persona+message/problem): Gemini가 내용까지 자유생성 — /api/gemini와 동일한 "자유장생" 테스트.
 * - directive 모드: /api/tutor(DB 기반 레일 엔진)가 이미 결정한 지시문을 그대로 "말투로만" 렌더링.
 *   사실·진행순서는 백엔드가 소유하고, 여기선 문장으로 바꿔 말하기만 함 (S-CHNXPN 원칙 그대로 적용).
 */
const MODEL = 'gemini-3.5-flash'

const RENDER_SYSTEM = `너는 TOEIC 강사 박혜원이야. 반말, 빠르고 직설적, 핵심만 팍팍, 좀 틱틱대는 톤.
아래 사용자 메시지는 학생에게 하는 말이 아니라, 네가 지금 학생에게 뭘 말해야 하는지 알려주는 "내부 지시"야.
이 지시에 없는 사실(정답/근거/해설)은 절대 지어내지 말고, 지시에 있는 내용만 활용해서 그 말투로 짧게 말해.
지시 문장을 그대로 읽지 말고 자연스러운 대화체로 바꿔서 말해. 지시 자체를 언급하거나 설명하지 마. 2줄 이내.`

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      problem,
      correctAnswer,
      userAnswer,
      persona = 'jang',
      history = [],
      imageBase64,
      directive,
    } = await req.json()

    const project = process.env.GOOGLE_CLOUD_PROJECT
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    if (!project || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json(
        { error: 'Vertex AI not configured (GOOGLE_CLOUD_PROJECT / GOOGLE_APPLICATION_CREDENTIALS)' },
        { status: 500 }
      )
    }

    const ai = new GoogleGenAI({ vertexai: true, project, location })

    /* ── directive 렌더 모드: /api/tutor가 정한 내용을 말투로만 옮김 ── */
    if (directive) {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: directive }] }],
        config: { systemInstruction: RENDER_SYSTEM, maxOutputTokens: 150, temperature: 0.4 },
      })
      const dialogue = response.text ?? '음, 잠시만.'
      return NextResponse.json({ dialogue, engine: 'vertex-ai' })
    }

    const systemPrompt = PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS.jang

    const historyContents = (history as { role: string; text: string }[])
      .slice(-6)
      .map((h) => ({
        role: h.role === 'instructor' ? 'model' : 'user',
        parts: [{ text: h.text }],
      }))

    let finalUserMessage = message || userAnswer
    if (problem) {
      finalUserMessage = `
문제: ${problem}
정답: ${correctAnswer}
학습자 답변: "${userAnswer}"

위 상황에 대해 당신의 스타일로 피드백을 주세요.
`.trim()
    }

    const userParts: object[] = []
    if (imageBase64) {
      userParts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } })
      userParts.push({ text: `(학생이 지문에 필기/표시한 내용이 첨부됩니다)\n${finalUserMessage}` })
    } else {
      userParts.push({ text: finalUserMessage })
    }

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [...historyContents, { role: 'user', parts: userParts }],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 300,
        temperature: persona === 'p6tutor' ? 0.7 : 0.8,
      },
    })

    const dialogue = response.text ?? '죄송해요, 잠시 후 다시 시도해 주세요.'

    return NextResponse.json({ dialogue, engine: 'vertex-ai' })
  } catch (error) {
    console.error('[/api/tutor-vertex] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
