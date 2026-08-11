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
  /** DB 문항 코드 ('RC-P5-08-Q002'). 학습 로그가 어느 문항이었는지 남기는 데 쓴다 */
  code?: string
  /** P1 실전처럼 문항마다 사진이 다른 경우 — 없으면 content.photo를 쓴다 */
  photo?: string
  /** 문항 통음원 (DB `content.audio_url`) — 실제 시험처럼 보기 4개를 한 번에 듣는 용도 */
  audio?: string
  /** 내레이터가 이 문항을 읽어주는 음원 (DB `content.qread_url`, "Number 32. Why is …").
   *  P3·P4 실전에서 담화가 끝난 뒤 문항마다 재생된다. 없으면 브라우저 TTS 로 떨어진다. */
  readAudio?: string
  /** 이중·삼중 지문에서 이 문항의 근거가 있는 지문 id. 레일이 그 지문 탭을 여는 데 쓴다 */
  passageId?: string
}

/** 문장 단위 스크립트/지문 — 음원 구간 재생·직독직해·하이라이트의 최소 단위 */
export interface SentenceItem {
  id: string
  en: string
  ko?: string         // 직독직해 해석 (P7 계열)
  speaker?: string    // LC 대화 화자 (W/M)
  blank?: number      // P5/P6: 이 문장에 포함된 빈칸 번호 (1~4)
  /** 이 문장 전용 mp3 (DB `passage_sentences.audio_url`).
   *  없으면 audioManifest → 브라우저 TTS 순으로 폴백 (보기 음원과 같은 규칙) */
  audio?: string
}

export interface ChatMessage { id: string; speaker: string; time?: string; text: string }

export interface TableData { headers: string[]; rows: string[][] }

/** 지문 하나 — P6/P7용. LC 시각자료(표)도 kind='table'로 표현.
 *  kind는 DB `passages.kind`(0014)의 CHECK 목록과 1:1이다 — 한쪽만 늘리지 말 것.
 *  LC 3종(utterance·dialogue·talk)은 Part 2·3·4 스크립트를 담기 위한 것(STEP 3). */
export interface PassageDoc {
  id: string
  label?: string                    // '지문 1 · 공지'
  kind: 'text' | 'email' | 'notice' | 'ad' | 'article' | 'chat' | 'table' | 'form'
      | 'utterance' | 'dialogue' | 'talk'
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
  /** 실전 세트 경계 — **한 자료에 문항 여럿**인 파트가 전부 여기 얹힌다.
   *  P3·P4 는 자료가 음원(대화·담화), P6·P7 은 자료가 지문(단일·이중·삼중)이다.
   *  `questions` 는 세트를 이어 붙인 **평평한 배열**이다 — 답·채점·오답 리뷰가 전부 그 인덱스를 쓰므로
   *  세트를 도입해도 그 경로는 건드리지 않는다. 여기서는 세트마다 자기 스크립트와 문항 범위만 갖는다.
   *  세트가 하나뿐이면 굳이 채우지 않는다(없으면 audioScript 를 그대로 쓰는 옛 경로). */
  sets?: {
    /** LC(P3·P4) 세트의 음원 스크립트. RC(P6·P7) 세트는 음원이 없어 비어 있다 */
    script?: SentenceItem[]
    visual?: { title: string; table: TableData }
    /** RC 세트가 쓰는 지문 id — `passages` 는 세트를 이어 붙인 평평한 배열이라 여기서 되짚는다 */
    passageIds?: string[]
    from: number; to: number
    /** 지문 **앞**에 나오는 내레이터 안내 — "Questions 1 through 3 refer to the following conversation."
     *  실제 시험은 담화 전에 이 문장이 반드시 나온다(DB `content.set_intro_url` / `set_intro_text`). */
    intro?: { text: string; audio?: string }
  }[]
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
  /** 발화 + 보기 이어서 — Part2 "질문과 선택지 전체 재생"처럼 실제 시험 순서.
   *  ids 는 재생할 스크립트 문장(아이템이 여러 개 합쳐지면 문장도 섞이므로 전체가 아니라 지목한다) */
  | { kind: 'mix'; qIdx: number; ids: string[]; labels: string[] }

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
  /** 선택 응답(퀵버튼). `fixedPrompt` 면 문구가 선택지와 짝이라 **LLM이 갈아끼우면 안 된다**
   *  (예: 맞아요/아니에요 2지선다에 "보기를 골라봐" 가 붙던 실측 오류) */
  | { kind: 'choice'; prompt: string; choices: { text: string; correct?: boolean }[]; feedback?: string; fixedPrompt?: boolean }
  | { kind: 'pickAnswer'; qIdx: number; prompt?: string }              // 필수 응답 — 보기에서 정답 선택
  | { kind: 'solveAll'; prompt?: string }                              // 전체 문항 풀기(실전 턴)
  | { kind: 'subjective'; prompt: string; hint?: string }              // 주관식 — 텍스트/음성
  | { kind: 'mark'; prompt: string; targetWords?: string[] }           // 필수 수행 — 단어 탭 하이라이트(+필기)
  | { kind: 'match'; prompt: string; evidence: MatchEvidence[] }       // 근거 연결(이중·삼중) — 지문에서 직접 탭
  /* 쉐도잉(따라 말하기)은 제품에서 제외됐다(2026-08-04) — 기능·버튼·데이터 전부 삭제.
     시트 레일에는 쉐도잉 단계가 남아 있어 fromSteps 가 그 턴을 버린다. */

export interface Turn {
  no: number
  /** 이 턴이 속한 아이템(레일 한 바퀴)의 seq. 아이템 순회로 만든 수업만 채워진다 (STEP 4) */
  itemSeq?: number
  /** 같은 유형이 이 강의에서 몇 번째 바퀴인가 — Fading 판정과 학습효과 분석의 축 */
  occurrence?: number
  /** 이 턴이 쓰는 변종(step_variants.id). 학습 로그가 "무엇을 시켰나"를 이걸로 남긴다.
   *  코드 생성 레일이거나 변종이 안 붙은 LC 레일이면 없다 */
  variantId?: number | null
  /** 레일에서 몇 번째 단계였나. 버려진 턴(쉐도잉 등)이 있어 `no`(화면 순번)와 다를 수 있다 */
  stepOrder?: number
  /** 이 턴의 레일 출처 — type_rails / lecture_steps */
  railSource?: string | null
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

/** 아이템 하나가 수업 안에서 차지하는 범위 (STEP 4).
 *  턴은 itemSeq 로 자기 아이템을 가리키고, 화면·에이전트는 이 표로 "지금 몇 번째 바퀴의
 *  어떤 문항·지문을 다루는지"를 안다. 아이템 순회로 만든 수업에만 있다. */
export interface LessonItemRef {
  seq: number
  occurrence: number
  typeCode?: string | null
  questionTypeId?: number | null
  /** content.questions 안에서 이 아이템의 범위 [qFrom, qTo) */
  qFrom: number
  qTo: number
  passageIds: string[]
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
  /** 아이템 순회로 만든 수업이면 아이템 목록. 앵커 1문항짜리(구방식)면 없음 */
  items?: LessonItemRef[]
  turns: Turn[]
  recap: LessonRecap   // 세션 정리 화면(실전 문제 이후) — 핵심 문장 3개 + 마무리 멘트
}
