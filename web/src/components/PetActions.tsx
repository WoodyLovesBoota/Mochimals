// * 내 펫 화면의 행동 버튼: 밥 주기, 훈련, 충전 (4강 6교시, SPEC 12장 "내 펫 화면 버튼 상태" 표, 리디자인 시안 02·06·10).
//   쓰기 훅(usePetAction)은 부모 PetView가 갖고 있다 (진행 중 알림·단계 알약도 PetView가 그려서).
//   이 파일은 "지금 어떤 버튼을 어떤 글자로, 눌러지게 할지"만 정한다.
//   ! 주인일 때만 그린다 (PetView가 isOwner로 거른다). 버튼 상태 판단에 쓰는 pet.energy는 "보는 사람 = 주인"의 잔액이다.
"use client";

import { useAccount, useSwitchChain } from "wagmi";
import type { PetState } from "@/hooks/usePet";
import type { ActionPhase, PetActionArgs, usePetAction } from "@/hooks/usePetAction";
import { chain } from "@/lib/chain";
import { shortHash, txUrl } from "@/lib/links";
import { BoltIcon, BowlIcon, DumbbellIcon } from "./icons";
import { Spinner } from "./Spinner";
import styles from "./PetActions.module.scss";

// PetNFT 상수 (constant라 컨트랙트에서 읽지 않는다. PetPanel의 MAX_ENERGY와 같은 이유)
const FEED_COST = 1n;
const FEED_XP = 10;
const TRAIN_COST = 3n;
const TRAIN_XP = 40;

type Props = {
  petId: bigint;
  pet: PetState;
  /** usePetAction()의 반환값 (PetView가 만든다) */
  action: ReturnType<typeof usePetAction>;
};

