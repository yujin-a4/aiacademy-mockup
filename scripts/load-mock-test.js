/**
 * 실전 모의고사 한 회차 → DB 적재 (supabase/migrations/0028_mock_tests.sql)
 *
 * 입력 (전부 scripts/dump/ — extract_mock_all.py 가 만든다)
 *   mock_lc{권}_t{회차}.json   Part 1·2·3·4
 *   mock_rc{권}_t{회차}.json   Part 6·7
 *   rc_p5_bank{권}.json        Part 5 (회차 전체가 한 파일)
 *   audio_lc{권}_t{회차}.json  문항번호 → mp3 웹 경로 (map_mock_audio.py --emit)
 *
 * 넣는 것
 *   mock_tests                 회차 2개 (LC/RC)
 *   passages/passage_sentences LC Part 3·4 스크립트 · RC Part 6·7 지문
 *   questions/question_options 200문항
 *
 * ⚠️ 정답은 **정답 키 표**에서 온다(extract_answer_keys.py). 해설이 말하는 정답과 어긋나는
 *    문항이 실제로 있었고, 교재 정답표를 직접 대조해 표가 맞는 것을 확인했다.
 *    여기서는 추출기가 이미 정한 answer 를 그대로 믿는다 — 재판정하지 않는다.
 *
 * ⚠️ 크론(gcp/sync-questions-fn)과 겹치지 않는다. 문항 코드가 'YBM-' 로 시작해
 *    시트 코드('LC-P1-01-Q001')와 네임스페이스가 다르다. 크론은 삭제를 하지 않는다.
 *
 * 사용
 *   node scripts/load-mock-test.js                 # dry run (DB 접속 없이 검증만)
 *   node scripts/load-mock-test.js --go            # 실제 적재
 *   node scripts/load-mock-test.js --vol 1 --test 1 --go
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');

const GO = process.argv.includes('--go');
const argOf = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};
const VOL = argOf('--vol', 1);
const TEST = argOf('--test', 1);

const DUMP = path.join(__dirname, 'dump');
const pad2 = (n) => String(n).padStart(2, '0');
const pad3 = (n) => String(n).padStart(3, '0');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));

/* ── 코드 규칙 ──
   YBM-LC1-T01-Q007   문항  (교재 번호를 그대로 쓴다 — 화면이 시험지 번호를 보여준다)
   YBM-LC1-T01-PSG032 지문  (그 지문이 딸린 첫 문항 번호로 이름 짓는다)
   이중·삼중 지문은 뒤에 -1/-2/-3 을 붙이고 set_code 로 묶는다 (0027 의 규칙 그대로). */
const testCode = (area) => `YBM-${area}${VOL}-T${pad2(TEST)}`;
const qCode = (area, no) => `${testCode(area)}-Q${pad3(no)}`;
const pCode = (area, no) => `${testCode(area)}-PSG${pad3(no)}`;

/** 보기 배열 → DB 행. 정답 근거(해설)는 정답 보기에만 붙인다. */
function options(opts, explain) {
  return opts.map((o, i) => ({
    option_label: o.label,
    option_text: o.text,
    is_correct: !!(o.is_correct || o.correct),
    correct_evidence: (o.is_correct || o.correct) ? (explain || o.why || null) : null,
    notes: o.why || null,
    display_order: i + 1,
  }));
}

/** 스크립트/지문 문장 → passage_sentences 행 */
function sentences(list, audioUrl) {
  return list.map((s, i) => ({
    seq: i + 1,
    en: typeof s === 'string' ? s : s.en,
    ko: (typeof s === 'object' && s.ko) || null,
    speaker: (typeof s === 'object' && s.speaker) || null,
    blank_no: (typeof s === 'object' && s.blank_no) || null,
    audio_url: audioUrl || null,
  }));
}

/* ══════════════════════════════════════════════════════════
   LC — Part 1·2 는 문항 하나가 곧 한 판, Part 3·4 는 세트가 한 판
   ══════════════════════════════════════════════════════════ */
