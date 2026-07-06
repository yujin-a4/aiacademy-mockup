// 앱(src/data/rcData.ts)에 하드코딩되어 있던 실제 문항들을 문항입력 시트에 채운다.
// 오답 태그는 wrong_answer_tags 마스터의 태그명과 정확히 일치해야 sync 시 연결된다.
// ※ 오답 태그 배정은 초기 배정(작업자: Claude)이므로 콘텐츠팀 검수 필요.
const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

const SPREADSHEET_ID = '1VUGfsCvqvg1QNN9QTISfJWMUtPPim2Cz04KHO190fpY';

// ---------- Part 1 (기존 샘플 — 시트를 원천 데이터로 유지하기 위해 포함) ----------
const P1_ROWS = (() => {
  const base = {
    question_id: 'LC-P1-01-Q001',
    lecture_code: 'LC-P1-01',
    difficulty: '중',
    question_text: '사진을 가장 잘 묘사한 보기를 고르시오.',
    photo_type: '사물·상태중심',
    key_elements: '책상 위 문서 더미, 노트북, 의자 (사람 없음)',
  };
  return [
    { ...base, option_label: 'A', option_text: 'Some documents have been placed on the desk.', is_correct: 'TRUE', option_error_tag: '', option_explanation: '', correct_evidence: '사진 속 문서 더미 배치와 "documents … placed on the desk" 표현이 일치', notes: '시트 실전문제 탭 예시 문항' },
    { ...base, option_label: 'B', option_text: 'A man is loading boxes onto a truck.', is_correct: 'FALSE', option_error_tag: '주체·대상 불일치형', option_explanation: '사진에 없는 대상(truck)과 인물(man)이 등장 — 사진 속 실제 대상은 서류 더미·노트북·의자', correct_evidence: '', notes: '시트 실전문제 탭 예시 문항' },
    { ...base, option_label: 'C', option_text: 'A woman is organizing some files.', is_correct: 'FALSE', option_error_tag: '주체·대상 불일치형', option_explanation: '사진에 사람이 없는데 여성이 등장 — 주체 혼동', correct_evidence: '', notes: '시트 유형학습 탭 S3 예시 오답' },
    { ...base, option_label: 'D', option_text: 'The documents have been thrown away.', is_correct: 'FALSE', option_error_tag: '동작 불일치형', option_explanation: '서류는 책상 위에 놓여 있음(placed) — 버려진(thrown away) 동작·상태가 사진과 불일치', correct_evidence: '', notes: '테스트용 임의 추가 placeholder' },
  ];
})();

