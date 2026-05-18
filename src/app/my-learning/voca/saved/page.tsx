'use client'
import { useBookmarkStore } from '@/store/bookmarkStore'
import { useVocaStore } from '@/store/vocaStore'
import { VOCA_DATA } from '@/data/vocaData'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SavedVocaPage() {
  const { bookmarkedIds } = useBookmarkStore()
  const { initBookmarkedWords } = useVocaStore()
  const router = useRouter()

  const savedWords = VOCA_DATA.filter((w) => bookmarkedIds.includes(w.id))

  const startMode = (href: string) => {
    if (savedWords.length === 0) return
    initBookmarkedWords(bookmarkedIds)
    router.push(href)
  }

  const MODES = [
    {
      label: '플래시카드',
      desc: '카드를 넘기며 뜻을 익혀요',
      href: '/my-learning/voca/flashcard',
      color: '#4F46E5',
      bg: '#EEF2FF',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
      ),
    },
    {
      label: '퀴즈',
      desc: '4지선다로 뜻을 맞혀요',
      href: '/my-learning/voca/quiz',
      color: '#4F46E5',
      bg: '#EEF2FF',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      ),
    },
    {
      label: '받아쓰기',
      desc: '철자를 직접 입력해요',
      href: '/my-learning/voca/dictation',
      color: '#0891B2',
      bg: '#ECFEFF',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans">
      <header className="px-6 py-4 flex items-center gap-3">
        <Link href="/my-learning?tab=voca" className="p-2 -ml-2 text-[#6B7280]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </Link>
        <div className="font-bold text-[#1C1B33] text-[15px]">내가 저장한 단어</div>
      </header>

      <div className="px-6 max-w-[480px] mx-auto w-full pt-4">
        {/* 단어 수 */}
        <div className="bg-white rounded-3xl p-6 border border-[#ECEAF5] shadow-sm mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FEF9C3] flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div>
            <p className="text-[#1C1B33] font-bold text-[18px]">{savedWords.length}개</p>
            <p className="text-[#6B7280] text-[13px]">저장된 단어</p>
          </div>
        </div>

        {savedWords.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <p className="text-[#6B7280] text-[14px] font-medium">저장된 단어가 없어요</p>
            <p className="text-[#9CA3AF] text-[12px] mt-1">플래시카드에서 ★을 눌러 단어를 저장해보세요</p>
          </div>
        ) : (
          <>
            <p className="text-[#374151] text-[13px] font-semibold mb-3 px-1">학습 모드 선택</p>
            <div className="flex flex-col gap-3">
              {MODES.map((mode) => (
                <button
                  key={mode.label}
                  onClick={() => startMode(mode.href)}
                  className="bg-white border border-[#ECEAF5] rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-[#C7D2FE] hover:shadow-md transition-all active:scale-[0.99] text-left"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: mode.bg }}>
                    {mode.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1C1B33] font-bold text-[14px]">{mode.label}</p>
                    <p className="text-[#9CA3AF] text-[12px]">{mode.desc}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>

            {/* 단어 미리보기 */}
            <p className="text-[#374151] text-[13px] font-semibold mt-6 mb-3 px-1">저장한 단어 목록</p>
            <div className="flex flex-col gap-2 pb-10">
              {savedWords.map((w) => (
                <div key={w.id} className="bg-white border border-[#ECEAF5] rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[#1C1B33] font-semibold text-[14px]">{w.word}</p>
                    <p className="text-[#6B7280] text-[12px]">{w.meaning}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
