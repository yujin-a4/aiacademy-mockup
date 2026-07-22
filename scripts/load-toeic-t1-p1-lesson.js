/**
 * YBM 실전토익 LC 1000 TEST1 Part1 → 유형학습(수업) 문항 6개 적재.
 *   LC-P1-01 (사진 판별): Q001=Q1(지하철·인물), Q002=Q3(공사장·혼합), Q003=Q6(러그·사물상태)
 *   LC-P1-02 (동작 vs 상태): Q001=Q2(빵집·동작), Q002=Q4(마트·동작), Q003=Q5(항구·상태)
 * 사진은 scripts/_save_t1_photos.py가 이미 유형학습 슬롯(part1_{n}_{k}.jpg)에 저장.
 * 음원은 적재 후 gen_part1_practice_audio.js(합본) + gen_option_audio.js(보기별)로 생성.
 *
 * 재실행 안전: content update + 보기 delete→insert. audio_url은 비워 재생성 유도.
 * 출처: LC 해설 (2024) TEST1 Part1. key_elements만 사진 비전으로 저작.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Client } = require('pg');

const QUESTION_TEXT = '사진을 가장 잘 묘사한 보기를 고르시오.';

// 오답태그: 해설 오답유형 → 우리 wrong_answer_tags(part=1) tag_name
//   '동사 오답'→동작 불일치형 (단 wearing/putting on 시점혼동은 동작·상태 혼동형)
//   '사진에 없는 명사'→주체·대상 불일치형   '위치 오답'→상태·배치·관계 불일치형
const DATA = [
  { code: 'LC-P1-01-Q001', img: '/part1/part1_1_1.jpg', photo_type: '인물 중심 사진(1인 등장)',
    key_elements: '지하철/전철 실내, 좌석에 앉은 남성, 안경 착용, 두 손으로 휴대폰을 들고 화면을 봄, 어깨에 크로스백, 뒤로 전동차 문·유리창',
    opts: [
      { l: 'A', t: "He's looking at a mobile phone.", ok: true,  ev: '남자가 휴대폰을 보고 있는 모습이므로 정답이다.' },
      { l: 'B', t: "He's boarding a train.",          tag: '동작 불일치형',      ex: '남자가 열차에 탑승하고 있는 모습이 아니다.' },
      { l: 'C', t: "He's putting on his glasses.",    tag: '동작·상태 혼동형',    ex: '남자가 안경을 착용한(wearing) 상태이지 끼고 있는(putting on) 동작의 모습은 아니다.' },
      { l: 'D', t: "He's placing his bag under a seat.", tag: '동작 불일치형',    ex: '남자가 의자 아래에 가방을 놓고 있는 모습이 아니다.' },
    ] },
  { code: 'LC-P1-01-Q002', img: '/part1/part1_1_2.jpg', photo_type: '혼합 사진(사람·사물/풍경)',
    key_elements: '건축 공사장(목조·철골 골조), 안전조끼·헬멧·안경 착용 남성, 외바퀴 손수레(wheelbarrow)를 기울여 잡고 비우는 동작, 벽돌 기둥, 모래·시멘트 더미',
    opts: [
      { l: 'A', t: 'Bricks are piled in the back of a truck.', tag: '주체·대상 불일치형', ex: '사진에 트럭이 보이지 않는다.' },
      { l: 'B', t: 'A man is emptying a wheelbarrow.',         ok: true,               ev: '남자가 손수레를 비우고 있는 모습이므로 정답이다.' },
      { l: 'C', t: 'Poles are being taken out of the ground.', tag: '동작 불일치형',     ex: '기둥들이 땅에서 뽑히고 있는 모습이 아니다.' },
      { l: 'D', t: 'A man is holding a power tool.',           tag: '주체·대상 불일치형', ex: '사진에 전동 공구가 보이지 않는다.' },
    ] },
  { code: 'LC-P1-01-Q003', img: '/part1/part1_1_3.jpg', photo_type: '사물·상태 사진(사물/풍경)',
    key_elements: '미니멀 인테리어 실내, 유리 상판 테이블과 흰색 의자 한 개, 바닥에 짙은 색 러그(양탄자)가 깔려 있음, 천장 원통형 펜던트 조명, 밝은 대리석 바닥',
    opts: [
      { l: 'A', t: 'A fan is hanging from the ceiling.',        tag: '주체·대상 불일치형',    ex: '사진에 선풍기가 보이지 않는다.' },
      { l: 'B', t: 'Two chairs are positioned side by side.',   tag: '상태·배치·관계 불일치형', ex: '의자 두 개가 나란히 놓여 있는 모습이 아니다.' },
      { l: 'C', t: 'A table has been moved next to a window.',   tag: '주체·대상 불일치형',    ex: '사진에 창문이 보이지 않는다.' },
      { l: 'D', t: 'A rug has been unrolled on the floor.',      ok: true,                  ev: '양탄자가 바닥에 깔려 있는 모습이므로 정답이다.' },
    ] },
  { code: 'LC-P1-02-Q001', img: '/part1/part1_2_1.jpg', photo_type: '인물 중심 사진(1인 등장)',
    key_elements: '제과점/베이커리 주방, 두건·앞치마·오븐장갑 착용 여성, 식빵 여러 개가 담긴 트레이를 금속 선반 쪽으로 밀어 넣음, 뒤로 오븐팬·선반',
    opts: [
      { l: 'A', t: 'She’s kneeling to check an oven.',   tag: '주체·대상 불일치형', ex: '사진에 오븐이 보이지 않는다.' },
      { l: 'B', t: 'She’s washing some baking pans.',    tag: '동작 불일치형',      ex: '여자가 빵 굽는 팬을 씻고 있는 모습이 아니다.' },
      { l: 'C', t: 'She’s cutting a piece of bread.',    tag: '동작 불일치형',      ex: '여자가 빵 한 조각을 자르고 있는 모습이 아니다.' },
      { l: 'D', t: 'She’s sliding a tray into a rack.',  ok: true,               ev: '여자가 쟁반을 선반에 밀어 넣는 모습이므로 정답이다.' },
    ] },
  { code: 'LC-P1-02-Q002', img: '/part1/part1_2_2.jpg', photo_type: '인물 중심 사진(2인 이상 등장)',
    key_elements: '마트/식료품점 계산대, 앞치마 두른 여성 점원과 체크셔츠 남성 손님, 계산대 위 상품(오렌지주스 등)·결제 단말기, 왼쪽에 쇼핑카트',
    opts: [
      { l: 'A', t: 'The woman is hanging up an apron.',     tag: '동작 불일치형', ex: '여자가 앞치마를 걸고 있는 모습이 아니다.' },
      { l: 'B', t: 'The man is pushing a shopping cart.',   tag: '동작 불일치형', ex: '남자가 쇼핑 카트를 밀고 있는 모습이 아니다.' },
      { l: 'C', t: 'The man is entering a grocery store.',  tag: '동작 불일치형', ex: '남자가 식료품점 안으로 들어가고 있는 모습이 아니다.' },
      { l: 'D', t: 'The woman is helping a customer.',      ok: true,           ev: '여자가 손님을 돕고 있는 모습이므로 정답이다.' },
    ] },
  { code: 'LC-P1-02-Q003', img: '/part1/part1_2_3.jpg', photo_type: '혼합 사진(사람·사물/풍경)',
    key_elements: '항구/부두 석축 위에 앉아 태블릿으로 사진 찍는 여성(뒷모습), 옆에 배낭, 잔잔한 수면에 정박한 보트·요트 돛대, 뒤로 유럽풍 건물들이 줄지어',
    opts: [
      { l: 'A', t: 'A woman is strolling along the pier.',  tag: '동작 불일치형',       ex: '여자가 부두를 따라 산책하고 있는 모습이 아니다.' },
      { l: 'B', t: 'Tourists are posing for a photograph.', tag: '동작 불일치형',       ex: '관광객들이 사진을 찍고 있는 모습이 아니다.' },
      { l: 'C', t: 'Some boats are docked in a harbor.',    ok: true,                 ev: '배들이 항구에 정박해 있는 모습이므로 정답이다.' },
      { l: 'D', t: 'Some awnings extend over a canal.',     tag: '상태·배치·관계 불일치형', ex: '차양들이 운하 위까지 뻗어 있는 모습이 아니다.' },
    ] },
];

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    // 태그명 → id
    const { rows: tagRows } = await c.query(`select id, tag_name from wrong_answer_tags where part=1`);
    const tagId = new Map(tagRows.map((t) => [t.tag_name, t.id]));

    for (const q of DATA) {
      const { rows: qr } = await c.query(`select id, content from questions where question_code=$1`, [q.code]);
      if (!qr.length) { console.error(`  ! ${q.code} 없음 — 건너뜀`); continue; }
      const qid = qr[0].id;

      // content: 기존 유지하되 실제 값으로 덮고 audio_url 제거(재생성 유도)
      const content = { ...(qr[0].content || {}) };
      delete content.audio_url;
      content.stage = undefined; delete content.stage; // 유형학습(수업)은 stage 없음
      content.image_url = q.img;
      content.photo_type = q.photo_type;
      content.key_elements = q.key_elements;
      content.question_text = QUESTION_TEXT;
      await c.query(`update questions set content=$2 where id=$1`, [qid, content]);

      // 보기 재삽입
      await c.query(`delete from question_options where question_id=$1`, [qid]);
      for (const o of q.opts) {
        const tid = o.tag ? tagId.get(o.tag) : null;
        if (o.tag && tid == null) throw new Error(`태그 매칭 실패: "${o.tag}" (${q.code} ${o.l})`);
        await c.query(
          `insert into question_options
             (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation, audio_url)
           values ($1,$2,$3,$4,$5,$6,$7,null)`,
          [qid, o.l, o.t, !!o.ok, tid, o.ev ?? null, o.ex ?? null]
        );
      }
      console.log(`  ok ${q.code}  (정답 ${q.opts.find((o) => o.ok).l}, 보기 ${q.opts.length}, 태그 ${q.opts.filter((o) => o.tag).length})`);
    }
    console.log('적재 완료. 다음: gen_part1_practice_audio.js + gen_option_audio.js');
  } finally {
    await c.end();
  }
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
