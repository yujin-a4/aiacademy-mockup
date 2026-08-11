/**
 * 이미 있는 RC 강의에 **실전 세트를 하나 더** 붙인다 (수업·기존 실전 문항은 건드리지 않는다).
 *
 * 왜 따로 만들었나
 *   교재의 Part 7 단일 지문 세트는 **2문항짜리가 흔하다**(실제 시험이 그렇다). 그런데 실전 한 판이
 *   2문항이면 "지문 하나에 문제 여럿"을 연습할 거리가 안 된다. 화면이 이제 **세트 단위**로 돌기
 *   때문에(P3·P4 와 같은 규칙 — `fromDb.buildRcPracticeSets`), 세트를 얹으면 실전이 그대로 늘어난다.
 *
 *   `load-rc-questions.js` 는 강의 문항을 **통째로 지우고 다시 넣는** 로더라 여기에 못 쓴다.
 *   RC-P7-03 수업 지문(TEST 5 Medina 광고)은 파서가 문장을 0개로 뽑아서 그 로더를 태우면
 *   수업이 통째로 날아간다. 그래서 붙이기 전용 스크립트다.
 *
 * 되돌리기·재실행
 *   같은 passage_code 가 이미 있으면 그 지문에 딸린 문항만 지우고 다시 넣는다(재실행 안전).
 *
 * 사용
 *   node scripts/add-rc-practice-set.js          # dry run
 *   node scripts/add-rc-practice-set.js --go
 *   node scripts/build-lecture-items.js --go     # ← 문항 id 가 새로 생기므로 **반드시**
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const GO = process.argv.includes('--go');

/* ── 무엇을 어디에 붙일까 ──
   교재 전 10회차에서 **아직 아무 강의도 안 쓴** 단일 지문 세트만 고른다(문항 겹침 0). */
const ADD = [
  /* 광고·홍보문 실전이 2문항뿐이었다 → 3문항짜리 브로슈어를 얹어 5문항 2세트로.
     TEST 3 155-157 Vandivia 농장 안내 책자(13문장). */
  { lecture: 'RC-P7-03', set: [3, '155-157'] },

  /* 양식·일정표·영수증 실전이 영수증 2문항뿐이었다 → 일정표(안건표) 2문항을 얹어 4문항 2세트로.
     TEST 6 156-157 Nature Monthly 워크숍 안건표.
     ⚠️ 교재에서 이건 **표**다. PDF 안에서 선으로 그린 그림이라 파서가 한 덩어리 문장으로 뱉는다
        → 시각(9:00 a.m. – …)으로 잘라 `body.table` 로 세운다. 자르기만 할 뿐 원문은 안 고친다. */
  { lecture: 'RC-P7-06', set: [6, '156-157'], asSchedule: true },
];

/** 머리말 → 화면 지문 종류 라벨 (load-rc-questions.js 의 PHRASE_LABEL 과 같은 말) */
const PHRASE_LABEL = [
  [/text-message|text message|chat/i, '문자'],
  [/e-?mail/i, '이메일'],
  [/letter/i, '편지'],
  [/press release/i, '보도문'],
  [/article|news/i, '기사'],
  [/advertisement|brochure/i, '광고·홍보문'],
  [/job (posting|advertisement)/i, '공지문'],
  [/notice|memo|announcement/i, '공지문'],
  [/instructions?|information|policy/i, '안내문'],
  [/receipt|invoice/i, '영수증'],
  [/schedule|itinerary|agenda/i, '일정표'],
  [/form|list|table|chart/i, '양식'],
];
const labelOf = (phrase) => (PHRASE_LABEL.find(([re]) => re.test(phrase || ''))?.[1]) ?? '지문';

/* 근거 문장 — 교재 해설이 괄호 안에 인용한 영어 원문을 지문 문장과 맞춘다
   (load-rc-questions.js 와 같은 규칙. 화면 형광펜이 이 값을 쓴다) */
const words = (s) => (s.toLowerCase().match(/[a-z]{3,}/g) ?? []);
function evidenceOf(explain, sentences) {
  const quotes = [...(explain ?? '').matchAll(/\(([^()]{25,400})\)/g)]
    .map((m) => m[1].trim())
    .filter((s) => /[a-z]{3}/.test(s) && !/[가-힣]/.test(s));
  if (!quotes.length || !sentences.length) return null;
  const quote = quotes.sort((a, b) => b.length - a.length)[0];
  const qw = new Set(words(quote));
  if (qw.size < 4) return null;
  let best = null;
  for (const en of sentences) {
    const sw = words(en);
    if (!sw.length) continue;
    const hit = sw.filter((w) => qw.has(w)).length / qw.size;
    if (!best || hit > best.hit) best = { en, hit };
  }
  return best && best.hit >= 0.5 ? best.en : null;
}

