// * 내 펫 목록 찾기 (5강, SPEC 8장 "내 펫 찾기").
//   펫은 NFT라 사고팔 수 있다. 그래서 "입양한 펫 1마리"가 아니라 "지금 내가 가진 펫 0마리 이상"으로 다룬다.
//   방법: ① 나에게 들어온 Transfer 로그를 전부 모은다 (입양 = 0x0 → 나, 선물 받음 = 남 → 나)
//         ② 그 펫들의 지금 주인(ownerOf)을 읽어 아직 내 것인 것만 남긴다 (보냈거나 판 펫은 빠진다)
//   ? 왜 컨트랙트에 "주소별 펫 목록"을 안 두었을까? ERC721Enumerable을 쓰면 되지만 전송마다 가스가 크게 늘어난다.
//     읽기는 공짜이니 로그로 찾고, 쓰기를 싸게 두는 쪽을 골랐다 (SPEC 14장: 인덱서도 쓰지 않는다).
"use client";

import { useQuery } from "@tanstack/react-query";
import { isAddressEqual, parseAbiItem, type Address, type PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { DEPLOY_BLOCK, petNft } from "@/lib/contracts";
import { readMany } from "@/lib/readMany";

// ERC-721 표준 Transfer 이벤트. 세 값이 모두 indexed라 "to = 나"로 노드에서 바로 걸러 받을 수 있다.
const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)");

/** 내가 지금 가진 펫 번호들 (오름차순). 연결 안 됐으면 쿼리가 꺼진다. */
export function useMyPets(me: Address | undefined) {
  const client = usePublicClient();
  return useQuery({
    // * 쿼리 키에 주소를 넣는다: 지갑을 바꾸면 키가 달라져 새로 읽는다.
    //   usePetAction이 행동 뒤 invalidateQueries()로 "전부" 버리므로 입양 뒤에도 자동으로 다시 읽는다.
    queryKey: ["myPets", petNft.address, me],
    enabled: !!me && !!client,
    queryFn: async () => findMyPets(client!, me!),
    staleTime: 10_000,
  });
}

async function findMyPets(client: PublicClient, me: Address): Promise<bigint[]> {
  // ① 나에게 들어온 Transfer 로그. 배포 블록부터 지금까지.
  const latest = await client.getBlockNumber();
  const received = await receivedIds(client, me, DEPLOY_BLOCK, latest);
  // 같은 펫을 받았다 보냈다 다시 받으면 로그가 여러 개라 Set으로 중복 제거
  const ids = [...new Set(received)];
  if (ids.length === 0) return [];

  // ② 지금 주인이 나인 것만
  const owners = await readMany(
    client,
    ids.map((id) => ({ ...petNft, functionName: "ownerOf", args: [id] }) as const),
  );
  return ids.filter((_, i) => isAddressEqual(owners[i] as Address, me)).sort((a, b) => (a < b ? -1 : 1));
}

/**
 * 나에게 들어온 Transfer 로그의 tokenId들.
 * getLogs를 부르되, RPC가 "범위가 너무 넓다"며 거절하면 범위를 반으로 나눠 다시 부른다 (SPEC 8장).
 * ? 왜 처음부터 잘게 나누지 않을까? anvil이나 넓은 범위를 허용하는 RPC에서는 한 번에 끝나는 게 가장 빠르다.
 *   거절당했을 때만 나누면 어떤 RPC든 맞춰 간다. 공급자마다 한도(블록 수, 결과 개수)가 달라서 숫자를 정해 두기 어렵다.
 */
// * 반환 타입을 적어 둔다: 자기 자신을 부르는(재귀) 함수는 TS가 반환 타입을 추론하지 못한다.
async function receivedIds(client: PublicClient, me: Address, from: bigint, to: bigint): Promise<bigint[]> {
  try {
    const logs = await client.getLogs({
      address: petNft.address,
      event: TRANSFER,
      args: { to: me },
      fromBlock: from,
      toBlock: to,
    });
    // tokenId는 indexed라 항상 있다. 타입상 optional이라 !로 알려준다
    return logs.map((l) => l.args.tokenId!);
  } catch (error) {
    // 한 블록짜리도 실패하면 범위 문제가 아니다. 그대로 throw
    if (from >= to) throw error;
    const mid = (from + to) / 2n; // bigint 나눗셈은 소수점을 버린다
    const left = await receivedIds(client, me, from, mid);
    const right = await receivedIds(client, me, mid + 1n, to);
    return [...left, ...right];
  }
}
