'use client'

import type { ScriptLine } from '@/data/speakingScenario'

interface ScriptPanelProps {
  title: string
  lines: ScriptLine[]
  /** 'full': 전체 표시  'blank': blanks 단어를 ___ 로 대체 */
  mode: 'full' | 'blank'
}

const LABEL_STYLE: Record<string, { bg: string; text: string }> = {
  '장소':  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  '인물1': { bg: 'bg-violet-100', text: 'text-violet-700' },
  '인물2': { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  '인물':  { bg: 'bg-violet-100', text: 'text-violet-700' },
  '사물':  { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  '주변':  { bg: 'bg-green-100',  text: 'text-green-700'  },
  '전체':  { bg: 'bg-gray-100',   text: 'text-gray-600'   },
}

function renderLine(text: string, blanks: string[] | undefined, mode: 'full' | 'blank') {
  if (mode === 'full' || !blanks?.length) return <>{text}</>

  const parts: React.ReactNode[] = []
  let remaining = text
  blanks.forEach((b, i) => {
    const idx = remaining.indexOf(b)
    if (idx === -1) return
    if (idx > 0) parts.push(remaining.slice(0, idx))
    parts.push(
      <span key={i} className="inline-block border-b-2 border-[#2277F0] min-w-[56px] text-center text-[#2277F0]">
        {'　'}
      </span>
    )
    remaining = remaining.slice(idx + b.length)
  })
  if (remaining) parts.push(remaining)
  return <>{parts}</>
}

export default function ScriptPanel({ title, lines, mode }: ScriptPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-[#2277F0]" />
          <span className="text-base font-bold text-[#1A2B4B]">{title}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
        {lines.map((line, i) => {
          const style = line.label ? (LABEL_STYLE[line.label] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }) : null
          const isContinuation = !line.label

          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-2xl px-4 py-3.5
                ${isContinuation ? 'ml-10 bg-ybm-bg' : 'bg-white border border-ybm-border shadow-sm'}
              `}
            >
              {/* 번호 or 들여쓰기 구분선 */}
              {isContinuation ? (
                <div className="w-1 self-stretch rounded-full bg-[#2277F0]/30 shrink-0" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-[#2277F0] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
              )}

              <div className="flex-1 min-w-0">
                {style && (
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1.5 ${style.bg} ${style.text}`}>
                    {line.label}
                  </span>
                )}
                <p className="text-base font-medium text-[#1A2B4B] leading-relaxed">
                  {renderLine(line.text, line.blanks, mode)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
