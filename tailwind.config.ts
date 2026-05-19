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
        // ── 디자인 시스템 v2 Primary ───────────────────────────────────
        primary: {
          DEFAULT: '#1A3FD4',
          50:      '#EEF2FF',
          100:     '#D6E0FD',
          300:     '#8AA4F6',
          400:     '#5578F0',
          500:     '#3459E6',
        },
        // ── Accent (AI 기능 강조) ──────────────────────────────────────
        accent: {
          DEFAULT: '#06B6D4',
          light:   '#CFFAFE',
        },
        // ── Semantic ──────────────────────────────────────────────────
        success: '#10B981',
        error:   '#EF4444',
        warning: '#F59E0B',
        // ── 레거시 (classroom 등 기존 화면용) ──────────────────────────
        "ybm-blue":        "#1A3FD4",
        "ybm-blue-mid":    "#5578F0",
        "ybm-blue-light":  "#EEF2FF",
        "ybm-bg":          "#F3F4F6",
        "ybm-card":        "#FFFFFF",
        "ybm-text":        "#111318",
        "ybm-text-sub":    "#6B7280",
        "ybm-border":      "#D1D5DB",
        // ── 수업 화면(classroom) 전용 토큰 ─────────────────────────────
        "cr-nav":          "#12203A",
        "cr-panel":        "#EAF2FF",
        "cr-accent":       "#1A3FD4",
        "cr-accent-light": "#EEF2FF",
      },
      fontFamily: {
        sans:    ['Noto Sans KR', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Noto Sans KR', 'sans-serif'],
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
        'slide-up':  'slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'logo-appear': 'logoAppear 2.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-out':  'fadeOut 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'svg-draw': 'svgDraw 3s ease-in-out forwards',
        'fill-in': 'fillIn 0.8s ease-in-out forwards 2s',
        'cta-pulse': 'ctaPulse 1.8s ease-in-out infinite',
      },
      keyframes: {
        svgDraw: {
          '0%': { 'stroke-dashoffset': '1000', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { 'stroke-dashoffset': '0', opacity: '1' },
        },
        fillIn: {
          '0%': { 'fill-opacity': '0' },
          '100%': { 'fill-opacity': '1' },
        },
        logoAppear: {
          '0%':   { opacity: '0', transform: 'scale(0)' },
          '40%':  { opacity: '1', transform: 'scale(1)' },
          '80%':  { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(1.02)' },
        },
        fadeOut: {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0' },
        },
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
        slideUp: {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        ctaPulse: {
          '0%, 100%': { transform: 'scale(1)',    opacity: '1' },
          '50%':      { transform: 'scale(1.05)', opacity: '0.88' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
