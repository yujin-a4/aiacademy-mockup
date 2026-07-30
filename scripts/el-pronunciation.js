/**
 * 일레븐랩스 발음 사전 — 한국어 연음이 깨지는 낱말 교정.
 *
 * ── 왜 ──────────────────────────────────────────────────────────
 * TTS 가 "맞아"를 [마야]로 읽는다(실측). 받침이 뒤 모음으로 넘어가는 연음을 놓치는 것이라,
 * 발음 나는 대로 적은 별칭(alias)을 사전에 넣어 교정한다. 문장을 바꾸는 게 아니라
 * **읽는 방법만** 바꾸므로 화면 자막·로그에는 영향이 없다.
 *
 *   node scripts/el-pronunciation.js            # .pls 파일만 생성 (대시보드 업로드용)
 *   node scripts/el-pronunciation.js --upload   # API 로 등록 (키에 pronunciation_dictionaries_write 필요)
 *
 * ⚠️ 등록 후 **에이전트에 붙이는 것은 대시보드에서** 해야 한다
 *    (Agent → Voice → Pronunciation dictionaries). 지금 키에는 convai_write 권한이 없다.
 */
const fs = require('fs');
const path = require('path');

/** 규칙: 적힌 대로가 아니라 **소리 나는 대로** 별칭을 준다 */
const RULES = [
  ['맞아', '마자'],
  ['맞아요', '마자요'],
  ['맞았어', '마자써'],
  ['맞지', '맏찌'],
  ['맞혔어', '마쳐써'],
  ['같아', '가타'],
  ['같아요', '가타요'],
  ['찾아', '차자'],
  ['찾아봐', '차자봐'],
  ['짚어', '지퍼'],
  ['짚어봐', '지퍼봐'],
  ['읽어', '일거'],
  ['읽어봐', '일거봐'],
  ['앉아', '안자'],
  ['앉아서', '안자서'],
];

const NAME = 'ybm-ko-tutor';
const OUT = path.join('scripts', 'ybm-ko-tutor.pls');

function pls() {
  const lexemes = RULES.map(([g, a]) =>
    `  <lexeme>\n    <grapheme>${g}</grapheme>\n    <alias>${a}</alias>\n  </lexeme>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<lexicon version="1.0"\n`
    + `      xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"\n`
    + `      alphabet="ipa" xml:lang="ko-KR">\n${lexemes}\n</lexicon>\n`;
}

async function upload() {
  const key = (fs.readFileSync('.env.local', 'utf8').match(/^ELEVENLABS_API_KEY=(.*)$/m) || [])[1]?.trim();
  if (!key) throw new Error('ELEVENLABS_API_KEY 없음 (.env.local)');
  const res = await fetch('https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-rules', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: NAME,
      rules: RULES.map(([g, a]) => ({ type: 'alias', string_to_replace: g, alias: a })),
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`등록 실패 ${res.status}: ${text.slice(0, 300)}`);
    if (res.status === 401) {
      console.error('→ API 키에 pronunciation_dictionaries_write 권한을 켜거나, 아래 .pls 파일을 대시보드에 올려라.');
    }
    process.exit(1);
  }
  console.log('등록 완료:', text.slice(0, 200));
  console.log('→ 대시보드에서 에이전트에 붙여야 적용된다 (Agent → Voice → Pronunciation dictionaries)');
}

fs.writeFileSync(OUT, pls(), 'utf8');
console.log(`${OUT} 생성 — 규칙 ${RULES.length}개 (대시보드에 업로드 가능)`);
if (process.argv.includes('--upload')) upload().catch((e) => { console.error(e.message); process.exit(1); });
