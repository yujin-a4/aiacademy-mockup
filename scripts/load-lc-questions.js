/**
 * 추출한 LC 문항(scripts/_lc_test{N}.json) → DB 적재 (Part 2·3·4)
 *
 * 배경: 정규 커리큘럼 42강 중 LC 14강. 레일·아이템·화면은 다 되는데 문항만 없었다.
 *   교재 PDF → scripts/extract_lc_pdf.py → 이 스크립트 → DB.
 *
 * ⚠️ 시트 동기화는 중단됐고(2026-07-28) **DB 가 문항의 정본**이다.
 *    그래서 여기서 DB 에 직접 쓴다. 예전에 load-toeic-*.js 를 막았던 이유(크론이 덮음)는 사라졌다.
 *
 * 넣는 것
 *   passages + passage_sentences  (P2 질문 발화 · P3 대화 · P4 담화, 시각자료는 body.table)
 *   questions + question_options  (오답 근거·오답 태그 포함)
 * 넣은 뒤에는 반드시
 *   node scripts/build-lecture-items.js --go   (아이템 연결)
 *   node scripts/relink-audio.js --go          (있는 mp3 다시 잇기 — **먼저**)
 *   node scripts/gen_lc_audio.js --go          (없는 문장만 새로 합성)
 *
 * 사용
 *   python scripts/extract_lc_pdf.py --test N --out scripts/_lc_testN.json   (아래 TESTS 회차만큼)
 *   node scripts/load-lc-questions.js         # dry run
 *   node scripts/load-lc-questions.js --go
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const GO = process.argv.includes('--go');
const TESTS = [1, 2, 3, 5, 6];        // 쓰는 회차만 읽는다

/* --lecture LC-P3-05 → 그 강의만 손댄다.
   전체 재적재는 멀쩡한 강의의 문항 id 까지 새로 만들어 음원 연결을 끊는다(relink-audio 필요).
   한 강의만 고칠 때 그 대가를 치를 이유가 없다. 겹침 검사는 **계획 전체**로 그대로 돈다. */
const onlyArg = process.argv.indexOf('--lecture');
const ONLY = onlyArg > -1 ? process.argv[onlyArg + 1] : null;

/* ── 시각자료(그래픽 연계) ──
   교재의 표는 PDF 안에서 선으로 그린 그림이라 파서가 못 뽑는다. 본권 쪽에서 눈으로 옮겨 적는다.
   화면은 `passages.body.table` 을 그대로 그린다(fromDb 의 lcVisual). */
const VISUAL_WORKSHOP = {
  visual_title: '시각자료 · Staff Development Day',   // 본권 TEST 6 p.97 에서 옮겨 적음
  table: {
    headers: ['Workshop', 'Time'],
    rows: [
      ['Introduction to Upcoming Products', '1:00 p.m.'],
      ['Good Customer Service', '2:00 p.m.'],
      ['How to Arrange Displays', '3:00 p.m.'],
      ['Career Paths at Venegas Fashion', '4:00 p.m.'],
    ],
  },
};

/* ── 무엇을 어느 강의에 넣을까 ──
   교재가 준 유형 라벨(P2 '부가 의문문', P4 '전화 메시지')을 강의 제목과 맞춘 것이다. 추측이 아니다.
   Part 3 만은 교재에 주제 라벨이 없어 대화 내용을 읽고 골랐다(무슨 대화인지 주석에 적어둔다).
   **문항 겹침 0** — 한 세트(P2 는 한 문항)는 한 강의의 수업 또는 실전 딱 한 곳에만 쓴다.
   (아래 겹침 검사가 어기면 멈춘다) */
