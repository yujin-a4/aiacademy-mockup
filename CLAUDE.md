# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> A **map, not a manual.** Keep it under ~200 lines. Point to where detail lives (`docs/`, the
> referenced source files); don't re-explain it here. This file is human-reviewed — don't bloat it.

## 1. Project overview

A **mockup / prototype** of "YBM AI 어학원" — an AI TOEIC tutoring app that recreates star instructors
as AI tutors. UI/UX and interaction prototype, **not production code**: most "AI" is hardcoded scenario
data, in-memory state, and per-route API stubs. The canonical product spec lives in the external
**manyfast** project, not here — treat local files as exploratory, never final.

**Where this fits in the roadmap:** this repo *is* the **pre-validation demo**. Timeline (confirmed 09-22):
a small 5-person **FGI** already ran in 09; the real one is **50 participants in 10월**; a public **R&D
intro page** opens on the YBM corporate site **11/02** (concept + live AI-human 박혜원 + a one-cycle
lesson trial); **open beta 2027-03**. The old ~300-user MVP1 pilot targeting Dec is **gone** — don't
plan around it. Dev partner **캐치잇** (YBM = client/발주) builds the actual product based on this mockup.
Core hypotheses: **H3** (scaffolding actually works) and **H2** (human-instructor-persona acceptance).
Implication for how to work here: **polish and fidelity in the flows a participant will actually click
through matter more than backend robustness or scalability** — this is a demo built to validate product
hypotheses, not infrastructure meant to be extended as-is. From 11/02 the intro-page trial is clicked by
**strangers with no facilitator**, so that flow also has to survive PC visitors and denied mic permission.

- **Stack:** Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind · Zustand.
- **Language:** Korean — UI copy, comments, and scenario scripts are all in Korean.
- **No server DB.** Firebase is a dependency but state is client-side / in-memory only.
- Path alias `@/*` → `src/*`.

## 2. Build & test commands

```bash
npm run dev      # local development
npm run build    # ⭐ build + typecheck gate (strict TS, noEmit) — the de-facto test
npm run lint     # next lint
```

There is **no test suite.** `npm run build` is the correctness check — strict TS fails the build on
bad data/types. **Run it after any non-trivial data or type change** before considering work done.

## 3. Navigation (where things live)

| Need to touch… | Go to |
|---|---|
| **Supabase DB / 스캐폴딩 구조** (스키마·레일·문항) | **`docs/db-restructure-plan.md`** (read first — 용어·재설계 계획·인수인계), `docs/db-audit-0728.md` (실측 진단) |
| Lesson/quiz **content** (scripts, branches, choices) | `src/data/*Scenario.ts`, `src/data/tutorContent.ts`, `vocaData.ts`, `rcData.ts` |
| The **engine** that plays scenarios | `src/components/lesson/LessonRouter.tsx`, `src/components/part7/*Screen.tsx` |
| Live AI voice tutor design | **`docs/tutor-engine.md`** (read first), `src/app/api/tutor/route.ts` |
| **강사가 화면과 어긋난 말을 함** (LLM 통제·단계 게이트·페이싱) | **`docs/tutor-control-plan.md`** (진행 중 — 이어가기 지점 §5), `src/data/typeLearning/stageGate.ts` |
| Audio/video playback | `src/lib/tts.ts` (global singleton) |
| STT answer → branch matching | `src/lib/matchBranch.ts` |
| Server API stubs (keys off client) | `src/app/api/{tutor,tts,gemini,vision,advice}/route.ts` |
| Per-domain UI/session state | `src/store/*.ts` (Zustand, one store per domain) |
| Instructor persona data/copy | `src/data/instructorData.ts` |
| Design tokens & dashboard redesign brief | `tailwind.config.ts`, `DESIGN_SYSTEM.md` |
| Product requirements | `YBM_AI_어학원_PRD_v2.md`, `docs/learning-types.md` |
| **답을 기다리는 결정** (고르지 말고 쌓는 곳) | **`docs/DECISIONS.md`** — 세션 시작할 때 먼저 읽는다 |
| 화면이 어제와 달라졌는지 검사 | `npm run smoke` (`scripts/smoke.mjs`), 기준은 `tests/smoke/baselines/` |

## 4. Architecture in brief

- **Scenario-driven screens (dominant pattern):** most learning screens are state machines that play a
  hardcoded list of "turns" from `src/data/*Scenario.ts` — each turn has a `script`, an `inputType`
  (`voice|draw|choice|button|none`), and branching fields. To add/change a lesson, **edit the data,
  not the engine.** Canonical `LessonTurn` shape is in `lessonScenario.ts`.
- **Live AI tutor (the one real exception):** `/part7-convai` uses ElevenLabs voice with a hybrid split
  — **backend = brain** (rail/grading/hints/Fading in `api/tutor`), **agent = mouth** (renders
  directives, invents nothing), **client = relay**. Full design in `docs/tutor-engine.md`.
- **API routes:** thin server-only proxies; all **degrade gracefully when env keys are absent**
  (e.g. `/api/tts` → `{ useNativeTts: true }`).
- **`part7` / `part7-ai` / `part7-convai` / `part7-typecast`** are intentional **parallel variants** of
  the same screen exploring different approaches.

## 5. Coding rules

- **⭐ 목표 기기 = 태블릿 웹앱, 그리고 거기서 끝이 아니다.** FGI 는 **갤럭시탭 + 크롬**(홈화면에
  깐 웹앱)으로 돌린다. 그러나 기준은 **iOS·안드로이드의 모든 브라우저 웹앱 + PC** 가 다 도는 것.
  한 바퀴가 아니라 범위다 — 하나만 돌게 만드는 분기를 짜지 말 것. 구체적으로:
  손가락 크기의 탭 목표(≥ 44px) · hover 에만 있는 기능 금지(터치엔 hover 가 없다) · 오디오/마이크는
  사용자 제스처 다음에만 열린다(iOS·크롬 모두 자동재생 차단) · STT 는 기기마다 길이 다르다 —
  크롬은 `webkitSpeechRecognition`, **iOS 웹앱에는 그게 없어서** 서버 전사로 돌아간다(`preferServerStt`);
  둘 중 하나만 손보면 나머지 기기가 조용히 죽는다 · 레이아웃은 가로(태블릿) 기준, PC·폰은 그에
  맞추는 쪽 · 검증도 데스크톱 브라우저만 보지 말 것(`docs/screens/` 기기 기준 = iPad Air 가로).
- Browser-facing screens are `'use client'`; audio/STT/canvas APIs are used directly.
- Always route audio through `src/lib/tts.ts`; call `stopCurrentAudio()` on screen exit.
- Keep persona ids (`driller`/`mentor`/`realist`, `park`/`jang`/`kim`/`p6tutor`) consistent across
  `api/tts`, `api/gemini`, and `instructorData.ts` when adding one.
- API keys are server-side only; never read them in a client component. Check the relevant `route.ts`
  for which env vars it expects.

## 6. Do NOT

- **Don't refactor the `part7*` variants into shared code** — the duplication is deliberate.
- **Don't unify the two color generations** (v2 `primary/accent/…` vs legacy `ybm-*`/`cr-*`) blindly.
- **Don't do large unrequested refactors.** This is a throwaway prototype; prefer the smallest change.
- **Don't treat local files as the source of truth** — the spec is the external manyfast project.
- **Don't commit secrets** (`client_secret_*.json`, `.env*`) or touch gitignored working material
  (`reference/`, `scripts/`, `kb/`, `*.xlsx`, `gen_excel.py`).
