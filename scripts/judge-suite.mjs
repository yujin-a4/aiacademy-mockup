/* 말하기 채점기 회귀 시험 — **제품 라우트(/api/gemini)를 그대로 부른다.**
 *  사례는 전부 실제 대본에서 가져왔다. 판정 규칙을 고치면 이걸 먼저 돌린다.
 *    node --experimental-strip-types scripts/_judge-suite.mjs
 */
const URL = 'http://localhost:3000/api/gemini'

/* [기대 답, 학생 답, 나와야 할 판정] */
const CASES = [
  /* 덜 말한 답 — 열쇠말은 맞는데 서술이 없다 */
  ['물감 튜브를 들고 있지 않아요.', '물감', 'P'],
  ['물감 튜브를 들고 있지 않아요.', '물감 튜브', 'P'],
  ['선반 위에 줄지어 놓여 있어요.', '선반', 'P'],
  ['그림을 그리고 있어요.', '그림', 'P'],
  ['옷이 접혀서 쌓여 있지 않고 옷걸이에 걸려 있어요.', '옷걸이', 'P'],
  /* 다 말한 답 */
  ['물감 튜브를 들고 있지 않아요.', '물감 튜브를 안 들고 있어요', 'O'],
  ['그림을 그리고 있어요.', '이젤 페인팅', 'O'],
  ['선반 위에 줄지어 놓여 있어요.', '줄지어 놓여 있어요', 'O'],
  /* 낱말이 곧 답인 자리 — 여기서 P 가 나오면 맞힌 학생을 붙잡는다 */
  ['동작이요.', '동작', 'O'],
  ['동작이요.', '행동', 'O'],
  ['painting a picture', 'painting', 'O'],
  ['is painting (a picture)', 'painting', 'O'],
  /* 뒤집어 말한 답 — 낱말은 다 겹치지만 뜻이 반대다 */
  ['물감 튜브를 들고 있지 않아요.', '물감 튜브를 들고 있어요', 'X'],
  ['잎이 바닥에 흩어져 있지 않아요.', '잎이 바닥에 흩어져 있어요', 'X'],
  /* 그냥 틀린 답 · 모른다 · 질문 */
  ['물감 튜브를 들고 있지 않아요.', '밥 먹고 있어요', 'X'],
  ['그림을 그리고 있어요.', '몰라요', 'X'],
  ['그림을 그리고 있어요.', 'easel이 무슨 뜻이에요?', 'Q'],
]

let bad = 0
for (const [hint, said, want] of CASES) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ judge: true, message: `[강사 질문] (생략)\n[기대 답] ${hint}\n[학생 답] ${said}` }),
  })
  const got = String((await res.json()).dialogue ?? '?').trim().toUpperCase().slice(0, 1)
  const ok = got === want
  if (!ok) bad += 1
  console.log(`${ok ? '  ok' : 'FAIL'} | 기대 ${want} · 받음 ${got} | "${said}"  ← ${hint.slice(0, 24)}`)
}
console.log(`\n${CASES.length - bad}/${CASES.length} 통과`)
