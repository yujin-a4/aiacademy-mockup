/**
 * 튜터링 엔진용 "구조 데이터" (manyfast S-TEIRZE 준수)
 * - 문항은 대화 스크립트가 아니라 구조 데이터로 등록한다.
 * - 정답/근거/오답이유는 DB 원문만 사용한다 (S-CHNXPN 할루시네이션 가드).
 * - rail = 유형별 풀이 절차(레일). 각 step은 에이전트가 끌어낼 "목표"이며 대사가 아니다.
 */
import { PART7_SETS } from './part7Scenario'
import { SCREEN1_PROBLEM } from './lessonScenario'

export type StepKind = 'progress' | 'checkpoint'

export interface TutorStep {
  id: string
  kind: StepKind
  /** 에이전트가 이 턴에 학생에게서 끌어낼 목표 (대사 아님) */
  objective: string
  /** 체크포인트 채점용 키워드 (S-XXPUSD: 키워드 매칭). 음성→텍스트 변환 답변과 대조 */
  keywords?: string[]
  /** 요청형 3단계 힌트 (S-PKUSSP). 모두 DB 근거 기반 */
  hints?: [string, string, string]
  /** ⑥ 정답 근거 공개 시 인용할 DB 원문 */
  reveal?: string
  /**
   * 학생 입력에 따른 분기 (S-XTAZHH 확장).
   * 정답은 아니지만 특정 오답/오개념을 골랐을 때, 그 오개념을 콕 집어 교정한 뒤 재시도시킨다.
   * keywords가 매칭되면 해당 directive로 분기. 정답 매칭이 우선한다.
   */
  branches?: { keywords: string[]; directive: string }[]
  /**
   * 이 단계에서 학생이 고를 수 있는 답이 소수의 정해진 선택지일 때, 그 버튼 라벨.
   * 클라이언트는 이 값을 세션의 "지금 단계"에 묶어 그대로 버튼으로 렌더링한다 —
   * 에이전트 발화 텍스트를 정규식으로 추측하지 않는다 (예전 실험의 오탐 원인이었음).
   * 클릭 시 그 라벨 문자열이 그대로 학생 답변(text)으로 채점된다.
   */
  quickReplies?: string[]
}

/** Part 5 공통 표준 오답 태그 (AI어학원 콘텐츠 시트 "스캐폴딩 설계(초안)" 탭 기준) */
export type Part5WrongTag =
  | '품사·형태 불일치형'
  | '구조 불일치형'
  | '의미 부적절형'
  | '형태 유사 혼동형'
  | '콜로케이션 불일치형'

export interface TutorChoice {
  id: 'A' | 'B' | 'C' | 'D'
  text: string
  correct: boolean
  wrongReason?: string
  /** 오답 선택지의 표준 오답 태그 (S6 오답 제거 단계에서 인용) */
  wrongTag?: Part5WrongTag
}

export interface TutorQuestion {
  number: number
  type: string
  text: string
  passage: string
  choices: TutorChoice[]
  answer: 'A' | 'B' | 'C' | 'D'
  /** DB 정답 근거 원문 (RC=문장) */
  evidence: string
  difficulty: 'C' | 'S'
  role: 'representative' | 'practice'
  rail: TutorStep[]
  /** 문법 유형 코드 (강의 코드와 매칭, 예: RC-P5-08 능동태·수동태) */
  grammarType?: string
}

const SET = PART7_SETS[0]
const Q148 = SET.questions.find((q) => q.number === 148)!

