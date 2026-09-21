/**
 * 라인 아이콘 한 벌 — **이모지 대신 쓴다** (09-21)
 *
 * 이모지(👍·🔥·🎯)는 기기마다 다른 그림이 뜨고(안드로이드·iOS·PC 가 제각각) 혼자 색이 튀어서
 * 화면에서 스티커처럼 논다. FGI 는 갤럭시탭·아이패드·PC 를 오가며 보여 주는 자리라 그 차이가
 * 그대로 드러난다. 같은 굵기의 윤곽선으로 그려 두면 **글자 색을 따라가고**(currentColor)
 * 크기도 글자와 함께 움직인다.
 *
 * 규격: 24×24, stroke 1.8, 둥근 끝. 크기·색은 부르는 쪽이 className 으로 준다
 * (`<Icon name="fire" className="w-4 h-4 text-[#F97316]" />`).
 * ⚠️ 새 아이콘은 **여기에만** 늘린다 — 화면마다 svg 를 박으면 굵기와 결이 금세 어긋난다.
 */

export type IconName =
  | 'thumbUp' | 'hands' | 'awkward' | 'noThanks'      // 설문 보기
  | 'wave' | 'heart' | 'muscle' | 'fire' | 'calendar' // 대시보드
  | 'sprout' | 'chart' | 'trophy'                     // 목표 점수
  | 'waves' | 'target' | 'puzzle' | 'gift' | 'bars' | 'bolt'  // 성향 문답
  | 'clap' | 'pin' | 'books' | 'box'                  // 상태·강의 목록
  | 'mic' | 'pen' | 'link' | 'check'                  // 수업 화면
  | 'headset'                                         // 듣기(LC) — 읽기(RC)는 'books'

