/* 강사별 일자 배치(D1~D20) — 콘텐츠팀 커리큘럼 설계 시트를 그대로 옮긴 것.
 *
 * 시트: 스프레드시트 1EwFDxXrGJHt5qTa7vUWs4hYUN6mMoBe7wtV6tkmkIl8
 *       탭 `박혜원_W_N` `이도윤_W_N` `윤다은_N_W` `서지안_N_W` (각 탭에 W형·N형 두 벌)
 * 저장소·DB 어디에도 동기화돼 있지 않아 여기 박아둔다. 시트가 정본이다.
 *
 * 강의는 `ref`(LC3 = LC 3강)로만 참조한다 — 제목·파트·문항 유무는 DB(lectures)에서 조인해 온다.
 * 그래야 상세 페이지가 "수업 가능"이라고 표시한 강의가 실제로 도는 강의와 어긋나지 않는다.
 * ref 없는 항목(4주차 특강·자료)은 `text` 만 쓴다 — 정규 42강에 없는 것들이다.
 *
 * ── 시트 → DB 번호 변환 (윤다은·서지안 탭만 해당) ──
 * 두 탭은 LC를 17강 기준(`L1`~`L17`)으로 쓰는데 DB는 16강이다. Part 1이 한 강 많다.
 * 제목을 대조해 아래 규칙으로 변환해 옮겼다:
 *     L1        → LC1
 *     L2        → 제외 (Part 1 '위치·전치사' — DB에 없는 강의)
 *     L3 ~ L17  → LC2 ~ LC16
 *     R2 ~ R26  → RC2 ~ RC26 (1:1, 변환 없음)
 * 박혜원·이도윤 탭은 이미 DB와 같은 번호 체계라 그대로 옮겼다.
 *
 * ⚠️ RC 1강은 어느 강사의 어느 배치에도 들어 있지 않다(모든 시트가 RC2부터 시작).
 *    시트 쪽 누락인지 의도인지 콘텐츠팀 확인 필요.
 */

export interface DayItem {
  /** 'LC3' | 'RC12' — DB lectures.seq 로 환산해 조인한다 (LC n → n, RC n → 16+n) */
  ref?: string
  /** ref 가 없는 항목(시험 직전 특강·요약 노트 등)의 표시 문구 */
  text?: string
}

export interface DayPlan {
  day: number
  items: DayItem[]
  /** 복습 강의 열 */
  review?: string
  /** 학습 자료 열 — 강사 전략에 따라 붙는 부교재 성격의 자료 */
  material?: string
}

export interface WeekPlan {
  week: number
  title: string
  /** 시트에 주차 목표가 없는 배치(윤다은 W형)는 비운다 */
  goal?: string
  days: DayPlan[]
}

export interface InstructorPlan {
  /** 시트 제목이 밝히는 전제 — 화면에 그대로 노출한다 */
  headline: string
  /** 설계 기준 표 (기준 → 반영 방식) */
  principles: { rule: string; how: string }[]
  weeks: WeekPlan[]
}

const REVIEW = '동일 유형 오답 문제 풀이'
const NOTE_P2 = 'Part 2 오답 소거 포커스 노트'
const NOTE_P5 = 'Part 5 연어(Collocation) 자료'

/** LC n강 → seq n, RC n강 → seq 16+n. 0015_curriculum.sql 의 seq 규칙과 같다 */
export function refToSeq(ref: string): number | null {
  const m = /^(LC|RC)(\d+)$/.exec(ref)
  if (!m) return null
  const n = Number(m[2])
  return m[1] === 'LC' ? n : 16 + n
}

/** 정규 강의일 한 줄. 복습 열은 전 시트가 동일해서 기본값으로 넣는다 */
function d(day: number, refs: string[], material?: string): DayPlan {
  return {
    day,
    items: refs.map((ref) => ({ ref })),
    review: REVIEW,
    ...(material ? { material } : {}),
  }
}

/** 4주차 특강일. 정규 42강 밖이라 text 로만 쓰고 복습 열도 없다 */
function s(day: number, texts: string[]): DayPlan {
  return { day, items: texts.map((text) => ({ text })) }
}

/* ═══════════════════════════════════════
   박혜원 — 스파르타 압축전략형 (P + C)
   ═══════════════════════════════════════ */

