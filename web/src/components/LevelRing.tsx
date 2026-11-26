// * 레벨 링 (시안 02 왼쪽 위): 잉크색 원 안에 "Lv 7", 바깥 테두리가 다음 레벨까지 XP만큼 라임으로 찬다.
//   펫 HUD, 내 펫 목록 카드, NFT 이미지(다음 단계)가 같은 모양을 쓴다.
import styles from "./LevelRing.module.scss";

type Props = {
  level: number;
  /** 다음 레벨까지 채운 정도 0~100 */
  percent: number;
  /**
   * 바깥 지름 px (시안: 모바일 58, 데스크톱 72, 목록 54).
   * 안 주면 className 쪽 CSS의 --ring-size를 쓴다 (화면 폭마다 크기를 바꿀 때. 인라인 style은 미디어 쿼리로 못 덮는다)
   */
  size?: number;
  className?: string;
};

export function LevelRing({ level, percent, size, className }: Props) {
  return (
    <span
      className={`${styles.ring} ${className ?? ""}`}
      // * 값만 CSS 변수로 넘기고 색·모양은 scss가 정한다.
      //   --ring-p: conic-gradient의 라임 구간 끝 (예: 30%), --ring-size: 지름
      style={{ "--ring-p": `${percent}%`, ...(size && { "--ring-size": `${size}px` }) } as React.CSSProperties}
      role="img"
      aria-label={`레벨 ${level}, 다음 레벨까지 ${percent}%`}
    >
      <span className={styles.core}>
        <span className={styles.lv}>Lv</span>
        <span className={styles.num}>{level}</span>
      </span>
    </span>
  );
}
