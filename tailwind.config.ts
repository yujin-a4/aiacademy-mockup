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
        // ── 온보딩 화면 전용 토큰 (개발자 B) ──────────────────────────
        'dark-navy':       '#0D1B4B',
        'navy-mid':        '#1B3EAF',
        'waong-lavender':  '#8B8FC8',
        'lavender-light':  '#C4C6E8',
        'off-white':       '#F7F8FC',
        'light-gray':      '#EAECF4',
        'mid-gray':        '#9499B7',
        'charcoal':        '#2C2F4A',
        'success':         '#1DB97A',
        'error-red':       '#E8193C',
        // ── 공통 YBM AI 어학원 블루 디자인 토큰 (개발자 A 기준) ────────
        "ybm-blue":        "#2277F0", // 주요 강조색 (제목, 아이콘)
        "ybm-blue-mid":    "#5BA8F5", // 아이콘 내부, 버튼
        "ybm-blue-light":  "#D6EAFF", // 아이콘 배경, 뱃지
        "ybm-bg":          "#F0F5FF", // 전체 페이지 배경
        "ybm-card":        "#FFFFFF", // 카드 배경
        "ybm-text":        "#1A2B4B", // 본문 텍스트
        "ybm-text-sub":    "#6B7A99", // 서브 텍스트
        "ybm-border":      "#E2EAF4", // 카드 테두리
        // ── 수업 화면(classroom) 전용 토큰 ─────────────────────────────
        "cr-nav":          "#12203A",
        "cr-panel":        "#EAF2FF",
        "cr-accent":       "#2277F0",
        "cr-accent-light": "#D6EAFF",
      },
      fontFamily: {
        sans:    ['-apple-system', 'BlinkMacSystemFont', '"Apple SD Gothic Neo"', 'Pretendard', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Barlow Condensed', 'sans-serif'],
      },
      borderRadius: {
        'sharp':   '6px',
        'default': '12px',
        'large':   '20px',
      },
      boxShadow: {
        'low':        '0 2px 8px rgba(13, 27, 75, 0.08)',
        'mid':        '0 4px 16px rgba(13, 27, 75, 0.14)',
        'high':       '0 8px 32px rgba(13, 27, 75, 0.20)',
        'card':       '0 2px 12px rgba(34, 119, 240, 0.08)',
        'card-hover': '0 6px 24px rgba(34, 119, 240, 0.15)',
        'blue':       '0 4px 16px rgba(34, 119, 240, 0.35)',
      },
      animation: {
        'fade-in':   'fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float':     'float 3s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.3)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