/** 박혜원·이도윤 공통 4주차 특강 (시트 표기 그대로) */
const PARK_LEE_SPECIAL = (lcDrill: string): DayPlan[] => [
  s(16, ['오답 기반 시험 직전 특강 1', '오답 기반 시험 직전 특강 2', '오답 기반 시험 직전 특강 3']),
  s(17, ['오답 기반 시험 직전 특강 4', '오답 기반 시험 직전 특강 5', '오답 기반 시험 직전 특강 6']),
  s(18, ['오답 기반 시험 직전 특강 7', '오답 기반 시험 직전 특강 8', '오답 기반 시험 직전 특강 9']),
  s(19, ['실전 모의고사', 'RC 어휘·collocation 특강', lcDrill]),
  s(20, ['핵심 요약 노트', 'LC/RC 고빈출 어휘·표현']),
]

const PARK_W: InstructorPlan = {
  headline: 'W형(골고루) · 750+ 1개월',
  principles: [
    { rule: 'W형은 전체 파트 감각 유지', how: 'LC를 우선 배치하되, 1주차부터 RC Part 5를 함께 배치' },
    { rule: '박혜원 강사의 LC 우선 전략 반영', how: '초반에 LC Part 2와 Part 1을 먼저 넣어 듣기 점수 기반 형성' },
    { rule: 'LC 순서 고정', how: 'LC Part 2 → Part 1 → Part 3 → Part 4 순서 유지' },
    { rule: 'RC는 병행 학습', how: 'RC Part 5 고빈출 문법을 매일 조금씩 병행' },
    { rule: 'Part 7은 너무 늦지 않게 시작', how: '2주차 후반부터 단일 지문을 배치해 독해 감각 유지' },
    { rule: '고난도 독해는 후반 배치', how: 'RC Part 7 이중·삼중 지문은 3주차 후반에 배치' },
  ],
  weeks: [
    {
      week: 1,
      title: 'LC Part 2·1 우선 + RC Part 5 기본 병행',
      goal: 'LC Part 2·1로 듣기 점수 기반을 만들고, RC Part 5 기본 문법 병행',
      days: [
        d(1, ['LC3', 'LC4'], NOTE_P2),
        d(2, ['LC5', 'LC6'], NOTE_P2),
        d(3, ['LC1', 'LC2', 'RC2']),
        d(4, ['LC7', 'RC5', 'RC3']),
        d(5, ['LC8', 'RC7', 'RC4']),
      ],
    },
    {
      week: 2,
      title: 'LC Part 3·4 확장 + RC Part 5·6 정리',
      goal: 'LC Part 3로 확장하고, RC Part 5 후반·Part 6·Part 7 기본 지문 진입',
      days: [
        d(6, ['LC9', 'RC11', 'RC6'], NOTE_P5),
        d(7, ['LC10', 'RC9', 'RC8'], NOTE_P5),
        d(8, ['LC11', 'RC13', 'RC12'], NOTE_P5),
        d(9, ['LC12', 'RC17', 'RC10']),
        d(10, ['LC13', 'RC19', 'RC16']),
      ],
    },
    {
      week: 3,
      title: 'LC Part 4 마무리 + RC Part 7 완성',
      goal: 'LC Part 4와 RC Part 7 고난도까지 정규 수업 마무리',
      days: [
        d(11, ['LC14', 'RC21', 'RC18']),
        d(12, ['LC15', 'RC23', 'RC20']),
        d(13, ['LC16', 'RC14', 'RC22'], NOTE_P5),
        d(14, ['RC15', 'RC24'], NOTE_P5),
        d(15, ['RC25', 'RC26']),
      ],
    },
    {
      week: 4,
      title: '오답 기반 시험 직전 특강 (1~3주차 학습 데이터 기반으로 약점 보완)',
      goal: '많이 틀린 유형을 시험 직전 특강으로 보완',
      days: PARK_LEE_SPECIAL('LC 오답 소거 훈련'),
    },
  ],
}

