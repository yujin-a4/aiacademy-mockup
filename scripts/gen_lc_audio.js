/**
 * LC 듣기 지문 음원 생성기 (Part 2·3·4).
 *
 * 왜 필요한가:
 *   FGI 에서 LC 도 시연하기로 했는데(D7) `passage_sentences.audio_url` 이 전부 비어 있어
 *   듣기 수업인데 브라우저 TTS 가 영어를 읽고 있었다. 토익 듣기 시연으로 쓸 품질이 아니다.
 *
 * 화자별 보이스:
 *   대화(P3)는 화자가 둘이라 보이스도 둘이어야 한다. speaker 열(W/M)을 보고 고른다.
 *     M · 화자 없음(P2 질문 발화, P4 담화) → ELEVENLABS_VOICE_M
 *     W                                   → ELEVENLABS_VOICE_W
 *   보이스가 설정 안 된 화자는 **건너뛰고 리포트한다.** 아무 목소리나 쓰지 않는다.
 *
 * - audio_url 이 비어 있는 문장만 합성 (멱등). 다시 만들려면 그 값을 null 로 지우고 실행
 * - 저장 경로: public/lc/<passage_code>_<seq>.mp3
 * - 설정은 gen_option_audio.js 와 동일 (같은 톤으로 들려야 한다)
 *
 * 사용:
 *   node scripts/gen_lc_audio.js          # dry run — 대상만 출력
 *   node scripts/gen_lc_audio.js --go     # 합성 + DB 링크
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const API = 'https://api.elevenlabs.io/v1/text-to-speech';
const KEY = process.env.ELEVENLABS_API_KEY;
const PUBLIC = path.join(__dirname, '..', 'public');
const OUT_DIR = path.join(PUBLIC, 'lc');

const GO = process.argv.includes('--go');

/** 화자 → 보이스. 없으면 null 이고, 그 문장은 건너뛴다 */
const VOICE_OF = {
  M: process.env.ELEVENLABS_VOICE_M || null,
  // 여성은 원래 쓰던 보이스(통합 음원·P1 보기와 같은 화자) — 따로 지정하면 그게 우선한다
  W: process.env.ELEVENLABS_VOICE_W || process.env.ELEVENLABS_AUDIO_VOICE_ID || null,
};
/** 화자 표기가 없는 지문(P2 질문 발화 · P4 담화) — 한 사람이 말한다 */
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_M || null;

async function tts(text, voice) {
  const res = await fetch(`${API}/${voice}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      // gen_option_audio.js 와 동일 — 보기 음원과 톤이 어긋나면 안 된다
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  if (!KEY) { console.error('ELEVENLABS_API_KEY 가 없습니다'); process.exit(1); }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows } = await c.query(`
      select s.id, s.seq, s.en, s.speaker, s.audio_url, p.passage_code, p.kind
        from passage_sentences s join passages p on p.id = s.passage_id
       where p.kind in ('utterance','dialogue','talk')
       order by p.passage_code, s.seq`);

    const todo = [];
    const skipped = new Map();      // 화자 → 개수 (보이스 미설정)
    let already = 0;

    for (const r of rows) {
      if (r.audio_url) { already += 1; continue; }
      const voice = r.speaker ? VOICE_OF[r.speaker] : DEFAULT_VOICE;
      if (!voice) {
        const k = r.speaker ?? '(화자 없음)';
        skipped.set(k, (skipped.get(k) ?? 0) + 1);
        continue;
      }
      todo.push({ ...r, voice });
    }

    console.log(`LC 문장 ${rows.length}개 · 이미 있음 ${already} · 생성 대상 ${todo.length}`);
    const byVoice = new Map();
    for (const t of todo) byVoice.set(t.speaker ?? '(화자 없음)', (byVoice.get(t.speaker ?? '(화자 없음)') ?? 0) + 1);
    for (const [k, n] of byVoice) console.log(`   ${k}: ${n}문장`);
    for (const [k, n] of skipped) {
      console.log(`   ⚠ ${k}: ${n}문장 — 보이스 미설정(ELEVENLABS_VOICE_${k})이라 건너뜀`);
    }

    if (!todo.length) { console.log('\n생성할 것 없음'); return; }
    if (!GO) {
      console.log('\n예시:');
      for (const t of todo.slice(0, 3)) console.log(`  ${t.passage_code}_${t.seq} [${t.speaker ?? '-'}] ${t.en.slice(0, 55)}`);
      console.log('\n(dry run) 합성하려면 --go');
      return;
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    let n = 0;
    for (const t of todo) {
      const rel = `/lc/${t.passage_code}_${t.seq}.mp3`;
      try {
        const buf = await tts(t.en, t.voice);
        fs.writeFileSync(path.join(PUBLIC, rel.replace(/^\//, '')), buf);
        await c.query('update passage_sentences set audio_url = $2 where id = $1', [t.id, rel]);
        n += 1;
        console.log(`  ✓ ${rel}`);
      } catch (e) {
        console.error(`  ✗ ${t.passage_code}_${t.seq}: ${e.message}`);
      }
    }
    console.log(`\n${n}개 생성·링크 완료`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
