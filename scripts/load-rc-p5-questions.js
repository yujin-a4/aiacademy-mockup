/**
 * Part 5 문항(scripts/dump/rc_p5_bank*.json) → RC-P5 강의 적재
 *
 * 배경: 커리큘럼 42강 중 RC Part 5 6강이 비어 있었다(RC-P5-01·05·09·10·14·15).
 *   Part 5 는 지문이 없고 문장 하나라 load-rc-questions.js(지문 세트 단위)로는 못 넣는다.
 *   교재 PDF → scripts/extract_rc_p5.py → 이 스크립트 → DB.
 *
 * ⚠️ 시트 동기화는 중단됐고(2026-07-28) **DB 가 문항의 정본**이다. 그래서 여기서 DB 에 직접 쓴다.
 *
 * 두 갈래가 섞여 있다
 *   기본     — 비어 있던 5강을 1권에서 통째로 채운다(기존 문항을 지우고 다시 쓴다)
 *   append   — 문항이 1~2개뿐이라 수업/실전이 성립 못 하던 강의를 2권으로 3+3 으로 맞춘다.
 *              기존 문항은 그대로 두고 **뒤 번호로 이어 붙인다**.
 *
 * 🔴 RC-P5-15(가정법)는 여기에 없다 — 1권·2권 Part 5 **600문항** 해설 전문을 훑어도 가정법
 *   문항이 0건이다(두 권 RC 해설 전체에서 '가정법'이 나오는 곳은 1권 Part 6 의 한 문항뿐).
 *   실전 토익에 거의 안 나오는 유형이라 모의고사 교재에 없는 것이다. 기획 판단 대기 중.
 *
 * 무엇을 어디서 가져오나
 *   문장·보기·정답 — 파서 결과(rc_p5_bank*.json)에서 **그대로**. 손으로 옮겨 적지 않는다.
 *   정답 근거(correct_evidence)·오답 설명(option_explanation)·오답 태그 — 교재 해설을 근거로
 *   이 파일에서 손으로 쓴다. 교재 해설은 문항 단위 산문이라 보기별로 쪼개져 있지 않다.
 *
 * 넣은 뒤에는
 *   node scripts/build-lecture-items.js --go   (아이템 연결 — 문항 id 가 새로 생기므로 반드시)
 *   Part 5 는 음원이 없어 relink-audio 는 필요 없다.
 *
 * 사용
 *   python scripts/extract_rc_p5.py            # 1권 → scripts/dump/rc_p5_bank.json
 *   python scripts/extract_rc_p5.py --vol 2    # 2권 → scripts/dump/rc_p5_bank2.json
 *   node scripts/load-rc-p5-questions.js       # dry run
 *   node scripts/load-rc-p5-questions.js --go
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const GO = process.argv.includes('--go');

/* wrong_answer_tags 의 Part 5 태그 id — 이름으로 쓰고 여기서 id 로 바꾼다 */
const TAG = { 품사: 27, 구조: 28, 의미: 29, 형태: 30, 콜로: 31 };

/* ── 무엇을 어느 강의에 넣을까 ──
   [t, n] = 교재 TEST 번호 + 문항 번호. 앞 3개가 수업(Q), 뒤 3개가 실전(P).
   고른 기준: 교재 해설이 **그 강의의 문법 주제를 정답 근거로 삼는** 문항만.
   (예: 자·타동사 강의는 라벨이 '동사 어휘'여도 해설이 "목적어가 필요한 타동사라 오답"이라 말하는 것)
   이미 DB 에 들어가 있는 문항 54개와는 겹치지 않는다 — 문장 대조로 확인했다. */
