export interface VoiceBranch {
  keywords: string[]
  nextTurnId: string
}

/**
 * STT 결과 텍스트에서 첫 번째로 매칭되는 분기를 반환한다.
 * 매칭 없으면 null 반환 → 호출자가 defaultNextTurnId 사용.
 */
export function matchBranch(text: string, branches: VoiceBranch[]): string | null {
  const lower = text.toLowerCase().replace(/\s+/g, '')
  for (const branch of branches) {
    if (branch.keywords.some((kw) => lower.includes(kw.toLowerCase().replace(/\s+/g, '')))) {
      return branch.nextTurnId
    }
  }
  return null
}
