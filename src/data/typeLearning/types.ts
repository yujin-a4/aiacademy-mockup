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
  /** 이 보기 전용 mp3 (DB `question_options.audio_url`). 없으면 audioManifest → 브라우저 TTS 순으로 폴백 */
  audio?: string
}

export interface QuestionItem {
  q: string
  options: OptionItem[]
  /** P1 실전처럼 문항마다 사진이 다른 경우 — 없으면 content.photo를 쓴다 */
  photo?: string
  /** 문항 통음원 (DB `content.audio_url`) — 실제 시험처럼 보기 4개를 한 번에 듣는 용도 */
  audio?: string
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
  /** 이 턴이 다루는 지문 — 지문 탭이 자동으로 여기로 이동한다.
   *  (지문에 잠금은 없다. 학생은 처음부터 모든 지문을 자유롭게 오갈 수 있음) */
  passageIds?: string[] | 'all'
}

/** 근거 연결(match) 대상 하나 — 어느 지문의 어떤 항목을 탭해야 하는지.
 *  targetIds는 그 지문 안에서 실제로 탭 가능한 대상의 id — 문장 id, 표 행은 `row:<index>`,
 *  메타(이메일 To/From 등)는 `meta:<key>`. 전부 탭해야 그 라벨이 완료된다. */
export interface MatchEvidence {
  label: string
  passageId: string
  targetIds: string[]
}

export type Interaction =
  | { kind: 'next'; label?: string }                                   // AI 진행
  | { kind: 'choice'; prompt: string; choices: { text: string; correct?: boolean }[]; feedback?: string } // 선택 응답(퀵버튼)
  | { kind: 'pickAnswer'; qIdx: number; prompt?: string }              // 필수 응답 — 보기에서 정답 선택
  | { kind: 'solveAll'; prompt?: string }                              // 전체 문항 풀기(실전 턴)
  | { kind: 'subjective'; prompt: string; hint?: string }              // 주관식 — 텍스트/음성
  | { kind: 'mark'; prompt: string; targetWords?: string[] }           // 필수 수행 — 단어 탭 하이라이트(+필기)
  | { kind: 'shadow'; chunks: string[]; audioIds?: string[] }          // 쉐도잉
  | { kind: 'match'; prompt: string; evidence: MatchEvidence[] }       // 근거 연결(이중·삼중) — 지문에서 직접 탭

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

/** 세션 정리(4단계 프레임의 마지막 — 실전 문제 이후) 핵심 문장 1개.
 *  en의 빈칸 자리는 '___'로 표기. 음성 입력은 keywords 중 하나라도 포함되면 정답 인정,
 *  클릭 입력은 choices(정답 포함 3~4개)에서 고른다. */
export interface RecapSentence {
  id: string
  en: string
  ko: string           // 한국어 뜻(빈칸 채운 뒤 나란히 보여줌)
  answer: string        // 빈칸 정답(표시용)
  choices: string[]     // 클릭 모드 선택지(정답 포함, 순서 섞어서 저장)
  keywords: string[]    // 음성 모드 매칭 키워드(소문자, 정답으로 인정할 표현들)
}

/** 세션 정리 — 핵심 문장 3개 + 강사 마무리 멘트 */
export interface LessonRecap {
  sentences: RecapSentence[]   // 정확히 3개
  closing: string              // 마지막에 강사가 하는 마무리 멘트
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
  /** 실전 문제(수업 뒤 단계)에서 풀 별도 문항 세트. 없으면 수업에서 다룬 content를 그대로 다시 푼다.
   *  DB 구동 시 같은 강의의 `stage='practice'` 문항(P00x)이 여기로 들어온다. */
  practice?: TypeLessonContent
  turns: Turn[]
  recap: LessonRecap   // 세션 정리 화면(실전 문제 이후) — 핵심 문장 3개 + 마무리 멘트
}
