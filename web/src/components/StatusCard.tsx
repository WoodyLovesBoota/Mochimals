// * 불러오는 중 / 불러오지 못했어요 / 비었어요 (시안 12의 "같은 틀을 쓰는 상태").
//   흰 카드 한 줄: [아이콘 상자] [제목 + 설명] [오른쪽: 스피너 / 다시 시도 / 링크]
import Link from "next/link";
import { CloseIcon, EggIcon } from "./icons";
import { Spinner } from "./Spinner";
import styles from "./StatusCard.module.scss";

type Props =
  | { kind: "loading"; title: string; detail?: string }
  | { kind: "error"; title: string; detail?: string; onRetry?: () => void }
  | { kind: "empty"; title: string; detail?: string; action?: { href: string; label: string } };

export function StatusCard(props: Props) {
  const { kind, title, detail } = props;
  return (
    // role: 로딩은 status(조용히), 실패는 alert(바로 읽기)
    <div className={styles.card} role={kind === "error" ? "alert" : "status"} aria-busy={kind === "loading"}>
      {kind === "loading" && <span className={styles.chipBlank} aria-hidden />}
      {kind === "error" && (
        <span className={styles.chipRed} aria-hidden>
          <CloseIcon size={16} />
        </span>
      )}
      {kind === "empty" && (
        <span className={styles.chipLime} aria-hidden>
          <EggIcon size={20} />
        </span>
      )}
      <span className={styles.body}>
        <strong>{title}</strong>
        {detail && <span>{detail}</span>}
      </span>
      {kind === "loading" && <Spinner size={18} />}
      {kind === "error" && props.onRetry && (
        <button type="button" className={styles.retry} onClick={props.onRetry}>
          다시 시도
        </button>
      )}
      {kind === "empty" && props.action && (
        <Link href={props.action.href} className={styles.link}>
          {props.action.label} ›
        </Link>
      )}
    </div>
  );
}
