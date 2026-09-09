/**
 * FGI 설문 응답 시트에 **'강사별 보기' 탭**을 만든다(있으면 다시 만든다).
 *
 * 왜 시트인가
 *   볼 때마다 스크립트를 돌리게 하면 FGI 진행 중에 쓸 수가 없다. 수식으로 만들어 두면
 *   응답이 들어오는 대로 저절로 갱신되니 시트만 열어두면 된다.
 *
 * ⚠️ 형식이 두 가지 섞여 있다 — 이 파일의 존재 이유가 사실상 이것이다
 *   설문을 도중에 '순서(①/②) 기준' 에서 '강사 이름 기준' 으로 바꿨다. 그래서 응답 시트 한 장에
 *   두 형식이 섞인다.
 *
 *     구형(바꾸기 전) : A 구역 = 먼저 들은 강의, B 구역 = 나중에 들은 강의.
 *                       누가 누구였는지는 '첫/두 번째로 들은 강의의 강사' 두 칸에만 적혀 있다.
 *     신형(바꾼 뒤)   : A 구역 = 이도윤, B 구역 = 윤다은 으로 고정.
 *
 *   **바꾼 시각(B7)을 경계로** 구형은 두 칸을 열쇠 삼아 되돌리고, 신형은 그대로 읽는다.
 *   그래서 이미 받아 둔 응답을 지우지 않고도 한 표에서 같이 볼 수 있다.
 *
 * 쓰는 법
 *   node scripts/fgi-survey-sheet-view.js              # 아직 폼을 안 바꿨다 (전부 구형으로 읽는다)
 *   node scripts/fgi-survey-sheet-view.js --now        # 지금 막 폼을 바꿨다 → 이 시각을 경계로
 *   node scripts/fgi-survey-sheet-view.js --cutoff "2026-09-09 14:30"
 *
 *   경계 시각은 만들어진 탭의 **B7 칸을 직접 고쳐도 된다** — 표 전체가 따라 바뀐다.
 *   강사 이름을 바꾸려면 B9·C9 두 칸만 고치면 된다.
 */
const { google, getAuthClient } = require('C:/Users/YBM/.google-scripts/auth.cjs')

const FORM_ID = process.env.FGI_FORM_ID || '1YiugsTHqywZh59nukC-RqeDKrYekXGbDcbzPETld3XU'
const TAB = '강사별 보기'

/** 경계 시각 — 기본값은 먼 미래다. 즉 "아직 안 바꿨다 = 전부 구형" 이 안전한 기본값이다 */
const cutArg = process.argv.indexOf('--cutoff')
const CUTOFF = process.argv.includes('--now') ? new Date()
  : cutArg > -1 ? new Date(process.argv[cutArg + 1])
  : new Date('2099-01-01T00:00:00')

/** 응답 시트의 열 배치. 폼 문항을 더하거나 지우면 여기도 같이 고쳐야 한다 */
const COL = {
  ts: 'A', first: 'B', second: 'C',
  a1: 'E', a2: 'F', a3: 'G', a4: 'H', a5: 'I',   // A 구역
  b1: 'J', b2: 'K', b3: 'L', b4: 'M', b5: 'N',   // B 구역
  c1: 'O', c2: 'P', c3: 'Q', c4: 'R',
  c5a: 'S', c5b: 'T', c6: 'U', c7: 'V',
  d1: 'W', d2: 'X', d3: 'Y', d4: 'Z', d5: 'AA',
  d6a: 'AB', d6b: 'AC', d7: 'AD',
}

const SRC = "'설문지 응답 시트1'"
const R = (c) => `${SRC}!$${c}$2:$${c}`
const RB = (c) => `${SRC}!$${c}$2:$${c}$500`   // SUMPRODUCT 는 열린 범위를 못 쓴다
const CUT = '$B$7'
const A = '$B$9', B = '$C$9'                   // 강사 이름이 든 칸

/**
 * 한 문항의 값을 강사별로 모아 한 칸에 늘어놓는다.
 * 구형 두 갈래(A구역이 이 강사였던 응답 / B구역이 이 강사였던 응답) + 신형 한 갈래를 잇는다.
 */
