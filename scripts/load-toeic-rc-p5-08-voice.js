/* ⚠️ 폐기 예정 (deprecated) — 이 스크립트는 DB에 **직접** 쓴다.
 *
 * 지금 문항의 정본은 구글시트 "AI어학원 문항 입력"이고, 매일 03:00 KST GCP 크론이
 * 시트 → DB 로 덮어쓴다(gcp/sync-questions-fn). 그래서 여기서 DB를 직접 고쳐도
 * **다음 새벽에 되돌아간다.**
 *
 * 교재(YBM 실전토익 LC/RC 1000) 문항을 새로 넣으려면 DB가 아니라 시트에 기입할 것.
 *   참고: scripts/write-rc-p5-*-to-sheet.js (시트 기입 방식 예시)
 *         scripts/export_part1_sheet.js     (DB → 시트 붙여넣기용 TSV 추출)
 *
 * 이 파일은 "어떤 교재 문항을 어떻게 매핑했는지"의 기록으로 남겨둔다. 실행은 막아뒀다.
 * 정말 돌려야 하면 --force-direct-db 를 붙여라(권장하지 않음).
 * 자세한 배경: docs/db-restructure-plan.md §7 STEP 1
 */
if (!process.argv.includes('--force-direct-db')) {
  console.error('✗ 이 스크립트는 폐기됐다 — DB 직접 쓰기는 새벽 크론(시트 → DB)에 덮인다.');
  console.error('  문항은 구글시트 "AI어학원 문항 입력"에 기입할 것.');
  console.error('  그래도 강행하려면: --force-direct-db');
  process.exit(1);
}

