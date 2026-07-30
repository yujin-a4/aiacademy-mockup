/**
 * "스캐폴딩 입력" 탭에 [문항별 반복] 열(G)을 추가한다.
 *
 * 왜: Part3·4·6·7 은 한 지문/대화에 문항이 여러 개인데, 레일은 유형 단위라 문항 수를 모른다.
 * 그래서 시트에 "이 단계는 문항마다 한 번씩" 표시만 하고, 실제 문항 수는 화면이 센다
 * (src/data/typeLearning/fromSteps.ts expandPerQuestion). 연속된 문항별 단계는 묶여서
 * Q1(S5→S6) → Q2(S5→S6) … 순으로 돈다.
 *
 * ⚠️ **기존 A~F 내용은 건드리지 않는다.** G열만 쓰고, 여러 번 돌려도 결과가 같다(idempotent).
 *    실행: node scripts/patch-scaffold-input-tab.js
 */
const { google } = require('googleapis');
const t = require('./token_sheets_rw.json');

const SPREADSHEET_ID = '1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8';
const TAB = '스캐폴딩 입력';

/** 한 아이템에 문항이 여러 개인 스캐폴딩 — 여기서만 문항별 반복이 의미 있다 */
const MULTI_Q = new Set(['SC3', 'SC4', 'SC6', 'SC7', 'SC8', 'SC9']);
/** 문항마다 도는 단계 — 근거 연결(S5)과 오답 제거(S6) */
const PER_Q_STEPS = new Set(['S5', 'S6']);

const HELP = [
  ['이 탭 쓰는 법'],
  ['· 한 줄 = 수업의 한 단계. SC코드가 같은 줄들이 순서대로 한 수업이 됩니다.'],
  ['· 단계: S1~S7 또는 "학생 풀이" (드롭다운)'],
  ['· 학생행동: 학생이 화면에서 하는 것 (드롭다운). 비우면 "AI 진행"(강사가 말만 하고 넘어감)'],
  ['· 음원: 이 단계에서 틀 음원 (드롭다운). 비우면 재생 없음.'],
  ['   쓸 수 있는 표현: 정답 선택지 재생 / 오답 선택지 재생 / 선택지 전체 재생 /'],
  ['   질문과 선택지 전체 재생 / 질문 다시 재생 / 대화·담화 전체 재생 / 선택지 A 음원만 재생한다'],
  ['   ("정답·오답"은 문항 DB의 정답 표시를 보고 화면이 알아서 그 보기를 찾습니다)'],
  ['· 문항별 반복: "예"면 이 단계를 문항마다 한 번씩 돕니다 (Part3·4·6·7).'],
  ['   연속으로 "예"인 단계들은 묶여서 Q1(S5→S6) → Q2(S5→S6) … 순으로 진행됩니다.'],
  ['· 설명: 이 단계에서 강사가 할 일. 이 문장이 AI 강사의 발화 재료가 됩니다.'],
  ['· 고친 뒤: 실험장(/rail-editor)에서 [시트에서 불러오기] → 미리보기로 확인'],
  ['· SC10, SC11… 새 스캐폴딩을 추가해도 됩니다. 오른쪽 매핑표에 파트만 적어주세요.'],
  ['· 매핑표 강의코드(J열)는 DB에 있는 코드만 적을 수 있습니다 (없는 코드면 동기화가 막힙니다).'],
  ['   비워두면 그 파트의 강의 전체에 적용됩니다. SC8·SC9는 2·3지문 강의가 생기면 그때 적어주세요.'],
];

