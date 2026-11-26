// * 해금 종류별 아이콘 상자 (시안 16 해금 목록, D2 오른쪽 패널). 펫 패널과 해금 목록 시트가 같이 쓴다.
//   잠긴 해금은 회색 상자 (색만으로 구분하지 않도록 목록 쪽에서 자물쇠·"다음" 글자도 같이 보여준다).
import type { UnlockKind } from "@/lib/unlocks";
import { HeartIcon, MountainIcon, ShirtIcon, SparkleIcon, StarIcon, TrophyIcon } from "./icons";
import styles from "./UnlockIcon.module.scss";

// 종류 → [아이콘, 색 클래스 이름]. 색 짝은 globals.scss 토큰과 같은 이름이다
const MAP: Record<UnlockKind, [typeof SparkleIcon, keyof typeof styles]> = {
  evolve: [SparkleIcon, "lime"],
  accessory: [ShirtIcon, "amber"],
  background: [MountainIcon, "blue"],
  title: [StarIcon, "purple"],
  egg: [HeartIcon, "pink"],
  motion: [HeartIcon, "pink"],
  rank: [TrophyIcon, "amber"],
};

export function UnlockIcon({ kind, locked = false }: { kind: UnlockKind; locked?: boolean }) {
  const [Icon, tone] = MAP[kind];
  return (
    <span className={`${styles.chip} ${locked ? styles.locked : styles[tone]}`} aria-hidden>
      <Icon size={20} />
    </span>
  );
}
