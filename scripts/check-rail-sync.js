/**
 * 레일 동기화 상태 검사 (읽기 전용 · 아무것도 쓰지 않는다).
 *
 * 왜 필요한가 — docs/db-restructure-plan.md §7 STEP 1
 *   스캐폴딩 레일은 2단 파이프라인이다.
 *     구글시트 → (dump-sheet.js) → 덤프 JSON → (import-instructor-rails.js) → lecture_steps
 *                                                → (import-rail-components.js) → rail_steps + rail_compositions
 *   그런데 화면은 rail_compositions를 **먼저** 본다 (src/data/db/lectureStepStore.ts).
 *   즉 1단계만 돌리고 2단계를 잊으면, 콘텐츠팀이 시트를 고쳐도 화면은 안 바뀐다. 조용히.
 *   그 "조용한 미반영"을 시끄럽게 만드는 게 이 스크립트다.
 *
 * 검사 항목
 *   [1] 드리프트  — rail_compositions로 재구성한 레일이 lecture_steps 원본과 다른가
 *   [2] 미이식    — lecture_steps에는 있는데 rail_compositions가 없는 파트 (정상일 수 있음)
 *   [3] 덤프 신선도 — 덤프 JSON 파일이 DB보다 새것인가 (= 임포트를 안 돌렸다는 신호)
 *
 * 사용
 *   node scripts/check-rail-sync.js            # 전체 검사
 *   node scripts/check-rail-sync.js --part 5   # 특정 파트만
 *
 * 종료 코드: 드리프트가 있으면 1 (sync-rails.js가 이걸 보고 멈춘다)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const argv = process.argv.slice(2);
const partArg = argv.indexOf('--part');
const ONLY_PART = partArg >= 0 ? Number(argv[partArg + 1]) : null;

/** 공백·줄바꿈만 다른 건 같은 값으로 본다 (임포터와 동일 규칙) */
const n = (s) => (s == null ? null : String(s).replace(/\s*\n\s*/g, ' ').trim() || null);

/** 원본과 이식본을 비교할 필드 — import-rail-components.js의 검증부와 같다 */
const FIELDS = ['step_code', 'interaction', 'audio_mode', 'script_mode', 'student_prompt', 'free_expression'];

