/**
 * 대본 수업(FGI 시연 강의)의 **강사 발화를 미리 mp3 로 만들어 둔다.**
 *
 * ── 왜 ─────────────────────────────────────────────────────────────
 * 대본 수업은 모든 학생이 **똑같은 말**을 듣는데, 실시간 생성은 학생 수만큼 다시 만든다.
 * 50명이면 50번, 300명이면 300번. 미리 만들어 두면 한 번이면 끝난다.
 * 돈보다 큰 이유가 셋 더 있다 — 소리가 매번 똑같고(참가자마다 다른 수업을 듣지 않는다),
 * 현장 네트워크가 나빠도 강사가 말하고, **사람이 미리 들어보고 이상한 발음을 잡을 수 있다.**
 *
 * ── 어떻게 ─────────────────────────────────────────────────────────
 * 화면이 실제로 읽는 문자열(`koLetters` 를 거친 값)로 키를 만들고(ttsCacheKey),
 * 그 키로 파일을 저장한 뒤 매니페스트에 적는다. 화면은 `src/lib/tts.ts` 에서 매니페스트를
 * 먼저 보고, **없으면 조용히 실시간 생성으로 간다** — 그래서 대본이 바뀌어도 안 깨진다.
 *
 * 만드는 문자열
 *   · 수업/코칭 턴의 `tutor` 와 `tutorIfWrong`
 *   · 학생이 **못 맞힌 뒤**에 나가는 모습 — `stripAck(tutor)` (첫머리 맞장구를 뗀 줄)
 *   · 도입 화면 대본, 정리 화면의 도입·피드백
 *   · 앱이 얹는 맞장구 여섯 개(ACKS)
 * 건너뛰는 것: `{맞은수}` 처럼 **자리표시자가 든 줄** — 값이 그때 정해지므로 미리 만들 수 없다.
 *
 * ── 실행 ───────────────────────────────────────────────────────────
 *   node --experimental-strip-types scripts/gen-scripted-tts.mjs --dry      # 셈만 (API 안 부름)
 *   node --experimental-strip-types scripts/gen-scripted-tts.mjs            # 없는 것만 생성
 *   node --experimental-strip-types scripts/gen-scripted-tts.mjs --only lee_doyun
 *   node --experimental-strip-types scripts/gen-scripted-tts.mjs --force    # 있어도 다시 생성
 *
 * ⚠️ **대본이 바뀌면 다시 돌린다.** 시트 → build-fgi-scenario.js → 이 스크립트 순서다.
 *    안 돌려도 화면은 멀쩡하다(실시간으로 떨어질 뿐).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

import { FGI_SCENARIO } from '../src/data/typeLearning/fgiScenario.ts'
import { INST_PERSONA, INST_VOICE, INST_TTS_MODEL, INST_SENTENCE_PAUSE } from '../src/data/instructorData.ts'
import { ACKS, stripAck } from '../src/data/typeLearning/scriptedSpeech.ts'
import {
  DEFAULT_TTS, DEFAULT_TTS_MODEL, TTS_PARAMS,
  applyPronunciation, koLetters, sanitizeForTts, spaceSentences, ttsCacheKey,
} from '../src/lib/ttsText.ts'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true })

const API = 'https://api.elevenlabs.io/v1/text-to-speech'
const KEY = process.env.ELEVENLABS_API_KEY

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry')
const FORCE = argv.includes('--force')
const ONLY = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null
/** 몇 개만 만들어 본다 — 파이프라인이 도는지 확인할 때(크레딧을 안 태운다) */
const LIMIT = argv.includes('--limit') ? Number(argv[argv.indexOf('--limit') + 1]) : Infinity

const OUT_ROOT = path.join(ROOT, 'public', 'tts')
const MANIFEST = path.join(ROOT, 'src', 'data', 'ttsManifest.json')

/** 값이 그때 정해지는 줄은 미리 만들 수 없다 */
const hasPlaceholder = (s) => s.includes('{')

/** 이 강사가 실제로 소리 낼 문자열을 모은다 (중복 제거).
 *  ⚠️ 화면이 보내는 것과 **한 글자라도 달라지면** 키가 어긋나 미리 만든 보람이 없다.
 *     그래서 화면과 같은 `koLetters` 를 여기서 거친다. */
