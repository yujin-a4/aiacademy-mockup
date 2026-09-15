import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YBM AI 어학원",
    short_name: "YBM AI",
    description:
      "스타 강사를 AI로 구현해, 언제 어디서든 나만의 토익 과외 선생님을 갖는 경험",
    start_url: "/",
    // "standalone" = 앱처럼(상단 상태바 유지), "fullscreen" = 상태바까지 숨김
    display: "standalone",
    // 태블릿 가로가 기준 화면 — 고정하지 않고 기기 방향을 따른다
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/favicon.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
