// * 도는 고리 (시안의 "확정 중", "불러오는 중"). 연한 고리 + 진한 한쪽.
//   ! 동작 줄이기(prefers-reduced-motion)면 돌지 않고 멈춘 고리로 남는다 (상태 글자가 따로 있어서 뜻은 그대로 전달된다).
import styles from "./Spinner.module.scss";

export function Spinner({ size = 20, light = false }: { size?: number; light?: boolean }) {
  return (
    <span
      className={`${styles.spinner} ${light ? styles.light : ""}`}
      style={{ "--spinner-size": `${size}px` } as React.CSSProperties}
      aria-hidden
    />
  );
}