/**
 * YBM 실전토익 RC 1000 → RC-P5-08 (능동태·수동태) 문항 6개 적재. Part5=읽기, 음원 없음.
 * 10개 TEST Part5에서 순수 '태' 문항만 선별(희소, 6개):
 *   수업(Q001~003): T4Q120 standardized, T6Q115 waived, T9Q114 resolved
 *   실전(P001~003): T3Q125 was constructed, T10Q127 nominated, T5Q130 be suspended
 * 겹침 0. 기존 placeholder Q001~005 → Q001~003 교체 + Q004/005 삭제 + P001~003 신설(practice).
 * 출처: RC 본권/해설. 재실행 안전.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Client } = require('pg');
const QT = '빈칸에 알맞은 것을 고르시오.';
const B = '_______';

// tag: Part5 오답유형. 27 품사·형태 / 28 구조 / 29 의미 부적절 / 30 형태 유사 / 31 콜로케이션
const LESSON = [
  { code: 'RC-P5-08-Q001',
    sentence: `All component parts of Lowry automatic doors are ${B} for easy replacement.`,
    evidence: '주어(구성품)는 표준화되는 대상이고 be동사(are) 뒤 목적어가 없으므로 과거분사로 수동태를 이룬다.',
    opts: [
      { l:'A', t:'standardizing',   tag:'구조 불일치형',     ex:'현재분사(능동)라 수동 자리에 맞지 않고, 뒤에 목적어도 없다.' },
      { l:'B', t:'standardized',    ok:true },
      { l:'C', t:'standardizes',    tag:'품사·형태 불일치형', ex:'동사(현재형)라 be동사 뒤에 올 수 없다.' },
      { l:'D', t:'standardization', tag:'품사·형태 불일치형', ex:'명사라 수동태 동사 자리에 맞지 않는다.' },
    ] },
  { code: 'RC-P5-08-Q002',
    sentence: `According to the Cordell Pottery Exhibition's Web site, the entry fee will be ${B} for Cordell residents.`,
    evidence: '주어(입장료)는 면제되는 대상이므로 be동사와 함께 과거분사로 수동태를 이룬다.',
    opts: [
      { l:'A', t:'waives',  tag:'품사·형태 불일치형', ex:'동사(현재형)라 be동사 뒤에 올 수 없다.' },
      { l:'B', t:'waiving', tag:'구조 불일치형',     ex:'현재분사(능동)로 will be와 능동을 이루는데 뒤에 목적어가 없어 부적절하다.' },
      { l:'C', t:'waived',  ok:true },
      { l:'D', t:'waivers', tag:'품사·형태 불일치형', ex:'명사라 이 문장에서 어색하다.' },
    ] },
  { code: 'RC-P5-08-Q003',
    sentence: `The noise issue with the Traction G20 truck was ${B} once the cross bars on the roof rack were adjusted.`,
    evidence: '주어(소음 문제)는 해결되는 대상이고 be동사(was) 뒤 목적어가 없으므로 과거분사로 수동태를 이룬다.',
    opts: [
      { l:'A', t:'resolve',    tag:'품사·형태 불일치형', ex:'동사원형이라 be동사와 결합할 수 없다.' },
      { l:'B', t:'resolving',  tag:'구조 불일치형',     ex:'현재분사(능동)로 목적어가 필요한데 뒤에 목적어가 없다.' },
      { l:'C', t:'resolution', tag:'품사·형태 불일치형', ex:'명사라 이 문장에서 어색하다.' },
      { l:'D', t:'resolved',   ok:true },
    ] },
];
const PRACTICE = [
  { code: 'RC-P5-08-P001',
    sentence: `The architect's drawings for the structure differ greatly from the building that ${B}.`,
    evidence: 'that절이 수식하는 the building은 지어지는 대상이고 빈칸 뒤 목적어가 없으므로 수동태가 되어야 한다.',
    opts: [
      { l:'A', t:'is constructing', tag:'구조 불일치형', ex:'능동 진행형이라 뒤에 목적어가 필요한데 없다.' },
      { l:'B', t:'constructed',     tag:'구조 불일치형', ex:'능동 과거형으로 읽히며 목적어가 필요하다.' },
      { l:'C', t:'was constructed', ok:true },
      { l:'D', t:'has constructed', tag:'구조 불일치형', ex:'현재완료 능동이라 목적어가 필요하다.' },
    ] },
  { code: 'RC-P5-08-P002',
    sentence: `Any employee who has worked at Boone, Inc., for more than six months may be ${B} for this recognition.`,
    evidence: '주어(직원)는 지명되는 대상이므로 may be 뒤에 과거분사로 수동태를 이룬다.',
    opts: [
      { l:'A', t:'nominee',    tag:'품사·형태 불일치형', ex:'가산명사라 관사가 필요하고 수동태 동사 자리에 맞지 않는다.' },
      { l:'B', t:'nominated',  ok:true },
      { l:'C', t:'nomination', tag:'의미 부적절형',     ex:'명사로 의미가 어색하다.' },
      { l:'D', t:'nominate',   tag:'품사·형태 불일치형', ex:'동사원형이라 be동사 뒤에 쓸 수 없다.' },
    ] },
  { code: 'RC-P5-08-P003',
    sentence: `All standard orders for banner printing will ${B} until the express requests have been completed and shipped.`,
    evidence: 'suspend는 타동사인데 빈칸 뒤 목적어 없이 접속사 until이 오므로 수동태(be suspended)가 되어야 한다.',
    opts: [
      { l:'A', t:'suspend',        tag:'구조 불일치형', ex:'능동 원형이라 목적어가 필요한데 없다.' },
      { l:'B', t:'be suspended',   ok:true },
      { l:'C', t:'have suspended', tag:'구조 불일치형', ex:'현재완료 능동이라 목적어가 필요하다.' },
      { l:'D', t:'be suspending',  tag:'구조 불일치형', ex:'능동 진행형이라 목적어가 필요하다.' },
    ] },
];

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows: tagRows } = await c.query(`select id, tag_name from wrong_answer_tags where part=5`);
    const tagId = new Map(tagRows.map((t) => [t.tag_name, t.id]));
    const { rows: lec } = await c.query(`select id from lectures where lecture_code='RC-P5-08'`);
    const lectureId = lec[0].id;
    const { rows: ref } = await c.query(`select part, difficulty from questions where question_code='RC-P5-08-Q001'`);
    const part = ref[0].part, difficulty = ref[0].difficulty;

    const content = (s) => ({ blank_type: '문법형', grammar_point: '능동태·수동태', question_text: QT, blank_sentence: s });
    const putOptions = async (qid, opts) => {
      await c.query(`delete from question_options where question_id=$1`, [qid]);
      for (const o of opts) {
        const tid = o.tag ? tagId.get(o.tag) : null;
        if (o.tag && tid == null) throw new Error(`태그 매칭 실패 "${o.tag}"`);
        await c.query(
          `insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation, audio_url)
           values ($1,$2,$3,$4,$5,$6,$7,null)`,
          [qid, o.l, o.t, !!o.ok, tid, o.ok ? null : null, o.ex ?? null]
        );
      }
    };

    // 수업: 기존 Q001~003 업데이트
    for (const q of LESSON) {
      const { rows } = await c.query(`select id from questions where question_code=$1`, [q.code]);
      const qid = rows[0].id;
      const ct = content(q.sentence);
      await c.query(`update questions set content=$2 where id=$1`, [qid, ct]);
      // 정답 근거는 정답 보기의 correct_evidence로
      const opts = q.opts.map((o) => o.ok ? { ...o, _ev: q.evidence } : o);
      await c.query(`delete from question_options where question_id=$1`, [qid]);
      for (const o of opts) {
        const tid = o.tag ? tagId.get(o.tag) : null;
        await c.query(
          `insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation, audio_url)
           values ($1,$2,$3,$4,$5,$6,$7,null)`,
          [qid, o.l, o.t, !!o.ok, tid, o.ok ? q.evidence : null, o.ex ?? null]
        );
      }
      console.log(`  수업 ok ${q.code} (정답 ${q.opts.find((o)=>o.ok).l})`);
    }

    // 잉여 placeholder 삭제
    for (const code of ['RC-P5-08-Q004','RC-P5-08-Q005']) {
      const { rows } = await c.query(`select id from questions where question_code=$1`, [code]);
      if (rows.length) {
        await c.query(`delete from learner_answer_log where question_id=$1`, [rows[0].id]); // 데모 로그(FK)
        await c.query(`delete from question_options where question_id=$1`, [rows[0].id]);
        await c.query(`delete from questions where id=$1`, [rows[0].id]);
        console.log(`  삭제 ${code}`);
      }
    }

    // 실전: P001~003 신규(있으면 교체)
    for (const q of PRACTICE) {
      const ct = { ...content(q.sentence), stage: 'practice' };
      const { rows } = await c.query(`select id from questions where question_code=$1`, [q.code]);
      let qid;
      if (rows.length) { qid = rows[0].id; await c.query(`update questions set content=$2 where id=$1`, [qid, ct]); }
      else {
        const ins = await c.query(
          `insert into questions (question_code, lecture_id, part, difficulty, content) values ($1,$2,$3,$4,$5) returning id`,
          [q.code, lectureId, part, difficulty, ct]);
        qid = ins.rows[0].id;
      }
      await c.query(`delete from question_options where question_id=$1`, [qid]);
      for (const o of q.opts) {
        const tid = o.tag ? tagId.get(o.tag) : null;
        await c.query(
          `insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation, audio_url)
           values ($1,$2,$3,$4,$5,$6,$7,null)`,
          [qid, o.l, o.t, !!o.ok, tid, o.ok ? q.evidence : null, o.ex ?? null]);
      }
      console.log(`  실전 ok ${q.code} (정답 ${q.opts.find((o)=>o.ok).l})`);
    }
    console.log('RC-P5-08 적재 완료.');
  } finally { await c.end(); }
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
