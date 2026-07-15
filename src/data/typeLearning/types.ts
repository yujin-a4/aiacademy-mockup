/* ── 15문항 유형 × 이도윤 스캐폴딩 레일 — 타입 정의 ──
   시트 정본:
   · 유형 축: "AI어학원 자료 to 캐치잇" > 문항 유형(0703) — 15유형
   · 레일 축: "AI어학원 콘텐츠" > [이도윤 ver] 스케폴딩 (유형학습_G) 0713
   턴마다 {음원 재생, 스크립트 공개, 상호작용 방식, 강사 발화}가 정의되고
   플레이어(/type-lesson)는 이 데이터만 보고 화면을 바꾼다. (지금은 로컬 TS, 다음주 DB 이관 예정) */

export type Area = 'LC' | 'RC'

/* ── 콘텐츠 ── */

export interface OptionItem {
  label: string       // 'A' | 'B' ...
  text: string
  correct?: boolean
  why?: string        // 정/오답 근거 한 줄 (채점 후 표시)
}

export interface QuestionItem {
  q: string
  options: OptionItem[]
}

/** 문장 단위 스크립트/지문 — 음원 구간 재생·직독직해·하이라이트의 최소 단위 */
export interface SentenceItem {
  id: string
  en: string
  ko?: string         // 직독직해 해석 (P7 계열)
  speaker?: string    // LC 대화 화자 (W/M)
  blank?: number      // P5/P6: 이 문장에 포함된 빈칸 번호 (1~4)
}

export interface ChatMessage { id: string; speaker: string; time?: string; text: string }

export interface TableData { headers: string[]; rows: string[][] }

/** 지문 하나 — P6/P7용. LC 시각자료(표)도 kind='table'로 표현 */
export interface PassageDoc {
  id: string
  label?: string                    // '지문 1 · 공지'
  kind: 'text' | 'email' | 'notice' | 'ad' | 'article' | 'chat' | 'table' | 'form'
  title?: string
  meta?: { k: string; v: string }[] // 이메일 To/From/Subject 등
  sentences?: SentenceItem[]
  chat?: ChatMessage[]
  table?: TableData
}

export interface TypeLessonContent {
  photo?: string                    // P1 사진
  photoDesc?: string
  /** LC 음원 스크립트 (문장 단위 = 구간 재생 단위). P1은 없음(보기만 음성) */
  audioScript?: SentenceItem[]
  /** P1/P2: 보기도 음성으로 재생 (텍스트는 reveal 전 숨김) */
  optionAudio?: boolean
  /** LC 표/자료형(T4·T6) 시각자료 — 음원 듣는 동안 화면에 상시 노출 */
  visual?: { title: string; table: TableData }
  /** RC 지문(들) — P5는 문장 1개, P6는 장문 1개, P7은 1~3개 */
  passages?: PassageDoc[]
  questions: QuestionItem[]
}

/* ── 레일 (턴) ── */

/** 음원 지시 — 문장 id 구간 또는 보기 재생 */
export type AudioCue =
  | { kind: 'sentences'; ids: string[] }      // audioScript 문장 구간 재생
  | { kind: 'option'; qIdx: number; label: string }
  | { kind: 'options'; qIdx: number; labels: string[] }
  | { kind: 'full' }                          // audioScript 전체 (중간 정지 없음)

/** 스크립트/보기 텍스트 점진 공개 — 누적 적용 */
export interface RevealState {
  scriptIds?: string[] | 'all'    // 공개할 audioScript 문장
  optionText?: { qIdx: number; labels: string[] | 'all' }[]
  passageIds?: string[] | 'all'   // 다중 지문 점진 공개
}

export type Interaction =
  | { kind: 'next'; label?: string }                                   // AI 진행
  | { kind: 'choice'; prompt: string; choices: { text: string; correct?: boolean }[]; feedback?: string } // 선택 응답(퀵버튼)
  | { kind: 'pickAnswer'; qIdx: number; prompt?: string }              // 필수 응답 — 보기에서 정답 선택
  | { kind: 'solveAll'; prompt?: string }                              // 전체 문항 풀기(실전 턴)
  | { kind: 'subjective'; prompt: string; hint?: string }              // 주관식 — 텍스트/음성
  | { kind: 'mark'; prompt: string; targetWords?: string[] }           // 필수 수행 — 단어 탭 하이라이트(+필기)
  | { kind: 'shadow'; chunks: string[]; audioIds?: string[] }          // 쉐도잉
  | { kind: 'match'; prompt: string; items: { passageLabel: string; text: string }[] } // 근거 연결(이중·삼중)

export interface Turn {
  no: number
  /** S코드 단계명 — 상단 스텝 칩 (시트 '단계' 열) */
  stage: string
  /** 강사 발화 (말풍선 + TTS) — 시트 '자유 표현/말투 예시' 기반 이도윤 톤 */
  tutor: string
  audio?: AudioCue
  reveal?: RevealState
  interaction: Interaction
  /** 지금 다루는 문항 인덱스 — 해당 문항 카드 강조 */
  focusQ?: number
}

export interface TypeLesson {
  id: string          // 't01' ~ 't15'
  typeNo: number      // 시트 no. 1~15
  area: Area
  part: number
  partName: string    // '사진 묘사'
  typeLabel: string   // '표/자료형 묶음 문항'
  railCode: string    // 이도윤 시트 유형코드 (LC-P1-01 등)
  title: string       // 카드 제목
  desc: string        // 카드 설명 한 줄
  content: TypeLessonContent
  turns: Turn[]
}
