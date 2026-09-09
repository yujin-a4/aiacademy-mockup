/**
 * FGI 설문 응답 시트에 **'강사별 보기' 탭**을 만든다(있으면 덮어쓴다).
 *
 * 왜 시트인가
 *   설문은 강사 이름이 아니라 들은 순서(A/B, ①/②)로 묻고 그 순서는 사람마다 뒤집혀 있어서,
 *   원본 응답 시트를 그대로 보면 두 강사가 섞여 아무것도 못 읽는다. 그렇다고 볼 때마다 스크립트를
 *   돌리게 하면 진행 중에 쓸 수가 없다. **수식으로 만들어 두면 응답이 들어오는 대로 저절로 갱신된다** —
 *   시트를 열어두기만 하면 된다.
 *
 * 원본은 건드리지 않는다. 탭 하나를 새로 붙일 뿐이고, 폼도 그대로다.
 *
 * 쓰는 법
 *   node scripts/fgi-survey-sheet-view.js
 *
 * 강사 이름을 바꾸려면 만들어진 탭의 B8·C8 두 칸만 고치면 표 전체가 따라 바뀐다.
 */
const { google, getAuthClient } = require('C:/Users/YBM/.google-scripts/auth.cjs')

const FORM_ID = process.env.FGI_FORM_ID || '1YiugsTHqywZh59nukC-RqeDKrYekXGbDcbzPETld3XU'
const TAB = '강사별 보기'

/** 응답 시트의 열 배치. 폼 문항을 고치면 여기도 같이 고쳐야 한다 */
const COL = {
  first: 'B', second: 'C',                       // 첫 / 두 번째로 들은 강의의 강사 ← 모든 되돌림의 열쇠
  a1: 'E', a2: 'F', a3: 'G', a4: 'H', a5: 'I',   // A = 첫 강의
  b1: 'J', b2: 'K', b3: 'L', b4: 'M', b5: 'N',   // B = 두 번째 강의
  c1: 'O', c2: 'P', c3: 'Q', c4: 'R',
  c5first: 'S', c5second: 'T', c6: 'U', c7: 'V',
  d1: 'W', d2: 'X', d3: 'Y', d4: 'Z', d5: 'AA',
  d6first: 'AB', d6second: 'AC', d7: 'AD',
}

const R = (col) => `'설문지 응답 시트1'!$${col}$2:$${col}`
/** 값이 몇 개든 한 칸에 늘어놓는다 — 사람이 적으니 평균보다 원문이 낫다 */
const join = (firstCol, secondCol, who) =>
  `=TEXTJOIN("  |  ", TRUE, IFERROR(FILTER(${R(firstCol)}, ${R(COL.first)}=${who}), ""), IFERROR(FILTER(${R(secondCol)}, ${R(COL.second)}=${who}), ""))`
/** 숫자 그대로인 척도(A-2/B-2) */
const avgNum = (firstCol, secondCol, who) =>
  `=IFERROR(ROUND((SUMIF(${R(COL.first)},${who},${R(firstCol)})+SUMIF(${R(COL.second)},${who},${R(secondCol)}))/(COUNTIF(${R(COL.first)},${who})+COUNTIF(${R(COL.second)},${who})),2),"—")`
/** "4 괜찮았다" 처럼 앞 글자가 숫자인 척도 — 앞 한 글자만 떼어 센다 */
const avgPrefixed = (firstCol, secondCol, who) => {
  const r = (c) => `'설문지 응답 시트1'!$${c}$2:$${c}$500`
  return `=IFERROR(ROUND((SUMPRODUCT((${r(COL.first)}=${who})*IFERROR(VALUE(LEFT(${r(firstCol)},1)),0))+SUMPRODUCT((${r(COL.second)}=${who})*IFERROR(VALUE(LEFT(${r(secondCol)},1)),0)))/(COUNTIF(${R(COL.first)},${who})+COUNTIF(${R(COL.second)},${who})),2),"—")`
}
/** ①/② 로 고른 답을 강사로 되돌려 센다 */
const tally = (col, who) =>
  `=COUNTIFS(${R(col)},"①*",${R(COL.first)},${who})+COUNTIFS(${R(col)},"②*",${R(COL.second)},${who})`
const tallyOther = (col) =>
  `=COUNTA(${R(col)})-COUNTIF(${R(col)},"①*")-COUNTIF(${R(col)},"②*")`
/** 순서와 상관없는 문항 — 그냥 전부 늘어놓는다 */
const all = (col) => `=TEXTJOIN("   //   ", TRUE, ${R(col)})`

const A = '$B$8', B = '$C$8'   // 강사 이름이 든 칸(이 두 칸만 고치면 표 전체가 따라 바뀐다)