/** 일정표 — 한 덩어리로 뽑힌 문장을 시각 기준으로 잘라 [시간 | 내용] 표로.
 *  자르기만 한다. 시각 앞의 머리글(워크숍 제목)은 표 밖 문장으로 남긴다. */
function toSchedule(sentences) {
  const flat = sentences.join(' ').replace(/\s+/g, ' ').trim();
  const TIME = /(\d{1,2}:\d{2}\s*[ap]\.m\.)\s*[–-]\s*/g;
  const hits = [...flat.matchAll(TIME)];
  if (hits.length < 2) return null;
  const head = flat.slice(0, hits[0].index).trim();
  const rows = hits.map((m, i) => {
    const body = flat.slice(m.index + m[0].length, i + 1 < hits.length ? hits[i + 1].index : flat.length);
    return [m[1].replace(/\s+/g, ' '), body.trim()];
  });
  return { head, table: { headers: ['시간', '내용'], rows } };
}

function loadSet([test, range]) {
  const file = path.join(__dirname, `_rc_test${test}.json`);
  if (!fs.existsSync(file)) {
    console.error(`${file} 없음 — python scripts/extract_rc_pdf.py --test ${test} --out ${file}`);
    process.exit(1);
  }
  const [lo, hi] = range.split('-').map(Number);
  const s = Object.values(JSON.parse(fs.readFileSync(file, 'utf8')))
    .find((x) => x.range[0] === lo && x.range[1] === hi);
  if (!s) throw new Error(`TEST ${test} ${range} 세트를 못 찾았다`);
  if (s.passages.length !== 1) throw new Error(`TEST ${test} ${range} 은 지문 ${s.passages.length}개다 — 이 스크립트는 단일 지문만`);
  if (!s.passages[0].sentences.length && !s.passages[0].chat.length) {
    throw new Error(`TEST ${test} ${range} 지문 문장이 0개다 — 파서가 경계를 못 잡았다`);
  }
  const noAns = s.questions.filter((q) => !q.answer).map((q) => q.no);
  if (noAns.length) throw new Error(`TEST ${test} ${range} 정답 없는 문항: ${noAns.join(', ')}`);
  return { ...s, test };
}

