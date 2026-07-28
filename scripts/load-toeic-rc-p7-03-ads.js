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
 * 실전토익 RC1000 TEST5 Part7 → RC-P7-03(광고·홍보문) 광고 지문 2개 적재.
 * Part7=독해(지문+문항). 광고 단일지문 통째로(겹침 0):
 *   수업(Q001~003): Medina 가상 우편함 광고 (158~160)
 *   실전(P001~002): Freshtime 청소 서비스 광고 (151~152)
 * Part7=읽기, 음원 없음. 출처: RC 본권/해설 TEST5. 재실행 안전.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Client } = require('pg');

const MEDINA = `MEDINA VIRTUAL MAILBOXES
834 Stroude Road, Beamhurst
Phone: 070 5517 3713

Your mail is safe in our hands!
• You can keep the same virtual address even after you move.
• With our Standard Service, we will store your mail, including envelopes and packages requiring a signature. You will be notified by text whenever your mail is dropped off to us.
• With our Gold Service, we can also forward the mail daily, open and scan it, or shred it. Simply log in from any device with your secure customer code to view an initial scan of the front of each piece of mail. Then choose what further action we should take with it.

For this month only, enroll in our Gold Service to receive 25% off the first six months of your annual contract.`;

const FRESHTIME = `Freshtime Cleaning Services
Serving Aurora, Huntington, and Durham for the past five years!
Available Monday to Saturday, 8 a.m. to 8 p.m., excluding national holidays.

Freshtime Cleaning Services provides top-notch cleaning to commercial properties. Our founder, Terry Nolan, is passionate about making your space clean and relaxing, and our dedicated team of cleaners is always thorough and careful. Whether you need a one-time deep clean, a weekly routine clean, or something else, we can help you. We use environmentally friendly cleaning products, and we are fully insured.

We are especially looking for new clients in need of cleaning between tenants. Call Jana Rogova at 555-8716 to discuss rates.`;

const LESSON = { passage: MEDINA, prefix: 'RC-P7-03-Q', stage: null, items: [
  { n:1, q:'When does Medina Virtual Mailboxes send a notification to customers?',
    ev:'You will be notified by text whenever your mail is dropped off to us.', opts:[
    { l:'A', t:'When it has forwarded some mail',              tag:'세부 정보 불일치형', ex:'우편물 전달은 골드 서비스 기능이지 알림 시점이 아니다.' },
    { l:'B', t:'When an item arrives at the site', ok:true },
    { l:'C', t:'When the subscription is about to expire',     tag:'세부 정보 불일치형', ex:'만료 알림은 언급되지 않았다.' },
    { l:'D', t:'When a storage area is nearly full',           tag:'세부 정보 불일치형', ex:'보관 구역에 대한 언급이 없다.' } ] },
  { n:2, q:'What should customers do to choose what happens to their mail?',
    ev:'Simply log in from any device with your secure customer code ... Then choose what further action we should take with it.', opts:[
    { l:'A', t:'Log in with a secure code', ok:true },
    { l:'B', t:'Set the instructions in their contract', tag:'세부 정보 불일치형', ex:'계약서에 지정한다는 내용은 없다.' },
    { l:'C', t:'Call the company’s office',              tag:'세부 정보 불일치형', ex:'전화하라는 내용은 없다.' },
    { l:'D', t:'Send a text message to the business',    tag:'부분 일치형',       ex:'문자는 업체가 고객에게 알리는 수단이지 고객의 선택 방법이 아니다.' } ] },
  { n:3, q:'How can customers be eligible for a discount?',
    ev:'enroll in our Gold Service to receive 25% off the first six months of your annual contract. (골드=상위 서비스)', opts:[
    { l:'A', t:'By signing up for a premium service', ok:true },
    { l:'B', t:'By committing to a half-year contract',          tag:'부분 일치형',       ex:'6개월은 할인 기간이지 계약 기간 약속이 아니다.' },
    { l:'C', t:'By downloading a voucher from the system',       tag:'세부 정보 불일치형', ex:'바우처 언급이 없다.' },
    { l:'D', t:'By paying for the service six months in advance', tag:'부분 일치형',       ex:'선불 결제 조건이 아니다.' } ] },
] };

