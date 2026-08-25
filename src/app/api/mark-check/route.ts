import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

/**
 * 학생이 **화면에 표시한 것**을 판정한다 — 사진에 동그라미, 지문에 밑줄.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────
 * `필기로 짚기`(mark) 단계는 여태 "탭하면 완료" 였다. 무엇을 짚었는지 보지 않으니
 * 잘못 짚어도 그냥 넘어갔다 — 스캐폴딩의 S1(핵심 단서 찾기)이 무의미해진다.
 * Part1 은 사진이라 탭할 텍스트조차 없어서 사실상 빈 턴이었다.
 *
 * ── 접근 ────────────────────────────────────────────────────────
 * 사진 위 표시는 **좌표로 못 푼다**(무엇이 어디 있는지 데이터가 없다). 그래서 화면을 그대로
 * (사진 + 필기 레이어 합성) 모델에 보여주고 "무엇을 표시했나"를 읽게 한다.
 * 정답 여부는 모델이 아니라 **[핵심 단서]로 준 사실**과 대조해 판단하게 한다 — 사실을
 * 지어내지 않게 하는 다른 라우트와 같은 원칙.
 *
 * ── 원칙 ────────────────────────────────────────────────────────
 * · 표시를 못 읽으면 `read: null` → 화면은 "판정 못 함"으로 두고 진행을 막지 않는다.
 * · 키가 없으면 조용히 비활성(`disabled`) — 다른 라우트와 같은 graceful degrade.
 * · 정답을 문장으로 노출하지 않는다. 틀렸을 때 **어디를 봐야 하는지**만 돌려준다.
 */
const MODEL = 'gemini-3.5-flash'

/** 응답에서 **첫 JSON 객체만** 떼어낸다.
 *  실측: 모델이 올바른 객체 뒤에 닫는 중괄호를 하나 더 붙여 보내는 일이 있다(`{...}\n}`)
 *  → JSON.parse 가 통째로 실패해 판정이 매번 "못 읽음"이 됐다. 괄호 균형으로 잘라 쓴다. */
function firstJsonObject(text: string): unknown | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) {
      try { return JSON.parse(text.slice(start, i + 1)) } catch { return null }
    }
  }
  return null
}

const SYSTEM = `너는 학생이 화면에 표시(동그라미·밑줄·형광펜)한 것을 읽어 주는 도구다.

■ 하는 일
1. 이미지에서 **학생이 표시한 부분**을 찾는다. 표시는 주황색 선(펜·형광펜)이다.
2. 그 자리에 무엇이 있는지 짧게 적는다 (read).
3. [핵심 단서]와 견줘 맞게 짚었는지 판정한다 (ok).

■ 절대 규칙
- **이미지에 보이는 것만** 말한다. 사진에 없는 사람·사물을 지어내지 마라.
- 표시가 안 보이면 read 를 null 로 둔다. 추측해서 채우지 마라.
- 표시가 여러 곳이면 핵심 단서와 가장 관련 있는 것 하나를 고른다.
- ok=false 일 때 **정답을 문장으로 알려주지 마라.** 어디를 다시 볼지만 한 줄로 적는다(hint).
- 한국어. read 는 20자 이내, hint 는 40자 이내.

■ 출력
JSON 하나: {"read":"<표시한 것>"|null,"ok":true|false,"hint":"<틀렸을 때 볼 곳>"}
다른 말은 쓰지 마라.`

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, targets, task } = (await req.json()) as {
      imageBase64?: string; targets?: string; task?: string
    }
    if (!imageBase64) return NextResponse.json({ read: null, error: 'no-image' })

    const apiKey = process.env.GEMINI_API_KEY
    const project = process.env.GOOGLE_CLOUD_PROJECT
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'

    let ai: GoogleGenAI
    if (apiKey) ai = new GoogleGenAI({ apiKey })
    else if (project && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      ai = new GoogleGenAI({ vertexai: true, project, location })
    } else {
      return NextResponse.json({ read: null, disabled: 'llm-not-configured' })
    }

    const data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data } },
          { text: `[이 단계에서 학생에게 시킨 일]\n${task ?? '핵심 단서를 표시하기'}\n\n`
            + `[핵심 단서 — 맞게 짚었는지 판단하는 기준]\n${targets ?? '(주어지지 않음 — 표시한 것만 읽고 ok 는 true 로 둔다)'}` },
        ],
      }],
      config: {
        systemInstruction: SYSTEM,
        /* ── 사고(thinking)를 끈다 — 요금의 대부분이 여기였다 (실측 2026-08-25) ──
           gemini-3.5-flash 는 thinking 이 **기본 on** 이고, 사고 토큰은 출력으로 청구된다.
           같은 사진·같은 프롬프트로 재 보니 사고 225 · 답 53 이었다. 판정 한 줄을 얻으려고
           그 다섯 배를 태우고 있었다. 끄면 사고 0 · 답 55 로 **결과는 같고** 응답도 절반으로
           빨라진다(3.3초 → 1.7초 — 강사 반응이 늦다는 보고와도 같은 자리다).
           ⚠️ 껐는데 판정이 나빠지면 여기부터 되돌릴 것. 모델을 바꾸기 전에 이것을 먼저 본다. */
        thinkingConfig: { thinkingBudget: 0 },
        /* 사고를 껐으니 4000 은 필요 없다 — 답이 55 토큰짜리 JSON 한 줄이다.
           한도는 요금이 아니라 **폭주 상한**이다. 넉넉하되 4000 은 아니게 둔다. */
        maxOutputTokens: 500,
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    })

    const parsed = firstJsonObject(res.text ?? '') as
      { read?: unknown; ok?: unknown; hint?: unknown } | null
    if (!parsed) {
      // 원문 앞부분을 같이 준다 — 빈 응답(사고 토큰 소진)과 형식 이탈을 구분해야 고칠 수 있다
      return NextResponse.json({
        read: null, error: 'unparsable-model-output',
        raw: (res.text ?? '').slice(0, 200),
        finish: res.candidates?.[0]?.finishReason ?? null,
      })
    }
    const read = typeof parsed.read === 'string' && parsed.read.trim() ? parsed.read.trim() : null
    return NextResponse.json({
      read,
      ok: parsed.ok === true,
      hint: typeof parsed.hint === 'string' ? parsed.hint.trim().slice(0, 60) : '',
    })
  } catch (e) {
    console.error('[mark-check]', e)
    return NextResponse.json({ read: null, error: 'check-failed' })
  }
}
