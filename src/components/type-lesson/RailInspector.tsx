'use client'

/**
 * 스캐폴딩 레일 검토 패널 — 콘텐츠팀용.
 *
 * DB(lecture_steps)에 사람이 쓴 문장이 화면 동작으로 **어떻게 해석됐는지** 턴별로 보여준다.
 * 이게 없으면 콘텐츠팀은 시트를 고쳐도 왜 화면이 그렇게 도는지 알 수 없다.
 *
 * · 왼쪽 = DB 원문 (시트에 쓴 그대로)
 * · 오른쪽 = 해석 결과 ("보기 A 맞다/아니다 2지선다로 처리")
 * · 빨간 줄 = 못 알아들은 칸 → 그 문장을 고쳐야 한다는 신호
 */
import { useState } from 'react'
import type { RailDiag } from '@/data/typeLearning/fromSteps'

export default function RailInspector({
  diags, currentNo, source, generated, status,
}: {
  diags: RailDiag[]
  /** 지금 재생 중인 턴 번호 (1-base) — 해당 카드를 강조 */
  currentNo: number
  /** 레일 출처 한 줄 — "LC-P1-01 · lee_doyun · DB 7턴" */
  source: string
  /** 턴 번호 → LLM이 만든 학생 문구 */
  generated?: Record<number, string>
  status?: string
}) {
  const [open, setOpen] = useState(false)
  if (!diags.length) return null

  const warnCount = diags.reduce((n, d) => n + d.warnings.length, 0)
  const genCount = Object.keys(generated ?? {}).length

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        /* 왼쪽 하단 — 패널이 오른쪽에서 열리므로 버튼이 패널 위에 겹쳐 앉지 않는다 */
        className={`fixed bottom-4 left-4 z-[60] rounded-full px-4 py-2.5 text-[13px] font-bold shadow-lg border transition ${
          warnCount
            ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#B91C1C]'
            : 'bg-white border-[#CBD5E1] text-[#334155]'
        }`}
      >
        🧩 레일 검토 {warnCount > 0 && <span className="ml-1">· 경고 {warnCount}</span>}
      </button>

      {open && (
        <div className="fixed inset-y-0 right-0 z-[59] w-full max-w-[520px] bg-white border-l border-[#E2E8F0] shadow-2xl flex flex-col">
          <div className="shrink-0 px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-[#0F172A]">스캐폴딩 레일 검토</h2>
              <button onClick={() => setOpen(false)} className="text-[18px] text-[#64748B] px-2 leading-none">×</button>
            </div>
            <p className="mt-1 text-[11px] text-[#64748B]">{source}</p>
            <p className="mt-1 text-[11px] text-[#94A3B8]">
              학생 문구:{' '}
              {status === 'loading' ? '생성 중…'
                : genCount ? <span className="text-[#0369A1] font-semibold">{genCount}개를 LLM이 이번 문항에 맞춰 생성</span>
                  : '생성분 없음 — 부품 기본값/이식 문구 사용'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {diags.map((d) => {
              const active = d.no === currentNo
              return (
                <div
                  key={d.no}
                  className={`rounded-xl border px-3 py-2.5 ${
                    active ? 'border-[#2563EB] bg-[#EFF6FF]'
                      : d.warnings.length ? 'border-[#FCA5A5] bg-[#FEF2F2]' : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      active ? 'bg-[#2563EB] text-white' : 'bg-[#E2E8F0] text-[#475569]'
                    }`}>턴 {d.no}</span>
                    <span className="text-[12px] font-semibold text-[#0F172A] truncate">{d.stepCode}</span>
                  </div>
                  {d.partCode && (
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]">
                        부품 {d.partCode}
                      </span>
                      {(() => {
                        const gen = generated?.[d.no]
                        const [label, cls] =
                          d.promptOrigin === 'override' ? ['이 강의 전용 예외 (LLM 잠김)', 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]']
                            : gen ? ['문구 = LLM 생성', 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]']
                              : d.promptOrigin === 'part' ? ['문구 = 부품 공통', 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]']
                                : d.promptOrigin === 'seed' ? ['문구 = 이식본(폴백)', 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]']
                                  : ['문구 없음', 'bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0]']
                        return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>
                      })()}
                    </div>
                  )}

                  <div className="mt-2 space-y-1">
                    {d.read.map((r) => (
                      <div key={r.label} className="flex gap-2 text-[11px]">
                        <span className="shrink-0 w-[54px] text-[#94A3B8]">{r.label}</span>
                        <span className="text-[#334155]">{r.value}</span>
                      </div>
                    ))}
                  </div>

                  {d.warnings.map((w, i) => (
                    <p key={i} className="mt-2 text-[11px] leading-relaxed text-[#B91C1C] bg-white/70 rounded-lg px-2 py-1.5 border border-[#FECACA]">
                      ⚠ {w}
                    </p>
                  ))}

                  <details className="mt-2">
                    <summary className="text-[11px] text-[#64748B] cursor-pointer select-none">DB 원문 보기</summary>
                    <dl className="mt-1.5 space-y-1">
                      {([
                        ['상호작용', d.raw.interaction],
                        ['음원', d.raw.audioMode],
                        ['스크립트', d.raw.scriptMode],
                        ['학생 문구', d.raw.studentPrompt],
                        ['구분', d.raw.section],
                        ['참조 필드', d.raw.dbFields],
                        ['규칙', d.raw.fixedRule],
                      ] as const).filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-[11px]">
                          <dt className="shrink-0 w-[54px] text-[#94A3B8]">{k}</dt>
                          <dd className="text-[#475569] whitespace-pre-wrap break-words">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