const PRACTICE = { passage: FRESHTIME, prefix: 'RC-P7-03-P', stage: 'practice', items: [
  { n:1, q:'What is true about Freshtime Cleaning Services?',
    ev:'Serving Aurora, Huntington, and Durham for the past five years!', opts:[
    { l:'A', t:'It has been in business for more than a decade.',   tag:'세부 정보 불일치형', ex:'5년간 영업했다고 나온다.' },
    { l:'B', t:'It serves both homes and businesses.',              tag:'부분 일치형',       ex:'상업용 건물에만 서비스한다.' },
    { l:'C', t:'It operates in three different locations.', ok:true },
    { l:'D', t:'It must be booked for multiple cleaning sessions.', tag:'과도한 추론형',     ex:'여러 번 예약해야 한다는 조건은 없다.' } ] },
  { n:2, q:'According to the advertisement, who should call Ms. Rogova?',
    ev:'We are especially looking for new clients in need of cleaning between tenants. Call Jana Rogova ...', opts:[
    { l:'A', t:'Hotel guests',                 tag:'세부 정보 불일치형', ex:'호텔 손님 언급이 없다.' },
    { l:'B', t:'Cleaning supply wholesalers',  tag:'세부 정보 불일치형', ex:'도매업자 언급이 없다.' },
    { l:'C', t:'Property owners', ok:true },
    { l:'D', t:'Part-time cleaners',           tag:'세부 정보 불일치형', ex:'구인이 아니라 고객 모집이다.' } ] },
] };

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows: tagRows } = await c.query(`select id, tag_name from wrong_answer_tags where part=7`);
    const tagId = new Map(tagRows.map((t) => [t.tag_name, t.id]));
    const { rows: lec } = await c.query(`select id from lectures where lecture_code='RC-P7-03'`);
    const lectureId = lec[0].id;
    const { rows: ref } = await c.query(`select part, difficulty from questions where question_code='RC-P7-03-Q001'`);
    const part = ref[0].part, difficulty = ref[0].difficulty;

    for (const grp of [LESSON, PRACTICE]) {
      for (const it of grp.items) {
        const code = `${grp.prefix}${String(it.n).padStart(3, '0')}`;
        const content = { passage_type: '광고', passage_text: grp.passage, question_text: it.q,
          question_number: String(it.n), evidence_sentence: it.ev, passage_structure: '광고·홍보문' };
        if (grp.stage) content.stage = grp.stage;
        const { rows } = await c.query(`select id from questions where question_code=$1`, [code]);
        let qid;
        if (rows.length) { qid = rows[0].id; await c.query(`update questions set content=$2 where id=$1`, [qid, content]); }
        else {
          const ins = await c.query(`insert into questions (question_code, lecture_id, part, difficulty, content) values ($1,$2,$3,$4,$5) returning id`,
            [code, lectureId, part, difficulty, content]);
          qid = ins.rows[0].id;
        }
        await c.query(`delete from question_options where question_id=$1`, [qid]);
        for (const o of it.opts) {
          const tid = o.tag ? tagId.get(o.tag) : null;
          if (o.tag && tid == null) throw new Error(`태그 매칭 실패 "${o.tag}" (${code})`);
          await c.query(`insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation, audio_url)
            values ($1,$2,$3,$4,$5,$6,$7,null)`, [qid, o.l, o.t, !!o.ok, tid, o.ok ? it.ev : null, o.ex ?? null]);
        }
        console.log(`  ok ${code} (정답 ${it.opts.find((o)=>o.ok).l})`);
      }
    }
    // 잉여 placeholder 삭제 (Q004~006)
    for (const code of ['RC-P7-03-Q004','RC-P7-03-Q005','RC-P7-03-Q006']) {
      const { rows } = await c.query(`select id from questions where question_code=$1`, [code]);
      if (rows.length) {
        await c.query(`delete from learner_answer_log where question_id=$1`, [rows[0].id]);
        await c.query(`delete from question_options where question_id=$1`, [rows[0].id]);
        await c.query(`delete from questions where id=$1`, [rows[0].id]);
        console.log(`  삭제 ${code}`);
      }
    }
    console.log('RC-P7-03 적재 완료.');
  } finally { await c.end(); }
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
