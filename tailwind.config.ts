import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // YBM AI 어학원 블루 디자인 토큰
        "ybm-blue":        "#2277F0", // 주요 강조색 (제목, 아이콘)
        "ybm-blue-mid":    "#5BA8F5", // 아이콘 내부, 버튼
        "ybm-blue-light":  "#D6EAFF", // 아이콘 배경, 뱃지
        "ybm-bg":          "#F0F5FF", // 전체 페이지 배경
        "ybm-card":        "#FFFFFF", // 카드 배경
        "ybm-text":        "#1A2B4B", // 본문 텍스트
        "ybm-text-sub":    "#6B7A99", // 서브 텍스트
        "ybm-border":      "#E2EAF4", // 카드 테두리
        // 수업 화면(classroom) 전용 토큰 — YBM 블루 시스템 기반
        "cr-nav":          "#12203A", // 상단 네비바 배경 (다크 네이비)
        "cr-panel":        "#EAF2FF", // 강사 패널 배경 (연파랑, ybm-blue 기반)
        "cr-accent":       "#2277F0", // 강조색 = ybm-blue (버튼·뱃지·선택 상태)
        "cr-accent-light": "#D6EAFF", // 강조 연색 = ybm-blue-light (플레이스홀더)
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        "card": "0 2px 12px rgba(34, 119, 240, 0.08)",
        "card-hover": "0 6px 24px rgba(34, 119, 240, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