const join = (aCol, bCol, who, isA) => `=TEXTJOIN("  |  ", TRUE, ` + [
  `IFERROR(FILTER(${R(aCol)}, ${R(COL.ts)}<${CUT}, ${R(COL.first)}=${who}), "")`,
  `IFERROR(FILTER(${R(bCol)}, ${R(COL.ts)}<${CUT}, ${R(COL.second)}=${who}), "")`,
  `IFERROR(FILTER(${R(isA ? aCol : bCol)}, ${R(COL.ts)}>=${CUT}), "")`,
].join(', ') + ')'

/** 앞 한 글자가 숫자인 척도의 평균. "4" 도 "4 괜찮았다" 도 같은 식으로 읽힌다 */
const avg = (aCol, bCol, who, isA) => {
  const val = (c) => `IFERROR(VALUE(LEFT(${RB(c)},1)),0)`
  const nCol = isA ? aCol : bCol
  const sum = [
    `SUMPRODUCT((${RB(COL.ts)}<${CUT})*(${RB(COL.first)}=${who})*${val(aCol)})`,
    `SUMPRODUCT((${RB(COL.ts)}<${CUT})*(${RB(COL.second)}=${who})*${val(bCol)})`,
    `SUMPRODUCT((${RB(COL.ts)}>=${CUT})*${val(nCol)})`,
  ].join('+')
  const cnt = [
    `SUMPRODUCT((${RB(COL.ts)}<${CUT})*(${RB(COL.first)}=${who})*(${RB(aCol)}<>""))`,
    `SUMPRODUCT((${RB(COL.ts)}<${CUT})*(${RB(COL.second)}=${who})*(${RB(bCol)}<>""))`,
    `SUMPRODUCT((${RB(COL.ts)}>=${CUT})*(${RB(nCol)}<>""))`,
  ].join('+')
  return `=IFERROR(ROUND((${sum})/(${cnt}),2),"—")`
}

/** ①/② 로 고르던 비교 문항. 신형은 강사 이름을 그대로 고르므로 세 갈래를 더한다 */
const tally = (col, who) => `=COUNTIFS(${R(col)},"①*",${R(COL.first)},${who},${R(COL.ts)},"<"&${CUT})` +
  `+COUNTIFS(${R(col)},"②*",${R(COL.second)},${who},${R(COL.ts)},"<"&${CUT})` +
  `+COUNTIFS(${R(col)},${who},${R(COL.ts)},">="&${CUT})`
const tallyOther = (col) => `=COUNTA(${R(col)})-` +
  `(COUNTIFS(${R(col)},"①*",${R(COL.ts)},"<"&${CUT})+COUNTIFS(${R(col)},"②*",${R(COL.ts)},"<"&${CUT})` +
  `+COUNTIFS(${R(col)},${A},${R(COL.ts)},">="&${CUT})+COUNTIFS(${R(col)},${B},${R(COL.ts)},">="&${CUT}))`

/** 순서·강사와 상관없는 문항 — 그냥 전부 늘어놓는다 */
const all = (col) => `=TEXTJOIN("   //   ", TRUE, ${R(col)})`

const pair = (label, aCol, bCol) => [label, join(aCol, bCol, A, true), join(aCol, bCol, B, false)]
const pairAvg = (label, aCol, bCol) => [label, avg(aCol, bCol, A, true), avg(aCol, bCol, B, false)]

