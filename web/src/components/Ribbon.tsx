// * 주황 리본 제목 (시안 03 "레벨 랭킹", 04 "내 펫 2마리", 07 "레벨 업!", 08 "부화!").
//   가운데 판 + 양쪽 뒤로 접힌 꼬리 두 개. 꼬리는 clip-path로 제비꼬리 모양을 낸다.
import styles from "./Ribbon.module.scss";

type Props = {
  children: React.ReactNode;
  /** 글자 크기 단계: md(24px, 랭킹·목록) / lg(30px, 부화·진화) */
  size?: "md" | "lg";
  as?: "h1" | "h2" | "p";
  className?: string;
};

export function Ribbon({ children, size = "md", as: Tag = "h1", className }: Props) {
  return (
    <div className={`${styles.ribbon} ${size === "lg" ? styles.lg : ""} ${className ?? ""}`}>
      <span className={styles.tailLeft} aria-hidden />
      <span className={styles.tailRight} aria-hidden />
      <Tag className={styles.plate}>{children}</Tag>
    </div>
  );
}
