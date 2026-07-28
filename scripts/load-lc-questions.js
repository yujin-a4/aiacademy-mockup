/**
 * 추출한 LC 문항(scripts/_lc_test1.json) → DB 적재 (Part 2·3·4)
 *
 * 배경: 정규 커리큘럼 42강 중 24강이 문항 0개다. 레일·아이템·화면은 다 되는데 문항만 없다.
 *   교재 PDF → scripts/extract_lc_pdf.py → 이 스크립트 → DB.
 *
 * ⚠️ 시트 동기화는 중단됐고(2026-07-28) **DB 가 문항의 정본**이다.
 *    그래서 여기서 DB 에 직접 쓴다. 예전에 load-toeic-*.js 를 막았던 이유(크론이 덮음)는 사라졌다.
 *
 * 넣는 것
 *   passages + passage_sentences  (P2 질문 발화 · P3 대화 · P4 담화)
 *   questions + question_options  (오답 근거·오답 태그 포함)
 * 넣은 뒤에는 반드시
 *   node scripts/build-lecture-items.js --go   (아이템 연결)
 *   node scripts/gen_lc_audio.js --go          (음원)
 *
 * 사용
 *   node scripts/load-lc-questions.js         # dry run
 *   node scripts/load-lc-questions.js --go
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const GO = process.argv.includes('--go');
const SRC = path.join(__dirname, '_lc_test1.json');

/* ── 무엇을 어느 강의에 넣을까 ──
   교재의 유형 라벨을 강의 제목과 맞춘 것이다. 추측이 아니라 PDF 가 준 라벨을 쓴다. */
