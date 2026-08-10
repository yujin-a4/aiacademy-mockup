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
const REDO = process.argv.includes('--redo');   // 보이스 배분을 바꿨을 때만 — 기존 음원을 버리고 다시 만든다

/* ── 억양 6종 ──
   실제 토익은 미국·영국·호주(·캐나다) 발음을 섞어 낸다. 한 목소리로만 뽑으면 듣기 시연이
   "성우 한 명이 다 읽는 교재 CD" 가 되어 실전 감각이 안 잡힌다. */
const VOICES = {
  US: { W: process.env.ELEVENLABS_VOICE_W || process.env.ELEVENLABS_AUDIO_VOICE_ID || null,
        M: process.env.ELEVENLABS_VOICE_M || null },
  UK: { W: process.env.ELEVENLABS_VOICE_UK_W || null, M: process.env.ELEVENLABS_VOICE_UK_M || null },
  AU: { W: process.env.ELEVENLABS_VOICE_AU_W || null, M: process.env.ELEVENLABS_VOICE_AU_M || null },
  /* 캐나다는 **남성만** 있다 — 교재가 캐나다 여성을 한 번도 안 쓴다(W-Cn 0문장).
     그래서 화자 태그가 없는 지문을 뽑을 때 도는 후보(ACCENTS)에는 넣지 않는다. 넣으면 여성 차례에 빈다. */
  CA: { W: null, M: process.env.ELEVENLABS_VOICE_CA_M || null },
};
const ACCENTS = ['US', 'UK', 'AU'];

/** 문항을 읽어주는 내레이터 — 시험 내내 **한 사람**이다(미국 남성). 지문 화자와 섞지 않는다 */
const NARRATOR = process.env.ELEVENLABS_VOICE_M || null;

/* 지문 코드 → 안정적인 번호. 같은 지문은 언제 다시 돌려도 같은 목소리가 나온다
   (지문 코드가 재적재해도 그대로라, 순번이 아니라 코드에서 뽑아야 안 흔들린다). */
function seedOf(code) {
  let h = 0;
  for (const ch of String(code)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/* 교재 화자 태그 → 보이스 억양. 교재가 쓰는 네 억양을 그대로 받는다(미국·영국·호주·캐나다). */
const TAG_ACCENT = { Am: 'US', Br: 'UK', Au: 'AU', Cn: 'CA' };

/** 이 문장의 보이스.
 *  화자 태그(W-Am·M-Cn…)가 있으면 **교재를 그대로 따른다** — 3인 대화의 남자 둘도 여기서 갈린다.
 *  태그가 없는 지문(P2 질문 발화·P4 담화)만 지문 코드로 6명 중 하나를 고른다. */
function voiceFor(passageCode, speaker) {
  const seed = seedOf(passageCode);
  const m = /^([WM])-([A-Za-z]{2})$/.exec(String(speaker ?? ''));
  if (m) {
    const g = m[1];
    const acc = TAG_ACCENT[m[2]] ?? 'US';
    return { id: VOICES[acc][g], label: `${acc}-${g}` };
  }
  if (speaker === 'W' || speaker === 'M') {
    // 태그를 못 살린 옛 데이터 — 두 화자가 다른 억양이 되도록 한 칸 어긋나게 고른다
    const acc = speaker === 'W' ? ACCENTS[seed % 3] : ACCENTS[(seed + 1) % 3];
    return { id: VOICES[acc][speaker], label: `${acc}-${speaker}` };
  }
  /* 화자 표기가 없는 지문(P2 질문 발화 · P4 담화) — 한 사람이 말한다.
     DB 에 성별이 없으므로 지문 코드로 6명 중 하나를 고른다. 담화 30개에 고르게 퍼진다. */
  const acc = ACCENTS[seed % 3];
  const g = (seed >> 2) % 2 === 0 ? 'W' : 'M';
  return { id: VOICES[acc][g], label: `${acc}-${g}` };
}

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

    /* --redo : 이미 만든 것을 **버리고 다시** 만든다. 보이스 배분을 바꿨을 때만 쓴다.
       (평소에는 파일이 있으면 재사용해서 같은 소리에 두 번 돈을 내지 않는다) */
    if (REDO) {
      const ids = rows.filter((r) => r.audio_url).map((r) => r.id);
      console.log(`--redo : 기존 음원 ${ids.length}개를 지우고 다시 만든다`);
      if (GO && ids.length) {
        for (const r of rows) {
          if (!r.audio_url) continue;
          const f = path.join(PUBLIC, r.audio_url.replace(/^\//, ''));
          if (fs.existsSync(f)) fs.unlinkSync(f);
          r.audio_url = null;
        }
        await c.query('update passage_sentences set audio_url = null where id = any($1)', [ids]);
      } else if (!GO) {
        for (const r of rows) r.audio_url = null;
      }
    }

    const todo = [];
    const skipped = new Map();      // 화자 → 개수 (보이스 미설정)
    let already = 0;

    for (const r of rows) {
      if (r.audio_url) { already += 1; continue; }
      const v = voiceFor(r.passage_code, r.speaker);
      if (!v.id) {
        skipped.set(v.label, (skipped.get(v.label) ?? 0) + 1);
        continue;
      }
      todo.push({ ...r, voice: v.id, voiceLabel: v.label });
    }

    console.log(`LC 문장 ${rows.length}개 · 이미 있음 ${already} · 생성 대상 ${todo.length}`);
    const byVoice = new Map();
    for (const t of todo) byVoice.set(t.voiceLabel, (byVoice.get(t.voiceLabel) ?? 0) + 1);
    for (const [k, n] of [...byVoice].sort()) console.log(`   ${k}: ${n}문장`);
    for (const [k, n] of skipped) {
      console.log(`   ⚠ ${k}: ${n}문장 — 보이스 ID 미설정이라 건너뜀`);
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
      /* 파일이 이미 있으면 **다시 합성하지 않는다** — 링크만 잇는다.
         지문 코드는 재적재해도 그대로라(LC-P3-01-PSG1) 문항을 다시 넣으면 링크만 끊긴다.
         그때 여기서 또 합성하면 같은 소리에 돈을 두 번 낸다(실측으로 겪은 그 사고). */
      if (fs.existsSync(path.join(PUBLIC, rel.replace(/^\//, '')))) {
        await c.query('update passage_sentences set audio_url = $2 where id = $1', [t.id, rel]);
        console.log(`  = ${rel} (파일 재사용)`);
        n += 1;
        continue;
      }
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
