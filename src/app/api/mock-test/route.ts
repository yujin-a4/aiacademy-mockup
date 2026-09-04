import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * 실전 모의고사 한 회차(LC 100문항 또는 RC 100문항)를 DB에서 읽어 화면에 넘긴다.
 *
 * ── 왜 DB 인가 ──
 * 처음에는 `scripts/dump/*.json` 을 서버에서 직접 읽었다. 로컬에서는 잘 돌지만
 * **그 폴더는 gitignore 다**(`scripts/dump/`, `/public/mock/`). 배포하면 파일이 없어
 * 404 가 나고 화면이 아예 안 열린다. 교재에서 뽑은 저작물이라 커밋할 것도 아니다.
 * 문항은 이미 Supabase 에 들어가 있으므로(0028 · scripts/load-mock-test.js) 그쪽을 읽는다.
 *
 * ── 권한 ──
 * questions·question_options·passages·passage_sentences 는 전부 `read for all` 이라
 * anon 키로 읽힌다(0002 · 0014). service_role 을 쓸 이유가 없다 — 읽기만 하는데
 * 전권 키를 서버에 들고 있을 필요는 없다.
 *
 * 응답 모양은 덤프를 읽던 때와 **같다**. 화면(mock-test/solve)은 안 고쳐도 된다.
 */

interface OptionOut {
  option_label: string
  option_text: string
  is_correct: boolean
  correct_evidence: string | null
  display_order: number
}

interface QuestionOut {
  question_code: string
  part: number
  question_no: number
  passage_code?: string | null
  qtype?: string
  content: Record<string, unknown>
  options: OptionOut[]
}

interface SentenceOut {
  seq: number
  en: string
  ko: string | null
  speaker: string | null
  blank_no: number | null
}