const DUMP_DIR = path.join(__dirname, 'dump');

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  let problems = 0;

  try {
    /* ── 어떤 (파트, 강사) 조합이 이식돼 있나 ── */
    const { rows: imported } = await client.query(
      `select l.part, rc.instructor_code, count(*) n
         from rail_compositions rc
         join lectures l on l.id = rc.lecture_id
        group by 1, 2 order by 1, 2`,
    );

    const { rows: raw } = await client.query(
      `select l.part, s.instructor_code, count(*) n
         from lecture_steps s
         join lectures l on l.id = s.lecture_id
        group by 1, 2 order by 1, 2`,
    );

    console.log('현재 상태\n');
    console.log('  파트  강사            lecture_steps   rail_compositions   레일 출처');
    console.log('  ' + '─'.repeat(72));
    for (const r of raw) {
      if (ONLY_PART && r.part !== ONLY_PART) continue;
      const imp = imported.find((i) => i.part === r.part && i.instructor_code === r.instructor_code);
      const src = imp ? '부품 조합 ← 화면이 이걸 본다' : 'lecture_steps (미이식)';
      console.log(`  P${r.part}    ${String(r.instructor_code).padEnd(14)} ${String(r.n).padStart(9)}   ${String(imp ? imp.n : '-').padStart(15)}   ${src}`);
    }

    /* ── [1] 드리프트 검사 ── */
    console.log('\n[1] 드리프트 — 이식본이 lecture_steps 원본과 같은가');
    const targets = imported.filter((i) => !ONLY_PART || i.part === ONLY_PART);
    if (targets.length === 0) {
      console.log('  검사할 이식본 없음');
    }

    for (const t of targets) {
      const { rows: origin } = await client.query(
        `select l.lecture_code lc, s.step_order o, s.step_code, s.interaction,
                s.audio_mode, s.script_mode, s.student_prompt, s.free_expression
           from lecture_steps s
           join lectures l on l.id = s.lecture_id
          where s.instructor_code = $1 and l.part = $2
          order by l.lecture_code, s.step_order`,
        [t.instructor_code, t.part],
      );

      const { rows: built } = await client.query(
        `select l.lecture_code lc, rc.step_order o, rs.name step_code, rs.interaction,
                rs.audio_mode, rs.script_mode,
                coalesce(rc.student_prompt_override, rs.student_prompt, rc.student_prompt_seed) student_prompt,
                coalesce(rc.tutor_directive_override, rs.tutor_directive, rc.tutor_directive_seed) free_expression
           from rail_compositions rc
           join lectures l on l.id = rc.lecture_id
           join rail_steps rs on rs.id = rc.rail_step_id
          where rc.instructor_code = $1 and l.part = $2
          order by l.lecture_code, rc.step_order`,
        [t.instructor_code, t.part],
      );

      const map = new Map(built.map((r) => [`${r.lc}|${r.o}`, r]));
      let diff = 0;
      for (const o of origin) {
        const x = map.get(`${o.lc}|${o.o}`);
        if (!x) {
          if (diff < 5) console.log(`  ✗ 누락  ${o.lc} [${o.o}]`);
          diff += 1;
          continue;
        }
        for (const f of FIELDS) {
          if (n(o[f]) !== n(x[f])) {
            if (diff < 5) {
              console.log(`  ✗ ${o.lc} [${o.o}] ${f}`);
              console.log(`      시트(원본): ${n(o[f])}`);
              console.log(`      화면(이식): ${n(x[f])}`);
            }
            diff += 1;
          }
        }
      }
      if (diff === 0) {
        console.log(`  ✓ P${t.part} / ${t.instructor_code} — ${origin.length}행 일치`);
      } else {
        console.log(`  ✗ P${t.part} / ${t.instructor_code} — 불일치 ${diff}건${diff > 5 ? ' (앞 5건만 표시)' : ''}`);
        console.log(`     → 시트 수정이 화면에 반영되지 않은 상태다. node scripts/sync-rails.js --go --part ${t.part}`);
        problems += 1;
      }
    }

    /* ── [2] 강사 레일이 이식본에 빠져 있나 ── */
    console.log('\n[2] 이식 누락 — 같은 파트인데 일부 강사만 이식된 경우');
    let miss = 0;
    for (const r of raw) {
      if (ONLY_PART && r.part !== ONLY_PART) continue;
      const partImported = imported.some((i) => i.part === r.part);
      const meImported = imported.some((i) => i.part === r.part && i.instructor_code === r.instructor_code);
      if (partImported && !meImported) {
        console.log(`  ! P${r.part} / ${r.instructor_code} — 이 파트는 이식됐는데 이 강사만 빠졌다 (${r.n}행)`);
        console.log(`     → 화면이 이 강사를 고르면 lecture_steps로 폴백한다. 의도한 것인지 확인 필요`);
        miss += 1;
      }
    }
    if (miss === 0) console.log('  ✓ 없음');

    /* ── [3] 덤프 파일이 DB보다 새것인가 ── */
    console.log('\n[3] 덤프 신선도 — 시트를 다시 받아놓고 임포트를 안 돌렸나');
    const { rows: [{ last }] } = await client.query(
      'select max(created_at) last from lecture_steps',
    );
    if (!fs.existsSync(DUMP_DIR)) {
      console.log('  scripts/dump/ 없음 — 덤프를 먼저 받아야 한다 (node scripts/dump-sheet.js "<탭이름>")');
    } else {
      const dumps = fs.readdirSync(DUMP_DIR).filter((f) => f.endsWith('.json') && f.includes('스케폴딩'));
      let stale = 0;
      for (const f of dumps) {
        const m = fs.statSync(path.join(DUMP_DIR, f)).mtime;
        if (last && m > new Date(last)) {
          console.log(`  ! ${f}`);
          console.log(`     덤프 ${m.toISOString().slice(0, 16)} > DB ${new Date(last).toISOString().slice(0, 16)} — 임포트 안 돌린 듯`);
          stale += 1;
        }
      }
      if (stale === 0) console.log(`  ✓ 덤프 ${dumps.length}개 모두 DB보다 오래됨 (임포트 반영됨)`);
      else problems += 1;
    }

    console.log(problems === 0
      ? '\n결과: 이상 없음'
      : `\n결과: 문제 ${problems}건 — 위 안내대로 sync-rails.js를 돌려라`);
  } finally {
    await client.end();
  }

  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERR', e.message); process.exit(2); });
