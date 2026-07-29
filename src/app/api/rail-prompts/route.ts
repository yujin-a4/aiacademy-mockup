import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

/**
 * 스캐폴딩 부품 → **강사 발화 + 학생에게 던질 질문** 생성 (한 수업치를 한 번에).
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

const SYSTEM = `너는 TOEIC 수업 화면의 대사를 만드는 도구다.
단계마다 두 가지를 만든다.
  tutor  — 강사가 실제로 하는 말 (2~3문장)
  prompt — 그 뒤에 학생에게 던지는 질문 한 문장 (학생이 할 일이 있는 단계만)

■ 절대 규칙 — 사실
- **[문항 사실]에 있는 것만 말한다.** 사진·지문에 없는 사람·사물·장소를 지어내면 안 된다.
- [참고 예시]는 **말투와 길이만** 참고한다. 거기 나오는 사진 묘사·정답 표시는
  다른 문항을 보고 쓴 것이라 **내용은 절대 가져오지 마라.**
- 어느 보기가 정답인지는 [문항 사실]에만 있다. 예시에 적힌 정답은 무시하라.

■ 정답 노출
- 기본은 **정답을 미리 말하지 않는다.**
- 단, 단계 이름에 특정 보기가 있으면(예: '선택지 C 청취') **그 보기 하나**를 사진·지문과
  대조해 맞는지 아닌지 말해도 된다. 사실대로만 말하라.
- 단계가 '표현 정리'·'정답 공개'류면 정답을 밝혀도 된다.

■ 형식
- 한국어 존댓말. tutor 는 160자 이내, prompt 는 40자 이내.
- 학생 이름을 부르지 마라.
- 출력은 JSON 하나: {"tutors":{"<턴번호>":"<강사 말>"},"prompts":{"<턴번호>":"<질문>"}}
  다른 말은 쓰지 마라.`



interface ReqTurn {
  no: number
  stage: string          // 부품 이름 'S6 오답 제거'
  role?: string          // 이 단계에서 강사가 할 일 (시트 [설명] — 콘텐츠팀이 쓴 지시)
  interaction: string    // 학생이 할 일 '보기 중에서 고르기'
  seed?: string | null       // 학생 질문 말투 참고용
  tutorSeed?: string | null  // 강사 발화 말투 참고용 (시트 '자유 표현' — 내용은 쓰지 않는다)
  needsPrompt?: boolean      // 학생이 할 일이 있는 단계인가
}

export async function POST(req: NextRequest) {
  try {
    const { turns, facts } = (await req.json()) as { turns: ReqTurn[]; facts: string }
    if (!Array.isArray(turns) || !turns.length) {
      return NextResponse.json({ prompts: {}, tutors: {} })
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
      return NextResponse.json({ prompts: {}, tutors: {}, disabled: 'llm-not-configured' })
    }

    const turnLines = turns.map((t) => [
      `- 턴 ${t.no}`,
      `  단계: ${t.stage}`,
      t.role ? `  이 단계에서 강사가 할 일: ${t.role}` : '',
      `  학생이 할 일: ${t.interaction}`,
      t.needsPrompt === false ? '  (학생 질문 없음 — tutor 만 만든다)' : '',
      t.tutorSeed ? `  강사 말투 참고(내용은 쓰지 말 것): ${t.tutorSeed}` : '',
      t.seed ? `  질문 말투 참고(내용은 쓰지 말 것): ${t.seed}` : '',
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
    let tutors: Record<string, string> = {}
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.prompts === 'object') prompts = parsed.prompts
      if (parsed && typeof parsed.tutors === 'object') tutors = parsed.tutors
    } catch {
      return NextResponse.json({ prompts: {}, tutors: {}, error: 'unparsable-model-output' })
    }

    // 규칙 위반(너무 길거나 빈 값)은 버려서 폴백시킨다
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(prompts)) {
      const t = String(v ?? '').replace(/\s+/g, ' ').trim()
      if (t && t.length <= 60) clean[k] = t
    }
    const cleanTutors: Record<string, string> = {}
    for (const [k, v] of Object.entries(tutors)) {
      const t = String(v ?? '').replace(/\s+/g, ' ').trim()
      if (t && t.length <= 220) cleanTutors[k] = t
    }
    return NextResponse.json({ prompts: clean, tutors: cleanTutors, engine: 'vertex-ai' })
  } catch (e) {
    console.error('[rail-prompts]', e)
    return NextResponse.json({ prompts: {}, tutors: {}, error: 'generation-failed' })
  }
}