const PARK_N: InstructorPlan = {
  headline: 'N형(우선순위) · 750+ 1개월',
  principles: [
    { rule: 'N형은 빠른 점수 확보 우선', how: '1주차 초반에 LC Part 2·1을 집중 배치해 짧고 점수화 쉬운 파트를 먼저 확보' },
    { rule: '박혜원 강사의 LC 우선 전략 강하게 반영', how: '초반에는 LC Part 2·1을 우선 배치하되, 이후에는 LC와 RC를 병행해 실전 점수 균형 확보' },
    { rule: 'LC 순서 고정', how: 'LC 안에서는 반드시 Part 2 → Part 1 → Part 3 → Part 4 순서 유지' },
    { rule: 'LC Part 2·1 우선 선점', how: 'D1~D2에 LC Part 2·1을 먼저 완료' },
    { rule: 'LC Part 3 + RC Part 5·6 고빈출 병행', how: 'LC Part 3를 진행하면서 RC Part 5·6을 고빈출 문법 순서로 함께 정리' },
    { rule: 'RC Part 5 고빈출 우선', how: '품사 → 명사/대명사 → 형용사/부사 → 동사 → 수일치 → 시제 → 태 → 전치사/접속사 → 준동사 → 분사 → 관계사 → 어휘형 빈칸 순서로 배치' },
    { rule: 'Part 7은 후반 집중', how: 'LC와 Part 5·6 기반을 잡은 뒤 3주차에 Part 7을 집중 배치' },
    { rule: '고난도 지문 후반 배치', how: '이중·삼중 지문은 3주차 후반에 배치' },
  ],
  weeks: [
    {
      week: 1,
      title: 'LC Part 2·1 집중 + RC Part 5 핵심',
      goal: 'LC Part 2·1을 먼저 잡고 RC Part 5 핵심 문법 진입 — 빠른 점수 확보를 위해 LC 비중을 가장 높게 배치',
      days: [
        d(1, ['LC3', 'LC4', 'LC5'], NOTE_P2),
        d(2, ['LC6', 'LC1', 'LC2'], NOTE_P2),
        d(3, ['LC7', 'RC2', 'RC3'], NOTE_P5),
        d(4, ['LC8', 'RC4', 'RC5'], NOTE_P5),
        d(5, ['LC9', 'RC6', 'RC7'], NOTE_P5),
      ],
    },
    {
      week: 2,
      title: 'LC Part 3·4 확장 + RC Part 5 고빈출·Part 6 정리',
      goal: 'LC Part 3·4로 확장하고 RC Part 5 고빈출·Part 6 정리 — LC 점수 기반을 유지하면서 RC 핵심 문법을 완성',
      days: [
        d(6, ['LC10', 'RC8', 'RC11'], NOTE_P5),
        d(7, ['LC11', 'RC12', 'RC9'], NOTE_P5),
        d(8, ['RC10', 'RC13', 'RC16'], NOTE_P5),
        d(9, ['RC17', 'RC18', 'RC14'], NOTE_P5),
        d(10, ['RC15', 'LC12', 'LC13']),
      ],
    },
    {
      week: 3,
      title: 'LC Part 4 마무리 + RC Part 7 집중',
      goal: 'RC Part 7 단일 지문부터 이중·삼중 지문까지 집중 학습 — 후반부에 긴 독해와 고난도 지문 처리력 강화',
      days: [
        d(11, ['LC14', 'LC15', 'RC19']),
        d(12, ['LC16', 'RC20', 'RC21']),
        d(13, ['RC23', 'RC24', 'RC22']),
        d(14, ['RC25'], NOTE_P5),
        d(15, ['RC26']),
      ],
    },
    {
      week: 4,
      title: '오답 기반 시험 직전 특강 (1~3주차 학습 데이터 기반으로 약점 보완)',
      goal: '많이 틀린 유형을 시험 직전 특강으로 보완',
      days: PARK_LEE_SPECIAL('LC 오답 소거 훈련'),
    },
  ],
}

/* ═══════════════════════════════════════
   이도윤 — 직청직독형 (R + C)
   ═══════════════════════════════════════ */

