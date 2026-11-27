// * 루트 레이아웃: 모든 페이지를 감싸는 껍데기다. <html>, <body>는 여기에만 있다.
//   App Router에서 src/app/layout.tsx는 필수 파일이다. 페이지가 바뀌어도 레이아웃은 다시 그려지지 않는다.
//   "use client"가 없으므로 서버 컴포넌트다. 그래서 async로 만들고 요청 헤더(쿠키)를 읽을 수 있다.
import type { Metadata } from "next";
// next/font: 구글 폰트를 빌드할 때 받아서 우리 서버에서 직접 제공한다 (외부 요청 없음, 글자 깜빡임 방지).
import { Bricolage_Grotesque } from "next/font/google";
// next/font/local: 구글 폰트에 없는 글꼴(Pretendard)을 우리 파일에서 같은 방식으로 제공한다.
import localFont from "next/font/local";
// headers(): 지금 들어온 요청의 헤더. 서버 컴포넌트에서만 쓸 수 있다.
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import { WrongNetworkSheet } from "@/components/WrongNetworkSheet";
import { appUrl } from "@/lib/metadata";
// ! 서버용 config. 클라이언트용 @/lib/wagmi(RainbowKit)는 서버 컴포넌트에서 import하면 빌드가 실패한다.
import { serverConfig } from "@/lib/wagmiServer";
// 전역 스타일 (디자인 토큰, reset, body 기본값). 레이아웃에서 한 번만 import하면 모든 페이지에 적용된다.
import "./globals.scss";
import styles from "./layout.module.scss";
import { Providers } from "./providers";

// * 글꼴 두 가지 (리디자인 토큰). variable 옵션: 글꼴을 CSS 변수로 만든다 → globals.scss의 --font-display 등이 쓴다.
//   * 역할 분담: 라틴 글자·숫자 = Bricolage Grotesque, 한글 = Pretendard.
//     globals.scss에서 "Bricolage → Pretendard" 순서로 쌓으면, 브라우저가 글자마다
//     Bricolage에 그 글자가 있는지 보고, 없으면(한글) 다음 글꼴인 Pretendard로 넘어간다.

// * Bricolage Grotesque (가변 글꼴). 굵기와 opsz(광학 크기) 두 축이 있다.
//   ? opsz는 뭘까? 글자 크기에 맞춰 모양을 다듬는 축이다. 큰 제목은 촘촘하고 날렵하게,
//     작은 글씨는 넓고 읽기 쉽게 바뀐다. font-optical-sizing: auto(기본값)라 font-size만 주면 알아서 맞춘다.
//   * weight "variable": 굵기 200~800 전체가 든 가변 파일 하나를 받는다. 우리는 그중 500~800만 쓴다.
//     ? "500 800" 같은 범위 지정은 왜 안 했을까? 이 Next 버전은 Bricolage에 범위 문자열을 받지 않는다
//       (빌드 에러: Unknown weight 500 800). 가변 파일이라 범위를 좁혀도 파일 수는 어차피 하나다.
const bricolage = Bricolage_Grotesque({
  weight: "variable",
  axes: ["opsz"], // 기본은 굵기 축만 들어 있다. opsz 축을 추가로 받는다
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap", // 글꼴이 오기 전에는 대체 글꼴로 먼저 보여준다 (글자가 안 보이는 시간 없음)
});

// * Pretendard Variable: npm 패키지(pretendard)에 들어 있는 가변 woff2 파일을 쓴다.
//   * unicode-range: 이 글꼴을 "한글 글자에만" 쓰라고 브라우저에 알려 준다.
//     U+1100-11FF 한글 자모, U+3130-318F 호환 자모(ㄱ, ㅏ 단독), U+AC00-D7A3 완성형 한글(가~힣).
//     → 영문·숫자는 Pretendard에 글자가 있어도 절대 Pretendard로 그리지 않는다 (Bricolage가 맡는다).
//   ? preload: false는 왜? 파일이 2MB 정도로 크다. 미리 받게 하면 첫 화면이 느려진다.
//     unicode-range 덕분에 화면에 한글이 실제로 나올 때만 브라우저가 받는다.
const pretendard = localFont({
  // 경로는 이 파일(src/app/layout.tsx) 기준이다
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  weight: "45 920", // 이 파일이 지원하는 가변 굵기 범위
  declarations: [{ prop: "unicode-range", value: "U+1100-11FF, U+3130-318F, U+AC00-D7A3" }],
  variable: "--font-pretendard",
  preload: false,
  display: "swap",
  // 대체 글꼴 크기 보정(Arial 기준)은 한글에 의미가 없어서 끈다
  adjustFontFallback: false,
});

const DESCRIPTION = "Onchain pets that evolve as you feed and train them. Adopt a Mochi and raise it.";

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
    locale: "en_US",
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
    <html lang="en" className={`${bricolage.variable} ${pretendard.variable}`}>
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
          {/* 지갑이 다른 체인에 있으면 어느 화면에서든 뜨는 전환 시트 (시안 13) */}
          <WrongNetworkSheet />
        </Providers>
      </body>
    </html>
  );
}
