// * 잘못된 네트워크 (리디자인 시안 13 / D13). 지갑이 앱과 다른 체인에 붙어 있으면 어느 화면에서든 뜬다 (layout에 한 번).
//   "Base로 전환" → wagmi useSwitchChain → 지갑이 전환 확인 창을 띄운다.
//   닫으면(Esc·바깥·X) 그 체인에 있는 동안은 다시 안 띄운다. 헤더의 빨간 "네트워크 확인" 버튼과 행동 버튼 자리의 전환 버튼은 계속 남는다.
"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { chain } from "@/lib/chain";
import { ChainIcon, ChevronRightIcon } from "./icons";
import { Sheet } from "./Sheet";
import { Spinner } from "./Spinner";
import styles from "./WrongNetworkSheet.module.scss";

// config에 없는 체인이라 wagmi가 이름을 모를 때 쓸 흔한 체인 이름 (시안 13 "Ethereum")
const KNOWN_CHAINS: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  137: "Polygon",
  42161: "Arbitrum",
  8453: "Base",
  84532: "Base Sepolia",
};

export function WrongNetworkSheet() {
  // * chainId: 지갑이 지금 붙어 있는 체인 번호. account.chain: 그 체인이 config에 있으면 정보, 없으면 undefined
  const { isConnected, chainId, chain: walletChain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  // 사용자가 닫은 체인 번호. 체인이 바뀌면(다른 잘못된 체인 포함) 다시 띄운다
  const [dismissedFor, setDismissedFor] = useState<number>();

  const wrong = isConnected && chainId !== undefined && chainId !== chain.id;
  const open = wrong && dismissedFor !== chainId;

  return (
    <Sheet
      open={open}
      onClose={() => setDismissedFor(chainId)}
      title="네트워크를 바꿔 주세요"
      icon={
        <span className={styles.icon} aria-hidden>
          <ChainIcon size={34} />
        </span>
      }
    >
      <p className={styles.desc}>
        지금 지갑이 다른 체인에 있어요. {chain.name}로 바꿔야 밥 주기 · 훈련을 할 수 있어요.
      </p>
      {/* 지금 체인 → 바꿀 체인 */}
      <div className={styles.chains}>
        <span className={styles.from}>
          <span className={styles.dotRed} aria-hidden />
          {/* config에 없는 체인이면 wagmi가 이름을 모른다 → 흔한 체인 표, 그래도 없으면 번호로 */}
          {walletChain?.name ?? (chainId !== undefined ? KNOWN_CHAINS[chainId] : undefined) ?? `체인 ${chainId}`}
        </span>
        <ChevronRightIcon size={20} />
        <span className={styles.to}>
          <span className={styles.dotBase} aria-hidden />
          {chain.name}
        </span>
      </div>
      <button
        type="button"
        className={styles.switch}
        disabled={isPending}
        onClick={() => switchChain({ chainId: chain.id })}
      >
        {chain.name}로 전환
      </button>
      <p className={styles.hint}>
        {isPending && <Spinner size={14} />}
        {isPending ? "지갑에서 확인해 주세요" : "누르면 지갑에서 확인해요"}
      </p>
    </Sheet>
  );
}