const LEE_W: InstructorPlan = {
  headline: 'W형(골고루) · 750+ 1개월',
  principles: [
    { rule: '전체 파트 감각 유지', how: '1~2주차에 LC + RC Part 5 + RC Part 7을 매일 배치' },
    { rule: '이도윤식 직청직독', how: 'LC는 짧은 표현에서 긴 대화로, RC는 문장 구조에서 지문 독해로 확장' },
    { rule: 'Part 7 난이도 조절', how: '단일 지문은 초반에 배치하고, 이중·삼중 지문은 3주차 후반으로 이동' },
    { rule: 'Part 5 고빈출 문법 기반 학습', how: '품사 → 명사/대명사 → 형용사/부사 → 동사 구조 → 준동사 → 연결 구조 순으로 배치' },
    /* 시트 원문은 'LC 17강'이지만 실제 배치도, DB도 LC 16강이다 — 17강 기준 목록의 잔재라 정정했다 */
    { rule: '3주 내 정규 완강', how: 'LC 16강 + RC 26강을 1~3주차 안에 모두 포함' },
  ],
  weeks: [
    {
      week: 1,
      title: 'LC + RC 문법 + RC 독해 (균등) — 파트 순서대로',
      goal: '토익 전 파트 감각을 초반부터 열어두는 단계 — LC 짧은 표현·응답, RC Part 5 고빈출 문법, Part 7 기본 지문을 동시에 시작',
      days: [
        d(1, ['LC1', 'LC2']),
        d(2, ['LC3', 'RC2', 'RC19']),
        d(3, ['LC4', 'RC3', 'RC20']),
        d(4, ['LC5', 'RC4', 'RC21']),
        d(5, ['LC6', 'RC5', 'RC22']),
      ],
    },
    {
      week: 2,
      title: 'LC + RC 문법 + RC 독해 (균등)',
      goal: '짧은 문장 중심 학습에서 긴 대화와 정보형 지문으로 확장 — LC Part 3로 확장하고, RC Part 5 기본 문법과 Part 7 기본 지문을 마무리',
      days: [
        d(6, ['LC7', 'RC6', 'RC23']),
        d(7, ['LC8', 'RC7', 'RC24']),
        d(8, ['LC9', 'RC8', 'RC17']),
        d(9, ['LC10', 'RC9', 'RC18']),
        d(10, ['LC11', 'RC10', 'RC11']),
      ],
    },
    {
      week: 3,
      title: 'LC + RC 문법 + RC 독해 (난도 높은 파트)',
      goal: '긴 듣기와 어려운 독해를 후반에 배치해 난이도 자연 상승 — LC Part 4, RC Part 5 후반, Part 7 이중·삼중 지문까지 마무리',
      days: [
        d(11, ['LC12', 'RC12', 'RC13']),
        d(12, ['LC13', 'RC14', 'RC15']),
        d(13, ['LC14', 'RC16']),
        d(14, ['LC15', 'RC25']),
        d(15, ['LC16', 'RC26']),
      ],
    },
    {
      week: 4,
      title: '오답 기반 시험 직전 특강 (1~3주차 학습 데이터 기반으로 약점 보완)',
      goal: '개인별 약점 기반으로 시험 전 점수 손실을 줄이는 단계 — 많이 틀린 유형을 시험 직전 특강으로 보완',
      days: PARK_LEE_SPECIAL('LC 직청직해 훈련'),
    },
  ],
}

