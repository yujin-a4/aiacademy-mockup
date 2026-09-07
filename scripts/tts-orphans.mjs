/* 지금 대본이 **안 쓰는** mp3 를 센다 — 옛 대본 시절 남은 것들.
 *
 *  재생될 일은 없다(화면이 그 키를 찾지 않는다). 다만 옛 목소리·옛 여백이라, 같은 문장이
 *  대본에 다시 들어오면 그 파일이 그대로 나간다. 배포 용량도 먹는다.
 *  지워도 안 깨진다 — 없으면 실시간 생성으로 떨어진다.
 *
 *    node --experimental-strip-types scripts/tts-orphans.mjs
 *    node --experimental-strip-types scripts/tts-orphans.mjs --drop
 */
import fs from 'node:fs'
import path from 'node:path'
import { FGI_SCENARIO } from '../src/data/typeLearning/fgiScenario.ts'
import { INST_PERSONA } from '../src/data/instructorData.ts'
import { ACKS, ACKS_BY_INST, RETRY_BY_INST, RETRY_DEFAULT, stripAck } from '../src/data/typeLearning/scriptedSpeech.ts'
import { koLetters, ttsCacheKey } from '../src/lib/ttsText.ts'

const MANIFEST = path.join('src', 'data', 'ttsManifest.json')
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const DROP = process.argv.includes('--drop')
let total = 0

for (const inst of Object.keys(FGI_SCENARIO)) {
  const persona = INST_PERSONA[inst]
  const used = new Set()
  const add = (s) => { if (typeof s === 'string' && s.trim() && !s.includes('{')) used.add(ttsCacheKey(koLetters(s.trim()), persona, inst)) }
  for (const code of Object.keys(FGI_SCENARIO[inst])) {
    const L = FGI_SCENARIO[inst][code]
    for (const k of ['turns', 'review']) for (const t of L[k] ?? []) {
      add(t.tutor); add(t.tutorIfWrong)
      if (typeof t.tutor === 'string') { const s = stripAck(t.tutor); if (s !== t.tutor) add(s) }
    }
    add(L.intro?.script); add(L.practiceOutro)
    for (const g of L.summary ?? []) { add(g.intro); for (const it of g.items ?? []) add(it.ko) }
  }
  for (const a of ACKS) add(a)
  for (const a of ACKS_BY_INST[inst] ?? []) add(a)
  for (const r of RETRY_BY_INST[inst] ?? RETRY_DEFAULT) add(r)

  const dir = path.join('public', 'tts', inst)
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mp3'))
  const orphans = files.filter((f) => !used.has(f.replace(/\.mp3$/, '')))
  console.log(`${inst}: 파일 ${files.length}개 · 쓰는 것 ${used.size} · 안 쓰는 것 ${orphans.length}`)
  total += orphans.length
  if (DROP) for (const f of orphans) {
    fs.unlinkSync(path.join(dir, f))
    delete manifest[f.replace(/\.mp3$/, '')]
  }
}
if (DROP) { fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`); console.log(`\n지웠다 — ${total}개`) }
else console.log(`\n지우려면 --drop`)
