/* 지금 대본이 쓰는 발화가 **모두 최신 목소리로 만들어져 있는가.**
 *
 *  목소리 id 는 캐시 키(ttsCacheKey)에 들어가지 않는다 — 강사 목소리를 바꿔도 옛 mp3 가
 *  그대로 나간다. `--force` 를 돌리다 중간에 끊기면 일부만 새 목소리가 되는데, 파일만 봐서는
 *  알 수 없다(실측 09-04: 322개 중 314개만 바뀐 채로 멈췄고 남은 8개가 하필 피드백 멘트였다).
 *  이 도구는 **파일 시각**으로 센다 — `--hours` 안에 만들어진 것을 '새것' 으로 본다.
 *  ⚠️ 그래서 "방금 돌린 작업이 끝까지 갔나" 를 보는 도구다. 며칠 지난 파일은 최신 목소리로
 *     만든 것이어도 '옛것' 으로 세니, 그 숫자를 '틀린 목소리' 로 읽으면 안 된다.
 *     목소리 자체를 검증하려면 캐시 키에 목소리 id 를 넣어야 하는데, 그러면 모든 강사의
 *     mp3 가 한 번에 무효가 된다 — 아직 안 한 결정이다.
 *
 *    node --experimental-strip-types scripts/tts-check-fresh.mjs <강사>
 *    node --experimental-strip-types scripts/tts-check-fresh.mjs yun_daeun --drop   # 옛것만 지운다
 */
import fs from 'node:fs'
import path from 'node:path'
import { FGI_SCENARIO } from '../src/data/typeLearning/fgiScenario.ts'
import { INST_PERSONA } from '../src/data/instructorData.ts'
import { ACKS, ACKS_BY_INST, RETRY_BY_INST, RETRY_DEFAULT, stripAck } from '../src/data/typeLearning/scriptedSpeech.ts'
import { koLetters, ttsCacheKey } from '../src/lib/ttsText.ts'

const inst = process.argv[2] ?? 'yun_daeun'
/* '새것' 의 기준 시각. 목소리를 바꾼 시점이 몇 시간 전이면 `--hours 8` 처럼 늘려 쓴다 —
   기본 2시간으로 두고 한참 뒤에 돌리면 멀쩡한 파일까지 '옛것' 으로 센다. */
const HOURS = process.argv.includes('--hours') ? Number(process.argv[process.argv.indexOf('--hours') + 1]) : 2
const cut = Date.now() - HOURS * 60 * 60 * 1000
const persona = INST_PERSONA[inst]
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

let fresh = 0; const stale = []
for (const s of lines) {
  const f = path.join('public', 'tts', inst, `${ttsCacheKey(s, persona, inst)}.mp3`)
  if (!fs.existsSync(f)) { stale.push(['없음', s]); continue }
  if (fs.statSync(f).mtimeMs > cut) { fresh++; continue }
  stale.push(['옛것', s])
  if (process.argv.includes('--drop')) fs.unlinkSync(f)
}
console.log(`${inst}: 발화 ${lines.size}개 · 새 목소리 ${fresh} · 남은 것 ${stale.length}`)
for (const [why, s] of stale.slice(0, 12)) console.log(`  ${why}  ${s.slice(0, 66)}`)
