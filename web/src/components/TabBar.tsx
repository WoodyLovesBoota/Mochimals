// * 모바일 아래 탭 바 (리디자인 시안 02·03·04). 900px 이상에서는 CSS로 숨긴다 (메뉴는 헤더 알약이 맡는다).
//   홈 / 내 펫 / 랭킹. 지금 화면은 라임 사각 + 흰 아이콘, 나머지는 회갈색 아이콘.
"use client";

import Link from "next/link";
import { NAV_ICON } from "./Header";
import { usePathname } from "next/navigation";
import { useMyPetIds, useNavItems } from "./nav";
import styles from "./TabBar.module.scss";

export function TabBar() {
  const items = useNavItems();
  const pathname = usePathname();
  const myPets = useMyPetIds();
  // * 홈(/)의 소개·입양 화면은 아래 크림 시트가 화면 바닥까지 닿는다 (시안 01·05에는 탭 바가 없다).
  //   내 펫 목록(2마리 이상, 시안 04)일 때만 탭 바를 보여준다.
  const hidden = pathname === "/" && !(myPets && myPets.length >= 2);
  if (hidden) return null;

  return (
    <>
      {/* 탭 바는 화면에 고정(fixed)이라 자리를 차지하지 않는다. 같은 높이의 빈칸을 둬서 내용이 탭 바 뒤로 숨지 않게 한다 */}
      <div className={styles.spacer} aria-hidden />
      <nav className={styles.bar} aria-label="탭 메뉴">
        {items.map(({ key, label, href, active }) => {
          const Icon = NAV_ICON[key];
          return (
            <Link
              key={key}
              href={href}
              className={active ? styles.tabActive : styles.tab}
              aria-current={active ? "page" : undefined}
            >
              {/* 아이콘 칸 44×44. 활성이면 라임 사각(아이콘 24), 아니면 아이콘만(26) — 시안 크기 그대로 */}
              <span className={styles.icon}>
                <Icon size={active ? 24 : 26} />
              </span>
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
