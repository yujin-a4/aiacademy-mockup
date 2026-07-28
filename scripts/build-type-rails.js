/**
 * 레일을 강의 단위 → 유형 단위로 (STEP 5) — docs/db-restructure-plan.md §7 STEP 5
 *
 * ── 무엇이 문제인가 ────────────────────────────────────────────────
 * `lecture_steps` 965행 = 강의 43 × 강사 3 × 턴 7~12.
 * **강의마다 레일을 한 벌씩 적어놨다.** 강의가 500개가 되면 레일도 500벌이 된다.
 * 스캐폴딩을 한 군데서 고칠 수가 없다는 뜻이고, 그게 이 재설계의 출발점이었다.
 *
 * 실측: 별칭표(0013)로 정규화한 "변종 순서" 기준으로 42강 → **19벌**.
 * 강의별로 적어놨을 뿐 실제로는 19가지다. 0016이 유형을 19종으로 맞춰뒀다.
 *
 * ── 이 스크립트가 하는 일 ──────────────────────────────────────────
 * 유형마다 소속 강의들의 레일을 모아 **한 벌로 접는다**.
 *   변종        : 단계(S) × 상호작용 → step_variants (0013)
 *   음원·스크립트: 유형 안에서 갈리면 **최빈 원문**을 쓴다 (계획서 D8 — 조합에 붙는다)
 *   문구        : 강의마다 다르므로 최빈값을 seed 로. 실제 화면 문구는 railPrompts 가 LLM으로 만든다
 *
 * ── 버리는 걸 숨기지 않는다 ────────────────────────────────────────
 * 접으면 반드시 뭔가 없어진다. 없어지는 값은 전부 리포트한다 —
 * 특히 음원 지시가 강의마다 다른 자리(Part3·4의 조건부 문장, D5)는 몇 강의가 무엇을 잃는지 찍는다.
 *
 * 사용
 *   node scripts/build-type-rails.js              # dry run (기본) — 접힘 결과 + 손실 리포트
 *   node scripts/build-type-rails.js --go         # type_rails 갱신 (version append)
 *   node scripts/build-type-rails.js --instructor yun_daeun
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { Client } = require('pg');

const GO = process.argv.includes('--go');
const instArg = process.argv.indexOf('--instructor');
const ONLY_INSTRUCTOR = instArg > -1 ? process.argv[instArg + 1] : null;

/* 어느 파트를 접을까.
   실측(2026-07-28): 접으면서 값이 버려지는 자리 17곳이 **전부 LC(P2 3 · P3 7 · P4 7)** 였다.
   LC의 음원 지시는 순수한 진행 지시가 아니라 강의별 내용을 담고 있어서다 —
     "문의 목적·품목 근거가 명확하면 멈추고…"  (LC-P3-01)
     "수량·파손·누락·조건 정보가 나오면…"       (LC-P3-05)
   유형 하나로 접으면 그 내용이 사라진다. 그래서 **RC + Part1만 접는다.**
   계획서 §8이 "Part3·4 변종화 하지 말 것(D5 미결)"이라 한 판단이 실측으로 확인됐고, P2도 같았다.
   LC는 lecture_steps 에 그대로 남고 화면은 뷰의 폴백으로 계속 돈다. */
const partsArg = process.argv.indexOf('--parts');
const PARTS = partsArg > -1
  ? process.argv[partsArg + 1].split(',').map(Number)
  : [1, 5, 6, 7];

const norm = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim() || null);

