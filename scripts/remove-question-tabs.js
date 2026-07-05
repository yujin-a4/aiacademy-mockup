const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

const SPREADSHEET_ID = '1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8';
const TAB_TITLES = ['문항입력_P1', '문항입력_P2', '문항입력_P3', '문항입력_P4', '문항입력_P5', '문항입력_P6', '문항입력_P7'];

async function main() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const existing = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const toDelete = existing.data.sheets.filter((s) => TAB_TITLES.includes(s.properties.title));

  if (toDelete.length === 0) {
    console.log('no matching tabs found, nothing to delete');
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: toDelete.map((s) => ({ deleteSheet: { sheetId: s.properties.sheetId } })),
    },
  });

  console.log(`deleted tabs: ${toDelete.map((s) => s.properties.title).join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
