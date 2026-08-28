/**
 * 적재된 실전 모의고사 회차를 **DB에서 되읽어** 검증한다.
 *
 * 왜 따로 두나
 *   load-mock-test.js 의 dry run 은 "넣으려던 것"을 본다. 이 스크립트는 "실제로 들어간 것"을 본다.
 *   둘은 다를 수 있다 — 트리거가 값을 바꾸거나, REST 적재가 중간에 끊기거나,
 *   크론이 같은 코드를 덮어쓸 수도 있다. 화면을 만들기 전에 DB 쪽 사실을 확인한다.
 *
 * 보는 것 (넣을 때와 같은 기준)
 *   문항 번호 1~100 / 101~200 이 다 있는가 · 보기 수 · 정답 정확히 1개
 *   LC 는 음원 경로가 있고 그 파일이 public/ 에 실제로 있는가
 *   Part 1 은 사진 파일이 실제로 있는가 · Part 3·4 는 지문(스크립트)이 붙었는가
 *
 * 사용
 *   node scripts/verify-mock-test.js               # 적재된 회차 전부
 *   node scripts/verify-mock-test.js --code YBM-LC1-T01
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

const only = (() => {
  const i = process.argv.indexOf('--code');
  return i > 0 ? process.argv[i + 1] : null;
})();

async function get(q) {
  const res = await fetch(`${base}/rest/v1/${q}`, { headers: H });
  const text = await res.text();
  if (!res.ok) throw new Error(`${q} → ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

/** public/ 아래 실제 파일이 있는지. 웹 경로('/mock/..')를 파일 경로로 되돌려 본다. */
const fileExists = (webPath) =>
  !!webPath && fs.existsSync(path.join(PUBLIC, webPath.replace(/^\//, '')));

async function verify(mt) {
  const rows = await get(
    `questions?mock_test_id=eq.${mt.id}&select=question_code,part,question_no,content,`
    + `passage_id,question_options(option_label,is_correct),`
    + `passages(passage_code,kind,audio_url,passage_sentences(seq))`
    + `&order=question_no`);

  const problems = [];
  const nos = rows.map((r) => r.question_no);
  const seen = new Set(nos);
  for (let n = mt.no_from; n <= mt.no_to; n++) if (!seen.has(n)) problems.push(`결손 ${n}번`);
  if (seen.size !== nos.length) problems.push('문항 번호 중복');

  let missingAudio = 0, missingPhoto = 0, missingScript = 0;
  for (const r of rows) {
    const want = r.part === 2 ? 3 : 4;
    if (r.question_options.length !== want)
      problems.push(`${r.question_code}: 보기 ${r.question_options.length}개 (${want} 기대)`);
    const nCorrect = r.question_options.filter((o) => o.is_correct).length;
    if (nCorrect !== 1) problems.push(`${r.question_code}: 정답 ${nCorrect}개`);

    if (mt.area === 'LC') {
      const audio = r.content?.audio_url || r.passages?.audio_url;
      if (!fileExists(audio)) { missingAudio++; problems.push(`${r.question_code}: 음원 파일 없음 (${audio || 'null'})`); }
    }
    if (r.part === 1 && !fileExists(r.content?.image_url)) {
      missingPhoto++; problems.push(`${r.question_code}: 사진 파일 없음 (${r.content?.image_url || 'null'})`);
    }
    if ([3, 4].includes(r.part) && !(r.passages?.passage_sentences || []).length) {
      missingScript++; problems.push(`${r.question_code}: 스크립트 없음`);
    }
    if ([6, 7].includes(r.part) && !r.passage_id) problems.push(`${r.question_code}: 지문 연결 없음`);
  }

  const byPart = {};
  for (const r of rows) byPart[r.part] = (byPart[r.part] || 0) + 1;
  const opts = rows.reduce((n, r) => n + r.question_options.length, 0);

  console.log(`[${mt.test_code}] ${mt.title} — 문항 ${rows.length}/${mt.no_to - mt.no_from + 1} · 보기 ${opts}`);
  console.log('  파트별: ' + Object.entries(byPart).map(([p, n]) => `P${p} ${n}`).join(' · '));
  if (problems.length) {
    problems.slice(0, 15).forEach((p) => console.log('  !! ' + p));
    if (problems.length > 15) console.log(`  !! …외 ${problems.length - 15}건`);
  } else {
    console.log('  OK 결손·중복·보기수·정답·음원파일·사진·스크립트 이상 없음');
  }
  return problems.length;
}

(async () => {
  const tests = await get(`mock_tests?select=*${only ? `&test_code=eq.${only}` : ''}&order=id`);
  if (!tests.length) { console.log('적재된 회차가 없다.'); return; }
  let bad = 0;
  for (const mt of tests) bad += await verify(mt);
  console.log(`\n문제 합계: ${bad}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
