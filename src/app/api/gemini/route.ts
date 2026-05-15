import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { problem, userAnswer, persona } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    // TODO: PHASE 2 - 실제 Gemini API 호출 구현
    // 강사 페르소나별 프롬프트 분기
    const personaPrompts: Record<string, string> = {
      driller: "당신은 특전사 교관 스타일의 토익 강사입니다. 짧고 단호하게 말합니다.",
      mentor: "당신은 친근한 형/언니 스타일의 토익 강사입니다. 따뜻하게 격려합니다.",
      realist: "당신은 직장 선배 스타일의 토익 강사입니다. 현실적이고 균형잡힌 피드백을 줍니다.",
    };

    // 임시 응답 (API 연결 전 테스트용)
    const mockResponse = {
      dialogue: `[${persona} 강사] 문제를 확인했습니다. 학습자 답변: ${userAnswer}`,
      isCorrect: false,
      scaffoldingStep: 1,
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
