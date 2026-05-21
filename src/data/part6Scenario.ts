export interface P6Choice {
  id: 'A' | 'B' | 'C' | 'D'
  text: string
}

export interface P6Question {
  number: number
  choices: P6Choice[]
  correct: 'A' | 'B' | 'C' | 'D'
  grammarPoint: string
}

export interface P6Segment {
  text: string
  blankNumber?: number
}

export interface P6Set {
  intro: string
  meta: { from: string; to: string; date: string; subject: string }
  segments: P6Segment[]
  questions: P6Question[]
  systemPrompt: string
  passageHints: { maxRel: number; text: string }[]
}

/* ── Set 1 ── */
const SET1: P6Set = {
  intro: 'Questions 131–133 refer to the following e-mail.',
  meta: {
    from:    'David Kim <d.kim@novatecsolutions.com>',
    to:      'Sarah Harrison <s.harrison@brightfield.com>',
    date:    'September 12',
    subject: 'Product Launch Follow-Up',
  },
  segments: [
    { text: 'Dear Ms. Harrison,\n\n' },
    { text: 'I am writing to follow up on our meeting last Tuesday. As we ' },
    { blankNumber: 131, text: '' },
    { text: ', the new Novatec Pro software package will be officially released on October 1st.\n\n' },
    { text: 'Our marketing team has confirmed that all promotional materials ' },
    { blankNumber: 132, text: '' },
    { text: ' to registered partners by the end of this week. Please distribute them through your usual channels.\n\n' },
    { text: 'Additionally, the product demonstration originally scheduled for this Friday ' },
    { blankNumber: 133, text: '' },
    { text: ' to next Thursday due to a venue conflict. We apologize for any inconvenience.\n\n' },
    { text: 'Please feel free to contact me if you have any questions.\n\nBest regards,\nDavid Kim\nProduct Manager' },
  ],
  questions: [
    {
      number: 131,
      choices: [
        { id: 'A', text: 'discussed' },
        { id: 'B', text: 'discuss' },
        { id: 'C', text: 'are discussed' },
        { id: 'D', text: 'discussing' },
      ],
      correct: 'A',
      grammarPoint: '주어(we)가 직접 논의한 것이므로 능동태, 지난 회의 얘기이므로 과거 시제 → discussed',
    },
    {
      number: 132,
      choices: [
        { id: 'A', text: 'will be sent' },
        { id: 'B', text: 'sending' },
        { id: 'C', text: 'to send' },
        { id: 'D', text: 'sent' },
      ],
      correct: 'A',
      grammarPoint: '홍보 자료가 발송되는 대상(수동), 이번 주 말까지(미래) → will be sent',
    },
    {
      number: 133,
      choices: [
        { id: 'A', text: 'has moved' },
        { id: 'B', text: 'will be moved' },
        { id: 'C', text: 'is moving' },
        { id: 'D', text: 'moved' },
      ],
      correct: 'B',
      grammarPoint: '행사가 변경되는 대상(수동), 아직 일어나지 않은 변경(미래) → will be moved',
    },
  ],
  passageHints: [
    { maxRel: 0.18, text: '표시가 지문 상단(발신자 정보: From/To/Date/Subject 헤더 부분)에 있습니다.' },
    { maxRel: 0.38, text: '표시가 첫 번째 문단(131번 빈칸 포함, "I am writing to follow up…" 부분)에 있습니다.' },
    { maxRel: 0.60, text: '표시가 두 번째 문단(132번 빈칸 포함, "Our marketing team has confirmed…" 부분)에 있습니다.' },
    { maxRel: 0.80, text: '표시가 세 번째 문단(133번 빈칸 포함, "the product demonstration originally scheduled…" 부분)에 있습니다.' },
    { maxRel: 1.00, text: '표시가 지문 하단(서명/맺음말 부분, "Best regards, David Kim")에 있습니다.' },
  ],
  systemPrompt: `당신은 TOEIC Part 6 전문 AI 튜터입니다.
학생이 지금 풀고 있는 문제는 다음과 같습니다.

[지문 요약]
David Kim이 Sarah Harrison에게 보내는 이메일. 소프트웨어 출시 일정 및 홍보 자료 발송, 제품 데모 일정 변경 안내.

[빈칸 문제]
131번: "As we _____, the new software will be released October 1st."
→ 선택지: A) discussed  B) discuss  C) are discussed  D) discussing
→ 정답: A (능동 과거 — 지난 미팅에서 논의한 내용)

132번: "all promotional materials _____ to registered partners by the end of this week."
→ 선택지: A) will be sent  B) sending  C) to send  D) sent
→ 정답: A (미래 수동태 — 자료가 발송될 예정)

133번: "the product demonstration _____ to next Thursday due to a venue conflict."
→ 선택지: A) has moved  B) will be moved  C) is moving  D) moved
→ 정답: B (미래 수동태 — 행사가 변경될 예정)

[튜터 지침]
- 정답을 바로 알려주지 말고, 주어-동사 관계, 능동/수동, 시제 힌트로 학생이 스스로 찾게 유도하세요.
- 학생이 이미 답을 맞혔으면 왜 맞는지 명확히 설명해 주세요.
- 답변은 3~5줄로 간결하게, 친근하고 명확한 말투로 해주세요.
- 한국어로 답변하세요.`,
}

