/**
 * 보기별 듣기 음원 생성기.
 *
 * gen_part1_practice_audio.js가 A~D를 한 파일로 합성하는 것과 짝 —
 * 여기서는 보기 하나당 mp3 하나를 만든다. 에이전트가 "비 보기만 다시" 할 때 쓸 소스.
 *
 * - question_options.audio_url 이 비어 있는 보기만 합성 (멱등). 다시 만들려면 그 값을 null로 지우고 실행.
 * - 저장 경로: public/part1/options/<question_code>_<label>.mp3
 * - 보이스는 통합 음원과 동일(ELEVENLABS_AUDIO_VOICE_ID) — 같은 화자로 들려야 하므로.
 *
 * 사용:
 *   node scripts/gen_option_audio.js            # dry run — 대상만 출력 (기본: part 1)
 *   node scripts/gen_option_audio.js --part 2 --go
 *
 * ⚠️ `--go` 없이는 합성하지 않는다. 예전엔 그냥 실행하면 바로 API 를 태웠는데,
 *    링크가 끊긴 걸 모르고 돌려 **있는 음원을 다시 사는** 사고가 있었다(relink-audio.js 주석 참고).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const API = 'https://api.elevenlabs.io/v1/text-to-speech';
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_AUDIO_VOICE_ID || process.env.ELEVENLABS_VOICE_ID;
const PUBLIC = path.join(__dirname, '..', 'public');

const argv = process.argv.slice(2);
const DRY = !argv.includes('--go');   // 기본은 dry run — 돈이 나가는 스크립트다
const PART = Number(argv[argv.indexOf('--part') + 1]) || 1;

async function tts(text) {
  const res = await fetch(`${API}/${VOICE}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      // 통합 음원(gen_part1_practice_audio.js)과 동일 설정 — 같은 화자·같은 톤으로 들려야 한다
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status} ${await res.text().catch(() => '')}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  if (!DRY && (!KEY || !VOICE)) {
    throw new Error('ELEVENLABS_API_KEY / ELEVENLABS_AUDIO_VOICE_ID 가 .env.local 에 필요합니다');
  }
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select q.question_code, o.id as option_id, o.option_label, o.option_text
         from questions q
         join question_options o on o.question_id = q.id
        where q.part = $1
          and o.audio_url is null
          and o.option_text is not null
        order by q.question_code, o.option_label`,
      [PART]
    );

    if (!rows.length) {
      console.log(`part ${PART}: 생성할 보기 없음 (전부 audio_url 있음)`);
      return;
    }
    console.log(`part ${PART}: 보기 ${rows.length}개 생성 대상`);

    const outDir = path.join(PUBLIC, `part${PART}`, 'options');
    if (!DRY) fs.mkdirSync(outDir, { recursive: true });

    for (const r of rows) {
      const rel = `/part${PART}/options/${r.question_code}_${r.option_label}.mp3`;
      if (DRY) {
        console.log(`  [dry] ${rel}  ← "${r.option_text.slice(0, 50)}"`);
        continue;
      }
      // 라벨은 읽지 않는다 — 학생이 이미 어느 보기인지 아는 상태에서 문장만 다시 듣는 용도.
      const buf = await tts(r.option_text);
      fs.writeFileSync(path.join(PUBLIC, rel.replace(/^\//, '')), buf);
      await client.query('update question_options set audio_url = $2 where id = $1', [r.option_id, rel]);
      console.log(`  ok ${r.question_code} (${r.option_label}) -> ${rel} (${buf.length} bytes)`);
    }
    console.log('done.');
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
