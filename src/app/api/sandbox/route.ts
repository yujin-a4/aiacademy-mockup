/**
 * 스캐폴딩 실험장 API — docs/rail-editor-plan.md
 *
 * `sandbox` 스키마 전용 표 편집기. **public(정본)에는 어떤 쿼리도 나가지 않는다.**
 * 스키마가 물리적으로 분리돼 있어서, 드래프트 방식에 필요했던 가드(draft_id 검사 등)가
 * 여기서는 필요 없다 — 대신 **표 이름·컬럼 이름을 화이트리스트로 막는다.**
 * (사용자 입력이 SQL 식별자로 들어가므로 이건 SQL 인젝션 방어로 필수다)
 *
 * 문항·지문·강의는 sandbox 에 없다. public 을 참조만 하고 **읽기 전용으로 내보낸다.**
 */
import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
const DB = process.env.SUPABASE_DB_URL

/** 편집 가능한 sandbox 표
 *  pk        : 기본키
 *  editable  : 사람이 고칠 수 있는 컬럼
 *  chain     : 이 표가 화면까지 닿는 경로 — "내가 고치면 어디까지 가나"
 *  uses      : **끝까지 간 영향 수** — 실제 수업에서 몇 턴이 되는지 (x = 이 표의 행)
 *              바로 옆 표만 세면 오해한다. 실측 예: S6 는 변종이 1개뿐인데 실제로는 102턴 돈다.
 *              0 이면 화면에 영향이 없다. 새로 추가하면 항상 0 에서 시작한다.
 *  usesDetail: 그 숫자가 나오기까지의 경로를 숫자로 (예: '변종 3 → 레일 14 → 턴 69')
 *  usesLabel : 최종 숫자가 무엇인지
 */
