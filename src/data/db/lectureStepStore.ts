/**
 * 레일 턴의 공통 모양 (타입 전용 모듈).
 *
 * 예전에는 여기서 원시 테이블(`lecture_steps` · `rail_compositions`)을 **직접 읽었다.**
 * 지금은 화면이 `v_lecture_program` 뷰 하나만 본다(`lectureProgramStore`) —
 * 레일 원천이 type_rails 로 바뀌어도 화면이 안 바뀌게 하려는 것이고,
 * 그래서 조회 함수(fetchLectureSteps · fetchRailComposition · useDbLectureSteps)는 걷어냈다.
 * 그 함수들을 쓰던 유일한 화면 `/type-lesson` 은 07-21 결정대로 제거했다(정본은 `/lecture`).
 *
 * 남은 건 타입뿐이다 — 뷰에서 온 행을 이 모양으로 변환해 화면·번역기가 출처를 모르게 한다.
 */

/** 레일의 한 턴. 값은 전부 사람이 쓴 한국어 문장이다.
 *  `lecture_steps`(강의별 원본)와 `rail_compositions`(부품 조합) 둘 다 이 모양으로 변환해서
 *  화면·번역기는 출처를 몰라도 되게 한다. */
export interface DbLectureStep {
  order: number
  stepCode: string              // 'S1 핵심 단서', '선택지 A 청취 + S6/S5' …
  fixedRule: string | null      // AI가 따라야 할 규칙 (화면엔 안 쓰고 검토 패널에만 표시)
  section: string | null        // 'Q1 상황/주제/목적형' — 하위문제 그룹
  audioMode: string | null      // '선택지 A 음원만 재생한다' / '재생 없음' / 조건부 지시문
  scriptMode: string | null     // '전체 스크립트 공개' / 'A 스크립트만 표시' / '표시 없음'
  interaction: string | null    // 'AI 진행' / '선택 응답' / '필수 수행 / 필기 인식' …
  studentPrompt: string | null  // 학생에게 던지는 질문 ('—'면 없음)
  freeExpression: string | null // 강사 발화 예시 → 말풍선·TTS
  dbFields: string | null       // 이 턴이 참조하는 DB 필드 목록 (검토 패널용)
  /* ── 부품 조합(rail_compositions)에서 온 턴만 채워진다 ── */
  partCode?: string | null      // 'P5-02' — 이 턴이 쓰는 부품
  /** 이 턴이 쓰는 변종 id (step_variants). 학습 로그가 이걸로 "무엇을 시켰나"를 남긴다 (STEP 6).
   *  LC 처럼 아직 변종이 안 붙은 레일은 null */
  variantId?: number | null
  /** 이 턴의 레일이 어느 구조에서 왔나 — type_rails(새) / lecture_steps(옛). 이관 과도기 추적용 */
  railSource?: string | null
  /** 학생 문구가 어디서 왔나. LLM 생성은 이 위에 덮인다(단 'override'는 못 덮음) */
  promptOrigin?: 'override' | 'part' | 'seed' | 'none'
  /** true면 이 강의 전용 예외가 지정돼 있어 LLM이 못 건드린다 */
  promptLocked?: boolean
  /** 이식된 손글씨 문구 — LLM에 말투 예시로 준다 */
  promptSeed?: string | null
}

/** 레일을 어디서 읽었는지 — 검토 패널 머리말에 표시 */
export type RailSource = 'composition' | 'lecture_steps' | 'none'
