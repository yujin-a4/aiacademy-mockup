const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

const SPREADSHEET_ID = '1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8';

const COMMON_COLS = [
  'question_id',
  'lecture_code',
  'difficulty',
];

const PART_COLS = {
  P1: ['photo_type', 'key_elements'],
  P2: ['question_type', 'question_text'],
  P3: ['dialogue_open', 'dialogue_mid', 'dialogue_end'],
  P4: ['talk_open', 'talk_mid', 'talk_end'],
  P5: ['blank_sentence', 'blank_type', 'grammar_point'],
  P6: ['passage_context', 'blank_type'],
  P7: ['passage_type', 'passage_structure', 'evidence_sentence'],
};

const TRAILING_COLS = [
  'option_label',
  'option_text',
  'is_correct',
  'option_error_tag',
  'correct_evidence',
  'notes',
];

async function main() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const existing = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingTitles = new Set(existing.data.sheets.map((s) => s.properties.title));

  const partKeys = Object.keys(PART_COLS);
  const tabsToCreate = partKeys
    .map((p) => `문항입력_${p}`)
    .filter((title) => !existingTitles.has(title));

  if (tabsToCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: tabsToCreate.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
    console.log(`created tabs: ${tabsToCreate.join(', ')}`);
  } else {
    console.log('all tabs already exist, skipping creation');
  }

  const data = partKeys.map((p) => {
    const header = [...COMMON_COLS, ...PART_COLS[p], ...TRAILING_COLS];
    return {
      range: `문항입력_${p}!A1`,
      values: [header],
    };
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data,
    },
  });

  console.log('header rows written for all 7 tabs');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
