/**
 * 튜터링 엔진용 "구조 데이터" (manyfast S-TEIRZE 준수)
 * - 문항은 대화 스크립트가 아니라 구조 데이터로 등록한다.
 * - 정답/근거/오답이유는 DB 원문만 사용한다 (S-CHNXPN 할루시네이션 가드).
 * - rail = 유형별 풀이 절차(레일). 각 step은 에이전트가 끌어낼 "목표"이며 대사가 아니다.
 */
import { PART7_SETS } from './part7Scenario'

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
}

export interface TutorChoice {
  id: 'A' | 'B' | 'C' | 'D'
  text: string
  correct: boolean
  wrongReason?: string
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
]

export function getTutorQuestion(num: number): TutorQuestion | undefined {
  return TUTOR_QUESTIONS.find((q) => q.number === num)
}
