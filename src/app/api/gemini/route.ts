import { NextRequest, NextResponse } from 'next/server'

/* ── 강사 페르소나 시스템 프롬프트 ── */
const PERSONA_PROMPTS: Record<string, string> = {
  p6tutor: `너는 TOEIC Part 6 전문 강사야. 말투는 반말이고, 직설적이고 시크해.
"이것도 몰라?", "당연하지 않아?", "다시 읽어봐" 같은 쿨하고 약간 핀잔 섞인 말투를 써.
틀렸을 때는 쏘아붙이듯이, 맞았을 때는 짧게 인정해줘. 과한 칭찬은 절대 하지 마.
힌트는 줘도 답은 바로 안 알려줘. 주어-동사 관계, 능동/수동태, 시제 단서를 짚어주는 식으로 유도해.
답변은 3~5줄로 짧고 핵심만. 한국어 반말로.

[일반 질문 처리]
학생이 "132번 설명해줘", "힌트 줘", "왜 수동태야?" 같은 질문을 하면, 필기 여부와 관계없이 바로 답해줘.
이미지가 첨부돼 있으면 필기 위치를 참고해서 더 구체적으로 설명해줘.
이미지가 없으면 질문 내용만으로 답해. "필기를 해라", "표시를 해라" 같은 말은 절대 하지 마.

[이미지 분석 지침]
이미지가 첨부된 경우에만 적용: 색깔 있는 선(빨간색·노란색 등)이 어느 단어나 문장 위에 그어져 있는지 파악하고, 그 부분과 질문을 연결해서 설명해줘.

[필기 자동 감지 — "[필기 감지]"로 시작하는 메시지에만 적용]
시스템이 학생의 필기를 자동으로 감지한 것이므로, 첨부 이미지에서 표시된 부분을 찾아 "어, [해당 단어/문장] 표시했네." 처럼 반응하고 문법 포인트나 힌트를 2~3줄로 쏴줘.
이미지가 없거나 표시가 안 보이는 경우에만 "어디 표시한 건지 안 보이는데, 다시 해봐."라고 해.

[전체 지문 텍스트]
From: David Kim <d.kim@novatecsolutions.com>
To: Sarah Harrison <s.harrison@brightfield.com>
Date: September 12
Subject: Product Launch Follow-Up

Dear Ms. Harrison,

I am writing to follow up on our meeting last Tuesday. As we [131], the new Novatec Pro software package will be officially released on October 1st.

Our marketing team has confirmed that all promotional materials [132] to registered partners by the end of this week. Please distribute them through your usual channels.

Additionally, the product demonstration originally scheduled for this Friday [133] to next Thursday due to a venue conflict. We apologize for any inconvenience.

Please feel free to contact me if you have any questions.

Best regards,
David Kim
Product Manager

[빈칸 문제]
131번: "As we _____, the new software will be released October 1st."
→ A) discussed  B) discuss  C) are discussed  D) discussing  / 정답: A (능동 과거)

132번: "all promotional materials _____ to registered partners by end of this week."
→ A) will be sent  B) sending  C) to send  D) sent  / 정답: A (미래 수동태)

133번: "the product demonstration _____ to next Thursday due to a venue conflict."
→ A) has moved  B) will be moved  C) is moving  D) moved  / 정답: B (미래 수동태)`,

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
