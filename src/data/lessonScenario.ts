import type { VoiceBranch } from '@/lib/matchBranch'

export type InputType = 'voice' | 'draw' | 'choice' | 'button' | 'none'
export type DrawHint = 'underline' | 'circle'

export interface LessonTurn {
  id: string
  screen: number
  /** 강사 영상 파일 경로 (없으면 TTS fallback) */
  videoSrc?: string
  /** 로컬 MP3 오디오 파일 경로 (있으면 TTS 대신 사용) */
  audioSrc?: string
  /** TTS 스크립트 / 자막 */
  script: string
  inputType: InputType
  drawHint?: DrawHint
  voiceBranches?: VoiceBranch[]
  defaultNextTurnId?: string
  onDraw?: string
  /** 'NEXT_SCREEN' 또는 특정 turnId */
  onButton?: string
  buttonLabel?: string
  /** 정답으로 하이라이트할 선택지 ID (예: 'B') */
  highlightChoiceId?: string
  /** 타이머 (초) — choice 타입에서 사용 */
  timerSeconds?: number
  /** 타이머 만료 시 이동할 turnId */
  onTimerExpire?: string
}

/* ═══════════════════════════════════════════════
   SCREEN 1 — 문제 데이터 (600점 강사 주도)
═══════════════════════════════════════════════ */
export const SCREEN1_PROBLEM = {
  partLabel: '1단계 · 문제 유형 학습',
  topic: 'Part 5 수동태',
  words: [
    'The', 'technical', 'issues', 'with', 'the', 'server',
    '______',
    'promptly', 'by', 'our', 'IT', 'support', 'team.',
  ],
  blankIndex: 6,
  correctAnswer: 'were handled',
  choices: [
    { id: 'A', text: 'handled' },
    { id: 'B', text: 'were handled' },
    { id: 'C', text: 'handling' },
    { id: 'D', text: 'was handled' },
  ],
}

/* ═══════════════════════════════════════════════
   SCREEN 2 — 문제 데이터 (750점 학생 주도)
═══════════════════════════════════════════════ */
export const SCREEN2_PROBLEM = {
  partLabel: '1단계 · 문제 유형 학습',
  topic: 'Part 5 수동태',
  words: [
    'Visitors', 'to', 'the', 'manufacturing', 'facility',
    '______',
    'to', 'wear', 'safety', 'goggles', 'at', 'all', 'times.',
  ],
  blankIndex: 5,
  correctAnswer: 'are required',
  choices: [
    { id: 'A', text: 'require' },
    { id: 'B', text: 'are required' },
    { id: 'C', text: 'have required' },
    { id: 'D', text: 'requiring' },
  ],
  timerSeconds: 15,
}

/* ═══════════════════════════════════════════════
   SCREEN 3 — 실전 문제 세트
═══════════════════════════════════════════════ */
export const SCREEN3_PROBLEMS = [
  {
    number: 'Q1',
    words: [
      'The', 'monthly', 'sales', 'report', '______',
      'by', 'the', 'regional', 'manager',
      'to', 'evaluate', 'the', "team's", 'performance.',
    ],
    blankIndex: 4,
    correctAnswer: 'is reviewed',
    choices: [
      { id: 'A', text: 'reviews' },
      { id: 'B', text: 'is reviewing' },
      { id: 'C', text: 'is reviewed' },
      { id: 'D', text: 'has reviewed' },
    ],
    explanation: 'monthly sales report가 검토를 받는 대상이므로 수동태 필요',
  },
  {
    number: 'Q2',
    words: [
      'The', 'defective', 'products', '______',
      'from', 'the', 'store', 'shelves',
      'after', 'the', 'safety', 'issue', 'was', 'reported.',
    ],
    blankIndex: 3,
    correctAnswer: 'were removed',
    choices: [
      { id: 'A', text: 'removed' },
      { id: 'B', text: 'were removed' },
      { id: 'C', text: 'have removed' },
      { id: 'D', text: 'removing' },
    ],
    explanation: 'products가 제거되는 대상. after ~ was reported → 과거 시제. 복수 주어이므로 were removed',
  },
  {
    number: 'Q3',
    words: [
      'The', 'new', 'company', 'policy', '______',
      'to', 'all', 'staff', 'members',
      'via', 'email', 'next', 'week.',
    ],
    blankIndex: 4,
    correctAnswer: 'will be announced',
    choices: [
      { id: 'A', text: 'announces' },
      { id: 'B', text: 'is announcing' },
      { id: 'C', text: 'will be announced' },
      { id: 'D', text: 'has announced' },
    ],
    explanation: 'policy가 공지되는 대상. next week → 미래 시제. 미래 수동태는 will be + p.p.',
  },
]