/* ── Set 2 ── */
const SET2: P6Set = {
  intro: 'Questions 134–136 refer to the following memo.',
  meta: {
    from:    'Karen White <k.white@metroplexcorp.com>',
    to:      'All Staff <staff@metroplexcorp.com>',
    date:    'February 8',
    subject: 'Conference Room Renovation',
  },
  segments: [
    { text: 'Dear All,\n\n' },
    { text: 'We are pleased to announce that the main conference room on the 3rd floor ' },
    { blankNumber: 134, text: '' },
    { text: ' next month. During this period, all scheduled meetings ' },
    { blankNumber: 135, text: '' },
    { text: ' to the smaller meeting rooms on the 2nd floor.\n\n' },
    { text: 'Employees who have already reserved the main conference room ' },
    { blankNumber: 136, text: '' },
    { text: ' by the facilities team regarding alternative arrangements. We apologize for any inconvenience this may cause.\n\n' },
    { text: 'Thank you for your understanding.\n\nBest regards,\nKaren White\nFacilities Manager' },
  ],
  questions: [
    {
      number: 134,
      choices: [
        { id: 'A', text: 'will renovate' },
        { id: 'B', text: 'will be renovated' },
        { id: 'C', text: 'renovating' },
        { id: 'D', text: 'has been renovated' },
      ],
      correct: 'B',
      grammarPoint: '회의실이 개조되는 대상(수동), 다음 달(미래) → will be renovated',
    },
    {
      number: 135,
      choices: [
        { id: 'A', text: 'move' },
        { id: 'B', text: 'are moving' },
        { id: 'C', text: 'will be moved' },
        { id: 'D', text: 'moved' },
      ],
      correct: 'C',
      grammarPoint: '회의들이 이동되는 대상(수동), 미래 예정 → will be moved',
    },
    {
      number: 136,
      choices: [
        { id: 'A', text: 'contact' },
        { id: 'B', text: 'contacted' },
        { id: 'C', text: 'will be contacted' },
        { id: 'D', text: 'are contacting' },
      ],
      correct: 'C',
      grammarPoint: '직원들이 연락받는 대상(수동), 미래 예정 → will be contacted',
    },
  ],
  passageHints: [
    { maxRel: 0.18, text: '표시가 지문 상단(발신자 정보: From/To/Date/Subject 헤더 부분)에 있습니다.' },
    { maxRel: 0.50, text: '표시가 첫 번째 문단(134·135번 빈칸 포함, 회의실 공사 안내 부분)에 있습니다.' },
    { maxRel: 0.80, text: '표시가 두 번째 문단(136번 빈칸 포함, 예약자 안내 부분)에 있습니다.' },
    { maxRel: 1.00, text: '표시가 지문 하단(서명/맺음말 부분, "Best regards, Karen White")에 있습니다.' },
  ],
  systemPrompt: `당신은 TOEIC Part 6 전문 AI 튜터입니다.
학생이 지금 풀고 있는 문제는 다음과 같습니다.

[지문 요약]
Karen White가 전 직원에게 보내는 사내 메모. 3층 회의실 보수 공사로 인한 임시 이동 및 예약자 연락 안내.

[빈칸 문제]
134번: "the main conference room on the 3rd floor _____ next month."
→ 선택지: A) will renovate  B) will be renovated  C) renovating  D) has been renovated
→ 정답: B (미래 수동태 — 회의실이 개조될 예정)

135번: "all scheduled meetings _____ to the smaller meeting rooms on the 2nd floor."
→ 선택지: A) move  B) are moving  C) will be moved  D) moved
→ 정답: C (미래 수동태 — 회의들이 이동될 예정)

136번: "Employees who have already reserved the main conference room _____ by the facilities team."
→ 선택지: A) contact  B) contacted  C) will be contacted  D) are contacting
→ 정답: C (미래 수동태 — 직원들이 연락받을 예정)

[튜터 지침]
- 정답을 바로 알려주지 말고, 주어-동사 관계, 능동/수동, 시제 힌트로 학생이 스스로 찾게 유도하세요.
- 학생이 이미 답을 맞혔으면 왜 맞는지 명확히 설명해 주세요.
- 답변은 3~5줄로 간결하게, 친근하고 명확한 말투로 해주세요.
- 한국어로 답변하세요.`,
}

export const P6_SETS: P6Set[] = [SET1, SET2]

/* 하위 호환 — 기존 import 이름 유지 */
export const P6_PASSAGE_INTRO = SET1.intro
export const P6_PASSAGE_META  = SET1.meta
export const P6_SEGMENTS      = SET1.segments
export const P6_QUESTIONS     = SET1.questions
export const P6_SYSTEM_PROMPT = SET1.systemPrompt
