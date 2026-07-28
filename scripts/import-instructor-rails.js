// 강사별 스캐폴딩 시트 덤프 → lecture_steps 테이블 임포트 (instructor_code 지정분).
// 재실행 안전: (lecture_id, instructor_code) 단위 delete 후 insert.
//   시트 수정 → dump-sheet.js "[윤다은 ver] ..." / "[이도윤 ver] ..." → 이 스크립트 재실행으로 갱신.
//
// ※ 스코프: 0713 완료본 기준 LC/RC 7개 파트 전부 (윤다은 40강, 이도윤 42강).
//
// 시트 구조: 각 PART가 좌→우로 열 그룹을 이루고, 세로로
//   "LCn강 — ... [유형코드: ...]" 강의 헤더 → 컬럼헤더 행 → 스텝 행들 이 반복된다.
// 열 구성은 강사마다 다르다 (LAYOUTS 참조):
//   · 윤다은 = 4열  [단계 | 규칙 | DB참조 | 자유표현]
//   · 이도윤 = 9열(LC) / 7열(RC)  [턴 | 단계 | 음원 | 스크립트 | 규칙 | 상호작용 | 학생문구 | DB참조 | 자유표현]
// 이도윤의 추가 열은 0010 마이그레이션에서 뚫은 turn_label/audio_mode/script_mode/interaction/
// student_prompt 컬럼에 무손실로 들어간다.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

/* ── 강사별 시트 레이아웃 ──
   header = 강의 헤더("LCn강 …")가 나타나는 열. 이도윤은 '턴' 열, 윤다은은 '단계' 열.
   나머지 키는 lecture_steps 컬럼명과 1:1. 없는 열은 생략하면 null로 들어간다. */
const CONFIG = [
  {
    instructor: 'yun_daeun',
    dump: '[윤다은 ver] 스케폴딩 (유형학습_G) 수정완료(0713).json',
    // 4열 그룹이 5열 간격으로 반복: P1=8, P2=13, … P7=38
    parts: [8, 13, 18, 23, 28, 33, 38].map((b) => ({
      header: b, step: b, rule: b + 1, db_fields: b + 2, free_expression: b + 3,
    })),
  },
  {
    instructor: 'lee_doyun',
    dump: '[이도윤 ver] 스케폴딩 (유형학습_G)_초안 수정 완료(0713).json',
    parts: [
      // PART 1~4 (LC) — 9열: 턴/단계/음원/스크립트/규칙/상호작용/학생문구/DB참조/자유표현
      ...[8, 18, 28, 38].map((b) => ({
        header: b, turn_label: b, step: b + 1, audio_mode: b + 2, script_mode: b + 3,
        rule: b + 4, interaction: b + 5, student_prompt: b + 6, db_fields: b + 7, free_expression: b + 8,
      })),
      // PART 5~7 (RC) — 7열: 음원/스크립트 열이 없다
      ...[48, 56, 64].map((b) => ({
        header: b, turn_label: b, step: b + 1, rule: b + 2, interaction: b + 3,
        student_prompt: b + 4, db_fields: b + 5, free_expression: b + 6,
      })),
    ],
  },
];

/** lecture_steps에 그대로 들어가는 선택 열 (rule/step은 필수라 별도 취급) */
const OPTIONAL_COLS = [
  'turn_label', 'audio_mode', 'script_mode', 'interaction', 'student_prompt',
  'db_fields', 'free_expression',
];

const cell = (row, c) => (c != null && row && row[c] != null ? String(row[c]).trim() : '');
const oneLine = (s) => s.replace(/\s*\n\s*/g, ' ').trim();

/** "LC12강 — 안내 방송·공지 [유형코드: LC-P4-01]" → lecture_code.
 *  이도윤 탭은 [유형코드:]가 있고, 윤다은 탭은 없어서 강 번호(LC12)로 DB를 되짚는다. */
function lectureCodeOf(header, tokenToCode) {
  const explicit = header.match(/\[유형코드:\s*([A-Z]{2}-P\d-\d+)\]/);
  if (explicit) return explicit[1];
  const token = header.match(/^([LR]C\d+)강/);
  return token ? tokenToCode.get(token[1]) : undefined;
}

