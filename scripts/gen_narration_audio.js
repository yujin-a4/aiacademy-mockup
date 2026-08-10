/**
 * 내레이터 음원 생성기 (LC Part 3·4 실전).
 *
 * 실제 토익 듣기의 한 세트는 이렇게 나간다:
 *
 *   "Questions 32 through 34 refer to the following conversation."   ← 지문 **전** 안내
 *      (대화·담화)
 *   "Number 32.  Why is the man calling?"                            → 8초
 *   "Number 33.  …"                                                  → 8초
 *   "Number 34.  …"                                                  → 8초
 *
 * 지금까지는 이 두 가지가 통째로 없었다. 담화가 끝나면 곧장 문항 텍스트를 브라우저 TTS 가 읽었다.
 * 실제 시험은 (1) 지문 앞 안내가 반드시 있고 (2) 문항마다 "Number NN." 이 붙는다.
 *
 * 목소리: **내레이터는 시험 내내 한 사람**이다(미국 남성). 지문 화자 6명과 섞지 않는다 —
 *   섞으면 "지금 말하는 게 등장인물인가 진행자인가" 가 흐려진다.
 *
 * 어디에 저장하나 (마이그레이션 없이):
 *   문항 낭독 → questions.content.qread_url
 *   세트 안내 → **그 세트 첫 문항**의 content.set_intro_url / set_intro_text
 *               (화면도 지문으로 세트를 묶고 첫 문항을 대표로 쓴다 — fromDb.buildPractice 와 같은 규칙)
 *
 * 범위: **실전(stage=practice)만.** 수업은 강사가 이끄는 단계라 시험 내레이터가 끼면 안 된다.
 *
 * 사용:
 *   node scripts/gen_narration_audio.js          # dry run — 문구와 대상만 출력
 *   node scripts/gen_narration_audio.js --go
 *   그 뒤 node scripts/normalize_audio.js --go   (음량을 지문과 맞춘다)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const API = 'https://api.elevenlabs.io/v1/text-to-speech';
const KEY = process.env.ELEVENLABS_API_KEY;
const NARRATOR = process.env.ELEVENLABS_VOICE_M;      // 미국 남성 — 시험 내내 고정
const PUBLIC = path.join(__dirname, '..', 'public');
const OUT_DIR = path.join(PUBLIC, 'lc', 'narration');
const GO = process.argv.includes('--go');

/* 지문 종류(교재 라벨) → 실제 토익 안내 문구에 쓰는 영어.
   실제 시험은 "refer to the following ___" 뒤에 담화 종류를 그대로 부른다. */
const KIND_EN = {
  '대화': 'conversation',
  '3인 대화': 'conversation with three speakers',
  '전화 메시지': 'telephone message',
  '자동 응답 메시지': 'recorded message',
  '공지': 'announcement',
  '안내': 'talk',
  '방송': 'broadcast',
  '광고': 'advertisement',
  '연설': 'speech',
  '팟캐스트': 'broadcast',
  '관광 정보': 'talk',
  '여행 정보': 'talk',
  '회의 발췌': 'excerpt from a meeting',
  '담화': 'talk',
};
/* '대화+송장' 처럼 시각자료가 붙은 세트 — 실제 시험은 "and a/an ___" 로 자료를 같이 부른다 */
const VISUAL_EN = { '송장': 'invoice', '일정표': 'schedule', '가격표': 'price list', '지도': 'map',
  '평면도': 'floor plan', '목차': 'table of contents', '안내판': 'sign', '상자': 'list', '이메일 수신함': 'e-mail inbox' };

function introText(title, from, to) {
  const [kindKo, visualKo] = String(title ?? '담화').split('+');
  const kind = KIND_EN[kindKo.trim()] ?? 'talk';
  const visual = visualKo ? VISUAL_EN[visualKo.trim()] : null;
  const what = visual ? `${kind} and ${/^[aeiou]/i.test(visual) ? 'an' : 'a'} ${visual}` : kind;
  return from === to
    ? `Question ${from} refers to the following ${what}.`
    : `Questions ${from} through ${to} refer to the following ${what}.`;
}

async function tts(text) {
  const res = await fetch(`${API}/${NARRATOR}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  if (!KEY) { console.error('ELEVENLABS_API_KEY 가 없습니다'); process.exit(1); }
  if (!NARRATOR) { console.error('ELEVENLABS_VOICE_M (내레이터) 가 없습니다'); process.exit(1); }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const { rows } = await c.query(`
      select q.id, q.question_code, q.content, q.display_order,
             l.lecture_code, p.id as passage_id, p.passage_code, p.title
        from questions q
        join lectures l on l.id = q.lecture_id
        left join passages p on p.id = q.passage_id
       where l.part in (3,4) and q.content->>'stage' = 'practice'
       order by l.lecture_code, q.question_code`);

    /* 강의 안에서 문항 번호를 1..N 으로 매긴다 — 화면의 'Questions 1–3' 과 같은 번호여야
       "Number 4" 를 듣고 4번 칸을 찾을 수 있다. */
    const byLecture = new Map();
    for (const r of rows) {
      if (!byLecture.has(r.lecture_code)) byLecture.set(r.lecture_code, []);
      byLecture.get(r.lecture_code).push(r);
    }

    const jobs = [];   // { kind:'q'|'intro', row, text, rel }
    for (const [, list] of byLecture) {
      list.forEach((r, i) => { r.no = i + 1; });
      // 세트 = 지문 하나
      const sets = new Map();
      for (const r of list) {
        const k = r.passage_code ?? r.question_code;
        if (!sets.has(k)) sets.set(k, []);
        sets.get(k).push(r);
      }
      for (const g of sets.values()) {
        const head = g[0];
        const text = introText(head.title, g[0].no, g[g.length - 1].no);
        jobs.push({ kind: 'intro', row: head, text, rel: `/lc/narration/${head.passage_code}_intro.mp3` });
        for (const r of g) {
          const q = (r.content?.question_text ?? '').trim();
          if (!q) continue;
          jobs.push({ kind: 'q', row: r, text: `Number ${r.no}. ${q}`, rel: `/lc/narration/${r.question_code}.mp3` });
        }
      }
    }

    const intros = jobs.filter((j) => j.kind === 'intro').length;
    console.log(`세트 안내 ${intros}개 · 문항 낭독 ${jobs.length - intros}개 (내레이터 1명)\n`);
    if (!GO) {
      for (const j of jobs.slice(0, 8)) console.log(`  [${j.kind === 'intro' ? '안내' : '문항'}] ${j.text.slice(0, 88)}`);
      console.log('\n(dry run) 합성하려면 --go');
      return;
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    let n = 0;
    for (const j of jobs) {
      const abs = path.join(PUBLIC, j.rel.replace(/^\//, ''));
      try {
        // 파일이 있으면 다시 사지 않는다 (gen_lc_audio 와 같은 규칙)
        if (!fs.existsSync(abs)) fs.writeFileSync(abs, await tts(j.text));
        const patch = j.kind === 'intro'
          ? { set_intro_url: j.rel, set_intro_text: j.text }
          : { qread_url: j.rel };
        await c.query(
          `update questions set content = content || $2::jsonb where id = $1`,
          [j.row.id, JSON.stringify(patch)]);
        n += 1;
      } catch (e) {
        console.error(`  ✗ ${j.rel}: ${e.message}`);
      }
    }
    console.log(`${n}개 생성·링크 완료`);
    console.log('다음: node scripts/normalize_audio.js --go   (지문과 음량을 맞춘다)');
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
