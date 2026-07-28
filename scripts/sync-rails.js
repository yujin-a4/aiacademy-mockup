/**
 * 레일 동기화 한 방 — docs/db-restructure-plan.md §7 STEP 1
 *
 * 문제: 스캐폴딩 레일은 2단 파이프라인인데 2단계가 수동이라 잊기 쉽다.
 *
 *   구글시트 ─(dump-sheet.js)→ 덤프 JSON ─(import-instructor-rails.js)→ lecture_steps
 *                                          ─(import-rail-components.js)→ rail_steps + rail_compositions
 *                                                                              ↑
 *                                                            화면은 여기를 먼저 본다
 *
 *   1단계만 돌리면 콘텐츠팀이 시트를 고쳐도 화면은 그대로다. 오류도 안 난다.
 *   이 스크립트는 두 단계를 붙여 돌리고, 끝나면 반드시 검증한다.
 *
 * 사용
 *   node scripts/sync-rails.js                 # 검사만 (아무것도 안 씀) ← 기본
 *   node scripts/sync-rails.js --go            # 실제 동기화
 *   node scripts/sync-rails.js --go --part 5   # 부품 재이식을 Part5만
 *
 * ⚠️ 시트에서 덤프를 받는 건 이 스크립트가 하지 않는다 (구글 OAuth 토큰이 따로 필요).
 *    시트를 고쳤다면 먼저:  node scripts/dump-sheet.js "<탭 이름>"
 *
 * ⚠️ import-instructor-rails.js 에는 dry run이 없다 — 돌리면 바로 lecture_steps 를 덮는다.
 *    그래서 --go 없이는 절대 호출하지 않는다.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');

const argv = process.argv.slice(2);
const GO = argv.includes('--go');
const pIdx = argv.indexOf('--part');
const ONLY_PART = pIdx >= 0 ? Number(argv[pIdx + 1]) : null;

const run = (script, args = []) => {
  const label = [script, ...args].join(' ');
  console.log(`\n$ node scripts/${label}\n${'─'.repeat(60)}`);
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  return r.status ?? 1;
};

/** 이미 부품화된 파트 = 다시 이식해야 하는 파트. 여기 없는 파트는 건드리지 않는다. */
async function componentizedParts() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows } = await c.query(
      `select distinct l.part
         from rail_compositions rc join lectures l on l.id = rc.lecture_id
        order by 1`,
    );
    return rows.map((r) => r.part);
  } finally {
    await c.end();
  }
}

async function main() {
  const parts = (await componentizedParts()).filter((p) => !ONLY_PART || p === ONLY_PART);

  if (!GO) {
    console.log('검사 모드 (--go 를 붙이면 실제로 동기화한다)\n');
    console.log(`--go 를 붙이면 할 일:`);
    console.log(`  1) import-instructor-rails.js        시트 덤프 → lecture_steps (전 파트·전 강사)`);
    if (parts.length) {
      for (const p of parts) console.log(`  2) import-rail-components.js --go --part ${p}   lecture_steps → 부품 조합`);
    } else {
      console.log(`  2) (부품화된 파트 없음 — 2단계 건너뜀)`);
    }
    console.log(`  3) check-rail-sync.js               결과 검증\n`);
    console.log('지금 상태를 먼저 보여준다:');
    process.exit(run('check-rail-sync.js', ONLY_PART ? ['--part', String(ONLY_PART)] : []));
  }

  /* ── 1단계: 덤프 → lecture_steps ── */
  if (run('import-instructor-rails.js') !== 0) {
    console.error('\n✗ 1단계(lecture_steps 임포트) 실패 — 여기서 멈춘다. 2단계를 돌리면 반쪽 상태가 된다.');
    process.exit(1);
  }

  /* ── 2단계: lecture_steps → 부품 조합 ── */
  // 이미 부품화된 파트만 재이식한다. 새 파트를 부품화하려면 import-rail-components.js 를 직접 부를 것
  // (Part3·4는 audio_mode 조건부 지시문 방침이 미결이라 자동 이식하면 경고가 쏟아진다 — 계획서 D5)
  for (const p of parts) {
    if (run('import-rail-components.js', ['--go', '--part', String(p)]) !== 0) {
      console.error(`\n✗ 2단계(Part${p} 부품 이식) 실패 — lecture_steps 만 갱신된 상태다.`);
      console.error('  화면은 옛 부품 조합을 계속 본다. 반드시 고치고 다시 돌려라.');
      process.exit(1);
    }
  }

  /* ── 3단계: 검증 (조용한 미반영을 시끄럽게) ── */
  const code = run('check-rail-sync.js', ONLY_PART ? ['--part', String(ONLY_PART)] : []);
  if (code !== 0) {
    console.error('\n✗ 동기화는 돌았는데 검증에서 불일치가 남았다. 위 출력을 확인할 것.');
    process.exit(1);
  }
  console.log('\n✓ 레일 동기화 완료 — 시트 · lecture_steps · 부품 조합이 모두 일치한다.');
}

main().catch((e) => { console.error('ERR', e.message); process.exit(2); });
