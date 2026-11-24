// ! ConnectButton은 클릭, 상태 같은 브라우저 기능을 쓰므로 클라이언트 컴포넌트여야 한다.
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { EnergyBadge } from "./EnergyBadge";

// * 모든 화면 위에 붙는 헤더 (SPEC 12장: 헤더에 ConnectButton과 활동력 표시).
//   T1: flex 레이아웃, 간격 스케일 / T2: 디자인 토큰(text-ink 등), 반응형(sm:)
export function Header() {
  return (
    // * 반응형 접두사: Tailwind는 "모바일 먼저(mobile-first)"다.
    //   접두사 없는 클래스 = 모든 화면, sm: = 화면 폭 640px 이상에서만 덮어쓴다.
    //   px-4 sm:px-6 → 휴대폰은 좌우 16px, 태블릿·PC는 24px
    <header className="flex items-center justify-between border-b border-ink/10 px-4 py-3 sm:px-6">
      {/* text-ink: globals.css @theme에 등록한 --color-ink (#22252F) */}
      <span className="text-lg font-bold text-ink">Silo Pets</span>
      {/* gap-2 sm:gap-3 → 좁은 화면에서는 간격을 줄인다 */}
      <div className="flex items-center gap-2 sm:gap-3">
        <EnergyBadge />
        {/* * ConnectButton도 화면 폭에 따라 모양을 바꿀 수 있다 (RainbowKit 옵션, Tailwind와 별개).
              smallScreen: 휴대폰에서는 아바타만, largeScreen: 넓은 화면에서는 주소까지 */}
        <ConnectButton
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
          showBalance={{ smallScreen: false, largeScreen: true }}
        />
      </div>
    </header>
  );
}
