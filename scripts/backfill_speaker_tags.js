/**
 * passage_sentences.speaker 를 'W'/'M' → 교재 원본 태그('W-Am','M-Cn'…)로 되살린다.
 *
 * 왜:
 *   교재는 화자를 성별+억양으로 적는다(W-Am, W-Br, M-Au, M-Cn = 실제 토익의 네 억양).
 *   파서가 앞 글자만 남기고 억양을 버려서, **3인 대화의 남자 둘이 같은 목소리**로 합성됐다.
 *   태그가 있으면 두 남자가 갈리고, 억양 배정도 해시가 아니라 **교재 그대로**가 된다.
 *
 * 왜 재적재가 아니라 in-place 인가:
 *   load-lc-questions 로 다시 넣으면 지문·문항 id 가 새로 생겨 음원 링크가 통째로 끊긴다.
 *   여기서는 문장 텍스트로 짝지어 speaker 열만 고친다 — 지문·문항·음원은 그대로 둔다.
 *
 * 사용:
 *   node scripts/backfill_speaker_tags.js          # dry run
 *   node scripts/backfill_speaker_tags.js --go
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const GO = process.argv.includes('--go');
const TESTS = [1, 2, 3, 5, 6];

/** 문장 텍스트 → 비교용 키 (조판·따옴표 차이를 지운다) */
const key = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function extractedTags() {
  const byText = new Map();     // 문장키 → 태그 (여러 곳에 같은 문장이 있으면 첫 것)
  for (const t of TESTS) {
    const f = path.join(__dirname, `_lc_test${t}.json`);
    if (!fs.existsSync(f)) { console.error(`${f} 없음 — extract_lc_pdf.py 를 먼저 돌려라`); process.exit(1); }
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const part of [3, 4]) {
      for (const set of j[`part${part}`] ?? []) {
        for (const line of set.script ?? []) {
          if (!line.speaker || !/^[WM]-/.test(line.speaker)) continue;
          const k = key(line.en);
          if (k && !byText.has(k)) byText.set(k, line.speaker);
        }
      }
    }
  }
  return byText;
}

async function main() {
  const tags = extractedTags();
  console.log(`교재에서 뽑은 화자 문장 ${tags.size}개`);

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows } = await c.query(`
      select s.id, s.en, s.speaker, p.passage_code
        from passage_sentences s join passages p on p.id = s.passage_id
       where p.kind in ('dialogue','talk') and s.speaker is not null
       order by p.passage_code, s.seq`);

    const plan = [];
    let already = 0, nomatch = 0;
    for (const r of rows) {
      if (/^[WM]-/.test(r.speaker)) { already += 1; continue; }
      const tag = tags.get(key(r.en));
      if (!tag) { nomatch += 1; continue; }
      if (tag[0] !== r.speaker) {          // 성별이 어긋나면 짝을 잘못 지은 것 — 건드리지 않는다
        console.warn(`  ⚠ ${r.passage_code}: DB '${r.speaker}' vs 교재 '${tag}' — 성별 불일치, 건너뜀`);
        nomatch += 1;
        continue;
      }
      plan.push({ id: r.id, tag, code: r.passage_code });
    }

    console.log(`대상 ${rows.length}문장 · 이미 태그 있음 ${already} · 바꿀 것 ${plan.length} · 못 찾음 ${nomatch}`);
    const byTag = new Map();
    for (const p of plan) byTag.set(p.tag, (byTag.get(p.tag) ?? 0) + 1);
    for (const [t, n] of [...byTag].sort()) console.log(`   ${t}: ${n}문장`);

    if (!plan.length) { console.log('\n바꿀 것 없음'); return; }
    if (!GO) { console.log('\n(dry run) 반영하려면 --go'); return; }

    for (const p of plan) await c.query('update passage_sentences set speaker = $2 where id = $1', [p.id, p.tag]);
    console.log(`\n${plan.length}문장 반영 완료`);
    console.log('다음: node scripts/gen_lc_audio.js --redo --go  (바뀐 화자에 맞춰 다시 합성)');
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
