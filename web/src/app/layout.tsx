// * 루트 레이아웃: 모든 페이지를 감싸는 껍데기다. <html>, <body>는 여기에만 있다.
//   App Router에서 src/app/layout.tsx는 필수 파일이다. 페이지가 바뀌어도 레이아웃은 다시 그려지지 않는다.
//   "use client"가 없으므로 서버 컴포넌트다. 그래서 async로 만들고 요청 헤더(쿠키)를 읽을 수 있다.
import type { Metadata } from "next";
// next/font: 구글 폰트를 빌드할 때 받아서 우리 서버에서 직접 제공한다 (외부 요청 없음, 글자 깜빡임 방지).
import { Geist, Geist_Mono } from "next/font/google";
// headers(): 지금 들어온 요청의 헤더. 서버 컴포넌트에서만 쓸 수 있다.
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { Header } from "@/components/Header";
// ! 서버용 config. 클라이언트용 @/lib/wagmi(RainbowKit)는 서버 컴포넌트에서 import하면 빌드가 실패한다.
import { serverConfig } from "@/lib/wagmiServer";
// 전역 스타일 (디자인 토큰, reset, body 기본값). 레이아웃에서 한 번만 import하면 모든 페이지에 적용된다.
// 컴포넌트별 스타일은 각 컴포넌트 옆의 .module.scss에 둔다.
import "./globals.scss";
import styles from "./layout.module.scss";
import { Providers } from "./providers";

// * variable 옵션: 폰트를 CSS 변수(--font-geist-sans)로 만든다.
//   globals.scss의 body가 font-family: var(--font-geist-sans)로 이 변수를 쓴다.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 브라우저 탭 제목과 검색 엔진 설명
export const metadata: Metadata = {
  title: "Silo Pets",
  description: "펫을 입양하고 밥을 주고 훈련시키는 온체인 육성 게임",
};

// * LayoutProps<"/">: Next.js가 라우트 경로를 보고 자동으로 만들어 주는 props 타입이다 (children 포함).
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // * 쿠키 → wagmi 초기 상태.
  //   chain.ts에서 storage를 cookieStorage로 정했으므로, 지난번 연결 정보가 "wagmi.store" 쿠키에 들어 있다.
  //   서버가 이걸 읽어 "연결됨" 상태로 첫 HTML을 그리므로, 새로고침해도 "지갑 연결" 버튼이 잠깐 보였다 사라지는 깜빡임이 없다.
  // ! headers()를 읽는 순간 이 레이아웃 아래 모든 페이지가 "요청마다 렌더링(동적)"이 된다.
  //   그래서 next.config.ts에서 cacheComponents를 껐다 (이유는 그 파일 주석 참고).
  const initialState = cookieToInitialState(serverConfig, (await headers()).get("cookie"));

  return (
    <html
      lang="ko"
      // geistSans.variable → "--font-geist-sans" 변수를 정의하는 클래스 (next/font가 만든 이름)
      // (높이, 글자 부드럽게 등 html 기본 스타일은 globals.scss에 있다)
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        {/* Providers는 클라이언트 컴포넌트지만, 그 안의 children(페이지)은 여전히 서버 컴포넌트일 수 있다 */}
        <Providers initialState={initialState}>
          {/* 세로 flex 껍데기. 헤더 아래 main이 남은 높이를 채운다 (layout.module.scss 주석 참고) */}
          <div className={styles.shell}>
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
