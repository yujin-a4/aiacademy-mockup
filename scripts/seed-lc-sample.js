/**
 * Part 2·3·4 실증 입력 — docs/db-restructure-plan.md §7 STEP 3 완료 조건
 *
 * STEP 3의 완료 조건은 "Part 2·3·4 문항을 DB에 넣을 수 있게 된다 (실제로 1강 분량 넣어서 확인)"이다.
 * 0014 이전에는 넣을 수 없었다. 담을 자리가 없었기 때문이다:
 *   P2 = 질문 발화 1개 + 응답 3개(각각 음원)
 *   P3 = 화자 있는 대화 N문장 + 문항 3개, 때로 시각자료(표)
 *   P4 = 담화 N문장 + 문항 3개
 * questions.content 의 문자열 하나로는 화자도 표도 문장 구간도 표현이 안 됐다.
 *
 * 콘텐츠 출처: src/data/typeLearning/lessonsLC.ts 의 T2·T3·T4·T5.
 *   지어낸 문항이 아니라 이 레포에 이미 있던 콘텐츠를 옮긴 것이다.
 *   (계획서가 말하는 "로컬 TS 형판 의존 축소"와 같은 방향)
 *
 * ⚠️ 이 4강은 시트(문항 정본)에 아직 없다. 크론은 upsert 라 시트에 없는 문항을 지우지 않으므로
 *    그대로 남는다. 나중에 시트에 같은 question_id 가 생기면 그쪽이 이긴다(그게 맞다).
 *
 * 사용
 *   node scripts/seed-lc-sample.js         # dry run
 *   node scripts/seed-lc-sample.js --go    # 입력
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { Client } = require('pg');

const GO = process.argv.includes('--go');

/* ── 입력 데이터 (lessonsLC.ts T2·T3·T4·T5) ── */