// ---------- Part 5 (rcData.ts P5_QUESTIONS 8문항) ----------
// category → lecture_code 매핑: 수동태→RC-P5-08, 시제→RC-P5-07, 품사→RC-P5-02, 전치사→RC-P5-11,
// 어휘→RC-P5-16, 접속사→RC-P5-12, 수일치→RC-P5-06, 관계대명사→RC-P5-13
const P5_DATA = [
  {
    qid: 'RC-P5-08-Q001', lecture: 'RC-P5-08', grammar: '수동태', blankType: '문법형',
    sentence: 'The annual sales report _______ by the accounting team before the quarterly board meeting.',
    options: [
      { label: 'A', text: 'prepared', tag: '구조 불일치형', expl: '능동 과거형 — by the accounting team이 있어 보고서가 "작성되는" 수동 관계이므로 태 오류' },
      { label: 'B', text: 'was prepared', correct: true, evidence: '주어(The annual sales report)가 "작성되는" 수동적 관계이므로 과거 수동태 was prepared가 정답' },
      { label: 'C', text: 'has prepare', tag: '구조 불일치형', expl: 'has 뒤에는 과거분사가 와야 함 — 동사 형태가 문법적으로 성립하지 않음' },
      { label: 'D', text: 'is preparing', tag: '구조 불일치형', expl: '능동 진행형 — 보고서가 스스로 준비하는 셈이 되어 태가 맞지 않음' },
    ],
  },
  {
    qid: 'RC-P5-07-Q001', lecture: 'RC-P5-07', grammar: '시제', blankType: '문법형',
    sentence: 'Ms. Kim _______ for this company since she graduated from university ten years ago.',
    options: [
      { label: 'A', text: 'worked', tag: '구조 불일치형', expl: 'since + 과거시점은 과거부터 현재까지의 계속 — 단순과거는 계속 의미를 담지 못함 (시제 오류)' },
      { label: 'B', text: 'has worked', correct: true, evidence: '"since + 과거시점"과 함께 현재완료(has worked)를 사용하여 과거부터 현재까지 계속되는 상태를 나타냄' },
      { label: 'C', text: 'is working', tag: '구조 불일치형', expl: '현재진행형은 since 10년 전부터의 계속 상태를 표현하지 못함 (시제 오류)' },
      { label: 'D', text: 'works', tag: '구조 불일치형', expl: '단순현재는 since + 과거시점 구문과 어울리지 않음 (시제 오류)' },
    ],
  },
  {
    qid: 'RC-P5-02-Q001', lecture: 'RC-P5-02', grammar: '품사', blankType: '문법형',
    sentence: 'The new employee completed her training _______ and received high praise from her manager.',
    options: [
      { label: 'A', text: 'successful', tag: '품사·형태 불일치형', expl: '형용사 — 동사(completed)를 수식하는 자리에는 부사가 필요함' },
      { label: 'B', text: 'success', tag: '품사·형태 불일치형', expl: '명사 — 동사를 수식할 수 없음' },
      { label: 'C', text: 'successfully', correct: true, evidence: '동사(completed)를 수식하려면 부사(successfully)가 필요함 — -ly 부사형이 정답' },
      { label: 'D', text: 'succeed', tag: '품사·형태 불일치형', expl: '동사 — 수식어 자리에 올 수 없음' },
    ],
  },
  {
    qid: 'RC-P5-11-Q001', lecture: 'RC-P5-11', grammar: '전치사', blankType: '문법형',
    sentence: 'Please submit your travel expense report _______ the end of each month.',
    options: [
      { label: 'A', text: 'until', tag: '의미 부적절형', expl: 'until은 상태가 계속 유지될 때 사용 — 제출 마감 기한에는 by를 씀' },
      { label: 'B', text: 'since', tag: '의미 부적절형', expl: 'since는 기산점(~이후로) — 마감 기한 의미와 무관' },
      { label: 'C', text: 'by', correct: true, evidence: '마감 기한을 나타낼 때는 전치사 by(~까지)를 사용함' },
      { label: 'D', text: 'during', tag: '의미 부적절형', expl: 'during은 기간 내내 — 마감 시한을 나타내는 표현이 아님' },
    ],
  },
  {
    qid: 'RC-P5-16-Q001', lecture: 'RC-P5-16', grammar: '어휘', blankType: '어휘형',
    sentence: 'The company plans to _______ its headquarters to a larger building in the city center next year.',
    options: [
      { label: 'A', text: 'relocate', correct: true, evidence: '더 큰 건물로 이사한다는 문맥에서 relocate(장소를 옮기다)가 가장 적합함' },
      { label: 'B', text: 'replace', tag: '의미 부적절형', expl: 'replace는 교체 — 본사를 다른 건물로 "옮기는" 문맥과 의미가 다름' },
      { label: 'C', text: 'remove', tag: '의미 부적절형', expl: 'remove는 제거 — 이전(移轉) 의미가 아님' },
      { label: 'D', text: 'rename', tag: '의미 부적절형', expl: 'rename은 이름 변경 — 문맥과 무관' },
    ],
  },
  {
    qid: 'RC-P5-12-Q001', lecture: 'RC-P5-12', grammar: '접속사', blankType: '문법형',
    sentence: '_______ the project was behind schedule, the team worked overtime to meet the deadline.',
    options: [
      { label: 'A', text: 'Despite', tag: '구조 불일치형', expl: '전치사 — 뒤에 절(주어+동사)이 올 수 없음 (전치사·접속사 구조 오류)' },
      { label: 'B', text: 'Although', correct: true, evidence: '빈칸 뒤에 절이 오며 "늦었음에도 야근했다"는 역접 의미이므로 Although가 적합함' },
      { label: 'C', text: 'Since', tag: '의미 부적절형', expl: '인과(~때문에) — 역접 문맥과 논리가 맞지 않음' },
      { label: 'D', text: 'Unless', tag: '의미 부적절형', expl: '조건(~하지 않는 한) — 문맥과 불일치' },
    ],
  },
  {
    qid: 'RC-P5-06-Q001', lecture: 'RC-P5-06', grammar: '수일치', blankType: '문법형',
    sentence: 'Each of the participants _______ asked to sign a confidentiality agreement before the meeting.',
    options: [
      { label: 'A', text: 'are', tag: '구조 불일치형', expl: 'Each of + 복수명사의 주어는 단수 취급 (수일치 오류)' },
      { label: 'B', text: 'is', correct: true, evidence: '"Each of + 복수명사" 구조에서는 동사를 단수로 씀 — is asked가 정답' },
      { label: 'C', text: 'were', tag: '구조 불일치형', expl: '복수·과거형 — 단수 is가 필요함 (수일치 오류)' },
      { label: 'D', text: 'have been', tag: '구조 불일치형', expl: '복수형 조동사 — Each는 단수 취급 (수일치 오류)' },
    ],
  },
  {
    qid: 'RC-P5-13-Q001', lecture: 'RC-P5-13', grammar: '관계대명사', blankType: '문법형',
    sentence: 'The consultant _______ we hired last month has extensive experience in financial management.',
    options: [
      { label: 'A', text: 'which', tag: '구조 불일치형', expl: '선행사가 사람(consultant)이므로 which를 쓸 수 없음 (관계사 구조 오류)' },
      { label: 'B', text: 'whose', tag: '구조 불일치형', expl: '소유격 — 관계절에서 목적어 역할이 필요한 자리 (관계사 구조 오류)' },
      { label: 'C', text: 'whom', correct: true, evidence: '선행사(The consultant)가 사람이고 관계절에서 목적어 역할을 하므로 목적격 whom이 정답' },
      { label: 'D', text: 'where', tag: '구조 불일치형', expl: '장소 관계부사 — 사람 선행사의 목적격 자리에 올 수 없음 (관계사 구조 오류)' },
    ],
  },
  // Part 5 데모 수업(Part5BlankScreen)이 쓰는 수동태 문항 — lessonScenario.ts SCREEN1_PROBLEM에서 이관
  {
    qid: 'RC-P5-08-Q002', lecture: 'RC-P5-08', grammar: '수동태', blankType: '문법형',
    sentence: 'The technical issues with the server _______ promptly by our IT support team.',
    options: [
      { label: 'A', text: 'handled', tag: '구조 불일치형', expl: '목적어 없이 능동태 과거형을 쓰면 태가 맞지 않음 (태 오류)' },
      { label: 'B', text: 'were handled', correct: true, evidence: 'issues(복수 주어)가 IT support team에 의해 처리되는 대상이므로 수동태 were handled가 정답. 원문: "The technical issues with the server were handled promptly by our IT support team."' },
      { label: 'C', text: 'handling', tag: '품사·형태 불일치형', expl: '분사/동명사형 — 정형동사 자리에 올 수 없음' },
      { label: 'D', text: 'was handled', tag: '구조 불일치형', expl: '주어 issues(복수)와 단수 동사 was가 수일치하지 않음 (수일치 오류)' },
    ],
  },
  // Part5BlankScreen 실전 단계(SCREEN3_PROBLEMS) 3문항 — lessonScenario.ts에서 이관
  {
    qid: 'RC-P5-08-Q003', lecture: 'RC-P5-08', grammar: '수동태', blankType: '문법형', num: '1',
    sentence: "The monthly sales report _______ by the regional manager to evaluate the team's performance.",
    options: [
      { label: 'A', text: 'reviews', tag: '구조 불일치형', expl: '능동 현재형 — report는 검토되는 대상이므로 태가 맞지 않음' },
      { label: 'B', text: 'is reviewing', tag: '구조 불일치형', expl: '능동 진행형 — 보고서가 스스로 검토하는 셈이 되어 태 오류' },
      { label: 'C', text: 'is reviewed', correct: true, evidence: 'monthly sales report가 검토를 받는 대상이므로 수동태 is reviewed가 정답' },
      { label: 'D', text: 'has reviewed', tag: '구조 불일치형', expl: '능동 완료형 — 태가 맞지 않음' },
    ],
  },
  {
    qid: 'RC-P5-08-Q004', lecture: 'RC-P5-08', grammar: '수동태', blankType: '문법형', num: '2',
    sentence: 'The defective products _______ from the store shelves after the safety issue was reported.',
    options: [
      { label: 'A', text: 'removed', tag: '구조 불일치형', expl: '목적어 없는 능동 과거형 — 태가 맞지 않음' },
      { label: 'B', text: 'were removed', correct: true, evidence: 'products가 제거되는 대상이고 after ~ was reported로 과거 시제, 복수 주어이므로 were removed가 정답' },
      { label: 'C', text: 'have removed', tag: '구조 불일치형', expl: '능동 완료형 — 태가 맞지 않음' },
      { label: 'D', text: 'removing', tag: '품사·형태 불일치형', expl: '분사/동명사형 — 정형동사 자리에 올 수 없음' },
    ],
  },
  {
    qid: 'RC-P5-08-Q005', lecture: 'RC-P5-08', grammar: '수동태', blankType: '문법형', num: '3',
    sentence: 'The new company policy _______ to all staff members via email next week.',
    options: [
      { label: 'A', text: 'announces', tag: '구조 불일치형', expl: '능동 현재형 — policy는 공지되는 대상이므로 태 오류' },
      { label: 'B', text: 'is announcing', tag: '구조 불일치형', expl: '능동 진행형 — 태 오류' },
      { label: 'C', text: 'will be announced', correct: true, evidence: 'policy가 공지되는 대상이고 next week가 있어 미래 수동태 will be announced가 정답' },
      { label: 'D', text: 'has announced', tag: '구조 불일치형', expl: '능동 완료형 — next week(미래)와 시제도 맞지 않음' },
    ],
  },
];

