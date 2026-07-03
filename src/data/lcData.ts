/* 리스닝(Part 1~4) 샘플 콘텐츠 — 프로토타입 LESSON_META에서 포팅.
   공용 ListeningScreen이 이 데이터로 도입/수업/실전/정리를 구동. */

export interface LCQuestion {
  prompt: string
  choices: string[]
  answer: number
  explanation: string
  /** Part 1: 문제별 사진 (보기는 음성으로만 제공) */
  imageUrl?: string
  /** Part 2 등: 문제별 음원 텍스트 (없으면 지문 공유 = media.playText) */
  audioText?: string
}

export type LCMedia =
  | { kind: 'photo'; imageUrl: string }
  | { kind: 'audio'; label: string; playText: string; transcript?: { speaker?: string; text: string }[] }

export interface LCSummaryBlank {
  before: string
  blank: string
  after: string
  accept: string[]
}

export interface LCPart {
  no: number
  name: string
  introScript: string
  introPoints: { text: string }[]
  tutorScript: string
  media: LCMedia
  questions: LCQuestion[]
  summary: LCSummaryBlank[]
  closing: string
  /** 파트별 ElevenLabs 에이전트 (없으면 공용 에이전트 사용) */
  agentId?: string
  /** 에이전트 오프닝 인사말 (없으면 자동 생성) */
  agentGreeting?: string
}

