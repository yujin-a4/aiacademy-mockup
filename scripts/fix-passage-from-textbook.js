/**
 * 파서가 못 살린 지문을 **교재 원본과 눈으로 대조해** 바로잡는다.
 *
 * 왜 필요한가 — 파서로는 못 넘는 두 가지가 있다
 *   1) **그림 자료**(도면·시간표·표). 교재 PDF 안에서 선으로 그린 그림이라 파서는 그 위에 떠 있는
 *      낱말만 줍는다. 실측: RC-P7-08 실전 지문 3(상가 도면)이 "Unit 103 Unit 104" 한 줄이었는데,
 *      200번이 **바로 그 도면을 봐야 푸는 문제**였다.
 *   2) **2단으로 조판된 기사**. 두 단의 시작 높이가 달라 오른단이 먼저 읽히면 기사가 거꾸로 붙는다.
 *      (파서에서 '세로로 겹치면 단 우선' 규칙을 시도했으나 2개 고치고 3개를 깨뜨려 되돌렸다 —
 *       전 10회차에 11곳이지만 **강의에 실린 건 여기 적은 것뿐**이라 지문 단위로 바로잡는다)
 *
 * 여기 값은 전부 교재를 옮긴 것이다 — 지어낸 문장은 없다.
 * 문항을 재적재하면 지문이 새로 생기므로(`load-rc-questions.js`) **그 뒤에 다시 돌릴 것.**
 *
 * 사용
 *   node scripts/fix-passage-from-textbook.js          # dry run
 *   node scripts/fix-passage-from-textbook.js --go
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { Client } = require('pg');

const GO = process.argv.includes('--go');

const FIXES = [
  /* ───────── RC-P6-01 실전 (교재 TEST 5 · 139-142) ─────────
     이메일인데 **머리글이 통째로 없다**(옛 하드코딩 로더가 안 넣었다). 화면은 kind=email 이면
     회색 메일 창을 씌우는데 머리글이 비어 있어 빈 판이 나온다. 교재 그대로 채운다. */
  {
    passage: 'RC-P6-01-PSG2',
    meta: [
      { k: 'To', v: 'Chloe Boyce <cboyce@merigoldcomm.com>' },
      { k: 'From', v: 'Arlington Sanitation Services <sanitation@arlington.gov>' },
      { k: 'Date', v: 'January 2' },
      { k: 'Subject', v: 'Missed collection' },
    ],
  },

  /* ───────── RC-P7-07 실전 (교재 TEST 2 · 186-190) ─────────
     머리말이 'e-mails and schedule'(이메일 **둘** + 일정표)인데 파서는 복수형을 못 세어
     지문을 2개로 잡았다. 그래서 두 번째 상자에 **일정표 + 두 번째 이메일이 통째로 뭉쳤고**,
     일정표는 표가 아니라 한 줄 410자 덩어리가 됐다. 셋으로 가른다. */
  {
    passage: 'RC-P7-07-PSG2-2',
    title: 'Training Schedule',
    kind: 'table',
    meta: [],
    table: {
      headers: ['Date', 'Software', 'Time', 'Location'],
      rows: [
        ['May 26', 'Calacad', '9:00 a.m.–11:00 a.m.', 'Online'],
        ['May 30', 'Skeddit', '9:00 a.m.–10:30 a.m.', 'Conference Room A'],
        ['June 1', 'Skeddit', '1:00 p.m.–2:30 p.m.', 'Conference Room A'],
        ['June 5', 'Calacad', '2:00 p.m.–4:00 p.m.', 'Online'],
        ['June 7', 'Skeddit', '10:00 a.m.–11:30 a.m.', 'Conference Room A'],
        ['June 12', 'Skeddit', '3:30 p.m.–5 p.m.', 'Conference Room A'],
      ],
    },
    sentences: ['The Web link for the online training will be sent to participants upon registration.'],
  },
  {
    /* 세 번째 지문이 **없었다** — 만들어 넣는다(같은 set_code, set_seq 3) */
    passage: 'RC-P7-07-PSG2-3',
    create: { setCode: 'RC-P7-07-SET2', setSeq: 3 },
    kind: 'email',
    title: 'E-Mail message',
    meta: [
      { k: 'To', v: 'James Buckley' },
      { k: 'From', v: 'Lisa Chang' },
      { k: 'Subject', v: 'Re: Upcoming software training' },
      { k: 'Date', v: 'May 15' },
    ],
    sentences: [
      'Hi James,',
      'I’ll need to take both of those trainings, but I have a meeting on the morning of May 26.',
      'It’s with important external partners and I can’t move it.',
      'Then I’ll be out of the country on vacation from May 29 through June 9.',
      'In this situation, what do you recommend I do about the Calacad training?',
      'Thanks,',
      'Lisa',
    ],
  },

  /* ───────── RC-P7-08 수업 (교재 TEST 2 · 191-195) ─────────
     'e-mail, schedule, and notice' 세 지문은 제대로 갈렸는데, **버스 시간표가 표로 안 서고**
     그 뒤 공지의 첫 문단까지 같은 상자에 딸려 들어갔다(497자 한 줄).
     194번이 "어느 노선이 임시로 바뀌었나"라 시간표와 공지를 나란히 봐야 푸는 문제다. */
  {
    passage: 'RC-P7-08-PSG1-1',
    /* 교재 머리글이 'Subject: RE: Visit' 인데 파서가 'RE:' 를 라벨로 또 떼어 제목이 비었다 */
    meta: [
      { k: 'To', v: 'shinju.kaneko@zipmail.com' },
      { k: 'From', v: 's.armstrong@oknet.com' },
      { k: 'Date', v: 'October 14' },
      { k: 'Subject', v: 'RE: Visit' },
    ],
  },
  {
    passage: 'RC-P7-08-PSG1-2',
    title: 'Harrington Airport Bus Schedule',
    kind: 'table',
    table: {
      headers: ['#', 'Route', 'First Bus', 'Last Bus'],
      rows: [
        ['410', 'Airport → Downtown', '6:20 a.m.', '9:50 p.m.'],
        ['412', 'Airport → Downtown → Belmont', '6:05 a.m.', '10:05 p.m.'],
        ['437', 'Airport → Riverfront → Abbott Heights', '6:25 a.m.', '9:55 p.m.'],
        ['450', 'Airport → Edgewood', '6:15 a.m.', '9:45 p.m.'],
        ['462', 'Airport → Market District → Belmont', '6:10 a.m.', '10:10 p.m.'],
        ['470', 'Airport → Abbott Heights', '6:30 a.m.', '10:00 p.m.'],
      ],
    },
    sentences: ['Seven days per week, year-round'],
  },
  {
    /* 공지 — 앞 문단(임시 변경 안내)이 시간표 상자에 붙어 있어 여기엔 뒷 문단만 있었다 */
    passage: 'RC-P7-08-PSG1-3',
    title: 'HARRINGTON AIRPORT BUSES',
    sentences: [
      'Today (October 19), the airport bus to Edgewood will stop on Bishop Street instead of Yeager Avenue.',
      'This change is necessary because of road closures for the Fall Festival.',
      'For details, visit the tourism desk.',
      'All bus passengers should be advised that, as always, your baggage cannot be placed on a seat unless you have bought the ticket for that specific seat.',
      'Otherwise, the baggage must be stored underneath the bus.',
      'The bus driver will help you load and unload it safely.',
    ],
  },

  {
    /* YBM 실전토익 RC 1000 TEST 2 · 196-200 삼중 지문의 **첫 지문**(2단 기사).
       왼단이 먼저다: 왼단 끝 "…establish a courtyard and a" + 오른단 첫머리 "small green area…"가
       한 문장이라, 순서가 뒤집히면 문장이 두 동강 난 채로 앞뒤가 바뀐다. */
    passage: 'RC-P7-08-PSG2-1',
    title: 'Clemente Street Lot',
    sentences: [
      'HAYWARD (March 2)—The Hayward City Council is exploring various options for the future of a 5-acre city-owned lot located on Clemente Street.',
      'Bids and proposals are being accepted at this time, with the Greenway Collaborative, a local environmental group, advocating for leaving the lot empty and in the city’s possession.',
      'Hillview Property Development is interested in purchasing the lot.',
      'It intends to build Marshall Plaza, a small building with space for retail business, and establish a courtyard and a small green area with trees, benches, and flower gardens that would be designated for public use.',
      '“Our planned combination of retail units and green space is a viable solution for this neighborhood, which is in critical need of revitalization,” said Luoyang Meng, a Hillview Property Development representative.',
      '“Our company has the resources to create an attractive and thriving retail center as well as the expertise to minimize disruptions to wildlife habitats.',
      'We hope to have the opportunity to showcase our skills.”',
    ],
  },
  {
    /* 같은 세트의 **두 번째 지문**(이메일).
       교재 조판이 값을 라벨 **위**에 찍어서(‘Rental inquiry’ / ‘Subject:’ 순서) 파서가
       제목 자리에 **인사말**을 넣고, 제목을 본문 첫머리로 밀어 넣었다.
       제목은 'Rental inquiry', 인사말은 본문 첫 줄이 맞다. 끝에 붙은 'Marshall Plaza Retail Units'
       는 옆 도면의 제목이 새어 든 것이라 뺀다. */
    passage: 'RC-P7-08-PSG2-2',
    title: 'E-Mail message',
    meta: [
      { k: 'From', v: 'Clifford Mullen <clifford@busybbakery.com>' },
      { k: 'To', v: 'Racquel Shaw <r_shaw@hillviewprop.com>' },
      { k: 'Date', v: 'November 18' },
      { k: 'Subject', v: 'Rental inquiry' },
    ],
    sentences: [
      'Dear Ms. Shaw,',
      'I own the Busy Bee Bakery downtown, and I am interested in renting a second location to sell my baked goods.',
      'Marshall Plaza would be ideal for my business because of the anticipated foot traffic.',
      'I am also drawn to the convenience of the easy access to public transportation and the unloading area in the back.',
      'I need at least three hundred square meters of space, but I do not want cooking facilities, as our staff will bake at our main site and just deliver the goods to the secondary site.',
      'I’m also wondering if you could tell me the average rates for water, electricity, and gas.',
      'I know that these are not included in the monthly rental fee.',
      'Thanks for the information,',
      'Clifford Mullen',
    ],
  },
  {
    /* 같은 세트의 **세 번째 자료** — 상가 도면.
       교재는 2행 3열 도면으로 그렸다(위: 102·103·104 / 아래: 101·안뜰·105). 화면 표는 칸 안에서
       줄바꿈이 안 되므로 호실 목록으로 세운다 — 배치 자체는 어느 문항도 쓰지 않는다.
       200번은 면적(300 m² 이상) · 입주 가능 여부 · 주방 유무로 갈린다. */
    passage: 'RC-P7-08-PSG2-3',
    title: 'Marshall Plaza Retail Units',
    kind: 'table',
    table: {
      headers: ['Unit', 'Size', 'Status'],
      rows: [
        ['Unit 101', '225 m²', 'Available'],
        ['Unit 102', '320 m²', 'Available'],
        ['Unit 103', '270 m²', 'Available'],
        ['Unit 104', '350 m²', 'Benny’s Sweet Shop'],
        ['Unit 105', '315 m²', 'Available / Includes kitchen'],
        ['Courtyard', '—', 'Between Units 101 and 105'],
      ],
    },
    sentences: [],          // 교재 도면에 문장이 없다
  },
];

