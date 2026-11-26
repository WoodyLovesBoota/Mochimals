// * 모바일 아래 탭 바 (리디자인 시안 02·03·04). 900px 이상에서는 CSS로 숨긴다 (메뉴는 헤더 알약이 맡는다).
//   홈 / 내 펫 / 랭킹. 지금 화면은 라임 사각 + 흰 아이콘, 나머지는 회갈색 아이콘.
"use client";

import Link from "next/link";
import { NAV_ICON } from "./Header";
import { useNavItems } from "./nav";
import styles from "./TabBar.module.scss";

export function TabBar() {
  const items = useNavItems();

  return (
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
  );
}