const LEE_N: InstructorPlan = {
  headline: 'N형(우선순위) · 750+ 1개월',
  principles: [
    { rule: '빠른 점수 확보', how: '1주차에 LC Part 1, 2 + RC Part 5 고빈출 문법 집중' },
    { rule: 'Part 5 안에서도 고빈출 우선', how: '품사, 명사/대명사, 형용사/부사, 동사, 수일치, 시제, 태를 먼저 배치' },
    { rule: 'LC Part 3·4는 후반 확장', how: '짧은 응답 구조를 잡은 뒤 긴 대화와 담화로 확장' },
    { rule: 'RC Part 7은 단계적 확장', how: '단일 지문 → 정보형 지문 → 이중·삼중 지문 순으로 배치' },
  ],
  weeks: [
    {
      week: 1,
      title: 'LC Part 1·2 (빠른 점수 확보) + RC Part 5 (고빈출순)',
      goal: '짧고 명확한 LC Part 1을 하루에 끝내며 듣기 감각을 빠르게 여는 단계 — 이후 Part 2와 RC Part 5 고빈출 문법으로 빠른 정답률 확보',
      days: [
        d(1, ['LC1', 'LC2']),
        d(2, ['LC3', 'LC4', 'RC2']),
        d(3, ['LC5', 'LC6', 'RC3']),
        d(4, ['RC4', 'RC5', 'RC6']),
        d(5, ['RC7', 'RC8', 'RC11']),
      ],
    },
    {
      week: 2,
      title: 'LC Part 3 + RC Part 5·6 (고빈출순) + RC Part 7',
      goal: '빠른 득점 파트에서 전체 파트로 넘어가는 단계 — LC Part 3, RC Part 5 후반, Part 6·7 기본 지문으로 확장',
      days: [
        d(6, ['LC7', 'RC12', 'RC9']),
        d(7, ['LC8', 'RC10', 'RC13']),
        d(8, ['LC9', 'RC16', 'RC14']),
        d(9, ['LC10', 'RC15', 'RC17']),
        d(10, ['LC11', 'RC18', 'RC19']),
      ],
    },
    {
      week: 3,
      title: 'LC Part 4 + RC Part 7 (난도 상승)',
      goal: '긴 듣기와 복수 지문까지 포함해 시험 범위를 완성 — LC Part 4와 Part 7 고난도 지문까지 정규 수업 마무리',
      days: [
        d(11, ['LC12', 'RC20', 'RC21']),
        d(12, ['LC13', 'RC22', 'RC23']),
        d(13, ['LC14', 'RC24']),
        d(14, ['LC15', 'RC25']),
        d(15, ['LC16', 'RC26']),
      ],
    },
    {
      week: 4,
      title: '오답 기반 시험 직전 특강 (1~3주차 학습 데이터 기반으로 약점 보완)',
      goal: '개인별 약점 유형을 집중 보완해 실전 안정성 확보 — 많이 틀린 유형을 시험 직전 특강으로 보완',
      days: PARK_LEE_SPECIAL('LC 직청직해 훈련'),
    },
  ],
}

/* ═══════════════════════════════════════
   윤다은 · 서지안 — 파트별 실전 특강 4주차 (시트 공통)
   ───────────────────────────────────────
   시트는 SR2/SL4 같은 내부 코드로 적혀 있다. 학습자가 못 알아보는 표기라
   코드는 떼고 파트·유형만 남겼다. 정규 42강 밖이라 DB 조인 대상이 아니다.
   ═══════════════════════════════════════ */
const SP_P5_VERB = 'Part 5 동사·준동사 특강'
const SP_P5_LINK = 'Part 5 연결구조 특강'
const SP_P5_VOCA = 'Part 5 어휘·collocation 특강'
const SP_P6_CTX = 'Part 6 문맥형 특강'
const SP_P7_DTL = 'Part 7 세부·조건 특강'
const SP_P7_NOT = 'Part 7 NOT·패러프레이징 특강'
const SP_P7_MULTI = 'Part 7 이중·삼중 연결 특강'
const SP_P1_TRAP = 'Part 1 오답 함정 특강'
const SP_P2_IND = 'Part 2 우회 응답 특강'
const SP_P3_WHY = 'Part 3 이유·세부 특강'
const SP_P3_ACT = 'Part 3 요청·다음 행동 특강'
const SP_P4_TOPIC = 'Part 4 주제·대상 특강'
const SP_P3_INT = 'Part 3 의도·시각자료 특강'
const SP_P4_DTL = 'Part 4 세부·변경 특강'
const SP_P4_REQ = 'Part 4 요청·조건 특강'

const SPECIAL_WEEK_GOAL = '파트별 실전 대비 특강 + 매주 토요일 모의고사 1회'

/* ═══════════════════════════════════════
   윤다은 — 하이텐션 핵심포인트형 (P + S)
   ═══════════════════════════════════════ */

const YUN_SPECIAL: DayPlan[] = [
  s(16, [SP_P5_VERB, SP_P5_LINK, SP_P1_TRAP]),
  s(17, [SP_P5_VOCA, SP_P2_IND, SP_P3_WHY]),
  s(18, [SP_P6_CTX, SP_P7_DTL, SP_P3_ACT]),
  s(19, [SP_P7_NOT, SP_P3_INT, SP_P4_TOPIC]),
  s(20, [SP_P7_MULTI, SP_P4_DTL, SP_P4_REQ]),
]

