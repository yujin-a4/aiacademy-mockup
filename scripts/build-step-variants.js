/**
 * 변종 사전 생성 — docs/db-restructure-plan.md §7 STEP 2
 *
 * 변종 = 스캐폴딩 단계(S) × 상호작용. "같은 단계를 화면에서 다르게 시키는 방법".
 *   S6 오답 제거 + [선택 응답]  → 학생이 직접 고른다
 *   S6 오답 제거 + [AI 진행]    → AI가 설명하며 제거한다
 * 단계만으로는 화면을 못 그리고(버튼? 필기 캔버스?), 상호작용만으로는 교육 의도를 잃는다.
 *
 * 이 스크립트가 하는 일
 *   lecture_steps 전수 → (단계, 상호작용) 해석 → 중복 제거 → step_variants 에 upsert
 *   해석은 0013 의 별칭표(interaction_aliases / step_code_aliases)만 본다. 추측하지 않는다.
 *   해석 못 한 행은 전부 리포트한다.
 *
 * 사용
 *   node scripts/build-step-variants.js            # dry run — 아무것도 안 씀
 *   node scripts/build-step-variants.js --go       # step_variants 갱신
 *
 * ※ step_variants 는 아직 런타임이 읽지 않는다(STEP 5에서 연결). 지금은 순수 추가라 안 깨진다.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { Client } = require('pg');

const GO = process.argv.includes('--go');
const norm = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim() || null);

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const steps = new Map((await c.query('select code, name from step_types')).rows.map((r) => [r.code, r.name]));
    const iAlias = new Map((await c.query('select raw, interaction_code from interaction_aliases')).rows
      .map((r) => [r.raw, r.interaction_code]));
    const iLabel = new Map((await c.query('select code, label from interactions')).rows.map((r) => [r.code, r.label]));
    const sAlias = new Map((await c.query('select raw, step_code from step_code_aliases')).rows
      .map((r) => [r.raw, r.step_code]));

    const { rows } = await c.query(
      `select l.part, s.instructor_code, s.step_code, s.interaction
         from lecture_steps s join lectures l on l.id = s.lecture_id`,
    );

    /* ── 해석 ── */
    const variants = new Map();          // 'S6|choice' → { … , uses }
    const noInteraction = new Map();     // 상호작용 열 자체가 없는 레일 (강사별 집계)
    const unresolvedStep = new Map();    // 단계 해석 실패
    const unresolvedInter = new Map();   // 상호작용 해석 실패

    for (const r of rows) {
      const rawStep = norm(r.step_code);
      const rawInter = norm(r.interaction);

      // 단계: 문자열에 S코드가 있으면 그 첫 번째가 대표 단계. 없으면 별칭표.
      const m = rawStep && rawStep.match(/S[0-9]/);
      let stepCode = m ? m[0] : (sAlias.get(rawStep) ?? null);
      if (stepCode && !steps.has(stepCode)) stepCode = null;

      if (rawInter == null) {
        noInteraction.set(r.instructor_code, (noInteraction.get(r.instructor_code) ?? 0) + 1);
        continue;
      }
      const interCode = iAlias.get(rawInter) ?? null;

      if (!stepCode) { unresolvedStep.set(rawStep, (unresolvedStep.get(rawStep) ?? 0) + 1); continue; }
      if (!interCode) { unresolvedInter.set(rawInter, (unresolvedInter.get(rawInter) ?? 0) + 1); continue; }

      const key = `${stepCode}|${interCode}`;
      const v = variants.get(key) ?? { stepCode, interCode, uses: 0, parts: new Set(), insts: new Set() };
      v.uses += 1; v.parts.add(r.part); v.insts.add(r.instructor_code);
      variants.set(key, v);
    }

    /* ── 리포트 ── */
    const list = [...variants.values()].sort((a, b) => b.uses - a.uses);
    console.log(`전체 ${rows.length}행 → 변종 ${list.length}개\n`);
    console.log('  변종                  단계                    상호작용                 사용   파트  강사');
    console.log('  ' + '─'.repeat(92));
    for (const v of list) {
      const code = `${v.stepCode}-${v.interCode}`;
      console.log(`  ${code.padEnd(20)} ${String(steps.get(v.stepCode)).padEnd(22)} `
        + `${String(iLabel.get(v.interCode)).padEnd(22)} ${String(v.uses).padStart(4)}   `
        + `${[...v.parts].sort().join('')}   ${[...v.insts].sort().join(',')}`);
    }

    const skipped = [...noInteraction.values()].reduce((a, b) => a + b, 0);
    console.log(`\n[해석 못 한 행]`);
    if (skipped) {
      console.log(`  · 상호작용 열 자체가 없음 — ${skipped}행`);
      for (const [k, n] of [...noInteraction].sort((a, b) => b[1] - a[1])) console.log(`      ${k}: ${n}행`);
      console.log(`    → 시트에 '상호작용 방식' 열이 있는 건 이도윤 레일뿐이다(9열/7열 구성).`);
      console.log(`      다른 강사 레일을 변종화하려면 그 열을 채워야 한다. [콘텐츠팀 결정]`);
    }
    if (unresolvedStep.size) {
      console.log(`  · 단계 해석 실패 — ${[...unresolvedStep.values()].reduce((a, b) => a + b, 0)}행`);
      for (const [k, n] of [...unresolvedStep].sort((a, b) => b[1] - a[1])) console.log(`      "${k}" ${n}행`);
      console.log(`    → step_code_aliases 에서 needs_review 인 항목이다. 사람이 정하면 그 행만 고치면 된다.`);
    }
    if (unresolvedInter.size) {
      console.log(`  · 상호작용 해석 실패 — ${[...unresolvedInter.values()].reduce((a, b) => a + b, 0)}행`);
      for (const [k, n] of [...unresolvedInter].sort((a, b) => b[1] - a[1])) console.log(`      "${k}" ${n}행`);
      console.log(`    → interaction_aliases 에 행을 추가하면 된다.`);
    }
    if (!skipped && !unresolvedStep.size && !unresolvedInter.size) console.log('  없음');

    const covered = rows.length - skipped
      - [...unresolvedStep.values()].reduce((a, b) => a + b, 0)
      - [...unresolvedInter.values()].reduce((a, b) => a + b, 0);
    console.log(`\n커버리지: ${covered} / ${rows.length}행 (상호작용 열이 있는 레일 기준 `
      + `${covered} / ${rows.length - skipped} = ${((covered / (rows.length - skipped)) * 100).toFixed(1)}%)`);

    if (!GO) { console.log('\n※ dry run — 실제로 넣으려면 --go'); return; }

    /* ── 저장 ── */
    // scope/fade_policy/min_level 은 건드리지 않는다. 사람이 정한 값을 재생성이 덮으면 안 된다.
    for (const v of list) {
      await c.query(
        `insert into step_variants (code, step_code, interaction_code, name, uses, note)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (code) do update set uses = excluded.uses, note = excluded.note`,
        [`${v.stepCode}-${v.interCode}`, v.stepCode, v.interCode,
          `${steps.get(v.stepCode)} · ${iLabel.get(v.interCode)}`,
          v.uses,
          `lecture_steps 실측 — 파트 ${[...v.parts].sort().join('·')} / 강사 ${[...v.insts].sort().join('·')}`],
      );
    }
    console.log(`\n✓ step_variants ${list.length}개 저장 (scope·fade_policy 는 유지)`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
