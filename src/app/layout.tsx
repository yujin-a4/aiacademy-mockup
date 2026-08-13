import type { Metadata, Viewport } from "next";
import { Inter, Arimo } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";
import { GA_ID, GA_ON } from "@/lib/analytics";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/* 시험지 조판 서체 — 실물 토익은 Helvetica다. 그런데 안드로이드에는 Helvetica도 Arial도 없어서
   갤럭시탭에서는 Roboto 로 떨어진다(자폭이 달라 줄바꿈까지 어긋난다). Arimo 는 Helvetica·Arial 과
   자폭이 같게 만들어진 서체라, 이걸 실어 보내면 기기가 뭐든 같은 조판으로 나온다.
   next/font 가 빌드 때 받아 스스로 호스팅한다 — 구글로 나가는 요청은 없다. */
const arimo = Arimo({ subsets: ["latin"], variable: "--font-arimo" });

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
      <body className={`${inter.variable} ${arimo.variable}`}>
        {/* ── GA4 태그 ──
            **서버가 내려주는 HTML 에 그대로 실어야 한다.** next/script 로 클라이언트에서 끼워 넣으면
            구글의 "설치 확인"이 페이지 소스를 훑을 때 태그를 못 찾아 미설치로 뜬다(실측).
            자동 page_view 는 끈다 — SPA 라 첫 진입만 잡히기 때문에 Analytics 가 직접 보낸다. */}
        {GA_ON && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });`,
              }}
            />
          </>
        )}
        {children}
        {/* 화면 이동·참가자 표식 — 사내 화면에서는 스스로 꺼진다 (src/lib/analytics.ts) */}
        <Analytics />
      </body>
    </html>
  );
}
