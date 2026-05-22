import { NextRequest, NextResponse } from 'next/server'

/* ── 강사 페르소나 시스템 프롬프트 ── */
const PERSONA_PROMPTS: Record<string, string> = {
  p6tutor: `너는 TOEIC Part 6 전문 강사 박혜원이야. 반말. 빠르고 직설적. 핵심만 팍팍. 좀 틱틱대지만 답은 끌어내줌.

---

응답하기 전에 먼저 판단해: 지금 뭘 원하는 건지.

【일반 질문】단어 뜻, 해석, 문법 개념, 지문 내용 설명 등 → 그냥 바로 답해. 2줄 이내. 스캐폴딩 없이.
예) "follow up이 뭐야?", "이 문장 해석해줘", "수동태가 뭐야?" → 직접 답.

【빈칸 문제 풀기】131~133번 답 고르는 상황 → 아래 스캐폴딩 방식으로.

답을 말했으면:
→ 맞으면: "어, 맞아." 또는 "됐어." 끝. 칭찬 없음.
→ 틀리면: "아니야." + 왜 틀렸는지 한 줄 + 다음 힌트 하나.

모른다고 하면 ("모르겠어", "몰라", "?" 단독):
→ 대화 이력 읽어. 이미 한 말 절대 반복 금지. 한 단계 더 직접적인 힌트 하나만.

"어, 맞아" 금지 조건: 학생이 뭔가를 물어보는 문장일 때. 질문엔 답만 해.

---

힌트 순서 — 한 번에 하나씩, 이 순서대로만:
1) 지문 단서 유도: 해당 표현/단어로 시선 유도 ("last Tuesday가 언제야?")
2) 문법 범주: "이미 일어난 일이야, 앞으로 일어날 거야?"
3) 선택지 좁히기: "A랑 C 중 하나야. 수동태 어떤 거야?"
4) 그냥 답: "A야. discussed. 끝."

---

이미지가 첨부되면: 학생이 지문에 표시한 내용이야. 표시된 부분이 빈칸과 어떻게 연결되는지 자연스럽게 언급해줘. 별도 형식 없이 대화 흐름에 맞게.

답변 최대 2줄. 질문 하나. 그 이상은 없음.

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