export const LC_PARTS: Record<number, LCPart> = {
  1: {
    no: 1,
    name: '사진 묘사',
    introScript: '안녕하세요! 오늘은 Part 1 사진 묘사를 배울 거예요. 사진 속 주어와 동작을 빠르게 파악하는 전략을 익혀볼게요. 준비됐죠? 😊',
    introPoints: [
      { text: '주어가 사람인지 사물인지 먼저 확인' },
      { text: '현재진행형(is/are + -ing) 자주 출제' },
      { text: '수동태 묘사(is being + p.p.) 주의' },
    ],
    tutorScript: '사진을 볼 때는 먼저 주어가 사람인지 사물인지 확인해요. 사람이면 동작을, 사물이면 상태를 봐요. 지금 사진 속 인물이 무엇을 하고 있는지 볼까요?',
    media: { kind: 'photo', imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=640&h=400&fit=crop' },
    questions: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=640&h=400&fit=crop',
        prompt: '사진을 가장 잘 묘사한 문장을 고르세요.',
        choices: [
          'A man is reading a report at his desk.',
          'Two people are shaking hands in an office.',
          'A woman is typing on a keyboard.',
          'The chairs are being arranged by workers.',
        ],
        answer: 2,
        explanation: "사진 속 인물의 동작을 현재진행형으로 묘사한 'A woman is typing on a keyboard.'가 정답이에요.",
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=640&h=400&fit=crop',
        prompt: 'Which statement best describes the scene?',
        choices: [
          'Several boxes are stacked on a shelf.',
          'A woman is carrying documents down a hallway.',
          'Chairs are placed around an empty table.',
          'A man is repairing a machine outside.',
        ],
        answer: 1,
        explanation: '복도에서 서류를 들고 걷는 여성 → 사람+동작 → is carrying.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=640&h=400&fit=crop',
        prompt: 'Which description fits a scene where goods are being unloaded?',
        choices: [
          'Workers are arguing loudly.',
          'Packages are being unloaded from the truck.',
          'A truck is parked in the garage.',
          'Men are loading boxes onto a shelf.',
        ],
        answer: 1,
        explanation: '주어(Packages)가 행위를 당하는 상황 → is being unloaded (수동 진행).',
      },
    ],
    summary: [
      { before: '사진 묘사는 주어가 ', blank: '사람', after: '인지 사물인지 먼저 확인한다.', accept: ['사람'] },
      { before: '동작은 주로 ', blank: '현재진행형', after: '(is/are + -ing)으로 묘사된다.', accept: ['현재진행', '진행형', 'ing'] },
      { before: '주어가 행위를 당하면 ', blank: '수동태', after: ' 묘사(is being + p.p.)에 주의한다.', accept: ['수동태', '수동'] },
    ],
    closing: '오늘 배운 Part 1 핵심! 주어가 사람인지 사물인지 확인하고, 현재진행형 동작 묘사에 집중하고, 수동태 묘사 함정에 주의하세요. 잘하셨어요!',
  },

  2: {
    no: 2,
    name: '질의응답',
    introScript: '안녕하세요! 오늘은 Part 2 질의응답을 배울 거예요. 질문의 첫 단어, 즉 의문사를 순간적으로 잡아내는 전략을 익혀볼게요. 준비됐죠? 😊',
    introPoints: [
      { text: '첫 단어(의문사)에 집중' },
      { text: 'Yes/No로 시작하는 오답 함정 주의' },
      { text: '간접 응답도 정답이 될 수 있음' },
    ],
    tutorScript: '질의응답은 질문의 첫 단어가 핵심이에요. When으로 시작하면 시간, Where면 장소를 답하는 응답을 골라야 해요. 지금 질문을 듣고 무엇을 묻는지 파악해볼까요?',
    media: {
      kind: 'audio',
      label: '질문 듣기',
      playText: 'When will the new product be launched?',
      transcript: [{ text: 'When will the new product be launched?' }],
    },
    questions: [
      {
        audioText: 'When will the new product be launched? A, Sometime next quarter. B, Yes, it is a great product. C, In the main conference room.',
        prompt: '들려준 질문에 가장 알맞은 응답을 고르세요.',
        choices: ['Sometime next quarter.', "Yes, it's a great product.", 'In the main conference room.'],
        answer: 0,
        explanation: "미래 시점을 묻는 When 질문 → 'Sometime next quarter.'가 정답이에요.",
      },
      {
        audioText: 'Where is the quarterly report kept? A, It is due next Monday. B, In the shared folder on the server. C, Yes, she submitted it already.',
        prompt: '들려준 질문에 가장 알맞은 응답을 고르세요.',
        choices: ["It's due next Monday.", 'In the shared folder on the server.', 'Yes, she submitted it already.'],
        answer: 1,
        explanation: 'Where → 장소로 응답. In the shared folder가 정답이에요.',
      },
      {
        audioText: 'Who is in charge of the client presentation? A, It is scheduled for Thursday. B, The presentation was excellent. C, Sarah from the marketing team.',
        prompt: '들려준 질문에 가장 알맞은 응답을 고르세요.',
        choices: ["It's scheduled for Thursday.", 'The presentation was excellent.', 'Sarah from the marketing team.'],
        answer: 2,
        explanation: 'Who → 사람으로 응답. Sarah from the marketing team이 정답이에요.',
      },
    ],
    summary: [
      { before: 'Part 2는 질문의 ', blank: '첫 단어', after: '(의문사)에 집중한다.', accept: ['첫단어', '의문사', '첫 단어'] },
      { before: '', blank: 'Yes/No', after: '로 시작하는 오답 함정에 주의한다.', accept: ['yes', 'no', '예', '아니오'] },
      { before: '', blank: '간접', after: ' 응답도 정답이 될 수 있다.', accept: ['간접'] },
    ],
    closing: '오늘 배운 Part 2 핵심! 질문의 첫 단어(의문사)에 집중하고, Yes/No 함정을 조심하고, 간접 응답도 정답일 수 있다는 걸 기억하세요. 수고했어요!',
  },

  3: {
    no: 3,
    name: '짧은 대화',
    introScript: '안녕하세요! 오늘은 Part 3 짧은 대화를 배울 거예요. 두 사람의 대화에서 목적·장소·다음 행동을 잡아내는 전략을 익혀볼게요. 준비됐죠? 😊',
    introPoints: [
      { text: '대화 첫 문장에서 상황/장소 파악' },
      { text: '화자의 다음 행동(next action) 자주 출제' },
      { text: '도표 연계 문제는 선택지 먼저 훑기' },
    ],
    tutorScript: '짧은 대화는 첫 문장에서 상황과 장소를 잡는 게 중요해요. 그리고 마지막 부분에 화자가 다음에 할 일이 자주 나와요. 대화를 듣고 남자가 다음에 할 일을 찾아볼까요?',
    media: {
      kind: 'audio',
      label: '대화 듣기',
      playText: 'Have you finished the quarterly report yet? Almost. I just need to add the sales figures. Can you send it to me by 3 PM? Sure, I will email it as soon as it is done.',
      transcript: [
        { speaker: 'W', text: 'Have you finished the quarterly report yet?' },
        { speaker: 'M', text: 'Almost. I just need to add the sales figures from last week.' },
        { speaker: 'W', text: 'Can you send it to me by 3 PM? The manager needs it for the meeting.' },
        { speaker: 'M', text: "Sure, I'll email it to you as soon as it's done." },
      ],
    },
    questions: [
      {
        prompt: 'What will the man do next?',
        choices: ['Attend a meeting', 'Complete the report', 'Call the manager'],
        answer: 1,
        explanation: '남자가 마지막에 보고서를 완성해 이메일로 보내겠다고 했어요 → Complete the report.',
      },
      {
        prompt: 'Where does the conversation most likely take place?',
        choices: ['At a restaurant', 'In an office', 'At a hospital'],
        answer: 1,
        explanation: '보고서·매니저·미팅 언급 → 사무실 대화.',
      },
      {
        prompt: 'What does the woman imply when she says the manager needs it?',
        choices: ['The manager will write the report', 'The report is urgent', 'The manager is late'],
        answer: 1,
        explanation: '매니저가 필요하다 = 급하다(urgent). 화자의 의도 파악 문제예요.',
      },
    ],
    summary: [
      { before: '대화 첫 문장에서 상황·', blank: '장소', after: '를 파악한다.', accept: ['장소'] },
      { before: '화자의 다음 ', blank: '행동', after: '이 자주 출제된다.', accept: ['행동'] },
      { before: '도표 연계 문제는 선택지를 ', blank: '먼저', after: ' 훑는다.', accept: ['먼저'] },
    ],
    closing: '오늘 배운 Part 3 핵심! 대화 첫 문장에서 장소를 잡고, 화자의 다음 행동에 집중하고, 도표 문제는 선택지를 먼저 보세요. 잘하셨어요!',
  },

  4: {
    no: 4,
    name: '설명문',
    introScript: '안녕하세요! 오늘은 Part 4 짧은 담화를 배울 거예요. 공지·안내·광고에서 주제와 목적을 첫 문장에서 잡아내는 전략을 익혀볼게요. 준비됐죠? 😊',
    introPoints: [
      { text: '담화 유형(공지/광고/뉴스) 먼저 파악' },
      { text: '특정 정보(날짜·장소·이유) 놓치지 않기' },
      { text: '마지막 문장에 행동 요청이 자주 나옴' },
    ],
    tutorScript: '짧은 담화는 첫 한두 문장에서 주제와 목적을 잡는 게 핵심이에요. 그리고 특정 정보와 마지막 행동 요청을 놓치지 마세요. 지금 안내 방송을 듣고 지연 이유를 찾아볼까요?',
    media: {
      kind: 'audio',
      label: '담화 듣기',
      playText: 'Attention all passengers. Flight KE203 to New York has been delayed due to a technical inspection. The new departure time is 4:30 PM. Please remain in the gate area. Complimentary refreshments are available at Gate B12.',
      transcript: [{ text: 'Attention all passengers. Flight KE203 to New York has been delayed due to a technical inspection. The new departure time is 4:30 PM. We apologize for the inconvenience and ask that you remain in the gate area. Complimentary refreshments are available at Gate B12.' }],
    },
    questions: [
      {
        prompt: 'Why is the flight delayed?',
        choices: ['Bad weather conditions', 'A technical inspection', 'Crew shortage'],
        answer: 1,
        explanation: "'delayed due to a technical inspection' → 기술 점검 때문에 지연됐어요.",
      },
      {
        prompt: 'Where is this announcement most likely being made?',
        choices: ['At a train station', 'At an airport', 'In a shopping mall'],
        answer: 1,
        explanation: 'Flight·passengers·gate → 공항 안내 방송.',
      },
      {
        prompt: 'What are listeners asked to do?',
        choices: ['Board the plane immediately', 'Check in at the counter', 'Remain in the gate area'],
        answer: 2,
        explanation: 'ask that you remain in the gate area → 게이트에서 대기 요청.',
      },
    ],
    summary: [
      { before: '담화 유형(공지/광고)을 ', blank: '먼저', after: ' 파악한다.', accept: ['먼저'] },
      { before: '날짜·장소·이유 등 ', blank: '특정 정보', after: '를 놓치지 않는다.', accept: ['특정정보', '특정 정보', '정보'] },
      { before: '마지막 문장의 ', blank: '행동 요청', after: '을 확인한다.', accept: ['행동요청', '요청', '행동 요청'] },
    ],
    closing: '오늘 배운 Part 4 핵심! 담화 유형을 먼저 파악하고, 특정 정보를 놓치지 말고, 마지막 행동 요청을 확인하세요. 수고 많았어요!',
  },
}