async function main() {
  const jobs = ADD.map((a) => ({ ...a, s: loadSet(a.set) }));

  console.log('붙일 것\n');
  for (const j of jobs) {
    const src = j.s.passages[0];
    const sched = j.asSchedule ? toSchedule(src.sentences) : null;
    if (j.asSchedule && !sched) { console.error(`✗ ${j.lecture}: 일정표를 시각으로 못 잘랐다`); process.exit(1); }
    console.log(`  ${j.lecture}  T${j.s.test} ${j.s.set ?? j.s.range.join('-')}  ${labelOf(j.s.phrase).padEnd(7)}`
      + ` ${src.kind.padEnd(6)} 문항 ${j.s.questions.length}`
      + (sched ? ` · 표 ${sched.table.rows.length}행` : ` · 문장 ${src.sentences.length}`));
    if (sched) sched.table.rows.forEach((r) => console.log(`      ${r[0].padEnd(11)} ${r[1].slice(0, 60)}`));
  }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    for (const j of jobs) {
      const lec = await c.query('select id from lectures where lecture_code = $1', [j.lecture]);
      if (!lec.rows.length) { console.error(`✗ ${j.lecture}: lectures 에 없음`); continue; }
      const lectureId = lec.rows[0].id;

      /* 지금 실전이 몇 문항인지 — 새 문항은 그 뒤 번호로 잇는다 */
      const { rows: cur } = await c.query(
        `select question_code, content->>'question_number' n, passage_id
           from questions where lecture_id = $1 and coalesce(content->>'stage','lesson') = 'practice'
          order by display_order`, [lectureId]);
      const { rows: psgs } = await c.query(
        `select distinct p.passage_code from passages p join questions q on q.passage_id = p.id
          where q.lecture_id = $1`, [lectureId]);

      const nextPsg = 1 + psgs.reduce((m, r) => {
        const n = Number((r.passage_code.match(/-PSG(\d+)/) ?? [])[1] ?? 0);
        return Math.max(m, n);
      }, 0);
      const code = `${j.lecture}-PSG${nextPsg}`;
      /* 재실행 — 이 스크립트가 앞서 넣은 지문이면 그 문항만 걷어내고 다시 넣는다 */
      const mine = await c.query('select id from passages where passage_code = $1', [code]);
      const startNo = cur.filter((r) => !mine.rows.length || String(r.passage_id) !== String(mine.rows[0].id)).length;

      if (!GO) {
        console.log(`\n(dry run) ${j.lecture}: 실전 ${cur.length}문항 → ${startNo + j.s.questions.length}문항`
          + ` (${code} 로 ${j.s.questions.length}개 추가)`);
        continue;
      }

      await c.query('begin');
      try {
        if (mine.rows.length) {
          const pid = mine.rows[0].id;
          await c.query('delete from learner_answer_log where question_id in (select id from questions where passage_id = $1)', [pid]);
          await c.query('delete from sandbox.lecture_items where lecture_id = $1', [lectureId]);
          await c.query('delete from questions where passage_id = $1', [pid]);
          await c.query('delete from passage_sentences where passage_id = $1', [pid]);
          await c.query('delete from passages where id = $1', [pid]);
        }

        const src = j.s.passages[0];
        const sched = j.asSchedule ? toSchedule(src.sentences) : null;
        const lines = sched ? [sched.head].filter(Boolean) : src.sentences;
        const body = sched ? JSON.stringify({ table: sched.table }) : null;

        const pg = await c.query(
          `insert into passages (passage_code, kind, title, meta, body) values ($1,$2,$3,$4,$5) returning id`,
          [code, src.kind, src.title ?? null, src.meta.length ? JSON.stringify(src.meta) : null, body]);
        const passageId = pg.rows[0].id;
        for (let i = 0; i < lines.length; i += 1) {
          await c.query('insert into passage_sentences (passage_id, seq, en) values ($1,$2,$3)', [passageId, i + 1, lines[i]]);
        }

        /* 근거 문장은 표 칸까지 훑는다 — 일정표는 답의 근거가 문장이 아니라 칸 안에 있다 */
        const evLines = [...lines, ...(sched ? sched.table.rows.map((r) => r.join(' ')) : []), ...src.meta.map((m) => m.v)];
        const label = labelOf(j.s.phrase);
        const flat = sched
          ? [sched.head, ...sched.table.rows.map((r) => `${r[0]} – ${r[1]}`)].filter(Boolean).join('\n')
          : src.sentences.join('\n');

        for (let k = 0; k < j.s.questions.length; k += 1) {
          const q = j.s.questions[k];
          const n = startNo + k + 1;
          const evidence = evidenceOf(q.explain, evLines);
          const content = {
            question_number: String(n),
            stage: 'practice',
            passage_text: flat,
            question_text: q.q,
            passage_type: label,
            ...(evidence ? { evidence_sentence: evidence } : {}),
            ...(q.qtype ? { question_type_label: q.qtype } : {}),
            source: `YBM 실전토익 RC 1000 TEST ${j.s.test} Q${q.no}`,
          };
          const qr = await c.query(
            `insert into questions (question_code, lecture_id, part, content, passage_id, display_order)
             values ($1,$2,7,$3,$4,$5) returning id`,
            [`${j.lecture}-P${String(n).padStart(3, '0')}`, lectureId, JSON.stringify(content), passageId, n]);
          for (let i = 0; i < q.options.length; i += 1) {
            const o = q.options[i];
            await c.query(
              `insert into question_options (question_id, option_label, option_text, is_correct, correct_evidence, display_order)
               values ($1,$2,$3,$4,$5,$6)`,
              [qr.rows[0].id, o.label, o.text, !!o.correct, o.correct ? (q.explain ?? null) : null, i + 1]);
          }
        }
        await c.query('commit');
        console.log(`  ✓ ${j.lecture} — ${code} 문항 ${j.s.questions.length}개 (실전 ${startNo + j.s.questions.length}문항)`);
      } catch (err) {
        await c.query('rollback');
        console.error(`  ✗ ${j.lecture}: ${err.message}`);
      }
    }
    if (GO) console.log('\n다음: node scripts/build-lecture-items.js --go');
    else console.log('\n(dry run) 넣으려면 --go');
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
