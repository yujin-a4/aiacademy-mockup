/* 강의명 표시용 정리.
 *
 * DB `lectures.title` 은 'LC1강 — 인물 중심 vs 사물·상태 중심 vs 혼합 사진 판별' 형태다.
 * 정본은 콘텐츠 시트이고 크론이 DB를 덮으므로 **DB 제목을 고치면 되돌아온다.**
 * 그래서 여기서 표시용으로만 바꾼다. 시트가 정리되면 이 파일의 override 를 지우면 된다.
 *
 * 42강 중 대부분(RC 문법·유형명)은 이미 짧고 명확해서 손대지 않았다.
 * override 는 길거나 학습자가 바로 못 알아듣는 것만 넣는다.
 */

const OVERRIDE: Record<string, string> = {
  'LC-P1-01': '사람 사진 vs 사물 사진 구분하기',
  'LC-P1-02': '동작인가 상태인가',
  'LC-P2-01': '의문사로 시작하는 질문',
  'LC-P2-02': '일반 의문문 (Be동사·조동사·부정)',
  'LC-P2-03': '선택·부가·요청 의문문',
  'RC-P5-01': '문장 구조 잡기',
  'RC-P5-02': '빈칸에 올 품사 고르기',
  'RC-P5-16': '문맥에 맞는 어휘 고르기',
  'RC-P6-01': '문맥으로 푸는 문법 (연결어·지시어·시제)',
}

/** 'LC1강 — 의문사 의문문' → { no: 'LC 1강', name: '의문사 의문문' } */
export function displayLecture(code: string, dbTitle: string): { no: string; name: string } {
  const m = /^(LC|RC)\s*(\d+)강\s*(?:—|-)?\s*(.*)$/.exec(dbTitle ?? '')
  const no = m ? `${m[1]} ${m[2]}강` : ''
  const fallback = m ? m[3] : (dbTitle ?? '')
  return { no, name: OVERRIDE[code] ?? fallback }
}

/** 목록 한 줄로 쓸 때: 'LC 1강 · 사람 사진 vs 사물 사진 구분하기' */
export function lectureLabel(code: string, dbTitle: string): string {
  const { no, name } = displayLecture(code, dbTitle)
  return no ? `${no} · ${name}` : name
}