/** Part 7 "why 이유" 유형 레일 — 8단계 골격 기반 체크포인트 시퀀스 */
const WHY_REASON_RAIL: TutorStep[] = [
  {
    id: 's1',
    kind: 'progress',
    objective: '광고에서 "이 사람 차를 빨리/반드시 팔고 싶어한다"가 느껴지는 표현을 학생이 하나 말하게 한다.',
    keywords: ['priced to sell', 'must sell', '빨리', '반드시', '팔아', '팔려', 'sell', '급하'],
    hints: [
      '광고 맨 끝 두 문장을 다시 보라고 시선을 좁혀줘라.',
      '"Priced to sell", "must sell the car" 두 표현 중 하나로 시선을 유도해라.',
      '"must sell the car" — 반드시 팔아야 한다는 표현이야.',
    ],
  },
  {
    id: 's2',
    kind: 'checkpoint',
    objective: '질문의 why가 묻는 것이 "이유"가 맞는지 학생이 확인하게 한다. (이유 / 목적 / 상태 중)',
    keywords: ['이유', '왜', 'reason', 'because', 'why'],
    hints: [
      'what이 아니라 why라는 점에 시선을 줘라.',
      'why는 무엇을 묻는 의문사인지 떠올리게 해라.',
      'why는 "이유"를 묻는 거야.',
    ],
  },
  {
    id: 's3',
    kind: 'checkpoint',
    objective: '무엇을 하는 이유인지 — 즉 "차를 파는 이유"를 묻는 문제임을 학생이 짚게 한다.',
    keywords: ['차', '파', '판매', 'sell', 'selling', 'car'],
    hints: [
      '질문 문장에서 동사가 무엇인지 보게 해라.',
      'selling her car — 무엇을 하는 행동이야?',
      '"차를 파는" 이유를 묻는 거야.',
    ],
  },
  {
    id: 's4',
    kind: 'checkpoint',
    objective: '지문에서 차를 파는 "이유"가 직접 드러난 문장을 학생이 찾게 한다. 앞이 아니라 끝부분으로 유도한다.',
    keywords: ['overseas', 'going overseas', '해외', '떠나', '이달', 'must sell', '끝', '마지막'],
    hints: [
      '이유 문장은 보통 광고 앞이 아니라 끝에 나온다고 범위를 좁혀줘라.',
      '"Owner going overseas... must sell the car" 문장으로 시선을 유도해라.',
      '근거 문장은 "Owner going overseas at the end of this month and must sell the car."야.',
    ],
  },
  {
    id: 's5',
    kind: 'checkpoint',
    objective: 'going overseas 와 must sell the car 의 뜻을 학생이 자기 말로 해석하게 한다.',
    keywords: ['해외', '외국', '다른 나라', '떠나', '나가', '반드시', '팔아야'],
    hints: [
      'overseas가 어디를 뜻하는지 물어라.',
      'going overseas = 해외로 나간다, must sell = 반드시 판다.',
      '해외로 떠나서 차를 반드시 팔아야 한다는 뜻이야.',
    ],
  },
  {
    id: 's6',
    kind: 'checkpoint',
    objective: '그 해석과 가장 가까운 보기를 학생이 직접 고르게 한다. (정답 D로 유도하되 먼저 말하지 않는다)',
    keywords: ['d', '디', 'leaving', 'another country', '다른 나라', '떠나', '외국'],
    reveal: Q148.explanation,
    branches: [
      {
        keywords: ['에이', '히터', 'heater', '온도', 'temperature', '고장', '냉난방'],
        directive:
          '학생이 A(온도조절/히터)를 골랐다. "히터 얘기는 차의 상태 설명이지 차를 파는 이유가 아니야"라고 콕 집어 교정하고, 파는 이유가 나온 문장을 다시 떠올리게 한 뒤 보기를 다시 고르게 해라. 정답은 말하지 마라.',
      },
      {
        keywords: ['비', '유지', '관리', 'maintain', '힘들'],
        directive:
          '학생이 B(유지가 힘들어서)를 골랐다. 지문에 "관리가 힘들다"는 근거가 실제로 있는지 학생에게 되물어라. 없으면 다시 고르게 해라.',
      },
      {
        keywords: ['씨', '새 차', '새차', 'newer', '신차'],
        directive:
          '학생이 C(새 차를 원해서)를 골랐다. 지문에 "더 새 차를 원한다"는 근거가 있는지 되물어라. 없으면 다시 고르게 해라.',
      },
    ],
    hints: [
      '해외로 떠난다 = 보기 중 어느 것과 같은 말인지 비교하게 해라.',
      'D) She is leaving for another country 와 네 해석을 대조하게 해라.',
      '정답은 D, She is leaving for another country야.',
    ],
  },
  {
    id: 's7',
    kind: 'checkpoint',
    objective: '"heater takes a while to warm up" 문장이 왜 정답 근거가 될 수 없는지 학생이 한 줄로 설명하게 한다.',
    keywords: ['상태', '설명', '이유 아', '이유가 아', '아니', 'condition', '기능'],
    hints: [
      'heater 문장이 "이유"인지 "차의 상태 설명"인지 구분하게 해라.',
      '히터가 늦게 데워진다는 건 차를 파는 이유가 아니라 무엇에 대한 설명이야?',
      '그건 파는 이유가 아니라 차의 상태(기능) 설명일 뿐이야.',
    ],
  },
  {
    id: 's8',
    kind: 'progress',
    objective: 'why 문제를 풀 때 무엇을, 특히 지문의 어느 부분을 봐야 하는지 학생이 한 문장으로 정리하게 하고 마무리한다.',
    keywords: ['이유', '근거', '문장', '끝', '찾'],
  },
]

/**
 * Part 5 "능동태·수동태" 레일 (RC8강, 유형코드 RC-P5-08)
 * "AI어학원 콘텐츠" 시트 "[공통] 스케폴딩 기본 설계 (유형학습)" 탭이 지정한 진행 순서 그대로:
 * S1(핵심단서) → S3(개념코칭) → S4(구조파악) → S2(유형판별) → S6(오답제거) → S5(정답근거연결) → S7(표현정리)
 * id는 시트의 S코드를 그대로 쓰되, 배열 순서 = 실제 진행 순서(엔진은 배열 순서만 본다).
 */
