// ! 지갑 연결 상태(useAccount)와 컨트랙트 읽기 훅을 쓰므로 클라이언트 컴포넌트다.
"use client";

import { useAccount, useReadContract } from "wagmi";
import { energy } from "@/lib/contracts";
import { BoltIcon } from "./icons";
import styles from "./EnergyBadge.module.scss";

// PetNFT.MAX_ENERGY = 10. "4/10"의 분모 (constant라 컨트랙트에서 읽지 않는다. PetPanel과 같은 이유)
const MAX_ENERGY = 10;

// * 활동력 알약. 연결된 지갑의 Energy 잔액(= 활동력)을 읽는다.
//   SPEC 12장: "모든 화면 헤더에 ConnectButton과 활동력 표시"
export function EnergyBadge() {
  // address: 연결된 계정 주소. 연결 안 됐으면 undefined
  const { address } = useAccount();

  // * useReadContract: 컨트랙트의 view 함수를 부른다 (가스비 없음, 지갑 서명 없음).
  //   ...energy 로 address와 abi를 펼치고, functionName과 args를 더한다.
  //   ABI가 `as const`라서 functionName에 "balanceOf" 말고 다른 글자를 쓰면 타입 에러가 난다.
  const { data: balance } = useReadContract({
    ...energy,
    functionName: "balanceOf",
    // ? address가 없을 때 args에 무엇을 넣을까? wagmi는 args를 undefined로 두는 것을 허용한다.
    //   다만 그대로 두면 인자 없이 호출하려다 실패하므로, 아래 enabled: false로 "실제 호출"을 막는다.
    args: address ? [address] : undefined,
    // * query: TanStack Query 옵션. enabled가 false면 요청을 보내지 않는다.
    //   행동(feed/train/refill) 후에는 usePetAction의 onSuccess가 캐시 전체를 invalidate해서 이 값도 다시 읽힌다.
    query: { enabled: !!address },
  });

  // 연결 안 됐거나 아직 못 읽었으면 아무것도 안 보여준다
  if (!address || balance === undefined) return null;

  return (
    // * 반환값은 bigint다 (uint256은 JS number 범위를 넘을 수 있어서). decimals가 0이라 그대로 글자로 바꾼다.
    //   aria-label: 화면 글자 "4/10"만으로는 스크린리더가 뜻을 모르니 문장으로 읽어 준다
    <span className={styles.badge} role="img" aria-label={`활동력 ${balance} / ${MAX_ENERGY}`}>
      {/* 호박색 동그라미 안의 번개 (시안: 28px 원, 아래 안쪽 그림자) */}
      <span className={styles.icon}>
        <BoltIcon size={16} />
      </span>
      {/* "활동력" 글자는 데스크톱에서만 (시안 D2 "활동력 4/10", 모바일 02는 "4/10") */}
      <span className={styles.label}>활동력</span>
      {balance.toString()}
      <span className={styles.max}>/{MAX_ENERGY}</span>
    </span>
  );
}
