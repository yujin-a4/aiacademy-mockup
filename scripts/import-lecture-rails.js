// 시트 "[공통] 스케폴딩 기본 설계 (유형학습_G)" 덤프 → lecture_steps 테이블 임포트.
// 재실행 안전: 강의 단위로 delete 후 insert (시트 수정 → dump-sheet.js → 이 스크립트 재실행으로 갱신).
//
// 시트 블록 구조 (강의마다 반복, 열 위치는 Part별로 다름):
//   [r,   c] "RC8강 — 능동태·수동태 [유형코드: RC-P5-08]"
//   [r+1, c] 단계 | AI가 따라야 할 규칙 | 문항마다 달라지는 정보 (DB) | AI가 자유롭게 표현 가능한 부분
//   [r+2..] "S2⏎ 유형 판별" | 규칙 텍스트 | 필드 참조 | 자유 표현   ← S코드로 시작하는 동안 수집
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DUMP = path.join(__dirname, 'dump', '[공통] 스케폴딩 기본 설계 (유형학습_G).json');

const HEADER_RE = /^(.+?)\s*\[유형코드:\s*([A-Z]{2}-P\d-\d+)\]\s*$/;
const STEP_RE = /^S\d/; // 스텝 셀 판별용 — 코드는 첫 줄 전체 사용 ('S2', 'S2+S3', 'S5①' 등)

function parseRails() {
  const { rows } = JSON.parse(fs.readFileSync(DUMP, 'utf-8'));
  const rails = []; // { code, steps: [{ code, rule, dbFields, freeExpr }] }

  rows.forEach((row, r) => {
    (row || []).forEach((cell, c) => {
      if (typeof cell !== 'string') return;
      const m = cell.trim().match(HEADER_RE);
      if (!m) return;
      const lectureCode = m[2];

      // 헤더 다음 행이 "단계" 컬럼 헤더인지 확인 (아니면 단순 언급 셀이므로 건너뜀)
      const colHeader = (rows[r + 1] || [])[c];
      if (!colHeader || !String(colHeader).includes('단계')) return;

      const steps = [];
      for (let i = r + 2; i < rows.length; i++) {
        const stepCell = (rows[i] || [])[c];
        const text = stepCell ? String(stepCell).trim() : '';
        if (!text || !STEP_RE.test(text)) break; // 빈 행 / ✅검증 / 다음 강의 헤더에서 종료
        const stepCode = text.split('\n')[0].trim(); // 첫 줄 = 코드 ('S2', 'S2+S3', 'S5①' 등)
        steps.push({
          code: stepCode,
          rule: String((rows[i] || [])[c + 1] ?? '').trim(),
          dbFields: String((rows[i] || [])[c + 2] ?? '').trim() || null,
          freeExpr: String((rows[i] || [])[c + 3] ?? '').trim() || null,
        });
      }
      if (steps.length) rails.push({ code: lectureCode, steps });
    });
  });
  return rails;
}

async function main() {
  const rails = parseRails();
  console.log(`시트에서 파싱된 강의 레일: ${rails.length}개`);
  for (const r of rails) console.log(`  ${r.code}: ${r.steps.map((s) => s.code).join(' → ')}`);

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    let inserted = 0;
    for (const rail of rails) {
      const lec = await client.query('select id from lectures where lecture_code = $1', [rail.code]);
      if (!lec.rows.length) {
        console.warn(`  ⚠ lectures에 없음, 건너뜀: ${rail.code}`);
        continue;
      }
      const lectureId = lec.rows[0].id;
      await client.query('delete from lecture_steps where lecture_id = $1', [lectureId]);
      for (let i = 0; i < rail.steps.length; i++) {
        const s = rail.steps[i];
        await client.query(
          `insert into lecture_steps (lecture_id, step_order, step_code, fixed_rule, db_fields, free_expression)
           values ($1, $2, $3, $4, $5, $6)`,
          [lectureId, i + 1, s.code, s.rule, s.dbFields, s.freeExpr],
        );
        inserted++;
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
