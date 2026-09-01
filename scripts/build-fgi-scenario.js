/**
 * FGI 시연 대본 → 수업 턴 — 시트 대본 탭 → src/data/typeLearning/fgiScenario.ts
 *
 * 왜 코드가 아니라 생성기인가
 *   시연 강의는 **강사가 할 말을 대본으로 다 정해 둔다.** 평소 수업은 레일(단계)만 DB 에 두고
 *   발화는 LLM 이 만드는데, 시연에서는 그 자유도가 위험이다(docs/tutor-control-plan.md §6 D단계).
 *   대본은 시트가 정본이라 손으로 옮기지 않고 여기서 뽑아 쓴다 — 시트가 바뀌면 다시 돌리면 된다.
 *
 * **강사마다 대본이 다르다.** 같은 문항·같은 S코드라도 짚는 순서와 시키는 방식이 갈린다
 *   (윤다은은 S1 에서 2지선다로 먼저 좁히고, 이도윤은 바로 말하게 한다). 그래서 출력은
 *   `강사 → 강의코드 → 대본` 두 겹이다. 강사 축이 없으면 누구를 골라도 같은 수업이 나온다.
 *
 * 시트 구조 (한 문항 = 한 블록)
 *   유형 학습 N | 실전 N          ← 블록 머리
 *   ID: YBM_LC1_T06_Q001         ← 교재 문항코드 (우리 코드가 아니다. 대조용)
 *   사진: … / 정답: B. …          ← 있으면 읽고 없으면 만다
 *   단계 | 강사 진행 | 학생 방식 | 학생 예시 답변    ← 표 머리(열 위치는 이 줄에서 찾는다)
 *
 *   강사마다 표 머리 낱말이 다르다(`스캐폴딩`/`AI 강사`/`학생 답변 방식`…) → 이름으로 찾는다.
 *
 * 학생 방식 → 화면 상호작용
 *   2·3지 선다 → choice   말하기·음성 → subjective   A~D·선택형 → pickAnswer
 *   O/X → choice(맞아요/아니에요)   듣기·'-' → next
 *
 * 2지선다는 시트에 보기가 따로 없다 — 강사 발화에서 뽑는다. 세 가지 꼴을 안다.
 *   "A와 B 중에서" · "A일까요, B일까요?" · "① A ② B 중 어느 쪽?"
 * 못 뽑으면 그 턴은 **말하기로 낮춘다**(엉뚱한 두 버튼을 세우는 것보다 낫다). 뽑은 결과는
 * 아래 출력에 다 찍히므로 눈으로 확인할 것.
 *
 * 수업(유형 학습)과 실전은 **가는 곳이 다르다**
 *   유형 학습 → turns   : 스캐폴딩 수업. 문항을 강사와 같이 푼다
 *   실전       → review : 학생이 혼자 다 푼 뒤, 문항마다 보기를 하나씩 짚는 코칭
 *   실전 대본에는 정답 고르기 턴이 없다 — 이미 풀고 온 자리라 다시 고를 것이 없다.
 *
 * 사용
 *   python scripts/fetch_sheet.py 1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8
 *   node scripts/build-fgi-scenario.js          # 무엇이 만들어지는지 보여주기만
 *   node scripts/build-fgi-scenario.js --go     # 파일 쓰기
 */
const fs = require('fs')
const path = require('path')

const DUMP = path.join(__dirname, 'sheet_dump.json')
const OUT = path.join(__dirname, '..', 'src', 'data', 'typeLearning', 'fgiScenario.ts')

/* 대본 탭 목록. 콘텐츠팀이 탭 이름을 바꾸므로(시트66 → 파트1_윤다은 → FGI_윤다은) 여기만 고치면 된다.
   미완성 대본은 올리지 않는다 — 반쯤 빈 대본이 붙으면 강사가 중간에 말을 잃는다(`skipPractice` 참고).

   **한 탭에 강의가 둘 있다. 다만 나뉜 방향이 강사마다 다르다.**
     · FGI_윤다은  — 위아래. 'LC 1강 …' / 'RC 24강 …' 제목 줄로 나뉜다  → `section`
     · FGI_이도윤  — 좌우.   왼쪽 c0~c7 = LC 1강, 오른쪽 c8~ = RC 24강 → `range` */
/* ⚠️ 2026-09-01 — 대본이 **간결본으로 통째 교체**됐다(콘텐츠 파트). 옛 탭은 시트에 남아
   있지만 더 이상 읽지 않는다 — 'FGI_윤다은', 'FGI_이도윤'. 되돌릴 일이 생기면 이름만 바꾸면 된다. */
const SOURCES = [
  { instructor: 'yun_daeun', lecture: 'LC-P1-01', tab: 'FGI_윤다은_간결', section: /^LC\s*1강/ },
  { instructor: 'yun_daeun', lecture: 'RC-P5-08', tab: 'FGI_윤다은_간결', section: /^RC\s*24강/ },
  /* 이도윤 — 같은 문항, 다른 대본. 표 모양도 윤다은 탭과 다르다:
       · 도입이 '화면 텍스트 | AI 강사 대사' 두 칸이다 — 화면 텍스트가 곧 '오늘 배울 내용'.
       · 본편 사이에 곁가지가 섞여 있다('유형 학습 3 → 실전 문제 버전' = 시간 없을 때 쓰는 대체본,
         '실전 문제로 넘어갈 때 멘트'). parse 가 홀로 선 제목 줄에서 블록을 닫아 걸러낸다. */
  /* ⚠️ 열 자리는 개정마다 밀린다. 08-13 최종본에서 한 칸씩 옮겨갔다(왼쪽 c0→c1, 오른쪽 c8→c9).
     "블록을 하나도 못 찾는다" 는 대개 이것 — 덤프를 열어 제목이 몇 번째 열인지 먼저 볼 것. */
  { instructor: 'lee_doyun', lecture: 'LC-P1-01', tab: 'FGI_이도윤 (간략버전)', range: [1, 9] },
  { instructor: 'lee_doyun', lecture: 'RC-P5-08', tab: 'FGI_이도윤 (간략버전)', range: [9] },
]

const go = process.argv.includes('--go')
/* --json — 만들어진 대본을 JSON 으로만 뱉는다(검수 스크립트 audit-fgi.py 가 읽는다).
   생성기가 정본이므로 만들어진 .ts 를 다시 파싱하지 않고 여기서 바로 받아 가게 한다. */
const asJson = process.argv.includes('--json')
if (asJson) console.log = () => {}

const clean = (s) => String(s ?? '')
  /* 시트 대본은 통째로 겹따옴표(“ ”)로 감싸여 있다 — 낭독되는 문장이라 벗긴다.
     문자 클래스에 직접 적으면 파일 인코딩에 따라 안 잡히므로 유니코드 이스케이프로 적는다. */
  .replace(/[“”″]/g, '')
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ')
  /* 맞장구 띄어쓰기를 한 벌로 — 시트가 "잘 했어요" 로 쓴 줄이 있다(이도윤 4곳).
     화면은 다음 대본이 맞장구로 시작하면 앱 맞장구를 비켜서는데(ACK_OPENER), 규칙 쪽은
     공백을 허용해 두었지만 **읽히는 말 자체도 한 벌이어야** 한다 — 강사가 어떤 줄에서는
     "잘 했어요", 어떤 줄에서는 "잘했어요" 라고 하면 같은 사람 말로 안 들린다. */
  .replace(/잘\s+했어요/g, '잘했어요')
  .replace(/맞\s+아요/g, '맞아요')
  .replace(/좋\s+아요/g, '좋아요')
  .replace(/^"|"$/g, '')
  .trim()

/** 시트의 학생 방식 낱말을 한 벌로 모은다 — 강사마다, 그리고 개정마다 다르게 적는다.
 *
 *  ⚠️ **O/X 를 2지선다보다 먼저 본다.** 시트가 `2지선다(O/X)` 라고 적는다 — 순서를 바꾸면
 *  맞아요/아니에요 자리에 엉뚱한 두 갈래를 뽑으려다 실패해서 말하기로 떨어진다(실측). */
function normMode(raw) {
  const m = clean(raw).replace(/\s/g, '').toUpperCase()
  if (!m || m === '-' || m === '–' || m === '—') return '듣기'
  if (m.includes('O/X') || m.includes('OX')) return 'O/X'
  /* **몇 갈래인지는 시트가 정한다.** 08-19 최종본에서 '3지 선다' 가 6줄 들어왔다(이도윤).
     숫자를 박아 두면 새 갈래 수를 만났을 때 조용히 듣기로 떨어지고, 학생은 답할 자리를 잃은 채
     바로 뒤 '(정답)/(오답)' 줄만 듣는다(실측). 그래서 N 을 가리지 않고 받는다. */
  if (/[0-9]지선다/.test(m) || m.includes('양자')) return '선다'
  if (m.includes('A~D') || m.includes('A-D') || m.includes('선택형')) return 'A~D'
  if (m.includes('말하기') || m.includes('음성') || m.includes('주관')) return '말하기'
  /* 시험지에 동그라미·밑줄을 치게 하는 자리. 이도윤은 '필기', 윤다은은 '표시' 라고 적는다 */
  if (m.includes('표시') || m.includes('필기') || m.includes('마킹')) return '표시'
  return '듣기'
}

