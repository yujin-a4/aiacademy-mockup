/**
 * 실전토익 RC1000 TEST5 Part6 → RC-P6-01(문맥 문법: 연결어·지시어·시제) 지문 2개 적재.
 * Part6=지문 1개당 빈칸 4개. 연결어·지시어·시제가 포함된 실제 지문 통째로(겹침 0):
 *   수업(Q001~004): Rosen 호텔 웹페이지 (요금/분사·시제 Decorated/지시어 They/문장삽입)
 *   실전(P001~004): Arlington 위생국 이메일 (전치사/연결어 For this reason/문장삽입/to부정사)
 * Part6=읽기, 음원 없음. 출처: RC 본권/해설 TEST5. 재실행 안전.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Client } = require('pg');

const P_LESSON = `Rosen Hotel is offering a 30% discount on all deluxe rooms throughout March. This special (1)_______ is available to all guests who want to experience the luxury of our new rooms. (2)_______ with calming colors, our deluxe rooms are the perfect place to relax after a long day. (3)_______ come with a king-sized bed, kitchenette, spacious bathroom, and more. To make a reservation, visit www.rosen-hotel.com. Please note that a credit card is required for all bookings. (4)_______. We look forward to welcoming you!`;

const P_PRACTICE = `Dear Ms. Boyce,

Thank you for informing us (1)_______ the missed recycling collection at your property. We have a special team for short-notice pickups, which I have dispatched. (2)_______, you can rest assured that your recycling will be collected by 4 p.m. (3)_______. Therefore, some crew members are not familiar with the routes. We are dedicated to providing efficient collection services of household waste and recyclables in Arlington, and your feedback helps us to (4)_______ this responsibility.

Sincerely,
Devin Sinha
Arlington Sanitation Services`;

const Q = (n, sentence) => n === 4 || sentence ? null : null; // placeholder
const ask = (n, isSentence) => isSentence ? `빈칸 (${n})에 들어갈 문장으로 알맞은 것을 고르시오.` : `빈칸 (${n})에 알맞은 것을 고르시오.`;

const LESSON = { passage: P_LESSON, prefix: 'RC-P6-01-Q', stage: null, items: [
  { n:1, bt:'어휘형', ev:'앞 문장의 30% 할인을 대신하는 명사로 요금(rate)이 알맞다.', opts:[
    { l:'A', t:'tour',        tag:'문맥 어휘 불일치형', ex:'할인 요금을 대신하는 명사가 아니다.' },
    { l:'B', t:'performance', tag:'문맥 어휘 불일치형', ex:'공연을 뜻해 문맥에 맞지 않는다.' },
    { l:'C', t:'edition',     tag:'문맥 어휘 불일치형', ex:'출판물의 판을 뜻해 문맥에 맞지 않는다.' },
    { l:'D', t:'rate', ok:true } ] },
  { n:2, bt:'문법형', ev:'사물 주어(디럭스 객실)는 장식되는 대상이므로 과거분사 분사구문이 알맞다.', opts:[
    { l:'A', t:'Decorating',    tag:'문법·형태 불일치형', ex:'사물 주어는 장식하는 주체가 될 수 없어 현재분사는 부적절하다.' },
    { l:'B', t:'To decorate',   tag:'문법·형태 불일치형', ex:'목적을 나타내 의미가 맞지 않는다.' },
    { l:'C', t:'They decorated',tag:'문법·형태 불일치형', ex:'접속사 없이 주어+동사가 올 수 없다.' },
    { l:'D', t:'Decorated', ok:true } ] },
  { n:3, bt:'문법형', ev:'앞의 복수명사 our deluxe rooms를 대신하는 복수 주격 대명사 They가 알맞다.', opts:[
    { l:'A', t:'They', ok:true },
    { l:'B', t:'Either',    tag:'문맥 어휘 불일치형', ex:'둘 중 하나를 뜻해 복수명사를 대신할 수 없다.' },
    { l:'C', t:'Whichever', tag:'문법·형태 불일치형', ex:'복합관계대명사라 주어로 쓸 수 없다.' },
    { l:'D', t:'Fewer',     tag:'문맥 어휘 불일치형', ex:'더 적은 것을 뜻해 의미가 맞지 않는다.' } ] },
  { n:4, bt:'문장삽입형', sentence:true, ev:'앞 문장이 신용카드 필수 → 요금 청구 시점을 밝히는 문장이 알맞다.', opts:[
    { l:'A', t:'Otherwise, a breakfast buffet is served daily from 6 a.m.', tag:'문장삽입·역할 불일치형', ex:'신용카드 문맥과 무관하다.' },
    { l:'B', t:'The charge will not be made until twenty-four hours before check-in.', ok:true },
    { l:'C', t:'Our staff aims to accommodate this request, if possible.', tag:'문장삽입·역할 불일치형', ex:'앞에 요청 관련 내용이 없다.' },
    { l:'D', t:'Many hotels in the city center have vacant rooms.', tag:'문장삽입·역할 불일치형', ex:'문맥과 무관하다.' } ] },
] };

const PRACTICE = { passage: P_PRACTICE, prefix: 'RC-P6-01-P', stage: 'practice', items: [
  { n:1, bt:'어휘형', ev:'감사 + 알려준 내용 → ~에 관해(about)가 알맞다.', opts:[
    { l:'A', t:'with',  tag:'문맥 어휘 불일치형', ex:'알려주다의 대상을 이끌지 못한다.' },
    { l:'B', t:'until', tag:'문맥 어휘 불일치형', ex:'시간을 뜻해 문맥에 맞지 않는다.' },
    { l:'C', t:'about', ok:true },
    { l:'D', t:'into',  tag:'문맥 어휘 불일치형', ex:'~안으로를 뜻해 문맥에 맞지 않는다.' } ] },
  { n:2, bt:'연결어형', ev:'앞=전담팀 파견(이유), 뒤=안심해도 됨(결과) → 이런 이유로(For this reason).', opts:[
    { l:'A', t:'For instance',      tag:'논리 관계 불일치형', ex:'예시 관계가 아니다.' },
    { l:'B', t:'On the other hand', tag:'논리 관계 불일치형', ex:'대조 관계가 아니다.' },
    { l:'C', t:'Apart from that',   tag:'논리 관계 불일치형', ex:'그 외에도라는 뜻으로 문맥에 맞지 않는다.' },
    { l:'D', t:'For this reason', ok:true } ] },
  { n:3, bt:'문장삽입형', sentence:true, ev:'뒤 문장 Therefore 작업원이 경로에 익숙지 않다 → 그 이유(대체 작업조)를 밝히는 문장.', opts:[
    { l:'A', t:'Unfortunately, we cannot take items that have not been thoroughly cleaned.', tag:'문장삽입·역할 불일치형', ex:'세척 관련 앞뒤 문맥이 없다.' },
    { l:'B', t:'You can also leave feedback on the city’s Web site.', tag:'문장삽입·역할 불일치형', ex:'뒤 문장의 이유가 되지 못한다.' },
    { l:'C', t:'Please find attached a schedule of recycling collection days.', tag:'문장삽입·역할 불일치형', ex:'일정표 첨부는 문맥과 무관하다.' },
    { l:'D', t:'Due to the holiday, we have replacement crews working most of this week.', ok:true } ] },
  { n:4, bt:'문법형', ev:'help+목적어+to부정사 구조에서 to 뒤에는 동사원형(fulfill)이 온다.', opts:[
    { l:'A', t:'fulfillment', tag:'문법·형태 불일치형', ex:'명사라 to 뒤에 올 수 없다.' },
    { l:'B', t:'fulfill', ok:true },
    { l:'C', t:'fulfilling', tag:'문법·형태 불일치형', ex:'동명사/현재분사라 to 뒤에 부적절하다.' },
    { l:'D', t:'fulfilled', tag:'문법·형태 불일치형', ex:'과거형/과거분사라 to 뒤에 부적절하다.' } ] },
] };

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows: tagRows } = await c.query(`select id, tag_name from wrong_answer_tags where part=6`);
    const tagId = new Map(tagRows.map((t) => [t.tag_name, t.id]));
    const { rows: lec } = await c.query(`select id from lectures where lecture_code='RC-P6-01'`);
    const lectureId = lec[0].id;
    const { rows: ref } = await c.query(`select part, difficulty from questions where question_code='RC-P6-01-Q001'`);
    const part = ref[0].part, difficulty = ref[0].difficulty;

    for (const grp of [LESSON, PRACTICE]) {
      for (const it of grp.items) {
        const code = `${grp.prefix}${String(it.n).padStart(3, '0')}`;
        const content = {
          blank_type: it.bt,
          question_text: ask(it.n, it.sentence),
          passage_context: grp.passage,
          question_number: String(it.n),
        };
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
    console.log('RC-P6-01 적재 완료.');
  } finally { await c.end(); }
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
