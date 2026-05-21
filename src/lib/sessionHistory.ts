const STORAGE_KEY = 'ybm_session_history'

export type PartKey = 'part5' | 'part6' | 'part7' | 'speaking'

export interface SessionRecord {
  date: string  // ISO
  score: number // 0–100
}

type History = Partial<Record<PartKey, SessionRecord[]>>

function load(): History {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save(history: History) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

export function getPreviousScore(partKey: PartKey): number | null {
  const records = load()[partKey] ?? []
  if (records.length === 0) return null
  return records[records.length - 1].score
}

export function getTotalCompletions(partKey: PartKey): number {
  return (load()[partKey] ?? []).length
}

export function saveSession(partKey: PartKey, score: number) {
  const history = load()
  const records = history[partKey] ?? []
  records.push({ date: new Date().toISOString(), score })
  history[partKey] = records
  save(history)
}
