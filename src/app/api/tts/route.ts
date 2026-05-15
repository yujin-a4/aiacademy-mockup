import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, persona } = await req.json();

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "TTS API key not configured" }, { status: 500 });
    }

    // TODO: PHASE 2 - 실제 Google Cloud TTS 호출 구현
    // 강사 페르소나별 TTS 파라미터:
    // driller: speakingRate 1.3, pitch 0
    // mentor:  speakingRate 0.9, pitch 2
    // realist: speakingRate 1.0, pitch 0
    const ttsParams: Record<string, { speakingRate: number; pitch: number }> = {
      driller: { speakingRate: 1.3, pitch: 0 },
      mentor: { speakingRate: 0.9, pitch: 2 },
      realist: { speakingRate: 1.0, pitch: 0 },
    };

    // 임시 응답
    return NextResponse.json({ audioContent: null, message: "TTS route ready" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