/* ═══════════════════════════════════════════════
   SCREEN 4 — 핵심 요약 빈칸 카드
═══════════════════════════════════════════════ */
export const SCREEN4_CARDS = [
  {
    id: 'card1',
    prompt: '주어가 직접 행위를 하는 주체면 [  A  ], 주어가 행위를 당하는 대상이면 [  B  ]',
    blanks: ['A', 'B'],
    answers: { A: '능동태', B: '수동태' },
    keywords: { A: ['능동', 'active'], B: ['수동', 'passive'] },
    hint: '주어와 행위의 관계를 확인해요',
  },
  {
    id: 'card2',
    prompt: '동사 뒤에 [  C  ](이)가 있으면 능동, 없으면 [  D  ]',
    blanks: ['C', 'D'],
    answers: { C: '목적어', D: '수동' },
    keywords: { C: ['목적어', '목적'], D: ['수동', 'passive'] },
    hint: '동사 뒤 구조를 확인해요',
  },
  {
    id: 'card3',
    prompt: '주어의 수를 확인하며 단수/복수 맞춰주고, 시간 부사(next, last) 확인하여 시제 [  E  ]',
    blanks: ['E'],
    answers: { E: '확인' },
    keywords: { E: ['확인', '체크', 'check'] },
    hint: '수와 시제를 확인해요',
  },
]

