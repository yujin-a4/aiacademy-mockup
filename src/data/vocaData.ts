export interface VocaWord {
  id: number;
  word: string;
  meaning: string;
  example: string;
}

const baseWords: Omit<VocaWord, 'id'>[] = [
  { word: "accommodate", meaning: "수용하다, 편의를 도모하다", example: "The hotel can accommodate up to 500 guests." },
  { word: "implement", meaning: "실행하다, 이행하다", example: "The company plans to implement a new policy next month." },
  { word: "comprehensive", meaning: "포괄적인, 종합적인", example: "We offer a comprehensive benefits package." },
  { word: "fluctuate", meaning: "변동하다, 오르내리다", example: "Prices tend to fluctuate depending on the season." },
  { word: "subsequently", meaning: "그 후에, 나중에", example: "He was injured and subsequently left the team." },
  { word: "mandatory", meaning: "의무적인, 필수의", example: "Attendance at the meeting is mandatory for all staff." },
  { word: "initiative", meaning: "주도권, 새로운 계획", example: "The government launched a new initiative to reduce pollution." },
  { word: "apprehensive", meaning: "걱정하는, 불안한", example: "I was slightly apprehensive about the meeting." },
  { word: "versatile", meaning: "다재다능한, 다용도의", example: "This tool is highly versatile and easy to use." },
  { word: "outsource", meaning: "외주를 주다", example: "We decided to outsource the accounting work." },
  { word: "consecutive", meaning: "연속적인", example: "It rained for three consecutive days." },
  { word: "pertain", meaning: "속하다, 관련되다", example: "These documents pertain to the upcoming audit." },
  { word: "lucrative", meaning: "수익성이 좋은", example: "She has a lucrative business selling handmade jewelry." },
  { word: "preliminary", meaning: "예비의, 임시의", example: "The preliminary results are very encouraging." },
  { word: "stringent", meaning: "엄격한, 엄중한", example: "The factory must comply with stringent safety regulations." },
  { word: "expedite", meaning: "신속히 처리하다", example: "Please expedite the delivery of this package." },
  { word: "commence", meaning: "시작하다", example: "The conference will commence at 9:00 AM." },
  { word: "deliberate", meaning: "의도적인, 심사숙고하다", example: "The committee will deliberate on the matter tomorrow." },
  { word: "adjacent", meaning: "인접한, 가까운", example: "The new parking lot is adjacent to the main building." },
  { word: "redundant", meaning: "불필요한, 중복되는", example: "Many workers were made redundant due to the merger." },
  { word: "tentative", meaning: "잠정적인, 머뭇거리는", example: "We have reached a tentative agreement." },
  { word: "scrutinize", meaning: "면밀히 조사하다", example: "The contract was carefully scrutinized by our lawyers." },
  { word: "alleviate", meaning: "완화하다, 경감하다", example: "This medicine will help alleviate the pain." },
  { word: "warrant", meaning: "정당화하다, 보증서", example: "The circumstances do not warrant such drastic measures." },
  { word: "feasible", meaning: "실행 가능한", example: "It's not feasible to complete the project by Friday." },
  { word: "stipulate", meaning: "규정하다, 명시하다", example: "The contract stipulates that rent must be paid monthly." },
  { word: "endorse", meaning: "지지하다, 보증하다", example: "The celebrity was paid to endorse the new perfume." },
  { word: "prominent", meaning: "저명한, 두드러진", example: "He is a prominent figure in the tech industry." },
  { word: "obsolete", meaning: "구식의, 쓸모없는", example: "The software is now obsolete and will not be supported." },
  { word: "surpass", meaning: "능가하다, 뛰어넘다", example: "The company's profits surpassed all expectations." }
];

// 300개의 더미 데이터를 순환 생성
export const VOCA_DATA: VocaWord[] = Array.from({ length: 300 }).map((_, index) => ({
  id: index + 1,
  ...baseWords[index % baseWords.length],
}));
