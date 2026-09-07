/* 대본에 든 오디오 태그가 **v3 가 아는 것인가** 검사한다.
 *
 *  문서에 없는 태그는 모델이 그대로 소리내어 읽는다 — 예전에 `[pause]` 를 넣었다가 강사가
 *  "포즈" 라고 읽은 사고가 그것이다. 대본을 새로 받을 때마다 한 번 돌릴 것.
 *
 *    node --experimental-strip-types scripts/_tag-check.mjs
 */
import { FGI_SCENARIO } from '../src/data/typeLearning/fgiScenario.ts'
import { V3_TAGS } from '../src/lib/ttsText.ts'

const known = new Set(V3_TAGS)
const seen = new Map()          // 태그 → [쓰인 문장…]

for (const inst of Object.keys(FGI_SCENARIO)) {
  for (const code of Object.keys(FGI_SCENARIO[inst])) {
    const L = FGI_SCENARIO[inst][code]
    const scan = (s) => {
      if (typeof s !== 'string') return
      for (const m of s.matchAll(/\[([a-z ]+)\]/gi)) {
        const tag = m[1].trim().toLowerCase()
        if (!seen.has(tag)) seen.set(tag, [])
        seen.get(tag).push(`${inst} ${code} — ${s.slice(0, 80)}`)
      }
    }
    for (const k of ['turns', 'review']) for (const t of L[k] ?? []) { scan(t.tutor); scan(t.tutorIfWrong) }
    scan(L.intro?.script); scan(L.practiceOutro)
    for (const g of L.summary ?? []) { scan(g.intro); for (const it of g.items ?? []) scan(it.ko) }
  }
}

const bad = [...seen.entries()].filter(([t]) => !known.has(t))
console.log(`쓰인 태그 ${seen.size}종 · 아는 것 ${seen.size - bad.length} · 모르는 것 ${bad.length}\n`)
for (const [t, uses] of [...seen.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${known.has(t) ? '✓' : '✗ 소리내어 읽는다'}  [${t}]  ${uses.length}회`)
}
if (bad.length) {
  console.log('\n── 고쳐야 할 줄 ──')
  for (const [t, uses] of bad) for (const u of uses) console.log(`  [${t}]  ${u}`)
}
