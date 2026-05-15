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
        'dark-navy': '#0D1B4B',
        'navy-mid': '#1B3EAF',
        'waong-lavender': '#8B8FC8',
        'lavender-light': '#C4C6E8',
        'off-white': '#F7F8FC',
        'light-gray': '#EAECF4',
        'mid-gray': '#9499B7',
        'charcoal': '#2C2F4A',
        'success': '#1DB97A',
        'error-red': '#E8193C',
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Barlow Condensed', 'sans-serif'],
      },
      borderRadius: {
        'sharp': '6px',
        'default': '12px',
        'large': '20px',
      },
      boxShadow: {
        'low': '0 2px 8px rgba(13, 27, 75, 0.08)',
        'mid': '0 4px 16px rgba(13, 27, 75, 0.14)',
        'high': '0 8px 32px rgba(13, 27, 75, 0.20)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float': 'float 3s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
    },
  },
  plugins: [],
};
export default config;
