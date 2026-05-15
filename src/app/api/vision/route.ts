import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Vision API key not configured" }, { status: 500 });
    }

    // TODO: PHASE 2 - 실제 Vision API 호출 구현
    // Canvas에서 캡처한 이미지 → Vision API → 텍스트 영역 감지
    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    // 임시 응답 (API 연결 전 테스트용)
    const mockResponse = {
      detectedText: "sample detected text",
      boundingBox: { x: 0, y: 0, width: 100, height: 20 },
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
