// * 모든 화면 위에 붙는 헤더 (SPEC 12장: 헤더에 지갑 버튼과 활동력 표시). 리디자인 시안 01 / D1 / D2.
//   데스크톱(900px~): 로고 + 메뉴 알약(회원: 내 펫·랭킹 / 비회원: 없음) | 활동력 + 계정
//   모바일(~900px)  : 로고 | 활동력 + 계정. 메뉴는 아래 탭 바(TabBar)가 맡는다.
//   ! 모바일 펫 화면(/pet/…)에서는 헤더를 숨긴다. 그 자리에 펫 HUD(레벨 링, 이름, 활동력, 계정)가 온다 (시안 02).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountButton } from "./AccountButton";
import { EnergyBadge } from "./EnergyBadge";
import { LogoMark, PawIcon, TrophyIcon } from "./icons";
import { useNavItems, type NavKey } from "./nav";
// * CSS Module import. styles는 { header: "Header_header__a1b2c", logo: "...", ... } 같은 객체다.
import styles from "./Header.module.scss";

// 메뉴별 아이콘 (탭 바와 같은 그림)
export const NAV_ICON: Record<NavKey, typeof PawIcon> = { pets: PawIcon, ranking: TrophyIcon };

export function Header() {
  const pathname = usePathname();
  const items = useNavItems();
  // data 속성으로 넘겨서 "모바일에서만 숨김"은 CSS가 정한다 (JS로 화면 폭을 재지 않는다 → 서버 HTML과 같다)
  const onPetPage = pathname.startsWith("/pet/");

  return (
    <header className={styles.header} data-pet-page={onPetPage}>
      <div className={styles.inner}>
        <div className={styles.left}>
          {/* 로고 = 홈 링크. 크림 알약 + 모치 얼굴 */}
          <Link href="/" className={styles.logo} aria-label="Mochimals home">
            <LogoMark size={30} />
            <span className={styles.logoText}>Mochimals</span>
          </Link>
          {/* 데스크톱 메뉴. aria-current="page": 스크린리더가 "현재 페이지"라고 읽는다 */}
          {/* 비회원이면 메뉴가 없으니 빈 <nav>도 그리지 않는다 */}
          {items.length > 0 && (
            <nav className={styles.nav} aria-label="Main menu">
              {items.map(({ key, label, href, active }) => {
                const Icon = NAV_ICON[key];
                return (
                  <Link
                    key={key}
                    href={href}
                    className={active ? styles.navActive : styles.navLink}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={20} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        <div className={styles.actions}>
          <EnergyBadge />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
