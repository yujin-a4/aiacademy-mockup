/**
 * FGI 참가자 계정 만들기 — ybm00 ~ ybm50 (비밀번호 1234)
 *
 * 계정 규칙
 *   ybm00~ybm50  참가자용. 로그인 아이디가 곧 GA 의 participant 가 된다(ybm07 → YBM07).
 *   guest00~     내부용. 우리가 쓰는 계정이라 GA 에서 cohort=internal 로 갈린다.
 *   → 이 구분은 src/lib/analytics.ts 의 FGI_ID(/^YBM\d{2}$/) 와 짝이다. 한쪽만 바꾸면 어긋난다.
 *
 * 왜 SQL 로 만드나
 *   Admin API(auth.admin.createUser)를 쓰려면 service_role 키가 필요한데 이 레포에는 없다.
 *   대신 SUPABASE_DB_URL 로 직접 넣는다. 손으로 지어낸 auth 행은 로그인이 안 되는 경우가 많아서
 *   **이미 있는 guest00 행의 모양을 그대로 흉내 낸다** — 토큰 칸들은 NULL 이 아니라 빈 문자열이어야
 *   하고(GoTrue 가 NULL 을 문자열로 못 읽는다), auth.identities 행이 없으면 이메일 로그인이 안 된다.
 *
 * 사용
 *   node scripts/create-fgi-accounts.js          # 무엇을 만들지 보여주기만 (기본값)
 *   node scripts/create-fgi-accounts.js --go     # 실제로 만든다
 *   node scripts/create-fgi-accounts.js --verify # 만든 계정으로 진짜 로그인되는지 확인
 *
 * 여러 번 돌려도 안전하다 — 이미 있는 계정은 건너뛴다(비밀번호를 덮지 않는다).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true })
const { Client } = require('pg')

const DOMAIN = '@ybm.co.kr'
const PASSWORD = '1234'
const FROM = 0
const TO = 50
const ids = () => Array.from({ length: TO - FROM + 1 }, (_, i) => `ybm${String(FROM + i).padStart(2, '0')}`)

/** pgcrypto 가 어느 스키마에 있는지 — Supabase 는 보통 extensions 다 */
async function cryptSchema(c) {
  const { rows } = await c.query(`
    select n.nspname from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'gen_salt' limit 1`)
  if (!rows.length) throw new Error('pgcrypto(gen_salt)가 없다 — 비밀번호를 해시할 수 없다')
  return rows[0].nspname
}

async function create() {
  const go = process.argv.includes('--go')
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL })
  await c.connect()
  try {
    const want = ids()
    const emails = want.map((id) => id + DOMAIN)
    const { rows: have } = await c.query('select email from auth.users where email = any($1)', [emails])
    const already = new Set(have.map((r) => r.email))
    const todo = emails.filter((e) => !already.has(e))

    console.log(`참가자 계정 ${emails[0]} ~ ${emails[emails.length - 1]} (${emails.length}개)`)
    console.log(`만들 것 ${todo.length}개 · 이미 있어 건너뜀 ${already.size}개\n`)
    if (!go) {
      console.log(todo.slice(0, 5).join('\n') + (todo.length > 5 ? `\n… 외 ${todo.length - 5}개` : ''))
      console.log('\n보여주기만 했다. 실제로 만들려면 --go 를 붙일 것.')
      return
    }
    if (!todo.length) { console.log('만들 것이 없다.'); return }

    const schema = await cryptSchema(c)
    await c.query('begin')
    /* auth.users 와 auth.identities 를 한 문장으로 같이 넣는다 — 둘 중 하나만 들어가면
       "계정은 있는데 로그인은 안 되는" 상태가 되고, 그게 제일 찾기 어렵다.
       confirmed_at 은 생성 컬럼이라 넣지 않는다(넣으면 거부당한다). */
    const sql = `
      with new_user as (
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          email_change_token_current, phone_change, phone_change_token, reauthentication_token,
          email_change_confirm_status, is_sso_user, is_anonymous
        ) values (
          '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
          $1, ${schema}.crypt($2, ${schema}.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, now(), now(),
          '', '', '', '', '', '', '', '',
          0, false, false
        ) returning id, email
      )
      insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
      select gen_random_uuid(), id, id::text, 'email',
             jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true, 'phone_verified', false),
             now(), now()
      from new_user
      returning user_id`

    let made = 0
    for (const email of todo) {
      await c.query(sql, [email, PASSWORD])
      made++
      if (made % 10 === 0) console.log(`  … ${made}/${todo.length}`)
    }
    await c.query('commit')
    console.log(`\n✅ ${made}개 생성 완료 (비밀번호 ${PASSWORD})`)
    console.log('   로그인 화면에서는 아이디만 입력한다 — 뒤의 @ybm.co.kr 은 앱이 붙인다.')
  } catch (e) {
    await c.query('rollback').catch(() => {})
    throw e
  } finally {
    await c.end()
  }
}

/** 진짜로 로그인이 되는지 — 행을 손으로 넣었으니 실제 로그인까지 확인해야 만든 것이다 */
async function verify() {
  const { createClient } = require('@supabase/supabase-js')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 가 없다')
  for (const id of [`ybm${String(FROM).padStart(2, '0')}`, `ybm${String(TO).padStart(2, '0')}`]) {
    const sb = createClient(url, anon)
    const { data, error } = await sb.auth.signInWithPassword({ email: id + DOMAIN, password: PASSWORD })
    console.log(`${id}${DOMAIN.padEnd(12)} ${error ? '❌ ' + error.message : '✅ 로그인 OK (' + data.user.id.slice(0, 8) + '…)'}`)
    await sb.auth.signOut().catch(() => {})
  }
}

const main = process.argv.includes('--verify') ? verify : create
main().catch((e) => { console.error('\n실패:', e.message); process.exit(1) })
