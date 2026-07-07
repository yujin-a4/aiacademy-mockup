import { useState, useEffect } from 'react'

export function useStreakDay() {
  const [streakDay, setStreakDay] = useState(1)
  useEffect(() => {
    const key = 'streakStartDate'
    const stored = localStorage.getItem(key)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (!stored) {
      const defaultStart = new Date(today)
      defaultStart.setDate(defaultStart.getDate() - 2)
      localStorage.setItem(key, defaultStart.toISOString())
      setStreakDay(3)
    } else {
      const start = new Date(stored); start.setHours(0, 0, 0, 0)
      const diff = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1
      setStreakDay(Math.max(1, diff))
    }
  }, [])
  return streakDay
}
