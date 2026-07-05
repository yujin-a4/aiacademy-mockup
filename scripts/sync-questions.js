// 문항입력 시트(7개 탭) → Supabase questions/question_options 동기화.
//
// 동작:
//   1. 각 탭의 전체 행을 읽어 헤더 기준으로 파싱
//   2. question_id로 그룹핑 → 검증 (강의코드 존재, 오답태그 매칭, 정답 정확히 1개)
//   3. questions upsert (question_code 기준) + 해당 문항의 선택지는 삭제 후 재삽입 (idempotent)
//   4. 검증 실패 문항은 건너뛰고 사유 출력
//
// 나중에 이 스크립트를 GCP Cloud Function + Cloud Scheduler로 옮기면 주기적 자동 동기화가 된다.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { google } = require('googleapis');
const { Client } = require('pg');
const { getAuthClient } = require('./google-auth');

const SPREADSHEET_ID = '1VUGfsCvqvg1QNN9QTISfJWMUtPPim2Cz04KHO190fpY';

// 공통 컬럼을 제외한 나머지가 Part 전용 필드 → questions.content(JSONB)로 들어간다
const COMMON = new Set([
  'question_id', 'lecture_code', 'difficulty', 'question_text',
  'option_label', 'option_text', 'is_correct', 'option_error_tag',
  'option_explanation', 'correct_evidence', 'notes',
]);

async function readTab(sheets, part) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `문항입력_P${part}`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
    return obj;
  }).filter((r) => r.question_id);
}

async function main() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 마스터 로드 (검증용)
  const lecRes = await client.query('select id, lecture_code from lectures');
  const lectureByCode = new Map(lecRes.rows.map((r) => [r.lecture_code, r.id]));
  const tagRes = await client.query('select id, part, tag_name from wrong_answer_tags');
  const tagByPartName = new Map(tagRes.rows.map((r) => [`${r.part}|${r.tag_name}`, r.id]));

  let ok = 0, skipped = 0, optCount = 0;

  for (let part = 1; part <= 7; part++) {
    const rows = await readTab(sheets, part);
    if (rows.length === 0) continue;

    // question_id 기준 그룹핑
    const groups = new Map();
    for (const row of rows) {
      if (!groups.has(row.question_id)) groups.set(row.question_id, []);
      groups.get(row.question_id).push(row);
    }

    for (const [qid, optRows] of groups) {
      const first = optRows[0];
      const problems = [];

      const lectureId = lectureByCode.get(first.lecture_code);
      if (!lectureId) problems.push(`강의코드 없음: "${first.lecture_code}"`);

      const correctRows = optRows.filter((r) => r.is_correct.toUpperCase() === 'TRUE');
      if (correctRows.length !== 1) problems.push(`정답이 ${correctRows.length}개 (정확히 1개여야 함)`);

      for (const r of optRows) {
        const isCorrect = r.is_correct.toUpperCase() === 'TRUE';
        if (!isCorrect && r.option_error_tag && !tagByPartName.has(`${part}|${r.option_error_tag}`)) {
          problems.push(`P${part}에 없는 오답태그: "${r.option_error_tag}" (${r.option_label})`);
        }
        if (!isCorrect && !r.option_error_tag) {
          problems.push(`오답 ${r.option_label}에 태그 없음`);
        }
      }

      if (problems.length > 0) {
        console.warn(`SKIP ${qid}: ${problems.join(' / ')}`);
        skipped++;
        continue;
      }

      // Part 전용 필드 → content JSONB
      const content = {};
      if (first.question_text) content.question_text = first.question_text;
      for (const [k, v] of Object.entries(first)) {
        if (!COMMON.has(k) && v !== '') content[k] = v;
      }

      await client.query('begin');
      try {
        const qRes = await client.query(
          `insert into questions (question_code, lecture_id, part, difficulty, content)
           values ($1,$2,$3,$4,$5)
           on conflict (question_code) do update set
             lecture_id = excluded.lecture_id, part = excluded.part,
             difficulty = excluded.difficulty, content = excluded.content
           returning id`,
          [qid, lectureId, part, first.difficulty || null, JSON.stringify(content)]
        );
        const questionDbId = qRes.rows[0].id;

        await client.query('delete from question_options where question_id = $1', [questionDbId]);
        for (const r of optRows) {
          const isCorrect = r.is_correct.toUpperCase() === 'TRUE';
          await client.query(
            `insert into question_options
               (question_id, option_label, option_text, is_correct, option_error_tag_id, option_explanation, correct_evidence, notes)
             values ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              questionDbId, r.option_label, r.option_text, isCorrect,
              isCorrect ? null : tagByPartName.get(`${part}|${r.option_error_tag}`),
              r.option_explanation || null, r.correct_evidence || null, r.notes || null,
            ]
          );
          optCount++;
        }
        await client.query('commit');
        ok++;
      } catch (err) {
        await client.query('rollback');
        console.error(`FAIL ${qid}:`, err.message);
        skipped++;
      }
    }
  }

  console.log(`\nsync done — questions upserted: ${ok}, options: ${optCount}, skipped: ${skipped}`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