function buildLc(audio) {
  const d = readJson(path.join(DUMP, `mock_lc${VOL}_t${pad2(TEST)}.json`));
  const area = 'LC';
  const questions = [];
  const passages = [];

  for (const q of d.part1 || []) {
    questions.push({
      question_code: qCode(area, q.no), part: 1, question_no: q.no,
      content: {
        photo_type: q.photo_type || null,
        // 사진은 본권에서 뽑는다 (scripts/extract_part1_photos.py)
        image_url: `/mock/lc${VOL}-t${pad2(TEST)}/YBM_LC${VOL}_T${pad2(TEST)}_Q${pad3(q.no)}.jpeg`,
        audio_url: audio[q.no] || null,
        question_text: '사진을 가장 잘 묘사한 보기를 고르시오.',
      },
      options: options(q.options, null),
    });
  }

  for (const q of d.part2 || []) {
    questions.push({
      question_code: qCode(area, q.no), part: 2, question_no: q.no,
      content: { question_type: q.qtype || null, question_text: q.question,
                 audio_url: audio[q.no] || null },
      options: options(q.options, null),
    });
  }

  for (const [key, part, kind] of [['part3', 3, 'dialogue'], ['part4', 4, 'talk']]) {
    for (const s of d[key] || []) {
      const first = s.questions[0].no;
      // 세트 mp3 하나가 문항 3개를 덮는다 — 지문에 붙인다(0028: passages.audio_url)
      const setAudio = audio[first] || null;
      passages.push({
        passage_code: pCode(area, first), kind, title: s.label || null,
        meta: null, body: null, set_code: null, set_seq: 1,
        audio_url: setAudio,
        sentences: sentences(s.script, setAudio),
      });
      for (const q of s.questions) {
        questions.push({
          question_code: qCode(area, q.no), part, question_no: q.no,
          passage_code: pCode(area, first),
          content: { question_text: q.question, audio_url: setAudio },
          options: options(q.options, q.explain),
        });
      }
    }
  }
  return { area, questions, passages };
}

/* ══════════════════════════════════════════════════════════
   RC — Part 5 는 문장 하나, Part 6·7 은 지문(세트)
   ══════════════════════════════════════════════════════════ */
function buildRc() {
  const area = 'RC';
  const questions = [];
  const passages = [];

  const bankPath = path.join(DUMP, `rc_p5_bank${VOL === 1 ? '' : VOL}.json`);
  for (const q of readJson(bankPath)) {
    if (q.test !== TEST || (q.vol || 1) !== VOL) continue;
    const opts = ['A', 'B', 'C', 'D'].map((L) => ({
      label: L, text: q.opts[L], is_correct: L === q.answer,
    }));
    questions.push({
      question_code: qCode(area, q.num), part: 5, question_no: q.num,
      content: { sentence: (q.sentence || '').replace(/\s*\n\s*/g, ' ').trim(),
                 grammar_point: q.label || null },
      options: options(opts, q.explanation),
    });
  }

  for (const s of readJson(path.join(DUMP, `mock_rc${VOL}_t${pad2(TEST)}.json`))) {
    const first = s.questions[0].no;
    const multi = s.passages.length > 1;
    s.passages.forEach((p, i) => {
      passages.push({
        passage_code: multi ? `${pCode(area, first)}-${i + 1}` : pCode(area, first),
        kind: p.kind || 'text', title: p.title || null,
        meta: p.meta || null,
        body: p.chat ? { chat: p.chat } : null,
        // 이중·삼중 지문은 set_code 로 묶고, 문항은 첫 지문을 가리킨다 (0027)
        set_code: multi ? `${pCode(area, first)}-SET` : null,
        set_seq: i + 1,
        audio_url: null,
        sentences: sentences(p.sentences || [], null),
      });
    });
    for (const q of s.questions) {
      questions.push({
        question_code: qCode(area, q.no), part: q.no <= 146 ? 6 : 7, question_no: q.no,
        passage_code: multi ? `${pCode(area, first)}-1` : pCode(area, first),
        content: { question_text: q.q || null, question_type: q.qtype || null },
        options: options(q.options, q.explain),
      });
    }
  }
  return { area, questions, passages };
}

/* ── 검증 — 넣기 전에 회차가 완결인지 본다 ──
   모의고사는 한 문항만 비어도 시험이 아니다. dry run 에서 여기 걸리면 적재를 하지 않는다. */
function verify(built) {
  const { area, questions } = built;
  const want = area === 'LC' ? [1, 100] : [101, 200];
  const nos = new Set(questions.map((q) => q.question_no));
  const problems = [];
  const miss = [];
  for (let n = want[0]; n <= want[1]; n++) if (!nos.has(n)) miss.push(n);
  if (miss.length) problems.push(`결손 ${miss.length}개: ${miss.slice(0, 20).join(',')}`);
  if (nos.size !== questions.length) problems.push('문항 번호 중복');

  for (const q of questions) {
    const nOpt = q.part === 2 ? 3 : 4;
    if (q.options.length !== nOpt) problems.push(`${q.question_code}: 보기 ${q.options.length}개 (${nOpt} 기대)`);
    const nCorrect = q.options.filter((o) => o.is_correct).length;
    if (nCorrect !== 1) problems.push(`${q.question_code}: 정답 ${nCorrect}개`);
  }
  if (area === 'LC') {
    const noAudio = questions.filter((q) => !q.content.audio_url).map((q) => q.question_no);
    if (noAudio.length) problems.push(`음원 없음 ${noAudio.length}개: ${noAudio.slice(0, 10).join(',')}`);
  }
  return problems;
}

