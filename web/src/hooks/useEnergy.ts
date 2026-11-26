// * 지금 연결된 지갑의 활동력(Energy 잔액). 헤더 알약, 내 펫 목록 안내, 계정 시트가 같이 쓴다.
"use client";

import { useAccount, useReadContract } from "wagmi";
import { energy } from "@/lib/contracts";

/** PetNFT.MAX_ENERGY = 10 (constant라 컨트랙트에서 읽지 않는다) */
export const MAX_ENERGY = 10;

/** @returns 잔액(bigint). 연결 안 됐거나 아직 못 읽었으면 undefined */
export function useEnergy(): bigint | undefined {
  // address: 연결된 계정 주소. 연결 안 됐으면 undefined
  const { address } = useAccount();

  // * useReadContract: 컨트랙트의 view 함수를 부른다 (가스비 없음, 지갑 서명 없음).
  //   ...energy 로 address와 abi를 펼치고, functionName과 args를 더한다.
  //   ABI가 `as const`라서 functionName에 "balanceOf" 말고 다른 글자를 쓰면 타입 에러가 난다.
  const { data } = useReadContract({
    ...energy,
    functionName: "balanceOf",
    // ? address가 없을 때 args에 무엇을 넣을까? wagmi는 args를 undefined로 두는 것을 허용한다.
    //   다만 그대로 두면 인자 없이 호출하려다 실패하므로, 아래 enabled: false로 "실제 호출"을 막는다.
    args: address ? [address] : undefined,
    // * query: TanStack Query 옵션. enabled가 false면 요청을 보내지 않는다.
    //   행동(feed/train/refill) 후에는 usePetAction이 캐시 전체를 invalidate해서 이 값도 다시 읽힌다.
    query: { enabled: !!address },
  });
  return address ? data : undefined;
}