/** 방식 칸에 선택지가 **그대로 적혀 있는** 꼴 — "2지선다 / 1) 표준화하는 쪽 2) 표준화되는 대상".
 *  강사 발화에서 뽑아내는 것(twoChoices)보다 훨씬 정확하다. 있으면 이쪽을 먼저 쓴다. */
function modeChoices(raw) {
  const s = clean(raw)
  const parts = s.split(/\s*[1-9]\)\s*/).slice(1)   // 앞머리('2지선다 /')는 버린다
  if (parts.length < 2) return null
  /* 강사마다 사이 기호가 다르다 — "1) 표준화하는 주체 / 2) 표준화되는 대상" 처럼 슬래시로 잇는
     사람이 있어서, 앞 선택지 꼬리에 그 기호가 남는다. 떼지 않으면 버튼에 '주체 /' 라고 찍힌다. */
  return parts.map((p) => clean(p).replace(/[\/·|,]\s*$/, '')).filter(Boolean)
}

/** 예시 답변이 **어느 선택지인가**.
 *  번호로 적는 것이 보통이지만("2) 표준화되는 대상") 번호 없이 답만 적은 줄도 있다("변경되는 대상")
 *  — 그때는 글자로 맞춰 본다. 못 찾으면 -1 을 돌려 정답 표시 없이 둔다(둘 다 받아준다). */
function pickedIndex(sample, choices) {
  const s = clean(sample)
  const m = /^\s*([1-9])\)/.exec(s)
  if (m) return Number(m[1]) - 1
  const ans = s.replace(/[.?!]$/, '')
  if (!ans || !choices) return -1
  return choices.findIndex((c) => c === ans || c.includes(ans) || ans.includes(c))
}

/** '표시' 턴의 예시 답변 → 시험지에서 짚어야 할 낱말.
 *    "are 동그라미" · "by any user 밑줄" · "The layout 또는 layout 동그라미" · "yesterday"
 *
 *  '동그라미'·'밑줄' 은 **무엇을 하라는 말**이지 짚을 낱말이 아니다 — 떼고 남은 것만 목표로 삼는다.
 *
 *  ⚠️ '또는' 은 **둘 중 아무거나**인데, 화면은 목표 낱말을 **전부** 짚어야 완료로 본다
 *  (ContentView.targetTokens 가 낱말을 한 집합으로 합친다). 그래서 둘 다 목표로 올리면
 *  더 긴 쪽까지 짚어야 넘어가진다 — 아무거나 되는 자리에서 학생이 갇힌다.
 *  → **가장 짧은 쪽**만 목표로 삼는다. 긴 쪽을 짚어도 그 안에 들어 있어 같이 완료된다.
 *  (덤으로 "Mr. Stepp's duties" 같은 아포스트로피 낱말을 피한다 — 시트의 ' 와 교재의 ’ 가
 *   서로 다른 글자라 정규화 뒤에도 안 맞는다) */