const LECTURES = [
  {
    lecture_code: 'LC-P2-01', part: 2, source: 'lessonsLC.ts T2',
    passage: {
      code: 'LC-P2-01-PSG1', kind: 'utterance', title: '의문사 의문문 · 질문 발화',
      sentences: [{ en: 'Where is the quarterly meeting going to be held?' }],
    },
    questions: [{
      text: 'Where is the quarterly meeting going to be held?',
      options: [
        { label: 'A', text: 'It was very productive.', why: 'meeting에서 연상되는 말이지만 장소가 아니에요.' },
        { label: 'B', text: 'In the main conference room.', correct: true, why: 'Where에 장소로 답했어요.' },
        { label: 'C', text: "Yes, I'll be there.", why: '의문사 의문문에는 Yes/No로 답할 수 없어요.' },
      ],
    }],
  },
  {
    lecture_code: 'LC-P3-01', part: 3, source: 'lessonsLC.ts T3',
    passage: {
      code: 'LC-P3-01-PSG1', kind: 'dialogue', title: '고객·직원 대화 · 배송 일정 변경',
      sentences: [
        { speaker: 'W', en: 'Hi, this is Sarah calling from Westfield Logistics.' },
        { speaker: 'W', en: "I'm calling about the delivery that's currently scheduled for this Friday morning." },
        { speaker: 'M', en: 'Oh yes, I have that order pulled up right here. Is there an issue with the schedule?' },
        { speaker: 'W', en: "Actually, we were hoping to move it up to Wednesday afternoon if that's at all possible." },
        { speaker: 'W', en: 'Our warehouse team needs to finish an inventory count before the end of the week.' },
        { speaker: 'M', en: 'Let me check our route calendar... Yes, Wednesday afternoon actually looks open.' },
        { speaker: 'M', en: "I'll go ahead and update the order and send you a confirmation e-mail shortly." },
        { speaker: 'W', en: "That's wonderful, thank you so much for accommodating this." },
      ],
    },
    questions: [
      {
        text: 'What are the speakers mainly discussing?',
        options: [
          { label: 'A', text: 'A change in a delivery schedule', correct: true, why: '배송 일정을 앞당기는 대화예요.' },
          { label: 'B', text: 'A new employee orientation', why: '대화에 없는 내용이에요.' },
          { label: 'C', text: 'A software update', why: '대화에 없는 내용이에요.' },
          { label: 'D', text: 'A budget proposal', why: '대화에 없는 내용이에요.' },
        ],
      },
      {
        text: 'Why does the woman want to change the date?',
        options: [
          { label: 'A', text: 'A client made a complaint', why: '언급되지 않았어요.' },
          { label: 'B', text: 'Her team needs to finish an inventory count', correct: true, why: 'inventory count 문장이 근거예요.' },
          { label: 'C', text: 'The warehouse will be closed', why: '창고가 닫힌다는 말은 없어요.' },
          { label: 'D', text: 'A truck is being repaired', why: '언급되지 않았어요.' },
        ],
      },
      {
        text: 'What will the man most likely do next?',
        options: [
          { label: 'A', text: 'Visit the warehouse', why: '남자가 방문한다는 말은 없어요.' },
          { label: 'B', text: 'Cancel the order', why: '취소가 아니라 변경이에요.' },
          { label: 'C', text: 'Send a confirmation e-mail', correct: true, why: "I'll ... send you a confirmation e-mail이 근거예요." },
          { label: 'D', text: 'Call the delivery driver', why: '언급되지 않았어요.' },
        ],
      },
    ],
  },
  {
    // 표/자료형. body.table 이 실제로 담기는지 보려고 넣는다 (T4 의 railCode 는 'LC-P3-01v' 라는
    // 가상 코드였다 — 커리큘럼 실물 강의 중 내용이 맞는 LC-P3-05(주문·배송 대화)에 붙인다)
    lecture_code: 'LC-P3-05', part: 3, source: 'lessonsLC.ts T4',
    passage: {
      code: 'LC-P3-05-PSG1', kind: 'dialogue', title: '주문·배송 대화 · 시각자료(가격표)',
      body: {
        table: {
          headers: ['Item', 'Price'],
          rows: [['Desk lamp', '$12'], ['Paper box', '$15'], ['Ink cartridge', '$9'], ['USB drive', '$20']],
        },
        visual_title: '시각자료 · Office Supplies Price List',
      },
      sentences: [
        { speaker: 'W', en: "Hi, I'd like to place an order for office supplies from your catalog." },
        { speaker: 'M', en: 'Of course. Just so you know, one of the items is temporarily out of stock.' },
        { speaker: 'M', en: 'The item priced at nine dollars is unavailable until next week.' },
        { speaker: 'W', en: "Oh, that's fine. Then I'll just take five desk lamps for now." },
        { speaker: 'M', en: 'Great. Your order will arrive within two business days.' },
      ],
    },
    questions: [
      {
        text: 'Look at the graphic. Which item is currently out of stock?',
        options: [
          { label: 'A', text: 'Desk lamp', why: '$12 — 가격이 달라요.' },
          { label: 'B', text: 'Paper box', why: '$15 — 가격이 달라요.' },
          { label: 'C', text: 'Ink cartridge', correct: true, why: '음원의 "nine dollars"를 표에서 찾으면 Ink cartridge예요.' },
          { label: 'D', text: 'USB drive', why: '$20 — 가격이 달라요.' },
        ],
      },
      {
        text: 'What does the woman decide to order?',
        options: [
          { label: 'A', text: 'Desk lamps', correct: true, why: "I'll just take five desk lamps가 근거예요." },
          { label: 'B', text: 'Ink cartridges', why: '품절이라 주문할 수 없어요.' },
          { label: 'C', text: 'USB drives', why: '언급되지 않았어요.' },
          { label: 'D', text: 'Paper boxes', why: '언급되지 않았어요.' },
        ],
      },
      {
        text: 'When will the order arrive?',
        options: [
          { label: 'A', text: 'Later today', why: '언급되지 않았어요.' },
          { label: 'B', text: 'Within two business days', correct: true, why: '마지막 문장이 근거예요.' },
          { label: 'C', text: 'Next week', why: '재입고 시점이지 배송 시점이 아니에요.' },
          { label: 'D', text: 'Within two weeks', why: '숫자를 바꾼 함정이에요.' },
        ],
      },
    ],
  },
  {
    lecture_code: 'LC-P4-01', part: 4, source: 'lessonsLC.ts T5',
    passage: {
      code: 'LC-P4-01-PSG1', kind: 'talk', title: '사내 공지 담화 · 휴가 정책 개정',
      sentences: [
        { en: "As many of you already know, we've been reviewing our vacation policy for the past several months based on feedback from last year's employee survey." },
        { en: "I'm happy to announce today that the updated policy has finally been approved and will officially take effect next Monday." },
        { en: 'Under the new policy, all full-time employees will receive an additional two days of paid leave per year, bringing the total to eighteen days annually.' },
        { en: "HR will be sending out updated leave balances to everyone's account by the end of this week, so please check your records once that update goes out." },
      ],
    },
    questions: [
      {
        text: 'What is the announcement mainly about?',
        options: [
          { label: 'A', text: 'A change to the vacation policy', correct: true, why: '휴가 정책 개정 발표예요.' },
          { label: 'B', text: 'A new employee survey', why: '설문은 배경일 뿐 주제가 아니에요.' },
          { label: 'C', text: 'An office relocation', why: '언급되지 않았어요.' },
          { label: 'D', text: 'A hiring plan', why: '언급되지 않았어요.' },
        ],
      },
      {
        text: 'According to the speaker, when will the new policy take effect?',
        options: [
          { label: 'A', text: 'Immediately', why: '시점을 바꾼 함정이에요.' },
          { label: 'B', text: 'Next Monday', correct: true, why: 'take effect next Monday가 근거예요.' },
          { label: 'C', text: 'At the end of the month', why: '언급되지 않았어요.' },
          { label: 'D', text: 'Next year', why: '언급되지 않았어요.' },
        ],
      },
      {
        text: 'What are listeners asked to do?',
        options: [
          { label: 'A', text: 'Complete a survey', why: '설문은 이미 지난해에 한 일이에요.' },
          { label: 'B', text: 'Contact the HR department', why: 'HR이 보내는 것이지 연락하라는 게 아니에요.' },
          { label: 'C', text: 'Check their leave records', correct: true, why: 'please check your records가 근거예요.' },
          { label: 'D', text: 'Attend a training session', why: '언급되지 않았어요.' },
        ],
      },
    ],
  },
];

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const lectures = new Map(
      (await c.query('select id, lecture_code from lectures')).rows.map((r) => [r.lecture_code, r.id]),
    );

    for (const L of LECTURES) {
      const lectureId = lectures.get(L.lecture_code);
      const sents = L.passage.sentences.length;
      const opts = L.questions.reduce((n, q) => n + q.options.length, 0);
      console.log(
        `${L.lecture_code} (P${L.part}) ← ${L.source}\n` +
        `  지문 ${L.passage.code} · kind=${L.passage.kind} · 문장 ${sents}` +
        `${L.passage.body ? ' · 표 있음' : ''}${lectureId ? '' : '  ⚠ 강의코드 없음'}\n` +
        `  문항 ${L.questions.length} · 보기 ${opts}`,
      );
    }

    if (!GO) { console.log('\n(dry run) 넣으려면 --go'); return; }

    let qn = 0, on = 0;
    for (const L of LECTURES) {
      const lectureId = lectures.get(L.lecture_code);
      if (!lectureId) { console.error(`SKIP ${L.lecture_code}: lectures 에 없음`); continue; }

      await c.query('begin');
      try {
        const pg = await c.query(
          `insert into passages (passage_code, kind, title, meta, body)
             values ($1,$2,$3,null,$4)
           on conflict (passage_code) do update
             set kind = excluded.kind, title = excluded.title, body = excluded.body
           returning id`,
          [L.passage.code, L.passage.kind, L.passage.title,
            L.passage.body ? JSON.stringify(L.passage.body) : null],
        );
        const passageId = pg.rows[0].id;

        const prev = new Map(
          (await c.query('select seq, audio_url from passage_sentences where passage_id = $1', [passageId]))
            .rows.map((r) => [r.seq, r.audio_url]),
        );
        await c.query('delete from passage_sentences where passage_id = $1', [passageId]);
        for (let i = 0; i < L.passage.sentences.length; i += 1) {
          const s = L.passage.sentences[i];
          await c.query(
            `insert into passage_sentences (passage_id, seq, en, speaker, audio_url)
             values ($1,$2,$3,$4,$5)`,
            [passageId, i + 1, s.en, s.speaker ?? null, prev.get(i + 1) ?? null],
          );
        }

        for (let i = 0; i < L.questions.length; i += 1) {
          const q = L.questions[i];
          const code = `${L.lecture_code}-Q${String(i + 1).padStart(3, '0')}`;
          const content = { question_text: q.text, question_number: String(i + 1) };
          const qres = await c.query(
            `insert into questions (question_code, lecture_id, part, content, passage_id, display_order)
               values ($1,$2,$3,$4,$5,$6)
             on conflict (question_code) do update
               set lecture_id = excluded.lecture_id, part = excluded.part, content = excluded.content,
                   passage_id = excluded.passage_id, display_order = excluded.display_order
             returning id`,
            [code, lectureId, L.part, JSON.stringify(content), passageId, i + 1],
          );
          const questionId = qres.rows[0].id;
          qn += 1;

          await c.query('delete from question_options where question_id = $1', [questionId]);
          for (let j = 0; j < q.options.length; j += 1) {
            const o = q.options[j];
            await c.query(
              `insert into question_options
                 (question_id, option_label, option_text, is_correct,
                  option_explanation, correct_evidence, display_order)
               values ($1,$2,$3,$4,$5,$6,$7)`,
              [questionId, o.label, o.text, !!o.correct,
                o.correct ? null : o.why, o.correct ? o.why : null, j + 1],
            );
            on += 1;
          }
        }
        await c.query('commit');
      } catch (err) {
        await c.query('rollback');
        console.error(`FAIL ${L.lecture_code}: ${err.message}`);
      }
    }
    console.log(`\n문항 ${qn} · 보기 ${on} 반영`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
