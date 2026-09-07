/* 이미 만들어 둔 mp3 의 **피치만 내린다** — 일레븐랩스를 다시 부르지 않는다(크레딧 0).
 *
 *  피치를 바꾸기로 정하면 새로 만드는 것은 생성기가 알아서 내리지만(gen-scripted-tts 의
 *  padEdges), **이미 있는 파일은 그대로다.** 322개를 다시 뽑는 건 낭비다 — 글자가 안 바뀌었으니
 *  원본 소리는 그대로 두고 가공만 하면 된다.
 *
 *  ⚠️ **두 번 걸면 두 번 내려간다.** 그래서 처리한 파일에는 표시를 남기고(mp3 주석 태그),
 *     표시가 있는 파일은 건너뛴다. 표시는 파일 안에 있어서 목록을 따로 안 들고 다녀도 된다.
 *  ⚠️ 얼마나 내릴지는 `INST_PITCH` 가 정한다 — 여기서 정하지 않는다. 생성기와 같은 값을 봐야
 *     새로 만든 것과 예전 것이 같은 소리가 된다.
 *
 *    node --experimental-strip-types scripts/tts-pitch.mjs --dry
 *    node --experimental-strip-types scripts/tts-pitch.mjs yun_daeun
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { INST_PITCH } from '../src/data/instructorData.ts'

const ROOT = path.join(import.meta.dirname, '..')
const DRY = process.argv.includes('--dry')
const ONLY = process.argv.slice(2).find((a) => !a.startsWith('--'))
const TAG = 'ybm-pitch'

/** 이 파일이 이미 내려간 것인가 — mp3 주석에 남긴 표시를 본다 */
function stamped(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format_tags=comment',
      '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' })
    return out.includes(TAG)
  } catch { return false }
}

let done = 0, skipped = 0
for (const inst of Object.keys(INST_PITCH)) {
  if (ONLY && inst !== ONLY) continue
  const semitones = INST_PITCH[inst]
  if (!semitones) continue
  const r = 2 ** (semitones / 12)
  const filter = `asetrate=44100*${r.toFixed(6)},aresample=44100,atempo=${(1 / r).toFixed(6)}`
  const dir = path.join(ROOT, 'public', 'tts', inst)
  if (!fs.existsSync(dir)) continue
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mp3'))
  console.log(`· ${inst} — ${semitones} 반음 · 파일 ${files.length}개`)

  for (const f of files) {
    const file = path.join(dir, f)
    if (stamped(file)) { skipped += 1; continue }
    if (DRY) { done += 1; continue }
    const tmp = `${file}.pre`
    fs.renameSync(file, tmp)
    try {
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp,
        '-af', filter, '-metadata', `comment=${TAG}=${semitones}`,
        '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', file])
      fs.unlinkSync(tmp)
      done += 1
    } catch (e) {
      /* 실패하면 원본을 되돌린다 — 반쯤 가공된 파일을 남기면 다음 판에 또 내려간다 */
      fs.renameSync(tmp, file)
      console.warn(`  ⚠️ ${f} 실패 — 원본 유지: ${e.message}`)
    }
  }
}
console.log(`\n${DRY ? '[DRY] ' : ''}내린 것 ${done} · 이미 내려간 것 ${skipped}`)