const YUN_W: InstructorPlan = {
  headline: 'W형(골고루) · 750+ 1개월',
  principles: [
    { rule: '교차 진행 전략 반영', how: '매일 한 차시 안에 LC·RC를 함께 배치해 두 영역 점수를 동시에 느끼게 함' },
    { rule: '커리큘럼 순서 보존', how: '정해진 강의 순서를 그대로 두고 LC·RC만 교차 → 전체 감각 균형 유지' },
    { rule: '기초부터 점진 확장', how: 'Part 1·Part 5 기초 유형부터 시작, 1~3주 난이도 급상승 없이 차근차근 쌓기' },
    { rule: '초반 점수 체감 우선', how: '처음부터 LC·RC를 함께 다뤄 초반부터 양쪽 모두에서 정답 맞히는 경험을 쌓게 함' },
    { rule: 'RC 후반 강의 묶음', how: 'Part 6·Part 7처럼 길고 어려운 RC는 3주차 후반에 모아서 배치' },
    { rule: '4주 파트별 실전 특강', how: SPECIAL_WEEK_GOAL },
  ],
  weeks: [
    {
      week: 1,
      title: '커리 순서 보존 + LC·RC 교차 — 전체 감각 유지',
      days: [
        d(1, ['LC1', 'RC2']), // 시트 D1 = L1·L2 + R2 (L2 는 DB에 없어 제외)
        d(2, ['RC3', 'RC4', 'LC2']),
        d(3, ['LC3', 'LC4', 'RC5']),
        d(4, ['RC6', 'RC7', 'LC5']),
        d(5, ['LC6', 'LC7', 'RC8']),
      ],
    },
    {
      week: 2,
      title: '커리 순서 보존 + LC·RC 교차 — 전체 감각 유지',
      days: [
        d(6, ['RC9', 'RC10', 'LC8']),
        d(7, ['LC9', 'LC10', 'RC11']),
        d(8, ['RC12', 'RC13', 'LC11']),
        d(9, ['LC12', 'LC13', 'RC14']),
        d(10, ['RC15', 'RC16', 'LC14']),
      ],
    },
    {
      week: 3,
      title: '커리 순서 보존 + LC·RC 교차 → RC 남은 강의 배치',
      days: [
        d(11, ['LC15', 'LC16', 'RC17']),
        d(12, ['RC18', 'RC19', 'RC20']),
        d(13, ['RC21', 'RC22']),
        d(14, ['RC23', 'RC24']),
        d(15, ['RC25', 'RC26']),
      ],
    },
    {
      week: 4,
      title: '시험 직전 특강 (파트별 실전 처방)',
      goal: SPECIAL_WEEK_GOAL,
      days: YUN_SPECIAL,
    },
  ],
}

const YUN_N: InstructorPlan = {
  headline: 'N형(우선순위) · 750+ 1개월',
  principles: [
    { rule: '교차 진행 전략 반영 (하이텐션)', how: '우선순위 구간 안에서도 LC·RC를 매일 섞어 배치' },
    { rule: '빠른 점수 체감 우선', how: '점수가 잘 오르는 영역을 앞쪽에 배치해 초반부터 실력 향상을 직접 느끼게 함' },
    { rule: '4주 파트별 실전 특강', how: SPECIAL_WEEK_GOAL },
  ],
  weeks: [
    {
      week: 1,
      title: '규칙으로 풀리는 문법 + 쉬운 LC로 바로 점수 얻기',
      goal: '외울 것 없이 규칙만 알면 풀리는 RC Part 5 문법 + 쉬운 LC Part 1·2를 먼저 배치해 기본 정답률을 빠르게 다져놓음',
      days: [
        d(1, ['RC2', 'RC3', 'LC1']),
        d(2, ['LC2', 'RC4']), // 시트 D2 = L2·L3 + R4 (L2 는 DB에 없어 제외)
        d(3, ['RC5', 'RC6', 'LC3']),
        d(4, ['LC4', 'LC5', 'RC7']),
        d(5, ['RC8', 'RC9', 'LC6']),
      ],
    },
    {
      week: 2,
      title: 'LC Part 3·4 집중',
      goal: '문항 수가 가장 많은 LC Part 3·4에 집중해 총점을 가장 크게 끌어올리고 RC 문법 나머지 부분 마무리',
      days: [
        d(6, ['RC10', 'RC11', 'LC7']),
        d(7, ['LC8', 'LC9', 'RC12']),
        d(8, ['RC13', 'RC14', 'LC10']),
        d(9, ['LC11', 'LC12', 'LC13']),
        d(10, ['LC14', 'LC15', 'LC16']),
      ],
    },
    {
      week: 3,
      title: 'RC Part 6·Part 7 쌓아가기',
      goal: '지문이 가장 길고 앞 내용을 이어받아 푸는 Part 7을 3주차에 집중, Part 5 남은 부분 + Part 6도 함께 심화',
      days: [
        d(11, ['RC15', 'RC16', 'RC17']),
        d(12, ['RC18', 'RC19', 'RC20']),
        d(13, ['RC21', 'RC22']),
        d(14, ['RC23', 'RC24']),
        d(15, ['RC25', 'RC26']),
      ],
    },
    {
      week: 4,
      title: '시험 직전 특강 (파트별 실전 처방)',
      goal: SPECIAL_WEEK_GOAL,
      days: YUN_SPECIAL,
    },
  ],
}

