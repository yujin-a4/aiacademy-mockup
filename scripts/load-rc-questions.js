/**
 * 추출한 RC 문항(scripts/_rc_test{N}.json) → DB 적재 (Part 6·7 단일 지문)
 *
 * 배경: LC 는 load-lc-questions.js 로 채웠는데 RC 는 파서(extract_rc_pdf.py)만 있고 로더가 없었다.
 *   교재 PDF → scripts/extract_rc_pdf.py → 이 스크립트 → DB.
 *
 * ⚠️ 시트 동기화는 중단됐고(2026-07-28) **DB 가 문항의 정본**이다. 그래서 여기서 DB 에 직접 쓴다.
 *
 * 넣는 것
 *   passages + passage_sentences  (지문 종류·이메일 머리글·문자 대화까지)
 *   questions + question_options
 * 넣은 뒤에는
 *   node scripts/build-lecture-items.js --go   (아이템 연결)
 *   node scripts/relink-audio.js --go          (public/ mp3 재연결 — 보기가 새로 생겼으므로)
 *
 * 다루지 않는 것
 *   - 이중·삼중 지문(RC-P7-07·08): questions.passage_id 가 지문 하나만 가리키고
 *     fromDb 도 지문 1개만 만든다. 모델·화면을 같이 고쳐야 해서 여기서 제외한다.
 *   - 보기별 오답 이유·오답 태그: 교재 RC 해설은 **문항 단위**다(LC Part3·4 와 같은 사정).
 *     정답 근거(해설)는 정답 보기에 붙이고, 오답 보기는 비운다.
 *
 * 사용
 *   python scripts/extract_rc_pdf.py --test 1 --out scripts/_rc_test1.json   (2·3 회차도 같은 방식)
 *   node scripts/load-rc-questions.js          # dry run
 *   node scripts/load-rc-questions.js --go
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const GO = process.argv.includes('--go');

/* ── 무엇을 어느 강의에 넣을까 ──
   교재 세트의 머리말(‘refer to the following e-mail’)이 곧 지문 종류다. 그걸 강의와 맞췄다.
   문항 겹침 0 — 한 세트는 한 강의의 수업 **또는** 실전에만 쓴다. */
const PLAN = [
  { lecture: 'RC-P6-02', part: 6, lesson: [1, '131-134'], practice: [1, '143-146'] },  // 문장 삽입·문맥 어휘
  { lecture: 'RC-P7-01', part: 7, lesson: [1, '149-150'], practice: [1, '168-171'] },  // 이메일·편지
  { lecture: 'RC-P7-02', part: 7, lesson: [1, '147-148'], practice: [1, '155-157'] },  // 공지문·안내문
  { lecture: 'RC-P7-04', part: 7, lesson: [1, '161-163'], practice: [1, '164-167'] },  // 기사·보도문
  { lecture: 'RC-P7-05', part: 7, lesson: [1, '153-154'], practice: [1, '172-175'] },  // 문자·채팅
  { lecture: 'RC-P7-06', part: 7, lesson: [1, '158-160'], practice: [3, '151-152'] },  // 양식·일정표·영수증
  /* 이중 지문 — 수업은 일반형(공지+이메일), 실전은 **표/자료형**(이메일+일정표).
     한 강의 안에 두 변종을 다 담는다. 유형 그리드(t12 일반 / t13 표형)가 각각 이 강의를 가리킨다. */
  { lecture: 'RC-P7-07', part: 7, lesson: [1, '176-180'], practice: [2, '186-190'] },
  // 삼중은 TEST 2 에서 가져온다 — TEST 1 의 186-190 은 첫 지문 경계가 어긋나 문장이 0개다
  { lecture: 'RC-P7-08', part: 7, lesson: [2, '191-195'], practice: [2, '196-200'] },  // 삼중 지문
];

/** 머리말 → 화면에 보이는 지문 종류 라벨 (passage_type_aliases 의 raw 표기와 같은 말) */
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

/** 교재 해설의 유형 라벨 → Part 6 빈칸 유형 (화면 P6_COACH 가 이 값으로 갈린다) */
function blankType(qtype) {
  const t = qtype || '';
  if (/문장 고르기|문장 삽입/.test(t)) return '문장삽입형';
  if (/접속부사|연결어/.test(t)) return '연결어형';
  if (/어휘/.test(t)) return '어휘형';
  return '문법형';
}