/** 값 목록에서 최빈값 + 나머지(버려지는 것) */
function mode(values) {
  const counts = new Map();
  for (const v of values) {
    const k = v ?? '';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best = null, bestN = -1;
  for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
  const others = Array.from(counts.entries()).filter(([k]) => k !== best);
  return { value: best || null, others };
}

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const variants = new Map(
      (await c.query('select id, code, step_code, interaction_code from step_variants')).rows
        .map((r) => [`${r.step_code}|${r.interaction_code}`, r]),
    );
    const sAlias = new Map((await c.query('select raw, step_code from step_code_aliases')).rows
      .map((r) => [r.raw, r.step_code]));
    const iAlias = new Map((await c.query('select raw, interaction_code from interaction_aliases')).rows
      .map((r) => [r.raw, r.interaction_code]));

    const { rows } = await c.query(`
      select t.id type_id, t.type_code, t.part, l.lecture_code,
             ls.instructor_code, ls.step_order, ls.step_code, ls.interaction,
             ls.audio_mode, ls.script_mode, ls.student_prompt, ls.free_expression
        from lecture_steps ls
        join lectures l on l.id = ls.lecture_id
        join question_types t on l.lecture_code = any(t.lecture_codes)
       ${ONLY_INSTRUCTOR ? 'where ls.instructor_code = $1' : ''}
       order by t.type_code, ls.instructor_code, ls.step_order`,
      ONLY_INSTRUCTOR ? [ONLY_INSTRUCTOR] : []);

    /* ── (유형, 강사, 순서) 로 모으기 ── */
    const cells = new Map();      // 'typeId|inst|order' → { rows: [] }
    for (const r of rows) {
      const k = `${r.type_id}|${r.instructor_code}|${r.step_order}`;
      if (!cells.has(k)) cells.set(k, { r0: r, rows: [] });
      cells.get(k).rows.push(r);
    }

    const planned = [];
    const noVariant = [];      // 변종으로 못 접은 자리
    const lost = [];           // 접으면서 버려지는 값

    for (const [k, cell] of cells) {
      const [typeId, inst, order] = k.split('|');
      const r0 = cell.r0;

      // 단계: 문자열의 첫 S코드가 대표 단계. 없으면 별칭표 (STEP 2와 같은 규칙)
      const stepCodes = cell.rows.map((r) => {
        const raw = norm(r.step_code);
        const m = raw && raw.match(/S[0-7]/);
        return m ? m[0] : (sAlias.get(raw) ?? null);
      });
      const inters = cell.rows.map((r) => iAlias.get(norm(r.interaction)) ?? null);

      const s = mode(stepCodes).value;
      const i = mode(inters).value;
      const variant = s && i ? variants.get(`${s}|${i}`) : null;

      if (!variant) {
        noVariant.push({
          type_code: r0.type_code, inst, order: Number(order),
          step: norm(r0.step_code), interaction: norm(r0.interaction),
          why: !s ? '단계 해석 실패' : !i ? '상호작용 열이 없거나 해석 실패' : '변종 사전에 없는 조합',
        });
      }

      /* 원문 단계명 — 변종 이름으로 대체하면 Qn 지목과 '오답 제거' 같은 의미 단서를 잃는다.
         화면 해석(fromSteps.readFocusQ / isWrongPick)이 이 문자열을 읽는다. */
      const label = mode(cell.rows.map((r) => norm(r.step_code)));
      if (label.others.length) {
        lost.push({
          type_code: r0.type_code, inst, order: Number(order), label: '단계명',
          kept: label.value, dropped: label.others.map(([v, n]) => ({ v, n })),
          lectures: cell.rows.length,
        });
      }

      const audio = mode(cell.rows.map((r) => norm(r.audio_mode)));
      const script = mode(cell.rows.map((r) => norm(r.script_mode)));
      const sp = mode(cell.rows.map((r) => norm(r.student_prompt)));
      const td = mode(cell.rows.map((r) => norm(r.free_expression)));

      /* 문구 손실도 반드시 리포트한다.
         처음엔 음원·스크립트만 봤다가 놓쳤다 — RC-P5-03(명사 강의)이 접힌 뒤
         RC-P5-08 의 "뒤에 to가 있으니 apply 같은 자동사" 문장을 말했다.
         화면에는 LLM 생성분이 덮이지만(railPrompts), 말투 예시로 들어가는 값이라
         내용어가 섞여 있으면 생성 품질을 끌어내린다. 무엇이 사라졌는지는 보여야 한다. */
      for (const [label, m] of [['음원', audio], ['스크립트', script], ['강사 문구', td], ['학생 문구', sp]]) {
        if (m.others.length) {
          lost.push({
            type_code: r0.type_code, inst, order: Number(order), label,
            kept: m.value, dropped: m.others.map(([v, n]) => ({ v, n })),
            lectures: cell.rows.length,
          });
        }
      }

      planned.push({
        type_id: Number(typeId), type_code: r0.type_code, part: r0.part,
        instructor_code: inst, step_order: Number(order),
        variant_id: variant ? variant.id : null,
        variant_code: variant ? variant.code : null,
        step_label: label.value,
        audio_mode: audio.value, script_mode: script.value,
        student_prompt_seed: sp.value, tutor_directive_seed: td.value,
        source_lecture_code: r0.lecture_code,
        lectures: cell.rows.length,
      });
    }

    /* ── 리포트 ── */
    const byTypeInst = new Map();
    for (const p of planned) {
      const k = `${p.type_code}|${p.instructor_code}`;
      byTypeInst.set(k, (byTypeInst.get(k) ?? 0) + 1);
    }
    const srcRows = rows.length;
    console.log(`lecture_steps ${srcRows}행  →  type_rails ${planned.length}행` +
      `  (${Math.round((1 - planned.length / srcRows) * 100)}% 감소)\n`);

    const byInst = new Map();
    for (const p of planned) {
      const e = byInst.get(p.instructor_code) ?? { rails: new Set(), steps: 0, noVar: 0 };
      e.rails.add(p.type_code); e.steps += 1;
      if (!p.variant_id) e.noVar += 1;
      byInst.set(p.instructor_code, e);
    }
    console.log('  강사        레일(유형) 수   단계 행   변종 미매핑');
    console.log('  ' + '─'.repeat(52));
    for (const [inst, e] of byInst) {
      console.log(`  ${inst.padEnd(12)} ${String(e.rails.size).padStart(8)} ${String(e.steps).padStart(9)} ${String(e.noVar).padStart(12)}`);
    }

    if (noVariant.length) {
      const byWhy = new Map();
      for (const n of noVariant) byWhy.set(n.why, (byWhy.get(n.why) ?? 0) + 1);
      console.log('\n변종으로 못 접은 자리');
      for (const [why, n] of byWhy) console.log(`  ! ${why} — ${n}행`);
      console.log('  (D9: 상호작용 열이 있는 건 이도윤 레일뿐이다. 다른 강사는 화면 동작이 지정돼 있지 않다)');
    }

    if (lost.length) {
      const byPart = new Map();
      for (const l of lost) {
        const p = l.type_code.match(/^P(\d)/)?.[1] ?? '?';
        byPart.set(p, (byPart.get(p) ?? 0) + 1);
      }
      console.log(`\n접으면서 버려지는 값 — ${lost.length}자리 (파트별: ` +
        Array.from(byPart.entries()).sort().map(([p, n]) => `P${p} ${n}`).join(' · ') + ')');
      for (const l of lost.slice(0, 12)) {
        console.log(`  ! ${l.type_code} / ${l.inst} ${l.order}단계 [${l.label}] 강의 ${l.lectures}개`);
        console.log(`      남김: ${(l.kept ?? '(없음)').slice(0, 70)}`);
        for (const d of l.dropped.slice(0, 2)) {
          console.log(`      버림: ${(d.v || '(빈칸)').slice(0, 70)} (${d.n}강)`);
        }
      }
      if (lost.length > 12) console.log(`  … 외 ${lost.length - 12}자리`);
      console.log('  ⚠ Part3·4의 조건부 음원 지시(D5)가 여기 몰려 있다. 화면은 어차피 해석 못 해 버리는 문장이다');
    }

    const write = planned.filter((p) => PARTS.includes(p.part));
    const skipped = planned.length - write.length;
    console.log(`\n반영 대상: Part ${PARTS.join('·')} — ${write.length}행` +
      (skipped ? `  (LC ${skipped}행은 접지 않고 lecture_steps 에 남긴다 — 위 손실 참조)` : ''));

    if (!GO) { console.log('\n(dry run) 반영하려면 --go'); return; }

    /* ── 쓰기: version append ──
       delete + insert 하면 과거 학습 로그가 "어느 레일이었는지" 되짚을 수 없다. 버전을 올린다. */
    const verRes = await c.query('select coalesce(max(version), 0) v from type_rails');
    const version = verRes.rows[0].v + 1;
    let n = 0;
    await c.query('begin');
    try {
      for (const p of write) {
        await c.query(
          `insert into type_rails
             (question_type_id, instructor_code, version, step_order, variant_id, step_label,
              audio_mode, script_mode, student_prompt_seed, tutor_directive_seed,
              source_lecture_code, note)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           on conflict (question_type_id, instructor_code, version, step_order) do update
             set variant_id = excluded.variant_id, step_label = excluded.step_label,
                 audio_mode = excluded.audio_mode, script_mode = excluded.script_mode,
                 student_prompt_seed = excluded.student_prompt_seed,
                 tutor_directive_seed = excluded.tutor_directive_seed,
                 source_lecture_code = excluded.source_lecture_code, note = excluded.note`,
          [p.type_id, p.instructor_code, version, p.step_order, p.variant_id, p.step_label,
            p.audio_mode, p.script_mode, p.student_prompt_seed, p.tutor_directive_seed,
            p.source_lecture_code, `강의 ${p.lectures}개를 접음`],
        );
        n += 1;
      }
      await c.query('commit');
    } catch (err) {
      await c.query('rollback');
      console.error(`FAIL: ${err.message}`);
      return;
    }
    console.log(`\ntype_rails v${version} — ${n}행 반영`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
