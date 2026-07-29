/**
 * 레일 드래프트 관리 — docs/rail-editor-plan.md STEP 2
 *
 * 편집기(STEP 3)가 나오기 전까지 드래프트를 만들고 지우는 손도구다.
 * STEP 3 의 `/api/rail-draft` 는 여기 로직을 그대로 서버로 옮긴다.
 *
 * ⚠️ **정본(draft_id is null)은 절대 건드리지 않는다.**
 *    이 스크립트에 정본을 대상으로 하는 UPDATE·DELETE 는 없다. 넣지도 말 것.
 *
 * 사용
 *   node scripts/rail-draft.js list
 *   node scripts/rail-draft.js create <draft_id> <강사> [유형코드...]   # 유형 생략 = 그 강사 전체
 *   node scripts/rail-draft.js show   <draft_id>
 *   node scripts/rail-draft.js drop   <draft_id>
 *
 * 예) node scripts/rail-draft.js create demo-0729 lee_doyun P1-PHOTO-SUBJECT
 *     → /lecture/LC-P1-01?instructor=lee_doyun&rail=demo-0729
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { Client } = require('pg');

const [, , cmd, draftId, instructor, ...types] = process.argv;

const die = (m) => { console.error(m); process.exit(1); };

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    if (cmd === 'list') {
      const { rows } = await c.query(`
        select d.draft_id, d.title, d.base_instructor, d.created_at, d.promoted_at,
               (select count(*)::int from type_rails t where t.draft_id = d.draft_id) as steps
          from rail_drafts d order by d.created_at desc`);
      if (!rows.length) return console.log('드래프트 없음');
      for (const r of rows) {
        console.log(`${r.draft_id.padEnd(16)} ${String(r.steps).padStart(3)}단계  ${r.base_instructor.padEnd(11)}`
          + `  ${r.promoted_at ? '승격됨' : '작업 중'}  ${r.title}`);
      }
      return;
    }

    if (cmd === 'show') {
      if (!draftId) die('draft_id 필요');
      const { rows } = await c.query(`
        select qt.type_code, tr.instructor_code, tr.step_order,
               coalesce(tr.step_label, v.name, '') as step_code, i.label as interaction
          from type_rails tr
          join question_types qt on qt.id = tr.question_type_id
          left join step_variants v on v.id = tr.variant_id
          left join interactions i on i.code = v.interaction_code
         where tr.draft_id = $1
         order by qt.type_code, tr.instructor_code, tr.step_order`, [draftId]);
      if (!rows.length) return console.log(`드래프트 ${draftId} 가 비었거나 없음`);
      let cur = '';
      for (const r of rows) {
        const key = `${r.type_code} / ${r.instructor_code}`;
        if (key !== cur) { cur = key; console.log(`\n${key}`); }
        console.log(`  ${r.step_order}. ${(r.step_code || '').padEnd(26)} [${r.interaction || '-'}]`);
      }
      return;
    }

    if (cmd === 'drop') {
      if (!draftId) die('draft_id 필요');
      const a = await c.query('delete from type_rails where draft_id = $1', [draftId]);
      const b = await c.query('delete from rail_drafts where draft_id = $1', [draftId]);
      console.log(`삭제: 단계 ${a.rowCount}행 · 드래프트 ${b.rowCount}건`);
      return;
    }

    if (cmd === 'create') {
      if (!draftId || !instructor) die('사용: create <draft_id> <강사> [유형코드...]');
      if (draftId.trim() === '') die('draft_id 가 비었다');

      await c.query('begin');
      try {
        await c.query(
          `insert into rail_drafts (draft_id, title, base_instructor, note)
           values ($1, $2, $3, $4)
           on conflict (draft_id) do nothing`,
          [draftId, `${instructor} 레일 사본`, instructor, types.length ? types.join(',') : '전체']);

        // 정본의 **최신 버전**만 복사한다 (0020 과 같은 규칙)
        const { rowCount } = await c.query(`
          with latest as (
            select question_type_id, instructor_code, max(version) as version
              from type_rails where draft_id is null and instructor_code = $2
             group by 1, 2
          )
          insert into type_rails (
            question_type_id, instructor_code, version, step_order, variant_id,
            audio_mode, script_mode, student_prompt_override, tutor_directive_override,
            student_prompt_seed, tutor_directive_seed, source_lecture_code, note, step_label, draft_id)
          select tr.question_type_id, tr.instructor_code, tr.version, tr.step_order, tr.variant_id,
                 tr.audio_mode, tr.script_mode, tr.student_prompt_override, tr.tutor_directive_override,
                 tr.student_prompt_seed, tr.tutor_directive_seed, tr.source_lecture_code, tr.note,
                 tr.step_label, $1
            from type_rails tr
            join latest l using (question_type_id, instructor_code)
            join question_types qt on qt.id = tr.question_type_id
           where tr.draft_id is null
             and tr.version = l.version
             and ($3::text[] is null or qt.type_code = any($3::text[]))`,
          [draftId, instructor, types.length ? types : null]);

        await c.query('commit');
        console.log(`드래프트 ${draftId} 생성 — ${rowCount}단계 복사 (기준: ${instructor})`);
        console.log(`  확인: node scripts/rail-draft.js show ${draftId}`);
      } catch (e) {
        await c.query('rollback');
        throw e;
      }
      return;
    }

    die('사용: list | create <id> <강사> [유형...] | show <id> | drop <id>');
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
