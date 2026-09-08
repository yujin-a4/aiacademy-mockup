'use client'

/* ── 단계 표시줄 — **수업 한 판의 흐름을 한 줄로** ──
 *
 *  도입 화면과 수업 화면이 **각자 그리고 있었다.** 도입은 알약 + 화살표, 수업은 글자 + 밑줄이라
 *  [시작] 을 누르는 순간 위쪽이 통째로 다른 화면처럼 바뀌었다(09-08 지적). 한 벌로 합친다 —
 *  둘로 두면 한쪽만 고쳐져 또 갈린다.
 */
import type { ReactNode } from 'react'

/* ── 상단 머리말 ──
   예전엔 도입·수업·실전·정리가 알약 버튼 네 개였다 — 누를 수 있어 보이는데 안 눌리고, 상단을 다 먹었다.
   지금은 **지금 하는 일의 소제목**이 주인공이다(펠로톤·애플 피트니스식):
     · 현재 단계만 작은 칩 하나 + 점 네 개로 "4개 중 몇 번째"만 표시 (나머지 단계명은 안 읽힌다)
     · 굵은 줄 = 지금 단계의 소제목 — 단계가 넘어가면 이 줄이 바뀐다 */
export default function PhaseStepper({ active, subtitle, onEnd, extra, onJump, steps }: {
  active: number; subtitle?: string; onEnd: () => void; extra?: ReactNode
  /** 개발용 단계 점프 (DEV_PHASE_JUMP) — 넘기면 각 단계가 눌린다 */
  onJump?: (i: number) => void
  /** 단계 이름. 기본은 수업 한 판의 4단계 흐름이다.
   *  **복습처럼 그 흐름 밖에 있는 화면**은 자기 이름 하나만 세운다 — 지나오지도 않을
   *  '도입·유형 학습' 이 회색으로 떠 있으면 아직 남은 단계처럼 읽힌다. */
  steps?: string[]
}) {
  const labels = steps ?? ['도입', '유형 학습', '실전 문제', '핵심 요약']
  return (
    <div className="shrink-0 flex items-center gap-4 md:gap-8 px-3 md:px-5 pt-safe-2 pb-2 bg-white border-b border-[#EBEBF0]">
      <button onClick={onEnd} className="p-1 shrink-0 -ml-1" aria-label="나가기">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      {/* 알약도 동그라미도 쓰지 않는다 — 글자 + 그 아래 얇은 트랙(탭 밑줄 방식).
          지금 단계 칸만 늘어나면서 밑줄이 길어지고, 그 옆에 "지금 하는 일"이 붙는다.
          폭은 다 쓰지 않는다 — 최대 폭을 두고 가운데 두면 양옆이 숨을 쉰다. */}
      <div className="flex-1 min-w-0 flex justify-center">
        <div className="w-full max-w-[680px] flex items-end gap-4 md:gap-6">
          {labels.map((label, i) => (
            <div key={label} onClick={onJump ? () => onJump(i) : undefined}
              title={onJump ? `${label} 단계로 이동 (개발용)` : undefined}
              /* ⚠️ 지금 단계 칸이 늘어나는 것은 **옆에 소제목을 담으려는 것**이다.
                 소제목이 없는 화면(도입)에서는 늘일 이유가 없다 — 밑줄만 길게 끌려
                 다른 단계와 견줘 혼자 커 보인다. 그때는 다른 칸과 같은 너비로 둔다. */
              className={`min-w-0 ${i === active && subtitle ? 'flex-1' : 'shrink-0 w-11 md:w-14'} ${
                onJump ? 'cursor-pointer group' : ''
              }`}>
              <div className="flex items-baseline gap-2 min-w-0">
                <span className={`shrink-0 text-[12px] md:text-[13px] transition-colors ${
                  i === active ? 'font-black text-[#1C1B33]'
                    : i < active ? 'font-bold text-[#94A3B8]' : 'font-bold text-[#CBD5E1]'
                } ${onJump && i !== active ? 'group-hover:text-[#2563EB]' : ''}`}>{label}</span>
                {i === active && subtitle && (
                  <span className="min-w-0 truncate text-[11.5px] md:text-[12.5px] font-medium text-[#64748B]">{subtitle}</span>
                )}
              </div>
              <span className={`mt-1 block h-[2px] rounded-full transition-colors ${
                i === active ? 'bg-[#2563EB]' : i < active ? 'bg-[#C7D2E0]' : 'bg-[#EDF1F7]'
              } ${onJump && i !== active ? 'group-hover:bg-[#93C5FD]' : ''}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">{extra}</div>
    </div>
  )
}
