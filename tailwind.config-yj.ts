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
        // YBM AI 어학원 블루 디자인 토큰 (미니멀 슬레이트 테마로 변경)
        "ybm-blue":        "#1E293B", // Slate 800 (기존 쨍한 블루 대신 차분하고 묵직한 포인트)
        "ybm-blue-mid":    "#64748B", // Slate 500 (중간 톤)
        "ybm-blue-light":  "#F1F5F9", // Slate 100 (매우 연한 배경)
        "ybm-bg":          "#F8FAFC", // Slate 50 (전체 배경)
        "ybm-card":        "#FFFFFF", // 카드 배경
        "ybm-text":        "#0F172A", // Slate 900 (메인 텍스트)
        "ybm-text-sub":    "#64748B", // Slate 500 (서브 텍스트)
        "ybm-border":      "#E2E8F0", // Slate 200 (테두리)
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        "card": "0 2px 12px rgba(15, 23, 42, 0.04)",
        "card-hover": "0 6px 24px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