const PLAN = [
  /* Part 2 — 질문 1 + 응답 3. 세트가 아니라 문항 단위라 회차·번호로 집는다 */
  { lecture: 'LC-P2-01', part: 2,                                   // 의문사 의문문
    lesson: { test: 1, nos: [7, 8, 10] }, practice: { test: 1, nos: [11, 12, 14] } },
  { lecture: 'LC-P2-02', part: 2,                                   // 일반 의문문(부정·조동사·Be동사)
    lesson: { test: 1, nos: [9, 18, 23] }, practice: { test: 2, nos: [10, 15, 24] } },
  { lecture: 'LC-P2-03', part: 2,                                   // 기타 의문문(선택·부가·요청)
    lesson: { test: 1, nos: [13, 21, 22] }, practice: { test: 2, nos: [19, 21, 25] } },
  { lecture: 'LC-P2-04', part: 2,                                   // 평서문·간접 의문문·우회 응답
    lesson: { test: 1, nos: [24, 25], plus: { test: 2, nos: [17] } },
    practice: { test: 3, nos: [15, 22, 27] } },

  /* ── Part 3·4 실전은 **세트 3개**를 이어 푼다 ──
     실제 시험이 (음원 1 + 문항 3) 세트가 줄줄이 이어지는 구조다. 한 세트만 풀면 시험 감각이 안 산다.
     practice 를 배열로 주면 세트가 순서대로 실린다(지문이 세트마다 따로 생기고, 화면이 그 경계로 묶는다). */
  { lecture: 'LC-P3-01', part: 3,                                   // 고객·직원 대화
    lesson: { test: 1, range: '35-37' },      // 극장 매표소
    practice: [
      { test: 1, range: '38-40' },            // 사진관
      { test: 2, range: '47-49' },            // 배수구 막힘 — 매장 직원의 제품 추천
      { test: 6, range: '35-37' },            // 자전거 브레이크 교체 문의
    ] },
  { lecture: 'LC-P3-02', part: 3,                                   // 사무실·동료 대화
    lesson: { test: 1, range: '41-43' },      // 사무실 이전 소식을 두고 동료끼리
    practice: [
      { test: 2, range: '56-58' },            // 사내 새 웹사이트 이야기
      { test: 1, range: '50-52' },            // 사내 수상 소식을 두고 동료끼리
      { test: 3, range: '44-46' },            // 자리를 비운 동료를 찾는 3인 대화
    ] },
  { lecture: 'LC-P3-03', part: 3,                                   // 문제 상황·해결 대화
    lesson: { test: 1, range: '47-49' },      // 차 고장 — 연료 필터 교체
    practice: [
      { test: 5, range: '56-58' },            // 촬영용 모형이 제때 안 나온 문제
      { test: 6, range: '32-34' },            // 사내 메신저 답장이 안 나가는 문제
      { test: 3, range: '53-55' },            // 청구서가 40달러 더 나온 문제
    ] },
    /* ↑ T2 38-40(청구서 오류)이 주제로는 더 맞지만 파서가 문항을 2개만 건졌다.
       실전은 3문항이 기본이라 3문항 세트로 바꿨다. */
  { lecture: 'LC-P3-04', part: 3,                                   // 일정·회의 대화
    lesson: { test: 1, range: '53-55' },      // 인턴십 프로그램 논의
    practice: [
      { test: 1, range: '32-34' },            // 약속 상대를 못 찾는 상황
      { test: 5, range: '32-34' },            // 출장 항공편을 앞당긴 일정 변경
      { test: 3, range: '41-43' },            // TV 광고 진행 상황 점검
    ] },
  /* LC-P3-05 는 수업(주문·배송 대화 + 가격표 시각자료)이 **손으로 만든 세트**라 파서로 다시 못
     만든다 → 수업은 그대로 두고(append) 실전만 통째로 다시 쓴다(replacePhase). */
  { lecture: 'LC-P3-05', part: 3, append: true, replacePhase: 'practice',   // 주문·배송 대화
    practice: [
      { test: 3, range: '38-40' },            // 세탁기 배송 시간 안내 + 설치 요청
      { test: 1, range: '59-61' },            // 자전거 주문 출하 일정
      { test: 1, range: '65-67' },            // 사무용품 배송 도착 + 송장(시각자료)
    ] },

  /* Part 4 — 담화 1 + 문항 3 */
  /* 시각자료가 붙는 담화는 이 강의의 **수업**에 둔다 — 유형 그리드 t06(담화 표/자료형)이
     여기로 들어오는데, 실전에만 있으면 카드가 실전으로 건너뛰어야 해서 낯설다.
     일반형 담화(t05)는 LC-P4-02(전화 메시지) 수업이 대신 보여준다. */
  { lecture: 'LC-P4-01', part: 4,                                    // 안내 방송·공지
    lesson: { test: 6, range: '95-97', visual: VISUAL_WORKSHOP },     // 안내 + 워크숍 일정표 ← t06
    practice: [
      { test: 1, range: '77-79' },            // 공지
      { test: 1, range: '92-94' },            // 검사실 공지
      { test: 5, range: '92-94' },            // 창고 근무 공지
    ] },
  { lecture: 'LC-P4-02', part: 4,                                    // 전화 메시지·녹음 안내
    lesson: { test: 1, range: '71-73' },
    practice: [
      { test: 2, range: '80-82' },            // 전화 메시지
      { test: 1, range: '80-82' },            // 자동 응답 메시지(녹음 안내) — 강의명 '녹음 안내' 에 딱 맞는다
      { test: 2, range: '83-85' },            // 숙박업소에 남긴 전화 메시지
    ] },
  /* ⚠️ 광고·홍보는 **교재에 담화가 더 없다.** TEST 1·2·3·5·6 의 미사용 Part 4 세트에 [광고] 라벨이
     하나도 없어서, 홍보 성격이 가장 가까운 관광·강좌 안내로 채웠다. 진짜 광고 세트가 필요하면
     다른 회차를 더 파싱하거나 2권을 붙여야 한다(2권 LC 파서는 아직 Part 3·4 를 못 잡는다). */
  { lecture: 'LC-P4-03', part: 4,                                    // 광고·홍보
    lesson: { test: 3, range: '71-73' },
    practice: [
      { test: 6, range: '74-76' },            // 광고
      { test: 6, range: '83-85' },            // 협곡 투어 안내 — 관광 상품 홍보(근사치)
      { test: 6, range: '80-82' },            // 기술 강좌 소개 팟캐스트 — 강좌 홍보(근사치)
    ] },
  { lecture: 'LC-P4-04', part: 4,                                    // 뉴스·보도
    lesson: { test: 2, range: '77-79' },      // 뉴스 보도
    practice: [
      { test: 1, range: '74-76' },            // 방송
      { test: 5, range: '77-79' },            // 라디오 경제 보도
      { test: 3, range: '86-88' },            // 건강 정보 방송
    ] },
  { lecture: 'LC-P4-05', part: 4,                                    // 연설·소개
    lesson: { test: 5, range: '80-82' },
    practice: [
      { test: 6, range: '89-91' },            // 연설
      { test: 3, range: '92-94' },            // 창립 25주년 기념 만찬 인사말
      { test: 2, range: '86-88' },            // 세미나 도입 — 진행자가 강좌를 소개
    ] },
];