// ---------- Part 6 (rcData.ts P6_PASSAGES — 사내 메모 지문, 빈칸 4개) ----------
const P6_PASSAGE = `To: All Department Managers
From: Jennifer Walsh, Human Resources Director
Subject: Updated Remote Work Policy

I am writing to inform you of changes to our company's remote work policy, which will be (1)_______ on February 1.

Under the updated guidelines, eligible employees may work remotely for up to two days per week. All remote work requests must be (2)_______ to the department manager at least five business days in advance.

Employees working from home remain (3)_______ for maintaining their regular work schedules and attending all team meetings via video conference. Managers should (4)_______ that their teams continue to meet performance expectations regardless of work location.

Should you have any questions, please contact the HR department directly.

Best regards,
Jennifer Walsh`;

const P6_DATA = [
  {
    qid: 'RC-P6-01-Q001', questionText: '빈칸 (1)에 알맞은 것을 고르시오.',
    options: [
      { label: 'A', text: 'implementation', tag: '문법·형태 불일치형', expl: '명사 — will be 뒤 수동태 과거분사 자리' },
      { label: 'B', text: 'implemented', correct: true, evidence: '"will be + 과거분사" 미래 수동태 — "정책이 시행될 것"이라는 의미의 implemented가 정답' },
      { label: 'C', text: 'implementing', tag: '문법·형태 불일치형', expl: '능동 진행형 — 정책이 시행"되는" 수동 의미가 필요함' },
      { label: 'D', text: 'implements', tag: '문법·형태 불일치형', expl: '동사 현재형 — be 뒤에 올 수 없는 형태' },
    ],
  },
  {
    qid: 'RC-P6-01-Q002', questionText: '빈칸 (2)에 알맞은 것을 고르시오.',
    options: [
      { label: 'A', text: 'submitted', correct: true, evidence: '"must be + 과거분사" 수동태 — "제출되어야 한다"는 의미의 submitted가 정답' },
      { label: 'B', text: 'submitting', tag: '문법·형태 불일치형', expl: '진행형 — must be 뒤 수동태 과거분사 자리' },
      { label: 'C', text: 'to submit', tag: '문법·형태 불일치형', expl: 'to부정사 — must be 뒤에 올 수 없는 형태' },
      { label: 'D', text: 'a submission', tag: '문법·형태 불일치형', expl: '명사구 — 수동태 과거분사 자리에 맞지 않음' },
    ],
  },
  {
    qid: 'RC-P6-01-Q003', questionText: '빈칸 (3)에 알맞은 것을 고르시오.',
    options: [
      { label: 'A', text: 'responsibly', tag: '문법·형태 불일치형', expl: '부사 — remain 뒤 보어 자리에는 형용사가 필요함' },
      { label: 'B', text: 'responsible', correct: true, evidence: '"remain + 형용사" 구조 — "책임이 있는 상태로 남아있다"는 의미의 responsible이 정답' },
      { label: 'C', text: 'responsibility', tag: '문법·형태 불일치형', expl: '명사 — remain의 보어로 형용사가 자연스러움' },
      { label: 'D', text: 'responds', tag: '문법·형태 불일치형', expl: '동사 — 보어 자리에 올 수 없음' },
    ],
  },
  {
    qid: 'RC-P6-01-Q004', questionText: '빈칸 (4)에 알맞은 것을 고르시오.',
    options: [
      { label: 'A', text: 'ensured', tag: '문법·형태 불일치형', expl: '과거형 — should 뒤에는 동사원형이 와야 함' },
      { label: 'B', text: 'ensuring', tag: '문법·형태 불일치형', expl: '동명사/진행형 — should 뒤 동사원형 자리' },
      { label: 'C', text: 'ensure', correct: true, evidence: '"should + 동사원형" 구조이므로 동사원형 ensure가 정답' },
      { label: 'D', text: 'ensures', tag: '문법·형태 불일치형', expl: '3인칭 단수형 — should 뒤 동사원형 자리' },
    ],
  },
];

