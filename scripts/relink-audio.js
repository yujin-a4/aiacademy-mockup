/**
 * 음원 링크 복구 — public/ 에 있는 mp3 를 DB 에 다시 이어준다.
 *
 * 왜 필요했나 (실측 2026-07-28):
 *   `question_options.audio_url` 이 **371개 중 0개**였는데 mp3 파일은 public/part1/options/ 에
 *   48개가 멀쩡히 있었다. 매일 03:00 시트 동기화가 question_options 를 delete+insert 하면서
 *   audio_url 을 안 실어오기 때문이다. 그래서 Part1 수업이 "선택지 A 청취" 단계에서
 *   성우 음원 대신 브라우저 TTS 로 읽고 있었다.
 *   (`gen_option_audio.js` 는 audio_url 이 null 인 것만 만들므로, 그대로 두면 매일 밤
 *    링크가 날아가고 다음날 전부 다시 합성하게 된다 — 돈과 시간을 매일 태운다)
 *
 * 파일명 규칙은 gen_option_audio.js 가 만든 그대로다:
 *   public/part<N>/options/<question_code>_<label>.mp3  →  audio_url = /part<N>/options/...
 *
 * 사용
 *   node scripts/relink-audio.js         # dry run
 *   node scripts/relink-audio.js --go    # 반영
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const GO = process.argv.includes('--go');
const PUBLIC = path.join(__dirname, '..', 'public');

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows } = await c.query(`
      select o.id, o.option_label, o.audio_url, q.question_code, q.part
        from question_options o join questions q on q.id = o.question_id
       order by q.question_code, o.display_order`);

    const found = [];
    const missing = new Map();     // part → 없는 개수
    for (const r of rows) {
      const rel = `/part${r.part}/options/${r.question_code}_${r.option_label}.mp3`;
      if (fs.existsSync(path.join(PUBLIC, rel.replace(/^\//, '')))) {
        if (r.audio_url !== rel) found.push({ id: r.id, rel, code: r.question_code, label: r.option_label });
      } else if ([1, 2].includes(r.part)) {
        missing.set(r.part, (missing.get(r.part) ?? 0) + 1);
      }
    }

    const linked = rows.filter((r) => r.audio_url).length;
    console.log(`보기 ${rows.length}개 · 현재 링크됨 ${linked}개`);
    console.log(`  파일이 있는데 링크가 끊긴 것: ${found.length}개  → 복구 대상`);
    for (const [part, n] of missing) {
      console.log(`  P${part}: 파일 자체가 없는 보기 ${n}개  → gen_option_audio.js 로 새로 합성해야 함`);
    }

    if (!found.length) { console.log('\n복구할 것 없음'); return; }
    if (!GO) {
      console.log('\n예시:');
      for (const f of found.slice(0, 4)) console.log(`  ${f.code}_${f.label} → ${f.rel}`);
      console.log('\n(dry run) 반영하려면 --go');
      return;
    }

    for (const f of found) {
      await c.query('update question_options set audio_url = $2 where id = $1', [f.id, f.rel]);
    }
    console.log(`\n${found.length}개 링크 복구 완료`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
