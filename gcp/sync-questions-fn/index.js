/**
 * 문항입력 시트 → Supabase 동기화 Cloud Function.
 *
 * scripts/sync-questions.js의 클라우드 버전. 차이점:
 *  - 인증: 로컬 OAuth(token.json) 대신 함수 실행 서비스 계정의 ADC(Application Default Credentials).
 *    → 스프레드시트를 이 서비스 계정 이메일에 "뷰어"로 공유해야 읽을 수 있다.
 *  - DB 접속 문자열은 SUPABASE_DB_URL 환경 변수로 주입 (배포 시 --env-vars-file).
 *  - HTTP 트리거: Cloud Scheduler가 OIDC 인증으로 주기 호출.
 *
 * ⚠️ scripts/sync-questions.js 와 짝이다. 한쪽만 고치지 말 것.
 *    (배포 시 이 폴더만 업로드돼서 공통 모듈로 못 뺀다)
 *
 * 응답: { ok, upserted, options, passages, sentences, skipped, warnings[] }
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
  'passage_code',            // 지문 링크용 — content 로 새어들어가면 안 된다 (0014)
]);

const PASSAGE_TAB = '지문입력';

async function readSheet(sheets, range, keyField) {
  let res;
  try {
    res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  } catch (err) {
    if (String(err.message || '').includes('Unable to parse range')) return null;  // 탭 없음
    throw err;
  }
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
    return obj;
  }).filter((r) => r[keyField]);
}

const readTab = (sheets, part) => readSheet(sheets, `문항입력_P${part}`, 'question_id');

/**
 * 지문입력 탭 → passages / passage_sentences  (0014 · 계획서 D4)
 *
 *   passage_code | lecture_code | kind | title | meta | row_kind | seq | speaker | en | ko | blank_no | audio_url
 *
 *   · 문장 한 줄 = 행 하나. 지문 단위 값(kind·title·meta)은 첫 행에만
 *   · meta     : `To=All Managers | From=Jennifer Walsh`
 *   · row_kind : 비우면 문장. `표머리`/`표행` 이면 en 을 파이프로 나눠 표가 된다
 */
async function syncPassages(client, sheets) {
  const rows = await readSheet(sheets, PASSAGE_TAB, 'passage_code');
  if (rows === null) return { tab: false, passages: 0, sentences: 0, warnings: [] };

  const warnings = [];
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.passage_code)) groups.set(r.passage_code, []);
    groups.get(r.passage_code).push(r);
  }

  let pn = 0, sn = 0;
  for (const [code, list] of groups) {
    const head = list[0];
    const meta = head.meta
      ? head.meta.split('|').map((p) => p.split('=')).filter((p) => p.length >= 2)
        .map(([k, ...v]) => ({ k: k.trim(), v: v.join('=').trim() }))
      : null;

    const tableRows = list.filter((r) => (r.row_kind || '').startsWith('표'));
    const sentRows = list.filter((r) => !(r.row_kind || '').startsWith('표') && r.en);
    let body = null;
    if (tableRows.length) {
      const cells = tableRows.map((r) => r.en.split('|').map((c) => c.trim()));
      body = { table: { headers: cells[0], rows: cells.slice(1) } };
    }

    await client.query('begin');
    try {
      const pg = await client.query(
        `insert into passages (passage_code, kind, title, meta, body)
           values ($1,$2,$3,$4,$5)
         on conflict (passage_code) do update
           set kind = excluded.kind, title = excluded.title,
               meta = excluded.meta, body = excluded.body
         returning id`,
        [code, head.kind || 'text', head.title || null,
          meta ? JSON.stringify(meta) : null, body ? JSON.stringify(body) : null],
      );
      const passageId = pg.rows[0].id;

      await client.query('delete from passage_sentences where passage_id = $1', [passageId]);
      for (let i = 0; i < sentRows.length; i += 1) {
        const r = sentRows[i];
        await client.query(
          `insert into passage_sentences (passage_id, seq, en, ko, speaker, blank_no, audio_url)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [passageId, Number(r.seq) || i + 1, r.en, r.ko || null, r.speaker || null,
            r.blank_no ? Number(r.blank_no) : null, r.audio_url || null],
        );
        sn += 1;
      }
      await client.query('commit');
      pn += 1;
    } catch (err) {
      await client.query('rollback');
      warnings.push(`PASSAGE FAIL ${code}: ${err.message}`);
    }
  }
  return { tab: true, passages: pn, sentences: sn, warnings };
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
  let psg = null;

  try {
    const lecRes = await client.query('select id, lecture_code from lectures');
    const lectureByCode = new Map(lecRes.rows.map((r) => [r.lecture_code, r.id]));
    const tagRes = await client.query('select id, part, tag_name from wrong_answer_tags');
    const tagByPartName = new Map(tagRes.rows.map((r) => [`${r.part}|${r.tag_name}`, r.id]));

    // 지문 먼저 — 문항이 passage_code 로 여기에 붙는다
    psg = await syncPassages(client, sheets);
    warnings.push(...psg.warnings);

    const passageIdByCode = new Map(
      (await client.query('select id, passage_code from passages where passage_code is not null')).rows
        .map((r) => [r.passage_code, r.id]),
    );
    const passageSeq = new Map();     // passage_id → 지금까지 붙은 문항 수 (display_order)

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

        // 지문 링크(0014). passage_code 를 안 쓴 시트는 기존 값을 유지한다 —
        // build-passages.js 가 이어둔 링크를 새벽 동기화가 지우면 안 되기 때문.
        const passageId = first.passage_code ? (passageIdByCode.get(first.passage_code) ?? null) : null;
        if (first.passage_code && passageId === null) {
          warnings.push(`WARN ${qid}: 지문입력 탭에 없는 passage_code "${first.passage_code}"`);
        }
        const seqInPassage = passageId ? (passageSeq.set(passageId, (passageSeq.get(passageId) ?? 0) + 1),
          passageSeq.get(passageId)) : null;

        await client.query('begin');
        try {
          const qRes = await client.query(
            `insert into questions (question_code, lecture_id, part, difficulty, content, passage_id, display_order)
             values ($1,$2,$3,$4,$5,$6,$7)
             on conflict (question_code) do update set
               lecture_id = excluded.lecture_id, part = excluded.part,
               difficulty = excluded.difficulty, content = excluded.content,
               passage_id    = coalesce(excluded.passage_id,    questions.passage_id),
               display_order = coalesce(excluded.display_order, questions.display_order)
             returning id`,
            [qid, lectureId, part, first.difficulty || null, JSON.stringify(content), passageId, seqInPassage]
          );
          const questionDbId = qRes.rows[0].id;

          await client.query('delete from question_options where question_id = $1', [questionDbId]);
          for (let i = 0; i < optRows.length; i++) {
            const r = optRows[i];
            const isCorrect = r.is_correct.toUpperCase() === 'TRUE';
            await client.query(
              `insert into question_options
                 (question_id, option_label, option_text, is_correct, option_error_tag_id, option_explanation, correct_evidence, notes, display_order)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
              [
                questionDbId, r.option_label, r.option_text, isCorrect,
                isCorrect ? null : tagByPartName.get(`${part}|${r.option_error_tag}`),
                r.option_explanation || null, r.correct_evidence || null, r.notes || null,
                i + 1,                                // 시트 행 순서 = 화면 표시 순서 (0014)
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

  return {
    ok: true, upserted: ok, options: optCount, skipped, warnings,
    passages: psg ? psg.passages : 0, sentences: psg ? psg.sentences : 0,
    passageTab: psg ? psg.tab : false,
  };
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