const TABLES: Record<string, {
  pk: string[]; editable: string[]; title: string; what: string
  chain: string; uses?: string; usesDetail?: string; usesLabel?: string
}> = {
  question_types: {
    pk: ['id'], editable: ['part', 'type_code', 'name', 'description'],
    title: '유형 — 레일이 붙는 자리',
    what: '"파트1 인물·사물 판별" 같은 문제 유형. 레일은 강의가 아니라 여기 붙는다. 새 유형을 만들어도 된다.',
    chain: 'question_types → type_rails(레일) + lecture_items(아이템) → 수업 화면',
    uses: `(select count(*) from sandbox.type_rails t
              join sandbox.lecture_items li on li.question_type_id = t.question_type_id
             where t.question_type_id = x.id)`,
    usesDetail: `'레일 ' || (select count(*) from sandbox.type_rails t where t.question_type_id = x.id)
               || ' × 아이템 ' || (select count(*) from sandbox.lecture_items li where li.question_type_id = x.id)`,
    usesLabel: '이 유형이 실제 수업에서 만드는 턴 수',
  },
  type_rails: {
    pk: ['id'],
    editable: ['question_type_id', 'instructor_code', 'version', 'step_order', 'variant_id',
      'audio_mode', 'script_mode', 'step_label', 'student_prompt_override', 'note'],
    title: '레일 — 수업 단계 순서',
    what: '한 행이 한 단계. step_order 순으로 진행된다. variant_id 가 "이 단계를 어떻게 시킬지"를 가리킨다.',
    chain: 'type_rails → (유형이 같은) lecture_items 마다 한 바퀴씩 → 수업 화면의 턴',
    uses: `(select count(*) from sandbox.lecture_items li where li.question_type_id = x.question_type_id)`,
    usesDetail: `'아이템 ' || (select count(*) from sandbox.lecture_items li
                                where li.question_type_id = x.question_type_id) || '바퀴'`,
    usesLabel: '이 단계가 실제로 도는 횟수 (아이템마다 한 번씩)',
  },
  step_variants: {
    pk: ['id'],
    editable: ['code', 'step_code', 'interaction_code', 'name', 'scope', 'fade_policy', 'min_level', 'student_prompt', 'note'],
    title: '변종 — "이 단계를 어떻게 시킬까"',
    what: '단계(S1)는 하나인데 시키는 방법이 여러 개. 여기서는 같은 (단계×상호작용) 조합도 여러 개 만들 수 있다(정본은 하나만 허용).',
    chain: 'step_variants → type_rails.variant_id 가 고름 → 수업 화면',
    uses: `(select count(*) from sandbox.type_rails t
              join sandbox.lecture_items li on li.question_type_id = t.question_type_id
             where t.variant_id = x.id)`,
    usesDetail: `'레일 ' || (select count(*) from sandbox.type_rails t where t.variant_id = x.id) || '단계'`,
    usesLabel: '이 변종이 실제 수업에서 만드는 턴 수',
  },
  lecture_items: {
    pk: ['id'], editable: ['lecture_id', 'seq', 'question_type_id', 'passage_id', 'phase'],
    title: '아이템 — 레일이 한 바퀴 도는 단위',
    what: 'question_type_id 를 바꾸면 그 문항 묶음이 **다른 유형의 레일로 돈다.** 유형 실험의 핵심.',
    chain: 'lecture_items → question_type_id 로 레일을 고름 → 그 레일이 여기서 한 바퀴 돈다',
    uses: `(select count(*) from sandbox.item_questions iq where iq.item_id = x.id)`,
    usesDetail: `'문항 ' || (select count(*) from sandbox.item_questions iq where iq.item_id = x.id)
               || ' · 레일 ' || (select count(*) from sandbox.type_rails t
                                  where t.question_type_id = x.question_type_id) || '단계'`,
    usesLabel: '이 아이템에 묶인 문항 수',
  },
  item_questions: {
    pk: ['item_id', 'question_id'], editable: ['item_id', 'question_id', 'sub_order'],
    title: '아이템 ↔ 문항 연결',
    what: '어느 아이템이 어느 문항을 쓰는지. question_id 는 public.questions 를 가리킨다(내용은 못 바꾼다).',
    chain: 'item_questions → 아이템이 다룰 문항을 정한다 → 수업 화면에 뜨는 문제',
  },
  step_types: {
    pk: ['code'], editable: ['code', 'name', 'purpose'],
    title: '단계 사전 (S1~S7)',
    what: '스캐폴딩 단계의 뼈대. 여기에 추가만 해서는 화면이 안 바뀐다 — 그 단계를 쓰는 변종을 만들고, 그 변종을 레일이 골라야 비로소 수업에 나온다.',
    chain: 'step_types → step_variants(변종) → type_rails(레일) → 수업 화면',
    uses: `(select count(*) from sandbox.type_rails t
              join sandbox.step_variants v on v.id = t.variant_id
              join sandbox.lecture_items li on li.question_type_id = t.question_type_id
             where v.step_code = x.code)`,
    usesDetail: `'변종 ' || (select count(*) from sandbox.step_variants v where v.step_code = x.code)
               || ' → 레일 ' || (select count(*) from sandbox.type_rails t
                                  join sandbox.step_variants v on v.id = t.variant_id
                                 where v.step_code = x.code) || '단계'`,
    usesLabel: '이 단계가 실제 수업에서 만드는 턴 수',
  },
  interactions: {
    pk: ['code'], editable: ['code', 'label'],
    title: '상호작용 사전',
    what: '⚠️ 여기에 새로 추가해도 **화면이 못 그린다.** 화면이 구현한 8종(mark·choice·match·next·pick_answer·shadow·solve_all·subjective)만 동작한다. 새 상호작용은 React 컴포넌트가 있어야 하므로 개발 영역이다.',
    chain: 'interactions → step_variants(변종) → type_rails(레일) → 수업 화면 (단, 8종만 실제로 그려짐)',
    uses: `(select count(*) from sandbox.type_rails t
              join sandbox.step_variants v on v.id = t.variant_id
              join sandbox.lecture_items li on li.question_type_id = t.question_type_id
             where v.interaction_code = x.code)`,
    usesDetail: `'변종 ' || (select count(*) from sandbox.step_variants v where v.interaction_code = x.code)
               || ' → 레일 ' || (select count(*) from sandbox.type_rails t
                                  join sandbox.step_variants v on v.id = t.variant_id
                                 where v.interaction_code = x.code) || '단계'`,
    usesLabel: '이 상호작용이 실제 수업에서 만드는 턴 수',
  },
}