interface PassageOut {
  passage_code: string
  kind: string
  title: string | null
  meta: unknown
  body: unknown
  set_code: string | null
  set_seq: number
  audio_url: string | null
  sentences: SentenceOut[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const SELECT = `
  question_code, part, question_no, content,
  question_options(option_label, option_text, is_correct, correct_evidence, display_order),
  passages(
    passage_code, kind, title, meta, body, set_code, set_seq, audio_url,
    passage_sentences(seq, en, ko, speaker, blank_no)
  )
`

/** 문항 하나가 가리키는 지문. 이중·삼중 지문이면 세트의 첫 지문이다(0027) */
const passageOf = (row: any) => (Array.isArray(row.passages) ? row.passages[0] : row.passages) ?? null

function toPassage(p: any): PassageOut {
  return {
    passage_code: p.passage_code,
    kind: p.kind,
    title: p.title ?? null,
    meta: p.meta ?? null,
    body: p.body ?? null,
    set_code: p.set_code ?? null,
    set_seq: p.set_seq ?? 1,
    audio_url: p.audio_url ?? null,
    sentences: ((p.passage_sentences as any[]) ?? [])
      .map((s) => ({
        seq: s.seq,
        en: s.en,
        ko: s.ko ?? null,
        speaker: s.speaker ?? null,
        blank_no: s.blank_no ?? null,
      }))
      .sort((a, b) => a.seq - b.seq),
  }
}

const BUCKET = 'mock'
/* 시험 한 판이 최대 75분(RC)이다. 넉넉히 4시간 — 이어하기로 돌아와도 그 안에 다시 받는다
   (화면을 다시 열면 이 라우트가 새로 서명해 준다). */
const SIGN_TTL = 60 * 60 * 4

/**
 * `/mock/lc1-t01/x.mp3` → Storage 서명 URL.
 *
 * 왜 서명인가 — 버킷을 공개로 두면 URL 만 알면 누구나 교재 음원을 받아 간다.
 * 비공개로 두고 요청할 때마다 시한부 URL 을 만들어 준다(scripts/upload-mock-media.mjs 참고).
 *
 * 올려두지 않았으면(로컬 개발) **원래 경로를 그대로 돌려준다** — public/mock 에 파일이 있으면
 * 그대로 돌고, 없으면 그때 깨진다. 키가 없을 때 조용히 죽지 않는 것이 이 프로젝트의 방식이다.
 *
 * ── 왜 실패를 같이 내보내나 ──
 * 그 '그때 깨진다' 가 배포에서 **거짓말을 했다**. 서명이 안 되면 `/mock/…` 이 그대로 나가고
 * 그 경로는 배포본에 없어 404 다 — 사진은 안 뜨고, 음원은 `play()` 가 거절돼 화면이
 * `브라우저가 자동재생을 막았습니다` 라고 말한다. 원인은 서버 환경변수인데 학습자는
 * 자기 브라우저를 탓하게 된다. 무엇이 없어서 못 냈는지 화면까지 들려보낸다.
 */
async function signAll(paths: string[]): Promise<{ map: Map<string, string>; error: string | null }> {
  const out = new Map<string, string>()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (paths.length === 0) return { map: out, error: null }
  if (!url || !svc) {
    return {
      map: out,
      error: '서버에 SUPABASE_SERVICE_ROLE_KEY 가 없어 음원·사진 주소를 만들지 못했습니다.',
    }
  }

  // '/mock/lc1-t01/x.mp3' → 'lc1-t01/x.mp3'
  const keys = paths.map((p) => p.replace(/^\/mock\//, ''))
  try {
    const res = await fetch(`${url}/storage/v1/object/sign/${BUCKET}`, {
      method: 'POST',
      headers: { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: keys, expiresIn: SIGN_TTL }),
    })
    if (!res.ok) return { map: out, error: `Storage 서명 요청이 실패했습니다 (${res.status}).` }
    const list = (await res.json()) as { path: string; signedURL: string | null }[]
    list.forEach((r) => {
      if (r.signedURL) out.set(`/mock/${r.path}`, `${url}/storage/v1${r.signedURL}`)
    })
    const missing = paths.length - out.size
    return {
      map: out,
      error: missing > 0 ? `음원·사진 ${missing}개를 Storage 에서 찾지 못했습니다.` : null,
    }
  } catch {
    /* Storage 가 없거나 못 붙어도 화면은 열려야 한다 — 원래 경로로 떨어진다 */
    return { map: out, error: 'Storage 에 연결하지 못했습니다.' }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vol = Number(searchParams.get('vol') || '1')
  const test = Number(searchParams.get('test') || '1')
  const area = (searchParams.get('area') || 'LC').toUpperCase()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return NextResponse.json({ error: 'Supabase 환경변수가 없습니다.' }, { status: 500 })
  }
  const supabase = createClient(url, anon)

  try {
    // 회차 찾기 — (source, book, area, test_no) 가 유일하다 (0028)
    const { data: mt, error: mtErr } = await supabase
      .from('mock_tests')
      .select('id, test_code, title')
      .eq('book', vol)
      .eq('area', area)
      .eq('test_no', test)
      .maybeSingle()

    if (mtErr) throw mtErr
    if (!mt) {
      /* 추출은 20회분 다 끝났지만 적재는 회차마다 따로 한다
         (scripts/load-mock-test.js --vol N --test M --go). 아직 안 넣은 회차다. */
      return NextResponse.json(
        { error: `아직 등록되지 않은 회차입니다: ${area} ${vol}권 TEST ${test}` },
        { status: 404 },
      )
    }

    const { data: rows, error } = await supabase
      .from('questions')
      .select(SELECT)
      .eq('mock_test_id', mt.id)
      .order('question_no')

    if (error) throw error

    const questions: QuestionOut[] = []
    const byCode = new Map<string, PassageOut>()

    for (const row of (rows as any[]) ?? []) {
      const p = passageOf(row)
      if (p && !byCode.has(p.passage_code)) byCode.set(p.passage_code, toPassage(p))

      const content = (row.content ?? {}) as Record<string, unknown>
      questions.push({
        question_code: row.question_code,
        part: row.part,
        question_no: row.question_no,
        passage_code: p?.passage_code ?? null,
        /* 유형(question_type)은 **풀이 중에 보여주지 않는다** — '형용사 어휘' 같은 값은
           사실상 푸는 법을 알려주는 것이라 실전 시험지에 없다. 채점 뒤 오답노트가 쓴다. */
        /* 회차 문항도 파트마다 유형이 다른 칸에 있다 — 한 필드만 보면 P1 오답이 통째로 '미분류'가
           된다. P3·P4 는 아직 유형 칸 자체가 없어 시각 정보 연계만 잡힌다(적재 때 채워야 한다). */
        qtype: /^\s*look at the graphic/i.test(String(content.question_text ?? ''))
          ? '시각 정보 연계'
          : (content.question_type as string) || (content.grammar_point as string)
            || (content.blank_type as string) || (content.photo_type as string) || undefined,
        content,
        options: ((row.question_options as any[]) ?? [])
          .map((o) => ({
            option_label: o.option_label,
            option_text: o.option_text,
            is_correct: !!o.is_correct,
            correct_evidence: o.correct_evidence ?? null,
            display_order: o.display_order ?? 0,
          }))
          .sort((a, b) => a.display_order - b.display_order
            || a.option_label.localeCompare(b.option_label)),
      })
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: `회차는 있는데 문항이 없습니다: ${mt.test_code}` },
        { status: 404 },
      )
    }

    /* 이중·삼중 지문(0027)은 문항이 **첫 지문만** 가리킨다. 나머지는 같은 set_code 로 묶여
       있을 뿐이라 위 조회에 안 딸려 온다 — 한 번 더 읽어 채운다. */
    const setCodes = Array.from(new Set(
      Array.from(byCode.values()).map((p) => p.set_code).filter((c): c is string => !!c),
    ))
    if (setCodes.length) {
      const { data: more } = await supabase
        .from('passages')
        .select(`
          passage_code, kind, title, meta, body, set_code, set_seq, audio_url,
          passage_sentences(seq, en, ko, speaker, blank_no)
        `)
        .in('set_code', setCodes)
      for (const p of (more as any[]) ?? []) {
        if (!byCode.has(p.passage_code)) byCode.set(p.passage_code, toPassage(p))
      }
    }

    const passages = Array.from(byCode.values())
      .sort((a, b) => a.passage_code.localeCompare(b.passage_code) || a.set_seq - b.set_seq)

    /* DB 에는 `/mock/lc1-t01/…` 라는 **로컬 경로**가 들어 있다(적재할 때 그렇게 넣었다).
       배포에는 그 폴더가 없으므로(gitignore) Storage 서명 URL 로 바꿔 내보낸다. */
    const media = [
      ...questions.map((q) => q.content.audio_url as string | undefined),
      ...questions.map((q) => q.content.image_url as string | undefined),
      ...passages.map((p) => p.audio_url ?? undefined),
    ].filter((u): u is string => !!u && u.startsWith('/mock/'))

    const { map: signed, error: mediaError } = await signAll(Array.from(new Set(media)))
    if (signed.size) {
      for (const q of questions) {
        for (const k of ['audio_url', 'image_url'] as const) {
          const v = q.content[k] as string | undefined
          if (v && signed.has(v)) q.content[k] = signed.get(v)
        }
      }
      for (const p of passages) {
        if (p.audio_url && signed.has(p.audio_url)) p.audio_url = signed.get(p.audio_url)!
      }
    }

    return NextResponse.json({
      area, test_code: mt.test_code, title: mt.title, questions, passages,
      /* 화면이 이걸 띄운다. null 이면 다 정상이다 */
      mediaError,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? '시험 데이터를 불러오지 못했습니다.' }, { status: 500 })
  }
}
