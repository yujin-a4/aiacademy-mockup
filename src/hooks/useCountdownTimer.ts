import { useState, useEffect, useRef, useCallback } from 'react'

export function useCountdownTimer(seconds: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const expiredRef = useRef(false)

  const stop = useCallback(() => {
    setRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    expiredRef.current = false
    setRemaining(seconds)
    setRunning(true)
  }, [seconds])

  const reset = useCallback(() => {
    stop()
    expiredRef.current = false
    setRemaining(seconds)
  }, [stop, seconds])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setRunning(false)
          if (!expiredRef.current) {
            expiredRef.current = true
            onExpire()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  // onExpire는 stable ref로 처리
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return { remaining, running, start, stop, reset }
}