/* ── 문단이 한 문장으로 들어간 지문 ──
   옛 하드코딩 로더가 문단을 통째로 한 줄씩 넣었다. 화면은 문장 단위로 짚고 칠하므로
   근거 한 문장을 짚으면 **문단 전체가 칠해진다**. 여기 적은 지문만 문장으로 쪼갠다.
   (쪼개기만 한다 — 글자는 안 건드린다) */
const SPLIT_LONG = ['RC-P7-03-PSG1', 'RC-P7-03-PSG2', 'RC-P7-03-PSG3', 'RC-P7-99-PSG1'];

/* 해설이 **한국어뿐**이라 근거 문장을 기계로는 못 찾는 문항. 지문에서 골라 적는다(화면 형광펜 대상) */
const EVIDENCE = {
  'RC-P7-03-Q002': '• Office furniture: up to 35% off',
};

const ABBR = [
  'Mr', 'Ms', 'Mrs', 'Dr', 'Inc', 'Ltd', 'Jr', 'Sr', 'St', 'vs', 'No', 'Ave',
].map((a) => `(?<!\\b${a}\\.)`).join('') + '(?<!a\\.m\\.)(?<!p\\.m\\.)(?<!A\\.M\\.)(?<!P\\.M\\.)';
const SENT_SPLIT = new RegExp(`${ABBR}(?<=[.!?])["')\\]]*\\s+(?=[A-Z("'•])`);

