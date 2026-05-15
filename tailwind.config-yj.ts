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
        // YBM AI 어학원 디자인 토큰 (브랜드 블루 포인트 + 미니멀 슬레이트)
        "ybm-blue":        "#2277F0", // 브랜드 블루 (주요 버튼, 강조)
        "ybm-blue-mid":    "#5BA8F5", // 보조 강조
        "ybm-blue-light":  "#F1F5F9", // Slate 100 (배경)
        "ybm-bg":          "#F8FAFC", // Slate 50 (전체 배경)
        "ybm-card":        "#FFFFFF", // 카드 배경
        "ybm-text":        "#0F172A", // Slate 900 (텍스트)
        "ybm-text-sub":    "#64748B", // Slate 500 (서브 텍스트)
        "ybm-border":      "#E2E8F0", // Slate 200 (테두리)
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        "card": "0 2px 12px rgba(15, 23, 42, 0.04)",
        "card-hover": "0 6px 24px rgba(15, 23, 42, 0.08)",
        "blue": "0 10px 20px -5px rgba(34, 119, 240, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
