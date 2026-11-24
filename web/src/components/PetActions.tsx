// * 내 펫 화면의 행동 버튼: 밥 주기, 훈련, 충전 (4강 6교시, SPEC 12장 "내 펫 화면 버튼 상태" 표).
//   쓰기는 전부 usePetAction 하나를 지난다. 이 파일은 "지금 어떤 버튼을 어떤 글자로, 눌러지게 할지"만 정한다.
//   ! 주인일 때만 그린다 (PetView가 isOwner로 거른다). 버튼 상태 판단에 쓰는 pet.energy는 "보는 사람 = 주인"의 잔액이다.
"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { usePetAction, type ActionPhase } from "@/hooks/usePetAction";
import type { PetState } from "@/hooks/usePet";
import { chain } from "@/lib/chain";
import { toErrorMessage } from "@/lib/errors";
import styles from "./PetActions.module.scss";

// PetNFT 상수 (constant라 컨트랙트에서 읽지 않는다. PetStats의 MAX_ENERGY와 같은 이유)
const FEED_COST = 1n;
const FEED_XP = 10;
const TRAIN_COST = 3n;
const TRAIN_XP = 40;

type Props = { petId: bigint; pet: PetState };

export function PetActions({ petId, pet }: Props) {
  const action = usePetAction();
  // * chainId: 지갑이 지금 붙어 있는 체인. 우리 앱의 체인(chain.ts)과 다르면 "잘못된 네트워크"다.
  const { chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const wrongNetwork = chainId !== chain.id;

  // * 진행 중인 행동. useMutation의 variables = 마지막으로 mutate에 넘긴 인자 → 어떤 버튼을 눌렀는지 안다.
  //   SPEC 12장: "누른 버튼만 '지갑에서 확인'/'처리 중', 나머지 비활성"
  const busy = action.phase !== "idle";
  const pressed = busy ? action.variables?.fn : undefined;

  // * 잔액별 상태 (SPEC 12장 표). bigint끼리 비교한다 (1n, 3n).
  const canFeed = pet.energy >= FEED_COST;
  const canTrain = pet.energy >= TRAIN_COST;
  const empty = pet.energy === 0n;

  // ! 잘못된 네트워크: 모든 행동 버튼을 막고 전환 버튼만 보여준다.
  //   시뮬레이션은 config의 체인(우리 체인)으로 돌지만, 서명은 지갑의 체인으로 간다. 그대로 두면 지갑이 엉뚱한 체인에 보내려다 실패한다.
  if (wrongNetwork) {
    return (
      <section className={styles.actions}>
        <button className={styles.primary} disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
          {switching ? "지갑에서 확인" : `${chain.name}로 전환`}
        </button>
      </section>
    );
  }

  // 에러 문구. 지갑 거절이면 null (errors.ts 30줄) → 아무것도 안 보인다.
  //   ? 다음 행동을 누르면 문구가 사라질까? useMutation은 mutate를 새로 부르면 error를 지우고 다시 시작한다.
  const errorText = action.error ? toErrorMessage(action.error) : null;

  // 확정 대기 중 블록 탐색기 링크 (anvil은 탐색기가 없어서 undefined → 링크 안 보임)
  const explorer = chain.blockExplorers?.default.url;

  return (
    <section className={styles.actions}>
      <div className={styles.buttons}>
        <ActionButton
          className={styles.feed}
          label="밥 주기"
          hint={`활동력 ${FEED_COST} · +${FEED_XP}`}
          disabled={busy || !canFeed}
          phase={pressed === "feed" ? action.phase : "idle"}
          onClick={() => action.mutate({ fn: "feed", petId })}
        />
        <ActionButton
          className={styles.primary}
          label="훈련"
          // 배고프면 XP 절반 (PetNFT.train: isHungry ? TRAIN_XP / 2 : TRAIN_XP)
          hint={
            !canTrain
              ? `활동력 ${TRAIN_COST} 필요`
              : `활동력 ${TRAIN_COST} · ${pet.hungry ? `+${TRAIN_XP / 2} (배고픔)` : `+${TRAIN_XP}`}`
          }
          disabled={busy || !canTrain}
          phase={pressed === "train" ? action.phase : "idle"}
          onClick={() => action.mutate({ fn: "train", petId })}
        />
      </div>

      {/* 활동력 0일 때만 충전 버튼 (SPEC 12장: 그 외에는 숨김). 컨트랙트도 0일 때만 허용한다 (StillHasEnergy) */}
      {empty && (
        <ActionButton
          className={styles.refill}
          label="무료 충전 +10"
          hint="활동력을 다 썼어요"
          disabled={busy}
          phase={pressed === "refill" ? action.phase : "idle"}
          onClick={() => action.mutate({ fn: "refill" })}
        />
      )}

      {/* role="alert": 문구가 나타나면 스크린리더가 바로 읽는다 */}
      {errorText && (
        <p className={styles.error} role="alert">
          {errorText}
        </p>
      )}

      {action.phase === "confirming" && action.hash && explorer && (
        <a className={styles.link} href={`${explorer}/tx/${action.hash}`} target="_blank" rel="noreferrer">
          오래 걸리면 탐색기에서 확인하기 ↗
        </a>
      )}
    </section>
  );
}

// 버튼 하나. phase에 따라 글자를 바꾼다 (SPEC 12장: 확인 중 → 지갑에서 확인 → 처리 중)
const PHASE_LABEL: Record<Exclude<ActionPhase, "idle">, string> = {
  simulating: "확인 중",
  signing: "지갑에서 확인",
  confirming: "처리 중",
};

function ActionButton(props: {
  className: string;
  label: string;
  hint: string;
  disabled: boolean;
  phase: ActionPhase;
  onClick: () => void;
}) {
  const { className, label, hint, disabled, phase, onClick } = props;
  const active = phase !== "idle";
  return (
    // * aria-busy: 이 버튼이 처리 중이라는 걸 보조기기에 알린다
    <button className={className} disabled={disabled} onClick={onClick} aria-busy={active}>
      <span className={styles.label}>
        {phase === "confirming" && <span className={styles.spinner} aria-hidden />}
        {active ? PHASE_LABEL[phase] : label}
      </span>
      {!active && <span className={styles.hint}>{hint}</span>}
    </button>
  );
}