const splitSentences = (s) => s.split(SENT_SPLIT).map((x) => x.trim()).filter(Boolean);

/* 근거 문장 — 지문 문장이 바뀌면 예전에 붙여 둔 값이 어디에도 안 걸린다(화면 형광펜이 죽는다).
   해설(정답 보기의 correct_evidence)에서 다시 찾는다. load-rc-questions.js 와 같은 규칙. */
const words = (s) => (s.toLowerCase().match(/[a-z]{3,}/g) ?? []);
function evidenceOf(explain, sentences) {
  /* 인용 표기가 두 갈래다 — 교재 해설은 **괄호**, 손으로 쓴 해설은 **큰따옴표**.
     괄호만 보다가 손으로 쓴 강의(RC-P7-03·P7-99)의 근거를 통째로 못 찾았다. */
  const src = explain ?? '';
  const quotes = [
    ...[...src.matchAll(/\(([^()]{12,400})\)/g)].map((m) => m[1]),
    ...[...src.matchAll(/[“"]([^”"]{12,400})[”"]/g)].map((m) => m[1]),
  ].map((s) => s.trim()).filter((s) => /[a-z]{3}/.test(s) && !/[가-힣]/.test(s));
  /* 인용 표시 없이 **해설 자체가 영어 원문**인 경우도 있다(손으로 쓴 강의) */
  if (!quotes.length && /[a-z]{3}/.test(src) && !/[가-힣]/.test(src)) quotes.push(src.trim());
  if (!quotes.length || !sentences.length) return null;
  const qw = new Set(words(quotes.sort((a, b) => b.length - a.length)[0]));
  if (qw.size < 3) return null;
  let best = null;
  for (const en of sentences) {
    const sw = words(en);
    if (!sw.length) continue;
    const hit = sw.filter((w) => qw.has(w)).length / qw.size;
    if (!best || hit > best.hit) best = { en, hit };
  }
  return best && best.hit >= 0.5 ? best.en : null;
}

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const touched = new Set();
    for (const f of FIXES) {
      const { rows } = await c.query(
        `select p.id, p.set_code, p.kind, p.title,
                (select count(*) from passage_sentences s where s.passage_id = p.id) sents
           from passages p where p.passage_code = $1`, [f.passage]);
      let p = rows[0];
      if (!p && !f.create) { console.error(`✗ ${f.passage}: passages 에 없다 (create 를 주면 만든다)`); continue; }

      const what = [
        f.sentences ? `문장 ${p ? p.sents : 0} → ${f.sentences.length}` : null,
        f.table ? `표 ${f.table.rows.length}행` : null,
        f.meta ? `머리글 ${f.meta.length}줄` : null,
      ].filter(Boolean).join(' · ');
      console.log(`${GO ? '✓' : '·'} ${p ? '' : '[신설] '}${f.passage.padEnd(18)} ${what}  ${f.title ? `"${f.title}"` : ''}`);
      if (!GO) continue;

      if (!p) {
        /* 지문이 통째로 빠진 경우 — 세트에 자리를 만들어 넣는다(머리말 복수형을 파서가 못 셌다) */
        const ins = await c.query(
          `insert into passages (passage_code, kind, title, set_code, set_seq) values ($1,$2,$3,$4,$5) returning id, set_code, kind`,
          [f.passage, f.kind ?? 'text', f.title ?? null, f.create.setCode, f.create.setSeq]);
        p = ins.rows[0];
      }

      await c.query(
        `update passages set title = coalesce($1, title), kind = $2,
                             body = case when $3::jsonb is null then body else $3::jsonb end,
                             meta = coalesce($4, meta)
          where id = $5`,
        [f.title ?? null, f.kind ?? p.kind,
          f.table ? JSON.stringify({ table: f.table }) : null,
          f.meta ? JSON.stringify(f.meta) : null, p.id]);

      /* 문장은 **준 경우에만** 갈아 끼운다 — 머리글만 고치는 항목이 있다 */
      if (f.sentences) {
        await c.query('delete from passage_sentences where passage_id = $1', [p.id]);
        for (let i = 0; i < f.sentences.length; i += 1) {
          await c.query('insert into passage_sentences (passage_id, seq, en) values ($1,$2,$3)', [p.id, i + 1, f.sentences[i]]);
        }
      }
      touched.add(p.set_code ?? `id:${p.id}`);
    }

    /* 문단 → 문장 쪼개기 */
    for (const code of SPLIT_LONG) {
      const { rows } = await c.query(
        `select p.id, p.set_code, (select json_agg(json_build_object('seq',s.seq,'en',s.en) order by s.seq)
                                     from passage_sentences s where s.passage_id = p.id) sents
           from passages p where p.passage_code = $1`, [code]);
      if (!rows.length) { console.error(`✗ ${code}: passages 에 없다`); continue; }
      const p = rows[0];
      const before = (p.sents ?? []).map((s) => s.en);
      const after = before.flatMap(splitSentences);
      /* 이미 쪼개져 있어도 **근거 재매칭 대상에는 넣는다** — 재실행이 스스로 고쳐야 한다 */
      if (GO) touched.add(p.set_code ?? `id:${p.id}`);
      if (after.length === before.length) { console.log(`· ${code.padEnd(18)} 쪼갤 문단 없음 (근거만 다시 맞춘다)`); continue; }
      console.log(`${GO ? '✓' : '·'} ${code.padEnd(18)} 문장 ${before.length} → ${after.length} (문단 쪼갬)`);
      if (!GO) continue;
      await c.query('delete from passage_sentences where passage_id = $1', [p.id]);
      for (let i = 0; i < after.length; i += 1) {
        await c.query('insert into passage_sentences (passage_id, seq, en) values ($1,$2,$3)', [p.id, i + 1, after[i]]);
      }
    }

    if (!GO) { console.log('\n(dry run) 넣으려면 --go'); return; }

    /* 지문이 바뀐 **묶음**의 문항을 다시 맞춘다 — 근거 문장·근거 지문 번호·폴백 지문 문자열.
       이중·삼중은 set_code 로, 단일 지문은 그 지문 하나로 묶는다. */
    for (const key of touched) {
      const single = key.startsWith('id:');
      const { rows: docs } = await c.query(
        single
          ? `select p.id, p.body, (select json_agg(s.en order by s.seq) from passage_sentences s where s.passage_id = p.id) sents
               from passages p where p.id = $1`
          : `select p.id, p.body, (select json_agg(s.en order by s.seq) from passage_sentences s where s.passage_id = p.id) sents
               from passages p where p.set_code = $1 order by p.set_seq`,
        [single ? key.slice(3) : key]);
      const perDoc = docs.map((d) => [
        ...(d.sents ?? []),
        ...(d.body?.table ? d.body.table.rows.map((r) => r.join(' ')) : []),
      ]);
      const all = perDoc.flat();
      const flat = all.join('\n');

      const { rows: qs } = await c.query(
        `select q.id, q.question_code, q.content,
                (select o.correct_evidence from question_options o
                  where o.question_id = q.id and o.is_correct limit 1) explain
           from questions q where q.passage_id = any($1) order by q.display_order`,
        [docs.map((d) => d.id)]);

      for (const q of qs) {
        /* ⚠️ 근거는 **손으로 넣어 둔 값이 있을 수 있다**(옛 로더가 문항마다 적었다).
           못 찾았다고 지우면 그 손값이 날아간다 — 실제로 한 번 날렸다. 순서를 지킨다:
             1) 옛 값이 아직 문장 목록에 그대로 있으면 그대로 둔다
             2) 문단을 쪼갠 경우 — 옛 값을 품은(또는 옛 값에 담긴) 새 문장으로 옮긴다
             3) 그래도 없으면 해설에서 다시 찾는다
             4) 넷 다 실패하면 **건드리지 않는다** */
        const old = q.content.evidence_sentence;
        const norm = (s) => s.replace(/\s+/g, ' ').trim();
        let ev = old && all.includes(old) ? old : null;
        if (!ev && old) {
          ev = all.find((s) => norm(s).includes(norm(old)) || norm(old).includes(norm(s))) ?? null;
        }
        if (!ev) ev = evidenceOf(q.explain, all);
        if (!ev && EVIDENCE[q.question_code] && all.includes(EVIDENCE[q.question_code])) ev = EVIDENCE[q.question_code];

        /* 폴백 지문 문자열 — Part 6 는 빈칸 마커가 다른 `passage_context` 를 쓴다(형식이 다르다).
           원래 없던 파트에 passage_text 를 새로 만들지 않는다. */
        const content = { ...q.content };
        if ('passage_text' in content) content.passage_text = flat;
        if (ev) content.evidence_sentence = ev;
        /* 근거가 **몇 번째 지문**에 있는지도 다시 잡는다 — 강사 레일이 그 탭을 연다.
           지문이 하나 늘면(여기서 신설한 세 번째 이메일) 예전 번호가 남의 지문을 가리킨다. */
        const docNo = ev ? 1 + perDoc.findIndex((lines) => lines.includes(ev)) : 0;
        if (docNo > 0 && docs.length > 1) content.evidence_passage = String(docNo);
        else if (docs.length <= 1) delete content.evidence_passage;
        await c.query('update questions set content = $1 where id = $2', [JSON.stringify(content), q.id]);
        const how = ev === old ? '그대로' : ev ? (old ? '옮김' : '해설에서') : '없음';
        console.log(`    ${q.question_code}  근거 ${ev ? `지문${docNo} (${how}) → "${ev.slice(0, 40)}…"` : '없음'}`);
      }
    }
    console.log('\n반영 완료');
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
