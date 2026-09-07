/* 대본을 다시 만든 뒤 **어느 발화가 달라졌는지** 보여준다.
 *
 *  말투 제안본(scripts/tone/*.json)을 고치고 빌드하면 무엇이 바뀌었는지 파일만 봐서는 알 수 없다.
 *  빌드 전 fgiScenario.ts 사본과 지금 것을 견줘 사라진 문장·새 문장을 짝지어 보여준다.
 *
 *    node --experimental-strip-types scripts/_tone-diff.mjs <빌드전.ts> [지금.ts]
 */
import fs from 'node:fs'

const RE = /"tutor":\s*"((?:[^"\\]|\\.)*)"/g

function lines(file) {
  const s = fs.readFileSync(file, 'utf8')
  return [...s.matchAll(RE)].map((m) => JSON.parse(`"${m[1]}"`))
}

const before = lines(process.argv[2])
const after = lines(process.argv[3] ?? 'src/data/typeLearning/fgiScenario.ts')
const sb = new Set(before)
const sa = new Set(after)
const gone = before.filter((x) => !sa.has(x))
const born = after.filter((x) => !sb.has(x))

console.log(`사라진 문장 ${gone.length} · 새 문장 ${born.length}\n`)
for (let i = 0; i < Math.max(gone.length, born.length); i++) {
  if (gone[i]) console.log(`  전: ${gone[i].slice(0, 120)}`)
  if (born[i]) console.log(`  후: ${born[i].slice(0, 120)}`)
  console.log()
}
