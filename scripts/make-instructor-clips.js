/**
 * 강사 영상 → 원형 아바타용 무음 루프 클립 만들기
 *
 * 왜 변환이 필요한가 (원본을 그대로 물리면 안 되는 이유)
 *   · 소리가 있으면 브라우저가 자동재생을 막는다. 목소리는 TTS 로 따로 나가므로 영상은 무음이어야 한다
 *   · 카톡에서 넘어온 원본은 HEVC 라 브라우저에서 안 도는 경우가 있다 → H.264
 *   · 아바타는 원(118px, 작을 땐 56px)이다. 가로 영상을 그대로 넣으면 얼굴 양옆이 잘려 뭔지 모른다 → 정사각
 *   · 원본은 수십 MB다. 수업 시작할 때마다 그만큼 받는다 → 480px·짧게 잘라 1MB 안쪽
 *   · 루프 이음매: 시작과 끝이 다르면 3초마다 툭 튄다 → --boomerang 으로 정방향+역방향을 이어 붙인다
 *
 * 사용
 *   node scripts/make-instructor-clips.js --in <원본.mp4> --out <이름> [옵션]
 *     --start 3.5     시작 지점(초)
 *     --dur 4         길이(초, 기본 4)
 *     --crop 0.5,0.35 얼굴 중심의 가로,세로 위치 비율 (기본 0.5,0.35 = 가운데·위쪽)
 *     --zoom 1.0      1 이면 짧은 변 전체, 작을수록 얼굴로 당긴다
 *     --boomerang     정방향+역방향으로 이어 완전한 루프를 만든다(길이 2배)
 *     --instructor lee_doyun   저장 위치 public/instructor/<id>/clips/<이름>.mp4
 *
 * 예)
 *   node scripts/make-instructor-clips.js --in raw/lee_talk.mp4 --out talk --instructor lee_doyun --start 2 --dur 4
 *
 * 만든 뒤 src/data/instructorData.ts 의 INST_CLIPS 에 경로를 적으면 화면에 붙는다.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt
}
const has = (name) => process.argv.includes(`--${name}`)

const input = arg('in')
const out = arg('out')
const instructor = arg('instructor', 'lee_doyun')
const start = Number(arg('start', '0'))
const dur = Number(arg('dur', '4'))
const zoom = Number(arg('zoom', '1'))
const [cx, cy] = String(arg('crop', '0.5,0.35')).split(',').map(Number)
const SIZE = 480

if (!input || !out) {
  console.error('사용: node scripts/make-instructor-clips.js --in <원본.mp4> --out <이름> [--instructor lee_doyun]')
  process.exit(1)
}
if (!fs.existsSync(input)) { console.error(`원본이 없다: ${input}`); process.exit(1) }

const dir = path.join('public', 'instructor', instructor, 'clips')
fs.mkdirSync(dir, { recursive: true })
const dest = path.join(dir, `${out}.mp4`)

/* 짧은 변을 기준으로 정사각을 뜬다. 얼굴은 보통 위쪽에 있으므로 세로 기본값을 0.35 로 둔다
   (정가운데로 뜨면 턱과 목이 원의 절반을 먹는다). */
/* min(iw,ih) 의 쉼표는 반드시 이스케이프한다 — 안 그러면 ffmpeg 가 필터 구분자로 읽어
   "No such filter: 'ih)*0.72:min(iw'" 로 죽는다 */
const side = `min(iw\\,ih)*${zoom}`
const crop = `crop=${side}:${side}:(iw-${side})*${cx}:(ih-${side})*${cy}`
const scale = `scale=${SIZE}:${SIZE}:flags=lanczos`
const filter = has('boomerang')
  ? `[0:v]${crop},${scale},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]`
  : `[0:v]${crop},${scale}[v]`

const args = [
  '-y', '-ss', String(start), '-t', String(dur), '-i', input,
  '-filter_complex', filter, '-map', '[v]',
  '-an',                                  // 무음 — 자동재생의 조건이다
  '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
  '-crf', '26', '-preset', 'slow',
  '-movflags', '+faststart',              // 다 받기 전에 첫 프레임이 뜬다
  '-r', '25',
  dest,
]

console.log(`${input} → ${dest}`)
try {
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
} catch (e) {
  console.error('ffmpeg 실패:\n' + String(e.stderr || e.message).split('\n').slice(-12).join('\n'))
  process.exit(1)
}

const kb = Math.round(fs.statSync(dest).size / 1024)
console.log(`✅ ${dest}  ${kb}KB${kb > 1024 ? '  ⚠️ 1MB 넘는다 — --dur 를 줄이거나 --crf 를 올릴 것' : ''}`)
