/**
 * 음원 음량 정규화 (LC 듣기 전체).
 *
 * 왜 필요한가 (실측):
 *   실제 토익처럼 미국·영국·호주 6명을 섞기로 했는데, 일레븐랩스 보이스는 **체감 음량이 제각각**이다.
 *   같은 문장을 6명에게 읽혔더니 통합 라우드니스가 이렇게 갈렸다.
 *       UK-W -17.3 / US-M -17.8 / US-W -19.7 / UK-M -20.1 / AU-W -24.0 / AU-M -24.4  (LUFS)
 *   편차 **7dB** 다. 그대로 두면 대화에서 화자가 바뀔 때마다 소리가 튀고, 호주 화자 차례에는
 *   확 죽어서 "안 들린다" 는 소리를 듣는다. 듣기 시험 음원으로 쓸 수 없다.
 *
 * 어떻게:
 *   loudnorm 필터(동적 압축)는 몇 초짜리 짧은 발화에서 펌핑이 생긴다. 그래서 **재기 → 필요한 만큼
 *   gain** 방식을 쓴다(volume 필터). 원래 강약은 그대로 남는다.
 *
 *   ⚠️ 처음엔 "피크가 -1dBFS 를 넘지 않도록 gain 을 깎는" 식으로 만들었는데 **74개가 안 맞았다.**
 *   조용한 클립일수록 자음 파열음 하나가 이미 피크에 붙어 있어서(통합 -24.8 LUFS 인데 피크 -0.8dBFS)
 *   올릴 여유가 0 이 되어 버린 탓이다. 그래서 gain 은 라우드니스만 보고 정하고, 튀는 피크는
 *   **리미터(alimiter)** 로 눌러 클리핑을 막는다. 말소리라 몇 dB 리미팅은 티가 안 난다.
 *
 *   ⚠️ alimiter 는 기본값이 `level=true` 라 **출력을 천장까지 자동으로 밀어올린다.** 그대로 쓰면
 *   내가 계산한 gain 이 무시되고 전부 0 dBFS 로 붙어 클리핑한다(실측으로 파일을 한 번 망쳤다).
 *   반드시 `level=disabled` 로 꺼야 한다 — 리미터는 튀는 피크만 자르고 레벨은 건드리면 안 된다.
 *
 * 안전장치:
 *   - 이미 목표에서 ±0.5dB 안이면 **건너뛴다.** mp3 를 다시 인코딩할수록 음질이 깎이므로
 *     여러 번 돌려도 한 번만 손대게 한다(= 다시 돌려도 안전).
 *
 * 사용:
 *   node scripts/normalize_audio.js            # dry run — 지금 음량과 손댈 파일만 출력
 *   node scripts/normalize_audio.js --go
 *   node scripts/normalize_audio.js --go --dir public/lc
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GO = process.argv.includes('--go');
const dirArg = process.argv.indexOf('--dir');
const ROOT = path.join(__dirname, '..');

/** 목표 라우드니스. 말소리 콘텐츠 표준값(-16 ~ -18) 중 여유 있는 쪽 */
const TARGET = -18.0;
const PEAK_CEIL = -1.0;     // 리미터 천장 (클리핑 방지)
const MAX_GAIN = 12.0;      // 이보다 크게 올리지 않는다 — 잡음까지 끌어올리면 더 나빠진다
const LIMIT = Math.pow(10, PEAK_CEIL / 20).toFixed(3);   // dBFS → 선형 (alimiter 는 0~1 을 받는다)
const DEADBAND = 0.5;       // 목표에 이만큼 붙어 있으면 손대지 않는다

const DIRS = dirArg > -1
  ? [process.argv[dirArg + 1]]
  : ['public/lc', 'public/part1/options', 'public/part2/options'];

function mp3sIn(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.mp3')).map((f) => path.join(abs, f));
}

/** 통합 라우드니스(LUFS) + 최대 피크(dBFS) */
function measure(file) {
  const out = execSync(
    `ffmpeg -hide_banner -nostats -i "${file}" -af ebur128=peak=true:framelog=quiet -f null - 2>&1`,
    { encoding: 'utf8' });
  const i = /I:\s*(-?[\d.]+)\s*LUFS/.exec(out);
  const p = /Peak:\s*(-?[\d.]+)\s*dBFS/.exec(out);
  return { lufs: i ? Number(i[1]) : null, peak: p ? Number(p[1]) : null };
}

function main() {
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); }
  catch { console.error('ffmpeg 가 없습니다 — 설치 후 다시 실행하세요'); process.exit(1); }

  const files = DIRS.flatMap(mp3sIn);
  if (!files.length) { console.error(`대상 mp3 가 없습니다: ${DIRS.join(', ')}`); process.exit(1); }
  console.log(`대상 ${files.length}개 · 목표 ${TARGET} LUFS (피크 ${PEAK_CEIL} dBFS 이하)\n`);

  const plan = [];
  let quiet = Infinity, loud = -Infinity;
  for (const f of files) {
    const { lufs, peak } = measure(f);
    if (lufs === null || !Number.isFinite(lufs)) { console.warn(`  ? ${path.basename(f)} — 측정 실패, 건너뜀`); continue; }
    quiet = Math.min(quiet, lufs); loud = Math.max(loud, lufs);
    /* gain 은 **라우드니스만 보고** 정한다. 피크로 깎으면 조용한 클립이 영영 못 올라온다(위 주석) */
    let gain = Math.min(TARGET - lufs, MAX_GAIN);
    if (Math.abs(gain) < DEADBAND) continue;
    plan.push({ f, lufs, gain });
  }

  console.log(`손대기 전 음량 폭: ${quiet.toFixed(1)} ~ ${loud.toFixed(1)} LUFS (편차 ${(loud - quiet).toFixed(1)}dB)`);
  console.log(`조정 대상 ${plan.length}개 · 이미 맞는 것 ${files.length - plan.length}개`);
  if (!plan.length) { console.log('\n손댈 것 없음'); return; }

  if (!GO) {
    for (const p of plan.slice(0, 8)) {
      console.log(`  ${path.basename(p.f)}  ${p.lufs.toFixed(1)} → ${TARGET}  (${p.gain > 0 ? '+' : ''}${p.gain.toFixed(1)}dB)`);
    }
    console.log('\n(dry run) 반영하려면 --go');
    return;
  }

  let n = 0;
  for (const p of plan) {
    const tmp = p.f + '.tmp.mp3';
    try {
      // 올린 뒤 튀는 피크만 리미터로 눌러 클리핑을 막는다
      execSync(`ffmpeg -hide_banner -loglevel error -y -i "${p.f}" -af "volume=${p.gain.toFixed(2)}dB,alimiter=limit=${LIMIT}:level=disabled" -c:a libmp3lame -q:a 2 "${tmp}"`, { stdio: 'ignore' });
      fs.renameSync(tmp, p.f);
      n += 1;
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      console.error(`  ✗ ${path.basename(p.f)}: ${e.message.slice(0, 100)}`);
    }
  }
  console.log(`\n${n}개 조정 완료`);
}

main();
