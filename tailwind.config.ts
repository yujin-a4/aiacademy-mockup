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
          DEFAULT: '#2563EB',
          50:      '#EFF6FF',
          100:     '#DBEAFE',
          300:     '#93C5FD',
          400:     '#60A5FA',
          500:     '#3B82F6',
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
        "ybm-blue":        "#2277F0",
        "ybm-blue-mid":    "#5BA8F5",
        "ybm-blue-light":  "#D6EAFF",
        "ybm-bg":          "#F0F5FF",
        "ybm-card":        "#FFFFFF",
        "ybm-text":        "#1A2B4B",
        "ybm-text-sub":    "#6B7A99",
        "ybm-border":      "#E2EAF4",
        // ── 수업 화면(classroom) 전용 토큰 ─────────────────────────────
        "cr-nav":          "#12203A",
        "cr-panel":        "#EAF2FF",
        "cr-accent":       "#2277F0",
        "cr-accent-light": "#D6EAFF",
      },
      fontFamily: {
        sans:    ['Pretendard', 'Noto Sans KR', 'Inter', 'sans-serif'],
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
        'slide-up':  'slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'logo-appear': 'logoAppear 2.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-out':  'fadeOut 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'svg-draw': 'svgDraw 3s ease-in-out forwards',
        'fill-in': 'fillIn 0.8s ease-in-out forwards 2s',
        'cta-pulse':    'ctaPulse 1.8s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.38s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in-up':  'fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'particle-fly':'particleFly 0.7s ease-out both',
        'pop-badge':   'popBadge 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'eq':          'eq 0.9s ease-in-out infinite',
        'pose-in':     'poseIn 0.26s ease-out both',
      },
      keyframes: {
        eq: {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%':      { transform: 'scaleY(1)' },
        },
        poseIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
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
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(48px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        particleFly: {
          '0%':   { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(var(--dx), var(--dy)) scale(0)', opacity: '0' },
        },
        popBadge: {
          '0%':   { transform: 'scale(0)', opacity: '0' },
          '60%':  { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