// ---------- Part 7 (rcData.ts P7_PASSAGES — 광고 지문, 문제 4개) ----------
const P7_PASSAGE = `Greenwood Business Supplies
Year-End Clearance Sale

Greenwood Business Supplies is pleased to announce its annual year-end clearance sale, running from December 14 through December 30. All in-store and online merchandise will be discounted by up to 35% off regular retail prices.

Featured discounts include:
  • Office furniture: up to 35% off
  • Computer peripherals and accessories: up to 30% off
  • Stationery and filing supplies: up to 25% off

As a special promotion, customers who spend $150 or more will receive complimentary gift wrapping and free standard delivery within the metropolitan area. Online orders must be placed no later than December 26 to guarantee delivery before the New Year holiday.

Greenwood Business Supplies is located at 48 Commerce Street and is open Monday through Saturday, 9:00 A.M. to 7:00 P.M. Our website at www.greenwoodsupplies.com is available 24 hours a day.`;

const P7_STRUCTURE = '1문단=세일 안내(기간·할인율), 2문단=품목별 할인율, 3문단=추가 혜택 조건($150)과 온라인 주문 마감일, 4문단=매장 위치·영업시간';

const P7_DATA = [
  {
    qid: 'RC-P7-03-Q001', questionText: 'What is the main purpose of this advertisement?',
    evidenceSentence: 'Greenwood Business Supplies is pleased to announce its annual year-end clearance sale',
    options: [
      { label: 'A', text: 'To introduce a new product line', tag: '과도한 추론형', expl: '신제품 라인 소개는 지문에 없는 내용' },
      { label: 'B', text: 'To announce a seasonal sale event', correct: true, evidence: '"pleased to announce its annual year-end clearance sale" — 연말 할인 행사 안내가 주목적' },
      { label: 'C', text: 'To notify customers of a change in store hours', tag: '부분 일치형', expl: '영업시간이 지문에 언급되지만 변경 공지가 아님' },
      { label: 'D', text: 'To inform customers of a new store location', tag: '부분 일치형', expl: '매장 위치(48 Commerce Street)가 언급되지만 신규 지점 안내가 아님' },
    ],
  },
  {
    qid: 'RC-P7-03-Q002', questionText: 'Which item category is offered at the highest discount rate?',
    evidenceSentence: 'Office furniture: up to 35% off',
    options: [
      { label: 'A', text: 'Computer peripherals and accessories', tag: '세부 정보 불일치형', expl: '컴퓨터 주변기기는 최대 30% — 최고 할인율이 아님' },
      { label: 'B', text: 'Stationery and filing supplies', tag: '세부 정보 불일치형', expl: '문구류는 최대 25% — 최고 할인율이 아님' },
      { label: 'C', text: 'Office furniture', correct: true, evidence: '사무용 가구가 최대 35% 할인으로 가장 높은 할인율' },
      { label: 'D', text: 'All categories have the same discount', tag: '세부 정보 불일치형', expl: '카테고리별 할인율(35/30/25%)이 서로 다름' },
    ],
  },
  {
    qid: 'RC-P7-03-Q003', questionText: 'What must customers spend to qualify for free delivery?',
    evidenceSentence: 'customers who spend $150 or more will receive complimentary gift wrapping and free standard delivery',
    options: [
      { label: 'A', text: '$100 or more', tag: '세부 정보 불일치형', expl: '지문의 조건 금액($150)과 불일치' },
      { label: 'B', text: '$150 or more', correct: true, evidence: '"customers who spend $150 or more will receive... free standard delivery"' },
      { label: 'C', text: '$200 or more', tag: '세부 정보 불일치형', expl: '지문의 조건 금액($150)과 불일치' },
      { label: 'D', text: '$250 or more', tag: '세부 정보 불일치형', expl: '지문의 조건 금액($150)과 불일치' },
    ],
  },
  {
    qid: 'RC-P7-03-Q004', questionText: 'By what date must online orders be placed to receive delivery before the New Year?',
    evidenceSentence: 'Online orders must be placed no later than December 26 to guarantee delivery before the New Year holiday',
    options: [
      { label: 'A', text: 'December 14', tag: '부분 일치형', expl: '12월 14일은 세일 시작일 — 주문 마감일이 아님' },
      { label: 'B', text: 'December 26', correct: true, evidence: '"Online orders must be placed no later than December 26"' },
      { label: 'C', text: 'December 30', tag: '부분 일치형', expl: '12월 30일은 세일 종료일 — 주문 마감일이 아님' },
      { label: 'D', text: 'January 1', tag: '세부 정보 불일치형', expl: '1월 1일은 지문에 근거 없는 날짜' },
    ],
  },
];