const PASSIVE_VOICE_RAIL: TutorStep[] = [
  {
    id: 's1',
    kind: 'checkpoint',
    objective: '빈칸이 동사 자리인지 확인하고 문장의 주어를 찾게 하며, 문장 끝 "by" 같은 수동태 단서 표현도 함께 짚게 한다.',
    keywords: ['issues', '이슈', '주어', 'subject', 'by', 'team', '팀'],
    quickReplies: ['technical issues', 'server'],
    branches: [
      {
        keywords: ['server', '서버'],
        directive:
          '학생이 server를 주어로 골랐다. "server"는 "with the server"라는 전치사구 안의 명사일 뿐, 문장 전체의 주어가 아니라고 짚어주고 진짜 주어를 다시 찾게 해라. 정답은 말하지 마라.',
      },
    ],
    hints: [
      '문장 맨 앞부터 훑어보면서 어떤 명사가 주어인지 시선을 좁혀줘라.',
      '"The technical issues"가 이 문장의 주어야. 그리고 문장 맨 끝에 by가 있는지 보게 해라.',
      '주어는 issues, 문장 끝에 "by our IT support team"이 있어 — 수동태 신호야.',
    ],
  },
  {
    id: 's3',
    kind: 'progress',
    objective: '능동태(주어가 동작을 하는 구조)와 수동태(주어가 동작을 당하는 구조)의 기준을 짧게 설명하고 다음 단계로 넘어간다.',
  },
  {
    id: 's4',
    kind: 'checkpoint',
    objective: '빈칸 뒤에 목적어가 있는지 확인해서 능동/수동 가능성을 구조적으로 좁히게 한다.',
    // '목적어'는 두 버튼 라벨에 공통으로 들어가므로 키워드에서 빼고 '없'으로만 정오를 가른다.
    keywords: ['없', 'no object', '없어', '없다'],
    quickReplies: ['목적어 있음', '목적어 없음'],
    branches: [
      {
        keywords: ['있음', '있어', '있다'],
        directive:
          '학생이 목적어가 있다고 골랐다. "promptly"는 부사지 목적어(명사)가 아니라고 짚어주고, 목적어 유무를 다시 확인하게 해라. 정답은 말하지 마라.',
      },
    ],
    hints: [
      '빈칸 바로 뒤에 나오는 게 명사(목적어)인지 부사인지 보게 해라.',
      '"promptly by..." — 목적어 자리에 명사가 있는지 물어라.',
      '목적어가 없어. 그래서 능동태(handled + 목적어) 형태는 쓸 수 없고 수동태 자리야.',
    ],
  },
  {
    id: 's2',
    kind: 'checkpoint',
    objective: '주어(issues)가 동작을 하는 대상인지 당하는 대상인지 학생이 판단하게 한다.',
    keywords: ['당하', '처리되', '수동', 'passive', '받는'],
    quickReplies: ['능동 (하는 대상)', '수동 (당하는 대상)'],
    branches: [
      {
        keywords: ['능동'],
        directive:
          '학생이 능동(하는 대상)을 골랐다. issues가 IT팀을 처리하는 게 아니라 IT팀에 의해 처리되는 쪽이라고 짚어주고 다시 판단하게 해라. 정답은 말하지 마라.',
      },
    ],
    hints: [
      'issues가 뭔가를 하는 건지, 당하는 건지 다시 생각하게 해라.',
      '이슈가 IT팀을 처리하는 거야, IT팀이 이슈를 처리하는 거야?',
      '이슈는 처리되는 대상이야. 그래서 수동태가 맞아.',
    ],
  },
  {
    id: 's6',
    kind: 'checkpoint',
    objective: '태·형태가 맞지 않는 보기를 표준 오답 태그 기준으로 하나씩 제거하게 한다. 정답을 먼저 말하지 말고, 지우는 이유만 태그대로 설명해라.',
    keywords: ['b', '비', '남', 'were handled'],
    quickReplies: ['A) handled', 'B) were handled', 'C) handling', 'D) was handled'],
    // 주의: 'was handled'는 'handled'를 부분 문자열로 포함하므로, 반드시 D(was handled)를
    // A(handled)보다 먼저 검사해야 한다 — 아니면 D 클릭이 A 분기로 잘못 매칭된다.
    branches: [
      {
        keywords: ['was handled', '디'],
        directive:
          '학생이 D(was handled)를 남겼다. "구조 불일치형"이라고 짚어줘라 — 주어 issues는 복수인데 was는 단수라서 수일치가 안 맞는다고 설명하고 다시 고르게 해라. 정답은 말하지 마라.',
      },
      {
        keywords: ['handling', '씨'],
        directive:
          '학생이 C(handling)를 남겼다. "품사·형태 불일치형"이라고 짚어줘라 — 동사 자리에 분사/동명사형은 올 수 없다고 설명하고 다시 고르게 해라.',
      },
      {
        keywords: ['handled', '에이'],
        directive:
          '학생이 A(handled)를 남겼다. "구조 불일치형"이라고 짚어줘라 — 목적어 없이 능동태 과거형을 쓰면 태가 맞지 않는다고 설명하고 다시 고르게 해라.',
      },
    ],
    hints: [
      '남은 세 개 보기 중 형태가 이상한 것부터 짚어보게 해라.',
      'handled(능동), handling(분사), was handled(단수 동사) — 이 셋이 왜 안 되는지 하나씩 물어라.',
      '목적어 없는 능동태(handled)·정형동사가 아닌 형태(handling)·수일치 오류(was handled)는 전부 제거해야 해.',
    ],
  },
  {
    id: 's5',
    kind: 'checkpoint',
    objective: '남은 선택지(were handled)가 주어-동작 관계, 그리고 뒤에 오는 "by our IT support team"과 자연스럽게 연결되는지 최종 확인하게 한다.',
    keywords: ['were handled', '맞아', '연결', '팀에 의해', '처리됐'],
    reveal: 'issues(복수 주어)가 IT support team에 의해 처리되는 대상이므로 수동태 were handled가 정답. 원문: "The technical issues with the server were handled promptly by our IT support team."',
    hints: [
      'were handled를 빈칸에 넣고 문장을 처음부터 다시 읽어보게 해라.',
      'issues(복수) — were(복수 동사) — handled(p.p.) — by team, 이 흐름이 맞는지 확인하게 해라.',
      '정답은 were handled야. 복수 주어 issues와 수 일치하고, by 이하와도 자연스럽게 연결돼.',
    ],
  },
  {
    id: 's7',
    kind: 'progress',
    objective: '수동태 빈출 패턴(be + p.p. + by)과 오늘 배운 문장을 한 문장으로 정리하며 마무리한다.',
  },
]

