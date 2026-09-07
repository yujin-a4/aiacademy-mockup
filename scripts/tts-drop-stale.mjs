/* 발음 규칙이 바뀌었을 때, **읽는 문자열이 실제로 달라지는 줄의 mp3 만** 지운다.
 *
 * 왜 필요한가: 캐시 키는 `koLetters(원문)` 으로만 만든다(ttsCacheKey). 발음 규칙을 고쳐도
 * 키가 그대로라 `npm run tts:scripted` 가 "이미 있음" 으로 건너뛴다 — 옛 소리가 계속 나간다.
 * `--force` 는 500개를 통째로 다시 만드니 과하다. 달라지는 줄만 지우고 평소대로 돌리면 된다.
 *
 * ⚠️ **고치기 전의 결과와 견줘야** 무엇이 달라졌는지 알 수 있다. 그래서 옛 규칙을 여기에
 *    베껴 두고(`OLD`) 지금 결과와 대조한다. 규칙을 새로 고칠 때마다 OLD 를 갱신할 것.
 *
 *   node --experimental-strip-types scripts/_drop-stale-tts.mjs --dry
 *   node --experimental-strip-types scripts/_drop-stale-tts.mjs
 *   npm run tts:scripted
 */
import fs from 'node:fs'
import path from 'node:path'
import { FGI_SCENARIO } from '../src/data/typeLearning/fgiScenario.ts'
import { INST_PERSONA } from '../src/data/instructorData.ts'
import { ACKS, ACKS_BY_INST, RETRY_BY_INST, RETRY_DEFAULT, stripAck } from '../src/data/typeLearning/scriptedSpeech.ts'
import { koLetters, sanitizeForTts, sayableTerms, applyPronunciation, ttsCacheKey } from '../src/lib/ttsText.ts'

const ROOT = path.join(import.meta.dirname, '..')
const MANIFEST = path.join(ROOT, 'src', 'data', 'ttsManifest.json')
const DRY = process.argv.includes('--dry')

/* ── 기준은 "옛 규칙" 이 아니라 **지금 파일이 만들어질 때 쓰인 규칙** 이다 ──
   여기를 "옛날 옛적 규칙" 으로 두면, 그 뒤에 이미 다시 만든 파일까지 낡은 것으로 세서
   멀쩡한 것을 또 만든다(실측 09-07: 72개로 잡혔지만 실제로 달라지는 건 14개였다).
   규칙을 고칠 때마다 **직전 상태 한 벌만** 여기에 적는다. */
const now = (s) => applyPronunciation(sayableTerms(sanitizeForTts(s)))
/* 직전 상태: p.p. 를 `PP` 로 읽었다(09-07 에 `피피` 로 바꿈). IPA 자리 규칙은 이미 반영돼 있다. */
const before = (s) => applyPronunciation(sayableTerms(sanitizeForTts(s)).replace(/피피/g, 'PP'))
const changed = (s) => now(s) !== before(s)

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
let dropped = 0

for (const inst of Object.keys(FGI_SCENARIO)) {
  const persona = INST_PERSONA[inst] ?? 'park'
  const lines = new Set()
  const add = (s) => { if (typeof s === 'string' && s.trim() && !s.includes('{')) lines.add(koLetters(s.trim())) }
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

  for (const spoken of lines) {
    if (!changed(spoken)) continue
    const key = ttsCacheKey(spoken, persona, inst)
    const file = path.join(ROOT, 'public', 'tts', inst, `${key}.mp3`)
    if (!fs.existsSync(file)) continue
    console.log(`  ${inst}  ${spoken.slice(0, 62)}`)
    console.log(`     전 ${before(spoken).slice(0, 62)}`)
    console.log(`     후 ${now(spoken).slice(0, 62)}`)
    if (!DRY) { fs.unlinkSync(file); delete manifest[key] }
    dropped += 1
  }
}
if (!DRY) fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`\n${DRY ? '[DRY] ' : ''}지울 mp3 ${dropped}개 — 이제 npm run tts:scripted 를 돌리면 이만큼만 새로 만든다`)