async function main() {
  const auth = new google.auth.OAuth2(t.client_id, t.client_secret);
  auth.setCredentials({ refresh_token: t.refresh_token });
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const tab = meta.data.sheets.find((s) => s.properties.title === TAB);
  if (!tab) throw new Error(`탭 "${TAB}" 이 없다`);
  const sheetId = tab.properties.sheetId;

  /* ── 구분 열(H) ──
     단계표(A~G)와 매핑표는 성격이 다른 두 표인데 붙어 있으면 한 표로 읽힌다.
     사이에 좁은 빈 열을 끼워 눈으로 갈라 보이게 한다 → 매핑표는 I~K 로 밀린다.
     ⚠️ 이 열 위치는 `api/sandbox` 의 읽기 범위(I2:K30)와 짝이다. 옮기면 거기도 같이 옮겨야 한다. */
  const head = (await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${TAB}'!A1:K1`,
  })).data.values?.[0] ?? [];
  if (String(head[8] ?? '').trim() !== 'SC코드') {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          { insertDimension: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 },
            inheritFromBefore: false,
          } },
          { updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 },
            properties: { pixelSize: 32 }, fields: 'pixelSize',
          } },
          { repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 300, startColumnIndex: 7, endColumnIndex: 8 },
            cell: { userEnteredFormat: { backgroundColor: { red: 0.88, green: 0.89, blue: 0.91 } } },
            fields: 'userEnteredFormat.backgroundColor',
          } },
        ],
      },
    });
    console.log('구분 열(H) 삽입 — 매핑표는 I~K 로 이동');
  }

  const cur = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${TAB}'!A1:G300`,
  });
  const rows = cur.data.values ?? [];

  /* G열 값 계산 — 다문항 스캐폴딩의 S5·S6 에 "예". 사람이 이미 적어둔 값은 존중한다. */
  const gCol = [];
  const marked = [];
  for (let i = 1; i < rows.length; i++) {
    const [sc, , step] = [0, 1, 2].map((k) => String(rows[i][k] ?? '').trim());
    const existing = String(rows[i][6] ?? '').trim();
    if (existing) { gCol.push([existing]); continue; }          // 손으로 적은 값 보존
    const yes = MULTI_Q.has(sc.toUpperCase()) && PER_Q_STEPS.has(step);
    gCol.push([yes ? '예' : '']);
    if (yes) marked.push(`${i + 1}행 ${sc} ${step}`);
  }

  /* 설명에 적혀 있던 "(문항별로 S6와 묶어 진행)"은 이제 G열이 대신한다.
     이 문구는 강사가 할 일이 아니라 진행 방식이라, 남겨두면 발화 재료로 섞인다 → 뗀다. */
  const fCol = rows.slice(1).map((r) => {
    const desc = String(r[5] ?? '');
    return [desc.replace(/\(문항별로\s*S6와?\s*묶어\s*진행\)\s*/g, '').trim()];
  });

  /* 매핑표 J열(강의코드)에 안내문이 들어 있으면 뗀다 — 이제 없는 코드는 동기화가 막는다.
     안내는 도움말로 옮겼다. 실제 강의코드는 건드리지 않는다. */
  const map = (await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${TAB}'!I2:K30`,
  })).data.values ?? [];
  const jCol = map.map((r) => {
    const v = String(r[2] ?? '').trim();
    return [/^\(.*\)$/.test(v) ? '' : v];       // "(…생기면 적기)" 같은 괄호 안내문만 제거
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        ...(jCol.length ? [{ range: `'${TAB}'!K2:K${jCol.length + 1}`, values: jCol }] : []),
        { range: `'${TAB}'!G1`, values: [['문항별 반복']] },
        { range: `'${TAB}'!G2:G${gCol.length + 1}`, values: gCol },
        { range: `'${TAB}'!F2:F${fCol.length + 1}`, values: fCol },
        { range: `'${TAB}'!I13:I${12 + HELP.length}`, values: HELP },
      ],
    },
  });

  /* 드롭다운 — 문항별 반복(G)과 음원(E). 음원은 오타가 곧 무음이라 목록을 준다(strict 아님: 자유 입력 허용) */
  const validation = (col, values, strict) => ({
    setDataValidation: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 300, startColumnIndex: col, endColumnIndex: col + 1 },
      rule: {
        condition: { type: 'ONE_OF_LIST', values: values.map((v) => ({ userEnteredValue: v })) },
        showCustomUi: true, strict: !!strict,
      },
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        validation(6, ['예', ''], false),
        validation(4, [
          '정답 선택지 재생', '오답 선택지 재생', '선택지 전체 재생',
          '질문과 선택지 전체 재생', '질문 다시 재생', '대화/담화 전체 재생',
          '전체 음원을 처음부터 끝까지 재생한다', '선택지 A 음원만 재생한다', '재생 없음',
        ], false),
        { repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 6, endColumnIndex: 7 },
          cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.93, green: 0.95, blue: 1 } } },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, properties: { pixelSize: 100 }, fields: 'pixelSize' } },
      ],
    },
  });

  console.log(`G열 [문항별 반복] 추가 — "예" ${marked.length}칸`);
  marked.forEach((m) => console.log('  ' + m));
}
main().catch((e) => { console.error(e.message); process.exit(1); });
