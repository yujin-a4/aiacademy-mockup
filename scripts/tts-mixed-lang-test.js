/**
 * 한국어 발화 속 **영어 발음** 비교 — 같은 문장을 방식별로 만들어 놓고 귀로 고른다.
 *
 * 조건: **목소리는 강사 그대로**(윤다은). 그 사람이 영어만 원어민식으로 읽어야 한다.
 *   그래서 바꿀 수 있는 손잡이는 둘뿐이다 — **모델**과 **텍스트를 어떻게 넘기느냐**.
 *   같은 목소리라도 영어 구간만 따로 넘기면 모델이 그 구간을 영어로 인식해 영어 음소로 읽는다.
 *   (한국어 문장에 섞여 들어가면 한국어 발음 규칙에 끌려간다.) 어디까지 나아지는지는 들어봐야 안다.
 *
 * 만드는 것 (문장마다 · 전부 같은 목소리)
 *   a_now        지금 방식 (multilingual_v2, 문장 통째로)
 *   b_v3         모델만 eleven_v3 로 (코드 스위칭이 낫다고 알려진 모델)
 *   c_turbo      모델만 turbo_v2_5 로
 *   d_split_v2   한/영을 쪼개 **따로** 합성 → 이어 붙임 (multilingual_v2)
 *   e_split_v3   위와 같되 eleven_v3
 *
 * 사용
 *   node scripts/tts-mixed-lang-test.js <출력폴더>
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true })
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const KEY = process.env.ELEVENLABS_API_KEY
const TUTOR = 'QPFsEL6IBxlT15xfiD6C'                 // 윤다은 (INST_VOICE) — 끝까지 이 목소리 하나
const OUT = process.argv[2] || path.join(__dirname, '_tts_mix')

/* 1강 대본에서 실제로 쓰이는 꼴 — 한국어 문장 안에 영어 낱말·문장이 박혀 있다 */
const LINES = [
  { id: '1', text: 'B에 easel이 나왔죠. easel은 그림 그릴 때 캔버스를 세우기 위해 사용하는 것이에요.' },
  { id: '2', text: '맞아요. 사진에서도 여자가 이젤 앞에서 그림을 그리고 있었죠. B의 The woman is painting a picture on an easel.과 정확히 일치하니까 정답은 B예요.' },
]

/** 홀로 선 대문자 → 한글 음 (src/lib/tts.ts 의 koLetters 와 같은 규칙) */
const LETTER_KO = { A: '에이', B: '비', C: '씨', D: '디' }
const koLetters = (t) => t.replace(/(?<![A-Za-z])([A-Z])(?![A-Za-z])/g, (m) => LETTER_KO[m] ?? m)

/** 한국어 조각 / 영어 조각으로 쪼갠다. 영어 조각은 **낱말 하나라도** 따로 뗀다 */
function chunks(text) {
  const out = []
  /* 영어 덩어리 = 알파벳으로 시작해 알파벳·공백·영문 문장부호로 이어지는 구간 */
  const re = /[A-Za-z][A-Za-z'’.\- ]*[A-Za-z.]|[A-Za-z]/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ lang: 'ko', text: text.slice(last, m.index) })
    out.push({ lang: 'en', text: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ lang: 'ko', text: text.slice(last) })
  return out.filter((c) => c.text.trim())
}

async function tts(text, voiceId, modelId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.1 } }),
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`)
  return Buffer.from(await res.arrayBuffer())
}

/** 조각 mp3 들을 하나로 — 붙이는 것뿐이라 재인코딩 없이 concat */
function concat(parts, dest) {
  const list = dest + '.txt'
  fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'))
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', dest], { stdio: 'ignore' })
  fs.unlinkSync(list)
}

async function main() {
  if (!KEY) throw new Error('ELEVENLABS_API_KEY 가 없다 (.env.local)')
  fs.mkdirSync(OUT, { recursive: true })
  const tmp = path.join(OUT, '_parts')
  fs.mkdirSync(tmp, { recursive: true })

  for (const line of LINES) {
    const spoken = koLetters(line.text)
    console.log(`\n[문장 ${line.id}] ${spoken}`)

    for (const [tag, model] of [['a_now', 'eleven_multilingual_v2'], ['b_v3', 'eleven_v3'], ['c_turbo', 'eleven_turbo_v2_5']]) {
      try {
        fs.writeFileSync(path.join(OUT, `${line.id}_${tag}.mp3`), await tts(spoken, TUTOR, model))
        console.log(`  ✓ ${tag}`)
      } catch (e) { console.log(`  ✗ ${tag} — ${e.message}`) }
    }

    const cs = chunks(spoken)
    console.log('  쪼갠 결과:', cs.map((c) => `${c.lang}:${c.text.trim()}`).join(' | '))
    for (const [tag, model] of [['d_split_v2', 'eleven_multilingual_v2'], ['e_split_v3', 'eleven_v3']]) {
      try {
        const parts = []
        for (const [i, c] of cs.entries()) {
          const p = path.join(tmp, `${line.id}_${tag}_${i}.mp3`)
          fs.writeFileSync(p, await tts(c.text.trim(), TUTOR, model))
          parts.push(p)
        }
        concat(parts, path.join(OUT, `${line.id}_${tag}.mp3`))
        console.log(`  ✓ ${tag} (조각 ${parts.length}개)`)
      } catch (e) { console.log(`  ✗ ${tag} — ${e.message}`) }
    }
  }
  console.log(`\n📂 ${OUT}`)
}

main().catch((e) => { console.error('\n실패:', e.message); process.exit(1) })
