/**
 * 모의고사 음원·사진을 Supabase Storage 로 올린다.
 *
 * 왜 필요한가
 *   음원과 사진은 `public/mock/` 에 있고 그 폴더는 **gitignore 다**(교재 저작물 47MB/회차,
 *   20회차 전량은 898MB). 배포하면 파일이 없어 LC 가 통째로 안 돈다.
 *
 * 왜 비공개 버킷인가
 *   공개로 만들면 URL 만 알면 누구나 교재 음원을 받아 간다. 화면에는 **서명 URL**(시한부)로
 *   내보낸다 — /api/mock-test 가 요청마다 만들어 준다. 버킷을 공개로 돌리고 싶으면
 *   대시보드에서 한 번 바꾸면 되지만, 기본값은 잠가 둔다.
 *
 * 사용
 *   node scripts/upload-mock-media.mjs --vol 1 --test 1          # 무엇을 올릴지만 보여준다
 *   node scripts/upload-mock-media.mjs --vol 1 --test 1 --go
 *
 * 올리는 자리
 *   public/mock/lc1-t01/<파일>  →  버킷 `mock` 의 `lc1-t01/<파일>`
 *   (DB 의 audio_url·image_url 이 `/mock/lc1-t01/...` 이라 경로가 그대로 대응한다)
 */
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.join(HERE, '..')
config({ path: path.join(REPO, '.env.local'), quiet: true })

const BUCKET = 'mock'
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : dflt
}
const VOL = Number(arg('vol', '1'))
const TEST = Number(arg('test', '1'))
const GO = process.argv.includes('--go')

const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!base || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요하다 (.env.local)')
  process.exit(1)
}
const H = { apikey: key, Authorization: `Bearer ${key}` }

const MIME = { '.mp3': 'audio/mpeg', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png' }
const mb = (b) => (b / 1048576).toFixed(1) + ' MB'

const pad2 = (n) => String(n).padStart(2, '0')
const dir = `lc${VOL}-t${pad2(TEST)}`
const localDir = path.join(REPO, 'public', 'mock', dir)

if (!fs.existsSync(localDir)) {
  console.error(`없는 폴더다: ${localDir}`)
  console.error('먼저 만들어야 한다 — scripts/map_mock_audio.py --copy, scripts/extract_part1_photos.py --out')
  process.exit(1)
}

const files = fs.readdirSync(localDir).filter((f) => MIME[path.extname(f).toLowerCase()])
const total = files.reduce((a, f) => a + fs.statSync(path.join(localDir, f)).size, 0)
console.log(`${dir} — 파일 ${files.length}개 · ${mb(total)}`)

if (!GO) {
  console.log('\ndry run. 실제로 올리려면 --go')
  process.exit(0)
}

/** 버킷이 없으면 만든다. **비공개**로 만든다(위 주석 참고) */
async function ensureBucket() {
  const res = await fetch(`${base}/storage/v1/bucket/${BUCKET}`, { headers: H })
  if (res.ok) {
    const b = await res.json()
    console.log(`버킷 '${BUCKET}' 이미 있음 (public=${b.public})`)
    return
  }
  const mk = await fetch(`${base}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  })
  if (!mk.ok) throw new Error(`버킷 생성 실패: ${mk.status} ${await mk.text()}`)
  console.log(`버킷 '${BUCKET}' 생성 (비공개)`)
}

async function upload(file) {
  const local = path.join(localDir, file)
  const body = fs.readFileSync(local)
  const key2 = `${dir}/${file}`
  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${encodeURI(key2)}`, {
    method: 'POST',
    headers: {
      ...H,
      'Content-Type': MIME[path.extname(file).toLowerCase()],
      // 다시 돌려도 같은 상태가 되게 — 반쯤 올리다 끊겨도 이어서 돌리면 된다
      'x-upsert': 'true',
    },
    body,
  })
  if (!res.ok) throw new Error(`${file} → ${res.status} ${(await res.text()).slice(0, 200)}`)
}

await ensureBucket()

let done = 0
let bytes = 0
for (const f of files) {
  await upload(f)
  done += 1
  bytes += fs.statSync(path.join(localDir, f)).size
  process.stdout.write(`\r  올리는 중 ${done}/${files.length} (${mb(bytes)})   `)
}
console.log(`\n완료 — ${done}개 · ${mb(bytes)}`)
console.log(`\n화면은 /api/mock-test 가 만들어 주는 서명 URL 로 받는다(버킷은 비공개).`)
