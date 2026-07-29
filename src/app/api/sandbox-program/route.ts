/**
 * sandbox 진행표 읽기 — `/lecture/[code]?sandbox=1` 미리보기용.
 *
 * `sandbox` 스키마는 브라우저(anon)에 열려 있지 않다(0025 에서 revoke).
 * 그래서 supabase 클라이언트로 직접 못 읽고, 이 서버 라우트가 대신 읽어준다.
 * **읽기 전용이다** — 이 라우트에 쓰기를 추가하지 말 것(편집은 /api/sandbox).
 */
import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'
const DB = process.env.SUPABASE_DB_URL

export async function GET(req: NextRequest) {
  if (!DB) return NextResponse.json({ error: 'DB 미설정' }, { status: 503 })
  const p = req.nextUrl.searchParams
  const lecture = p.get('lecture') ?? ''
  const instructor = p.get('instructor') ?? 'common'
  const phase = p.get('phase') === 'practice' ? 'practice' : 'lesson'
  if (!lecture) return NextResponse.json({ rows: [] })

  const c = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try {
    const sql = `
      select item_seq, occurrence, type_code, question_type_id, questions, instructor_code,
             rail_source, step_order, step_code, interaction, audio_mode, script_mode,
             student_prompt, section, fixed_rule, db_fields, variant_code, variant_id
        from sandbox.v_lecture_program
       where lecture_code = $1 and phase = $2 and instructor_code = $3
       order by item_seq, step_order`
    let { rows } = await c.query(sql, [lecture, phase, instructor])
    // 해당 강사 레일이 없으면 common 으로 (정본 화면과 같은 폴백 규칙)
    if (!rows.length && instructor !== 'common') {
      rows = (await c.query(sql, [lecture, phase, 'common'])).rows
    }
    return NextResponse.json({ rows })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  } finally { await c.end() }
}