/** 담화(P4)는 한 덩어리로 나온다 — 문장 단위 재생을 하려면 쪼개야 한다 */
function toSentences(script, part) {
  if (part !== 4) return script.map((s) => ({ speaker: s.speaker, en: s.en }));
  const out = [];
  for (const s of script) {
    for (const piece of s.en.split(/(?<=[.!?])\s+/)) {
      const en = piece.trim();
      if (en) out.push({ speaker: null, en });
    }
  }
  return out;
}

/** 회차 파일을 읽어 둔다 — 없으면 만드는 법을 알려주고 멈춘다 */
function loadTests() {
  const byTest = new Map();
  for (const t of TESTS) {
    const f = path.join(__dirname, `_lc_test${t}.json`);
    if (!fs.existsSync(f)) {
      console.error(`${f} 없음 — python scripts/extract_lc_pdf.py --test ${t} --out ${f}`);
      process.exit(1);
    }
    byTest.set(t, JSON.parse(fs.readFileSync(f, 'utf8')));
  }
  return byTest;
}

/** 계획 한 칸(sel) → 넣을 단위 배열. P2 는 문항, P3·P4 는 세트 */
function unitsOf(byTest, part, sel) {
  const take = (s) => {
    const d = byTest.get(s.test);
    if (!d) throw new Error(`TEST ${s.test} 를 안 읽었다 (TESTS 에 추가할 것)`);
    if (part === 2) {
      return s.nos.map((n) => {
        const q = d.part2.find((x) => x.no === n);
        if (!q) throw new Error(`TEST ${s.test} Q${n} 없음`);
        return { ...q, test: s.test };
      });
    }
    const set = d[`part${part}`].find((x) => x.range === s.range);
    if (!set) throw new Error(`TEST ${s.test} ${s.range} 세트 없음`);
    /* 스크립트가 빈 세트를 넣으면 **듣기 수업인데 들을 게 없는** 강의가 된다.
       해설 쪽 조판에 따라 실제로 0자로 나온 적이 있다 — 조용히 넣지 말고 여기서 멈춘다. */
    const chars = set.script.reduce((n, x) => n + x.en.length, 0);
    if (chars < 40) throw new Error(`TEST ${s.test} ${s.range} 스크립트가 비었다(${chars}자) — 파서가 못 잡았다`);
    return [{ ...set, test: s.test, visual: s.visual }];
  };
  if (!sel) return [];                    // append 계획은 한쪽(수업 또는 실전)만 채운다
  /* 배열이면 세트를 여러 개 넣는다 — P3·P4 실전은 실제 시험처럼 (음원 1 + 문항 3) 세트가 이어진다.
     지문이 세트마다 따로 생기고, 화면(fromDb.buildPractice)이 그 지문 경계로 세트를 되찾는다. */
  if (Array.isArray(sel)) return sel.flatMap((s) => take(s));
  return sel.plus ? [...take(sel), ...take(sel.plus)] : take(sel);
}

