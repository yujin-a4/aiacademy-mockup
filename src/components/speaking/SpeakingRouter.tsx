'use client'

import { useEffect } from 'react'
import { useSpeakingStore } from '@/store/speakingStore'
import ScreenSP0 from './ScreenSP0'
import ScreenSP1 from './ScreenSP1'
import ScreenSP2 from './ScreenSP2'
import ScreenSP3 from './ScreenSP3'
import ScreenSP4 from './ScreenSP4'
import ScreenSP5 from './ScreenSP5'
import ScreenSP6 from './ScreenSP6'
import ScreenSP7 from './ScreenSP7'

interface Props { onEnd: () => void }

export default function SpeakingRouter({ onEnd }: Props) {
  const { currentScreen, nextScreen, reset } = useSpeakingStore()

  useEffect(() => {
    reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const props = { onComplete: nextScreen, onEnd }

  switch (currentScreen) {
    case 0: return <ScreenSP0 {...props} />
    case 1: return <ScreenSP1 {...props} />
    case 2: return <ScreenSP2 {...props} />
    case 3: return <ScreenSP3 {...props} />
    case 4: return <ScreenSP4 {...props} />
    case 5: return <ScreenSP5 {...props} />
    case 6: return <ScreenSP6 {...props} />
    case 7: return <ScreenSP7 onComplete={onEnd} onEnd={onEnd} />
    default: return null
  }
}
