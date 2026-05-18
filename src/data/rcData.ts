export type RCChoices = [string, string, string, string]

export interface P5Question {
  id: number
  sentence: string
  choices: RCChoices
  answer: number
  explanation: string
  category: string
}

export interface P6BlankQuestion {
  blankNum: number
  choices: RCChoices
  answer: number
  explanation: string
  category: string
}

export interface P6Passage {
  id: number
  title: string
  passage: string
  questions: P6BlankQuestion[]
}

export interface P7Question {
  id: number
  question: string
  choices: RCChoices
  answer: number
  explanation: string
}

export interface P7Passage {
  id: number
  title: string
  passage: string
  questions: P7Question[]
}

export const P5_QUESTIONS: P5Question[] = [
  {
    id: 1,
    sentence: 'The annual sales report _______ by the accounting team before the quarterly board meeting.',
    choices: ['prepared', 'was prepared', 'has prepare', 'is preparing'],
    answer: 1,
    explanation: '주어(The annual sales report)가 "작성되는" 수동적 관계이므로, 과거 수동태 was prepared가 정답입니다.',
    category: '수동태',
  },
  {
    id: 2,
    sentence: 'Ms. Kim _______ for this company since she graduated from university ten years ago.',
    choices: ['worked', 'has worked', 'is working', 'works'],
    answer: 1,
    explanation: '"since + 과거시점"과 함께 현재완료(has worked)를 사용하여 과거부터 현재까지 계속되는 상태를 나타냅니다.',
    category: '시제',
  },
  {
    id: 3,
    sentence: 'The new employee completed her training _______ and received high praise from her manager.',
    choices: ['successful', 'success', 'successfully', 'succeed'],
    answer: 2,
    explanation: '동사(completed)를 수식하려면 부사(successfully)가 필요합니다. -ly로 끝나는 부사형이 정답입니다.',
    category: '품사',
  },
  {
    id: 4,
    sentence: 'Please submit your travel expense report _______ the end of each month.',
    choices: ['until', 'since', 'by', 'during'],
    answer: 2,
    explanation: '마감 기한을 나타낼 때는 전치사 "by(~까지)"를 사용합니다. "until"은 어떤 상태가 계속 유지될 때 씁니다.',
    category: '전치사',
  },
  {
    id: 5,
    sentence: 'The company plans to _______ its headquarters to a larger building in the city center next year.',
    choices: ['relocate', 'replace', 'remove', 'rename'],
    answer: 0,
    explanation: '더 큰 건물로 이사한다는 문맥에서 relocate(장소를 옮기다)가 가장 적합합니다.',
    category: '어휘',
  },
  {
    id: 6,
    sentence: '_______ the project was behind schedule, the team worked overtime to meet the deadline.',
    choices: ['Despite', 'Although', 'Since', 'Unless'],
    answer: 1,
    explanation: '빈칸 뒤에 절이 오며, "늦었음에도 야근했다"는 역접 의미이므로 Although(비록 ~이지만)가 적합합니다.',
    category: '접속사',
  },
  {
    id: 7,
    sentence: 'Each of the participants _______ asked to sign a confidentiality agreement before the meeting.',
    choices: ['are', 'is', 'were', 'have been'],
    answer: 1,
    explanation: '"Each of + 복수명사" 구조에서는 동사를 단수로 씁니다. is asked가 정답입니다.',
    category: '수일치',
  },
  {
    id: 8,
    sentence: 'The consultant _______ we hired last month has extensive experience in financial management.',
    choices: ['which', 'whose', 'whom', 'where'],
    answer: 2,
    explanation: '선행사(The consultant)가 사람이고 관계절에서 목적어 역할을 하므로, 목적격 관계대명사 whom이 정답입니다.',
    category: '관계대명사',
  },
]

