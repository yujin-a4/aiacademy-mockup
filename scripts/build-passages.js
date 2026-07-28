/**
 * 지문 이관 — docs/db-restructure-plan.md §7 STEP 3
 *
 * questions.content 안에 문자열로 들어 있는 지문을 passages / passage_sentences 로 뽑아낸다.
 *   Part6 → content.passage_context   Part7 → content.passage_text
 * 같은 지문이 문항 수만큼 중복 저장돼 있어서(실측 17행 → 실제 6개) 먼저 접는다.
 *
 * ⚠️ content 는 매일 03:00 KST 크론이 시트에서 덮는다. 그래서 이 스크립트는
 *    **content 를 고치지 않는다.** 읽어서 passages 를 만들고 questions.passage_id 로 잇기만 한다.
 *    시트에 문항이 추가되면 새 문항의 passage_id 가 null 이므로 이 스크립트를 다시 돌리면 된다
 *    (idempotent — 같은 지문이면 같은 passage_code 에 다시 붙는다).
 *
 * 문장 쪼개는 규칙은 src/data/typeLearning/fromDb.ts 의 것을 그대로 옮겼다.
 * 화면이 지금 보여주는 문장 분할과 한 글자도 달라지면 안 되기 때문이다(회귀 0).
 *
 * 사용
 *   node scripts/build-passages.js         # dry run — 아무것도 안 씀
 *   node scripts/build-passages.js --go    # passages/passage_sentences 갱신 + 링크
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { Client } = require('pg');

const GO = process.argv.includes('--go');

/* ── fromDb.ts 와 동일한 문장 분할 ── */

const ABBR = /\b(Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Co|Corp|Jr|Sr|St|Ave|Rd|No|vs|approx|a\.m|p\.m)\./g;
/* 약어의 마침표를 잠시 바꿔둘 자리표시자 — fromDb.ts 와 같은 제어문자(U+0001).
   본문에 절대 안 나오는 값이어야 한다. NUL(U+0000)을 쓰면 git 이 파일을 바이너리로 본다. */
const KEEP = '';
const numBlank = (n) => `___(${n})___`;

/** Part6 장문: `(1)_______` → `___(1)___` 로 정규화한 뒤 문장 단위로 */
function clozeSentences(passage) {
  const norm = passage
    .replace(/\((\d)\)\s*_{2,}/g, (_m, n) => numBlank(Number(n)))
    .replace(ABBR, (m) => m.replace('.', KEEP));
  return norm
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replaceAll(KEEP, '.'))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((en) => {
      const m = en.match(/___\((\d)\)___/);
      return { en, blank_no: m ? Number(m[1]) : null };
    });
}

/** Part7 지문: 줄 단위 (fromDb.ts buildPart7 과 동일) */
function lineSentences(text) {
  return text.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((en) => ({ en, blank_no: null }));
}

/* ── 지문 머리의 To/From/Subject 를 meta 로 ── */

const META_LINE = /^(To|From|Subject|Date|Re|Cc)\s*:\s*(.+)$/i;

function splitMeta(text) {
  const lines = text.split(/\n/);
  const meta = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(META_LINE);
    if (!m) break;
    meta.push({ k: m[1], v: m[2].trim() });
    i += 1;
  }
  if (meta.length === 0) return { meta: null, body: text };
  return { meta, body: lines.slice(i).join('\n').replace(/^\n+/, '') };
}

/* ── 지문 종류 판정: 별칭표 우선, 없으면 본문 모양 ── */

