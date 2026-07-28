/**
 * 아이템 도출 — docs/db-restructure-plan.md §7 STEP 4
 *
 * 아이템 = **레일이 한 바퀴 도는 단위**. 문항도 강의도 아니다.
 *   P1·P2·P5  → 문항 1개가 한 바퀴 (사진 1장 / 질문 1개 / 문장 1개)
 *   P3·P4·P6·P7 → 지문 1개가 한 바퀴 (지문 하나에 하위문항 N개)
 *
 * 왜 이렇게 갈리나 (계획서 §3 원리 1, 실측):
 *   Part6 레일 11턴은 **이미 빈칸 4개를 훑는다.** 문항 수로 곱하면 44턴 = 4배 중복.
 *   반대로 Part1 은 사진마다 한 바퀴 돌아야 하는데 지금 화면은 앵커 1장만 돌고 끝난다.
 *
 * 이 스크립트가 하는 일
 *   questions(+passage_id, content->>'stage') → lecture_items / item_questions
 *   수업(lesson)과 실전(practice)은 따로 센다. seq 는 각 phase 안에서 1부터.
 *
 * 사용
 *   node scripts/build-lecture-items.js         # dry run
 *   node scripts/build-lecture-items.js --go    # 반영 (해당 강의 아이템을 지우고 다시 만든다)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { Client } = require('pg');

const GO = process.argv.includes('--go');

/** 지문 1개가 한 바퀴인 파트. 나머지는 문항 1개가 한 바퀴 */
const PASSAGE_ITEM_PARTS = new Set([3, 4, 6, 7]);

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows } = await c.query(`
      select q.id, q.question_code, q.part, q.passage_id, q.question_type_id,
             q.display_order, coalesce(q.content->>'stage','lesson') as phase,
             l.id as lecture_id, l.lecture_code
        from questions q join lectures l on l.id = q.lecture_id
       order by l.lecture_code, q.question_code`);

    /* 강의 × phase 별로 아이템을 만든다 */
    const byLecture = new Map();
    for (const r of rows) {
      const key = `${r.lecture_code}|${r.phase}`;
      if (!byLecture.has(key)) byLecture.set(key, { ...r, questions: [] });
      byLecture.get(key).questions.push(r);
    }

    const planned = [];   // { lecture_code, lecture_id, phase, items: [{ key, passage_id, type_id, questions[] }] }
    const warnings = [];

    for (const [key, g] of byLecture) {
      const byPassage = PASSAGE_ITEM_PARTS.has(g.part);
      const items = new Map();
      for (const q of g.questions) {
        if (byPassage && !q.passage_id) {
          warnings.push(`${q.question_code}: P${q.part}는 지문 단위인데 passage_id 가 없다 → 문항 단위로 처리 (build-passages.js 먼저 돌릴 것)`);
        }
        const k = byPassage && q.passage_id ? `psg:${q.passage_id}` : `q:${q.id}`;
        if (!items.has(k)) items.set(k, { passage_id: byPassage && q.passage_id ? q.passage_id : null, type_id: q.question_type_id, questions: [] });
        items.get(k).questions.push(q);
      }
      // 아이템 안의 문항 순서 = display_order → 코드
      for (const it of items.values()) {
        it.questions.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
          || a.question_code.localeCompare(b.question_code));
        if (!it.type_id) it.type_id = it.questions.find((q) => q.question_type_id)?.question_type_id ?? null;
      }
      planned.push({
        lecture_code: g.lecture_code, lecture_id: g.lecture_id, phase: g.phase,
        items: [...items.values()].sort((a, b) =>
          a.questions[0].question_code.localeCompare(b.questions[0].question_code)),
        part: g.part,
      });
      void key;
    }

    planned.sort((a, b) => a.lecture_code.localeCompare(b.lecture_code) || a.phase.localeCompare(b.phase));

    /* ── 리포트 ── */
    console.log(`강의×단계 ${planned.length}묶음 · 아이템 ${planned.reduce((n, p) => n + p.items.length, 0)}개\n`);
    for (const p of planned) {
      const unit = PASSAGE_ITEM_PARTS.has(p.part) ? '지문' : '문항';
      console.log(`  ${p.lecture_code.padEnd(10)} ${p.phase.padEnd(8)} 아이템 ${String(p.items.length).padStart(2)} (${unit} 단위)` +
        `  ← 문항 ${p.items.reduce((n, i) => n + i.questions.length, 0)}`);
    }
    if (warnings.length) {
      console.log('\n경고');
      warnings.forEach((w) => console.log(`  ! ${w}`));
    }

    if (!GO) { console.log('\n(dry run) 반영하려면 --go'); return; }

    /* ── 쓰기 ── */
    let itemN = 0, linkN = 0;
    for (const p of planned) {
      await c.query('begin');
      try {
        await c.query('delete from lecture_items where lecture_id = $1 and phase = $2', [p.lecture_id, p.phase]);
        for (let i = 0; i < p.items.length; i += 1) {
          const it = p.items[i];
          const res = await c.query(
            `insert into lecture_items (lecture_id, seq, question_type_id, passage_id, phase)
             values ($1,$2,$3,$4,$5) returning id`,
            [p.lecture_id, i + 1, it.type_id, it.passage_id, p.phase],
          );
          const itemId = res.rows[0].id;
          itemN += 1;
          for (let j = 0; j < it.questions.length; j += 1) {
            await c.query(
              'insert into item_questions (item_id, question_id, sub_order) values ($1,$2,$3)',
              [itemId, it.questions[j].id, j + 1],
            );
            linkN += 1;
          }
        }
        await c.query('commit');
      } catch (err) {
        await c.query('rollback');
        console.error(`FAIL ${p.lecture_code}/${p.phase}: ${err.message}`);
      }
    }
    console.log(`\n아이템 ${itemN}개 · 문항 링크 ${linkN}건 반영`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
