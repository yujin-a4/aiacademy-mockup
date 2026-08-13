/* FGI 두 강의의 DB 문항을 JSON 으로 뱉는다 — scripts/audit-fgi.py 가 시트와 대조한다 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true })
const { Client } = require('pg')

const LECTURES = ['LC-P1-01', 'RC-P5-08']

;(async () => {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const { rows } = await c.query(
    `select q.question_code, q.content,
            json_agg(json_build_object('label', o.option_label, 'text', o.option_text,
                                       'correct', o.is_correct) order by o.display_order) as options
       from questions q
       join question_options o on o.question_id = q.id
      where q.lecture_id in (select id from lectures where lecture_code = any($1))
      group by q.id
      order by q.question_code`, [LECTURES])
  await c.end()
  process.stdout.write(JSON.stringify(
    rows.map((r) => ({ code: r.question_code, content: r.content, options: r.options })), null, 0))
})().catch((e) => { console.error(e.message); process.exit(1) })
