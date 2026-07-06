const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

const SPREADSHEET_ID = '1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8';

const sheetTitle = process.argv[2];
if (!sheetTitle) {
  console.error('Usage: node scripts/dump-sheet.js "<sheet title>"');
  process.exit(1);
}

function colLetter(n) {
  let s = '';
  n += 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function main() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [sheetTitle],
    includeGridData: true,
  });

  const sheet = res.data.sheets[0];
  const merges = sheet.merges || [];
  const grid = sheet.data[0].rowData || [];

  const rows = [];
  let maxCol = 0;
  grid.forEach((row) => {
    const values = (row.values || []).map((cell) => (cell.formattedValue !== undefined ? cell.formattedValue : ''));
    while (values.length && values[values.length - 1] === '') values.pop();
    maxCol = Math.max(maxCol, values.length);
    rows.push(values);
  });

  let lastNonEmpty = rows.length - 1;
  while (lastNonEmpty >= 0 && rows[lastNonEmpty].length === 0) lastNonEmpty--;

  const out = {
    title: sheet.properties.title,
    rowCount: lastNonEmpty + 1,
    colCount: maxCol,
    merges: merges.map((m) => `${colLetter(m.startColumnIndex)}${m.startRowIndex + 1}:${colLetter(m.endColumnIndex - 1)}${m.endRowIndex}`),
    rows: rows.slice(0, lastNonEmpty + 1),
  };

  const outPath = path.join(__dirname, 'dump', `${sheetTitle.replace(/[\\/:*?"<>|]/g, '_')}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`rows=${out.rowCount} cols=${out.colCount} merges=${merges.length}`);
  console.log(`saved to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
