// lecture_steps(강의별 레일) → rail_steps + rail_compositions(부품 사전 + 조합표) 이식.
//
// 왜: Part5 16강 112행이 실제로는 부품 13개의 반복이었다. 강의마다 레일을 통째로 들고 있으면
//     "오답 제거 방식을 바꿔보자"에 16개 강의를 손으로 고쳐야 한다. 부품으로 쪼개면 1군데만 고친다.
//     자세한 배경은 supabase/migrations/0011_rail_components.sql 주석 참고.
//
// 원칙 — **이식은 무손실이어야 한다.** 이식 후 해석되는 레일이 원본과 한 글자도 달라지면 안 된다.
//   · 부품 = (단계 라벨 + 상호작용)이 같으면 같은 것으로 본다.
//   · 강의마다 다른 문구는 버리지 않고 `*_seed`에 넣는다 (LLM 말투 예시 + 오프라인 폴백).
//   · `*_override`는 비워 둔다 — 여기에 값이 있으면 LLM 생성이 막히므로, 진짜 예외에만 사람이 채운다.
//
// 사용:
//   node scripts/import-rail-components.js            # dry run (아무것도 안 씀)
//   node scripts/import-rail-components.js --go       # 실제 이식
//   node scripts/import-rail-components.js --go --part 6
//
// 재실행 안전: 해당 파트의 부품·조합을 지우고 다시 넣는다.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Client } = require('pg');

const argv = process.argv.slice(2);
const GO = argv.includes('--go');
const PART = Number(argv[argv.indexOf('--part') + 1]) || 5;
const INSTRUCTOR = 'lee_doyun'; // 턴 상세(음원·스크립트·상호작용)가 채워진 건 이도윤 레일뿐

const n = (s) => (s == null ? null : String(s).replace(/\s*\n\s*/g, ' ').trim() || null);

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select l.id lecture_id, l.lecture_code lc, s.step_order o,
              s.step_code, s.interaction, s.audio_mode, s.script_mode, s.student_prompt, s.free_expression
         from lecture_steps s join lectures l on l.id = s.lecture_id
        where s.instructor_code = $1 and l.part = $2
        order by l.lecture_code, s.step_order`,
      [INSTRUCTOR, PART],
    );
    if (!rows.length) {
      console.log(`Part ${PART} / ${INSTRUCTOR} 레일이 lecture_steps에 없습니다.`);
      return;
    }

    /* ── 1) 부품 뽑기 — (단계 라벨 + 상호작용)이 같으면 같은 부품 ── */
    const parts = new Map();
    for (const r of rows) {
      const key = `${n(r.step_code)}¦${n(r.interaction)}`;
      if (!parts.has(key)) {
        parts.set(key, {
          name: n(r.step_code), interaction: n(r.interaction),
          audio: n(r.audio_mode), script: n(r.script_mode), prompts: [], uses: 0,
        });
      }
      const p = parts.get(key);
      p.uses += 1;
      p.prompts.push(n(r.student_prompt));
    }

    const list = [...parts.entries()].sort((a, b) => b[1].uses - a[1].uses);
    list.forEach(([, p], i) => {
      p.code = `P${PART}-${String(i + 1).padStart(2, '0')}`;
      const uniq = [...new Set(p.prompts)];
      // 문구가 한 종류뿐인 부품만 기본값을 갖는다 (= 그 부품 쓰는 강의 전체가 공유)
      p.defaultPrompt = uniq.length === 1 ? uniq[0] : null;
    });

    const lectures = new Set(rows.map((r) => r.lc)).size;
    console.log(`Part ${PART}: 강의 ${lectures}개 / ${rows.length}행 → 부품 ${list.length}개`);
    for (const [, p] of list) {
      console.log(`  ${p.code}  ${String(p.name).padEnd(28)} [${p.interaction}]  ${p.uses}회` +
        `  기본문구=${p.defaultPrompt ? '있음(공유)' : '없음(강의별 → seed)'}`);
    }
    if (!GO) { console.log('\n※ dry run — 실제로 넣으려면 --go'); return; }

    /* ── 2) 부품 입력 ── */
    await client.query(
      `delete from rail_compositions
        where instructor_code = $1
          and rail_step_id in (select id from rail_steps where part = $2)`,
      [INSTRUCTOR, PART],
    );
    await client.query('delete from rail_steps where part = $1', [PART]);

    const idByCode = new Map();
    for (const [, p] of list) {
      const { rows: [ins] } = await client.query(
        `insert into rail_steps (part, code, name, interaction, audio_mode, script_mode, student_prompt, note)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [PART, p.code, p.name, p.interaction, p.audio, p.script, p.defaultPrompt,
          `lecture_steps(${INSTRUCTOR}·Part${PART})에서 이식 — ${p.uses}개 강의 사용`],
      );
      idByCode.set(p.code, ins.id);
    }

    /* ── 3) 조합 입력 — 부품 기본값과 다른 문구는 seed로 보존(override는 비워 둔다) ── */
    let comp = 0; let seeded = 0;
    for (const r of rows) {
      const p = parts.get(`${n(r.step_code)}¦${n(r.interaction)}`);
      const prompt = n(r.student_prompt);
      const seed = prompt === p.defaultPrompt ? null : prompt;
      if (seed) seeded += 1;
      await client.query(
        `insert into rail_compositions
           (lecture_id, instructor_code, step_order, rail_step_id, student_prompt_seed, tutor_directive_seed)
         values ($1,$2,$3,$4,$5,$6)`,
        [r.lecture_id, INSTRUCTOR, r.o, idByCode.get(p.code), seed, n(r.free_expression)],
      );
      comp += 1;
    }
    console.log(`\n✓ 부품 ${list.length}개 · 조합 ${comp}행 입력 (문구 seed ${seeded}개, 부품 공통 ${comp - seeded}개)`);

    /* ── 4) 무손실 검증 — 이식 결과가 원본과 같은지 ── */
    const { rows: back } = await client.query(
      `select l.lecture_code lc, rc.step_order o, rs.name step_code, rs.interaction,
              rs.audio_mode, rs.script_mode,
              coalesce(rc.student_prompt_override, rs.student_prompt, rc.student_prompt_seed) student_prompt,
              coalesce(rc.tutor_directive_override, rs.tutor_directive, rc.tutor_directive_seed) free_expression
         from rail_compositions rc
         join lectures l on l.id = rc.lecture_id
         join rail_steps rs on rs.id = rc.rail_step_id
        where rc.instructor_code = $1 and l.part = $2
        order by l.lecture_code, rc.step_order`,
      [INSTRUCTOR, PART],
    );
    const F = ['step_code', 'interaction', 'audio_mode', 'script_mode', 'student_prompt', 'free_expression'];
    const map = new Map(back.map((r) => [`${r.lc}|${r.o}`, r]));
    let diff = 0;
    for (const o of rows) {
      const x = map.get(`${o.lc}|${o.o}`);
      if (!x) { console.log(`  ✗ 누락 ${o.lc} [${o.o}]`); diff += 1; continue; }
      for (const f of F) {
        if (n(o[f]) !== n(x[f])) {
          console.log(`  ✗ ${o.lc} [${o.o}] ${f}\n      원본: ${n(o[f])}\n      이식: ${n(x[f])}`);
          diff += 1;
        }
      }
    }
    console.log(diff ? `\n⚠ 불일치 ${diff}건 — 이식이 무손실이 아닙니다.` : '\n✓ 무손실 검증 통과 — 화면 동작이 바뀌지 않습니다.');
  } finally {
    await client.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