/** 읽기 전용으로 같이 보여주는 public 표 (내용 원본) */
const READONLY: Record<string, { sql: string; title: string; what: string }> = {
  'public.lectures': { sql: 'select * from public.lectures order by lecture_code', title: '강의 (정본)', what: '읽기 전용. sandbox 의 아이템이 이걸 가리킨다.' },
  'public.questions': { sql: 'select id, question_code, lecture_id, part, question_type_id, passage_id, display_order from public.questions order by question_code', title: '문항 (정본)', what: '읽기 전용. 교재에서 뽑은 실제 문제. content(jsonb)는 길어서 뺐다.' },
  'public.question_options': { sql: 'select * from public.question_options order by question_id, display_order', title: '보기 (정본)', what: '읽기 전용.' },
}

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T | null> {
  if (!DB) return null
  const c = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try { return await fn(c) } finally { await c.end() }
}

const q = (s: string) => `"${s.replace(/"/g, '""')}"`   // 식별자 인용

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') ?? 'tables'
  try {
    const data = await withDb(async (c) => {
      if (action === 'meta') {
        const [v, i, s, qt, l] = await Promise.all([
          c.query(`select id, code, step_code, name, interaction_code from sandbox.step_variants order by step_code, code`),
          c.query(`select code, label from sandbox.interactions order by code`),
          c.query(`select code, name from sandbox.step_types order by code`),
          c.query(`select id, type_code, part from sandbox.question_types order by part, type_code`),
          c.query(`select id, lecture_code from public.lectures order by lecture_code`),
        ])
        return {
          variants: v.rows, interactions: i.rows, stepTypes: s.rows,
          questionTypes: qt.rows, lectures: l.rows,
        }
      }

      /* 유형별 미리보기 목록 — 어떤 유형을 어느 강의로 열어볼 수 있나.
         레일이 없거나(레일 0단계) 문항이 없으면(빈 강의) 열어도 아무것도 안 보인다.
         그 이유를 같이 내줘야 "왜 안 뜨지" 를 안 헤맨다. */
      if (action === 'previews') {
        const { rows } = await c.query(`
          select qt.id, qt.part, qt.type_code, qt.name,
                 (select count(*)::int from sandbox.type_rails t where t.question_type_id = qt.id) rail_steps,
                 (select count(*)::int from sandbox.lecture_items li where li.question_type_id = qt.id) items,
                 -- 레일이 있는 강사 중 lee_doyun 우선
                 coalesce(
                   (select 'lee_doyun' where exists (select 1 from sandbox.type_rails t
                      where t.question_type_id = qt.id and t.instructor_code = 'lee_doyun')),
                   (select t.instructor_code from sandbox.type_rails t
                     where t.question_type_id = qt.id order by t.instructor_code limit 1)
                 ) instructor,
                 -- 문항이 실제로 들어 있는 강의 하나
                 (select l.lecture_code
                    from sandbox.lecture_items li
                    join public.lectures l on l.id = li.lecture_id
                   where li.question_type_id = qt.id and li.phase = 'lesson'
                     and exists (select 1 from sandbox.item_questions iq where iq.item_id = li.id)
                   order by l.lecture_code limit 1) sample_lecture,
                 (select count(*)::int
                    from sandbox.lecture_items li
                    join sandbox.item_questions iq on iq.item_id = li.id
                   where li.question_type_id = qt.id and li.phase = 'lesson') questions
            from sandbox.question_types qt
           order by qt.part, qt.type_code`)
        return { previews: rows }
      }

      const out: Record<string, unknown> = {}
      for (const [name, def] of Object.entries(TABLES)) {
        /* __uses = 이 행을 참조하는 곳의 수. 0 이면 아무도 안 쓴다 = 화면에 영향 없다.
           새로 추가한 행이 왜 화면에 안 나오는지를 이 숫자 하나로 설명할 수 있다. */
        const usesCol = (def.uses ? `, (${def.uses}) as __uses` : '')
          + (def.usesDetail ? `, (${def.usesDetail}) as __uses_detail` : '')
        const { rows } = await c.query(
          `select x.*${usesCol} from sandbox.${q(name)} x order by ${def.pk.map((k) => `x.${q(k)}`).join(', ')}`)
        out[name] = { ...def, rows, editableTable: true }
      }
      for (const [name, def] of Object.entries(READONLY)) {
        const { rows } = await c.query(def.sql)
        out[name] = { ...def, pk: [], editable: [], rows, editableTable: false }
      }
      return { tables: out }
    })
    if (!data) return NextResponse.json({ error: 'DB 미설정' }, { status: 503 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

/* ── 시트 → sandbox 동기화 ──────────────────────────────────────
   구글 시트 "스캐폴딩 입력" 탭이 콘텐츠팀의 입력 폼이다.
   [시트에서 불러오기]가 이걸 호출하면 sandbox 를 시트 내용으로 **통째로 재구성**한다:
     · SC코드마다 sandbox.question_types 한 행 (남는 옛 유형은 정리 — sandbox 는 시트가 정본)
     · 단계 행 → sandbox.type_rails (instructor='common' — 시트에는 강사 구분이 없다)
     · 단계+학생행동 → 변종을 찾고, 없으면 만든다 (sandbox 라 자유)
     · 강의 아이템을 매핑표(H:J)의 파트 기준으로 SC 유형에 재연결
   public(정본)에는 어떤 쓰기도 없다. */

const SPREADSHEET_ID = '1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8'
const INPUT_TAB = '스캐폴딩 입력'

/** 학생행동(한국어 라벨) → interactions.code. 화면이 그릴 수 있는 것만 존재한다.
 *  '따라 말하기'(쉐도잉)는 제품에서 빠져서 목록에 없다 — 시트에 그렇게 적으면 미매칭으로 걸린다. */
const ACTION_TO_CODE: Record<string, string> = {
  '필기로 짚기': 'mark', '보기 고르기': 'choice', '정답 고르기': 'pick_answer',
  '전체 풀기': 'solve_all', '말로 설명': 'subjective',
  '근거 연결': 'match', 'AI 진행': 'next', '': 'next',
}
const STEP_SET = new Set(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', '학생 풀이'])

/* 인증은 **서비스 계정**을 쓴다 (누가 눌러도 되는 버튼이라 개인 계정 토큰이면 안 된다).
   개인 OAuth 리프레시 토큰을 쓰던 시절엔 동의화면이 '테스트' 상태라 7일마다 죽어서,
   어제 되던 버튼이 오늘 invalid_grant 로 실패했다. 서비스 계정은 만료가 없다.
   시트(1EwFDx…)는 아래 계정에 이미 공유돼 있어야 한다:
     vertex-tutor-test@aiacademy-496323.iam.gserviceaccount.com
   배포 = env GOOGLE_SHEETS_SA_KEY (키 JSON 통째로) · 로컬 = gcp-vertex-key.json */
const SHEETS_SCOPE = ['https://www.googleapis.com/auth/spreadsheets.readonly']

function sheetsClient() {
  const raw = process.env.GOOGLE_SHEETS_SA_KEY
  if (raw) {
    return google.sheets({
      version: 'v4',
      auth: new google.auth.GoogleAuth({ credentials: JSON.parse(raw), scopes: SHEETS_SCOPE }),
    })
  }
  const keyFile = path.join(process.cwd(), 'gcp-vertex-key.json')
  if (fs.existsSync(keyFile)) {
    return google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile, scopes: SHEETS_SCOPE }) })
  }
  throw new Error('구글 시트 인증 정보 없음 (env GOOGLE_SHEETS_SA_KEY 또는 gcp-vertex-key.json)')
}

