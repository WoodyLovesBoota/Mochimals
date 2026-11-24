// * 펫 한 마리의 상태 + 지금 연결된 지갑의 활동력을 "한 번에" 읽는 훅 (4강, SPEC 8장).
//   내 펫 화면(/pet/[id])이 이 훅 하나로 그린다.
"use client";

import { zeroAddress, type Address } from "viem";
import { useReadContracts } from "wagmi";
import { energy, petNft } from "@/lib/contracts";

// * 화면에서 쓰기 좋은 모양으로 정리한 결과 타입.
//   컨트랙트에서 uint64/uint256은 bigint로, uint8/uint32는 number로 온다 (viem 규칙: 48비트 이하만 number).
export type PetState = {
  xp: bigint;
  lastFedAt: bigint; // 유닉스 초
  bornAt: bigint; // 유닉스 초
  dna: number; // uint32 → number
  level: bigint; // levelOf (uint256)
  stage: number; // stageOf (uint8) → number
  hungry: boolean;
  owner: Address; // ownerOf
  energy: bigint; // 인자로 받은 viewer 주소의 활동력 (Energy.balanceOf)
};

/**
 * @param petId  볼 펫 번호 (URL의 [id]를 BigInt로 바꿔 넘긴다)
 * @param viewer 지금 연결된 지갑 주소. 없으면(미연결) 활동력은 0으로 읽힌다
 */
export function usePet(petId: bigint, viewer?: Address) {
  return useReadContracts({
    // * contracts 배열 하나 = multicall 한 번 = RPC 요청 한 번.
    //   ! 여섯 값이 "같은 블록" 기준으로 읽힌다. 따로 6번 읽으면 중간에 블록이 바뀌어서
    //     xp는 새 값인데 level은 옛 값인 화면이 잠깐 나올 수 있다 (XP 바는 다 찼는데 레벨이 그대로).
    //   ! 단, anvil(foundry 체인)에서는 multicall이 안 된다. viem의 foundry 체인에 multicall3 주소가 없어서다.
    //     그러면 wagmi(readContracts)가 에러를 잡고 6번 "따로 읽기"로 몰래 바꾼다. 화면은 동작하지만 같은 블록 보장은 없다.
    //     anvil은 트랜잭션이 없으면 블록이 안 바뀌어서 실제로 어긋날 일은 거의 없다. Base / Base Sepolia에는 multicall3가 있다.
    contracts: [
      // pets(id): public mapping의 자동 getter. struct를 튜플로 준다 → [xp, lastFedAt, bornAt, dna]
      { ...petNft, functionName: "pets", args: [petId] },
      { ...petNft, functionName: "levelOf", args: [petId] },
      { ...petNft, functionName: "stageOf", args: [petId] },
      { ...petNft, functionName: "isHungry", args: [petId] },
      { ...petNft, functionName: "ownerOf", args: [petId] },
      // ? viewer가 없으면 왜 zeroAddress를 넣을까? contracts 배열의 길이와 순서가 늘 같아야
      //   아래 select에서 "5번 = 활동력"이라고 자리로 꺼낼 수 있기 때문이다. 0 주소의 잔액은 항상 0이다.
      { ...energy, functionName: "balanceOf", args: [viewer ?? zeroAddress] },
    ],
    // ! allowFailure: false → 하나라도 실패하면 전체가 error가 된다.
    //   없는 펫 번호면 ownerOf가 revert(ERC721NonexistentToken)하므로 화면은 "없는 펫"을 error로 받는다.
    //   true(기본값)면 결과가 { status, result } 객체로 와서 매번 꺼내야 하고, 반쯤 비어 있는 펫이 그려질 수 있다.
    allowFailure: false,
    query: {
      // * 10초 동안은 캐시를 "신선하다"고 보고 다시 요청하지 않는다 (같은 화면을 오가도 RPC를 아낀다).
      //   행동 후에는 usePetAction이 invalidate로 이 캐시를 강제로 버린다 (다음 수업).
      staleTime: 10_000,
      // * select: 받은 튜플을 화면용 객체로 바꾼다. 결과 타입이 PetState가 된다.
      //   allowFailure: false라서 각 칸은 { status, result }가 아니라 결과값 그 자체다.
      select: ([pet, level, stage, hungry, owner, balance]): PetState => {
        const [xp, lastFedAt, bornAt, dna] = pet;
        return { xp, lastFedAt, bornAt, dna, level, stage, hungry, owner, energy: balance };
      },
    },
  });
}