export const P6_PASSAGES: P6Passage[] = [
  {
    id: 1,
    title: 'Internal Memo – Remote Work Policy',
    passage: `To: All Department Managers\nFrom: Jennifer Walsh, Human Resources Director\nSubject: Updated Remote Work Policy\n\nI am writing to inform you of changes to our company's remote work policy, which will be (1)_______ on February 1.\n\nUnder the updated guidelines, eligible employees may work remotely for up to two days per week. All remote work requests must be (2)_______ to the department manager at least five business days in advance.\n\nEmployees working from home remain (3)_______ for maintaining their regular work schedules and attending all team meetings via video conference. Managers should (4)_______ that their teams continue to meet performance expectations regardless of work location.\n\nShould you have any questions, please contact the HR department directly.\n\nBest regards,\nJennifer Walsh`,
    questions: [
      {
        blankNum: 1,
        choices: ['implementation', 'implemented', 'implementing', 'implements'],
        answer: 1,
        explanation: '"will be + 과거분사" 형태의 미래 수동태로, "정책이 시행될 것"이라는 의미의 implemented가 정답입니다.',
        category: '수동태',
      },
      {
        blankNum: 2,
        choices: ['submitted', 'submitting', 'to submit', 'a submission'],
        answer: 0,
        explanation: '"must be + 과거분사" 형태의 수동태로, "제출되어야 한다"는 의미의 submitted가 정답입니다.',
        category: '수동태',
      },
      {
        blankNum: 3,
        choices: ['responsibly', 'responsible', 'responsibility', 'responds'],
        answer: 1,
        explanation: '"remain + 형용사" 구조로, "책임이 있는 상태로 남아있다"는 의미의 형용사 responsible이 정답입니다.',
        category: '품사',
      },
      {
        blankNum: 4,
        choices: ['ensured', 'ensuring', 'ensure', 'ensures'],
        answer: 2,
        explanation: '"should + 동사원형" 구조이므로 동사원형 ensure(확인하다)가 정답입니다.',
        category: '동사형',
      },
    ],
  },
]

export const P7_PASSAGES: P7Passage[] = [
  {
    id: 1,
    title: 'Advertisement – Greenwood Business Supplies',
    passage: `Greenwood Business Supplies\nYear-End Clearance Sale\n\nGreenwood Business Supplies is pleased to announce its annual year-end clearance sale, running from December 14 through December 30. All in-store and online merchandise will be discounted by up to 35% off regular retail prices.\n\nFeatured discounts include:\n  • Office furniture: up to 35% off\n  • Computer peripherals and accessories: up to 30% off\n  • Stationery and filing supplies: up to 25% off\n\nAs a special promotion, customers who spend $150 or more will receive complimentary gift wrapping and free standard delivery within the metropolitan area. Online orders must be placed no later than December 26 to guarantee delivery before the New Year holiday.\n\nGreenwood Business Supplies is located at 48 Commerce Street and is open Monday through Saturday, 9:00 A.M. to 7:00 P.M. Our website at www.greenwoodsupplies.com is available 24 hours a day.`,
    questions: [
      {
        id: 1,
        question: 'What is the main purpose of this advertisement?',
        choices: [
          'To introduce a new product line',
          'To announce a seasonal sale event',
          'To notify customers of a change in store hours',
          'To inform customers of a new store location',
        ],
        answer: 1,
        explanation: '광고의 주목적은 연말 할인 행사(year-end clearance sale)를 알리는 것입니다. "pleased to announce its annual year-end clearance sale"에서 확인할 수 있습니다.',
      },
      {
        id: 2,
        question: 'Which item category is offered at the highest discount rate?',
        choices: [
          'Computer peripherals and accessories',
          'Stationery and filing supplies',
          'Office furniture',
          'All categories have the same discount',
        ],
        answer: 2,
        explanation: '사무용 가구(Office furniture)가 최대 35% 할인으로 가장 높은 할인율을 제공합니다.',
      },
      {
        id: 3,
        question: 'What must customers spend to qualify for free delivery?',
        choices: [
          '$100 or more',
          '$150 or more',
          '$200 or more',
          '$250 or more',
        ],
        answer: 1,
        explanation: '"customers who spend $150 or more will receive... free standard delivery"에서 $150 이상 구매 시 무료 배송 혜택을 받을 수 있음을 알 수 있습니다.',
      },
      {
        id: 4,
        question: 'By what date must online orders be placed to receive delivery before the New Year?',
        choices: [
          'December 14',
          'December 26',
          'December 30',
          'January 1',
        ],
        answer: 1,
        explanation: '"Online orders must be placed no later than December 26 to guarantee delivery before the New Year holiday"에서 12월 26일까지 주문해야 함을 확인할 수 있습니다.',
      },
    ],
  },
]