const P5_PASSIVE_SENTENCE = SCREEN1_PROBLEM.words
  .map((w, i) => (i === SCREEN1_PROBLEM.blankIndex ? '_____' : w))
  .join(' ')

const PASSIVE_VOICE_QUESTION: TutorQuestion = {
  number: 5008,
  type: 'passive_voice',
  text: '다음 문장의 빈칸에 알맞은 것을 고르세요.',
  passage: P5_PASSIVE_SENTENCE,
  choices: SCREEN1_PROBLEM.choices.map((c) => ({
    id: c.id as 'A' | 'B' | 'C' | 'D',
    text: c.text,
    correct: c.text === SCREEN1_PROBLEM.correctAnswer,
    wrongReason:
      c.id === 'A'
        ? '목적어 없이 능동태 과거형을 쓰면 태가 맞지 않는다.'
        : c.id === 'C'
          ? '동사 자리에 분사/동명사형은 올 수 없다.'
          : c.id === 'D'
            ? '주어 issues(복수)와 단수 동사 was가 수일치하지 않는다.'
            : undefined,
    wrongTag:
      c.id === 'A' ? '구조 불일치형' : c.id === 'C' ? '품사·형태 불일치형' : c.id === 'D' ? '구조 불일치형' : undefined,
  })),
  answer: 'B',
  evidence:
    'issues(복수 주어)가 IT support team에 의해 처리되는 대상이므로 수동태 were handled가 정답. 원문: "The technical issues with the server were handled promptly by our IT support team."',
  difficulty: 'C',
  role: 'representative',
  rail: PASSIVE_VOICE_RAIL,
  grammarType: 'RC-P5-08',
}

export const TUTOR_QUESTIONS: TutorQuestion[] = [
  {
    number: 148,
    type: 'why_reason',
    text: Q148.text,
    passage: SET.passage,
    choices: Q148.choices.map((c) => ({
      id: c.id,
      text: c.text,
      correct: c.id === Q148.correct,
      wrongReason:
        c.id === 'A'
          ? '"heater takes a while to warm up"은 차의 상태 설명일 뿐 파는 이유가 아니다.'
          : c.id === 'B' || c.id === 'C'
            ? '지문에 근거가 없다.'
            : undefined,
    })),
    answer: Q148.correct,
    evidence: Q148.explanation + ' (원문: "Owner going overseas at the end of this month and must sell the car.")',
    difficulty: 'S',
    role: 'representative',
    rail: WHY_REASON_RAIL,
  },
  PASSIVE_VOICE_QUESTION,
]

export function getTutorQuestion(num: number): TutorQuestion | undefined {
  return TUTOR_QUESTIONS.find((q) => q.number === num)
}
