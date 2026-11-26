// * HUD 아래 한 줄 알림 알약 (시안 02 해금 알림, 06 진행 중, 10 배고픔·실패).
//   tone으로 색만 바꾼다: default(크림) / hungry(연분홍) / error(빨강, 흰 글자)
import styles from "./Notice.module.scss";

type Props = {
  tone?: "default" | "hungry" | "error";
  /** 왼쪽 아이콘 자리 (아이콘 상자나 스피너) */
  icon: React.ReactNode;
  children: React.ReactNode;
  /** 오른쪽 끝 (단계 "2/3", 화살표 등) */
  trailing?: React.ReactNode;
  /** status: 끼어들지 않고 읽기 / alert: 바로 읽기 (실패) */
  role?: "status" | "alert";
  onClick?: () => void;
};

export function Notice({ tone = "default", icon, children, trailing, role = "status", onClick }: Props) {
  const className = `${styles.notice} ${styles[tone] ?? ""}`;
  const body = (
    <>
      {icon}
      <span className={styles.text}>{children}</span>
      {trailing}
    </>
  );
  // 누를 수 있으면 button (해금 보상 → 해금 목록 열기), 아니면 p
  return onClick ? (
    <button type="button" className={className} onClick={onClick} role={role}>
      {body}
    </button>
  ) : (
    <p className={className} role={role}>
      {body}
    </p>
  );
}
