import { NextRequest, NextResponse } from 'next/server'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'no key' }, { status: 500 })

  const { targetScore, ddayLabel, lcAccuracy, rcAccuracy, partStats, totalAnswered, dailyTime } = await req.json()

  const partLines = (partStats as { part: number; accuracy: number; total: number }[])
    .map(p => `Part ${p.part}: 정답률 ${p.accuracy}% (${p.total}문제 풀이)`)
    .join('\n')

  const prompt = `당신은 토익 학습 AI 분석 도우미입니다.
아래 학습자의 이번 주 데이터를 바탕으로 주간 분석 리포트를 작성해주세요.

[학습자 데이터]
- 목표 점수: ${targetScore}점
- 시험까지: ${ddayLabel ?? '미설정'}
- 일일 학습 목표: ${dailyTime ?? '미설정'}
- 총 풀이 문제: ${totalAnswered}문제
- LC 정답률: ${lcAccuracy != null ? lcAccuracy + '%' : '데이터 없음'}
- RC 정답률: ${rcAccuracy != null ? rcAccuracy + '%' : '데이터 없음'}
${partLines ? `\n[파트별 정답률]\n${partLines}` : ''}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
각 항목은 12~25자 이내의 한국어 문장으로, 3개씩 작성하세요.

{
  "good": ["잘한 점 1", "잘한 점 2", "잘한 점 3"],
  "improve": ["개선 필요 1", "개선 필요 2", "개선 필요 3"],
  "focus": ["다음 주 집중 1", "다음 주 집중 2", "다음 주 집중 3"]
}`

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 400,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })

    if (!res.ok) return NextResponse.json({ error: 'gemini error' }, { status: 502 })

    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.find((p: any) => !p.thought && p.text)?.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'parse error' }, { status: 500 })

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