/* Part 6 빈칸 자리는 교재에서 '-131. ------' 로 찍힌다. 화면 마커로 바꾼다 */
const BLANK_RE = /-?\s*(\d{3})\.\s*-{3,}\s*/g;
const toMarker = (text, lo, fmt) =>
  text.replace(BLANK_RE, (_m, n) => `${fmt(Number(n) - lo + 1)} `)   // 뒤 공백은 되살린다 ('___(1)___range' 방지)
    .replace(/[ \t]+([.,;:!?])/g, '$1')                              // 교재의 '------ .' 는 마침표만 남긴다
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
const numBlank = (k) => `___(${k})___`;      // passage_sentences.en (화면이 읽는 마커)
const ctxBlank = (k) => `(${k})_______`;     // content.passage_context (폴백 경로가 읽는 마커)

/* ── 근거 문장 ──
   교재 해설은 근거를 **괄호 안 영어 원문**으로 인용한다.
   ("… 언급한 부분에서 (Applicants must be able to demonstrate …)")
   그 인용을 지문 문장과 맞춰 실제 문장을 되찾는다. 화면이 형광펜 칠 대상으로 쓰는 값이라
   지문에 없는 문장이면 아무 데도 안 걸린다 — 그래서 문장 원문으로 되돌린다. */
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

/* ── 적재 ── */

function loadSets() {
  const byTest = new Map();
  for (const p of PLAN) {
    for (const [test] of [p.lesson, p.practice]) {
      if (byTest.has(test)) continue;
      const file = path.join(__dirname, `_rc_test${test}.json`);
      if (!fs.existsSync(file)) {
        console.error(`${file} 없음 — python scripts/extract_rc_pdf.py --test ${test} --out ${file}`);
        process.exit(1);
      }
      byTest.set(test, JSON.parse(fs.readFileSync(file, 'utf8')));
    }
  }
  return byTest;
}

function pickSet(byTest, [test, range]) {
  const [lo, hi] = range.split('-').map(Number);
  const s = byTest.get(test).find((x) => x.range[0] === lo && x.range[1] === hi);
  if (!s) throw new Error(`TEST ${test} ${range} 세트를 못 찾았다`);
  const empty = s.passages.filter((p) => !p.sentences.length && !p.chat.length);
  if (empty.length) throw new Error(`TEST ${test} ${range} 에 문장이 0개인 지문이 있다 — 파서가 경계를 못 잡았다`);
  return { ...s, test };
}