export function PetActions({ petId, pet, action }: Props) {
  const run = (args: PetActionArgs) => action.mutate(args);

  // * chainId: 지갑이 지금 붙어 있는 체인. 우리 앱의 체인(chain.ts)과 다르면 "잘못된 네트워크"다.
  const { chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const wrongNetwork = chainId !== chain.id;

  // * 진행 중인 행동. usePetAction의 pendingArgs = mutate에 넘긴 인자(또는 이어받은 행동) → 어떤 버튼을 눌렀는지 안다.
  //   SPEC 12장 / 시안 06: "누른 버튼만 진행 표시, 나머지 비활성"
  const busy = action.phase !== "idle";
  const pressed = action.pendingArgs?.fn;

  // * 잔액별 상태 (SPEC 12장 표). bigint끼리 비교한다 (1n, 3n).
  const canFeed = pet.energy >= FEED_COST;
  const canTrain = pet.energy >= TRAIN_COST;
  const empty = pet.energy === 0n;

  // ! 잘못된 네트워크: 모든 행동 버튼을 막고 전환 버튼만 보여준다.
  //   시뮬레이션은 config의 체인(우리 체인)으로 돌지만, 서명은 지갑의 체인으로 간다. 그대로 두면 지갑이 엉뚱한 체인에 보내려다 실패한다.
  if (wrongNetwork) {
    return (
      <section className={styles.actions}>
        <div className={styles.buttons}>
          <button className={styles.switch} disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
            {switching ? "Confirm in your wallet" : `Switch to ${chain.name}`}
          </button>
        </div>
      </section>
    );
  }

  // 확정 대기 중 트랜잭션 해시 (누른 버튼 안에 링크로 보여준다)
  const hash = action.phase === "confirming" ? action.hash : undefined;

  return (
    <section className={styles.actions} aria-label="Actions">
      <div className={styles.buttons}>
        {/* * 활동력 0일 때만 충전 버튼 (SPEC 12장: 그 외에는 숨김). 컨트랙트도 0일 때만 허용한다 (StillHasEnergy).
              시안 10: 두 칸을 다 차지하는 호박색 버튼이 맨 위에 온다 */}
        {empty && (
          <ActionButton
            className={styles.refill}
            waiting={busy && pressed !== "refill"}
            icon={<BoltIcon size={24} />}
            label="Free Energy refill +10"
            hint="Out of Energy"
            disabled={busy}
            phase={pressed === "refill" ? action.phase : "idle"}
            hash={pressed === "refill" ? hash : undefined}
            onClick={() => run({ fn: "refill" })}
          />
        )}
        <ActionButton
          className={empty ? styles.feedSmall : styles.feed}
          waiting={busy && pressed !== "feed" && canFeed}
          icon={<BowlIcon size={24} />}
          label="Feed"
          // 시안: 번개 아이콘 + "1 · +10 XP" (번개 = 활동력). 모자라면 "활동력 1 필요" (시안 10)
          hint={canFeed ? `${FEED_COST} · +${FEED_XP} XP` : `Needs ${FEED_COST} Energy`}
          showBolt={canFeed}
          disabled={busy || !canFeed}
          phase={pressed === "feed" ? action.phase : "idle"}
          hash={pressed === "feed" ? hash : undefined}
          onClick={() => run({ fn: "feed", petId })}
        />
        <ActionButton
          className={empty ? styles.trainSmall : styles.train}
          waiting={busy && pressed !== "train" && canTrain}
          lightSpinner
          icon={<DumbbellIcon size={24} />}
          label="Train"
          // 배고프면 XP 절반 (PetNFT.train: isHungry ? TRAIN_XP / 2 : TRAIN_XP)
          hint={
            !canTrain
              ? `Needs ${TRAIN_COST} Energy`
              : `${TRAIN_COST} · ${pet.hungry ? `+${TRAIN_XP / 2} XP (hungry)` : `+${TRAIN_XP} XP`}`
          }
          showBolt={canTrain}
          disabled={busy || !canTrain}
          phase={pressed === "train" ? action.phase : "idle"}
          hash={pressed === "train" ? hash : undefined}
          onClick={() => run({ fn: "train", petId })}
        />
      </div>
    </section>
  );
}

// 누른 버튼의 글자 (시안 06: 확정 중에는 스피너 + "확정 중…")
const PHASE_LABEL: Record<Exclude<ActionPhase, "idle">, string> = {
  simulating: "Checking…",
  signing: "Confirm in wallet",
  confirming: "Confirming…",
};

function ActionButton(props: {
  className: string;
  /** 다른 행동이 진행 중이라 잠깐 막힌 버튼 → "Please wait" (활동력이 모자라서 막힌 것과 구분) */
  waiting: boolean;
  /** 파란 버튼(흰 글자) 위 스피너는 흰색 */
  lightSpinner?: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  showBolt?: boolean;
  disabled: boolean;
  phase: ActionPhase;
  hash?: string;
  onClick: () => void;
}) {
  const {
    className,
    waiting,
    lightSpinner,
    icon,
    label,
    hint,
    showBolt = true,
    disabled,
    phase,
    hash,
    onClick,
  } = props;
  const active = phase !== "idle";
  const link = hash ? txUrl(hash) : undefined;

  return (
    // * 버튼 안에 <a>를 넣으면 HTML 규칙 위반이다 (누를 수 있는 것 안에 누를 수 있는 것).
    //   그래서 감싼 div 위에 링크를 겹쳐 띄운다 (.txLink, position: absolute).
    <div className={styles.slot}>
      <button
        className={`${className} ${active ? styles.pressed : ""} ${waiting ? styles.waiting : ""}`}
        // * 누른 버튼·기다리는 버튼은 disabled 대신 aria-disabled로 막는다.
        //   disabled면 회색(활동력 부족 모양)이 되는데, 시안 06은 원래 색 그대로 두고 흐리게만 한다.
        disabled={disabled && !active && !waiting}
        aria-disabled={active || waiting || undefined}
        onClick={active || waiting ? undefined : onClick}
        // * aria-busy: 이 버튼이 처리 중이라는 걸 보조기기에 알린다
        aria-busy={active}
      >
        <span className={styles.label}>
          {active ? <Spinner size={20} light={lightSpinner} /> : icon}
          {active ? PHASE_LABEL[phase as Exclude<ActionPhase, "idle">] : label}
        </span>
        {/* 비활성 버튼(다른 행동이 진행 중)은 "Please wait" (시안 06) */}
        {!active && (
          <span className={styles.hint}>
            {waiting ? (
              "Please wait"
            ) : (
              <>
                {showBolt && <BoltIcon size={12} />}
                {hint}
              </>
            )}
          </span>
        )}
        {/* 링크가 겹쳐 뜰 자리 (아랫줄 높이만 차지하는 빈 줄) */}
        {active && link && (
          <span className={styles.hint} aria-hidden>
            &nbsp;
          </span>
        )}
        {/* 확정 중 + 탐색기 없음(anvil): 해시만 글자로 */}
        {active && hash && !link && <span className={styles.hash}>{shortHash(hash)}</span>}
      </button>
      {active && link && (
        <a
          className={styles.txLink}
          href={link}
          target="_blank"
          rel="noreferrer"
          aria-label="View transaction on Basescan"
        >
          {shortHash(hash!)} ›
        </a>
      )}
    </div>
  );
}
