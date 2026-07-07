const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

const SPREADSHEET_ID = '1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8';

async function main() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  for (const sheet of res.data.sheets) {
    const p = sheet.properties;
    console.log(`gid=${p.sheetId}\ttitle=${p.title}\trows=${p.gridProperties?.rowCount}\tcols=${p.gridProperties?.columnCount}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