const rows = [
  ['FGI 설문 · 강사별 보기'],
  ['순서(①/②)로 받은 답을 강사 이름으로 되돌린 표입니다. 응답이 들어오면 저절로 갱신됩니다. 원본은 「설문지 응답 시트1」 그대로 두고 읽기만 합니다.'],
  ['응답 수', `=COUNTA(${R('A')})`],
  ['① 이도윤 → ② 윤다은', `=COUNTIFS(${R(COL.first)},${A},${R(COL.second)},${B})`],
  ['① 윤다은 → ② 이도윤', `=COUNTIFS(${R(COL.first)},${B},${R(COL.second)},${A})`],
  ['⚠️ 강사 칸이 비어 못 쓰는 응답', `=COUNTA(${R('A')})-COUNTIFS(${R(COL.first)},${A},${R(COL.second)},${B})-COUNTIFS(${R(COL.first)},${B},${R(COL.second)},${A})`],
  [],
  ['【 강의별 문항 】  A(첫 강의)·B(두 번째)를 강사로 되돌린 것', '이도윤', '윤다은'],
  ['이미 알던 내용이었나  (A-1/B-1)', join(COL.a1, COL.b1, A), join(COL.a1, COL.b1, B)],
  ['답까지 오래 걸렸나 1~5  (A-2/B-2)', join(COL.a2, COL.b2, A), join(COL.a2, COL.b2, B)],
  ['      └ 평균 · 낮을수록 빠름', avgNum(COL.a2, COL.b2, A), avgNum(COL.a2, COL.b2, B)],
  ['단계적으로 묻는 방식 1~5  (A-3/B-3)', join(COL.a3, COL.b3, A), join(COL.a3, COL.b3, B)],
  ['      └ 평균 · 높을수록 좋음', avgPrefixed(COL.a3, COL.b3, A), avgPrefixed(COL.a3, COL.b3, B)],
  ['어색했던 순간  (A-5/B-5)', join(COL.a5, COL.b5, A), join(COL.a5, COL.b5, B)],
  ['넘기고 싶었던 부분  (A-4/B-4)', join(COL.a4, COL.b4, A), join(COL.a4, COL.b4, B)],
  [],
  ['【 비교 문항 】  ①/② 를 강사 이름으로 바꾼 것 — 여기가 제일 읽을 만하다', '=$B$8', '=$C$8', '그 외'],
  ['질문을 더 많이 던진 쪽  (C-1)', tally(COL.c1, A), tally(COL.c1, B), tallyOther(COL.c1)],
  ['더 답답했던 쪽  (C-2)', tally(COL.c2, A), tally(COL.c2, B), tallyOther(COL.c2)],
  ['스타일이 더 맞은 쪽  (C-3)', tally(COL.c3, A), tally(COL.c3, B), tallyOther(COL.c3)],
  [],
  ['【 ①/② 로 나뉜 문항 】', '=$B$8', '=$C$8'],
  ['목소리가 거슬렸나 1~5  (C-5)', join(COL.c5first, COL.c5second, A), join(COL.c5first, COL.c5second, B)],
  ['      └ 평균 · 낮을수록 안 거슬림', avgPrefixed(COL.c5first, COL.c5second, A), avgPrefixed(COL.c5first, COL.c5second, B)],
  ['질문의 성격  (D-6)', join(COL.d6first, COL.d6second, A), join(COL.d6first, COL.d6second, B)],
  ['혼자서는 못 했을 일을 해내게 한 대목  (D-2/D-3)', join(COL.d2, COL.d3, A), join(COL.d2, COL.d3, B)],
  [],
  ['【 강사와 무관한 문항 】  두 강의를 통틀어 물은 것이라 강사로 못 가른다'],
  ['D-5. 단계를 밟는 방식이 토익에 맞나', all(COL.d5)],
  ['D-7. Fading 이 필요한가', all(COL.d7)],
  ['C-4. 어떻게 공부하고 싶은가', all(COL.c4)],
  ['D-4. 점수에 기여할 것 같은 것', all(COL.d4)],
  ['C-6. 목소리가 거슬린 이유', all(COL.c6)],
  ['D-1. 응답자 배경', all(COL.d1)],
  ['0-1. 최근 토익 점수', all('D')],
  ['C-7. 자유 의견', all(COL.c7)],
]

async function main() {
  const auth = await getAuthClient()
  const forms = google.forms({ version: 'v1', auth })
  const sheets = google.sheets({ version: 'v4', auth })

  const { data: form } = await forms.forms.get({ formId: FORM_ID })
  const ssId = form.linkedSheetId
  if (!ssId) throw new Error('폼에 연결된 응답 시트가 없다 — 폼 [응답] 탭에서 시트에 연결할 것')

  const { data: ss } = await sheets.spreadsheets.get({ spreadsheetId: ssId })
  const existing = ss.sheets.find((s) => s.properties.title === TAB)

  /* 있으면 지우고 새로 만든다 — 문항이 늘면 행 수가 달라져서 덮어쓰기만으로는 찌꺼기가 남는다 */
  const reqs = []
  if (existing) reqs.push({ deleteSheet: { sheetId: existing.properties.sheetId } })
  reqs.push({ addSheet: { properties: { title: TAB, index: 1, gridProperties: { rowCount: rows.length + 4, columnCount: 5 } } } })
  const { data: made } = await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests: reqs } })
  const sheetId = made.replies.at(-1).addSheet.properties.sheetId

  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: `'${TAB}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows.map((r) => (r.length ? r : [''])) },
  })

  /* 제목·구획 줄을 굵게, 본문은 줄바꿈 — 자유응답이 길어서 이게 없으면 한 줄로 뻗어 못 읽는다 */
  const bold = rows.map((r, i) => [r, i]).filter(([r]) => (r[0] ?? '').startsWith('【') || (r[0] ?? '').startsWith('FGI'))
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    requestBody: {
      requests: [
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 330 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 4 }, properties: { pixelSize: 300 }, fields: 'pixelSize' } },
        { repeatCell: { range: { sheetId }, cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } }, fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)' } },
        ...bold.map(([, i]) => ({
          repeatCell: {
            range: { sheetId, startRowIndex: i, endRowIndex: i + 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.94, green: 0.94, blue: 0.96 } } },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        })),
        { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenColumnCount: 1 } }, fields: 'gridProperties.frozenColumnCount' } },
      ],
    },
  })

  console.log(`\n✅ '${TAB}' 탭을 만들었다`)
  console.log(`   https://docs.google.com/spreadsheets/d/${ssId}/edit#gid=${sheetId}\n`)
}

main().catch((e) => {
  console.error('\n실패:', e.errors?.[0]?.message || e.message)
  process.exit(1)
})
