import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "YBM AI 어학원",
  description: "스타 강사를 AI로 구현해, 언제 어디서든 나만의 토익 과외 선생님을 갖는 경험",
  // iOS Safari에서 "홈 화면에 추가" 시 독립 앱(전체화면)으로 실행
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YBM AI 어학원",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // 노치/홈바 영역까지 화면을 채움 (safe-area 는 CSS env() 로 처리)
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