const PLAN = [
  {
    lecture: 'RC-P5-01', grammar: '문장 구조',
    picks: [
      { t: 4, n: 102,
        evidence: '주어 A recent study 와 that절 사이는 that절을 목적어로 받을 동사 자리다.',
        wrong: {
          A: [TAG.품사, '부사라 문장의 동사 자리에 올 수 없다.'],
          B: [TAG.품사, '형용사라 동사 자리에 올 수 없다.'],
          D: [TAG.품사, '명사라 이 자리에 넣으면 문장에 동사가 없어진다.'],
        } },
      { t: 6, n: 106,
        evidence: '빈칸 뒤에 명사구와 전치사구만 있고 동사가 없으므로 동사원형으로 시작하는 명령문이다.',
        wrong: {
          B: [TAG.구조, '과거형·과거분사라 동사원형으로 시작하는 명령문에 쓸 수 없다.'],
          C: [TAG.구조, '동명사·현재분사라 그것만으로는 문장의 동사가 되지 못한다.'],
          D: [TAG.품사, '명사라 이 자리에 넣으면 문장에 동사가 없어진다.'],
        } },
      { t: 10, n: 104,
        evidence: 'so 뒤에 주어 organizers 만 있고 나머지는 동명사구뿐이라 빈칸이 so절의 동사 자리다.',
        wrong: {
          A: [TAG.구조, 'to부정사는 절의 동사가 될 수 없다.'],
          B: [TAG.형태, 'advise(동사)와 철자가 비슷한 명사라 동사 자리에 쓸 수 없다.'],
          D: [TAG.구조, '동명사·현재분사라 단독으로 절의 동사가 되지 못한다.'],
        } },
      { t: 2, n: 123, phase: 'practice',
        evidence: '앞에 has, 뒤에 to부정사가 있으므로 has 와 현재완료를 이루면서 to부정사를 목적어로 받는 동사 자리다.',
        wrong: {
          A: [TAG.품사, '전치사·접속사라 has 뒤 동사 자리에 올 수 없다.'],
          B: [TAG.품사, '부사라 현재완료의 과거분사 자리를 채우지 못한다.'],
          C: [TAG.품사, '접속사라 동사 자리에 올 수 없다.'],
        } },
      { t: 7, n: 120, phase: 'practice',
        evidence: '조동사 will 뒤에는 동사원형이 와야 한다.',
        wrong: {
          B: [TAG.구조, '과거형·과거분사라 조동사 will 뒤에 바로 올 수 없다.'],
          C: [TAG.품사, '명사라 동사 자리에 맞지 않는다.'],
          D: [TAG.구조, 'to부정사라 조동사 뒤 동사원형 자리에 올 수 없다.'],
        } },
      { t: 9, n: 109, phase: 'practice',
        evidence: '조동사 will 뒤이므로 동사원형이 필요하다. no longer 는 사이에 낀 부사일 뿐이다.',
        wrong: {
          A: [TAG.품사, '형용사라 조동사 뒤 동사 자리에 올 수 없다.'],
          C: [TAG.품사, '명사라 동사 자리에 맞지 않는다.'],
          D: [TAG.품사, '부사라 동사 자리를 채우지 못한다.'],
        } },
    ],
  },
  {
    lecture: 'RC-P5-05', grammar: '자동사·타동사',
    picks: [
      { t: 2, n: 124,
        evidence: "빈칸 뒤 전치사 in 과 어울리는 자동사가 필요하다 — specialize in(~을 전문으로 하다).",
        wrong: {
          B: [TAG.콜로, "'구별하다'라는 뜻의 타동사라 목적어 없이 in 과 이어지지 않는다."],
          C: [TAG.구조, '전치사 없이 목적어를 바로 취하는 타동사다.'],
          D: [TAG.콜로, 'commit 은 to 와 짝을 이룬다 — in 과 어울리지 않는다.'],
        } },
      { t: 3, n: 126,
        evidence: '관계대명사가 생략된 절 안에서 the training 을 목적어로 받는 타동사 자리다.',
        wrong: {
          A: [TAG.구조, '자동사라 목적어(the training)를 받을 수 없다.'],
          C: [TAG.구조, '자동사여서 목적어를 쓰려면 participate in 처럼 전치사가 필요하다.'],
          D: [TAG.의미, "'지시하다'는 사람을 목적어로 삼는 말이라 '실시할 교육'이라는 문맥에 맞지 않는다."],
        } },
      { t: 8, n: 116,
        evidence: '빈칸 뒤에 목적어 없이 콤마와 부사절이 이어지므로 자동사가 필요하다 — resume(재개되다).',
        wrong: {
          A: [TAG.구조, '목적어가 필요한 타동사인데 빈칸 뒤에 목적어가 없다.'],
          C: [TAG.구조, '목적어가 필요한 타동사라 이 자리에 쓸 수 없다.'],
          D: [TAG.구조, '목적어가 필요한 타동사라 이 자리에 쓸 수 없다.'],
        } },
      { t: 5, n: 106, phase: 'practice',
        evidence: '주어 Problems 뒤에 목적어 없이 by 전치사구가 이어지므로 자동사가 와야 한다 — arise(발생하다).',
        wrong: {
          A: [TAG.구조, '타동사라 목적어가 필요한데 뒤에 전치사구만 있다.'],
          B: [TAG.구조, '타동사라 목적어가 필요한데 뒤에 전치사구만 있다.'],
          D: [TAG.구조, '타동사라 목적어가 필요한데 뒤에 전치사구만 있다.'],
        } },
      { t: 1, n: 101, phase: 'practice',
        evidence: '전치사 of 의 목적어 자리다. 동명사도 전치사 뒤에 올 수 있지만 modify 는 타동사라 목적어가 있어야 하는데 뒤에는 전치사구뿐이라 명사가 와야 한다.',
        wrong: {
          B: [TAG.구조, '동명사로 전치사 뒤에 올 수는 있지만, modify 는 타동사라 목적어가 필요한데 뒤에 전치사구만 이어진다.'],
          C: [TAG.품사, '동사 형태라 전치사 뒤에 올 수 없다.'],
          D: [TAG.품사, '동사 형태라 전치사 뒤에 올 수 없다.'],
        } },
      { t: 10, n: 114, phase: 'practice',
        evidence: '빈칸 뒤 전치사 on 과 어울리는 자동사가 필요하다 — concentrate on(~에 집중하다).',
        wrong: {
          A: [TAG.구조, '타동사라 전치사 on 없이 목적어를 바로 취한다.'],
          B: [TAG.의미, "on 과 쓰이기는 하지만 '주장하다'라 생산에 집중한다는 문맥에 맞지 않는다."],
          C: [TAG.구조, '타동사라 목적어를 바로 취하며 on 과 이어지지 않는다.'],
        } },
    ],
  },
  {
    lecture: 'RC-P5-09', grammar: 'to부정사·동명사',
    picks: [
      { t: 1, n: 106,
        evidence: 'instruct 는 「instruct+목적어+to부정사」로 쓰는 동사라, 수동태 be instructed 뒤에는 to부정사가 온다.',
        wrong: {
          A: [TAG.구조, '동명사·현재분사는 be instructed 뒤 목적격 보어 자리에 오지 않는다.'],
          B: [TAG.구조, '동사(현재형)라 이미 동사가 있는 문장에 또 올 수 없다.'],
          D: [TAG.구조, '완료 동명사라 be instructed 뒤 to부정사 자리에 맞지 않는다.'],
        } },
      { t: 7, n: 107,
        evidence: '전치사 After 의 목적어이면서 뒤의 명사구를 목적어로 취해야 하므로 동명사 자리다.',
        wrong: {
          A: [TAG.구조, '명사라 뒤에 오는 명사구를 목적어로 취하지 못한다.'],
          B: [TAG.품사, '동사원형이라 전치사 뒤에 올 수 없다.'],
          C: [TAG.품사, '과거형·과거분사라 전치사의 목적어가 될 수 없다.'],
        } },
      { t: 5, n: 111,
        evidence: '전치사 before 의 목적어 역할을 할 수 있는 것은 동명사다.',
        wrong: {
          A: [TAG.품사, '동사(현재형)라 전치사 뒤에 쓸 수 없다.'],
          B: [TAG.품사, 'to부정사는 전치사의 목적어가 되지 못한다.'],
          D: [TAG.품사, '「조동사+동사원형」이라 전치사 뒤에 올 수 없다.'],
        } },
      { t: 1, n: 104, phase: 'practice',
        evidence: 'understands 의 목적어 자리에 to부정사구가 이어지므로 「의문사+to부정사」로 명사구를 만들어야 한다.',
        wrong: {
          A: [TAG.품사, '부사라 to부정사와 명사구를 이루지 못한다.'],
          C: [TAG.품사, '전치사라 뒤의 to부정사를 받아 목적어를 만들지 못한다.'],
          D: [TAG.구조, '접속사 that 은 뒤에 절이 와야 하며 to부정사와 결합하지 않는다.'],
        } },
      { t: 7, n: 106, phase: 'practice',
        evidence: 'would like 는 to부정사를 목적어로 취하고, 뒤의 명사구를 받으려면 to부정사여야 한다.',
        wrong: {
          A: [TAG.구조, 'would like 는 동명사를 목적어로 취하지 않는다.'],
          B: [TAG.구조, '명사라 뒤에 오는 명사구를 목적어로 취하지 못한다.'],
          D: [TAG.구조, '완료 동명사라 would like 뒤에 올 수 없다.'],
        } },
      { t: 9, n: 110, phase: 'practice',
        evidence: 'be tasked with 의 with 뒤 동명사 자리이고, 설문 결과를 목적어로 받아 자연스러운 것은 summarize 다.',
        wrong: {
          B: [TAG.의미, "'수행하다'라 이미 완료된 조사의 결과를 목적어로 삼기에 어색하다."],
          C: [TAG.의미, "'개선하다'라 조사 결과를 목적어로 삼기에 문맥상 어색하다."],
          D: [TAG.의미, "'달성하다'라 조사 결과와 어울리지 않는다."],
        } },
    ],
  },
  {
    lecture: 'RC-P5-10', grammar: '분사·분사구문',
    picks: [
      { t: 2, n: 101,
        evidence: '주어 you 를 보충하는 주격 보어 자리이고 you 가 감정을 느끼는 쪽이므로 과거분사다 — be pleased with.',
        wrong: {
          B: [TAG.품사, '명사라 감정을 나타내는 보어 자리에 맞지 않는다.'],
          C: [TAG.구조, "현재분사는 '남을 기쁘게 하는'이라는 뜻이라 감정을 느끼는 사람 주어와 맞지 않는다."],
          D: [TAG.품사, '동사원형이라 be동사 뒤에 올 수 없다.'],
        } },
      { t: 3, n: 114,
        evidence: 'be동사 뒤 분사 자리인데 뒤에 목적어가 없고 직원이 보상을 받는 쪽이므로 과거분사다.',
        wrong: {
          B: [TAG.품사, '동사원형·명사라 be동사 뒤 분사 자리에 맞지 않는다.'],
          C: [TAG.구조, '현재분사는 뒤에 목적어가 필요한데 전치사구만 이어진다.'],
          D: [TAG.품사, '명사(복수) 또는 동사(3인칭 단수)라 이 자리에 맞지 않는다.'],
        } },
      { t: 3, n: 117,
        evidence: "be동사 뒤 분사 자리이고, grow 는 '증가하다'일 때 자동사라 현재분사로 진행형을 이룬다.",
        wrong: {
          A: [TAG.구조, '동사(현재형)라 be동사 뒤에 올 수 없다.'],
          C: [TAG.구조, '동사원형이라 be동사 뒤에 올 수 없다.'],
          D: [TAG.구조, '자동사는 수동태가 될 수 없어 과거분사를 쓸 수 없다.'],
        } },
      { t: 3, n: 128, phase: 'practice',
        evidence: '문장에 이미 동사 are encouraged 가 있으므로 빈칸은 Performers 를 뒤에서 수식하는 분사 자리이고, 탈락"된"이라는 수동 의미라 과거분사다.',
        wrong: {
          A: [TAG.구조, '현재분사는 능동이라 목적어가 필요한데 전치사구만 이어진다.'],
          B: [TAG.구조, '동사라 이미 동사가 있는 문장에 또 들어갈 수 없다.'],
          D: [TAG.구조, "관계사절의 동사가 능동이라 '탈락된 공연자'라는 의미가 되지 않는다."],
        } },
      { t: 4, n: 121, phase: 'practice',
        evidence: '뒤에 분사구와 콤마, 그리고 주절이 이어지므로 「접속사+분사구」 분사구문이 되어야 하고, 문맥상 ~하기 전에가 맞다.',
        wrong: {
          A: [TAG.의미, "접속사이긴 하지만 '비록 ~이지만'이라 문맥에 맞지 않는다."],
          B: [TAG.의미, '문장 전체를 수식하는 말이라 분사구를 이끌지 못한다.'],
          D: [TAG.의미, "분사를 수식할 수는 있지만 '오히려'라는 의미가 맞지 않는다."],
        } },
      { t: 6, n: 101, phase: 'practice',
        evidence: 'be동사 뒤 보어 자리이고, 주어(게임의 마지막 단계)가 사람을 불만스럽게 만드는 쪽이므로 현재분사다.',
        wrong: {
          A: [TAG.품사, '동사라 be동사 뒤 보어 자리에 올 수 없다.'],
          C: [TAG.품사, '명사라 부사 somewhat 의 수식을 받지 못한다.'],
          D: [TAG.구조, '과거분사는 사람이 느끼는 감정을 나타내 사물 주어와 어울리지 않는다.'],
        } },
    ],
  },
  {
    lecture: 'RC-P5-14', grammar: '비교·최상급',
    picks: [
      { t: 5, n: 114,
        evidence: '명사 challenge 를 수식하는 형용사 자리이고, 비교급을 강조하는 부사 even 과 어울리므로 비교급이다.',
        wrong: {
          A: [TAG.구조, '원급이라 비교급을 강조하는 even 과 어울리지 않는다.'],
          B: [TAG.품사, "부사라 명사를 수식하지 못한다('거의 ~않다'라는 뜻이기도 하다)."],
          D: [TAG.구조, '최상급이라 even 의 수식을 받지 못하고 the 도 없다.'],
        } },
      { t: 6, n: 113,
        evidence: 'be동사 뒤 보어 자리이고 앞뒤에 more 와 than 이 있으므로 비교급을 이룰 형용사가 필요하다.',
        wrong: {
          A: [TAG.품사, '명사(복수)라 more ~ than 비교 구문의 형용사 자리에 맞지 않는다.'],
          B: [TAG.품사, '명사라 형용사 자리에 맞지 않는다.'],
          D: [TAG.품사, '부사라 be동사의 보어가 되지 못한다.'],
        } },
      { t: 6, n: 124,
        evidence: 'the 뒤 보어 자리이고 Among ~ 이 비교 범위를 나타내므로 최상급 형용사가 온다.',
        wrong: {
          A: [TAG.의미, "명사라 보어는 될 수 있지만 딸기가 '맛들'이라는 뜻이 되어 어색하다."],
          B: [TAG.구조, 'the 와 Among 이 만드는 최상급 구문에 원급은 맞지 않는다.'],
          D: [TAG.품사, '부사라 be동사의 보어가 되지 못한다.'],
        } },
      { t: 1, n: 129, phase: 'practice',
        evidence: '자동사 speak 를 뒤에서 수식하는 부사 자리이고, 비교 대상을 나타내는 than 이 있으므로 비교급 부사다.',
        wrong: {
          A: [TAG.품사, '형용사라 동사 speak 를 수식하지 못한다.'],
          B: [TAG.구조, '원급이라 뒤의 than 과 짝을 이루지 못한다.'],
          C: [TAG.품사, '최상급 형용사라 동사를 수식하지 못하고 than 과도 어울리지 않는다.'],
        } },
      { t: 8, n: 103, phase: 'practice',
        evidence: '명사 career history 를 수식하는 형용사 자리이고, 「out of 복수 명사구」가 비교 범위를 나타내므로 최상급이다.',
        wrong: {
          A: [TAG.구조, 'the 와 out of 가 만드는 최상급 구문에 원급은 맞지 않는다.'],
          B: [TAG.품사, '명사라 명사 career history 를 수식하지 못한다.'],
          C: [TAG.구조, '비교급이라 than 없이 out of 범위 표현과 어울리지 않는다.'],
        } },
      { t: 10, n: 117, phase: 'practice',
        evidence: '비교급 형용사 more expensive 를 수식하는 자리이므로 부사가 온다.',
        wrong: {
          A: [TAG.품사, '형용사라 형용사 more expensive 를 수식하지 못한다.'],
          C: [TAG.품사, '명사라 이 자리에 맞지 않는다.'],
          D: [TAG.품사, '분사라 비교급 형용사를 수식하지 못한다.'],
        } },
    ],
  },

  /* ── 여기서부터는 **2권**에서 뽑아 이미 있는 강의에 덧붙인다(append) ──
     문항이 1~2개뿐이라 수업/실전이 성립하지 않던 강의를 3+3 으로 맞춘다.
     append 는 기존 문항을 지우지 않고 뒤 번호로 이어 붙인다. */
  {
    lecture: 'RC-P5-02', grammar: '품사 구분·빈칸 자리 판별', vol: 2, append: true,
    picks: [
      { t: 1, n: 110,
        evidence: "전치사 of 의 목적어이면서 앞에 소유격 Mr. Gu's 가 있으므로 명사 자리이고, one of 뒤에는 복수 명사가 온다.",
        wrong: {
          A: [TAG.구조, '명사이긴 하지만 단수라 one of 뒤에 올 수 없다.'],
          C: [TAG.품사, '형용사라 전치사의 목적어가 되지 못한다.'],
          D: [TAG.품사, '부사라 전치사의 목적어가 되지 못한다.'],
        } },
      { t: 1, n: 123,
        evidence: '명사 planning 을 앞에서 수식하는 자리이므로 형용사가 온다.',
        wrong: {
          A: [TAG.품사, '명사라 명사 planning 을 수식하지 못한다.'],
          C: [TAG.품사, '명사라 명사 planning 을 수식하지 못한다.'],
          D: [TAG.품사, '부사라 명사를 수식하지 못한다.'],
        } },
      { t: 3, n: 102, phase: 'practice',
        evidence: '현재진행형 is increasing 사이에 끼어 동사를 수식하는 자리이므로 부사가 온다.',
        wrong: {
          A: [TAG.품사, '명사라 완성된 동사구 사이에 들어갈 수 없다.'],
          B: [TAG.품사, '형용사라 동사를 수식하지 못한다.'],
          D: [TAG.품사, '동사라 이미 동사가 있는 자리에 또 들어갈 수 없다.'],
        } },
      { t: 3, n: 116, phase: 'practice',
        evidence: '동사 highlights 의 목적어 자리이고 앞에 소유격 its 가 있으므로 명사가 온다.',
        wrong: {
          A: [TAG.품사, '동사라 목적어 자리에 올 수 없다.'],
          C: [TAG.의미, "명사로 쓰이면 '보수주의자'라 서식지를 목적어로 삼는 문맥에 맞지 않는다."],
          D: [TAG.품사, '과거분사·형용사라 소유격 뒤 목적어 자리에 맞지 않는다.'],
        } },
      { t: 3, n: 105, phase: 'practice',
        evidence: "소유격 City Council's 와 명사 vote 사이이므로 명사를 수식할 형용사 자리다.",
        wrong: {
          A: [TAG.품사, '부사라 명사 vote 를 수식하지 못한다.'],
          B: [TAG.구조, '명사지만 vote 와 복합명사를 이루지 않는다.'],
          C: [TAG.품사, '동사라 이 자리에 올 수 없다.'],
        } },
    ],
  },
  {
    lecture: 'RC-P5-06', grammar: '동사 수일치', vol: 2, append: true,
    picks: [
      { t: 5, n: 117,
        evidence: '주절에 동사가 없으므로 동사 자리이고, 주어의 핵이 복수 The walls 라 복수 동사가 온다(of the canyon 은 수식어).',
        wrong: {
          A: [TAG.구조, '단수 동사라 복수 주어 The walls 와 수가 맞지 않는다.'],
          C: [TAG.구조, '현재분사라 단독으로 문장의 동사가 되지 못한다.'],
          D: [TAG.품사, '형용사의 비교급이라 동사 자리에 올 수 없다.'],
        } },
    ],
  },
  {
    lecture: 'RC-P5-13', grammar: '관계사', vol: 2, append: true,
    picks: [
      { t: 9, n: 126,
        evidence: '주어와 동사 사이에 삽입되어 주어를 수식하는 절이고, 빈칸 뒤에 주어 없이 동사가 오므로 주격 관계대명사가 온다.',
        wrong: {
          B: [TAG.품사, '부사라 관계절을 이끌지 못한다.'],
          C: [TAG.구조, '대명사라 두 절을 이어 주지 못한다 — 접속사 역할이 없다.'],
          D: [TAG.구조, 'what 은 선행사를 포함하는 관계대명사라 앞에 선행사가 있는 이 자리에 쓸 수 없다.'],
        } },
      { t: 5, n: 128,
        evidence: "앞에 완전한 절이 있고 형용사 possible 과 짝을 이루므로 복합관계부사가 온다 — wherever possible(가능한 곳에서는 어디든).",
        wrong: {
          A: [TAG.콜로, "단순 부사라 형용사 possible 과 묶여 자연스러운 표현을 이루지 못한다."],
          B: [TAG.의미, '시간·이유를 나타내는 부사절 접속사라 의미가 맞지 않는다.'],
          C: [TAG.콜로, '단순 부사라 형용사 possible 과 묶여 자연스러운 표현을 이루지 못한다.'],
        } },
    ],
  },
];