/* ═══════════════════════════════════════════════
   턴 데이터 맵 (스크립트는 함수로 받아 userName 삽입)
═══════════════════════════════════════════════ */
export function buildTurns(userName: string): Record<string, LessonTurn> {
  const name = userName || '민주'

  return {
    /* ─── SCREEN 0 ─── */
    s0_intro: {
      id: 's0_intro',
      screen: 0,
      videoSrc: '/videos/screen0/intro.mp4',
      audioSrc: '/part5/part5_1.mp3',
      script: `자, 오늘은 Part 5에서 맨날 나오는 수동태 아주 박살을 내줄 거야. 수업은 세 단계로 꽉 채워줄게 간다. 먼저 실전 문제 풀면서 본인 실력 진단부터 확인하고, 그 문제들로 유형 완벽하게 짚어 먹을 거야. 그 다음은 맨날 깊고 시간 안에 푸는 연습. 마지막엔 본인이 직접 요점 정리하면서 머리에 넣는 훈련까지 끝내야 수업 끝이야. 시작한다.`,
      inputType: 'button',
      buttonLabel: '시작하기',
      onButton: 'NEXT_SCREEN',
    },

    /* ─── SCREEN 1 — 600점 강사 주도 ─── */
    s1_turn1: {
      id: 's1_turn1',
      screen: 1,
      videoSrc: '/videos/screen1/turn1.mp4',
      audioSrc: '/part5/part5_2_1.mp3',
      script: `${name}야, Part 5에서는 문장 구조를 먼저 파악해야 해. 문장 보이면 무조건 주어랑 동사 먼저 찾아봐. 여기서 주어가 뭐야?`,
      inputType: 'voice',
      defaultNextTurnId: 's1_turn2a',
    },
    s1_turn2a: {
      id: 's1_turn2a',
      screen: 1,
      videoSrc: '/videos/screen1/turn2a.mp4',
      audioSrc: '/part5/part5_2_2.mp3',
      script: `다시 봐봐. 빈칸 앞에서 with 같은 찌꺼기들 빼고 핵심이 뭐야? 밑줄 그어 봐.`,
      inputType: 'draw',
      drawHint: 'underline',
      onDraw: 's1_turn3',
    },
    s1_turn3: {
      id: 's1_turn3',
      screen: 1,
      videoSrc: '/videos/screen1/turn3.mp4',
      audioSrc: '/part5/part5_2_3.mp3',
      script: `오케이. 일단 주어가 복수인 거 확인했어. 그럼 동사 찾아야 하는데 지금 빈칸 자리가 동사야? 이럴 때는 빈칸 뒤 확인해봐. 중요한 힌트가 있어. 힌트에 동그라미 쳐봐.`,
      inputType: 'draw',
      drawHint: 'circle',
      onDraw: 's1_turn4',
    },
    s1_turn4: {
      id: 's1_turn4',
      screen: 1,
      videoSrc: '/videos/screen1/turn4.mp4',
      audioSrc: '/part5/part5_2_4.mp3',
      script: `좋아. 동사 뒤에 by + 행위자가 나오면 수동태인지 먼저 의심해야 해. 그럼 여기서, 주어인 기술적인 문제가 해결하는 거야, 해결되는 거야?`,
      inputType: 'button',
      buttonLabel: '다음 단계로 →',
      onButton: 'NEXT_SCREEN',
    },
    s1_turn5: {
      id: 's1_turn5',
      screen: 1,
      videoSrc: '/videos/screen1/turn5.mp4',
      script: `그렇지. 주어가 당하는 거일 때는 수동태 be p.p.를 써야 해. 의미 확인됐으면 이제 동사 뒤에 목적어 있는지 확인 들어가. 목적어 있어, 없어?`,
      inputType: 'voice',
      defaultNextTurnId: 's1_turn6',
    },
    s1_turn6: {
      id: 's1_turn6',
      screen: 1,
      videoSrc: '/videos/screen1/turn6.mp4',
      script: `맞았어. 이제 주어 were 복수이니까 단수 was handled 버려. 답 were handled 나왔어?`,
      inputType: 'button',
      highlightChoiceId: 'B',
      buttonLabel: '네, 맞아요!',
      onButton: 's1_turn7',
    },
    s1_turn7: {
      id: 's1_turn7',
      screen: 1,
      videoSrc: '/videos/screen1/turn7.mp4',
      script: `완벽해. 수동태 공식 정리하자. be + p.p., 주어가 복수면 were. 이 패턴 눈에 익혀두면 Part 5 수동태는 5초컷이야.`,
      inputType: 'button',
      buttonLabel: '다음 단계로 →',
      onButton: 'NEXT_SCREEN',
    },

    /* ─── SCREEN 2 — 750점 학생 주도 ─── */
    s2_start: {
      id: 's2_start',
      screen: 2,
      videoSrc: undefined,
      script: '',
      inputType: 'choice',
      timerSeconds: 15,
      onTimerExpire: 's2_timer_hint',
      onButton: 's2_reason',
    },
    s2_timer_hint: {
      id: 's2_timer_hint',
      screen: 2,
      videoSrc: '/videos/screen2/timer_hint.mp4',
      script: `시간 다 됐어. 일단 B 한번 봐봐.`,
      inputType: 'button',
      buttonLabel: '다시 선택할게요',
      onButton: 's2_reason',
    },
    s2_reason: {
      id: 's2_reason',
      screen: 2,
      videoSrc: '/videos/screen2/reason.mp4',
      script: `자, 정답은 맞혔는데, 지금 이거 ${name}가 진짜 알고 맞힌 거야, 아니면 대충 느낌으로 쪽은 거야? 확인 들어간다. B를 고른 이유가 뭐야?`,
      inputType: 'voice',
      voiceBranches: [
        { keywords: ['수동태', '목적어', '없어서', '당하', 'passive'], nextTurnId: 's2_branch_b' },
      ],
      defaultNextTurnId: 's2_branch_a',
    },
    s2_reason_wrong: {
      id: 's2_reason_wrong',
      screen: 2,
      videoSrc: '/videos/screen2/reason_wrong.mp4',
      script: `틀렸는데, 왜 그 답을 골랐어? 이유를 설명해봐.`,
      inputType: 'voice',
      voiceBranches: [
        { keywords: ['수동태', '목적어', '없어서', '당하', 'passive'], nextTurnId: 's2_branch_b' },
      ],
      defaultNextTurnId: 's2_branch_a',
    },
    s2_branch_a: {
      id: 's2_branch_a',
      screen: 2,
      videoSrc: '/videos/screen2/branch_a.mp4',
      script: `are를 보고 그렇게 고른 거야? required도 복수로 쓸 수 있는데? 다시 생각해봐, 해석이 자연스러운 게 근거가 될 수 있어?`,
      inputType: 'voice',
      defaultNextTurnId: 's2_common',
    },
    s2_branch_b: {
      id: 's2_branch_b',
      screen: 2,
      videoSrc: '/videos/screen2/branch_b.mp4',
      script: `맞아. 목적어 없이 뒤에 부사만 나오지? 그럼 이제 선택지 봐봐. 수동태니까 일반 능동 거 X 표시해.`,
      inputType: 'draw',
      onDraw: 's2_common',
    },
    s2_common: {
      id: 's2_common',
      screen: 2,
      videoSrc: '/videos/screen2/common.mp4',
      script: `자, 주어 동사는 일단 잘 찾았어. 그런데 그렇게 느낌으로 풀면 다음에는 못 맞혀. 빈칸 뒤에 to wear 동그라미 쳐봐.`,
      inputType: 'draw',
      drawHint: 'circle',
      onDraw: 's2_voice1',
    },
    s2_voice1: {
      id: 's2_voice1',
      screen: 2,
      videoSrc: '/videos/screen2/voice1.mp4',
      script: `맞아. to부정사가 나오면 목적어가 없다는 거야. 그럼 주어 visitors가 직접 쓰는 거야, 써야 하는 대상이야?`,
      inputType: 'voice',
      defaultNextTurnId: 's2_conclusion',
    },
    s2_conclusion: {
      id: 's2_conclusion',
      screen: 2,
      videoSrc: '/videos/screen2/conclusion.mp4',
      script: `그렇지. 주어가 당하는 거니까 수동태. are required가 정답이야. 이 패턴 눈에 박아둬.`,
      inputType: 'button',
      highlightChoiceId: 'B',
      buttonLabel: '다음 단계로 →',
      onButton: 'NEXT_SCREEN',
    },

    /* ─── SCREEN 3 — 실전 문제 (Screen3 내부에서 직접 관리, 여기서는 피드백 턴만) ─── */
    s3_all_correct: {
      id: 's3_all_correct',
      screen: 3,
      videoSrc: '/videos/screen3/all_correct.mp4',
      script: `완벽해! 3문제 다 맞혔어. 이제 패턴이 눈에 들어오지? 다음 단계로 넘어가자.`,
      inputType: 'button',
      buttonLabel: '다음 단계로 →',
      onButton: 'NEXT_SCREEN',
    },
    s3_partial: {
      id: 's3_partial',
      screen: 3,
      videoSrc: '/videos/screen3/partial.mp4',
      script: `머릿속에 시제랑 태가 아직 좀 꼬였어. have p.p.는 모양이 좀 복잡해 보여도 그냥 능동태야. 이 차이 기억해둬. 다음 단계로 가자.`,
      inputType: 'button',
      buttonLabel: '다음 단계로 →',
      onButton: 'NEXT_SCREEN',
    },
    s3_timer_hint: {
      id: 's3_timer_hint',
      screen: 3,
      videoSrc: '/videos/screen3/timer_hint.mp4',
      script: `시간 다 됐어. 일단 C 한번 봐봐.`,
      inputType: 'none',
    },

    /* ─── SCREEN 4 — 핵심 요약 오프닝/중간 피드백 ─── */
    s4_opening: {
      id: 's4_opening',
      screen: 4,
      videoSrc: '/videos/screen4/opening.mp4',
      script: `오늘 수업 여기까지인데 그냥 끝낼 생각은 아니지? 네가 맨날 설명하다보면 본인이 진짜 머릿속에 알아야 소화가 돼. 설명해봐. 오늘 배운 수동태 핵심 3가지 나한테 설명해봐. 첫째, 주어와 관계를 보고 어떻게 판단해?`,
      inputType: 'none',
    },
    s4_card2_prompt: {
      id: 's4_card2_prompt',
      screen: 4,
      videoSrc: '/videos/screen4/card2_prompt.mp4',
      script: `맞아. 그럼 둘째, 목적어는?`,
      inputType: 'none',
    },
    s4_card3_prompt: {
      id: 's4_card3_prompt',
      screen: 4,
      videoSrc: '/videos/screen4/card3_prompt.mp4',
      script: `좋아. 마지막, 수랑 시제는 어떻게 확인해?`,
      inputType: 'none',
    },
    s4_conclusion: {
      id: 's4_conclusion',
      screen: 4,
      videoSrc: '/videos/screen4/conclusion.mp4',
      script: `그렇지, 마지막으로 수, 시제 확인하려고 했어. 주어의 수 확인하면서 동사도 단수/복수 맞춰주고, 시간 부사 확인해서 시제 확인하려고 했지? 이 부분 꼭 외워두기.`,
      inputType: 'button',
      buttonLabel: '요약 노트 보기 →',
      onButton: 'NEXT_SCREEN',
    },

    /* ─── SCREEN 5 — 요약 노트 ─── */
    s5_closing: {
      id: 's5_closing',
      screen: 5,
      videoSrc: '/videos/screen5/closing.mp4',
      script: `수고했어. 오늘 배운 거 요약 노트로 저장해둬. 나중에 헷갈릴 때 꺼내봐. MY PAGE에 쌓이니까 틈틈이 복습해.`,
      inputType: 'none',
    },
  }
}
