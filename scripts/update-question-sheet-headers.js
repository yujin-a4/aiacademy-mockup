// 기존 문항입력 시트(별도 스프레드시트)의 헤더 행만 갱신한다.
// create-question-sheet.js를 다시 돌리면 새 시트가 또 생기므로, 헤더 수정은 이 스크립트를 사용.
const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

const SPREADSHEET_ID = '1VUGfsCvqvg1QNN9QTISfJWMUtPPim2Cz04KHO190fpY';

// question_text: 학생에게 보여줄 질문 문장(P7 질문, P6 빈칸 번호 안내 등) — 전 Part 공통으로 필요해 공통 컬럼으로 승격
// question_number: 화면에 표시할 문항 번호 (예: 147, 148 / P6 빈칸 1~4). 표시용이라 비워도 됨
const COMMON_COLS = ['question_id', 'lecture_code', 'difficulty', 'question_text', 'question_number'];
const PART_COLS = {
  P1: ['photo_type', 'key_elements'],
  P2: ['question_type'],
  P3: ['dialogue_open', 'dialogue_mid', 'dialogue_end'],
  P4: ['talk_open', 'talk_mid', 'talk_end'],
  P5: ['blank_sentence', 'blank_type', 'grammar_point'],
  P6: ['passage_context', 'blank_type'],
  P7: ['passage_text', 'passage_type', 'passage_structure', 'evidence_sentence'],
};
const TRAILING_COLS = [
  'option_label',
  'option_text',
  'is_correct',
  'option_error_tag',
  'option_explanation',
  'correct_evidence',
  'notes',
];

async function main() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const data = Object.keys(PART_COLS).map((p) => ({
    range: `문항입력_${p}!A1`,
    values: [[...COMMON_COLS, ...PART_COLS[p], ...TRAILING_COLS]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'RAW', data },
  });
  console.log('headers updated on all 7 tabs (option_explanation added)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