// ---------- Part 7 두 번째 지문 (part7Scenario.ts 자동차 광고 — Part7ConvAIScreen이 쓰는 실제 화면 데이터) ----------
const P7B_PASSAGE = `Used Car For Sale. Six-year-old Carlisle Custom. Only one owner. Low mileage. Car used to commute short distances to town. Brakes and tires replaced six months ago. Struts replaced two weeks ago. Air conditioning works well, but heater takes a while to warm up. Brand new spare tire included. Priced to sell. Owner going overseas at the end of this month and must sell the car. Call Firoozeh Ghorbani at (848) 555-0132.`;

const P7B_STRUCTURE = '앞부분=차량 기본 정보(연식·소유주·주행거리), 중간=수리 이력과 상태 설명(브레이크·타이어·에어컨·히터), 끝부분=판매 사유(해외 이주)와 연락처';

const P7B_DATA = [
  {
    qid: 'RC-P7-03-Q005', questionText: 'What is suggested about the car?',
    evidenceSentence: 'Struts replaced two weeks ago.',
    options: [
      { label: 'A', text: 'It was recently repaired.', correct: true, evidence: '"Struts replaced two weeks ago"에서 최근 수리된 것을 알 수 있음' },
      { label: 'B', text: 'It has had more than one owner.', tag: '세부 정보 불일치형', expl: '지문에 "Only one owner"라고 명시 — 세부 정보가 지문과 반대' },
      { label: 'C', text: 'It is very fuel efficient.', tag: '과도한 추론형', expl: '연비에 대한 언급은 지문에 없음 — 근거 없는 추론' },
      { label: 'D', text: 'It has been on sale for six months.', tag: '부분 일치형', expl: '"six months"는 브레이크·타이어 교체 시점 — 판매 기간이 아님' },
    ],
  },
  {
    qid: 'RC-P7-03-Q006', questionText: 'According to the advertisement, why is Ms. Ghorbani selling her car?',
    evidenceSentence: 'Owner going overseas at the end of this month and must sell the car.',
    options: [
      { label: 'A', text: "She cannot repair the car's temperature control.", tag: '부분 일치형', expl: '히터 언급("heater takes a while to warm up")은 차의 상태 설명일 뿐 판매 이유가 아님' },
      { label: 'B', text: 'She finds it difficult to maintain.', tag: '과도한 추론형', expl: '유지가 힘들다는 근거는 지문에 없음' },
      { label: 'C', text: 'She would like to have a newer model.', tag: '과도한 추론형', expl: '더 새 차를 원한다는 근거는 지문에 없음' },
      { label: 'D', text: 'She is leaving for another country.', correct: true, evidence: '"Owner going overseas at the end of this month"에서 해외로 떠나기 때문에 판매함을 알 수 있음' },
    ],
  },
];

