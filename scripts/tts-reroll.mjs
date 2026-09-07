/* 발화 **한 줄만** 다시 뽑는다 — 그 줄의 mp3 를 지우고 매니페스트에서 뺀다.
 *  그다음 `npm run tts:scripted -- --only <강사>` 를 돌리면 그것만 새로 만들어진다.
 *
 *  왜 필요한가: 일레븐랩스는 같은 글자라도 뽑을 때마다 다르다. 한 줄만 발음이 뭉갰을 때
 *  `--force` 로 전부 다시 만드는 것은 과하다. 글자를 고칠 일이 아니라 **다시 굴리는** 것이다.
 *
 *    node --experimental-strip-types scripts/_reroll.mjs <강사> "문장 일부"
 */
import fs from 'node:fs'
import path from 'node:path'
import { FGI_SCENARIO } from '../src/data/typeLearning/fgiScenario.ts'
import { INST_PERSONA } from '../src/data/instructorData.ts'
import { stripAck } from '../src/data/typeLearning/scriptedSpeech.ts'
import { koLetters, ttsCacheKey } from '../src/lib/ttsText.ts'

const ROOT = path.join(import.meta.dirname, '..')
const MANIFEST = path.join(ROOT, 'src', 'data', 'ttsManifest.json')
const [inst, needle] = process.argv.slice(2)
if (!inst || !needle) { console.log('쓰기: _reroll.mjs <강사> "문장 일부"'); process.exit(1) }

const persona = INST_PERSONA[inst]
const lines = new Map()          // 읽는 문자열 → 어디서 왔는지
const add = (s, where) => { if (typeof s === 'string' && s.trim() && !s.includes('{')) lines.set(koLetters(s.trim()), where) }
for (const code of Object.keys(FGI_SCENARIO[inst] ?? {})) {
  const L = FGI_SCENARIO[inst][code]
  add(L.intro?.script, `${code}/도입`)
  add(L.practiceOutro, `${code}/실전뒤`)
  for (const k of ['turns', 'review']) for (const t of L[k] ?? []) {
    add(t.tutor, `${code}/${k === 'turns' ? '수업' : '코칭'} ${t.no}번`)
    add(t.tutorIfWrong, `${code}/오답갈래 ${t.no}번`)
    if (typeof t.tutor === 'string') { const s = stripAck(t.tutor); if (s !== t.tutor) add(s, `${code}/맞장구뗌 ${t.no}번`) }
  }
  for (const g of L.summary ?? []) { add(g.intro, `${code}/정리`); for (const it of g.items ?? []) add(it.ko, `${code}/정리피드백`) }
}

const hits = [...lines].filter(([s]) => s.includes(needle))
if (!hits.length) { console.log(`"${needle}" 이 든 발화가 없다`); process.exit(1) }

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
for (const [spoken, where] of hits) {
  const key = ttsCacheKey(spoken, persona, inst)
  const file = path.join(ROOT, 'public', 'tts', inst, `${key}.mp3`)
  console.log(`  ${where}  ${spoken.slice(0, 70)}`)
  if (fs.existsSync(file)) fs.unlinkSync(file)
  delete manifest[key]
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`\n${hits.length}개 지웠다 — 이제 npm run tts:scripted -- --only ${inst}`)
