// * 루트 레이아웃: 모든 페이지를 감싸는 껍데기다. <html>, <body>는 여기에만 있다.
//   App Router에서 src/app/layout.tsx는 필수 파일이다. 페이지가 바뀌어도 레이아웃은 다시 그려지지 않는다.
//   "use client"가 없으므로 서버 컴포넌트다. 그래서 async로 만들고 요청 헤더(쿠키)를 읽을 수 있다.
import type { Metadata } from "next";
// next/font: 구글 폰트를 빌드할 때 받아서 우리 서버에서 직접 제공한다 (외부 요청 없음, 글자 깜빡임 방지).
import { JetBrains_Mono, Jua, Noto_Sans_KR } from "next/font/google";
// headers(): 지금 들어온 요청의 헤더. 서버 컴포넌트에서만 쓸 수 있다.
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import { appUrl } from "@/lib/metadata";
// ! 서버용 config. 클라이언트용 @/lib/wagmi(RainbowKit)는 서버 컴포넌트에서 import하면 빌드가 실패한다.
import { serverConfig } from "@/lib/wagmiServer";
// 전역 스타일 (디자인 토큰, reset, body 기본값). 레이아웃에서 한 번만 import하면 모든 페이지에 적용된다.
import "./globals.scss";
import styles from "./layout.module.scss";
import { Providers } from "./providers";

// * 글꼴 세 가지 (리디자인 토큰). variable 옵션: 글꼴을 CSS 변수로 만든다 → globals.scss의 --font-display 등이 쓴다.
//   ? preload: false는 왜? 한글 글꼴은 글자 수가 많아 구글이 수십 조각(unicode-range)으로 나눠 준다.
//     전부 미리 받으면 첫 화면이 느려지니, 화면에 실제로 쓰인 글자의 조각만 브라우저가 받게 둔다.
//     subsets를 안 주면 next/font가 경고하므로 latin을 주고, 한글 조각은 unicode-range로 필요할 때 받는다.
const jua = Jua({
  weight: "400", // Jua는 굵기가 하나뿐이다
  subsets: ["latin"],
  variable: "--font-jua",
  preload: false,
  display: "swap", // 글꼴이 오기 전에는 대체 글꼴로 먼저 보여준다 (글자가 안 보이는 시간 없음)
});

const noto = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto",
  preload: false,
  display: "swap",
});

const mono = JetBrains_Mono({
  weight: "500",
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const DESCRIPTION = "밥 주고 훈련하면 진화하는 온체인 펫. 모치를 입양해서 키워 보세요.";

// * 브라우저 탭 제목, 검색 엔진 설명, 링크 미리보기(OG) 태그
export const metadata: Metadata = {
  // metadataBase: og:image 같은 상대 주소를 절대 주소로 바꿀 때 기준. 메신저 미리보기는 절대 주소만 읽는다
  metadataBase: new URL(appUrl()),
  // template: 하위 페이지가 title: "랭킹"만 주면 "랭킹 · Mochimals"가 된다
  title: { default: "Mochimals", template: "%s · Mochimals" },
  description: DESCRIPTION,
  applicationName: "Mochimals",
  openGraph: {
    type: "website",
    siteName: "Mochimals",
    title: "Mochimals",
    description: DESCRIPTION,
    locale: "ko_KR",
  },
  twitter: { card: "summary_large_image", title: "Mochimals", description: DESCRIPTION },
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
    <html lang="ko" className={`${jua.variable} ${noto.variable} ${mono.variable}`}>
      <body>
        {/* Providers는 클라이언트 컴포넌트지만, 그 안의 children(페이지)은 여전히 서버 컴포넌트일 수 있다 */}
        <Providers initialState={initialState}>
          {/* * 세로 flex 껍데기 + 장면 배경 그림 (layout.module.scss 주석 참고).
                모바일: 위 헤더(펫 화면에서는 숨김) + 본문 + 아래 탭 바 / 데스크톱(900px~): 위 내비 + 본문 */}
          <div className={styles.shell}>
            <Header />
            {children}
            <TabBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
