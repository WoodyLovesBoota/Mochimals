// * 내 펫 화면의 행동 버튼: 밥 주기, 훈련, 충전 (4강 6교시, SPEC 12장 "내 펫 화면 버튼 상태" 표).
//   쓰기는 전부 usePetAction 하나를 지난다. 이 파일은 "지금 어떤 버튼을 어떤 글자로, 눌러지게 할지"만 정한다.
//   ! 주인일 때만 그린다 (PetView가 isOwner로 거른다). 버튼 상태 판단에 쓰는 pet.energy는 "보는 사람 = 주인"의 잔액이다.
"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { usePetAction, type ActionPhase, type PetActionArgs } from "@/hooks/usePetAction";
import type { PetState } from "@/hooks/usePet";
import { chain } from "@/lib/chain";
import { toPetEffect, type PetEffect } from "@/lib/effects";
import { toErrorMessage } from "@/lib/errors";
import { txUrl } from "@/lib/links";
import { BoltIcon, BowlIcon, DumbbellIcon } from "./icons";
import styles from "./PetActions.module.scss";

// PetNFT 상수 (constant라 컨트랙트에서 읽지 않는다. PetPanel의 MAX_ENERGY와 같은 이유)
const FEED_COST = 1n;
const FEED_XP = 10;
const TRAIN_COST = 3n;
const TRAIN_XP = 40;

// * onEffect: 행동이 성공하면 연출 데이터를 위(PetView)로 올려 보낸다. 연출은 펫 카드에서 트므로 버튼이 직접 그리지 않는다.
type Props = {
  petId: bigint;
  pet: PetState;
  onEffect: (effect: PetEffect | null) => void;
};

export function PetActions({ petId, pet, onEffect }: Props) {
  const action = usePetAction({
    // * 행동이 끝나면(다시 읽기까지 끝난 뒤) 이벤트를 연출 데이터로 바꿔 위로 올린다.
    //   usePetAction의 confirm이 invalidateQueries를 await한 뒤라, 연출이 시작될 때 화면 수치는 이미 새 값이다.
    //   XP 바가 차오르는 것과 +숫자가 같은 순간에 시작한다. 새로고침 뒤 이어서 기다린 행동도 똑같이 연출된다.
    onDone: ({ events }) => onEffect(toPetEffect(events)),
    // 새로고침 뒤 이어받을 행동: 이 펫의 밥/훈련, 또는 충전 (충전은 지갑 단위라 어느 펫 화면에서든)
    resumeIf: (a) => a.fn === "refill" || ((a.fn === "feed" || a.fn === "train") && a.petId === petId),
  });
  const run = (args: PetActionArgs) => action.mutate(args);

  // * chainId: 지갑이 지금 붙어 있는 체인. 우리 앱의 체인(chain.ts)과 다르면 "잘못된 네트워크"다.
  const { chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const wrongNetwork = chainId !== chain.id;

  // * 진행 중인 행동. usePetAction의 pendingArgs = mutate에 넘긴 인자(또는 이어받은 행동) → 어떤 버튼을 눌렀는지 안다.
  //   SPEC 12장: "누른 버튼만 '지갑에서 확인'/'처리 중', 나머지 비활성"
  const busy = action.phase !== "idle";
  // pendingArgs: mutate 인자, 또는 새로고침 뒤 이어받은 행동 (usePetAction)
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
          <button
            className={styles.switch}
            disabled={switching}
            onClick={() => switchChain({ chainId: chain.id })}
          >
            {switching ? "지갑에서 확인" : `${chain.name}로 전환`}
          </button>
        </div>
      </section>
    );
  }

  // 에러 문구. 지갑 거절이면 null (errors.ts 30줄) → 아무것도 안 보인다.
  //   ? 다음 행동을 누르면 문구가 사라질까? useMutation은 mutate를 새로 부르면 error를 지우고 다시 시작한다.
  const errorText = action.error ? toErrorMessage(action.error) : null;

  // 확정 대기 중 블록 탐색기 링크 (anvil은 탐색기가 없어서 undefined → 링크 안 보임)
  const pendingTxUrl = action.phase === "confirming" && action.hash ? txUrl(action.hash) : undefined;

  return (
    <section className={styles.actions}>
      <div className={styles.buttons}>
        <ActionButton
          className={styles.feed}
          icon={<BowlIcon size={24} />}
          label="밥 주기"
          // 시안: 번개 아이콘 + "1 · +10 XP" (번개 = 활동력)
          hint={`${FEED_COST} · +${FEED_XP} XP`}
          disabled={busy || !canFeed}
          phase={pressed === "feed" ? action.phase : "idle"}
          onClick={() => run({ fn: "feed", petId })}
        />
        <ActionButton
          className={styles.train}
          icon={<DumbbellIcon size={24} />}
          label="훈련"
          // 배고프면 XP 절반 (PetNFT.train: isHungry ? TRAIN_XP / 2 : TRAIN_XP)
          hint={
            !canTrain
              ? `${TRAIN_COST} 필요`
              : `${TRAIN_COST} · ${pet.hungry ? `+${TRAIN_XP / 2} XP (배고픔)` : `+${TRAIN_XP} XP`}`
          }
          disabled={busy || !canTrain}
          phase={pressed === "train" ? action.phase : "idle"}
          onClick={() => run({ fn: "train", petId })}
        />
      </div>

      {/* 활동력 0일 때만 충전 버튼 (SPEC 12장: 그 외에는 숨김). 컨트랙트도 0일 때만 허용한다 (StillHasEnergy) */}
      {empty && (
        <ActionButton
          className={styles.refill}
          icon={<BoltIcon size={24} />}
          label="무료 충전 +10"
          hint="활동력을 다 썼어요"
          disabled={busy}
          phase={pressed === "refill" ? action.phase : "idle"}
          onClick={() => run({ fn: "refill" })}
        />
      )}

      {/* role="alert": 문구가 나타나면 스크린리더가 바로 읽는다 */}
      {errorText && (
        <p className={styles.error} role="alert">
          {errorText}
        </p>
      )}

      {pendingTxUrl && (
        <a className={styles.link} href={pendingTxUrl} target="_blank" rel="noreferrer">
          오래 걸리면 탐색기에서 확인하기 ›
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
  icon: React.ReactNode;
  label: string;
  hint: string;
  disabled: boolean;
  phase: ActionPhase;
  onClick: () => void;
}) {
  const { className, icon, label, hint, disabled, phase, onClick } = props;
  const active = phase !== "idle";
  return (
    // * aria-busy: 이 버튼이 처리 중이라는 걸 보조기기에 알린다
    <button className={className} disabled={disabled} onClick={onClick} aria-busy={active}>
      <span className={styles.label}>
        {phase === "confirming" ? <span className={styles.spinner} aria-hidden /> : icon}
        {active ? PHASE_LABEL[phase] : label}
      </span>
      {!active && (
        <span className={styles.hint}>
          <BoltIcon size={12} />
          {hint}
        </span>
      )}
    </button>
  );
}