function markTargets(raw, tutor, nextTutor) {
  const s = clean(raw).replace(/\s*(동그라미|밑줄|하이라이트|표시|치기|하기)\s*/g, ' ')
  const alts = s.split(/\s*또는\s*/).map(clean).filter((x) => x && x !== '-' && x !== '–')
  if (alts.length) return [alts.reduce((a, b) => (b.length < a.length ? b : a))]

  /* ── 예시 답변에 낱말이 없으면 **발화에서 찾는다** ──
     시트가 "동그라미 표시" 라고만 적어 둔 줄이 있다. 그대로 두면 짚을 것이 없어 그 턴이
     '듣기'로 떨어지고, 강사는 "동그라미 쳐보세요" 라고 해놓고 화면은 그냥 넘어간다(실측).
     짚을 낱말은 대개 말 안에 있다:
       "빈칸 앞에 **that**에 동그라미 치세요"        → 이 턴 발화에서
       "빈칸 바로 앞에 뭐가 나오죠? 동그라미 쳐보세요" → 되묻는 꼴이라 **다음 턴**이 답을 말한다
                                                       ("잘했어요. **are**이 있죠?") */
  const inLine = /([A-Za-z][A-Za-z'’\- ]*[A-Za-z]|[A-Za-z])\s*(?:에|을|를)?\s*(?:동그라미|밑줄)/.exec(clean(tutor))
  if (inLine) return [clean(inLine[1])]
  if (/뭐가?\s*(나오|있)|어떤 (말|단어|표현)/.test(clean(tutor))) {
    const ans = /(?:^|[.!?]\s*)[^.!?]*?([A-Za-z][A-Za-z'’\-]*)\s*(?:이|가|은|는)?\s*(?:있|나오)/.exec(clean(nextTutor || ''))
    if (ans) return [clean(ans[1])]
  }
  return []
}

/** 예시 답변 칸 → [첫 답, …나머지]. 한 칸에 '-' 로 여러 답이 나열돼 있는 경우가 있다
 *  ("-옷들이 옷걸이에 걸려 있어요 -모자가 벽에 걸려 있어요").
 *
 *  ⚠️ 붙임표를 무조건 자르면 안 된다 — **답 안에도 붙임표가 있다**: "be + -ing 진행형".
 *  그렇게 자르면 첫 답이 "be +" 가 되고, 강사가 "이렇게 답하면 돼요. be +" 라고 말한다(실측).
 *  목록 표시는 뒤에 **한글**이 바로 붙는다("-옷들이"). 영어·기호가 오면 목록이 아니라 답의 일부다. */
function samples(raw) {
  const s = clean(raw)
  if (!s || s === '-' || s === '–') return []
  return s.split(/(?:^|\s)[-·](?=[가-힣])\s*/).map((x) => clean(x)).filter(Boolean)
}

/** 두 갈래의 낱말 수를 맞춘다 — "이번 사진도 사람이 중심인 사진" / "사물이 중심인 사진" 처럼
 *  왼쪽에 앞 문장이 딸려 오는 경우가 있다. 긴 쪽을 앞에서 잘라 짝을 맞춘다. */
function alignPair(a, b) {
  const wa = a.split(' ')
  const wb = b.split(' ')
  if (wa.length > wb.length) return [wa.slice(wa.length - wb.length).join(' '), b]
  if (wb.length > wa.length) return [a, wb.slice(wb.length - wa.length).join(' ')]
  return [a, b]
}

/** 강사 발화에서 두 갈래를 뽑는다 (세 가지 꼴) */
function twoChoices(tutor, sample) {
  const t = clean(tutor)
  let a = null
  let b = null

  /* ① … ② … 중 — 콘텐츠팀이 번호로 적은 꼴 */
  let m = /①\s*([^②]{2,45}?)\s*②\s*([^?]{2,45}?)\s*중/.exec(t)
  if (m) { a = m[1]; b = m[2] }
  /* A인가요, 아니면 B인가요? — 왼쪽 갈래는 **문장 경계를 넘지 않는다**(마침표·따옴표 금지).
     허용하면 앞 문장까지 통째로 딸려온다(실측: "이번 사진은 상태 표현을 …" 이 선택지가 됐다). */
  if (!a) { m = /([^,.?"]{2,45}?)인가요[,\s]*(?:아니면\s*)?([^.?"]{2,45}?)인가요/.exec(t); if (m) { a = m[1]; b = m[2] } }
  /* A일까요, B일까요? */
  if (!a) { m = /([^,.?"]{2,45}?)일까요[,\s]*(?:아니면\s*)?([^.?"]{2,45}?)일까요/.exec(t); if (m) { a = m[1]; b = m[2] } }
  /* A와 B 중(에서) */
  if (!a) { m = /([^\s,]+)(?:과|와)\s+([^\s,]+)\s*중(?:에서)?/.exec(t); if (m) { a = m[1]; b = m[2] } }
  if (!a || !b) return null

  const norm = (s) => clean(s).replace(/^(지금|이미|그|저)\s+/, '').replace(/[.?!]$/, '')
  const opts = alignPair(norm(a), norm(b))
  /* 예시 답변이 어느 쪽인지로 정답을 정한다 — 답이 안 맞으면 정답 표시 없이 둔다(둘 다 받아준다) */
  const ans = clean(sample)
    .replace(/^[①②]\s*/, '')
    .replace(/[.?!]$/, '')
    .replace(/(이에요|예요|요)$/, '')
  const hit = opts.findIndex((o) => ans && (o.includes(ans) || ans.includes(o)))
  return opts.map((text, i) => (hit >= 0 && i === hit ? { text, correct: true } : { text }))
}

/** 강사 발화에서 학생에게 던지는 질문만 뽑는다 — 선택지 카드의 제목이 된다 */
function askOf(tutor) {
  const t = clean(tutor)
  const qs = t.split(/(?<=[?])\s*/).filter((s) => s.trim().endsWith('?'))
  return qs.length ? clean(qs[qs.length - 1]) : t
}

/** 표 머리 줄에서 열 위치를 찾는다 — 강사마다, 개정마다 낱말이 다르다.
 *  ('수정 추천 대사' 는 콘텐츠팀이 한 블록만 고쳐 쓰다 남긴 머리말이다 — 뜻은 '강사 대사'와 같다) */
const HEADER_TUTOR = ['강사 진행', 'AI 강사 대사', 'AI 강사', '강사 대사', '수정 추천 대사']
function columnsOf(row) {
  const cells = (row || []).map((c) => clean(c))
  const find = (...names) => cells.findIndex((c) => names.some((n) => c.includes(n)))
  const stage = find('단계', '스캐폴딩')
  const tutor = find(...HEADER_TUTOR)
  const mode = find('학생 방식', '학생 답변 방식', '학생 인터랙션')
  /* 예시 답변 열은 '학생' 으로 시작하는 것이 여럿이라 **방식 열 뒤**에서 찾는다.
     ⚠️ 이름이 개정마다 바뀐다 — 08-20 에 이도윤 탭이 '학생 …' → '정답' 으로 바꿨고(구현 중 메모 8행),
        그 순간 이 열을 못 찾아 **정답 정보가 통째로 비었다.** 빈 채로도 빌드는 성공한다:
        O/X 는 전부 X 가 정답이 되고(23개 중 시트 기준 8개가 뒤집혔다), 선다는 정답 표시가 사라지고,
        말하기는 예시 답변이 없어 무엇을 말해도 못 맞춘다. 그래서 아래 isHeaderRow 에서 **크게 알린다.** */
  const sample = cells.findIndex((c, i) => i > mode
    && (c.includes('답변') || c.includes('예시') || c === '학생' || c === '정답'))
  if (stage < 0 || tutor < 0) return null
  return { stage, tutor, mode, sample }
}

/** 표 머리 줄인가 — 강사 열에 **머리말 낱말**이 있으면 머리 줄이다(발화가 아니라) */
function isHeaderRow(row, cols) {
  return !!cols && HEADER_TUTOR.includes(clean((row || [])[cols.tutor]))
}

/** 줄바꿈만 남기고 다듬는다 — 도입 발화는 **문단이 곧 호흡**이라 한 덩어리로 뭉치면 안 된다.
 *  (화면도 TTS 도 \n 으로 나눠 읽는다) */
function cleanLines(s) {
  return String(s ?? '')
    .replace(/[“”″]/g, '').replace(/[‘’]/g, "'")
    .split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .join('\n')
}

/** '오늘 배울 내용' 칸 → 줄 목록.
 *  적는 꼴이 개정마다 바뀐다 — 예전엔 "1. … 2. … 3. …" 한 줄, 지금은 줄바꿈 + '●' 글머리표.
 *  머리말('오늘 배울 내용')은 화면이 따로 달아 주므로 여기서 뺀다 — 두 번 나오면 우스워진다. */
function splitPoints(text) {
  const lines = cleanLines(text).split('\n')
    .flatMap((l) => (/^\s*\d+\.\s/.test(l) ? l.split(/\s*\d+\.\s*/) : [l]))
    .map((l) => clean(l).replace(/^[●○•·▪\-–]\s*/, ''))
    .filter(Boolean)
  return lines.filter((l) => !/^오늘\s*배울\s*내용$/.test(l))
}

/** 강의를 가르는 제목 줄 — "LC 1강 Part 1 …", "RC 24강 Part 5 …" */
const LECTURE_TITLE = /^(LC|RC)\s*\d+강/

/** 탭에서 이 강의 몫의 줄만 잘라낸다. `section` 이 없으면 탭 전체가 한 강의다.
 *  줄번호로 자르지 않는 이유 — 콘텐츠팀이 위에 줄을 끼워 넣으면 번호가 통째로 밀린다. */
function sliceSection(values, section) {
  if (!section) return values
  const at = values.findIndex((r) => section.test(clean((r || [])[0])))
  if (at < 0) throw new Error(`탭 안에서 ${section} 제목 줄을 못 찾았다 — 제목이 바뀌었는지 볼 것`)
  const rest = values.slice(at + 1)
  const end = rest.findIndex((r) => LECTURE_TITLE.test(clean((r || [])[0])))
  return end < 0 ? values.slice(at) : values.slice(at, at + 1 + end)
}

/**
 * @param range   읽을 **열** 구간 [from, to) — 강의가 좌우로 둘 있는 탭(FGI_이도윤)
 * @param section 읽을 **행** 구간을 여는 제목 줄 — 강의가 위아래로 둘 있는 탭(FGI_윤다은)
 */
/** 취소선 그은 줄 = **지운 단계**. 값만 받는 덤프로는 안 보여서 따로 받아 둔다.
 *  없으면 그냥 지나간다(예전처럼 동작) — 다만 지운 단계가 수업에 남으므로,
 *  대본을 새로 받을 때 `python scripts/fetch-fgi-struck.py` 를 같이 돌릴 것. */
const STRUCK = (() => {
  const p = path.join(__dirname, 'fgi_struck.json')
  if (!fs.existsSync(p)) {
    console.log('⚠️ fgi_struck.json 이 없다 — 취소선(삭제) 줄을 거르지 못한다')
    return {}
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'))
})()

function parse(tabName, range, section) {
  const tab = JSON.parse(fs.readFileSync(DUMP, 'utf8')).sheets.find((s) => s.name === tabName)
  if (!tab) throw new Error(`시트에 "${tabName}" 탭이 없다 — 콘텐츠팀이 탭 이름을 바꿨는지 볼 것`)

  /* 지운 줄은 **자르지 않고 비운다** — 행을 빼면 뒤 행 번호가 밀려 취소선 목록과 어긋난다 */
  for (const r of STRUCK[tabName] || []) {
    if (tab.values[r]) tab.values[r] = []
  }

  const blocks = []
  let cur = null
  let cols = null
  for (const raw of sliceSection(tab.values, section)) {
    const row = range ? (raw || []).slice(range[0], range[1]) : (raw || [])
    const c0 = clean(row[0])

    /* 블록 머리 — 여기서 잘라야 뒤쪽 초안까지 딸려 들어가지 않는다.
       '실전 1' 과 '실전 문제 1' 을 같이 받는다(강사마다 다르게 적는다). */
    const head = /^유형 학습\s*\d+$/.test(c0) ? 'lesson'
      : /^실전(\s*문제)?\s*\d+$/.test(c0) ? 'practice'
      : /^도입$/.test(c0) ? 'intro'
      /* 강의 끝의 정리 퀴즈. 표 모양이 대본 표와 아주 달라(번호|퀴즈|보기|정답|피드백) 따로 받는다
         — 대본 표로 읽으려 들면 머리 줄을 못 찾아 통째로 버려진다.
         **묶음이 여럿일 수 있다**: 이도윤은 '핵심 요약 (1)' 전략 · '(2)' 빈출 표현 둘로 나눠 썼다. */
      : /^핵심\s*요약(\s*\(\d+\))?$/.test(c0) ? 'recap'
      /* 실전 앞뒤에서 강사가 한 번씩 하는 말. 문항에 매이지 않아 표가 아니라 **한 줄**이다.
           preface — "실전 문제로 넘어갈 때 멘트" → 유형 학습 맨 끝에서 한다
           result  — "실전 문제 풀이 후 멘트"   → 오답 코칭을 열면서 한다(다 맞히면 안 한다)
         이 둘은 예전에 곁가지로 보고 통째로 버렸다 — 그래서 실전 화면이 무음이었다. */
      : /^실전\s*문제로\s*넘어갈\s*때\s*멘트$/.test(c0) ? 'preface'
      : /^실전\s*문제\s*풀이\s*후\s*멘트$/.test(c0) ? 'result' : null
    if (head) {
      cur = { kind: head, turns: [], script: [], points: [], quiz: [] }
      blocks.push(cur)
      cols = null
      const c1 = clean(row[1])
      // 머리 줄에 바로 도입 발화가 붙어 있는 꼴도 있다
      if (head === 'intro' && c1) cur.script.push(c1)
      /* 문항코드가 **머리 줄 옆칸에** 붙어 있는 꼴 — "유형 학습 1 | ID: YBM_RC1_T04_Q120".
         예전 탭은 다음 줄에 따로 적었다. 둘 다 받는다. */
      if (head !== 'intro' && /^ID:/.test(c1)) cur.srcCode = c1.replace(/^ID:\s*/, '')
      continue
    }

    /* preface·result 본문은 **홀로 선 한 줄**이다. 아래 lone 처리로 내려가면 블록이 닫혀
       사라지므로 여기서 먼저 받는다. 다음 제목 줄(…멘트/…버전)이 오면 받기를 멈춘다. */
    if (cur && (cur.kind === 'preface' || cur.kind === 'result')) {
      if (c0 && !/멘트$|버전$|^\[/.test(c0)) { cur.script.push(c0); continue }
    }

    /* ── 홀로 선 제목 줄은 앞 블록을 **닫는다** ──
       'FGI_이도윤' 에는 본편 말고도 '유형 학습 3 → 실전 문제 버전'(시간이 없을 때 쓰는 대체본),
       '실전 문제로 넘어갈 때 멘트' 같은 곁가지가 사이사이 들어 있다. 닫지 않으면 그것들이
       앞 문항의 턴으로 붙어 한 문항이 54턴이 된다(실측). */
    /* 메타 줄은 홀로 서 있어도 블록을 닫지 않는다. '문항:'·'보기:' 는 RC 대본에 새로 생긴 줄인데,
       빠뜨리면 블록이 여기서 끊겨 그 문항 대본이 통째로 사라진다(실측: 24강 전체가 빈 채로 나왔다). */
    const lone = c0 && !row.slice(1).some((x) => clean(x))
    const meta = /^(ID:|사진:|정답:|문항:|보기:)/.test(c0) || /^YBM_[A-Z0-9_]+$/i.test(c0)
    /* '[공통사항] … 실전 문제 풀이 전에 강사가 "…" 라고 안내하도록 함' — 윤다은은 실전 안내
       문구를 따로 블록으로 두지 않고 이 메모 안에 따옴표로 적어 뒀다. 그래서 메모도 들고 간다. */
    if (lone && /^\[/.test(c0)) blocks.push({ kind: 'note', text: c0, turns: [], script: [], points: [], quiz: [] })
    if (lone && !meta) { cur = null; cols = null; continue }

    if (!cur) continue
    if (/^ID:/.test(c0)) { cur.srcCode = c0.replace(/^ID:\s*/, ''); continue }
    if (/^YBM_[A-Z0-9_]+$/i.test(c0)) { cur.srcCode = c0; continue }   // ID: 없이 코드만 적은 블록
    if (/^사진:/.test(c0)) { cur.photo = c0.replace(/^사진:\s*/, ''); continue }
    /* 문항 본문·보기는 **DB 가 정본**이라 대본에 담지 않는다. 대조용으로만 들고 있는다 */
    if (/^문항:/.test(c0)) { cur.stem = c0.replace(/^문항:\s*/, ''); continue }
    if (/^보기:/.test(c0)) { continue }
    if (/^정답:/.test(c0)) { cur.answer = c0.replace(/^정답:\s*/, '').slice(0, 1); continue }

    /* ── 도입은 표가 아니다 ──
       '화면 텍스트 | AI 강사 대사' 두 칸이고, 화면 텍스트 칸이 곧 '오늘 배울 내용' 이다. */
    if (cur.kind === 'intro') {
      if (/^화면 텍스트$/.test(c0)) {
        cur.introAt = { points: 0, script: row.findIndex((x) => HEADER_TUTOR.includes(clean(x))) }
        continue
      }
      const si = cur.introAt?.script ?? 1
      const sc = cleanLines(row[si])       // 도입 발화는 줄바꿈이 문단 경계다 — 뭉개지 않는다
      /* 원문 그대로 넘긴다 — splitPoints 가 줄바꿈으로 나눈다. clean() 을 먼저 걸면
         세 줄이 한 줄로 뭉쳐 '오늘 배울 내용' 이 한 덩어리가 된다(실측). */
      const pts = cur.introAt ? row[cur.introAt.points] : ''
      if (sc) cur.script.push(sc)
      if (clean(pts)) cur.points = splitPoints(pts)
      continue
    }

    /* ── 핵심요약도 표가 아니다 ── 번호 | 퀴즈 | 보기 | 정답 | 정답 후 강사 피드백
       묶음마다 '화면 제목' 과 'AI 강사 도입' 이 앞에 붙기도 한다(이도윤). 윤다은은 없다. */
    if (cur.kind === 'recap') {
      /* ── '화면 제목' 이 또 나오면 **새 묶음**이다 ──
         이도윤은 '핵심 요약 (1)/(2)' 로 머리를 달지만 윤다은은 제목 줄만 하나 더 둔다.
         안 나누면 전략 정리와 어휘가 한 판에 섞이고 제목도 뒤엣것으로 덮인다
         (실측: 윤다은 13문항이 통째로 '핵심 빈출 표현 정리' 한 판이었다). */
      if (/^화면\s*제목$/.test(c0)) {
        if (cur.quiz.length) { cur = { kind: 'recap', turns: [], script: [], points: [], quiz: [] }; blocks.push(cur) }
        cur.wantTitle = true
        continue
      }
      if (cur.wantTitle && c0) { cur.title = c0; cur.intro = clean(row[1]); cur.wantTitle = false; continue }
      /* ── 표 머리에서 **칸 자리를 읽는다** ──
         묶음마다 다르다. 어휘 정리는 '보기'(또는 '선택지') 칸이 있고, 전략 정리는 08-19 개정에서
         보기 칸이 통째로 빠졌다 — 문장 빈칸은 주관식으로 가기로 했기 때문이다.
         자리를 고정으로 박아 두면 칸 하나가 빠진 순간 정답 자리에서 피드백을 읽는다(실측: 10문항 전멸). */
      if (!/^\d+$/.test(c0)) {
        const at = (re) => row.findIndex((x) => re.test(clean(x)))
        if (at(/^정답$/) >= 0) cur.cols = { options: at(/^(보기|선택지)$/), answer: at(/^정답$/), feedback: at(/AI\s*강사|피드백/) }
        continue        // 표 머리와 빈 줄은 여기서 끝
      }
      const rc = cur.cols || { options: 2, answer: 3, feedback: 4 }
      cur.quiz.push({
        text: clean(row[1]),
        options: rc.options >= 0 ? clean(row[rc.options]) : '',
        answer: clean(row[rc.answer]),
        /* 빈칸이 둘 이상인 문항은 **줄바꿈이 곧 칸 구분**이다 — clean() 이 그걸 공백으로
           눌러 버리므로 날것 그대로도 같이 들고 간다(toRecapCard 가 여기서 칸을 가른다). */
        answerRaw: String((rc.answer >= 0 ? row[rc.answer] : '') ?? ''),
        feedback: rc.feedback >= 0 ? clean(row[rc.feedback]) : '',
      })
      continue
    }

    const asCols = columnsOf(row)
    if (isHeaderRow(row, asCols)) {
      cols = asCols
      /* 정답 열을 못 찾으면 **조용히 비는 것이 가장 위험하다** — 빌드는 성공하고 수업만 틀린다 */
      if (cols.sample < 0) {
        console.warn(`\nWARN  "${tabName}" 표 머리에서 **예시 답변/정답 열을 못 찾았다.**`)
        console.warn(`      머리 줄: ${row.map((c) => clean(c)).filter(Boolean).join(' | ')}`)
        console.warn('      이대로 두면 정답 정보가 전부 빈다 — O/X 는 X 가 정답, 선다는 정답 없음, 말하기는 예시 답변 없음.')
        console.warn('      columnsOf 의 이름 목록에 이 탭의 열 이름을 더할 것.\n')
      }
      continue
    }
    if (!cols) continue

    const tutor = clean(row[cols.tutor])
    if (!tutor) continue        // 빈칸 줄 — 아직 안 쓴 대본이다. 버린다
    const modeRaw = cols.mode >= 0 ? row[cols.mode] : ''

    /* ── 갈래를 **두 줄로 나눠 적은 꼴** ──
       콘텐츠팀은 보통 한 칸에 "(정답) … (오답) …" 을 같이 적는데, 줄을 나눠 적은 곳이 있다
       (이도윤 51·52행). 그대로 두면 두 턴이 되어 **정답 피드백과 오답 피드백이 둘 다 나간다**
       (실측 보고 08-20, 구현 중 메모 12행). 앞 줄이 (정답)-만이고 이 줄이 (오답)-만이면 붙인다.
       ⚠️ 학생에게 무엇을 시키는 줄은 붙이지 않는다 — 상호작용이 통째로 사라진다. */
    const prevTurn = cur.turns[cur.turns.length - 1]
    const loneWrong = RE_LONE_NG.test(tutor)
    const prevLoneOk = prevTurn && RE_LONE_OK.test(prevTurn.tutor) && !RE_ANY_NG.test(prevTurn.tutor)
    const idleRow = !clean(modeRaw) || /^[-–]$/.test(clean(modeRaw))
    if (loneWrong && prevLoneOk && idleRow && !prevTurn.wrongLine) {
      prevTurn.wrongLine = tutor.replace(RE_STRIP_NG, '')
      continue
    }

    const sampleRaw = cols.sample >= 0 ? row[cols.sample] : ''
    cur.turns.push({
      stage: clean(row[cols.stage]) || cur.turns[cur.turns.length - 1]?.stage || '수업',
      tutor,
      mode: normMode(modeRaw),
      /* 선택지·짚을 낱말은 정규화 전 원문에서 뽑는다 — 방식 칸이 선택지까지 담고 있다 */
      modeRaw: clean(modeRaw),
      sampleRaw: clean(sampleRaw),
      samples: samples(sampleRaw),
    })
  }
  /* 빈 껍데기는 버린다. note 는 turns·script 가 없지만 text 하나로 뜻이 있으므로 남긴다 */
  return blocks.filter((b) => b.turns.length || b.script.length || b.quiz.length || b.text)
}

/** ── 영문 문법 용어를 **한국어로 말했을 때** ──
 *  정리 화면은 빈칸을 채운 문장 전체를 소리 내어 읽게 한다(08-20 결정). 그런데 문장은 한국어라
 *  STT 를 ko-KR 로 돌리고, 그러면 "have been + p.p." 가 영문 그대로 올 리가 없다.
 *  **답이 영문인 자리는 네 곳뿐**이라(이도윤 LC 2 · RC 1) 통째로 적어 둔다 — 낱말 단위로
 *  ('be'→'비') 풀면 한 글자짜리 열쇠말이 생겨 아무 말에나 걸린다.
 *  ⚠️ 실제 STT 가 무엇을 뱉는지는 **브라우저에서 확인해야 한다.** 여기 적힌 것은 예상형이고,
 *     확인되면 그대로 고칠 것. 영문으로 오는 기기는 위 alts 로 이미 걸린다. */
const SPOKEN_KO = {
  'be + -ing': ['비 아이엔지', '비잉', 'be ing', 'be -ing'],
  'be p.p.': ['비 피피', '비피피'],
  'be + p.p.': ['비 피피', '비피피'],
  'have been + p.p.': ['해브 빈 피피', '해브빈 피피', '해브 빈 피 피'],
  'be being + p.p.': ['비 비잉 피피', '비빙 피피', '비 빙 피피'],
}

/** 핵심요약 한 줄 → 정리 카드 하나.
 *    "사람 중심 사진 → 사람의 (    ) 확인" | "① 위치 ② 동작 ③ 주변 사물" | "② 동작" | "맞아요. …"
 *  화면(RecapCard)은 빈칸을 '___' 로 찾고, 답을 맞히면 `ko` 를 아래에 띄운다 — 그 자리가
 *  시트의 '정답 후 강사 피드백' 과 정확히 같은 자리라 거기에 넣는다. */
function toRecapCard(q, id) {
  const num = (s) => clean(s).replace(/^[①②③④⑤]\s*/, '')
  const text = clean(q.text).replace(/\([\s　]*\)/g, '___')
  const choices = clean(q.options).split(/\s*[①②③④⑤]\s*/).map(num).filter(Boolean)
  const answer = num(q.answer)
  const drop = (why) => { console.log(`   ✗ 핵심요약 버림 — ${why}: "${clean(q.text).slice(0, 40)}"`); return null }
  if (!text.includes('___') || !answer) return drop('빈칸이나 정답이 없음')
  const nBlanks = text.split('___').length - 1

  /* ── 어휘 확인만 보기를 쓴다 ──
     "line up = ( )" 처럼 뜻을 고르는 자리는 세 갈래에서 고르는 것이 문제 자체다.
     반대로 **문장 사이 빈칸**(전략 정리)은 08-19 결정으로 **보기 없이 주관식**이다 —
     배운 말을 스스로 꺼내는 자리라 보기를 주면 눈으로 찍고 지나간다.
     ⚠️ 시트에 보기가 남아 있어도 쓰지 않는다(윤다은 탭은 아직 안 고쳐졌다). */
  const isVocab = /=\s*___\s*$/.test(text)
  if (isVocab) {
    if (choices.length < 2) return drop('어휘 문항인데 보기가 모자람')
    /* ── 정답이 보기에 없으면 올리지 않는다 ──
       번호(①②)를 믿고 싶지만 **믿을 수 없다.** 실측으로 둘이 갈렸다:
         "① 어디에 어떤 상태로 있는지" ← ①='위치와 상태'  뜻이 같다(패러프레이즈)
         "② 무엇을 하고 있는지"      ← ②='인물의 성별'   뜻이 반대다(시트 오기)
       번호를 따르면 뒤엣것은 **틀린 답을 정답이라고 말하게 된다.** 지어내지 말고 시트를 고칠 것. */
    if (!choices.includes(answer)) return drop(`정답 "${answer}" 이 보기에 없음`)
    return { id: `s${id}`, en: text, ko: clean(q.feedback), answer, choices, keywords: [answer.toLowerCase()] }
  }

  /* 주관식은 **받아 줄 말을 넉넉히** 들고 간다. 시트가 "be p.p. 또는 be + p.p." 처럼
     같은 답을 두 가지로 적어 두기도 하고, 학생은 조사나 기호를 빼고 쓴다("be ing"). */
  const altsOf = (a) => a.split(/\s*(?:또는|\/|,)\s*/).map((x) => clean(x)).filter(Boolean)
  const blankOf = (a) => {
    const alts = altsOf(a)
    const spoken = alts.flatMap((x) => SPOKEN_KO[x.toLowerCase()] || [])
    return { answer: alts[0], keywords: Array.from(new Set([...alts.map((x) => x.toLowerCase()), ...spoken])) }
  }

  /* ── 빈칸이 둘 이상인 문항 ──
     "주어가 하는 주체이면 ( ), 받는 대상이면 ( )를 쓴다" 처럼 한 문장이 두 개념을 짝지어 묻는
     줄이 있다. 예전에는 화면이 '___' 하나만 앞뒤로 갈라서 이런 문항을 통째로 버렸다.
     **정답 칸이 줄바꿈으로 나뉘어 있고, 그 순서가 곧 빈칸 순서다.** */
  if (nBlanks > 1) {
    /* ⚠️ clean() 은 줄바꿈을 공백으로 눌러 버린다 — 나누는 것이 먼저다 */
    const parts = String(q.answerRaw ?? q.answer ?? '').split(/[\r\n]+/).map((x) => num(x)).filter(Boolean)
    if (parts.length !== nBlanks) return drop(`빈칸 ${nBlanks}개인데 정답은 ${parts.length}개`)
    const ordered = reorderBlankAnswers(text, parts)
    return {
      id: `s${id}`,
      en: text,
      ko: clean(q.feedback),
      answer: ordered[0].split(/\s*(?:또는|\/|,)\s*/)[0],   // 첫 칸 — 마이크 언어 판별 등이 본다
      choices: [],
      keywords: blankOf(ordered[0]).keywords,
      blanks: ordered.map(blankOf),
    }
  }

  const one = blankOf(answer)
  return {
    id: `s${id}`,
    en: text,
    ko: clean(q.feedback),
    answer: one.answer,
    choices: [],                                   // 빈 배열 = 주관식 (화면이 마이크를 낸다)
    keywords: one.keywords,
  }
}

/** ── 시트가 정답을 **문장과 반대 순서**로 적어 둔 자리 하나 ──
 *  이도윤 LC 핵심요약: 문장은 "이미 놓여 있을 때 ( ) … 진행되는 중일 때 ( )" 인데
 *  정답 칸은 "be being + p.p. / have been + p.p." 로 뒤집혀 있다(바로 옆 피드백 칸에는
 *  "have/has been + p.p. 는 사물이 이미 …" 라고 제대로 적혀 있다).
 *  코드가 알아낼 수 있는 종류의 오류가 아니라서 **이 짝이 이 순서로 나올 때만** 바로잡는다 —
 *  시트를 고치면 짝의 순서가 달라져 이 함수는 저절로 아무 일도 안 한다. **시트도 고쳐야 한다.** */
function reorderBlankAnswers(text, answers) {
  const has = (x) => text.includes(x)
  if (answers.length === 2
      && /^be being \+ p\.?p\.?$/i.test(answers[0].trim())
      && /^have been \+ p\.?p\.?$/i.test(answers[1].trim())
      && has('이미 어떤 상태로 놓여 있을 때') && has('진행되는 중일 때')) {
    console.log('   ✎ 핵심요약 정답 순서를 문장에 맞춰 뒤집었다(시트 오기) — "이미 놓여 있을 때"가 have been + p.p.')
    return [answers[1], answers[0]]
  }
  return answers
}

/** 이 턴이 **어느 보기를 지목하고 있는가** — "이번에는 A를 볼게요", "D에서는 …",
 *  단계명 'S6 오답 제거 - A' · 'S6 오답 제거 (A)'.
 *  화면은 이걸 보고 그 보기의 스크립트를 연다. 강사가 읽고 있는 문장이 화면에 없으면 못 따라간다. */
function labelsOf(t) {
  /* 단계명에 적혀 있으면 그게 정답이다 — 실전 대본은 짚는 보기를 단계명에 달고 있다 */
  const suffix = /[-–(]\s*([A-D])\s*\)?\s*$/.exec(t.stage)
  if (suffix) return [suffix[1]]

  /* ── 문법 공식의 **자리표시자**는 보기가 아니다 ──
       "appoint A as B는 'A를 B로 임명하다'" · "direct A to V" · "A be appointed as B"
     아래 영어 공식에 쓰인 글자를 먼저 걷어낸다. 안 걷으면 그 뒤 한국어 풀이의 'A를'·'B로'가
     보기 지목으로 잡혀서, 학생이 아직 못 들은 보기의 스크립트가 열린다. */
  const ph = new Set()
  for (const p of t.tutor.matchAll(/(?<![A-Za-z])([A-D])\s+(?:[a-z]+\s+){0,3}([A-DVN])(?![A-Za-z])/g)) {
    ph.add(p[1])
    if (/[A-D]/.test(p[2])) ph.add(p[2])
  }

  const hit = new Set()
  const re = /(?<![A-Za-z])([A-D])(?![A-Za-z])/g
  let m
  while ((m = re.exec(t.tutor))) {
    if (ph.has(m[1])) continue
    const before = t.tutor.slice(0, m.index).replace(/[\s'"‘’“”]+$/, '').slice(-1)
    const after = t.tutor.slice(m.index + 1).replace(/^['"‘’“”]+/, '').slice(0, 1)
    /* 영어 구문 속 **자리표시자**는 보기가 아니다 — "pour A into B", "hand A to B".
       앞이 영어면 버린다. 그리고 보기 라벨은 뒤에 조사가 붙는다("A를 볼게요", "D에서는"). */
    if (/[A-Za-z]/.test(before)) continue
    if (!/[가-힣]/.test(after)) continue
    hit.add(m[1])
  }
  return Array.from(hit).sort()
}

/** 이 턴은 **보기 음원을 트는 자리**인가 — 시트에 이렇게 적혀 있다.
 *
 *    "정답 B를 다시 들어볼게요. The woman is painting a picture on an easel. 재생"
 *
 *  뒤의 영어와 '재생' 은 **읽으라는 말이 아니라 지시**다. 그대로 낭독하면 강사가 정답 문장을
 *  한국어 목소리로 읽어버려서, 학생이 들어야 할 원어민 음원이 나가지 않는다(실측).
 *  → 낭독은 앞의 한국어까지만, 뒤는 그 보기 mp3 재생으로 바꾼다.
 *  '재생' 표시가 붙은 줄에서만 손댄다 — 다른 줄의 영어는 강사가 실제로 읽는 말이다. */
/** 한 칸에 **두 갈래**가 적혀 있는가 — 정답일 때 / 오답일 때.
 *
 *    "풀이 결과가 정답일 때 이제 선택지 봐볼게요. 정답은 B죠? 잘 맞혔어요!
 *     풀이 결과가 오답일 때 이제 선택지 봐볼게요. 정답은 B였어요. …"
 *
 *  그대로 읽으면 강사가 **두 경우를 다 읊는다**(실측). 갈라서 담고 화면이 하나만 고른다. */
/* 갈래를 여는 표기 — 개정마다 달라진다. 한 곳에 모아 둔다.
     · (정답)/(오답)               — 이도윤 탭(31회씩)
     · (맞았을 경우)/(틀렸을 경우)   — 간결본에서 새로 들어왔다(두 탭 모두, 09-01)
   ⚠️ 모르는 표기가 들어오면 **갈라지지 않고 그대로 읽힌다** — 강사가 "(맞았을 경우) 정답이에요!
      (틀렸을 경우) 정답은 B였어요" 를 통째로 읽었다(실측 09-01). 아래 출력의
      '⑂ 정답/오답 갈래' 개수를 시트와 대조하면 새는 것을 잡을 수 있다. */
/* ⚠️ **정규식 리터럴로 쓴다.** 문자열을 이어 붙여 `new RegExp` 로 만들면 백슬래시가 한 겹
      깎여(`\s` → `s`) 아무것도 안 걸리는데, 에러는 안 난다 — 그냥 조용히 다 통과한다(실측 09-01). */
const RE_PAIR = /\(\s*(?:정답|맞았을\s*경우|맞은\s*경우)\s*\)\s*([\s\S]+?)\s*\(\s*(?:오답|틀렸을\s*경우|틀린\s*경우)\s*\)\s*([\s\S]+)$/
const RE_LONE = /^\(\s*(?:정답|오답|맞았을\s*경우|틀렸을\s*경우|맞은\s*경우|틀린\s*경우)\s*\)\s*([\s\S]+)$/
const RE_LONE_NG = /^\(\s*(?:오답|틀렸을\s*경우|틀린\s*경우)\s*\)/
const RE_LONE_OK = /^\(\s*(?:정답|맞았을\s*경우|맞은\s*경우)\s*\)/
const RE_ANY_NG = /\(\s*(?:오답|틀렸을\s*경우|틀린\s*경우)\s*\)/
const RE_STRIP_NG = /^\(\s*(?:오답|틀렸을\s*경우|틀린\s*경우)\s*\)\s*/

function branchOf(tutor) {
  const t = clean(tutor)
  /* ① 옛 표기 — 시트가 한 칸에 두 경우를 문장으로 적던 때 */
  const old = /풀이\s*결과가\s*정답일\s*때\s*(.+?)\s*풀이\s*결과가\s*오답일\s*때\s*(.+)$/.exec(t)
  if (old) return { ok: clean(old[1]), wrong: clean(old[2]) }
  /* ② 지금 표기 — "(정답) …" 줄바꿈 "(오답) …" 을 한 칸에 적는다.
     ⚠️ 이 갈래를 몰라서 오답 문구 21개가 통째로 버려지고 있었다(08-18 실측). 시트가 표기를
        바꾸면 여기가 조용히 새므로, 아래 출력의 '⑂ 정답/오답 갈래' 개수를 시트와 대조할 것. */
  const cur = RE_PAIR.exec(t)
  if (cur) return { ok: clean(cur[1]), wrong: clean(cur[2]) }
  /* ③ 한쪽만 적힌 칸 — 표시만 떼고 그대로 쓴다. 그냥 두면 강사가 "정답" 을 소리내어 읽는다. */
  const lone = RE_LONE.exec(t)
  if (lone) return { ok: clean(lone[1]), wrong: null }
  return null
}

function playCue(tutor) {
  const t = clean(tutor)
  if (!/재생\s*\.?\s*$/.test(t)) return null
  /* **몇 번째 보기인가** — 줄 안에서 홀로 선 **첫** A~D 를 쓴다.
     ⚠️ 뒤에서 찾으면 안 된다. 꼬리에 붙은 영어 보기 문장에도 홀로 선 글자가 있다
        ("다음 선택지 C 볼게요. A handbag has been left…" → 뒤에서 찾으면 A 를 튼다). */
  const m = /(?:^|[^A-Za-z])([A-D])(?![A-Za-z])/.exec(t)
  if (!m) return null
  const said = t
    .replace(/재생\s*\.?\s*$/, '')                             // 지시어를 뗀다
    .replace(/\s*[A-Z][A-Za-z'’,.\-\s]{6,}[.!?]?\s*$/, '')     // 뒤에 붙은 영어 문장을 뗀다
    /* "… 볼게요. 선택지 A" 처럼 **한국어로 적은 지시**도 뗀다 — 08-19 최종본에서 늘었다.
       떼지 않으면 강사가 "선택지 A 재생" 을 소리내어 읽고, 정작 보기 음원은 안 나간다(실측 9줄). */
    .replace(/([.!?])?[,\s]*(?:선택지\s*)?[A-D]\s*\.?\s*$/, (_, dot) => dot || '')   // 문장 끝 마침표는 남긴다
    .trim()
  return { label: m[1], said: said || t.replace(/재생\s*\.?\s*$/, '').trim() }
}

/** @param audible 보기를 **소리로** 듣는 강의인가 (LC). RC Part 5 는 보기가 글자라 음원이 없다 */
function toTurn(t, qIdx, no, seq, kind, audible, nextTutor) {
  /* 실전(리뷰)은 itemSeq 를 달지 않는다 — 아이템 표는 수업 문항 것이라
     실전 문항 번호로 되짚으면 엉뚱한 범위가 잡힌다. 화면은 focusQ 하나로 문항을 고른다. */
  /* 한 칸에 정답·오답 두 갈래가 적혀 있으면 갈라 담는다(화면이 하나만 고른다) */
  const branch = branchOf(t.tutor)
  const said0 = branch ? branch.ok : t.tutor
  /* '재생' 지시가 붙은 줄이면 낭독은 앞의 한국어까지만 하고, 그 보기 음원을 튼다 */
  const cue = playCue(said0)
  const tutor = cue ? cue.said : said0
  const base = kind === 'lesson'
    ? { no, itemSeq: seq, occurrence: seq, stage: t.stage, tutor, focusQ: qIdx }
    : { no, stage: t.stage, tutor, focusQ: qIdx }
  if (cue) base.audio = { kind: 'option', qIdx, label: cue.label }
  /* 다음 줄에 따로 적혀 있던 (오답) 갈래 — parse 가 앞 턴에 붙여 온다 */
  if (t.wrongLine) {
    const w = playCue(t.wrongLine)
    base.tutorIfWrong = w ? w.said : t.wrongLine
  }
  if (branch) {
    const w = playCue(branch.wrong)
    if (branch.wrong) base.tutorIfWrong = w ? w.said : branch.wrong
  }
  /* 지목한 보기가 있으면 그 스크립트를 연다. 공개는 누적이라 한 번 열린 보기는 계속 보인다.
     정답 고르기(A~D) 턴에는 붙이지 않는다 — 고르기도 전에 보기 글자가 열리면 듣기가 아니게 된다. */
  const labels = t.mode === 'A~D' ? [] : labelsOf(t)
  if (labels.length) base.reveal = { optionText: [{ qIdx, labels }] }
  const [first, ...rest] = t.samples

  switch (t.mode) {
    case 'A~D':
      /* 정답 고르기. LC 는 네 보기를 **들려주고** 고르게 한다(보기 음원은 교재에서 잘라 둔 것).
         RC Part 5 는 보기가 화면의 글자라 음원을 붙이면 안 된다 — 붙이면 없는 mp3 를 찾다가
         브라우저 TTS 가 영어 보기를 한국어 목소리로 읽는다. */
      return { ...base, ...(audible ? { audio: { kind: 'options', qIdx, labels: ['A', 'B', 'C', 'D'] } } : {}),
        interaction: { kind: 'pickAnswer', qIdx } }
    case 'O/X': {
      /* 시험지에 치는 표시 그대로 O·X 로 낸다 — '맞아요/아니에요' 는 문장이라 눈이 읽어야 하고,
         O/X 는 기호라 바로 눌린다. 화면도 이 둘이면 좌우 큰 버튼으로 바꿔 그린다. */
      const yes = /^(O|o|ㅇ|맞|네|예)/.test(first || '')
      return { ...base, interaction: { kind: 'choice', prompt: askOf(t.tutor), fixedPrompt: true,
        choices: [{ text: 'O', ...(yes ? { correct: true } : {}) },
                  { text: 'X', ...(yes ? {} : { correct: true })}] } }
    }
    case '선다': {
      /* ① 방식 칸에 선택지가 적혀 있으면 그것이 정본 — "2지선다 / 1) 표준화하는 쪽 2) 표준화되는 대상".
         정답은 예시 답변의 번호로 정한다("2) 표준화되는 대상"). */
      const written = modeChoices(t.modeRaw)
      if (written) {
        const at = pickedIndex(t.sampleRaw, written)
        return { ...base, interaction: { kind: 'choice', prompt: askOf(t.tutor), fixedPrompt: true,
          choices: written.map((text, i) => (i === at ? { text, correct: true } : { text })) } }
      }
      /* ② 안 적혀 있으면 예전처럼 강사 발화에서 뽑는다 */
      const choices = twoChoices(t.tutor, first)
      if (choices) return { ...base, interaction: { kind: 'choice', prompt: askOf(t.tutor), fixedPrompt: true, choices } }
      return { ...base, interaction: { kind: 'subjective', prompt: askOf(t.tutor),
        ...(first ? { hint: first } : {}), ...(rest.length ? { accepts: t.samples } : {}) } }
    }
    case '표시': {
      /* 시험지에 동그라미·밑줄을 치는 자리. 짚을 낱말이 없으면 표시할 것이 정해지지 않은
         것이라 그냥 넘긴다 — 판정할 수 없는 필기를 요구하면 학생이 갇힌다. */
      const targets = markTargets(t.sampleRaw, t.tutor, nextTutor)
      if (!targets.length) return { ...base, interaction: { kind: 'next' } }
      return { ...base, interaction: { kind: 'mark', prompt: askOf(t.tutor), targetWords: targets } }
    }
    case '말하기':
      /* 예시 답변이 여럿이면 **전부 받아준다**(accepts). hint 는 첫 줄만 — 못 맞혔을 때
         강사가 읽어주는 문장이라, 세 답을 이어 읽으면 말이 안 된다. */
      return { ...base, interaction: { kind: 'subjective', prompt: askOf(t.tutor),
        ...(first ? { hint: first } : {}), ...(rest.length ? { accepts: t.samples } : {}) } }
    default:   // 듣기 — 학생이 할 일이 없다
      return { ...base, interaction: { kind: 'next' } }
  }
}

function build(src) {
  const blocks = parse(src.tab, src.range, src.section)
  const out = { turns: [], review: [] }
  const audible = /^LC/.test(src.lecture)   // 보기를 소리로 듣는 강의인가
  let no = 0
  let lessonSeq = 0
  let practiceSeq = 0

  console.log(`\n══ ${src.instructor} · ${src.lecture} ← "${src.tab}"`)

  /* 도입 — 시트에 있으면 시트가 정본, 없으면 설정에 적어 둔 것 */
  const introBlocks = blocks.filter((b) => b.kind === 'intro')
  const fromSheet = introBlocks.flatMap((b) => b.script)
  const sheetPoints = introBlocks.flatMap((b) => b.points)
  const script = fromSheet.length ? fromSheet.join('\n') : src.intro?.script
  if (script) out.intro = { script, points: sheetPoints.length ? sheetPoints : (src.intro?.points ?? []) }
  console.log(`도입: ${fromSheet.length ? '시트' : src.intro ? '설정' : '없음'}`
    + `${out.intro ? ` · ${out.intro.script.length}자 · 오늘 배울 내용 ${out.intro.points.length}개` : ''}`)

  /* 핵심요약 — 강의 끝 정리 화면. 없으면 화면이 예전대로 강의에 박아 둔 문장 3개를 쓴다.
     **묶음이 여럿일 수 있다**(이도윤: 전략 정리 + 빈출 표현). 묶음마다 제목·강사 도입이 붙는다. */
  let dropped = 0
  const groups = blocks.filter((b) => b.kind === 'recap').map((b, gi) => {
    const items = b.quiz.map((q, i) => toRecapCard(q, `${gi + 1}_${i + 1}`))
    dropped += items.filter((x) => !x).length
    const kept = items.filter(Boolean)
    /* ── 보기가 없어진 묶음은 도입도 그렇게 말해야 한다 ──
       시트 도입은 "빈칸에 들어갈 말을 **골라서** 배운 내용을 정리해보세요" 다(네 강의 모두).
       그런데 이 묶음은 보기도 없고 적을 칸도 없다 — **빈칸을 채운 문장을 소리 내어 말하는**
       자리다(08-20 결정). 강사가 고르라고 하면 학생이 없는 버튼을 찾는다.
       앞머리("빈칸에 들어갈 말을")는 시트 그대로 두고 **시키는 동작만** 갈아 끼운다.
         → "오늘 배운 내용 빠르게 정리해볼게요. 빈칸에 들어갈 말을 채워서 문장을 소리 내어 말해 보세요!" */
    let intro = b.intro || ''
    if (kept.length && !kept[0].choices.length && /골라|적어/.test(intro)) {
      intro = intro
        .replace(/빈칸에 들어갈 말을 (골라서|직접 적어서)/g, '빈칸에 들어갈 말을 채워서')
        .replace(/채워서\s*배운 내용을 정리해\s*보세요/g, '채워서 문장을 소리 내어 말해 보세요')
        .replace(/골라\s*보세요/g, '소리 내어 말해 보세요').replace(/골라보세요/g, '소리 내어 말해보세요')
      console.log(`   ✎ "${b.title}" 도입을 '빈칸에 들어갈 말을 채워서 문장을 소리 내어 말해 보세요' 로 바꿨다`)
    }
    return { title: b.title || '', intro, items: kept }
  }).filter((g) => g.items.length)
  if (groups.length) out.summary = groups
  console.log(`핵심요약: ${groups.length
    ? groups.map((g) => `${g.title || '(제목 없음)'} ${g.items.length}개`).join(' · ')
    : '없음(강의 기본값)'}`
    + (dropped ? `   ⚠️ 올리지 않은 ${dropped}개 — 시트를 고쳐야 한다(위 ✗ 참고)` : ''))

  for (const b of blocks) {
    if (['intro', 'recap', 'preface', 'result', 'note'].includes(b.kind)) continue
    const lesson = b.kind === 'lesson'
    if (!lesson && src.skipPractice) continue      // 실전 대본이 미완이라 통째로 버린다
    const qIdx = lesson ? lessonSeq++ : practiceSeq++
    const target = lesson ? out.turns : out.review
    console.log(`\n[${lesson ? '유형 학습' : '실전'} ${qIdx + 1}] ${b.srcCode || '(코드 없음)'}`
      + `${b.answer ? `  정답 ${b.answer}` : ''} — ${b.turns.length}턴`)
    for (const [ti, t] of b.turns.entries()) {
      const turn = toTurn(t, qIdx, ++no, qIdx + 1, b.kind, audible, b.turns[ti + 1]?.tutor)
      const k = turn.interaction.kind
      const extra = k === 'choice'
        ? ` [${turn.interaction.choices.map((c) => c.text + (c.correct ? '✓' : '')).join(' / ')}]`
        : k === 'mark' ? ` ✎ ${turn.interaction.targetWords.join(' | ')}`
        : k === 'subjective' && turn.interaction.accepts ? ` (예시 ${turn.interaction.accepts.length}개)` : ''
      const rv = turn.reveal ? `  스크립트 열림 ${turn.reveal.optionText[0].labels.join('')}` : ''
      const au = turn.audio?.kind === 'option' ? `  ♪ ${turn.audio.label} 보기 음원` : ''
      const br = turn.tutorIfWrong ? '  ⑂ 정답/오답 갈래' : ''
      console.log(`  ${String(no).padStart(2)} ${t.stage.padEnd(18)} ${t.mode.padEnd(6)} → ${k}${extra}${au}${br}${rv}`)
      target.push(turn)
    }
  }
  /* ── 실전 앞뒤 강사 멘트 ──
     시트가 문항 표 밖에 한 줄씩 적어 둔 말이다. 놓치면 실전 화면이 통째로 무음이 된다.
       · 실전 전 → **유형 학습 맨 끝 턴**으로 붙인다. 실전 화면에는 강사 자리가 없어서,
         "이제 다섯 문제 풀어볼게요" 를 할 수 있는 마지막 자리가 여기다.
       · 실전 후 → 문자열로만 넘긴다. 오답이 있을 때만, 코칭 첫 마디로 화면이 읽는다
         (점수가 들어가야 해서 대본에 박아 둘 수 없다 — 아래 {전체수}/{맞은수}). */
  const prefaceBlock = blocks.find((b) => b.kind === 'preface')
  const noteText = blocks.filter((b) => b.kind === 'note').map((b) => b.text).join(' ')
  /* 윤다은은 블록이 없고 [공통사항] 메모 안에 따옴표로만 적어 둑다 — "'…'라고 안내하도록 함" */
  const fromNote = /실전\s*문제\s*풀이\s*전에\s*강사가\s*['‘"]([^'’"]+)['’"]/.exec(noteText)
  let practiceIntro = clean(prefaceBlock ? prefaceBlock.script.join(' ') : (fromNote ? fromNote[1] : ''))
  if (practiceIntro && practiceSeq) {
    /* "총 5 문제" — 시트가 두 강의에 같은 문장을 복사해 놓아서 LC(4문항)에서는 숫자가 틀리다.
       읽어 줄 수를 우리가 알고 있으니 맞춰 넣는다. 고친 자리는 아래에 찍어 눈으로 보게 한다. */
    const fixed = practiceIntro.replace(/총\s*\d+\s*문제/, `총 ${practiceSeq} 문제`)
    if (fixed !== practiceIntro) console.log(`
  ✎ 실전 안내의 문항 수를 ${practiceSeq}개로 맞췄다(시트는 다른 수를 적어 두었다)`)
    practiceIntro = fixed
  }
  if (practiceIntro) {
    out.turns.push({ no: ++no, itemSeq: lessonSeq, occurrence: lessonSeq, stage: '실전 안내',
      tutor: practiceIntro, focusQ: Math.max(0, lessonSeq - 1), interaction: { kind: 'next' } })
    console.log(`
  ▶ 실전 전 멘트(유형 학습 끝) — ${practiceIntro.slice(0, 60)}…`)
  }
  const resultBlock = blocks.find((b) => b.kind === 'result')
  if (resultBlock && resultBlock.script.length) {
    /* 점수는 그때 가서 채운다 — 시트는 '5 문제 중 0 문제 맞혔어요' 처럼 예시 숫자로 적어 두었다 */
    out.practiceOutro = clean(resultBlock.script.join(' '))
      .replace(/\d+\s*문제\s*중\s*\d+\s*문제/, '{전체수} 문제 중 {맞은수} 문제')
    console.log(`  ▶ 실전 후 멘트(오답 코칭 첫 마디) — ${out.practiceOutro.slice(0, 60)}…`)
  }

  if (src.skipPractice) console.log('\n  ⚠️ 실전 대본은 미완이라 올리지 않았다 — 화면이 틀린 문항만 골라 스스로 코칭한다')
  console.log(`\n  수업 ${out.turns.length}턴 · 실전 코칭 ${out.review.length}턴`)
  return out
}

function main() {
  const byInstructor = {}
  for (const src of SOURCES) {
    const built = build(src)
    byInstructor[src.instructor] = byInstructor[src.instructor] || {}
    byInstructor[src.instructor][src.lecture] = built
  }

  const ind = (json, pad) => json.split('\n').map((l, i) => (i ? pad + l : l)).join('\n')
  const body = `/* 자동 생성 — scripts/build-fgi-scenario.js
 *
 * FGI 시연용 **대본 수업**. 평소 수업은 레일(단계)만 정해 두고 강사 발화는 LLM 이 만드는데,
 * 시연 강의는 할 말을 미리 다 정해 둔다. 여기 있는 turns 가 그 대본이다.
 *
 * **강사 → 강의** 두 겹인 이유: 같은 문항이라도 강사마다 짚는 순서와 시키는 방식이 다르다.
 * 대본이 없는 강사로 열면 이 파일을 쓰지 않고 평소대로 레일 + LLM 으로 돈다.
 *
 * turns  = 스캐폴딩 수업 (강사와 같이 푼다)
 * review = 실전을 혼자 다 푼 뒤의 문항별 코칭 (대본이 있으면 **다 맞혀도** 이 단계를 지난다)
 *
 * ⚠️ 손으로 고치지 말 것 — 시트가 정본이다. 고칠 일이 생기면 시트를 고치고 생성기를 다시 돌린다.
 */
import type { Turn, RecapSentence } from '@/data/typeLearning/types'

export interface ScriptedLesson {
  /** 수업(스캐폴딩) 턴 */
  turns: Turn[]
  /** 실전 뒤 코칭 턴 — 비어 있으면 화면이 틀린 문항만 골라 스스로 만든다 */
  review: Turn[]
  /** 도입 화면 — 강사 발화(문단은 줄바꿈으로 나뉜다)와 '오늘 배울 내용'.
   *  없으면 화면이 단계명에서 뽑아 쓴다(S1·S3… 이 그대로 올라와 학생에게는 아무 말도 아니다). */
  intro?: { script: string; points: string[] }
  /** 마지막 정리 화면의 퀴즈 (시트 '핵심요약'). 없으면 강의에 박아 둔 기본 문장을 쓴다.
   *  대본 강의는 **영어 문장 빈칸이 아니라 한국어 전략 퀴즈**다 — 그 강의에서 세운 판단 순서를
   *  되짚는 자리라 그렇다. ko 자리에는 '정답 후 강사 피드백' 이 들어 있다.
   *
   *  **묶음이 여럿일 수 있다.** 이도윤은 전략 정리와 빈출 표현을 둘로 나눠 쓰고, 묶음마다
   *  화면 제목과 강사 도입을 따로 달아 뒀다. 윤다은은 묶음 하나에 제목이 없다. */
  summary?: { title: string; intro: string; items: RecapSentence[] }[]
  /** 실전을 풀고 난 뒤, **틀린 문항이 있을 때만** 코칭 첫 마디로 하는 말 (시트 '실전 문제 풀이 후 멘트').
   *  {전체수}·{맞은수} 자리는 화면이 채점 결과로 채운다. 다 맞히면 코칭 자체가 없어 쓰이지 않는다.
   *  실전 **전** 멘트는 여기 없다 — 유형 학습 마지막 턴('실전 안내')으로 이미 들어가 있다. */
  practiceOutro?: string
}

/** 강사코드 → 강의코드 → 대본. 여기 있는 조합만 대본으로 돈다. */
export const FGI_SCENARIO: Record<string, Record<string, ScriptedLesson>> = {
${Object.entries(byInstructor).map(([inst, byCode]) => `  ${inst}: {
${Object.entries(byCode).map(([code, s]) => `    '${code}': {
${s.intro ? `      intro: ${ind(JSON.stringify(s.intro, null, 2), '      ')},\n` : ''}${s.summary ? `      summary: ${ind(JSON.stringify(s.summary, null, 2), '      ')},\n` : ''}${s.practiceOutro ? `      practiceOutro: ${JSON.stringify(s.practiceOutro)},
` : ''}      turns: ${ind(JSON.stringify(s.turns, null, 2), '      ')},
      review: ${ind(JSON.stringify(s.review, null, 2), '      ')},
    },`).join('\n')}
  },`).join('\n')}
}

/** 이 강사·강의 조합의 대본 (없으면 undefined — 평소 레일로 돈다) */
export const scenarioFor = (instructor?: string, code?: string): ScriptedLesson | undefined =>
  (instructor && code && FGI_SCENARIO[instructor]?.[code]) || undefined
`

  if (asJson) { process.stdout.write(JSON.stringify(byInstructor)); return }
  if (!go) { console.log('\n보여주기만 했다. 파일을 쓰려면 --go 를 붙일 것.'); return }
  fs.writeFileSync(OUT, body)
  console.log(`\n✅ ${path.relative(path.join(__dirname, '..'), OUT)}`)
}

main()
