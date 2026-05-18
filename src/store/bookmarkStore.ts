import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface BookmarkState {
  bookmarkedIds: number[]
  toggleBookmark: (id: number) => void
  isBookmarked: (id: number) => boolean
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarkedIds: [],
      toggleBookmark: (id) => {
        const { bookmarkedIds } = get()
        set({
          bookmarkedIds: bookmarkedIds.includes(id)
            ? bookmarkedIds.filter((bid) => bid !== id)
            : [...bookmarkedIds, id],
        })
      },
      isBookmarked: (id) => get().bookmarkedIds.includes(id),
    }),
    {
      name: 'voca-bookmarks',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