// ---------- 시트 행 변환 ----------
const HEADERS = {
  P1: ['question_id', 'lecture_code', 'difficulty', 'question_text', 'question_number', 'photo_type', 'key_elements', 'option_label', 'option_text', 'is_correct', 'option_error_tag', 'option_explanation', 'correct_evidence', 'notes'],
  P5: ['question_id', 'lecture_code', 'difficulty', 'question_text', 'question_number', 'blank_sentence', 'blank_type', 'grammar_point', 'option_label', 'option_text', 'is_correct', 'option_error_tag', 'option_explanation', 'correct_evidence', 'notes'],
  P6: ['question_id', 'lecture_code', 'difficulty', 'question_text', 'question_number', 'passage_context', 'blank_type', 'option_label', 'option_text', 'is_correct', 'option_error_tag', 'option_explanation', 'correct_evidence', 'notes'],
  P7: ['question_id', 'lecture_code', 'difficulty', 'question_text', 'question_number', 'passage_text', 'passage_type', 'passage_structure', 'evidence_sentence', 'option_label', 'option_text', 'is_correct', 'option_error_tag', 'option_explanation', 'correct_evidence', 'notes'],
};

function optionRows(base, options, headers) {
  return options.map((o) => {
    const row = {
      ...base,
      option_label: o.label,
      option_text: o.text,
      is_correct: o.correct ? 'TRUE' : 'FALSE',
      option_error_tag: o.tag || '',
      option_explanation: o.expl || '',
      correct_evidence: o.evidence || '',
      notes: base.notes || 'rcData.ts에서 이관',
    };
    return headers.map((h) => row[h] ?? '');
  });
}

