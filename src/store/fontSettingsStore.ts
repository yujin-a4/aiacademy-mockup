import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type FontSize = 'small' | 'normal' | 'large' | 'xlarge'
export type FontType = 'serif' | 'sans'

interface FontSettingsState {
  fontSize: FontSize
  fontType: FontType
  setFontSize: (size: FontSize) => void
  setFontType: (type: FontType) => void
}

export const useFontSettingsStore = create<FontSettingsState>()(
  persist(
    (set) => ({
      fontSize: 'normal',
      fontType: 'serif', // Default to serif (Times New Roman style) for actual exam feel
      setFontSize: (size) => set({ fontSize: size }),
      setFontType: (type) => set({ fontType: type }),
    }),
    {
      name: 'font-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

/** 시험지(지문·문장·표·머리글)용 배율 — 실물 시험지의 비례를 지켜야 해서 px 를 하나하나
 *  갈아끼우지 않고 통째로 곱한다. `--fs` CSS 변수로 흘려보내면 아래 어디서든 받는다.
 *  숫자는 FONT_SIZE_CLASSES.body(14/16/19/22px)와 같은 비율. */
export const FONT_SCALE: Record<FontSize, number> = {
  small: 0.875,
  normal: 1,
  large: 1.1875,
  xlarge: 1.375,
}

export const FONT_SIZE_CLASSES = {
  small: {
    title: 'text-[16px]',
    body: 'text-[14px] leading-relaxed',
    desc: 'text-[12px]',
    label: 'text-[11px]',
  },
  normal: {
    title: 'text-[18px]',
    body: 'text-[16px] leading-relaxed',
    desc: 'text-[14px]',
    label: 'text-[12px]',
  },
  large: {
    title: 'text-[21px]',
    body: 'text-[19px] leading-relaxed',
    desc: 'text-[16px]',
    label: 'text-[14px]',
  },
  xlarge: {
    title: 'text-[24px]',
    body: 'text-[22px] leading-relaxed',
    desc: 'text-[18px]',
    label: 'text-[16px]',
  },
}
