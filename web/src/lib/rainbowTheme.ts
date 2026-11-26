// * RainbowKit 테마 (리디자인 시안 14 지갑 연결 / 15 계정 메뉴에 맞춘 것).
//   ! 구조는 바꾸지 않는다. RainbowKit이 열어 두는 색·모서리·글꼴·그림자 값만 바꾼다.
//     그래서 시안과 100% 같지는 않다 (차이 목록은 docs/redesign.md "RainbowKit 차이").
//
// ? 색을 "#B8EE3A"가 아니라 "var(--lime)"으로 주는 이유:
//   RainbowKit은 테마 값을 [data-rk] 요소의 CSS 변수(--rk-colors-accentColor 등)로 넣는다.
//   CSS 변수 값으로 다른 CSS 변수를 써도 되므로, 색은 globals.scss 토큰 한 곳에서만 관리된다.
import { lightTheme, type Theme } from "@rainbow-me/rainbowkit";

// lightTheme(...)이 만든 기본값 위에 우리 값을 덮어쓴다
const base = lightTheme({
  accentColor: "var(--lime)", // 주 버튼(연결, 네트워크 전환), 선택된 지갑 테두리
  accentColorForeground: "var(--ink)", // 라임 위 글자는 잉크색 (흰색이면 대비가 낮다)
  borderRadius: "large", // 모달·버튼 모서리를 가장 둥글게
  overlayBlur: "none", // 시안은 흐림 없이 어두운 막만 깐다
});

export const rainbowTheme: Theme = {
  ...base,
  colors: {
    ...base.colors,
    // 모달
    modalBackground: "var(--panel)", // 크림 패널 #FFFAF0
    modalBackdrop: "var(--scrim)", // rgba(45,38,69,0.55)
    modalBorder: "var(--panel-edge)",
    modalText: "var(--ink)",
    modalTextDim: "var(--muted)",
    modalTextSecondary: "var(--muted)",
    closeButton: "var(--ink)",
    closeButtonBackground: "var(--white)",
    // 지갑 목록·계정 메뉴의 줄
    actionButtonBorder: "var(--panel-edge)",
    actionButtonBorderMobile: "var(--panel-edge)",
    actionButtonSecondaryBackground: "var(--white)", // 계정 메뉴의 "주소 복사", "연결 해제" 버튼 바탕
    menuItemBackground: "var(--row-next)", // 지갑 목록에서 마우스를 올린 줄
    generalBorder: "var(--panel-edge)",
    generalBorderDim: "var(--track)",
    profileAction: "var(--white)",
    profileActionHover: "var(--row-next)",
    profileForeground: "var(--panel)",
    selectedOptionBorder: "var(--lime-depth)",
    // 상태 색
    error: "var(--red)",
    standby: "var(--amber)",
    connectionIndicator: "var(--lime-depth)",
    // ConnectButton 자체는 우리가 직접 그리지만(AccountButton), 다른 곳에서 쓰일 때를 대비해 맞춘다
    connectButtonBackground: "var(--panel)",
    connectButtonText: "var(--ink)",
    connectButtonInnerBackground: "var(--white)",
    connectButtonBackgroundError: "var(--red)",
    connectButtonTextError: "var(--white)",
    downloadBottomCardBackground: "var(--panel)",
    downloadTopCardBackground: "var(--white)",
  },
  fonts: {
    // * 모달 전체 글꼴 = Bricolage + Pretendard 스택 (--font-display). 주소도 같은 글꼴이라 따로 바꿀 필요 없다
    body: "var(--font-display)",
  },
  shadows: {
    ...base.shadows,
    // 시안 패널과 같은 "두께 + 번짐" 그림자
    dialog: "0 5px 0 var(--panel-depth), 0 14px 30px var(--drop-panel)",
    profileDetailsAction: "0 3px 0 var(--panel-depth)",
    selectedOption: "0 3px 0 var(--lime-depth)",
    selectedWallet: "0 3px 0 var(--lime-depth)",
    connectButton: "0 3px 0 var(--panel-depth)",
    walletLogo: "0 2px 0 var(--panel-depth)",
  },
};