async function syncFromSheet(c: Client) {
  const sheets = sheetsClient()
  const [stepsRes, mapRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `'${INPUT_TAB}'!A2:G300` }),
    /* 매핑표는 I~K. H 는 두 표를 눈으로 갈라 보이게 두는 **빈 구분 열**이다
       (scripts/patch-scaffold-input-tab.js 가 넣는다 — 위치를 바꾸면 여기도 같이 바꿔야 한다) */
    sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `'${INPUT_TAB}'!I2:K30` }),
  ])

  /* 검증 — 틀린 행을 행 번호와 함께 전부 모아 돌려준다 (하나 고치고 또 실패하는 핑퐁 방지) */
  const errors: string[] = []
  interface SheetStep {
    sc: string; order: number; step: string; action: string; audio: string; desc: string
    perQuestion: boolean
  }
  /** [문항별 반복] 열 — 비우면 1회, 아래 표현이면 문항마다 한 번씩 */
  const PER_Q = /^(예|y|yes|o|ㅇ|✓|v|문항별|문항별 반복)$/i
  const rows: SheetStep[] = []
  for (let i = 0; i < (stepsRes.data.values ?? []).length; i++) {
    const r = (stepsRes.data.values ?? [])[i]
    const [sc, order, step, action, audio, desc, perQ] =
      [0, 1, 2, 3, 4, 5, 6].map((k) => String(r[k] ?? '').trim())
    if (!sc && !step) continue                       // 빈 줄
    const line = `${i + 2}행`
    if (!sc) { errors.push(`${line}: SC코드가 비었다`); continue }
    if (!STEP_SET.has(step)) errors.push(`${line}: 단계 "${step}" — S1~S7 또는 "학생 풀이"만 가능`)
    if (action && !(action in ACTION_TO_CODE)) errors.push(`${line}: 학생행동 "${action}" — 드롭다운의 8개만 화면이 그릴 수 있다`)
    if (!Number(order)) errors.push(`${line}: 순서가 숫자가 아니다`)
    if (perQ && !PER_Q.test(perQ)) errors.push(`${line}: 문항별 반복 "${perQ}" — 비우거나 "예"만 가능`)
    rows.push({
      sc: sc.toUpperCase(), order: Number(order), step, action, audio, desc,
      perQuestion: PER_Q.test(perQ),
    })
  }
  const mapping = (mapRes.data.values ?? [])
    .map((r) => ({ sc: String(r[0] ?? '').trim().toUpperCase(), parts: String(r[1] ?? '').trim(), lecture: String(r[2] ?? '').trim() }))
    .filter((m) => /^SC[0-9]+$/.test(m.sc))   // 도움말 등 다른 텍스트가 매핑으로 읽히지 않게
  for (const m of Array.from(new Set(rows.map((r) => r.sc)))) {
    if (!mapping.find((x) => x.sc === m)) errors.push(`매핑표: ${m} 의 파트가 없다 (I열에 추가)`)
  }

  /* 매핑표 검증 — 여기서 조용히 넘어가면 "고쳤는데 화면이 안 바뀐다"가 된다.
     · 파트가 비었거나 숫자가 아니면 그 SC 는 어느 강의도 못 가져간다
     · J열 강의코드가 실제로 없으면(오타·안내문) 그 줄은 아무 일도 안 한다 */
  const { rows: lectureRows } = await c.query(`select lecture_code from public.lectures`)
  const lectureCodes = new Set(lectureRows.map((l: { lecture_code: string }) => l.lecture_code))
  for (const m of mapping) {
    const parts = m.parts.split(',').map((p) => Number(p.trim()))
    if (!m.parts || parts.some((p) => !p || p < 1 || p > 7)) {
      errors.push(`매핑표 ${m.sc}: 파트 "${m.parts}" — 1~7 숫자로 (여러 파트면 "3,4")`)
    }
    if (m.lecture && !lectureCodes.has(m.lecture)) {
      errors.push(`매핑표 ${m.sc}: 강의코드 "${m.lecture}" 가 DB에 없다 — 비우면 그 파트 전체에 적용된다`)
    }
  }
  if (errors.length) return { ok: false, errors }

  /* sandbox 재구성 (트랜잭션) */
  await c.query('begin')
  try {
    await c.query('delete from sandbox.type_rails')

    const scIds = new Map<string, number>()
    for (const m of mapping) {
      const part = Number(m.parts.split(',')[0]) || 0
      const { rows: ex } = await c.query(
        `select id from sandbox.question_types where type_code = $1`, [m.sc])
      if (ex.length) {
        scIds.set(m.sc, ex[0].id)
      } else {
        const { rows: ins } = await c.query(
          `insert into sandbox.question_types (part, type_code, name)
           values ($1, $2, $3) returning id`,
          [part, m.sc, `${m.sc} (P${m.parts})`])
        scIds.set(m.sc, ins[0].id)
      }
    }

    const stepNames: Record<string, string> = {
      S1: '핵심 단서 찾기', S2: '유형·역할 판별', S3: '개념 코칭', S4: '구조·흐름 파악',
      S5: '정답 근거 연결', S6: '오답 제거·진단', S7: '표현 정리·전략 요약', '학생 풀이': '학생 풀이',
    }
    let railCount = 0
    for (const r of rows) {
      const typeId = scIds.get(r.sc)
      if (!typeId) continue
      const stepCode = r.step === '학생 풀이' ? 'S0' : r.step
      const intr = ACTION_TO_CODE[r.action]
      let { rows: v } = await c.query(
        `select id from sandbox.step_variants where step_code = $1 and interaction_code = $2 limit 1`,
        [stepCode, intr])
      if (!v.length) {
        v = (await c.query(
          `insert into sandbox.step_variants (code, step_code, interaction_code, name, scope)
           values ($1, $2, $3, $4, 'item') returning id`,
          [`${stepCode}-${intr}-sheet`, stepCode, intr, `${stepNames[r.step] ?? r.step} · ${r.action || 'AI 진행'}`])).rows
      }
      /* 단계 이름 = "S5 정답 근거 연결" (+ 문항별이면 "(문항별)").
         화면(fromSteps.expandPerQuestion)이 이 표시를 보고 문항 수만큼 펼친다 —
         레일은 유형 단위여서 문항이 몇 개인지 여기서는 알 수 없다. */
      const label = (r.step === '학생 풀이' ? '학생 풀이' : `${r.step} ${stepNames[r.step]}`)
        + (r.perQuestion ? ' (문항별)' : '')
      await c.query(
        `insert into sandbox.type_rails (question_type_id, instructor_code, version, step_order,
           variant_id, audio_mode, step_label, note)
         values ($1, 'common', 1, $2, $3, $4, $5, $6)`,
        [typeId, r.order, v[0].id, r.audio || null, label, r.desc || null])
      railCount++
    }

    // 아이템 재연결 — 강의코드 명시가 우선, 없으면 그 파트의 첫 SC
    const { rows: items } = await c.query(`
      select li.id, l.part, l.lecture_code from sandbox.lecture_items li
      join public.lectures l on l.id = li.lecture_id`)
    let remapped = 0
    for (const it of items) {
      const byLecture = mapping.find((m) => m.lecture === it.lecture_code)
      const byPart = mapping.find((m) => m.parts.split(',').map(Number).includes(Number(it.part)) && !m.lecture)
        ?? mapping.find((m) => m.parts.split(',').map(Number).includes(Number(it.part)))
      const target = byLecture ?? byPart
      if (!target) continue
      await c.query(`update sandbox.lecture_items set question_type_id = $1 where id = $2`,
        [scIds.get(target.sc), it.id])
      remapped++
    }

    // 이제 아무도 안 가리키는 옛 유형 정리 (sandbox 는 시트가 정본이다)
    const { rowCount: removedTypes } = await c.query(`
      delete from sandbox.question_types qt
       where qt.type_code not in (select unnest($1::text[]))
         and not exists (select 1 from sandbox.lecture_items li where li.question_type_id = qt.id)
         and not exists (select 1 from sandbox.type_rails t where t.question_type_id = qt.id)`,
      [Array.from(scIds.keys())])

    /* 레일은 만들었지만 **도는 강의가 없는 SC** — 미리보기를 열어도 빈 화면이다.
       지금 SC8·SC9(2·3지문)가 여기 걸린다. 이유를 알려주지 않으면 "왜 안 뜨지"를 헤맨다. */
    const { rows: idleRows } = await c.query(`
      select qt.type_code from sandbox.question_types qt
       where qt.type_code = any($1::text[])
         and not exists (select 1 from sandbox.lecture_items li where li.question_type_id = qt.id)
       order by qt.type_code`, [Array.from(scIds.keys())])
    const idle: string[] = idleRows.map((r: { type_code: string }) => r.type_code)

    await c.query('commit')
    return { ok: true, sc: scIds.size, steps: railCount, remapped, removedTypes, idle }
  } catch (e) { await c.query('rollback'); throw e }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action: string = body.action

    const data = await withDb(async (c) => {
      if (action === 'syncSheet') return syncFromSheet(c)

      if (action === 'reset') {
        const { rows } = await c.query(`select sandbox.reset() as msg`)
        return { ok: true, msg: rows[0].msg }
      }

      const table: string = body.table
      const def = TABLES[table]
      if (!def) throw new Error(`sandbox 에서 편집할 수 없는 표: ${table}`)

      /* 화이트리스트 밖 컬럼은 통째로 무시한다 — 식별자가 사용자 입력에서 오므로 필수 */
      const clean = (row: Record<string, unknown>) => {
        const out: Record<string, unknown> = {}
        for (const k of def.editable) if (k in row) out[k] = row[k] === '' ? null : row[k]
        return out
      }

      await c.query('begin')
      try {
        let inserted = 0, updated = 0, deleted = 0

        for (const row of (body.deletes ?? []) as Record<string, unknown>[]) {
          const where = def.pk.map((k, i) => `${q(k)} = $${i + 1}`).join(' and ')
          const r = await c.query(`delete from sandbox.${q(table)} where ${where}`, def.pk.map((k) => row[k]))
          deleted += r.rowCount ?? 0
        }

        for (const row of (body.updates ?? []) as Record<string, unknown>[]) {
          const vals = clean(row)
          const keys = Object.keys(vals)
          if (!keys.length) continue
          const set = keys.map((k, i) => `${q(k)} = $${i + 1}`).join(', ')
          const where = def.pk.map((k, i) => `${q(k)} = $${keys.length + i + 1}`).join(' and ')
          const r = await c.query(`update sandbox.${q(table)} set ${set} where ${where}`,
            [...keys.map((k) => vals[k]), ...def.pk.map((k) => row[`__pk_${k}`] ?? row[k])])
          updated += r.rowCount ?? 0
        }

        for (const row of (body.inserts ?? []) as Record<string, unknown>[]) {
          const vals = clean(row)
          const keys = Object.keys(vals).filter((k) => vals[k] !== null && vals[k] !== undefined)
          if (!keys.length) continue
          await c.query(
            `insert into sandbox.${q(table)} (${keys.map(q).join(', ')})
             values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
            keys.map((k) => vals[k]))
          inserted += 1
        }

        await c.query('commit')
        return { ok: true, inserted, updated, deleted }
      } catch (e) { await c.query('rollback'); throw e }
    })
    if (!data) return NextResponse.json({ error: 'DB 미설정' }, { status: 503 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