function kindOf(aliases, passageType, text) {
  const byAlias = passageType ? aliases.get(passageType.trim()) : null;
  if (byAlias) return byAlias;
  if (/^(Dear\b|To\s*:|From\s*:)/m.test(text)) return 'email';
  if (/^NOTICE|^ATTENTION|^ANNOUNCEMENT/im.test(text)) return 'notice';
  return 'article';
}

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const aliases = new Map(
      (await c.query('select raw, kind from passage_type_aliases')).rows.map((r) => [r.raw, r.kind]),
    );

    const { rows } = await c.query(`
      select q.id, q.question_code, q.part, q.passage_id, l.lecture_code,
             q.content->>'passage_text'    as p7,
             q.content->>'passage_context' as p6,
             q.content->>'passage_type'    as ptype,
             q.content->>'question_number' as qnum,
             q.content->>'stage'           as stage
        from questions q join lectures l on l.id = q.lecture_id
       order by l.lecture_code, q.question_code`);

    /* ── 묶기: 같은 강의 + 같은 지문 원문 = 지문 1개 ── */
    const groups = new Map();     // 'LC|본문' → { lecture_code, part, text, ptype, stage, questions[] }
    let noPassage = 0;

    for (const r of rows) {
      const text = r.p7 ?? r.p6;
      if (!text) { noPassage += 1; continue; }
      const key = `${r.lecture_code}${text}`;
      if (!groups.has(key)) {
        groups.set(key, {
          lecture_code: r.lecture_code, part: r.part, text,
          ptype: r.ptype, stage: r.stage, questions: [],
        });
      }
      groups.get(key).questions.push(r);
    }

    /* ── 지문 코드 부여: 강의별 등장 순서. 수업(Q)이 1번, 실전(P)이 뒤 ── */
    const byLecture = new Map();
    for (const g of groups.values()) {
      if (!byLecture.has(g.lecture_code)) byLecture.set(g.lecture_code, []);
      byLecture.get(g.lecture_code).push(g);
    }
    const planned = [];
    for (const [lectureCode, list] of byLecture) {
      list.sort((a, b) => {
        const sa = a.stage === 'practice' ? 1 : 0;
        const sb = b.stage === 'practice' ? 1 : 0;
        return sa - sb || a.questions[0].question_code.localeCompare(b.questions[0].question_code);
      });
      list.forEach((g, i) => {
        const { meta, body } = splitMeta(g.text);
        const sentences = g.part === 6 ? clozeSentences(body) : lineSentences(body);
        planned.push({
          passage_code: `${lectureCode}-PSG${i + 1}`,
          kind: kindOf(aliases, g.ptype, g.text),
          title: null,
          meta,
          sentences,
          questions: [...g.questions].sort(
            (a, b) => (Number(a.qnum) || 0) - (Number(b.qnum) || 0)
              || a.question_code.localeCompare(b.question_code),
          ),
        });
      });
    }

    /* ── 리포트 ── */
    console.log(`문항 ${rows.length}행 · 지문 없는 문항 ${noPassage}행 · 지문 ${planned.length}개`);
    console.log('');
    for (const p of planned) {
      const blanks = p.sentences.filter((s) => s.blank_no != null).length;
      console.log(
        `  ${p.passage_code.padEnd(18)} ${p.kind.padEnd(8)} 문장 ${String(p.sentences.length).padStart(2)}` +
        `${blanks ? ` · 빈칸 ${blanks}` : ''}${p.meta ? ` · meta ${p.meta.length}` : ''}` +
        ` · 문항 ${p.questions.map((q) => q.question_code.slice(-4)).join(',')}`,
      );
    }

    if (!GO) {
      console.log('\n(dry run) 쓰려면 --go');
      return;
    }

    /* ── 쓰기 ── */
    let sentCount = 0, linked = 0;
    for (const p of planned) {
      await c.query('begin');
      try {
        const pg = await c.query(
          `insert into passages (passage_code, kind, title, meta)
             values ($1,$2,$3,$4)
           on conflict (passage_code) do update
             set kind = excluded.kind, title = excluded.title, meta = excluded.meta
           returning id`,
          [p.passage_code, p.kind, p.title, p.meta ? JSON.stringify(p.meta) : null],
        );
        const passageId = pg.rows[0].id;

        // 재생성 시 붙어 있던 음원은 살린다 (seq 기준)
        const prev = new Map(
          (await c.query('select seq, audio_url, ko from passage_sentences where passage_id = $1', [passageId]))
            .rows.map((r) => [r.seq, r]),
        );
        await c.query('delete from passage_sentences where passage_id = $1', [passageId]);
        for (let i = 0; i < p.sentences.length; i += 1) {
          const s = p.sentences[i];
          const old = prev.get(i + 1);
          await c.query(
            `insert into passage_sentences (passage_id, seq, en, ko, speaker, blank_no, audio_url)
             values ($1,$2,$3,$4,null,$5,$6)`,
            [passageId, i + 1, s.en, old?.ko ?? null, s.blank_no, old?.audio_url ?? null],
          );
          sentCount += 1;
        }

        for (let i = 0; i < p.questions.length; i += 1) {
          await c.query('update questions set passage_id = $1, display_order = $2 where id = $3',
            [passageId, i + 1, p.questions[i].id]);
          linked += 1;
        }
        await c.query('commit');
      } catch (err) {
        await c.query('rollback');
        console.error(`FAIL ${p.passage_code}: ${err.message}`);
      }
    }

    // 지문이 없는 문항(P1 사진·P5 단문)도 문항 순서는 필요하다 — 강의 안 순서로 채운다
    await c.query(`
      update questions q set display_order = s.rn
        from (select id, row_number() over (
                       partition by lecture_id, coalesce(content->>'stage','lesson')
                       order by question_code) rn
                from questions where passage_id is null) s
       where s.id = q.id and q.display_order is distinct from s.rn`);

    console.log(`\n지문 ${planned.length}개 · 문장 ${sentCount}행 · 문항 링크 ${linked}건 반영`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
