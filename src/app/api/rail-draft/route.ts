/**
 * 레일 편집기 서버 라우트 — docs/rail-editor-plan.md STEP 3
 *
 * ── 왜 서버를 거치나 ─────────────────────────────────────────────
 * `type_rails` 는 브라우저(anon 키)에서 쓰기가 막혀 있다(0016:139). 뚫지 않는다.
 * 대신 쓰기 길목을 **여기 하나로** 모은다. 길목이 하나라 아래 가드를 강제할 수 있다.
 *
 * ── 절대 규칙 (계획서 §1) ────────────────────────────────────────
 *   R1  정본(draft_id is null)에 UPDATE·DELETE 를 **하지 않는다.**
 *       → 이 파일의 모든 쓰기 쿼리에 `draft_id = $draftId` 가 반드시 붙는다.
 *   R4  draftId 가 비었거나 정본을 가리키면 **즉시 거부**한다.
 *   R3  문항·지문·보기에는 쓰지 않는다. 이 라우트는 `type_rails`·`rail_drafts` 만 만진다.
 *
 * 위 규칙을 어기는 쿼리를 여기에 추가하지 말 것. 되돌릴 방법이 없어진다.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'

const DB = process.env.SUPABASE_DB_URL

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T | null> {
  if (!DB) return null // 키 없으면 graceful degrade (다른 라우트와 같은 원칙)
  const c = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try { return await fn(c) } finally { await c.end() }
}

/** R4 — 드래프트 네임스페이스가 아니면 어떤 쓰기도 하지 않는다 */
function assertDraft(draftId: unknown): string {
  const id = typeof draftId === 'string' ? draftId.trim() : ''
  if (!id) throw new Error('draftId 가 비었다 — 정본에는 쓸 수 없다')
  if (id.length > 64) throw new Error('draftId 가 너무 길다')
  return id
}