const PATHS: Record<IconName, React.ReactNode> = {
  thumbUp: <><path d="M7 10v10H4V10h3Z" /><path d="M7 10.5 11.5 4a2 2 0 0 1 2.9 2.4L13.5 9h4.9a2 2 0 0 1 2 2.5l-1.6 6A2 2 0 0 1 16.8 19H7" /></>,
  hands: <><path d="M9 13V5.5a1.5 1.5 0 0 1 3 0V12" /><path d="M12 12V6.5a1.5 1.5 0 0 1 3 0V13" /><path d="M6 14.5V9a1.5 1.5 0 0 1 3 0" /><path d="M15 13v-1a1.5 1.5 0 0 1 3 0v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5" /></>,
  awkward: <><circle cx="12" cy="12" r="8.5" /><path d="M9 10h.01M15 10h.01" /><path d="M9 15.5c1.2-.8 3.8-.8 5 0" /><path d="M18.5 6.5c.7 1 1 1.7 1 2.2a1 1 0 0 1-2 0c0-.5.3-1.2 1-2.2Z" /></>,
  noThanks: <><circle cx="12" cy="12" r="8.5" /><path d="M6.2 6.2 17.8 17.8" /></>,
  wave: <><path d="M9 12V5.5a1.5 1.5 0 0 1 3 0V11" /><path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V12" /><path d="M15 12V7.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3l-2-3.4a1.6 1.6 0 0 1 2.6-1.8L9 15" /></>,
  heart: <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z" />,
  muscle: <><path d="M4 18v-3a4 4 0 0 1 4-4h3" /><path d="M11 11V7a3 3 0 0 1 5.2-2A9 9 0 0 1 19 11.5c0 3.6-2.6 6.5-6 6.5H8" /></>,
  fire: <><path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.8.8-3.3 1.6-4.3.3 1 1 1.8 1.7 2C11 8.1 12 6 12 3Z" /><path d="M12 20a2.5 2.5 0 0 1-2.5-2.5c0-1.6 2.5-3.2 2.5-3.2s2.5 1.6 2.5 3.2A2.5 2.5 0 0 1 12 20Z" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3.5v3M16 3.5v3" /></>,
  sprout: <><path d="M12 20v-6" /><path d="M12 14c0-3-2-5-5-5 0 3 2 5 5 5Z" /><path d="M12 14c0-3.4 2.2-5.5 5.5-5.5 0 3.4-2.2 5.5-5.5 5.5Z" /></>,
  chart: <><path d="M4 19h16" /><path d="M6.5 15.5 10 11l3 3 4.5-6" /><path d="M17.5 8H14M17.5 8v3.5" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5.5H5.5A2.5 2.5 0 0 0 8 10M16 5.5h2.5A2.5 2.5 0 0 1 16 10" /><path d="M12 13v3.5M9 20h6M10 16.5h4" /></>,
  waves: <><path d="M3.5 8.5c2-1.8 3.5-1.8 5.5 0s3.5 1.8 5.5 0 3.5-1.8 6 0" /><path d="M3.5 13c2-1.8 3.5-1.8 5.5 0s3.5 1.8 5.5 0 3.5-1.8 6 0" /><path d="M3.5 17.5c2-1.8 3.5-1.8 5.5 0s3.5 1.8 5.5 0 3.5-1.8 6 0" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.2" /><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none" /></>,
  puzzle: <><path d="M10 4.5h4a1 1 0 0 1 1 1V7a1.6 1.6 0 1 0 3.2 0V5.5a1 1 0 0 1 1 1V10h-1.6a1.6 1.6 0 1 0 0 3.2H19v4.3a1 1 0 0 1-1 1h-4.3V17a1.6 1.6 0 1 0-3.2 0v1.5H6a1 1 0 0 1-1-1V14h1.4a1.6 1.6 0 1 0 0-3.2H5V5.5a1 1 0 0 1 1-1h4Z" /></>,
  gift: <><rect x="3.5" y="9" width="17" height="4" rx="1" /><path d="M5 13v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V13M12 9v11.5" /><path d="M12 9S10.8 4.5 8.6 4.5a2 2 0 0 0 0 4.5H12Zm0 0s1.2-4.5 3.4-4.5a2 2 0 0 1 0 4.5H12Z" /></>,
  bars: <><path d="M4 20h16" /><rect x="6" y="11" width="3.2" height="6" rx="1" /><rect x="14.8" y="7" width="3.2" height="10" rx="1" /></>,
  bolt: <path d="M13.5 3 6 13.5h4.5L10 21l7.5-10.5H13L13.5 3Z" />,
  clap: <><path d="M10 13 7.4 9.6a1.5 1.5 0 0 1 2.4-1.8l2 2.6" /><path d="M12.6 8.6 10.4 5.4A1.5 1.5 0 0 1 12.8 3.7l2.6 3.8" /><path d="M15.4 7.5c.6-.9 2.6.1 2.1 1.4l-1.7 4.3a5.5 5.5 0 0 1-10 .3" /><path d="M5 5 4 3.4M3.5 8.6 1.8 8.2M7.6 3.4 7.9 1.7" /></>,
  pin: <><path d="M12 21s6-6.1 6-10.2A6 6 0 0 0 6 10.8C6 14.9 12 21 12 21Z" /><circle cx="12" cy="10.6" r="2.2" /></>,
  books: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v15H5.5A1.5 1.5 0 0 0 4 20.5v-15Z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14v15h4.5a1.5 1.5 0 0 1 1.5 1.5v-15Z" /><path d="M10 6.5h4" /></>,
  box: <><path d="M4 8.5 12 4.5l8 4v7l-8 4-8-4v-7Z" /><path d="m4 8.5 8 4 8-4M12 12.5V20" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></>,
  pen: <><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 6 3 3" /></>,
  link: <><path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.2 1.2" /><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.2-1.2" /></>,
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 13.5h1.8a1.2 1.2 0 0 1 1.2 1.2v3.1A1.2 1.2 0 0 1 5.8 19H4.6A1.6 1.6 0 0 1 3 17.4v-2.3a1.6 1.6 0 0 1 1-1.6Z" /><path d="M20 13.5h-1.8a1.2 1.2 0 0 0-1.2 1.2v3.1a1.2 1.2 0 0 0 1.2 1.2h1.2a1.6 1.6 0 0 0 1.6-1.6v-2.3a1.6 1.6 0 0 0-1-1.6Z" /></>,
}

export default function Icon({ name, className, strokeWidth = 1.8 }: {
  name: IconName
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {PATHS[name]}
    </svg>
  )
}