function collect(instructor) {
  const out = new Map()          // 읽을 문자열 → 어디서 왔는지(로그용)
  const add = (raw, where) => {
    if (typeof raw !== 'string') return
    const t = raw.trim()
    if (!t || hasPlaceholder(t)) return
    const spoken = koLetters(t)
    if (!out.has(spoken)) out.set(spoken, where)
  }
  const addTurn = (turn, where) => {
    add(turn?.tutor, where)
    add(turn?.tutorIfWrong, `${where}/오답갈래`)
    /* 못 맞힌 뒤에는 첫머리 맞장구를 뗀 모습으로 나간다 — 그 갈래도 미리 만들어 둔다 */
    if (typeof turn?.tutor === 'string') {
      const stripped = stripAck(turn.tutor)
      if (stripped !== turn.tutor) add(stripped, `${where}/맞장구뗌`)
    }
  }

  for (const [code, lesson] of Object.entries(FGI_SCENARIO[instructor] ?? {})) {
    for (const t of lesson.turns ?? []) addTurn(t, `${code}/수업`)
    for (const t of lesson.review ?? []) addTurn(t, `${code}/코칭`)
    add(lesson.intro?.script, `${code}/도입`)
    add(lesson.practiceOutro, `${code}/실전뒤`)
    for (const g of lesson.summary ?? []) {
      add(g.intro, `${code}/정리`)
      for (const it of g.items ?? []) add(it.ko, `${code}/정리피드백`)
    }
  }
  for (const a of ACKS) add(a, '맞장구')
  return out
}

/** 라우트(`/api/tts`)와 **같은 규칙**으로 일레븐랩스에 보낼 몸통을 만든다.
 *  규칙 자체는 src/lib/ttsText.ts 한 벌뿐이라 여기서 다시 정의하지 않는다. */
function requestFor(spoken, instructor) {
  const persona = INST_PERSONA[instructor] ?? 'park'
  const voiceId = INST_VOICE[instructor] || process.env.ELEVENLABS_VOICE_ID
  const modelId = INST_TTS_MODEL[instructor] || DEFAULT_TTS_MODEL
  const { speed, stability, similarity_boost } = TTS_PARAMS[persona] ?? DEFAULT_TTS

  const text = sanitizeForTts(spoken)
  let speech = INST_SENTENCE_PAUSE[instructor] ? spaceSentences(text) : text
  if (modelId === 'eleven_v3') speech = applyPronunciation(speech)

  return {
    persona,
    voiceId,
    body: {
      text: speech,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost,
        ...(modelId !== 'eleven_v3' ? { speed } : {}),
      },
    },
  }
}

async function generate(voiceId, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
    /* 429(동시 요청 초과)는 잠깐 쉬면 풀린다. 그 외 오류는 바로 알린다. */
    if (res.status !== 429) throw new Error(`${res.status} ${await res.text().catch(() => '')}`)
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
  }
  throw new Error('429 가 계속됨 — 동시 요청 한도에 걸렸다')
}

async function main() {
  const instructors = ONLY ? [ONLY] : Object.keys(FGI_SCENARIO)
  const manifest = fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
    : {}

  let made = 0, skipped = 0, chars = 0
  for (const instructor of instructors) {
    const items = collect(instructor)
    if (!items.size) { console.log(`· ${instructor}: 대본 없음 — 건너뜀`); continue }

    const persona = INST_PERSONA[instructor] ?? 'park'
    const dir = path.join(OUT_ROOT, instructor)
    if (!DRY) fs.mkdirSync(dir, { recursive: true })
    console.log(`\n· ${instructor} (persona=${persona}) — 발화 ${items.size}개`)

    for (const [spoken, where] of items) {
      const key = ttsCacheKey(spoken, persona, instructor)
      const rel = `/tts/${instructor}/${key}.mp3`
      const file = path.join(dir, `${key}.mp3`)

      if (!FORCE && fs.existsSync(file)) {
        manifest[key] = rel
        skipped++
        continue
      }
      if (made >= LIMIT) break
      chars += spoken.length
      if (DRY) { made++; continue }

      const { voiceId, body } = requestFor(spoken, instructor)
      if (!KEY || !voiceId) throw new Error('ELEVENLABS_API_KEY / 목소리 id 가 없다 (.env.local 확인)')
      const buf = await generate(voiceId, body)
      fs.writeFileSync(file, buf)
      manifest[key] = rel
      made++
      console.log(`  ✓ ${where}  ${spoken.length}자  ${spoken.slice(0, 28)}…`)
    }
  }

  /* 파일이 사라진 항목은 매니페스트에서 뺀다 — 없는 주소를 가리키면 그 발화만 소리가 안 난다 */
  let dropped = 0
  for (const [key, rel] of Object.entries(manifest)) {
    if (!fs.existsSync(path.join(ROOT, 'public', rel.replace(/^\/+/, '')))) {
      delete manifest[key]; dropped++
    }
  }

  if (!DRY) {
    const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
    fs.writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`)
  }

  console.log(`\n${DRY ? '[DRY] ' : ''}생성 ${made} · 이미 있음 ${skipped} · 매니페스트에서 뺌 ${dropped}`)
  console.log(`${DRY ? '만들 ' : '만든 '}글자 수 ${chars.toLocaleString()}자` +
    (DRY ? '  ← 이만큼 크레딧을 쓴다 (한 번만)' : ''))
  if (DRY) console.log('실제로 만들려면 --dry 를 빼고 다시 돌린다.')
}

main().catch((e) => { console.error('\n실패:', e.message); process.exit(1) })
