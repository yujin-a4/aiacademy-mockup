const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

const PART_COLS = {
  P1: ['photo_type', 'key_elements'],
  P2: ['question_type', 'question_text'],
  P3: ['dialogue_open', 'dialogue_mid', 'dialogue_end'],
  P4: ['talk_open', 'talk_mid', 'talk_end'],
  P5: ['blank_sentence', 'blank_type', 'grammar_point'],
  P6: ['passage_context', 'blank_type'],
  P7: ['passage_type', 'passage_structure', 'evidence_sentence'],
};

const COMMON_COLS = ['question_id', 'lecture_code', 'difficulty'];
const TRAILING_COLS = [
  'option_label',
  'option_text',
  'is_correct',
  'option_error_tag',
  'option_explanation', // 보기별 오답 이유 (오답 행), 시트 설계의 "보기별 오답 이유" 필드
  'correct_evidence',   // 정답 근거 (정답 행)
  'notes',
];

async function main() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const partKeys = Object.keys(PART_COLS);
  const sheetTitles = partKeys.map((p) => `문항입력_${p}`);

  const create = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'AI어학원 문항 입력' },
      sheets: sheetTitles.map((title) => ({ properties: { title } })),
    },
  });

  const spreadsheetId = create.data.spreadsheetId;

  const data = partKeys.map((p) => {
    const header = [...COMMON_COLS, ...PART_COLS[p], ...TRAILING_COLS];
    return {
      range: `문항입력_${p}!A1`,
      values: [header],
    };
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data,
    },
  });

  console.log(`created spreadsheet: ${spreadsheetId}`);
  console.log(`url: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
