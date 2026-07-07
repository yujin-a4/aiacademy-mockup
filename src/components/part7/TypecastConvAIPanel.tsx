'use client'

import { useState } from 'react'

// ── 타입캐스트(Neona) 에이전트 패널 — ElevenLabsConvAIPanel의 타입캐스트 버전 ──
// 일레븐랩스는 @11labs/react SDK로 패널에 실시간 대화를 직접 박지만,
// 네오나는 이 프로젝트에 React SDK가 없어서 공식 "공유 링크"를 iframe으로 임베드한다.
// (네오나 대시보드 > 박혜원-Neona > 공유 링크 "링크 생성"으로 URL 발급)
const AGENT_ID        = '6a38e4b9b96653ccf382615e'
const INSTRUCTOR_NAME = '박혜원'
const INSTRUCTOR_IMG  = '/instructor/park.png'

// ↓↓↓ 네오나에서 발급한 공유 링크 URL을 여기에 붙여넣으면 패널 안에서 바로 테스트된다.
const NEONA_SHARE_URL = 'https://agents.neona.ai/try/1Sp9X0KJUcnX4qKBLeJnuA'

export default function TypecastConvAIPanel() {
  const [started, setStarted] = useState(false)

  return (
    <div className="flex flex-col h-full bg-cr-panel">

      {/* ── 헤더 (강사 아바타 + 엔진 표시) ── */}
      <div className="shrink-0 px-4 py-3 border-b border-ybm-border flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={INSTRUCTOR_IMG} alt={INSTRUCTOR_NAME} className="w-7 h-7 rounded-full object-cover object-top shrink-0 border border-orange-200" />
        <div>
          <p className="text-xs font-black text-[#1A2B4B] leading-none">AI 튜터 · {INSTRUCTOR_NAME}</p>
          <p className="text-[10px] text-ybm-text-sub leading-none mt-0.5">Typecast · Neona</p>
        </div>
        {started && (
          <span className="ml-auto flex items-center gap-1 bg-orange-50 text-[#FF5A36] text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-[#FF5A36] rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* ── 본문: 네오나 공유 링크 임베드 ── */}
      <div className="flex-1 flex flex-col min-h-0 p-3 gap-2">
        {!NEONA_SHARE_URL ? (
          // 공유 링크 미설정 안내
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center bg-white rounded-xl border border-dashed border-ybm-border p-5">
            <p className="text-xs font-bold text-ybm-text">타입캐스트(Neona) 공유 링크가 필요해요</p>
            <p className="text-[11px] text-ybm-text-sub leading-relaxed">
              네오나 대시보드 → <b>박혜원-Neona</b> → <b>공유 링크</b>에서<br />
              &lsquo;링크 생성&rsquo;을 누르고, 그 URL을<br />
              <code className="px-1 py-0.5 bg-ybm-bg rounded text-[10px]">TypecastConvAIPanel.tsx</code>의<br />
              <code className="px-1 py-0.5 bg-ybm-bg rounded text-[10px]">NEONA_SHARE_URL</code>에 붙여넣으세요.
            </p>
            <p className="text-[10px] text-ybm-text-sub/60">agent_id: {AGENT_ID}</p>
          </div>
        ) : !started ? (
          // 시작 게이트 (일레븐랩스 패널의 "대화 시작하기" 미러)
          <>
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center bg-white rounded-xl border border-ybm-border p-4">
              <p className="text-xs text-ybm-text-sub leading-relaxed">
                {INSTRUCTOR_NAME}(타입캐스트 엔진)과<br />실시간 음성으로 대화하며 수업을 진행하세요.
              </p>
              <p className="text-[11px] text-ybm-text-sub/70">
                아래 버튼을 누르면 네오나 세션이 시작돼요.
              </p>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="w-full py-3 rounded-xl bg-cr-accent text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shrink-0"
            >
              🎙 {INSTRUCTOR_NAME} 선생님과 대화 시작하기
            </button>
          </>
        ) : (
          // 네오나 세션 iframe
          <>
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-ybm-border bg-white">
              <iframe
                src={NEONA_SHARE_URL}
                title={`${INSTRUCTOR_NAME} · 타입캐스트 에이전트`}
                className="w-full h-full"
                allow="microphone; autoplay; clipboard-write"
              />
            </div>
            <a
              href={NEONA_SHARE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 rounded-xl border border-ybm-border text-ybm-text-sub text-xs font-semibold hover:bg-ybm-bg transition-colors text-center shrink-0"
            >
              새 탭에서 열기 (임베드가 막히면 사용)
            </a>
          </>
        )}
      </div>

      {/* ── 테스트 정보: 이 엔진이 어떻게 동작하는지 ── */}
      <div className="shrink-0 mx-3 mb-3 px-3 py-2 rounded-xl bg-ybm-bg border border-ybm-border text-[10px] leading-relaxed text-ybm-text-sub">
        <p className="font-bold text-ybm-text mb-1">이 화면 구조: Typecast · Neona (iframe 임베드)</p>
        <p>Neona가 호스팅하는 에이전트 화면을 그대로 iframe으로 띄운 것 — STT·LLM·TTS 전부 Neona 내부에서 처리되고,
          우리 <code className="px-1 bg-white rounded">/api/tutor</code>(DB 레일 엔진)와는 연결돼 있지 않음.
          시작 시 통짜 system_prompt 하나로 전체 수업이 진행되는 자율주행 방식. 턴마다 DB가 개입하는 채널 없음.</p>
      </div>
    </div>
  )
}
