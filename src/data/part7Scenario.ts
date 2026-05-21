export interface Choice {
  id: 'A' | 'B' | 'C' | 'D'
  text: string
}

export interface Question {
  number: number
  text: string
  choices: Choice[]
  correct: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

export interface AdFeature {
  text: string
  positive: boolean
}

export interface AdData {
  headline: string
  subtitle: string
  features: AdFeature[]
  urgencyNote: string
  contact: { name: string; phone: string }
}

export interface Part7Set {
  id: string
  questionRange: string
  passageType: string
  passage: string
  adData?: AdData
  questions: Question[]
}

export interface P7Turn {
  id: string
  script: string
  videoSrc?: string
  inputType: 'voice' | 'button'
  nextTurnId?: string
  onButton?: 'DONE'
  /** Q148 정답을 강조 표시할 시점 */
  revealAnswer?: boolean
}

export const P7_TURNS: Record<string, P7Turn> = {
  p7_t1: {
    id: 'p7_t1',
    videoSrc: '/part7/P7_1.mp4',
    script: '148번 문제 같이 풀어보자. 질문부터 봅시다. Why is Ms. Ghorbani selling her car? 여기서 why는 무엇을 묻는 말일까?',
    inputType: 'voice',
    nextTurnId: 'p7_t2',
  },
  p7_t2: {
    id: 'p7_t2',
    videoSrc: '/part7/P7_2.mp4',
    script: '맞아. 그럼 이 문제는 무엇의 이유를 묻고 있어?',
    inputType: 'voice',
    nextTurnId: 'p7_t3',
  },
  p7_t3: {
    id: 'p7_t3',
    videoSrc: '/part7/P7_3.mp4',
    script: '그렇지. 지문에서 차를 파는 이유가 나온 문장을 찾아볼까?',
    inputType: 'voice',
    nextTurnId: 'p7_t4',
  },
  p7_t4: {
    id: 'p7_t4',
    videoSrc: '/part7/P7_4.mp4',
    script: '그 문장을 먼저 볼게. 그 문장은 어떤 내용이야?',
    inputType: 'voice',
    nextTurnId: 'p7_t5',
  },
  p7_t5: {
    id: 'p7_t5',
    videoSrc: '/part7/P7_5.mp4',
    script: '그렇지. 그럼 이 문장은 차를 파는 이유를 말해, 아니면 차의 상태를 설명해?',
    inputType: 'voice',
    nextTurnId: 'p7_t6',
  },
  p7_t6: {
    id: 'p7_t6',
    videoSrc: '/part7/P7_6.mp4',
    script: '그러면 why 문제니까 차의 상태보다 판매 이유가 직접 나온 문장을 찾아야 해. 지문 끝부분을 다시 볼까?',
    inputType: 'voice',
    nextTurnId: 'p7_t7',
  },
  p7_t7: {
    id: 'p7_t7',
    videoSrc: '/part7/P7_7.mp4',
    script: '좋아. 여기서 going overseas는 무슨 뜻일까?',
    inputType: 'voice',
    nextTurnId: 'p7_t8',
  },
  p7_t8: {
    id: 'p7_t8',
    videoSrc: '/part7/P7_8.mp4',
    script: '맞아. 그리고 must sell the car는 어떤 뜻일까?',
    inputType: 'voice',
    nextTurnId: 'p7_t9',
  },
  p7_t9: {
    id: 'p7_t9',
    videoSrc: '/part7/P7_9.mp4',
    script: '그럼 Ms. Ghorbani가 차를 파는 이유는 뭐야?',
    inputType: 'voice',
    nextTurnId: 'p7_t10',
  },
  p7_t10: {
    id: 'p7_t10',
    script: '그 내용과 가장 가까운 선택지는 뭘까?',
    inputType: 'voice',
    nextTurnId: 'p7_t11',
  },
  p7_t11: {
    id: 'p7_t11',
    videoSrc: '/part7/P7_11.mp4',
    script: '그렇지. 정답은 D, She is leaving for another country야. 처음에 본 heater 문장은 왜 답의 근거가 아니었을까?',
    inputType: 'voice',
    nextTurnId: 'p7_t12',
    revealAnswer: true,
  },
  p7_t12: {
    id: 'p7_t12',
    videoSrc: '/part7/P7_12.mp4',
    script: '아주 좋아. why 문제에서는 지문에 나온 내용 중에서도 이유를 설명하는 문장을 정확히 찾아야 해.',
    inputType: 'button',
    onButton: 'DONE',
    revealAnswer: true,
  },
}

export const PART7_SETS: Part7Set[] = [
  {
    id: 'set_147_148',
    questionRange: 'Questions 147-148',
    passageType: 'advertisement',
    passage: `Used Car For Sale. Six-year-old Carlisle Custom. Only one owner. Low mileage. Car used to commute short distances to town. Brakes and tires replaced six months ago. Struts replaced two weeks ago. Air conditioning works well, but heater takes a while to warm up. Brand new spare tire included. Priced to sell. Owner going overseas at the end of this month and must sell the car. Call Firoozeh Ghorbani at (848) 555-0132.`,
    adData: {
      headline: 'USED CAR FOR SALE',
      subtitle: 'Six-year-old Carlisle Custom',
      features: [
        { text: 'Only one owner',                                   positive: true  },
        { text: 'Low mileage',                                      positive: true  },
        { text: 'Used to commute short distances to town',          positive: true  },
        { text: 'Brakes and tires replaced six months ago',         positive: true  },
        { text: 'Struts replaced two weeks ago',                    positive: true  },
        { text: 'Air conditioning works well',                      positive: true  },
        { text: 'Heater takes a while to warm up',                  positive: false },
        { text: 'Brand new spare tire included',                    positive: true  },
      ],
      urgencyNote: 'Priced to sell. Owner going overseas at the end of this month and must sell the car.',
      contact: { name: 'Firoozeh Ghorbani', phone: '(848) 555-0132' },
    },
    questions: [
      {
        number: 147,
        text: 'What is suggested about the car?',
        choices: [
          { id: 'A', text: 'It was recently repaired.' },
          { id: 'B', text: 'It has had more than one owner.' },
          { id: 'C', text: 'It is very fuel efficient.' },
          { id: 'D', text: 'It has been on sale for six months.' },
        ],
        correct: 'A',
        explanation: '"Struts replaced two weeks ago"에서 최근 수리된 것을 알 수 있어요.',
      },
      {
        number: 148,
        text: 'According to the advertisement, why is Ms. Ghorbani selling her car?',
        choices: [
          { id: 'A', text: "She cannot repair the car's temperature control." },
          { id: 'B', text: 'She finds it difficult to maintain.' },
          { id: 'C', text: 'She would like to have a newer model.' },
          { id: 'D', text: 'She is leaving for another country.' },
        ],
        correct: 'D',
        explanation: '"Owner going overseas at the end of this month"에서 해외로 떠나기 때문에 판매한다는 것을 알 수 있어요.',
      },
    ],
  },
]

export const DIRECTIONS =
  'In this part you will read a selection of texts, such as magazine and newspaper articles, e-mails, and instant messages. Each text or set of texts is followed by several questions. Select the best answer for each question and mark the letter (A), (B), (C), or (D) on your answer sheet.'
