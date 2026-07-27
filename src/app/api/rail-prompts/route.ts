import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

/**
 * 스캐폴딩 부품 → 학생에게 던질 질문 문구 생성 (한 수업치를 한 번에).
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────
 * 부품(rail_steps)은 "S6 오답 제거 / 선택 응답"처럼 **무엇을 시킬지**만 갖는다.
 * 실제 문구("주어와 동작 관계가 맞지 않는 보기는?")는 문항마다 달라야 하는데,
 * 그걸 강의마다 손으로 써두면 강의가 늘 때마다 사람이 따라 써야 한다 → 확장 불가.
 * 그래서 **부품(무엇) + 문항 사실(무엇에 대해)** 만 주고 문구는 여기서 만든다.
 *
 * ── 원칙 ────────────────────────────────────────────────────────
 * · 사실은 만들지 않는다. 주어진 문항 사실 안에서만 쓴다.
 * · **정답을 노출하지 않는다.** 학생에게 던지는 질문이므로.
 * · 실패하면 빈 값을 돌려준다 → 클라이언트가 seed(손글씨) / 부품 기본값으로 폴백.
 *   (다른 API 라우트와 같은 "키 없으면 graceful degrade" 원칙)
 */
const MODEL = 'gemini-3.5-flash'

const SYSTEM = `너는 TOEIC 수업 화면의 문구를 만드는 도구다.
각 단계마다 "학생에게 던질 질문" 한 문장을 만든다.

규칙
- 반드시 한국어 한 문장. 40자 이내. 존댓말.
- 주어진 [문항 사실]에 있는 내용만 쓴다. 없는 사실을 지어내지 마라.
- **정답이 무엇인지 드러내지 마라.** 학생이 아직 풀기 전이다.
- 단계의 목적에 맞춰라. 예: '오답 제거' 단계면 걸러낼 기준을 묻고, '핵심 단서' 단계면 어디를 볼지 묻는다.
- [참고 예시]가 있으면 그 말투와 길이를 따르되, 이번 문항에 맞게 바꿔 쓴다. 그대로 베끼지 마라.
- 출력은 JSON 하나: {"prompts":{"<턴번호>":"<문구>", ...}}. 다른 말은 쓰지 마라.`

interface ReqTurn {
  no: number
  stage: string          // 부품 이름 'S6 오답 제거'
  interaction: string    // 학생이 할 일 '보기 중에서 고르기'
  seed?: string | null   // 이식된 손글씨 문구 (말투 참고용)
}

export async function POST(req: NextRequest) {
  try {
    const { turns, facts } = (await req.json()) as { turns: ReqTurn[]; facts: string }
    if (!Array.isArray(turns) || !turns.length) {
      return NextResponse.json({ prompts: {} })
    }

    /* Gemini API 키가 있으면 그걸로, 없으면 Vertex(서비스 계정)로. 둘 다 없으면 폴백시킨다. */
    const apiKey = process.env.GEMINI_API_KEY
    const project = process.env.GOOGLE_CLOUD_PROJECT
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'

    let ai: GoogleGenAI
    if (apiKey) {
      ai = new GoogleGenAI({ apiKey })
    } else if (project && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      ai = new GoogleGenAI({ vertexai: true, project, location })
    } else {
      // 키 없는 환경(예: 배포에 미등록) — 조용히 폴백시킨다
      return NextResponse.json({ prompts: {}, disabled: 'llm-not-configured' })
    }

    const turnLines = turns.map((t) => [
      `- 턴 ${t.no}`,
      `  단계: ${t.stage}`,
      `  학생이 할 일: ${t.interaction}`,
      t.seed ? `  참고 예시(다른 강의에서 쓰던 말투): ${t.seed}` : '',
    ].filter(Boolean).join('\n')).join('\n')

    const user = `[문항 사실]\n${facts}\n\n[문구를 만들 단계들]\n${turnLines}`

    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: user }] }],
      config: {
        systemInstruction: SYSTEM,
        // gemini-3.5-flash는 thinking이 기본 on이라 사고 토큰까지 여유를 둔다 (부족하면 응답이 잘림)
        maxOutputTokens: 4000,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    })

    const raw = res.text ?? ''
    let prompts: Record<string, string> = {}
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.prompts === 'object') prompts = parsed.prompts
    } catch {
      return NextResponse.json({ prompts: {}, error: 'unparsable-model-output' })
    }

    // 규칙 위반(너무 길거나 빈 값)은 버려서 폴백시킨다
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(prompts)) {
      const t = String(v ?? '').replace(/\s+/g, ' ').trim()
      if (t && t.length <= 60) clean[k] = t
    }
    return NextResponse.json({ prompts: clean, engine: 'vertex-ai' })
  } catch (e) {
    console.error('[rail-prompts]', e)
    return NextResponse.json({ prompts: {}, error: 'generation-failed' })
  }
}