const PLAN = [
  {
    lecture: 'LC-P2-01', part: 2,                     // 의문사 의문문
    pick: (d) => {
      const wh = d.part2.filter((q) => /^(Where|When|Who|Why|How|What|Which)/.test(q.qtype || ''));
      return { lesson: wh.slice(0, 3), practice: wh.slice(3, 6) };
    },
  },
  {
    lecture: 'LC-P3-01', part: 3,                     // 고객·직원 대화
    pick: (d) => ({
      lesson: d.part3.filter((s) => s.range === '35-37'),      // 극장 매표소
      practice: d.part3.filter((s) => s.range === '38-40'),    // 사진관
    }),
  },
  {
    lecture: 'LC-P4-01', part: 4,                     // 안내 방송·공지
    pick: (d) => ({
      lesson: d.part4.filter((s) => s.range === '77-79'),      // 공지
      practice: d.part4.filter((s) => s.range === '74-76'),    // 방송
    }),
  },
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

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`${SRC} 가 없습니다 — 먼저 python scripts/extract_lc_pdf.py --test 1 --out scripts/_lc_test1.json`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));

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

    /* ── 계획 ── */
    const jobs = [];
    for (const p of PLAN) {
      const picked = p.pick(data);
      for (const phase of ['lesson', 'practice']) {
        const units = picked[phase] ?? [];
        if (!units.length) continue;
        jobs.push({ ...p, phase, units });
      }
    }

    console.log('넣을 것\n');
    for (const j of jobs) {
      const qn = j.part === 2
        ? j.units.length
        : j.units.reduce((n, s) => n + s.questions.length, 0);
      const label = j.part === 2
        ? j.units.map((u) => u.qtype).join(', ')
        : j.units.map((u) => `${u.range}${u.label ? `(${u.label})` : ''}`).join(', ');
      console.log(`  ${j.lecture}  ${j.phase.padEnd(8)} 문항 ${qn}  ← ${label}`);
    }

    if (!GO) {
      console.log('\n(dry run) 넣으려면 --go');
      console.log('※ 기존 샘플 문항(lessonsLC.ts 에서 옮겼던 것)은 지워지고 교재 문항으로 대체됩니다.');
      return;
    }

    let qTotal = 0, oTotal = 0, sTotal = 0;
    for (const p of PLAN) {
      const lectureId = lectures.get(p.lecture);
      if (!lectureId) { console.error(`SKIP ${p.lecture}: lectures 에 없음`); continue; }

      await c.query('begin');
      try {
        // 기존 문항·지문 정리 (샘플 대체).
        // ⚠️ 순서 주의 — questions.passage_id 가 passages 를 참조하므로 **문항을 먼저** 지운다.
        //    지울 지문 목록은 문항을 지우기 전에 뽑아둬야 한다.
        const { rows: oldPsg } = await c.query(
          `select distinct p.id from passages p
             join questions q on q.passage_id = p.id where q.lecture_id = $1`, [lectureId]);
        await c.query('delete from questions where lecture_id = $1', [lectureId]);
        // 아이템도 지문을 참조한다. 어차피 build-lecture-items.js 가 다시 만든다
        await c.query('delete from lecture_items where lecture_id = $1', [lectureId]);
        if (oldPsg.length) {
          await c.query('delete from passages where id = any($1)', [oldPsg.map((r) => r.id)]);
        }

        const picked = p.pick(data);
        let psgNo = 0;
        for (const phase of ['lesson', 'practice']) {
          const units = picked[phase] ?? [];
          const prefix = phase === 'lesson' ? 'Q' : 'P';
          let qNo = 0;

          for (const u of units) {
            psgNo += 1;
            const code = `${p.lecture}-PSG${psgNo}`;
            const kind = p.part === 2 ? 'utterance' : p.part === 3 ? 'dialogue' : 'talk';
            const title = p.part === 2 ? '질문 발화' : (u.label || (p.part === 3 ? '대화' : '담화'));
            const pg = await c.query(
              `insert into passages (passage_code, kind, title) values ($1,$2,$3)
               on conflict (passage_code) do update set kind = excluded.kind, title = excluded.title
               returning id`, [code, kind, title]);
            const passageId = pg.rows[0].id;

            const sents = p.part === 2
              ? [{ speaker: null, en: u.question }]
              : toSentences(u.script, p.part);
            for (let i = 0; i < sents.length; i += 1) {
              await c.query(
                `insert into passage_sentences (passage_id, seq, en, speaker) values ($1,$2,$3,$4)`,
                [passageId, i + 1, sents[i].en, sents[i].speaker]);
              sTotal += 1;
            }

            const qs = p.part === 2 ? [u] : u.questions;
            for (let k = 0; k < qs.length; k += 1) {
              qNo += 1;
              const q = qs[k];
              const qcode = `${p.lecture}-${prefix}${String(qNo).padStart(3, '0')}`;
              const content = {
                question_text: p.part === 2 ? u.question : q.question,
                question_number: String(qNo),
                ...(phase === 'practice' ? { stage: 'practice' } : {}),
                ...(u.qtype ? { question_type_label: u.qtype } : {}),
                ...(u.label ? { passage_type: u.label } : {}),
                source: `YBM 실전토익 LC 1000 TEST ${data.test} Q${q.no ?? u.no}`,
              };
              const qr = await c.query(
                `insert into questions (question_code, lecture_id, part, content, passage_id, display_order)
                 values ($1,$2,$3,$4,$5,$6) returning id`,
                [qcode, lectureId, p.part, JSON.stringify(content), passageId, k + 1]);
              const questionId = qr.rows[0].id;
              qTotal += 1;

              for (let j = 0; j < q.options.length; j += 1) {
                const o = q.options[j];
                const tagId = o.tag ? tags.get(`${p.part}|${o.tag}`) ?? null : null;
                await c.query(
                  `insert into question_options
                     (question_id, option_label, option_text, is_correct,
                      option_error_tag_id, option_explanation, correct_evidence, display_order)
                   values ($1,$2,$3,$4,$5,$6,$7,$8)`,
                  [questionId, o.label, o.text, !!o.is_correct, tagId,
                    o.is_correct ? null : (o.why || null),
                    o.is_correct ? (o.why || q.explain || null) : null, j + 1]);
                oTotal += 1;
              }
            }
          }
        }
        await c.query('commit');
        console.log(`  ✓ ${p.lecture}`);
      } catch (err) {
        await c.query('rollback');
        console.error(`  ✗ ${p.lecture}: ${err.message}`);
      }
    }
    console.log(`\n지문 문장 ${sTotal} · 문항 ${qTotal} · 보기 ${oTotal} 반영`);
    console.log('다음: node scripts/build-lecture-items.js --go  &&  node scripts/gen_lc_audio.js --go');
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