/* ══════════════════════════════════════════════════════════
   REST 적재 (PostgREST + service_role 키)
   ══════════════════════════════════════════════════════════
   왜 이 경로가 있나
     이 레포의 다른 로더는 SUPABASE_DB_URL(포스트그레스 직결)을 쓴다. 그런데 그 값은
     DB 비밀번호를 품고 있어 .env.local 에 없을 때가 많다. 반면 SUPABASE_SERVICE_ROLE_KEY 는
     이미 있고, **행을 넣는 데는 그걸로 충분하다**(RLS 를 우회한다).
     → DB URL 이 있으면 그쪽(트랜잭션), 없으면 이쪽으로 돈다.

   ⚠️ 한계: REST 는 요청 단위라 **여러 표에 걸친 트랜잭션이 없다.** 중간에 실패하면 일부만 들어간다.
      그래서 전부 upsert(코드 기준)로 짜서 **다시 돌리면 같은 상태가 되게** 했다.
      테이블을 만드는 일(DDL)은 REST 로 안 된다 — 마이그레이션은 SQL 편집기나 DB URL 이 필요하다. */
function restClient() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  const headers = {
    apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
  };
  async function call(method, pathAndQuery, body, prefer) {
    const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
      method, headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${pathAndQuery} → ${res.status} ${text.slice(0, 400)}`);
    return text ? JSON.parse(text) : null;
  }
  return {
    /** 배열을 한 번에 upsert 하고 대표행을 돌려준다 (왕복 1회) */
    upsert: (table, rows, conflictCol) =>
      call('POST', `${table}?on_conflict=${conflictCol}`, rows,
           'resolution=merge-duplicates,return=representation'),
    del: (table, col, values) =>
      call('DELETE', `${table}?${col}=in.(${values.join(',')})`, undefined, 'return=minimal'),
    insert: (table, rows) => call('POST', table, rows, 'return=minimal'),
  };
}

/** 큰 배열을 나눠 보낸다. 한 번에 다 보내면 요청이 너무 커진다(보기 800행 등). */
async function inChunks(rows, size, fn) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function loadRest(rest, built, meta) {
  const { area, questions, passages } = built;

  const [mt] = await rest.upsert('mock_tests', [{
    test_code: testCode(area), source: meta.source, book: VOL, area, test_no: TEST,
    title: meta.title, no_from: area === 'LC' ? 1 : 101, no_to: area === 'LC' ? 100 : 200,
  }], 'test_code');

  const pid = {};
  if (passages.length) {
    const rows = await rest.upsert('passages', passages.map((p) => ({
      passage_code: p.passage_code, kind: p.kind, title: p.title, meta: p.meta,
      body: p.body, set_code: p.set_code, set_seq: p.set_seq, audio_url: p.audio_url,
    })), 'passage_code');
    for (const r of rows) pid[r.passage_code] = r.id;

    const ids = passages.map((p) => pid[p.passage_code]);
    await inChunks(ids, 100, (c) => rest.del('passage_sentences', 'passage_id', c));
    const sents = passages.flatMap((p) =>
      p.sentences.map((s) => ({ ...s, passage_id: pid[p.passage_code] })));
    await inChunks(sents, 300, (c) => rest.insert('passage_sentences', c));
  }

  const qrows = await rest.upsert('questions', questions.map((q) => ({
    question_code: q.question_code, lecture_id: null, mock_test_id: mt.id,
    question_no: q.question_no, part: q.part, content: q.content,
    passage_id: q.passage_code ? pid[q.passage_code] : null, display_order: q.question_no,
  })), 'question_code');
  const qid = {};
  for (const r of qrows) qid[r.question_code] = r.id;

  const allIds = questions.map((q) => qid[q.question_code]);
  await inChunks(allIds, 100, (c) => rest.del('question_options', 'question_id', c));
  const opts = questions.flatMap((q) =>
    q.options.map((o) => ({ ...o, question_id: qid[q.question_code] })));
  await inChunks(opts, 300, (c) => rest.insert('question_options', c));

  return { mockTestId: mt.id, questions: questions.length, passages: passages.length,
           options: opts.length };
}

async function load(client, built, meta) {
  const { area, questions, passages } = built;

  const { rows: [mt] } = await client.query(
    `insert into mock_tests (test_code, source, book, area, test_no, title, no_from, no_to)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (test_code) do update set title = excluded.title
     returning id`,
    [testCode(area), meta.source, VOL, area, TEST, meta.title, ...(area === 'LC' ? [1, 100] : [101, 200])]);

  const pid = {};
  for (const p of passages) {
    const { rows: [row] } = await client.query(
      `insert into passages (passage_code, kind, title, meta, body, set_code, set_seq, audio_url)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (passage_code) do update set
         kind = excluded.kind, title = excluded.title, meta = excluded.meta,
         body = excluded.body, set_code = excluded.set_code, set_seq = excluded.set_seq,
         audio_url = excluded.audio_url
       returning id`,
      [p.passage_code, p.kind, p.title, p.meta ? JSON.stringify(p.meta) : null,
       p.body ? JSON.stringify(p.body) : null, p.set_code, p.set_seq, p.audio_url]);
    pid[p.passage_code] = row.id;
    await client.query('delete from passage_sentences where passage_id = $1', [row.id]);
    for (const s of p.sentences) {
      await client.query(
        `insert into passage_sentences (passage_id, seq, en, ko, speaker, blank_no, audio_url)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [row.id, s.seq, s.en, s.ko, s.speaker, s.blank_no, s.audio_url]);
    }
  }

  for (const q of questions) {
    const { rows: [row] } = await client.query(
      `insert into questions (question_code, lecture_id, mock_test_id, question_no, part,
                              content, passage_id, display_order)
       values ($1, null, $2, $3, $4, $5, $6, $7)
       on conflict (question_code) do update set
         mock_test_id = excluded.mock_test_id, question_no = excluded.question_no,
         part = excluded.part, content = excluded.content,
         passage_id = excluded.passage_id, display_order = excluded.display_order
       returning id`,
      [q.question_code, mt.id, q.question_no, q.part, JSON.stringify(q.content),
       q.passage_code ? pid[q.passage_code] : null, q.question_no]);
    await client.query('delete from question_options where question_id = $1', [row.id]);
    for (const o of q.options) {
      await client.query(
        `insert into question_options (question_id, option_label, option_text, is_correct,
                                       correct_evidence, notes, display_order)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [row.id, o.option_label, o.option_text, o.is_correct, o.correct_evidence,
         o.notes, o.display_order]);
    }
  }
  return { mockTestId: mt.id, questions: questions.length, passages: passages.length };
}

async function main() {
  const audioPath = path.join(DUMP, `audio_lc${VOL}_t${pad2(TEST)}.json`);
  const audioMap = {};
  if (fs.existsSync(audioPath)) {
    const a = readJson(audioPath);
    for (const [k, v] of Object.entries(a.audio)) audioMap[Number(k)] = v;
  } else {
    console.log(`⚠ 음원 매핑 없음: ${audioPath}\n  python scripts/map_mock_audio.py --vol ${VOL} --test ${TEST} --copy public/mock/lc${VOL}-t${pad2(TEST)} --emit ${path.relative(process.cwd(), audioPath)}`);
  }

  const builds = [
    [buildLc(audioMap), { source: 'YBM 실전토익 LC 1000', title: `LC ${VOL}권 TEST ${TEST}` }],
    [buildRc(), { source: 'YBM 실전토익 RC 1000', title: `RC ${VOL}권 TEST ${TEST}` }],
  ];

  let bad = 0;
  for (const [built] of builds) {
    const problems = verify(built);
    const byPart = {};
    for (const q of built.questions) byPart[q.part] = (byPart[q.part] || 0) + 1;
    console.log(`[${built.area} ${VOL}권 TEST ${TEST}] 문항 ${built.questions.length} · 지문 ${built.passages.length}`);
    console.log('  파트별: ' + Object.entries(byPart).map(([p, n]) => `P${p} ${n}`).join(' · '));
    if (problems.length) { bad += problems.length; problems.forEach((p) => console.log('  !! ' + p)); }
    else console.log('  OK 결손·중복·정답·보기수·음원 이상 없음');
  }
  if (bad) { console.error(`\n검증 실패 ${bad}건 — 적재하지 않는다.`); process.exit(1); }

  if (!GO) {
    console.log('\ndry run. 실제로 넣으려면 --go');
    return;
  }
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    // DB 직결이 없으면 REST + service_role 로 넣는다 (위 restClient 주석 참조)
    const rest = restClient();
    if (!rest) {
      console.error('\nSUPABASE_DB_URL 도 SUPABASE_SERVICE_ROLE_KEY 도 없다. 둘 중 하나가 필요하다.');
      process.exit(1);
    }
    console.log('\nSUPABASE_DB_URL 없음 → REST(service_role)로 적재한다.');
    for (const [built, meta] of builds) {
      const r = await loadRest(rest, built, meta);
      console.log(`→ ${built.area}: 문항 ${r.questions} · 지문 ${r.passages} · 보기 ${r.options} (mock_test_id=${r.mockTestId})`);
    }
    console.log('적재 완료');
    return;
  }
  const { Client } = require('pg');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('begin');
    for (const [built, meta] of builds) {
      const r = await load(client, built, meta);
      console.log(`→ ${built.area}: 문항 ${r.questions} · 지문 ${r.passages} (mock_test_id=${r.mockTestId})`);
    }
    await client.query('commit');
    console.log('적재 완료');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
