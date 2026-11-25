// * 컨트랙트 읽기 여러 개를 한 번에 (multicall). multicall3가 없는 체인(anvil)에서는 하나씩 읽는다.
//   ? 왜 필요할까? viem의 client.multicall은 체인 정보에 multicall3 주소가 없으면 바로 에러를 낸다.
//     wagmi 훅(useReadContracts)은 알아서 따로 읽기로 바꿔 주지만(4강에서 확인), viem을 직접 쓰는 곳(서버, useMyPets)은 아니다.
//     Base Sepolia/Base는 multicall3가 있어서 한 번의 요청으로 읽고, anvil에서만 요청이 여러 번 나간다.
//   ! 따로 읽으면 "같은 블록 기준"이 보장되지 않는다. 로컬 개발에서만 생기는 차이라 받아들인다.
import type { ContractFunctionParameters, MulticallReturnType, PublicClient } from "viem";

export async function readMany<const T extends readonly ContractFunctionParameters[]>(
  client: PublicClient,
  contracts: T,
): Promise<MulticallReturnType<T, false>> {
  if (client.chain?.contracts?.multicall3) {
    // viem의 multicall 제네릭이 "제네릭 T 그대로"는 받지 못해서(타입 좁히기 한계) 한 번 넓혀서 넘긴다. 반환 타입은 위 선언이 보장한다.
    const out = await client.multicall({
      contracts: contracts as readonly ContractFunctionParameters[],
      allowFailure: false,
    });
    return out as MulticallReturnType<T, false>;
  }
  // Promise.all: 전부 동시에 요청하고, 하나라도 실패하면 throw (allowFailure: false와 같은 동작)
  const results = await Promise.all(contracts.map((c) => client.readContract(c)));
  return results as MulticallReturnType<T, false>;
}
