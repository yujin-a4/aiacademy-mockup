// 강사별 스캐폴딩 시트 덤프 → lecture_steps 테이블 임포트 (instructor_code 지정분).
// 재실행 안전: (lecture_id, instructor_code) 단위 delete 후 insert.
//   시트 수정 → dump-sheet.js "[윤다은 ver] ..." / "[이도윤 ver] ..." → 이 스크립트 재실행으로 갱신.
//
// ※ 현재 스코프: FGI 핵심 파트인 PART 1 (LC-P1-01, LC-P1-02)만. 다른 파트는 열 위치만 추가하면 확장 가능.
//
// 시트 열 배치(강사 탭 공통): 각 PART가 좌→우로 5~10열씩 나열되고, PART 1은 [단계 | 규칙 | DB참조 | 말투] 4열.
// 세로로 "LCn강 — ... [유형코드: ...]" 강의 헤더 → "단계" 컬럼헤더 → S코드 스텝 행들이 반복된다.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// instructor_code → { dump 파일, PART별 열 그룹 [단계, 규칙, DB참조, 말투] }
const CONFIG = [
  { instructor: 'yun_daeun', dump: '[윤다은 ver] 스케폴딩 (유형학습) 수정중.json', parts: { P1: [8, 9, 10, 11] } },
  { instructor: 'lee_doyun', dump: '[이도윤 ver] 스케폴딩 (유형학습) 수정중.json', parts: { P1: [8, 9, 10, 11] } },
];

const cell = (row, c) => (row && row[c] != null ? String(row[c]).trim() : '');
const oneLine = (s) => s.replace(/\s*\n\s*/g, ' ').trim();

/** 강사 한 명의 PART 열 그룹을 파싱 → [{ code: 'LC-P1-01', steps: [{code,rule,dbFields,freeExpr}] }] */
function parsePart(dumpFile, cols) {
  const { rows } = JSON.parse(fs.readFileSync(path.join(__dirname, 'dump', dumpFile), 'utf-8'));
  const [cStep, cRule, cDb, cFree] = cols;
  const rails = [];
  let cur = null;

  for (const row of rows) {
    const step = cell(row, cStep);
    if (!step) continue; // 스텝·헤더 행은 항상 단계 셀이 채워져 있음. 빈칸/스페이서는 건너뜀.

    // 강의 헤더: "LC1강 — ...", "LC2강 — ... [유형코드: LC-P1-02]"
    const h = step.match(/^LC(\d+)강/);
    if (h) {
      const codeM = step.match(/\[유형코드:\s*([A-Z]{2}-P\d-\d+)\]/);
      cur = { code: codeM ? codeM[1] : `LC-P1-${String(h[1]).padStart(2, '0')}`, steps: [] };
      rails.push(cur);
      continue;
    }
    if (!cur) continue; // 강의 시작 전(레이어 안내 등)은 무시
    if (/^(PART|\[레이어)/.test(step)) continue;

    const rule = cell(row, cRule);
    if (!rule || rule.startsWith('AI가 따라야')) continue; // 컬럼 헤더 행 / 규칙 없는 행 제외

    const stepCode = oneLine(step);
    const last = cur.steps[cur.steps.length - 1];
    if (last && last.code === stepCode && oneLine(last.rule) === oneLine(rule)) continue; // 연속 중복 방지(시트 말미 중복 S7 등)
    cur.steps.push({ code: stepCode, rule, dbFields: cell(row, cDb) || null, freeExpr: cell(row, cFree) || null });
  }
  return rails.filter((r) => r.steps.length);
}

async function main() {
  const plan = []; // { instructor, rails }
  for (const cfg of CONFIG) {
    const rails = [];
    for (const cols of Object.values(cfg.parts)) rails.push(...parsePart(cfg.dump, cols));
    plan.push({ instructor: cfg.instructor, rails });
  }

  console.log('파싱 결과:');
  for (const p of plan) {
    console.log(`  [${p.instructor}]`);
    for (const r of p.rails) console.log(`    ${r.code}: ${r.steps.map((s) => s.code).join(' → ')}`);
  }

  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    let inserted = 0;
    for (const p of plan) {
      for (const rail of p.rails) {
        const lec = await client.query('select id from lectures where lecture_code = $1', [rail.code]);
        if (!lec.rows.length) {
          console.warn(`  ⚠ lectures에 없음, 건너뜀: ${rail.code}`);
          continue;
        }
        const lectureId = lec.rows[0].id;
        await client.query(
          'delete from lecture_steps where lecture_id = $1 and instructor_code = $2',
          [lectureId, p.instructor],
        );
        for (let i = 0; i < rail.steps.length; i++) {
          const s = rail.steps[i];
          await client.query(
            `insert into lecture_steps (lecture_id, instructor_code, step_order, step_code, fixed_rule, db_fields, free_expression)
             values ($1, $2, $3, $4, $5, $6, $7)`,
            [lectureId, p.instructor, i + 1, s.code, s.rule, s.dbFields, s.freeExpr],
          );
          inserted++;
        }
      }
    }
    console.log(`lecture_steps 입력 완료: ${inserted}행`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
