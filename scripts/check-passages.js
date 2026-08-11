/**
 * 지문 전수 점검 — "교재에서 제대로 옮겨졌는가"
 *
 * 왜 만들었나 (2026-08-11 실측)
 *   RC-P7-08 삼중 지문을 눈으로 열어 봤더니 지문 3개 중 **2개가 어긋나** 있었다.
 *     · 도면이 낱말 한 줄로만 들어와 있었다 — 그런데 200번이 그 도면을 봐야 푸는 문제였다
 *     · 2단 기사가 오른단부터 읽혀 거꾸로 붙어 있었다
 *     · 이메일 제목 자리에 인사말이 들어가 있었다
 *   한 강의를 열어서야 알았다는 건, 나머지 강의도 같은 상태일 수 있다는 뜻이다. 눈이 아니라 표로 본다.
 *
 * 검사 항목 (전부 실제로 겪은 증상이다)
 *   EMPTY     문장도 표도 대화도 없는 지문        — 그림 자료를 파서가 못 뽑았다
 *   ORDER     첫 문장이 소문자로 시작            — 2단 조판이 오른단부터 읽혔다
 *   FURNITURE 시험지 안내문·한글이 섞였다         — 파트 경계에서 딸려 왔다
 *   LONG      한 문장이 250자 이상               — 표가 한 덩어리로 뭉개졌다
 *   MAIL      이메일인데 머리글이 없거나 제목이 인사말
 *   BLEED     옆 지문 제목이 본문 끝에 새어 들었다
 *   DUP       같은 문장이 두 번
 *   OPT       보기가 150자 이상 / 정답이 1개가 아님
 *
 * 사용
 *   node scripts/check-passages.js                 # 전체
 *   node scripts/check-passages.js --lecture RC-P7-08
 *   node scripts/check-passages.js --all           # 정상인 지문도 한 줄씩 보여준다
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { Client } = require('pg');

const ONLY = (process.argv.find((a) => a.startsWith('--lecture=')) ?? '').split('=')[1]
  ?? (process.argv.includes('--lecture') ? process.argv[process.argv.indexOf('--lecture') + 1] : null);
const SHOW_ALL = process.argv.includes('--all');

const FURNITURE = /Directions:|Stop! This is the end|GO ON TO THE NEXT PAGE|[가-힣]/;
const GREETING = /^(Dear|Hello|Hi|Hey|Greetings|To whom)/i;

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const { rows } = await c.query(`
    select l.lecture_code, l.part, p.id, p.passage_code, p.kind, p.title, p.meta, p.body,
           coalesce(q.content->>'stage','lesson') phase,
           (select json_agg(s.en order by s.seq) from passage_sentences s where s.passage_id = p.id) sents,
           (select count(*) from questions x where x.passage_id = p.id) qs
      from passages p
      join questions q on q.id = (select min(id) from questions where passage_id = p.id)
      join lectures l on l.id = q.lecture_id
     ${ONLY ? 'where l.lecture_code = $1' : ''}
     order by l.lecture_code, p.passage_code`, ONLY ? [ONLY] : []);

  /* 세트 형제 지문(문항이 첫 지문에만 달린다)도 같이 본다 */
  const { rows: sibs } = await c.query(`
    select p.id, p.passage_code, p.kind, p.title, p.meta, p.body, p.set_code,
           (select json_agg(s.en order by s.seq) from passage_sentences s where s.passage_id = p.id) sents
      from passages p
     where p.set_code is not null and not exists (select 1 from questions q where q.passage_id = p.id)`);

  const { rows: opts } = await c.query(`
    select l.lecture_code, q.question_code, o.option_label lb, length(o.option_text) len,
           (select count(*) from question_options z where z.question_id = q.id and z.is_correct) corrects
      from question_options o join questions q on q.id = o.question_id
      join lectures l on l.id = q.lecture_id
     ${ONLY ? 'where l.lecture_code = $1' : ''}`, ONLY ? [ONLY] : []);
  await c.end();

  /* 세트 형제를 그 세트의 주인 강의에 붙인다 */
  const bySet = new Map();
  for (const r of rows) if (r.passage_code.includes('-PSG')) bySet.set(r.passage_code.replace(/-\d+$/, ''), r);
  const all = [...rows];
  for (const s of sibs) {
    const owner = rows.find((r) => r.passage_code.replace(/-\d+$/, '') === s.passage_code.replace(/-\d+$/, ''));
    if (owner) all.push({ ...s, lecture_code: owner.lecture_code, part: owner.part, phase: owner.phase, qs: 0 });
  }
  all.sort((a, b) => a.lecture_code.localeCompare(b.lecture_code) || a.passage_code.localeCompare(b.passage_code));

  const titles = new Set(all.map((p) => p.title).filter(Boolean));
  const bad = [];
  for (const p of all) {
    const sents = p.sents ?? [];
    const table = p.body?.table;
    const chat = p.body?.chat;
    const hits = [];

    if (!sents.length && !table && !chat?.length) hits.push('EMPTY 문장도 표도 없다');
    if (sents[0] && /^[a-z]/.test(sents[0].trim())) hits.push(`ORDER 첫 문장이 소문자 — "${sents[0].slice(0, 45)}…"`);
    for (const s of sents) {
      if (FURNITURE.test(s)) { hits.push(`FURNITURE "${s.match(FURNITURE)[0]}" 가 섞였다`); break; }
    }
    const long = sents.find((s) => s.length >= 250);
    if (long) hits.push(`LONG ${long.length}자 문장 — 표가 뭉개졌을 수 있다`);
    if (p.kind === 'email') {
      const meta = p.meta ?? [];
      const subj = meta.find((m) => /^subject$/i.test(m.k))?.v;
      if (!meta.length) hits.push('MAIL 이메일인데 머리글(To/From/Subject)이 없다');
      else if (subj && GREETING.test(subj)) hits.push(`MAIL 제목 자리에 인사말 — "${subj}"`);
    }
    const last = sents[sents.length - 1];
    if (last) {
      const bleed = [...titles].find((t) => t !== p.title && t.length > 8 && last.endsWith(t));
      if (bleed) hits.push(`BLEED 끝에 옆 지문 제목 — "${bleed}"`);
    }
    if (new Set(sents).size !== sents.length) hits.push('DUP 같은 문장이 두 번');

    if (hits.length) bad.push({ p, hits });
    else if (SHOW_ALL) {
      console.log(`   ok  ${p.lecture_code} ${p.passage_code.padEnd(18)} ${p.kind.padEnd(9)} `
        + `${p.phase.padEnd(8)} 문장${String(sents.length).padStart(3)}${table ? ` 표${table.rows.length}` : ''}`);
    }
  }

  console.log(`\n지문 ${all.length}개 검사 — 의심 ${bad.length}개\n`);
  let cur = '';
  for (const { p, hits } of bad) {
    if (p.lecture_code !== cur) { cur = p.lecture_code; console.log(`── ${cur} ──`); }
    console.log(`  ${p.passage_code.padEnd(18)} ${p.kind.padEnd(9)} ${p.phase.padEnd(8)} 문항${p.qs}`);
    for (const h of hits) console.log(`      · ${h}`);
  }

  /* 보기 */
  const optBad = opts.filter((o) => o.len >= 150);
  const ansBad = [...new Map(opts.filter((o) => Number(o.corrects) !== 1).map((o) => [o.question_code, o])).values()];
  if (optBad.length || ansBad.length) {
    console.log('\n── 보기 ──');
    for (const o of optBad) console.log(`  OPT ${o.lecture_code} ${o.question_code} ${o.lb}) ${o.len}자`);
    for (const o of ansBad) console.log(`  OPT ${o.lecture_code} ${o.question_code} 정답이 ${o.corrects}개`);
  } else {
    console.log('\n보기: 이상 없음');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