/* ── 파서 결과 ── 1권·2권을 함께 읽는다(권+회차+문항번호로 집는다) */
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const toBlank = (s) => norm(s).replace(/-{3,}/g, '_______');

function loadBank(vols) {
  const idx = new Map();
  for (const vol of vols) {
    const file = path.join(__dirname, 'dump', `rc_p5_bank${vol === 1 ? '' : vol}.json`);
    if (!fs.existsSync(file)) {
      console.error(`${file} 없음 — python scripts/extract_rc_p5.py --vol ${vol} 를 먼저 돌려라`);
      process.exit(1);
    }
    for (const b of JSON.parse(fs.readFileSync(file, 'utf8'))) idx.set(`${vol}-${b.test}-${b.num}`, b);
  }
  return idx;
}

async function main() {
  const bank = loadBank([...new Set(PLAN.map((p) => p.vol ?? 1))]);

  /* 계획 검증 — 넣기 전에 전부 막는다 */
  const seen = new Set();
  const jobs = [];
  for (const p of PLAN) {
    const vol = p.vol ?? 1;
    const items = { lesson: [], practice: [] };
    for (const pick of p.picks) {
      const where = `${vol}권 TEST ${pick.t} Q${pick.n}`;
      const key = `${vol}-${pick.t}-${pick.n}`;
      if (seen.has(key)) { console.error(`✗ 같은 문항을 두 곳에 썼다: ${where}`); process.exit(1); }
      seen.add(key);
      const b = bank.get(key);
      if (!b) { console.error(`✗ 파서 결과에 없다: ${where}`); process.exit(1); }
      if (!b.answer) { console.error(`✗ 정답이 없다: ${where}`); process.exit(1); }
      const wrongLabels = Object.keys(pick.wrong).sort().join('');
      const expected = 'ABCD'.split('').filter((l) => l !== b.answer).join('');
      if (wrongLabels !== expected) {
        console.error(`✗ ${where}: 정답은 (${b.answer})인데 오답 설명은 ${wrongLabels} 에 달렸다`);
        process.exit(1);
      }
      items[pick.phase ?? 'lesson'].push({ ...pick, b, vol });
    }
    jobs.push({ ...p, vol, items });
  }

  console.log('넣을 것\n');
  for (const j of jobs) {
    for (const phase of ['lesson', 'practice']) {
      for (const it of j.items[phase]) {
        console.log(`  ${j.lecture}${j.append ? '+' : ' '} ${phase.padEnd(8)} ${j.vol}권 T${String(it.b.test).padStart(2)} Q${it.b.num} (${it.b.answer})  ${toBlank(it.b.sentence).slice(0, 58)}`);
      }
    }
  }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const lectures = new Map(
      (await c.query('select id, lecture_code from lectures')).rows.map((r) => [r.lecture_code, r.id]),
    );
    const miss = jobs.filter((j) => !lectures.get(j.lecture)).map((j) => j.lecture);
    if (miss.length) { console.error(`✗ lectures 에 없는 강의: ${miss.join(', ')}`); process.exit(1); }

    /* 이미 DB 에 있는 문장과 겹치는지 — 수업에서 본 걸 실전에서 또 푸는 사고 방지.
       통째로 다시 쓰는 강의만 제외한다. append 강의는 **자기 기존 문항과도** 겹치면 안 된다. */
    const { rows: existing } = await c.query(
      `select l.lecture_code, q.content->>'blank_sentence' s from questions q
         join lectures l on l.id = q.lecture_id
        where q.part = 5 and q.content ? 'blank_sentence' and l.lecture_code <> all($1)`,
      [jobs.filter((j) => !j.append).map((j) => j.lecture)]);
    const flat = (s) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 60);
    const owned = new Map(existing.map((r) => [flat(r.s), r.lecture_code]));
    let dup = 0;
    for (const j of jobs) {
      for (const it of [...j.items.lesson, ...j.items.practice]) {
        const hit = owned.get(flat(toBlank(it.b.sentence)));
        if (hit) { console.error(`✗ ${j.lecture} T${it.b.test} Q${it.b.num} 은 이미 ${hit} 에 있다`); dup += 1; }
      }
    }
    if (dup) process.exit(1);

    if (!GO) { console.log('\n(dry run) 겹침 0 · 넣으려면 --go'); return; }

    let qTotal = 0, oTotal = 0;
    for (const j of jobs) {
      const lectureId = lectures.get(j.lecture);
      await c.query('begin');
      try {
        /* 재실행 안전 — 이 강의의 기존 문항을 지운다. Part 5 는 지문이 없어 passages 정리가 필요 없다.
           append 는 지우지 않고 뒤 번호로 이어 붙인다(기존 문항이 정본이라 건드리면 안 된다). */
        if (!j.append) {
          await c.query(
            `delete from learner_answer_log where question_id in (select id from questions where lecture_id = $1)`,
            [lectureId]);
          await c.query('delete from questions where lecture_id = $1', [lectureId]);
          await c.query('delete from lecture_items where lecture_id = $1', [lectureId]);
          await c.query('delete from sandbox.lecture_items where lecture_id = $1', [lectureId]);
        }

        /* append 면 이미 쓰인 번호 다음부터 — 재실행해도 같은 코드가 다시 나오면 안 된다 */
        const used = { lesson: 0, practice: 0 };
        if (j.append) {
          const { rows } = await c.query(
            `select question_code from questions where lecture_id = $1`, [lectureId]);
          for (const r of rows) {
            const m = /-([QP])(\d{3})$/.exec(r.question_code);
            if (!m) continue;
            const ph = m[1] === 'Q' ? 'lesson' : 'practice';
            used[ph] = Math.max(used[ph], Number(m[2]));
          }
        }

        for (const phase of ['lesson', 'practice']) {
          const prefix = phase === 'lesson' ? 'Q' : 'P';
          const list = j.items[phase];
          for (let k = 0; k < list.length; k += 1) {
            const { b, evidence, wrong } = list[k];
            const n = used[phase] + k + 1;
            const content = {
              ...(phase === 'practice' ? { stage: 'practice' } : {}),
              blank_type: '문법형',
              grammar_point: j.grammar,
              question_text: '빈칸에 알맞은 것을 고르시오.',
              blank_sentence: toBlank(b.sentence),
              question_type_label: norm(b.label),
              source: `YBM 실전토익 RC 1000_${j.vol} TEST ${b.test} Q${b.num}`,
            };
            const qr = await c.query(
              `insert into questions (question_code, lecture_id, part, difficulty, content, display_order)
               values ($1,$2,5,'중',$3,$4) returning id`,
              [`${j.lecture}-${prefix}${String(n).padStart(3, '0')}`, lectureId, JSON.stringify(content), n]);
            const questionId = qr.rows[0].id;
            qTotal += 1;

            let order = 0;
            for (const L of ['A', 'B', 'C', 'D']) {
              order += 1;
              const ok = L === b.answer;
              const [tagId, why] = ok ? [null, null] : wrong[L];
              await c.query(
                `insert into question_options
                   (question_id, option_label, option_text, is_correct,
                    option_error_tag_id, correct_evidence, option_explanation, display_order)
                 values ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [questionId, L, norm(b.opts[L]), ok, tagId, ok ? evidence : null, ok ? null : why, order]);
              oTotal += 1;
            }
          }
        }
        await c.query('commit');
        console.log(`  ✓ ${j.lecture}`);
      } catch (err) {
        await c.query('rollback');
        console.error(`  ✗ ${j.lecture}: ${err.message}`);
      }
    }
    console.log(`\n문항 ${qTotal} · 보기 ${oTotal} 반영`);
    console.log('다음: node scripts/build-lecture-items.js --go');
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
