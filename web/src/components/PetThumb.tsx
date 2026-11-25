// * 작은 펫 썸네일: 둥근 사각형 무대 배경(아트 세트의 종별 색) 위에 PetSprite.
//   홈의 내 펫 목록(72px)과 랭킹(48px)이 같이 쓴다. 흰 알처럼 밝은 그림이 흰 화면에 묻히지 않게 배경을 깐다.
import { ACTIVE_ART_SET } from "@/art";
import type { PetLook } from "@/lib/look";
import { PetSprite } from "./PetSprite";
import styles from "./PetThumb.module.scss";

export function PetThumb({ look, size }: { look: PetLook; size: number }) {
  return (
    <span
      className={styles.thumb}
      // 배경색은 아트 세트가 정한다 (PetCard 무대와 같은 방식). 없으면 scss 기본값
      style={{ "--thumb-bg": ACTIVE_ART_SET.background?.(look), width: size, height: size } as React.CSSProperties}
    >
      <PetSprite look={look} size={size} />
    </span>
  );
}