/* ── 읽기 ── */

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') ?? 'list'
  try {
    const data = await withDb(async (c) => {
      if (action === 'meta') {
        const [variants, interactions] = await Promise.all([
          c.query(`select id, code, step_code, name, interaction_code, scope
                     from step_variants order by step_code, code`),
          c.query(`select code, label from interactions order by code`),
        ])
        return { variants: variants.rows, interactions: interactions.rows }
      }

      if (action === 'rails') {
        // 이 드래프트가 담고 있는 (유형 × 강사) 목록 + 미리보기용 강의 코드
        const draftId = assertDraft(req.nextUrl.searchParams.get('draft'))
        const { rows } = await c.query(`
          select tr.question_type_id, qt.type_code, qt.name as type_name, qt.part,
                 tr.instructor_code, count(*)::int as steps,
                 (select l.lecture_code
                    from lecture_items li join lectures l on l.id = li.lecture_id
                   where li.question_type_id = tr.question_type_id and li.phase = 'lesson'
                   order by l.lecture_code limit 1) as sample_lecture
            from type_rails tr
            join question_types qt on qt.id = tr.question_type_id
           where tr.draft_id = $1
           group by 1,2,3,4,5
           order by qt.part, qt.type_code, tr.instructor_code`, [draftId])
        return { rails: rows }
      }

      /* 이 레일이 DB 어디에 붙어 있는가 — 콘텐츠팀이 "내가 바꾸면 어디까지 영향이 가나" 를 보게.
         전부 읽기 전용이다. 편집기가 쓰는 표는 type_rails 하나뿐이다(R3). */
      if (action === 'context') {
        const questionTypeId = Number(req.nextUrl.searchParams.get('type'))
        const [type, items, counts] = await Promise.all([
          c.query(`select id, part, type_code, name, description from question_types where id = $1`,
            [questionTypeId]),
          // 이 유형을 쓰는 아이템 = 레일이 한 바퀴 도는 단위
          c.query(`
            select l.lecture_code, li.phase, li.seq as item_seq, li.passage_id,
                   (select count(*)::int from item_questions iq where iq.item_id = li.id) as question_count,
                   (select string_agg(q.question_code, ', ' order by iq.sub_order)
                      from item_questions iq join questions q on q.id = iq.question_id
                     where iq.item_id = li.id) as question_codes
              from lecture_items li join lectures l on l.id = li.lecture_id
             where li.question_type_id = $1
             order by l.lecture_code, li.phase, li.seq`, [questionTypeId]),
          // 체인 전체 규모 — 이 유형이 걸치는 범위
          c.query(`
            select
              (select count(distinct li.lecture_id)::int from lecture_items li
                where li.question_type_id = $1) as lectures,
              (select count(*)::int from lecture_items li
                where li.question_type_id = $1) as items,
              (select count(*)::int from item_questions iq
                 join lecture_items li on li.id = iq.item_id
                where li.question_type_id = $1) as questions,
              (select count(*)::int from question_options o
                 join item_questions iq on iq.question_id = o.question_id
                 join lecture_items li on li.id = iq.item_id
                where li.question_type_id = $1) as options,
              (select count(distinct li.passage_id)::int from lecture_items li
                where li.question_type_id = $1 and li.passage_id is not null) as passages,
              (select count(*)::int from type_rails t
                where t.question_type_id = $1 and t.draft_id is null) as live_rail_rows`,
            [questionTypeId]),
        ])
        return { type: type.rows[0] ?? null, items: items.rows, counts: counts.rows[0] }
      }

      /* 표 보기 — 이 레일에 얽힌 DB 표들을 **원본 컬럼 그대로** 내준다.
         콘텐츠팀이 DB 관계를 익히려면 가공된 라벨이 아니라 실제 표를 봐야 한다는 요청.
         편집은 type_rails 드래프트 행만(다른 표는 화면에서 읽기 전용으로 그린다). */
      if (action === 'tables') {
        const qt = Number(req.nextUrl.searchParams.get('type'))
        const inst = req.nextUrl.searchParams.get('instructor')
        const draft = req.nextUrl.searchParams.get('draft')

        const q = async (sql: string, params: unknown[] = []) => (await c.query(sql, params)).rows

        return {
          tables: {
            lectures: {
              title: '강의',
              what: '커리큘럼의 강의 한 줄이 한 행. 학생이 "내 학습"에서 누르는 그 단위다.',
              key: 'lecture_code 가 사람이 읽는 이름 (LC-P1-01 = 듣기 파트1 첫 강의)',
              rows: await q(`select distinct l.* from lectures l
                               join lecture_items li on li.lecture_id = l.id
                              where li.question_type_id = $1 order by l.lecture_code`, [qt]),
            },
            lecture_items: {
              title: '아이템 — 레일이 한 바퀴 도는 단위',
              what: '강의 안에서 "문항 한 세트"다. 사진 3장짜리 강의면 3행이 되고, 레일이 3바퀴 돈다.',
              key: 'question_type_id 가 여기 붙어서 **어느 레일로 돌지**를 정한다. phase 는 lesson(수업)/practice(실전)',
              rows: await q(`select li.* from lecture_items li
                              where li.question_type_id = $1
                              order by li.lecture_id, li.phase, li.seq`, [qt]),
            },
            item_questions: {
              title: '아이템 ↔ 문항 연결표',
              what: '어느 아이템이 어느 문항을 쓰는지만 적힌 다리 역할. 내용은 없다.',
              key: 'Part 1·5 는 아이템 1개 = 문항 1개. Part 3·4·6·7 은 지문 하나에 문항 3개라 한 아이템에 여러 행',
              rows: await q(`select iq.* from item_questions iq
                               join lecture_items li on li.id = iq.item_id
                              where li.question_type_id = $1
                              order by iq.item_id, iq.sub_order`, [qt]),
            },
            questions: {
              title: '문항 본체',
              what: '교재에서 뽑아 넣은 실제 문제. 사진 주소·문제문·음원이 여기 있다.',
              key: 'content 는 jsonb — 파트마다 다른 칸(사진 URL, 지문 링크 등)을 한 칸에 몰아 담는다',
              rows: await q(`select distinct q.* from questions q
                               join item_questions iq on iq.question_id = q.id
                               join lecture_items li on li.id = iq.item_id
                              where li.question_type_id = $1 order by q.question_code`, [qt]),
            },
            question_options: {
              title: '보기 (A·B·C·D)',
              what: '문항 하나에 보기 4행. 학생이 고르는 선택지다.',
              key: 'is_correct=true 가 정답. option_explanation 은 왜 오답인지 — 강사가 코칭할 때 인용한다',
              rows: await q(`select distinct o.* from question_options o
                               join item_questions iq on iq.question_id = o.question_id
                               join lecture_items li on li.id = iq.item_id
                              where li.question_type_id = $1
                              order by o.question_id, o.display_order`, [qt]),
            },
            question_types: {
              title: '유형 사전 — 레일이 붙는 자리',
              what: '"파트1 인물·사물 판별" 같은 문제 유형. 레일은 강의가 아니라 여기에 붙는다.',
              key: '그래서 레일 한 벌을 고치면 **이 유형을 쓰는 모든 강의**가 같이 바뀐다',
              rows: await q(`select * from question_types where id = $1`, [qt]),
            },
            type_rails_draft: {
              title: '⭐ 레일 (드래프트) — 지금 편집하는 것',
              what: '수업 단계의 순서. 한 행이 한 단계고, step_order 순서대로 진행된다. '
                + 'S1·S2 같은 단계 코드는 이 표에 없다 — variant_id 가 step_variants 를 가리키고 거기 있다.',
              key: `draft_id='${draft}' 라서 학생 화면에 안 나온다. `
                + '강사 발화 칸은 없다 — 0024 에서 지웠다. 발화는 문항 사실을 보고 LLM 이 매번 만든다',
              rows: await q(`select * from type_rails
                              where draft_id = $1 and question_type_id = $2 and instructor_code = $3
                              order by step_order`, [draft, qt, inst]),
            },
            type_rails_live: {
              title: '레일 (정본) — 지금 학생에게 나가는 것',
              what: '위와 같은 표인데 draft_id 가 NULL 이다. 그 차이 하나로 정본/드래프트가 갈린다.',
              key: '읽기 전용. version 이 여러 개면 **가장 큰 것 한 벌만** 학생에게 나간다',
              rows: await q(`select * from type_rails
                              where draft_id is null and question_type_id = $1 and instructor_code = $2
                              order by version, step_order`, [qt, inst]),
            },
            step_variants: {
              title: '변종 사전 — S1·S2 같은 단계 코드가 여기 있다',
              what: '단계(S1 핵심 단서 찾기)는 하나인데 시키는 방법이 여러 개다. '
                + 'S1-mark(필기로 짚기) / S1-next(AI가 진행) / S1-subjective(말로 설명).',
              key: 'step_code 가 S1·S2… 다. 레일 표에는 이 표의 id 만 적혀 있어서 숫자로만 보인다 — '
                + '레일의 variant_id 를 여기 id 와 맞춰 보면 무슨 단계인지 알 수 있다. 편집기 드롭다운의 20개가 이것',
              rows: await q(`select * from step_variants order by step_code, code`),
            },
            interactions: {
              title: '상호작용 사전 — 학생이 화면에서 할 행동',
              what: 'mark(단어 짚기) · choice(보기 고르기) · subjective(말로 답하기) 등 8종.',
              key: '변종에 딸려 온다 — 변종을 바꾸면 상호작용도 같이 바뀐다. 따로 못 고른다',
              rows: await q(`select * from interactions order by code`),
            },
          },
        }
      }

      if (action === 'steps') {
        const draftId = assertDraft(req.nextUrl.searchParams.get('draft'))
        const { rows } = await c.query(`
          select tr.id, tr.step_order, tr.variant_id, tr.audio_mode, tr.script_mode,
                 tr.step_label, tr.student_prompt_override,
                 v.code as variant_code, v.name as variant_name, i.label as interaction
            from type_rails tr
            left join step_variants v on v.id = tr.variant_id
            left join interactions  i on i.code = v.interaction_code
           where tr.draft_id = $1 and tr.question_type_id = $2 and tr.instructor_code = $3
           order by tr.step_order`,
          [draftId, Number(req.nextUrl.searchParams.get('type')), req.nextUrl.searchParams.get('instructor')])
        return { steps: rows }
      }

      // 기본: 드래프트 목록 + 복사 기준으로 고를 수 있는 강사
      const [drafts, instructors] = await Promise.all([
        c.query(`select d.draft_id, d.title, d.base_instructor, d.created_at, d.promoted_at,
                        (select count(*)::int from type_rails t where t.draft_id = d.draft_id) as steps
                   from rail_drafts d order by d.created_at desc`),
        c.query(`select instructor_code, count(*)::int as steps
                   from type_rails where draft_id is null group by 1 order by 1`),
      ])
      return { drafts: drafts.rows, instructors: instructors.rows }
    })
    if (!data) return NextResponse.json({ error: 'DB 미설정' }, { status: 503 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

/* ── 쓰기 — 전부 드래프트 네임스페이스 안에서만 ── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action: string = body.action
    const draftId = assertDraft(body.draftId) // ★ 모든 쓰기가 이걸 통과해야 한다

    const data = await withDb(async (c) => {
      /* 생성 — 정본 레일을 **통째로 복사**한다. 빈 상태로 시작하지 않는다(계획서 §2). */
      if (action === 'create') {
        const instructor = String(body.instructor || '')
        if (!instructor) throw new Error('기준 강사를 골라야 한다')
        const types: string[] | null = Array.isArray(body.types) && body.types.length ? body.types : null

        await c.query('begin')
        try {
          await c.query(
            `insert into rail_drafts (draft_id, title, base_instructor, note, created_by)
             values ($1,$2,$3,$4,$5) on conflict (draft_id) do nothing`,
            [draftId, String(body.title || `${instructor} 레일 사본`), instructor,
              types ? types.join(',') : '전체', String(body.createdBy || '')])

          // 정본의 **최신 버전만** 복사 (0020 과 같은 규칙)
          const r = await c.query(`
            with latest as (
              select question_type_id, instructor_code, max(version) as version
                from type_rails where draft_id is null and instructor_code = $2 group by 1,2
            )
            insert into type_rails (
              question_type_id, instructor_code, version, step_order, variant_id,
              audio_mode, script_mode, student_prompt_override,
              student_prompt_seed, source_lecture_code, note, step_label, draft_id)
            select tr.question_type_id, tr.instructor_code, tr.version, tr.step_order, tr.variant_id,
                   tr.audio_mode, tr.script_mode, tr.student_prompt_override,
                   tr.student_prompt_seed, tr.source_lecture_code, tr.note,
                   tr.step_label, $1
              from type_rails tr
              join latest l using (question_type_id, instructor_code)
              join question_types qt on qt.id = tr.question_type_id
             where tr.draft_id is null and tr.version = l.version
               and ($3::text[] is null or qt.type_code = any($3::text[]))`,
            [draftId, instructor, types])
          await c.query('commit')
          return { ok: true, copied: r.rowCount }
        } catch (e) { await c.query('rollback'); throw e }
      }

      /* 저장 — 한 (유형 × 강사) 레일을 통째로 교체. **드래프트 행만** 지우고 다시 넣는다. */
      if (action === 'save') {
        const questionTypeId = Number(body.questionTypeId)
        const instructorCode = String(body.instructorCode || '')
        const steps: { variantId: number; audioMode?: string | null; scriptMode?: string | null
          stepLabel?: string | null; studentPromptOverride?: string | null
        }[] = body.steps ?? []
        if (!questionTypeId || !instructorCode) throw new Error('유형·강사가 필요하다')
        if (!steps.length) throw new Error('단계가 하나도 없다 — 빈 레일은 저장하지 않는다')

        await c.query('begin')
        try {
          // 이 드래프트가 쓰던 버전 유지 (없으면 정본 최신)
          const v = await c.query(`
            select coalesce(
              (select max(version) from type_rails
                where draft_id = $1 and question_type_id = $2 and instructor_code = $3),
              (select max(version) from type_rails
                where draft_id is null and question_type_id = $2 and instructor_code = $3),
              1) as version`, [draftId, questionTypeId, instructorCode])
          const version = v.rows[0].version

          // ★ draft_id 조건이 반드시 붙는다 — 정본은 이 쿼리에 걸리지 않는다
          await c.query(
            `delete from type_rails
              where draft_id = $1 and question_type_id = $2 and instructor_code = $3`,
            [draftId, questionTypeId, instructorCode])

          for (let i = 0; i < steps.length; i++) {
            const s = steps[i]
            await c.query(`
              insert into type_rails (question_type_id, instructor_code, version, step_order,
                variant_id, audio_mode, script_mode, step_label,
                student_prompt_override, draft_id)
              values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [questionTypeId, instructorCode, version, i + 1, s.variantId,
                s.audioMode || null, s.scriptMode || null, s.stepLabel || null,
                s.studentPromptOverride || null, draftId])
          }
          await c.query('commit')
          return { ok: true, saved: steps.length }
        } catch (e) { await c.query('rollback'); throw e }
      }

      /* 폐기 — 드래프트만 지운다 */
      if (action === 'delete') {
        await c.query('begin')
        try {
          const a = await c.query('delete from type_rails where draft_id = $1', [draftId])
          await c.query('delete from rail_drafts where draft_id = $1', [draftId])
          await c.query('commit')
          return { ok: true, removed: a.rowCount }
        } catch (e) { await c.query('rollback'); throw e }
      }

      throw new Error(`알 수 없는 action: ${action}`)
    })
    if (!data) return NextResponse.json({ error: 'DB 미설정' }, { status: 503 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
