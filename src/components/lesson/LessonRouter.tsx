'use client'

import { useEffect } from 'react'
import { useLessonStore } from '@/store/lessonStore'
import { stopCurrentAudio } from '@/lib/tts'
import Screen0 from './Screen0'
import Screen0Legacy from './Screen0Legacy'
import Screen1 from './Screen1'
import Screen2 from './Screen2'
import Screen4 from './Screen4'
import Screen5 from './Screen5'

interface LessonRouterProps {
  onEnd: () => void
  /** true면 도입(Screen0)을 구버전(Screen0Legacy)으로 렌더 — 기존 콘텐츠 아카이브용 */
  legacyIntro?: boolean
}

function AutoComplete({ onEnd }: { onEnd: () => void }) {
  useEffect(() => { onEnd() }, [onEnd])
  return null
}

export default function LessonRouter({ onEnd, legacyIntro = false }: LessonRouterProps) {
  const currentScreen = useLessonStore((s) => s.currentScreen)
  const nextScreen    = useLessonStore((s) => s.nextScreen)
  const goToScreen    = useLessonStore((s) => s.goToScreen)

  const prev = (n: number) => () => { stopCurrentAudio(); goToScreen(n as 0|1|2|3|4|5|6) }

  switch (currentScreen) {
    case 0: {
      const Intro = legacyIntro ? Screen0Legacy : Screen0
      return <Intro onComplete={() => goToScreen(1)} onEnd={onEnd} />
    }
    case 1: return <Screen1 onComplete={nextScreen} onEnd={onEnd} onPrev={undefined} />
    case 2: return <Screen2 onComplete={nextScreen} onEnd={onEnd} onPrev={prev(1)} />
    case 3: return <Screen4 onComplete={nextScreen} onEnd={onEnd} onPrev={prev(2)} />
    case 4: return <Screen5 onComplete={nextScreen} />
    case 5:
    case 6: return <AutoComplete onEnd={onEnd} />
    default: return null
  }
}