async function main() {
  const byTest = loadTests();
  const jobs = PLAN.map((p) => ({
    ...p,
    units: { lesson: unitsOf(byTest, p.part, p.lesson), practice: unitsOf(byTest, p.part, p.practice) },
  }));

  /* 겹침 검사 — 같은 문항이 두 곳에 들어가면 "수업에서 본 걸 실전에서 또 푸는" 수업이 된다 */
  const seen = new Map();
  for (const j of jobs) {
    for (const phase of ['lesson', 'practice']) {
      for (const u of j.units[phase]) {
        const key = j.part === 2 ? `T${u.test}-Q${u.no}` : `T${u.test}-${u.range}`;
        if (seen.has(key)) {
          console.error(`✗ 겹침: ${key} 를 ${seen.get(key)} 와 ${j.lecture}/${phase} 가 같이 쓴다`);
          process.exit(1);
        }
        seen.set(key, `${j.lecture}/${phase}`);
      }
    }
  }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const lectures = new Map(
      (await c.query('select id, lecture_code from lectures')).rows.map((r) => [r.lecture_code, r.id]),
    );
    const tags = new Map(
      (await c.query('select id, part, tag_name from wrong_answer_tags')).rows
        .map((r) => [`${r.part}|${r.tag_name}`, r.id]),
    );

    console.log('넣을 것\n');
    for (const j of jobs) {
      for (const phase of ['lesson', 'practice']) {
        const us = j.units[phase];
        const qn = j.part === 2 ? us.length : us.reduce((n, s) => n + s.questions.length, 0);
        const what = j.part === 2
          ? us.map((u) => `T${u.test} Q${u.no}(${u.qtype})`).join(', ')
          : us.map((u) => `T${u.test} ${u.range}${u.label ? `(${u.label})` : ''}${u.visual ? ' +시각자료' : ''}`).join(', ');
        console.log(`  ${j.lecture}  ${phase.padEnd(8)} 문항 ${qn}  ← ${what}`);
      }
    }

    if (!GO) {
      console.log('\n(dry run) 넣으려면 --go');
      const miss = jobs.filter((j) => !lectures.get(j.lecture)).map((j) => j.lecture);
      if (miss.length) console.error(`✗ lectures 에 없는 강의: ${miss.join(', ')}`);
      return;
    }

    let qTotal = 0, oTotal = 0, sTotal = 0;
    for (const j of jobs) {
      if (ONLY && j.lecture !== ONLY) continue;
      const lectureId = lectures.get(j.lecture);
      if (!lectureId) { console.error(`SKIP ${j.lecture}: lectures 에 없음`); continue; }

      await c.query('begin');
      try {
        /* 기존 것 정리 — ⚠️ 순서 주의. questions.passage_id 가 passages 를 참조하므로
           지울 지문 목록을 먼저 뽑고, 문항 → 아이템 → 지문 순으로 지운다.
           append 계획은 지우지 않는다 — 손으로 만든 시각자료 세트처럼 파서로 다시 못 만드는
           기존 문항이 있는 강의에, 없는 쪽(수업 또는 실전)만 덧붙이기 위한 것이다. */
        if (!j.append) {
          const { rows: oldPsg } = await c.query(
            `select distinct p.id from passages p
               join questions q on q.passage_id = p.id where q.lecture_id = $1`, [lectureId]);
          // 학습 로그가 문항을 참조한다 — 재적재 때 걸린다(실측). 그 강의 로그는 문항과 함께 지운다
          await c.query(
            `delete from learner_answer_log where question_id in (select id from questions where lecture_id = $1)`,
            [lectureId]);
          await c.query('delete from questions where lecture_id = $1', [lectureId]);
          // 아이템도 지문을 참조한다. 어차피 build-lecture-items.js 가 다시 만든다
          await c.query('delete from lecture_items where lecture_id = $1', [lectureId]);
          /* 실험장(0025 sandbox)이 **정본 지문을 참조**한다 — 남아 있으면 지문을 못 지운다.
             실험장은 `select sandbox.reset()` 으로 정본에서 다시 만드는 버리는 사본이다. */
          await c.query('delete from sandbox.lecture_items where lecture_id = $1', [lectureId]);
          if (oldPsg.length) await c.query('delete from passages where id = any($1)', [oldPsg.map((r) => r.id)]);
        }

        /* replacePhase: 그 단계만 통째로 다시 쓴다. append 강의에서 한쪽(예: 실전)을 늘릴 때
           안 지우면 재실행마다 같은 세트가 또 붙는다. 반대쪽(파서로 못 만드는 수업 세트)은 그대로 둔다. */
        if (j.append && j.replacePhase === 'practice') {
          const { rows: old } = await c.query(
            `select id, passage_id from questions where lecture_id = $1 and content->>'stage' = 'practice'`,
            [lectureId]);
          if (old.length) {
            const ids = old.map((r) => r.id);
            const psgs = [...new Set(old.map((r) => r.passage_id).filter(Boolean))];
            await c.query('delete from learner_answer_log where question_id = any($1)', [ids]);
            await c.query('delete from questions where id = any($1)', [ids]);
            await c.query('delete from lecture_items where lecture_id = $1', [lectureId]);
            await c.query('delete from sandbox.lecture_items where lecture_id = $1', [lectureId]);
            if (psgs.length) await c.query('delete from passages where id = any($1)', [psgs]);
          }
        }

        /* append 면 지문·문항 번호를 이미 쓰인 다음부터 — 재실행해도 같은 코드가 다시 나오면 안 된다 */
        let psgNo = 0;
        const usedQ = { lesson: 0, practice: 0 };
        if (j.append) {
          const { rows } = await c.query(
            `select question_code from questions where lecture_id = $1`, [lectureId]);
          for (const r of rows) {
            const m = /-([QP])(\d{3})$/.exec(r.question_code);
            if (m) usedQ[m[1] === 'Q' ? 'lesson' : 'practice'] = Math.max(usedQ[m[1] === 'Q' ? 'lesson' : 'practice'], Number(m[2]));
          }
          const { rows: ps } = await c.query(
            `select passage_code from passages where passage_code like $1`, [`${j.lecture}-PSG%`]);
          for (const r of ps) {
            const m = /-PSG(\d+)$/.exec(r.passage_code);
            if (m) psgNo = Math.max(psgNo, Number(m[1]));
          }
        }

        for (const phase of ['lesson', 'practice']) {
          const prefix = phase === 'lesson' ? 'Q' : 'P';
          let qNo = usedQ[phase];

          for (const u of j.units[phase]) {
            psgNo += 1;
            const code = `${j.lecture}-PSG${psgNo}`;
            const kind = j.part === 2 ? 'utterance' : j.part === 3 ? 'dialogue' : 'talk';
            const title = j.part === 2 ? '질문 발화' : (u.label || (j.part === 3 ? '대화' : '담화'));
            const pg = await c.query(
              `insert into passages (passage_code, kind, title, body) values ($1,$2,$3,$4)
               on conflict (passage_code) do update
                 set kind = excluded.kind, title = excluded.title, body = excluded.body
               returning id`,
              [code, kind, title, u.visual ? JSON.stringify(u.visual) : null]);
            const passageId = pg.rows[0].id;
            await c.query('delete from passage_sentences where passage_id = $1', [passageId]);

            const sents = j.part === 2
              ? [{ speaker: null, en: u.question }]
              : toSentences(u.script, j.part);
            for (let i = 0; i < sents.length; i += 1) {
              await c.query(
                `insert into passage_sentences (passage_id, seq, en, speaker) values ($1,$2,$3,$4)`,
                [passageId, i + 1, sents[i].en, sents[i].speaker]);
              sTotal += 1;
            }

            const qs = j.part === 2 ? [u] : u.questions;
            for (let k = 0; k < qs.length; k += 1) {
              qNo += 1;
              const q = qs[k];
              const qcode = `${j.lecture}-${prefix}${String(qNo).padStart(3, '0')}`;
              const content = {
                question_text: j.part === 2 ? u.question : q.question,
                question_number: String(qNo),
                ...(phase === 'practice' ? { stage: 'practice' } : {}),
                ...(u.qtype ? { question_type_label: u.qtype } : {}),
                ...(u.label ? { passage_type: u.label } : {}),
                source: `YBM 실전토익 LC 1000 TEST ${u.test} Q${q.no ?? u.no}`,
              };
              const qr = await c.query(
                `insert into questions (question_code, lecture_id, part, content, passage_id, display_order)
                 values ($1,$2,$3,$4,$5,$6) returning id`,
                [qcode, lectureId, j.part, JSON.stringify(content), passageId, k + 1]);
              const questionId = qr.rows[0].id;
              qTotal += 1;

              for (let i = 0; i < q.options.length; i += 1) {
                const o = q.options[i];
                const tagId = o.tag ? tags.get(`${j.part}|${o.tag}`) ?? null : null;
                await c.query(
                  `insert into question_options
                     (question_id, option_label, option_text, is_correct,
                      option_error_tag_id, option_explanation, correct_evidence, display_order)
                   values ($1,$2,$3,$4,$5,$6,$7,$8)`,
                  [questionId, o.label, o.text, !!o.is_correct, tagId,
                    o.is_correct ? null : (o.why || null),
                    o.is_correct ? (o.why || q.explain || null) : null, i + 1]);
                oTotal += 1;
              }
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
    console.log(`\n지문 문장 ${sTotal} · 문항 ${qTotal} · 보기 ${oTotal} 반영`);
    console.log('다음: build-lecture-items.js --go  →  relink-audio.js --go  →  gen_lc_audio.js --go');
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
