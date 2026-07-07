require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('begin');

    const lec = await client.query("select id from lectures where lecture_code = 'LC-P1-01'");
    const lectureId = lec.rows[0].id;

    const q = await client.query(
      `insert into questions (question_code, lecture_id, part, difficulty, content)
       values ($1,$2,$3,$4,$5)
       on conflict (question_code) do update set content = excluded.content
       returning id`,
      [
        'LC-P1-01-Q001',
        lectureId,
        1,
        '중',
        JSON.stringify({
          photo_type: '사물·상태중심',
          key_elements: '책상 위 문서 더미, 노트북, 의자 (사람 없음)',
        }),
      ]
    );
    const questionId = q.rows[0].id;

    const tagRes = await client.query(
      "select id from wrong_answer_tags where part=1 and tag_name = '주체·대상 불일치형'"
    );
    const subjectMismatchTagId = tagRes.rows[0].id;

    const tagRes2 = await client.query(
      "select id from wrong_answer_tags where part=1 and tag_name = '동작 불일치형'"
    );
    const actionMismatchTagId = tagRes2.rows[0].id;

    await client.query('delete from question_options where question_id = $1', [questionId]);

    const options = [
      {
        label: 'A',
        text: 'Some documents have been placed on the desk.',
        isCorrect: true,
        tagId: null,
        evidence: '사진 속 문서 더미 배치와 "documents … placed on the desk" 표현이 일치',
        explanation: null,
        notes: '시트 실전문제 탭 예시 문항 그대로 사용',
      },
      {
        label: 'B',
        text: 'A man is loading boxes onto a truck.',
        isCorrect: false,
        tagId: subjectMismatchTagId,
        evidence: null,
        explanation: '사진에 없는 대상(truck)과 인물(man)이 등장 — 사진 속 실제 대상은 서류 더미·노트북·의자',
        notes: '시트 실전문제 탭 예시 문항 그대로 사용',
      },
      {
        label: 'C',
        text: 'A woman is organizing some files.',
        isCorrect: false,
        tagId: subjectMismatchTagId,
        evidence: null,
        explanation: '사진에 사람이 없는데 여성이 등장 — 주체 혼동',
        notes: '시트 유형학습 탭 S3 예시 오답 그대로 사용',
      },
      {
        label: 'D',
        text: 'The documents have been thrown away.',
        isCorrect: false,
        tagId: actionMismatchTagId,
        evidence: null,
        explanation: '서류는 책상 위에 놓여 있음(placed) — 버려진(thrown away) 동작·상태가 사진과 불일치',
        notes: '테스트용 임의 추가 — 시트에 없는 placeholder (4지선다 형식을 맞추기 위함)',
      },
    ];

    for (const o of options) {
      await client.query(
        `insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation, notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [questionId, o.label, o.text, o.isCorrect, o.tagId, o.evidence, o.explanation, o.notes]
      );
    }

    await client.query('commit');
    console.log(`question inserted: id=${questionId}, code=LC-P1-01-Q001, options=${options.length}`);
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
