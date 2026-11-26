// * 내 펫 목록 찾기 (5강, SPEC 8장 "내 펫 찾기").
//   펫은 NFT라 사고팔 수 있다. 그래서 "입양한 펫 1마리"가 아니라 "지금 내가 가진 펫 0마리 이상"으로 다룬다.
//   방법: 1번부터 totalSupply까지 모든 펫의 ownerOf를 묶어 읽고, 주인이 나인 번호만 남긴다.
//         입양한 펫, 선물받은 펫이 들어오고, 보냈거나 판 펫은 빠진다.
//
//   ! SPEC 8장은 "나에게 들어온 Transfer 로그(getLogs) → ownerOf"였지만 Base Sepolia 배포에서 쓸 수 없었다 (2026-11-26).
//     RPC가 getLogs 한 번의 블록 범위를 막는다: Alchemy 무료 10블록, sepolia.base.org 200블록.
//     Base는 2초마다 블록이 생겨 배포 블록부터의 범위가 하루에 약 4만 블록씩 늘어난다.
//     → 범위를 나눠 조회하면 요청이 수천 개가 되고, 요청 한도에 걸려 "내 펫을 찾는 중…"에서 멈췄다.
//   * 그래서 "블록 수"가 아니라 "펫 수"에 비례하는 방식으로 바꿨다. multicall3가 있는 체인에서는 200마리당 요청 1번이다.
//     랭킹(lib/ranking.ts)도 같은 방식으로 전체를 읽는다.
//   ? 펫이 수만 마리가 되면? 그때는 인덱서(The Graph, Ponder 등)가 맞다. SPEC 14장에서 이번 범위는 인덱서를 쓰지 않는다.
//   ? 왜 컨트랙트에 "주소별 펫 목록"을 안 두었을까? ERC721Enumerable을 쓰면 되지만 전송마다 가스가 크게 늘어난다.
"use client";

import { useQuery } from "@tanstack/react-query";
import { isAddressEqual, type Address, type PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { petNft } from "@/lib/contracts";
import { readMany } from "@/lib/readMany";

// 한 번에 묶어 읽을 펫 수 (랭킹과 같은 200). 요청 하나가 너무 커지면 RPC가 거절하거나 느려진다.
const CHUNK = 200;

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
  // 펫 번호는 1부터 totalSupply까지 빈칸 없이 이어진다 (adopt의 petId = ++totalSupply, 소각 기능 없음)
  const total = await client.readContract({ ...petNft, functionName: "totalSupply" });
  const ids = Array.from({ length: Number(total) }, (_, i) => BigInt(i + 1));

  const mine: bigint[] = [];
  for (let start = 0; start < ids.length; start += CHUNK) {
    const chunk = ids.slice(start, start + CHUNK);
    const owners = await readMany(
      client,
      chunk.map((id) => ({ ...petNft, functionName: "ownerOf", args: [id] }) as const),
    );
    chunk.forEach((id, i) => {
      if (isAddressEqual(owners[i] as Address, me)) mine.push(id);
    });
  }
  return mine; // ids가 오름차순이라 결과도 오름차순
}
