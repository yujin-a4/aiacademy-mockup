/**
 * Part 1 듣기 음원 생성기 (유형학습 + 실전 공용).
 * - DB의 Part 1 문항 중 아직 audio_url이 없는 것의 선택지(A~D)를 읽어 ElevenLabs '듣기 전용' 보이스로 합성.
 * - public/part1/<image_url의 .jpg→.mp3> 로 저장하고, content.audio_url 에 경로를 upsert.
 * - 이미 audio_url이 있으면 건너뛴다(멱등). 다시 만들려면 해당 content.audio_url을 지우고 실행.
 * 사용: node scripts/gen_part1_practice_audio.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const API = 'https://api.elevenlabs.io/v1/text-to-speech';
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_AUDIO_VOICE_ID || process.env.ELEVENLABS_VOICE_ID;
const PUBLIC = path.join(__dirname, '..', 'public');

async function tts(text) {
  const res = await fetch(`${API}/${VOICE}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status} ${await res.text().catch(() => '')}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  if (!KEY || !VOICE) throw new Error('ELEVENLABS_API_KEY / ELEVENLABS_AUDIO_VOICE_ID 가 .env.local 에 필요합니다');
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query(`
      select q.question_code,
             q.content->>'image_url' as image_url,
             json_agg(json_build_object('label', o.option_label, 'text', o.option_text) order by o.option_label) as opts
      from questions q
      join question_options o on o.question_id = q.id
      where q.part = 1
        and q.content->>'image_url' is not null
        and (q.content->>'audio_url') is null
      group by q.question_code, q.content
      order by q.question_code`);

    for (const r of rows) {
      // TOEIC Part 1 스타일: (A) 문장  (B) 문장  (C) 문장  (D) 문장
      const narration = r.opts.map((o) => `(${o.label}) ${o.text}`).join('  ');
      const audioRel = r.image_url.replace(/\.jpg$/i, '.mp3'); // /part1/part1_1_p1.mp3
      const outPath = path.join(PUBLIC, audioRel.replace(/^\//, ''));
      const buf = await tts(narration);
      fs.writeFileSync(outPath, buf);
      await client.query(
        `update questions set content = content || jsonb_build_object('audio_url', $2::text) where question_code = $1`,
        [r.question_code, audioRel]
      );
      console.log(`ok ${r.question_code} -> ${audioRel} (${buf.length} bytes)`);
    }
    console.log('done.');
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