const rows = [
  ['FGI 설문 · 강사별 보기'],
  ['순서(①/②)로 받은 답과 강사 이름으로 받은 답을 한 표로 합친 것입니다. 응답이 들어오면 저절로 갱신됩니다. 원본 「설문지 응답 시트1」은 그대로 두고 읽기만 합니다.'],
  ['응답 수', `=COUNTA(${R(COL.ts)})`],
  ['   ├ ①/② 기준으로 받은 응답 (구형)', `=COUNTIFS(${R(COL.ts)},"<"&${CUT},${R(COL.ts)},">0")`],
  ['   └ 강사 이름 기준으로 받은 응답 (신형)', `=COUNTIFS(${R(COL.ts)},">="&${CUT})`],
  ['⚠️ 강사 칸이 비어 못 쓰는 구형 응답', `=COUNTIFS(${R(COL.ts)},"<"&${CUT},${R(COL.ts)},">0")-COUNTIFS(${R(COL.ts)},"<"&${CUT},${R(COL.first)},"<>",${R(COL.second)},"<>")`],
  ['폼을 강사 기준으로 바꾼 시각  ← 이 칸을 고치면 표 전체가 따라 바뀝니다', CUTOFF],
  [],
  ['【 강의별 문항 】  A·B 구역을 강사로 되돌린 것', '이도윤', '윤다은'],
  pair('이미 알던 내용이었나  (A-1/B-1)', COL.a1, COL.b1),
  pair('답까지 오래 걸렸나 1~5  (A-2/B-2)', COL.a2, COL.b2),
  pairAvg('      └ 평균 · 낮을수록 빠름', COL.a2, COL.b2),
  pair('단계적으로 묻는 방식 1~5  (A-3/B-3)', COL.a3, COL.b3),
  pairAvg('      └ 평균 · 높을수록 좋음', COL.a3, COL.b3),
  pair('어색했던 순간  (A-5/B-5)', COL.a5, COL.b5),
  pair('넘기고 싶었던 부분  (A-4/B-4)', COL.a4, COL.b4),
  [],
  ['【 비교 문항 】  둘 중 어느 쪽을 골랐나 — 여기가 제일 읽을 만하다', '=$B$9', '=$C$9', '그 외'],
  ['질문을 더 많이 던진 쪽  (C-1)', tally(COL.c1, A), tally(COL.c1, B), tallyOther(COL.c1)],
  ['더 답답했던 쪽  (C-2)', tally(COL.c2, A), tally(COL.c2, B), tallyOther(COL.c2)],
  ['스타일이 더 맞은 쪽  (C-3)', tally(COL.c3, A), tally(COL.c3, B), tallyOther(COL.c3)],
  [],
  ['【 강사별로 나뉜 표 문항 】', '=$B$9', '=$C$9'],
  pair('목소리가 거슬렸나 1~5  (C-5)', COL.c5a, COL.c5b),
  pairAvg('      └ 평균 · 낮을수록 안 거슬림', COL.c5a, COL.c5b),
  pair('질문의 성격  (D-6)', COL.d6a, COL.d6b),
  pair('혼자서는 못 했을 일을 해내게 한 대목  (D-2/D-3)', COL.d2, COL.d3),
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

  /* 있으면 지우고 새로 만든다 — 행 수가 달라지면 덮어쓰기만으로는 찌꺼기가 남는다 */
  const reqs = []
  if (existing) reqs.push({ deleteSheet: { sheetId: existing.properties.sheetId } })
  reqs.push({ addSheet: { properties: { title: TAB, index: 1, gridProperties: { rowCount: rows.length + 4, columnCount: 5 } } } })
  const { data: made } = await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests: reqs } })
  const sheetId = made.replies.at(-1).addSheet.properties.sheetId

  const toCell = (v) => (v instanceof Date ? v.toLocaleString('sv-SE').replace('T', ' ') : v)
  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: `'${TAB}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows.map((r) => (r.length ? r.map(toCell) : [''])) },
  })

  const bold = rows.map((r, i) => [r, i]).filter(([r]) => (r[0] ?? '').startsWith('【') || (r[0] ?? '').startsWith('FGI'))
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    requestBody: {
      requests: [
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 340 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 4 }, properties: { pixelSize: 300 }, fields: 'pixelSize' } },
        { repeatCell: { range: { sheetId }, cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } }, fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)' } },
        ...bold.map(([, i]) => ({
          repeatCell: {
            range: { sheetId, startRowIndex: i, endRowIndex: i + 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.94, green: 0.94, blue: 0.96 } } },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        })),
        /* 경계 시각 줄은 눈에 띄게 — 여기가 틀리면 표 전체가 조용히 틀린다 */
        { repeatCell: { range: { sheetId, startRowIndex: 6, endRowIndex: 7 }, cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 0.96, blue: 0.8 } } }, fields: 'userEnteredFormat.backgroundColor' } },
        { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenColumnCount: 1 } }, fields: 'gridProperties.frozenColumnCount' } },
      ],
    },
  })

  console.log(`\n✅ '${TAB}' 탭을 다시 만들었다`)
  console.log(`   경계 시각: ${CUTOFF.getFullYear() > 2090 ? '먼 미래 — 모든 응답을 ①/② 기준(구형)으로 읽는다' : CUTOFF.toLocaleString('ko-KR')}`)
  console.log(`   https://docs.google.com/spreadsheets/d/${ssId}/edit#gid=${sheetId}\n`)
}

main().catch((e) => {
  console.error('\n실패:', e.errors?.[0]?.message || e.message)
  process.exit(1)
})
