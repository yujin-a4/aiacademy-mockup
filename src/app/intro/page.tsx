'use client'

/**
 * /intro — 소개 페이지 **버전 고르는 자리.**
 *
 * 세 버전은 같은 화면의 변형이 아니라 **기획이 다른 세 페이지**다(구글문서
 * "YBM AI 어학원 소개 페이지 기획안"). 읽는 사람도 말하는 것도 다르다.
 *   V1 토익 600~700점대 학습자 / V2 업계·미디어·교육 관계자 / V3 관리형 학습 서비스
 * 회의에서 나란히 열어 비교하는 자리라, 여기서는 고르기만 한다.
 */

import Link from 'next/link'

const VERSIONS = [
  {
    href: '/intro/v1',
    tag: 'Version 1',
    title: '출시 예정 AI 휴먼 토익 학습 서비스',
    who: '토익 600~700점대 학습자',
    line: '해설은 이해했는데, 왜 다음 문제에서 또 틀릴까요?',
    ready: false,
  },
  {
    href: '/intro/v2',
    tag: 'Version 2',
    title: 'AI 휴먼 강사의 상호작용 학습 R&D',
    who: '업계 · 미디어 · 교육 관계자',
    line: 'AI가 다 풀어주면, 정작 나는 뭘 배우게 될까요?',
    ready: true,
  },
  {
    href: '/intro/v3',
    tag: 'Version 3',
    title: 'AI 휴먼 기반 관리형 학습 서비스',
    who: '혼자 공부하는 학습자',
    line: '혼자 공부할 때, 누가 계속 학습을 이어준다면 어떨까요?',
    ready: true,
  },
]

export default function IntroIndex() {
  return (
    <main className="min-h-screen bg-[#0B1830] px-6 py-20 text-white sm:px-10">
      <div className="mx-auto max-w-[1100px]">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.34em] text-white/45">
          YBM AI Academy · R&amp;D Project
        </span>
        <h1 className="mt-6 text-[clamp(1.6rem,3.4vw,2.6rem)] font-light leading-[1.35]">
          소개 페이지 <span className="font-medium">세 가지 버전</span>
        </h1>
        <p className="mt-5 max-w-xl text-[14px] leading-[1.9] text-white/55">
          2026년 11월 2일 공개 예정. 같은 프로젝트를 서로 다른 읽는 사람에게 말합니다. 아래에서 골라 열어보세요.
        </p>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {VERSIONS.map((v) =>
            v.ready ? (
              <Link
                key={v.href}
                href={v.href}
                className="group flex min-h-[260px] flex-col justify-between rounded-2xl border border-white/12 bg-white/[0.05] p-7 transition-colors hover:border-white/35"
              >
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2E6BFF]">{v.tag}</span>
                  <p className="mt-4 text-[17px] font-medium leading-[1.5]">{v.title}</p>
                  <p className="mt-2 text-[12px] tracking-[0.05em] text-white/45">{v.who}</p>
                </div>
                <div>
                  <p className="text-[13px] leading-[1.7] text-white/65">“{v.line}”</p>
                  <span className="mt-5 inline-flex min-h-[44px] items-center text-[12px] uppercase tracking-[0.25em] text-white/70">
                    열어보기 →
                  </span>
                </div>
              </Link>
            ) : (
              <div
                key={v.href}
                className="flex min-h-[260px] cursor-not-allowed flex-col justify-between rounded-2xl border border-dashed border-white/12 p-7 opacity-55"
              >
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">{v.tag}</span>
                  <p className="mt-4 text-[17px] font-medium leading-[1.5]">{v.title}</p>
                  <p className="mt-2 text-[12px] tracking-[0.05em] text-white/40">{v.who}</p>
                </div>
                <div>
                  <p className="text-[13px] leading-[1.7] text-white/50">“{v.line}”</p>
                  <span className="mt-5 inline-block text-[12px] uppercase tracking-[0.25em] text-white/40">
                    준비 중
                  </span>
                </div>
              </div>
            ),
          )}
        </div>

        <p className="mt-16 text-[12px] leading-[1.9] text-white/35">
          기획 정본은 구글문서 “YBM AI 어학원 소개 페이지 기획안”입니다. 이 화면은 내부 비교용입니다.
        </p>
      </div>
    </main>
  )
}