async function main() {
  const byTest = loadSets();
  const jobs = PLAN.map((p) => ({
    ...p,
    sets: { lesson: pickSet(byTest, p.lesson), practice: pickSet(byTest, p.practice) },
  }));

  console.log('넣을 것\n');
  for (const j of jobs) {
    for (const phase of ['lesson', 'practice']) {
      const s = j.sets[phase];
      const n = s.passages.reduce((t, p) => t + (p.sentences.length || p.chat.length), 0);
      const kinds = s.passages.map((p) => p.kind).join('+');
      const linked = s.questions.filter((q) => /연계/.test(q.qtype || '')).length;
      console.log(`  ${j.lecture}  ${phase.padEnd(8)} T${s.test} ${s.range.join('-')}  `
        + `${labelOf(s.phrase).padEnd(6)} ${kinds.padEnd(20)} 지문 ${s.passages.length} · 문장 ${String(n).padStart(2)}`
        + ` · 문항 ${s.questions.length}${linked ? ` (연계 ${linked})` : ''}`);
    }
  }
  const noAnswer = jobs.flatMap((j) => ['lesson', 'practice'].flatMap((ph) =>
    j.sets[ph].questions.filter((q) => !q.answer).map((q) => `${j.lecture} ${q.no}`)));
  if (noAnswer.length) {
    console.error(`\n✗ 정답 없는 문항: ${noAnswer.join(', ')} — 넣지 않는다`);
    process.exit(1);
  }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const lectures = new Map(
      (await c.query('select id, lecture_code from lectures')).rows.map((r) => [r.lecture_code, r.id]),
    );

    if (!GO) {
      console.log('\n(dry run) 넣으려면 --go');
      const miss = jobs.filter((j) => !lectures.get(j.lecture)).map((j) => j.lecture);
      if (miss.length) console.error(`✗ lectures 에 없는 강의: ${miss.join(', ')}`);
      // 근거 문장이 몇 개나 붙는지 미리 본다 (화면 형광펜 대상)
      let ev = 0, tot = 0;
      for (const j of jobs) {
        if (j.part !== 7) continue;
        for (const ph of ['lesson', 'practice']) {
          const s = j.sets[ph];
          const evLines = s.passages.flatMap((p) => [
            ...(p.sentences.length ? p.sentences : p.chat.map((x) => x.text)), ...p.meta.map((m) => m.v),
          ]);
          for (const q of s.questions) { tot += 1; if (evidenceOf(q.explain, evLines)) ev += 1; }
        }
      }
      console.log(`근거 문장 자동 연결: ${ev}/${tot} (Part 7)`);
      return;
    }

    let psgTotal = 0, sTotal = 0, qTotal = 0, oTotal = 0, evTotal = 0;
    for (const j of jobs) {
      const lectureId = lectures.get(j.lecture);
      if (!lectureId) { console.error(`SKIP ${j.lecture}: lectures 에 없음`); continue; }

      await c.query('begin');
      try {
        /* 기존 것 정리 — ⚠️ 순서 주의. questions.passage_id 가 passages 를 참조하므로
           지울 지문 목록을 먼저 뽑고, 문항을 지운 뒤에 지문을 지운다. */
        const { rows: oldPsg } = await c.query(
          `select distinct p.id from passages p
             join questions q on q.passage_id = p.id where q.lecture_id = $1`, [lectureId]);
        await c.query(
          `delete from learner_answer_log where question_id in (select id from questions where lecture_id = $1)`,
          [lectureId]);
        await c.query('delete from questions where lecture_id = $1', [lectureId]);
        await c.query('delete from lecture_items where lecture_id = $1', [lectureId]);   // build-lecture-items 가 다시 만든다
        /* 실험장(0025 sandbox)이 **정본 지문을 참조**한다 — 그 사본이 남아 있으면 지문을 못 지운다.
           실험장은 `select sandbox.reset()` 으로 정본에서 통째로 다시 만드는 버리는 사본이라 지워도 된다. */
        await c.query('delete from sandbox.lecture_items where lecture_id = $1', [lectureId]);
        if (oldPsg.length) await c.query('delete from passages where id = any($1)', [oldPsg.map((r) => r.id)]);

        let psgNo = 0;
        for (const phase of ['lesson', 'practice']) {
          const s = j.sets[phase];
          const lo = s.range[0];
          // 이중·삼중은 지문 종류가 여럿이라 하나로 못 적는다 — 세트 성격을 적는다(화면 제목이 이걸 쓴다)
          const label = s.passages.length > 1
            ? (s.passages.length === 2 ? '이중 지문' : '삼중 지문')
            : labelOf(s.phrase);
          psgNo += 1;
          const setCode = s.passages.length > 1 ? `${j.lecture}-SET${psgNo}` : null;

          /* ── 지문 ── 이중·삼중이면 여러 행. 같은 set_code 로 묶고 문항은 첫 지문에 붙인다(0027) */
          const docs = [];
          for (let d = 0; d < s.passages.length; d += 1) {
            const src = s.passages[d];
            const isChat = src.chat.length > 0;
            const chat = src.chat.map((m, i) => ({
              id: `c${i + 1}`, speaker: m.speaker, time: (m.time || '').toUpperCase(), text: m.text,
            }));
            const lines = isChat ? chat.map((m) => m.text) : src.sentences;
            const body = isChat ? JSON.stringify({ chat }) : null;
            const code = setCode ? `${j.lecture}-PSG${psgNo}-${d + 1}` : `${j.lecture}-PSG${psgNo}`;

            const pg = await c.query(
              `insert into passages (passage_code, kind, title, meta, body, set_code, set_seq)
               values ($1,$2,$3,$4,$5,$6,$7)
               on conflict (passage_code) do update
                 set kind = excluded.kind, title = excluded.title, meta = excluded.meta,
                     body = excluded.body, set_code = excluded.set_code, set_seq = excluded.set_seq
               returning id`,
              [code, src.kind, src.title ?? null,
                src.meta.length ? JSON.stringify(src.meta) : null, body, setCode, d + 1]);
            const passageId = pg.rows[0].id;
            psgTotal += 1;
            await c.query('delete from passage_sentences where passage_id = $1', [passageId]);

            for (let i = 0; i < lines.length; i += 1) {
              const en = j.part === 6 ? toMarker(lines[i], lo, numBlank) : lines[i];
              const m = en.match(/___\((\d)\)___/);
              await c.query(
                `insert into passage_sentences (passage_id, seq, en, speaker, blank_no) values ($1,$2,$3,$4,$5)`,
                [passageId, i + 1, en, isChat ? chat[i].speaker : null, m ? Number(m[1]) : null]);
              sTotal += 1;
            }

            docs.push({
              id: passageId,
              // 양식·공지는 정보가 문장이 아니라 **라벨 값**에 있다(Rental Branch / Mileage Cap …).
              // 근거 문장을 문장 목록에서만 찾으면 그런 지문은 근거가 통째로 안 잡힌다
              evLines: [...lines, ...src.meta.map((m) => m.v)],
              flat: isChat
                ? chat.map((m) => `${m.speaker} [${m.time}] ${m.text}`).join('\n')
                : src.sentences.join('\n'),
            });
          }

          /* ── 문항 ── */
          const prefix = phase === 'lesson' ? 'Q' : 'P';
          // 지문 폴백 경로(fromDb buildPractice)가 아직 content 문자열을 본다 — 같이 넣어 둔다.
          // 이중·삼중은 지문을 이어 붙인다(폴백은 지문 하나만 그린다 — 정상 경로가 세트를 그린다)
          const flat = docs.map((d) => d.flat).join('\n\n');
          const passageField = j.part === 6
            ? { passage_context: toMarker(flat, lo, ctxBlank) }
            : { passage_text: flat };

          for (let k = 0; k < s.questions.length; k += 1) {
            const q = s.questions[k];
            const n = k + 1;                       // 화면이 쓰는 번호(빈칸 1~4 / Q1~Q5). 교재 번호는 source 로.
            // 근거가 **어느 지문**에 있는지도 남긴다 — 이중·삼중은 강사가 그 지문 탭을 열어야 한다
            let evidence = null, evDoc = 0;
            if (j.part === 7) {
              for (let d = 0; d < docs.length && !evidence; d += 1) {
                evidence = evidenceOf(q.explain, docs[d].evLines);
                if (evidence) evDoc = d + 1;
              }
            }
            if (evidence) evTotal += 1;
            // 교재 해설이 '연계' 라고 표시한 문항 = 지문 두 개를 이어 봐야 풀리는 문항
            const isLinked = /연계/.test(q.qtype || '');

            const content = {
              question_number: String(n),
              ...(phase === 'practice' ? { stage: 'practice' } : {}),
              ...passageField,
              ...(j.part === 6
                ? {
                  blank_type: blankType(q.qtype),
                  question_text: blankType(q.qtype) === '문장삽입형'
                    ? `빈칸 (${n})에 들어갈 문장으로 알맞은 것을 고르시오.`
                    : `빈칸 (${n})에 알맞은 것을 고르시오.`,
                }
                : {
                  question_text: q.q,
                  passage_type: label,
                  ...(evidence ? { evidence_sentence: evidence } : {}),
                  ...(evDoc && docs.length > 1 ? { evidence_passage: String(evDoc) } : {}),
                  ...(isLinked ? { linked: '1' } : {}),
                }),
              ...(q.qtype ? { question_type_label: q.qtype } : {}),
              source: `YBM 실전토익 RC 1000 TEST ${s.test} Q${q.no}`,
            };

            const qr = await c.query(
              `insert into questions (question_code, lecture_id, part, content, passage_id, display_order)
               values ($1,$2,$3,$4,$5,$6) returning id`,
              [`${j.lecture}-${prefix}${String(n).padStart(3, '0')}`, lectureId, j.part,
                JSON.stringify(content), docs[0].id, n]);
            const questionId = qr.rows[0].id;
            qTotal += 1;

            for (let i = 0; i < q.options.length; i += 1) {
              const o = q.options[i];
              await c.query(
                `insert into question_options
                   (question_id, option_label, option_text, is_correct, correct_evidence, display_order)
                 values ($1,$2,$3,$4,$5,$6)`,
                [questionId, o.label, o.text, !!o.correct,
                  o.correct ? (q.explain ?? null) : null, i + 1]);
              oTotal += 1;
            }
          }
        }
        await c.query('commit');
        console.log(`  ✓ ${j.lecture}`);
      } catch (err) {
        await c.query('rollback');
        console.error(`  ✗ ${j.lecture}: ${err.message}`);
      }
    }
    console.log(`\n지문 ${psgTotal} · 문장 ${sTotal} · 문항 ${qTotal} · 보기 ${oTotal} 반영 (근거 문장 ${evTotal})`);
    console.log('다음: node scripts/build-lecture-items.js --go  &&  node scripts/relink-audio.js --go');
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
