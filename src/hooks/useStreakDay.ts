import { useState, useEffect } from 'react'

export function useStreakDay() {
  const [streakDay, setStreakDay] = useState(1)
  useEffect(() => {
    const key = 'streakStartDate'
    const stored = localStorage.getItem(key)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (!stored) {
      const defaultStart = '2026-05-10T00:00:00.000Z'
      localStorage.setItem(key, defaultStart)
      const start = new Date(defaultStart); start.setHours(0, 0, 0, 0)
      const diff = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1
      setStreakDay(Math.max(1, diff))
    } else {
      const start = new Date(stored); start.setHours(0, 0, 0, 0)
      const diff = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1
      setStreakDay(Math.max(1, diff))
    }
  }, [])
  return streakDay
}
