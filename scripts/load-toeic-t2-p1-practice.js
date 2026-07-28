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
 * YBM 실전토익 LC 1000 TEST2 Part1 → 실전(practice) 문항 6개 적재.
 * 수업(TEST1)과 겹치지 않게 TEST2에서, 유형은 강의 테마에 맞춰 배치:
 *   LC-P1-01 (사진 판별): P001=Q2 약국(1인), P002=Q4 트렁크(2인), P003=Q6 복도(사물)
 *   LC-P1-02 (동작vs상태): P001=Q1 카메라(동작), P002=Q3 상자(상태), P003=Q5 건물(상태)
 * 사진은 본권 TEST2 Part1(p18~20) 추출본을 실전 슬롯 part1_{n}_p{k}.jpg 로 복사.
 * stage='practice' 유지. 재실행 안전. 출처: LC 해설 TEST2 Part1. key_elements=비전 저작.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Client } = require('pg');
const QT = '사진을 가장 잘 묘사한 보기를 고르시오.';

const DATA = [
  // ── LC-P1-01 실전 ──
  { code: 'LC-P1-01-P001', img: '/part1/part1_1_p1.jpg', photo_type: '인물 중심 사진(1인 등장)',
    key_elements: '약국/드러그스토어, 흰 가운 입은 여성이 한 팔에 클립보드를 끼고 다른 손으로 유리 진열장 높은 선반을 가리킴, 선반마다 약·제품 상자가 가득 쌓여 있음',
    opts: [
      { l:'A', t:'She’s writing notes on a clipboard.', tag:'동작 불일치형', ex:'여자가 클립보드에 메모를 적고 있는 모습이 아니다.' },
      { l:'B', t:'She’s sliding open a glass door.',    tag:'동작 불일치형', ex:'여자가 유리문을 밀어서 열고 있는 모습이 아니다.' },
      { l:'C', t:'There are products stacked on shelves.', ok:true,        ev:'선반에 제품들이 쌓여 있으므로 정답이다.' },
      { l:'D', t:'There are binders on a counter.',     tag:'주체·대상 불일치형', ex:'사진에 카운터가 보이지 않는다.' },
    ] },
  { code: 'LC-P1-01-P002', img: '/part1/part1_1_p2.jpg', photo_type: '인물 중심 사진(2인 이상 등장)',
    key_elements: '야외 주차장, SUV 열린 트렁크에 여행가방·배낭이 실려 있고 사람들이 차 뒤에 서서 짐을 싣는 중(한 남성이 캐리어를 듦, 두 여성)',
    opts: [
      { l:'A', t:'Some people are gathered around a display.', tag:'주체·대상 불일치형', ex:'사진에 전시품이 보이지 않는다.' },
      { l:'B', t:'Some people are standing behind a vehicle.', ok:true,             ev:'사람들이 자동차 뒤에 서 있으므로 정답이다.' },
      { l:'C', t:'One of the people is searching through a suitcase.', tag:'동작 불일치형', ex:'여행 가방을 뒤지고 있는 사람이 보이지 않는다.' },
      { l:'D', t:'One of the people is picking up a piece of furniture.', tag:'주체·대상 불일치형', ex:'사진에 가구가 보이지 않는다.' },
    ] },
  { code: 'LC-P1-01-P003', img: '/part1/part1_1_p3.jpg', photo_type: '사물·풍경 사진',
    key_elements: '밝은 실내 복도, 왼쪽 붙박이 책장에 책이 가득, 오른쪽 벽에 액자 하나가 걸려 있음, 나무 벤치, 천장 트랙 조명, 끝에 유리문 너머 정원',
    opts: [
      { l:'A', t:'A framed picture is mounted on the wall.', ok:true,        ev:'벽에 액자가 걸려 있으므로 정답이다.' },
      { l:'B', t:'Some books are scattered on a rug.',       tag:'주체·대상 불일치형', ex:'사진에 깔개가 보이지 않는다.' },
      { l:'C', t:'A bench is being placed on the floor.',    tag:'동작 불일치형', ex:'벤치가 바닥에 놓이고 있는 모습이 아니다.' },
      { l:'D', t:'Some light fixtures are being installed.', tag:'동작 불일치형', ex:'조명 기구들이 설치되고 있는 모습이 아니다.' },
    ] },
  // ── LC-P1-02 실전 ──
  { code: 'LC-P1-02-P001', img: '/part1/part1_2_p1.jpg', photo_type: '인물 중심 사진(2인 이상 등장)',
    key_elements: '사무실, 안경 쓴 여성과 수염 난 남성이 나란히 서서 DSLR 카메라를 함께 들여다봄, 왼쪽에 데스크톱 모니터 뒷면',
    opts: [
      { l:'A', t:'They’re wiping off a desk.',            tag:'동작 불일치형', ex:'사람들이 책상을 닦고 있는 모습이 아니다.' },
      { l:'B', t:'They’re examining a camera.',           ok:true,          ev:'사람들이 카메라를 살펴보고 있으므로 정답이다.' },
      { l:'C', t:'They’re lifting a computer monitor.',   tag:'동작 불일치형', ex:'사람들이 컴퓨터 모니터를 들어 올리고 있는 모습이 아니다.' },
      { l:'D', t:'They’re holding some files.',           tag:'주체·대상 불일치형', ex:'사진에 서류철이 보이지 않는다.' },
    ] },
  { code: 'LC-P1-02-P002', img: '/part1/part1_2_p2.jpg', photo_type: '인물 중심 사진(2인 이상 등장)',
    key_elements: '사무실, 모자 쓴 두 남성이 책상 맞은편에 서서 택배 상자를 두고 작업(한 명이 테이프로 포장), 벽돌벽·벽시계·금속 선반·화분',
    opts: [
      { l:'A', t:'The men are on opposite sides of a table.', ok:true,      ev:'남자들이 탁자의 맞은편에 있으므로 정답이다.' },
      { l:'B', t:'One of the men is wrapping a box in plastic.', tag:'동작 불일치형', ex:'상자를 비닐로 싸고 있는 남자의 모습이 보이지 않는다.' },
      { l:'C', t:'The men are moving some shelving.',         tag:'동작 불일치형', ex:'남자들이 선반을 옮기고 있는 모습이 아니다.' },
      { l:'D', t:'One of the men is unpacking some stationery supplies.', tag:'동작 불일치형', ex:'문구용품의 포장을 풀고 있는 남자의 모습이 보이지 않는다.' },
    ] },
  { code: 'LC-P1-02-P003', img: '/part1/part1_2_p3.jpg', photo_type: '사물·풍경 사진',
    key_elements: '맑은 하늘 아래 유리·콘크리트 사무 건물 외관, 앞 주차장에 승용차 여러 대, 건물 옆 보도에 어린 나무들이 줄지어 심겨 있음',
    opts: [
      { l:'A', t:'Some windows overlook a busy street.',        tag:'주체·대상 불일치형', ex:'사진에 붐비는 거리가 보이지 않는다.' },
      { l:'B', t:'Some cars are stopped at an intersection.',   tag:'주체·대상 불일치형', ex:'사진에 교차로가 보이지 않는다.' },
      { l:'C', t:'Some lines are being painted in a parking lot.', tag:'동작 불일치형', ex:'주차장에 선들이 그려지고 있는 모습이 아니다.' },
      { l:'D', t:'Some trees are growing by a building.',       ok:true,          ev:'건물 옆에 나무들이 자라고 있으므로 정답이다.' },
    ] },
];

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows: tagRows } = await c.query(`select id, tag_name from wrong_answer_tags where part=1`);
    const tagId = new Map(tagRows.map((t) => [t.tag_name, t.id]));
    for (const q of DATA) {
      const { rows: qr } = await c.query(`select id, content from questions where question_code=$1`, [q.code]);
      if (!qr.length) { console.error(`  ! ${q.code} 없음`); continue; }
      const qid = qr[0].id;
      const content = { ...(qr[0].content || {}) };
      delete content.audio_url;
      content.stage = 'practice';           // 실전 유지
      content.image_url = q.img;
      content.photo_type = q.photo_type;
      content.key_elements = q.key_elements;
      content.question_text = QT;
      await c.query(`update questions set content=$2 where id=$1`, [qid, content]);
      await c.query(`delete from question_options where question_id=$1`, [qid]);
      for (const o of q.opts) {
        const tid = o.tag ? tagId.get(o.tag) : null;
        if (o.tag && tid == null) throw new Error(`태그 매칭 실패: "${o.tag}" (${q.code} ${o.l})`);
        await c.query(
          `insert into question_options (question_id, option_label, option_text, is_correct, option_error_tag_id, correct_evidence, option_explanation, audio_url)
           values ($1,$2,$3,$4,$5,$6,$7,null)`,
          [qid, o.l, o.t, !!o.ok, tid, o.ev ?? null, o.ex ?? null]
        );
      }
      console.log(`  ok ${q.code} (정답 ${q.opts.find((o)=>o.ok).l})`);
    }
    console.log('실전 적재 완료.');
  } finally { await c.end(); }
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
