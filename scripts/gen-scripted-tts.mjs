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
 *   · 앱이 얹는 맞장구 여섯 개(ACKS)와 **강사 지정 맞장구·되묻기**(ACKS_BY_INST / RETRY_BY_INST)
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
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

import { FGI_SCENARIO } from '../src/data/typeLearning/fgiScenario.ts'
import { INST_PERSONA, INST_VOICE, INST_TTS_MODEL, INST_SENTENCE_PAUSE, INST_AUDIO_TAGS } from '../src/data/instructorData.ts'
import { ACKS, ACKS_BY_INST, RETRY_BY_INST, RETRY_DEFAULT, stripAck } from '../src/data/typeLearning/scriptedSpeech.ts'
import {
  DEFAULT_TTS, DEFAULT_TTS_MODEL, TTS_PARAMS,
  applyAudioTags, applyPronunciation, stripAudioTags, koLetters, sanitizeForTts, sayableTerms, spaceSentences, ttsCacheKey,
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
  /* ── 강사 지정 맞장구·되묻기도 모은다 (09-04) ──
     09-03 개념학습본이 대본에서 정오답 반응 줄을 빼면서, 그 문구가 시트 머리말 → 코드
     (ACKS_BY_INST / RETRY_BY_INST)로 옮겨왔다. 그런데 여기에 안 더해서 **미리 만들어지지
     않았다** — 이도윤이 실제로 하는 말은 "맞아요!"(느낌표)인데 목록의 "맞습니다."만 만들었다.
     그 바람에 옛 목소리로 만들어 둔 09-01 파일이 그대로 나갔다(실측: 사용자가 "예전 목소리
     같다"고 보고). 강사가 소리 낼 문자열은 **한 곳도 빠짐없이** 여기를 지나야 한다. */
  for (const a of ACKS_BY_INST[instructor] ?? []) add(a, '맞장구(강사)')
  /* 지정이 없는 강사는 기본 문구를 말한다 — retryLine 과 같은 규칙으로 고른다 */
  for (const r of RETRY_BY_INST[instructor] ?? RETRY_DEFAULT) add(r, '되묻기')
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
  speech = sayableTerms(speech)
  if (modelId === 'eleven_v3') speech = applyPronunciation(speech)
  /* v3 연기 지시 — 라우트와 **같은 함수**를 부른다. 한쪽만 걸면 미리 만든 소리와
     실시간 소리가 달라지는데, 대본 강의는 그 둘이 한 수업 안에서 섞여 나간다. */
  speech = (modelId === 'eleven_v3' && INST_AUDIO_TAGS[instructor])
    ? applyAudioTags(speech)
    : stripAudioTags(speech)   // v2 는 태그를 그대로 읽는다 — 떼고 보낸다

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

/** 앞뒤 여백을 **한 벌로 맞춘다** (09-04).
 *
 *  일레븐랩스가 주는 mp3 는 앞뒤 여백이 **뽑을 때마다 다르다.** 같은 문장을 세 번 뽑아 재보니
 *  뒤여백이 0.95초 / 0.05초 / 0.84초였다. 0.05초로 나온 것이 "끝이 잘린다" 로 들린다 —
 *  재생기가 조금만 일찍 멈춰도 마지막 글자가 사라진다. 반대로 1초짜리는 다음 말까지 늘어진다.
 *  텍스트로는 못 고친다(모델이 정해 주지 않는다). 받은 뒤에 **깎고 정해진 만큼 다시 붙인다.**
 *
 *  ⚠️ 붙이기만 하면 안 된다 — 이미 1초인 파일이 1.35초가 되어 더 늘어진다. `silenceremove`
 *     로 앞뒤를 먼저 깎은 뒤 같은 길이를 붙여야 322개가 다 같아진다.
 *  ⚠️ 깎는 기준은 -45dB 다. 숨소리는 그보다 크므로 살아남는다 — 강사가 숨을 안 쉬는 것처럼
 *     들리면 이 값을 낮출 것.
 *  ⚠️ ffmpeg 이 없으면 **그냥 원본을 쓴다.** 여백은 있으면 좋은 것이지, 없다고 수업이
 *     망가지지는 않는다 — 여기서 죽으면 음원을 한 개도 못 만든다. */
const PAD_HEAD = 0.15
const PAD_TAIL = 0.45
let padWarned = false
function padEdges(buf, file) {
  const tmp = `${file}.raw`
  /* 앞뒤 무음을 깎고(양쪽 각각 한 번) → 앞에 PAD_HEAD, 뒤에 PAD_TAIL 을 붙인다 */
  const filter = [
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0',
    'areverse',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0',
    'areverse',
    `adelay=${Math.round(PAD_HEAD * 1000)}:all=1`,
    `apad=pad_dur=${PAD_TAIL}`,
    /* areverse 를 두 번 지나면 타임스탬프가 음수로 남아 먹서가 경고를 쏟는다
       ("non monotonically increasing dts"). 파일은 멀쩡하지만 로그가 묻히니 여기서 되돌린다. */
    'asetpts=N/SR/TB',
  ].join(',')
  try {
    fs.writeFileSync(tmp, buf)
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp,
      '-af', filter, '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', file])
    const out = fs.readFileSync(file)
    fs.unlinkSync(tmp)
    return out
  } catch (e) {
    if (!padWarned) { console.warn(`  ⚠️ 앞뒤 여백을 못 맞췄다(ffmpeg?) — 원본 그대로 쓴다: ${e.message}`); padWarned = true }
    try { fs.unlinkSync(tmp) } catch { /* noop */ }
    return buf
  }
}

async function generate(voiceId, body) {
  let last = null
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API}/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify(body),
      })
      if (res.ok) return Buffer.from(await res.arrayBuffer())
      /* 429(동시 요청 초과)·5xx 는 잠깐 쉬면 풀린다. 4xx 는 우리가 잘못 보낸 것이라 바로 알린다. */
      const text = await res.text().catch(() => '')
      if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${text}`)
      last = new Error(`${res.status} ${text}`)
    } catch (e) {
      /* ── 끊긴 연결도 **다시 시도한다** (09-04) ──
         `fetch failed`(네트워크 순간 끊김) 하나에 322개짜리 작업이 통째로 죽었다. 그것도
         마지막 8개를 남기고 — 다시 돌리면 앞의 314개를 또 만들어야 한다(크레딧). 되던 일이
         한 번 끊겼다고 처음부터가 되면 안 된다.
         ⚠️ 우리가 잘못 보낸 요청(4xx)은 위에서 던져 두고 여기서 다시 던진다 — 몇 번을 더
            보내도 같은 답이 온다. 그건 사람이 봐야 하는 오류다. */
      if (/^\d{3} /.test(e.message) && !/^(429|5\d\d) /.test(e.message)) throw e
      last = e
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
  }
  throw new Error(`네 번 시도했지만 안 됐다 — ${last?.message ?? '알 수 없음'}`)
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
      fs.writeFileSync(file, padEdges(buf, file))
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