/* ═══════════════════════════════════════
   서지안 — 차분한 흐름구조형 (R + S)
   ═══════════════════════════════════════ */

const SEO_SPECIAL: DayPlan[] = [
  s(16, [SP_P5_VERB, SP_P5_LINK, SP_P5_VOCA]),
  s(17, [SP_P6_CTX, SP_P1_TRAP, SP_P2_IND]),
  s(18, [SP_P3_WHY, SP_P3_ACT, SP_P3_INT]),
  s(19, [SP_P4_TOPIC, SP_P4_DTL, SP_P4_REQ]),
  s(20, [SP_P7_DTL, SP_P7_NOT, SP_P7_MULTI]),
]

const SEO_W: InstructorPlan = {
  headline: 'W형(골고루) · 750+ 1개월',
  principles: [
    { rule: '한 파트 완결 후 이동 (흐름·구조)', how: '한 파트를 끝까지 다 끝낸 뒤에야 다음 파트로 넘어감 → 흐름과 구조가 끊기지 않게 유지' },
    { rule: '커리큘럼 순서 보존', how: '점수 효율순으로 재배열하지 않고, 정해진 강의 순서를 파트 단위로 그대로 유지' },
    { rule: '4주 파트별 실전 특강', how: SPECIAL_WEEK_GOAL },
  ],
  weeks: [
    {
      week: 1,
      title: '파트 블록 교차 (절충) — RC Part 5 완결',
      goal: 'RC Part 5 문법 전체를 1주차에 한 덩어리로 끝까지 학습',
      days: [
        d(1, ['RC2', 'RC3', 'RC4']),
        d(2, ['RC5', 'RC6', 'RC7']),
        d(3, ['RC8', 'RC9', 'RC10']),
        d(4, ['RC11', 'RC12', 'RC13']),
        d(5, ['RC14', 'RC15', 'RC16']),
      ],
    },
    {
      week: 2,
      title: '파트 블록 교차 — LC Part 1·2 완결 → RC Part 6·7 단일',
      goal: 'LC Part 1·2를 다 끝낸 뒤, RC Part 6과 단일 Part 7로 이동',
      days: [
        d(6, ['LC1', 'LC2']), // 시트 D6 = L1·L2·L3 (L2 는 DB에 없어 제외)
        d(7, ['LC3', 'LC4', 'LC5', 'LC6']),
        d(8, ['RC17', 'RC18', 'RC19']),
        d(9, ['RC20', 'RC21', 'RC22']),
        d(10, ['RC23', 'RC24']),
      ],
    },
    {
      week: 3,
      title: '파트 블록 교차 — RC Part 6·7 복합 → LC Part 3·4 완결',
      goal: '이중·삼중 지문 등 복합 Part 7을 마친 뒤, LC Part 3·4를 끝까지 학습',
      days: [
        d(11, ['RC25', 'RC26']),
        d(12, ['LC7', 'LC8', 'LC9']),
        d(13, ['LC10', 'LC11', 'LC12']),
        d(14, ['LC13', 'LC14']),
        d(15, ['LC15', 'LC16']),
      ],
    },
    {
      week: 4,
      title: '시험 직전 특강 (파트별 실전 처방)',
      goal: SPECIAL_WEEK_GOAL,
      days: SEO_SPECIAL,
    },
  ],
}

