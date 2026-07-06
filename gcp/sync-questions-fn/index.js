/**
 * 문항입력 시트 → Supabase 동기화 Cloud Function.
 *
 * scripts/sync-questions.js의 클라우드 버전. 차이점:
 *  - 인증: 로컬 OAuth(token.json) 대신 함수 실행 서비스 계정의 ADC(Application Default Credentials).
 *    → 스프레드시트를 이 서비스 계정 이메일에 "뷰어"로 공유해야 읽을 수 있다.
 *  - DB 접속 문자열은 SUPABASE_DB_URL 환경 변수로 주입 (배포 시 --env-vars-file).
 *  - HTTP 트리거: Cloud Scheduler가 OIDC 인증으로 주기 호출.
 *
 * 응답: { ok, upserted, options, skipped, warnings[] }
 */
const functions = require('@google-cloud/functions-framework');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const { Client } = require('pg');

const SPREADSHEET_ID = process.env.QUESTION_SPREADSHEET_ID || '1VUGfsCvqvg1QNN9QTISfJWMUtPPim2Cz04KHO190fpY';

// 공통 컬럼을 제외한 나머지가 Part 전용 필드 → questions.content(JSONB)
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

async function runSync() {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const warnings = [];
  let ok = 0, skipped = 0, optCount = 0;

  try {
    const lecRes = await client.query('select id, lecture_code from lectures');
    const lectureByCode = new Map(lecRes.rows.map((r) => [r.lecture_code, r.id]));
    const tagRes = await client.query('select id, part, tag_name from wrong_answer_tags');
    const tagByPartName = new Map(tagRes.rows.map((r) => [`${r.part}|${r.tag_name}`, r.id]));

    for (let part = 1; part <= 7; part++) {
      const rows = await readTab(sheets, part);
      if (rows.length === 0) continue;

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
        if (correctRows.length !== 1) problems.push(`정답이 ${correctRows.length}개`);

        for (const r of optRows) {
          const isCorrect = r.is_correct.toUpperCase() === 'TRUE';
          if (!isCorrect && r.option_error_tag && !tagByPartName.has(`${part}|${r.option_error_tag}`)) {
            problems.push(`P${part}에 없는 오답태그: "${r.option_error_tag}" (${r.option_label})`);
          }
          if (!isCorrect && !r.option_error_tag) problems.push(`오답 ${r.option_label}에 태그 없음`);
        }

        if (problems.length > 0) {
          warnings.push(`SKIP ${qid}: ${problems.join(' / ')}`);
          skipped++;
          continue;
        }

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
          warnings.push(`FAIL ${qid}: ${err.message}`);
          skipped++;
        }
      }
    }
  } finally {
    await client.end();
  }

  return { ok: true, upserted: ok, options: optCount, skipped, warnings };
}

functions.http('syncQuestions', async (req, res) => {
  try {
    const result = await runSync();
    console.log(JSON.stringify(result));
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});