/** 한 파트 열 그룹을 세로로 훑어 [{ code, steps: [...] }] 로 파싱 */
function parsePart(rows, cols, tokenToCode, warn) {
  const rails = [];
  let cur = null;
  let section = null; // "── Q1 상황/주제/목적형 ──" 구분선 → 이후 스텝에 상속

  for (const row of rows) {
    const head = cell(row, cols.header);
    const step = cell(row, cols.step);

    // 강의 헤더 — 새 레일 시작
    if (/^[LR]C\d+강/.test(head)) {
      const code = lectureCodeOf(oneLine(head), tokenToCode);
      if (!code) {
        warn(`유형코드 해석 실패, 건너뜀: ${oneLine(head).slice(0, 40)}`);
        cur = null;
        continue;
      }
      cur = { code, steps: [] };
      rails.push(cur);
      section = null;
      continue;
    }
    if (!cur) continue; // 강의 시작 전(레이어 안내·프로필 등)은 무시

    // 하위문제 구분선 — 스텝이 아니라 이후 스텝의 그룹 라벨
    if (/^[─-]{2,}/.test(step)) {
      section = oneLine(step).replace(/^[─\s-]+|[─\s-]+$/g, '');
      continue;
    }
    if (!step || /^(PART|\[레이어|턴|단계)$/.test(step)) continue;

    const rule = cell(row, cols.rule);
    if (!rule || rule.startsWith('AI가 따라야')) continue; // 컬럼 헤더 행 / 규칙 없는 행 제외

    const stepCode = oneLine(step);
    const last = cur.steps[cur.steps.length - 1];
    if (last && last.step_code === stepCode && oneLine(last.fixed_rule) === oneLine(rule)) continue; // 연속 중복 방지

    const s = { step_code: stepCode, fixed_rule: rule, section };
    for (const k of OPTIONAL_COLS) s[k] = cell(row, cols[k]) || null;
    cur.steps.push(s);
  }
  return rails.filter((r) => r.steps.length);
}

async function main() {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // 강 번호 토큰(LC12) → lecture_code 매핑. 윤다은 탭처럼 유형코드가 없는 시트를 위해.
    const { rows: lectures } = await client.query('select id, lecture_code, title from lectures');
    const tokenToCode = new Map();
    const idByCode = new Map();
    for (const l of lectures) {
      idByCode.set(l.lecture_code, l.id);
      const m = String(l.title).match(/^([LR]C\d+)강/);
      if (m) tokenToCode.set(m[1], l.lecture_code);
    }

    const warnings = [];
    /** 시트 탭 이름이 바뀌면 덤프 파일명도 같이 바뀐다. CONFIG.dump 와 정확히 일치하는 파일이
     *  없으면, 같은 강사 접두사(`[이도윤 ver]` …) 중 **가장 최근 파일**로 대체하고 시끄럽게 알린다.
     *  (예전에는 여기서 조용히 죽거나 옛 덤프를 그대로 다시 넣을 수 있었다) */
    const resolveDump = (fileName) => {
      const dir = path.join(__dirname, 'dump');
      const exact = path.join(dir, fileName);
      if (fs.existsSync(exact)) return exact;
      const prefix = (fileName.match(/^\[[^\]]+\]/) || [''])[0];
      const cands = fs.readdirSync(dir)
        .filter((f) => f.endsWith('.json') && f.startsWith(prefix) && f.includes('스케폴딩'))
        .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtime }))
        .sort((a, b) => b.m - a.m);
      if (!cands.length) {
        throw new Error(`덤프를 찾을 수 없다: "${fileName}"\n  ${prefix} 로 시작하는 대체 파일도 없다. `
          + `먼저 node scripts/dump-sheet.js "<탭 이름>" 을 돌려라.`);
      }
      console.warn(`⚠ 덤프 파일명 불일치\n    CONFIG: "${fileName}"\n    대신 사용: "${cands[0].f}" (가장 최근)\n`
        + `    시트 탭 이름이 바뀐 것 같다. CONFIG.dump 를 갱신해라.`);
      return path.join(dir, cands[0].f);
    };

    const plan = CONFIG.map((cfg) => {
      const { rows } = JSON.parse(fs.readFileSync(resolveDump(cfg.dump), 'utf-8'));
      const rails = [];
      for (const cols of cfg.parts) {
        rails.push(...parsePart(rows, cols, tokenToCode, (m) => warnings.push(`[${cfg.instructor}] ${m}`)));
      }
      return { instructor: cfg.instructor, rails };
    });

    console.log('파싱 결과:');
    for (const p of plan) {
      console.log(`  [${p.instructor}] ${p.rails.length}강 / ${p.rails.reduce((n, r) => n + r.steps.length, 0)}스텝`);
      const missing = [...idByCode.keys()]
        .filter((c) => c !== 'RC-P7-99' && !p.rails.some((r) => r.code === c));
      if (missing.length) console.log(`    ⚠ 시트에 없는 강의(common 폴백): ${missing.join(', ')}`);
    }
    warnings.forEach((w) => console.warn('  ⚠ ' + w));

    const cols = ['step_code', 'fixed_rule', 'section', ...OPTIONAL_COLS];
    let inserted = 0;
    for (const p of plan) {
      for (const rail of p.rails) {
        const lectureId = idByCode.get(rail.code);
        if (!lectureId) {
          console.warn(`  ⚠ lectures에 없음, 건너뜀: ${rail.code}`);
          continue;
        }
        await client.query(
          'delete from lecture_steps where lecture_id = $1 and instructor_code = $2',
          [lectureId, p.instructor],
        );
        for (let i = 0; i < rail.steps.length; i++) {
          const s = rail.steps[i];
          const values = [lectureId, p.instructor, i + 1, ...cols.map((c) => s[c] ?? null)];
          const ph = values.map((_, k) => `$${k + 1}`).join(', ');
          await client.query(
            `insert into lecture_steps (lecture_id, instructor_code, step_order, ${cols.join(', ')}) values (${ph})`,
            values,
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