const SEO_N: InstructorPlan = {
  headline: 'N형(우선순위) · 750+ 1개월',
  principles: [
    { rule: '한 파트 완결 후 이동 (흐름·구조)', how: '우선순위 구간 안에서도 한 파트를 다 끝내고 다음 파트로 이동' },
    { rule: '같은 구간 안에서도 한 파트씩 끝내기 우선', how: '점수 효율순으로 묶인 구간 안에서도 RC → LC를 한 파트씩 다 끝내고 넘어가 흐름을 유지' },
    { rule: '4주 파트별 실전 특강', how: SPECIAL_WEEK_GOAL },
  ],
  weeks: [
    {
      week: 1,
      title: '규칙으로 풀리는 문법 + 쉬운 LC로 바로 점수 얻기',
      goal: 'RC Part 5 문법 규칙 + 쉬운 LC Part 1·2로 기본 정답률을 빠르게 다져놓음',
      days: [
        d(1, ['RC2', 'RC3', 'RC4']),
        d(2, ['RC5', 'RC6', 'RC7']),
        d(3, ['RC8', 'RC9', 'LC1']),
        d(4, ['LC2', 'LC3']), // 시트 D4 = L2·L3·L4 (L2 는 DB에 없어 제외)
        d(5, ['LC4', 'LC5', 'LC6']),
      ],
    },
    {
      week: 2,
      title: 'LC Part 3·4 집중',
      goal: '문항 수가 가장 많은 LC Part 3·4에 집중해 총점을 가장 크게 끌어올리고 RC 문법 마무리',
      days: [
        d(6, ['RC10', 'RC11', 'RC12']),
        d(7, ['RC13', 'RC14', 'LC7']),
        d(8, ['LC8', 'LC9', 'LC10']),
        d(9, ['LC11', 'LC12', 'LC13']),
        d(10, ['LC14', 'LC15', 'LC16']),
      ],
    },
    {
      week: 3,
      title: 'RC Part 6·Part 7 쌓아가기',
      goal: '가장 길고 앞 내용을 이어받아 푸는 Part 7을 3주차에 집중, Part 5 남은 부분 + Part 6 심화',
      days: [
        d(11, ['RC15', 'RC16', 'RC17']),
        d(12, ['RC18', 'RC19', 'RC20']),
        d(13, ['RC21', 'RC22']),
        d(14, ['RC23', 'RC24']),
        d(15, ['RC25', 'RC26']),
      ],
    },
    {
      week: 4,
      title: '시험 직전 특강 (파트별 실전 처방)',
      goal: SPECIAL_WEEK_GOAL,
      days: SEO_SPECIAL,
    },
  ],
}

/* ═══════════════════════════════════════
   조회
   ───────────────────────────────────────
   W형/N형은 **콘텐츠팀이 각각 따로 설계한 별개 배치**다. 한쪽에서 규칙으로 다른 쪽을
   만들면 안 된다 — 예를 들어 박혜원 N형은 "LC를 모두 끝낸 뒤 RC"가 아니라
   초반에 LC Part 2·1을 선점한 뒤 LC·RC를 병행한다(시트 설계 기준에 명시).
   설계 시트가 없는 강사(오정자)는 상세 페이지가 주차 카드로 폴백한다.
   ═══════════════════════════════════════ */

export const INSTRUCTOR_PLANS: Record<string, { W: InstructorPlan; N: InstructorPlan }> = {
  park_hyewon: { W: PARK_W, N: PARK_N },
  lee_doyun: { W: LEE_W, N: LEE_N },
  yun_daeun: { W: YUN_W, N: YUN_N },
  seo_jian: { W: SEO_W, N: SEO_N },
}

/** 강사 + 학습 범위 성향(W 골고루 / N 우선순위)으로 커리큘럼을 고른다 */
export function getInstructorPlan(
  instId: string, rangeAxis: 'W' | 'N' | null,
): InstructorPlan | undefined {
  const pair = INSTRUCTOR_PLANS[instId]
  if (!pair) return undefined
  return rangeAxis === 'N' ? pair.N : pair.W
}
