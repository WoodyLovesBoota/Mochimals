// * 트랜잭션 진행 단계 알약 (시안 05 "지갑 확인 → 블록 확정 → 부화장 이동", 06 "지갑 서명 → 블록 확정 → 반영").
//   끝난 단계 = 라임 + ✓, 지금 단계 = 스피너, 남은 단계 = 흐린 알약.
import { CheckIcon } from "./icons";
import { Spinner } from "./Spinner";
import styles from "./StepPills.module.scss";

type Props = {
  steps: readonly string[];
  /** 지금 진행 중인 단계 번호 (0부터). steps.length면 전부 끝남 */
  active: number;
  /** 넓게 꽉 채울지 (입양 시트) / 내용 폭만큼 (펫 화면) */
  stretch?: boolean;
};

export function StepPills({ steps, active, stretch = false }: Props) {
  return (
    // ol: 순서가 있는 목록. 스크린리더가 "3개 중 1번째"처럼 읽는다
    <ol className={`${styles.steps} ${stretch ? styles.stretch : ""}`} aria-label="Progress steps">
      {steps.map((label, i) => {
        const state = i < active ? "done" : i === active ? "active" : "todo";
        return (
          <li key={label} className={styles[state]} aria-current={state === "active" ? "step" : undefined}>
            {state === "done" && <CheckIcon size={14} />}
            {state === "active" && <Spinner size={12} />}
            {label}
          </li>
        );
      })}
    </ol>
  );
}