function buildAllRows() {
  const p1 = P1_ROWS.map((r) => HEADERS.P1.map((h) => r[h] ?? ''));

  const p5 = P5_DATA.flatMap((q) =>
    optionRows(
      { question_id: q.qid, lecture_code: q.lecture, difficulty: '중', question_text: '빈칸에 알맞은 것을 고르시오.', question_number: q.num ?? '', blank_sentence: q.sentence, blank_type: q.blankType, grammar_point: q.grammar },
      q.options,
      HEADERS.P5
    )
  );

  const p6 = P6_DATA.flatMap((q, i) =>
    optionRows(
      { question_id: q.qid, lecture_code: 'RC-P6-01', difficulty: '중', question_text: q.questionText, question_number: String(i + 1), passage_context: P6_PASSAGE, blank_type: '문법형' },
      q.options,
      HEADERS.P6
    )
  );

  const p7 = P7_DATA.flatMap((q, i) =>
    optionRows(
      { question_id: q.qid, lecture_code: 'RC-P7-03', difficulty: '중', question_text: q.questionText, question_number: String(i + 1), passage_text: P7_PASSAGE, passage_type: '광고·홍보문', passage_structure: P7_STRUCTURE, evidence_sentence: q.evidenceSentence },
      q.options,
      HEADERS.P7
    )
  ).concat(
    P7B_DATA.flatMap((q, i) =>
      optionRows(
        { question_id: q.qid, lecture_code: 'RC-P7-03', difficulty: '중', question_text: q.questionText, question_number: String(147 + i), passage_text: P7B_PASSAGE, passage_type: '광고·홍보문', passage_structure: P7B_STRUCTURE, evidence_sentence: q.evidenceSentence, notes: 'part7Scenario.ts에서 이관 (Part7ConvAIScreen 화면 데이터)' },
        q.options,
        HEADERS.P7
      )
    )
  );

  return { p1, p5, p6, p7 };
}

async function main() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const { p1, p5, p6, p7 } = buildAllRows();

  // 헤더(1행) 아래 기존 데이터를 지우고 새로 쓴다 (idempotent)
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { ranges: ['문항입력_P1!A2:Z', '문항입력_P5!A2:Z', '문항입력_P6!A2:Z', '문항입력_P7!A2:Z'] },
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: '문항입력_P1!A2', values: p1 },
        { range: '문항입력_P5!A2', values: p5 },
        { range: '문항입력_P6!A2', values: p6 },
        { range: '문항입력_P7!A2', values: p7 },
      ],
    },
  });

  console.log(`written rows — P1: ${p1.length}, P5: ${p5.length}, P6: ${p6.length}, P7: ${p7.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
