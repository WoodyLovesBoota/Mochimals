// ! ConnectButton은 클릭, 상태 같은 브라우저 기능을 쓰므로 클라이언트 컴포넌트여야 한다.
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { EnergyBadge } from "./EnergyBadge";
// * CSS Module import. styles는 { header: "Header_header__a1b2c", logo: "...", actions: "..." } 같은 객체다.
import styles from "./Header.module.scss";

// * 모든 화면 위에 붙는 헤더 (SPEC 12장: 헤더에 ConnectButton과 활동력 표시).
export function Header() {
  return (
    <header className={styles.header}>
      <span className={styles.logo}>Silo Pets</span>
      <div className={styles.actions}>
        <EnergyBadge />
        {/* * ConnectButton은 화면 폭에 따라 모양을 바꾸는 옵션이 있다 (RainbowKit 자체 기능).
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
