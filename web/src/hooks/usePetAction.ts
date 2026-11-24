// * 모든 쓰기 행동(입양, 밥, 훈련, 충전)이 지나가는 단 하나의 훅 (4강, SPEC 9장).
//   흐름: ① 시뮬레이션 → ② 지갑 서명 → ③ 블록 확정 대기 → ④ 이벤트 해석 → ⑤ 캐시 무효화(다시 읽기)
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { isAddressEqual, parseEventLogs, type Hash } from "viem";
import { useConfig, useWriteContract } from "wagmi";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import { petNft } from "@/lib/contracts";

// * 버튼에 보여줄 단계 (SPEC 12장 버튼 상태 표).
//   idle: 대기 / simulating: "확인 중" / signing: "지갑에서 확인" / confirming: "처리 중"
export type ActionPhase = "idle" | "simulating" | "signing" | "confirming";

// * 행동 종류. feed/train만 petId가 필요하다 (TS 판별 유니온: fn 값으로 타입이 갈린다).
export type PetActionArgs = { fn: "feed" | "train"; petId: bigint } | { fn: "refill" } | { fn: "adopt" };

export function usePetAction() {
  // useConfig: providers.tsx의 WagmiProvider에 넣은 config. wagmi/actions 함수(훅이 아닌 것)에 넘긴다.
  const config = useConfig();
  const queryClient = useQueryClient();
  // writeContractAsync: 지갑에 서명을 요청하고, 사용자가 승인하면 트랜잭션 해시를 돌려준다.
  const { writeContractAsync } = useWriteContract();

  // ? 왜 useMutation의 isPending만으로는 부족할까?
  //   isPending은 "진행 중 / 아님" 두 가지뿐이다. 버튼은 "지갑에서 확인"과 "처리 중"을 구분해야 하므로 단계를 따로 둔다.
  const [phase, setPhase] = useState<ActionPhase>("idle");
  // 확정 대기 중에 오래 걸리면 Basescan 링크를 보여주기 위해 해시를 기억한다.
  const [hash, setHash] = useState<Hash>();

  const mutation = useMutation({
    mutationFn: async (args: PetActionArgs) => {
      // ① 시뮬레이션: 서명 전에 RPC 노드에서 "실행해 보기"만 한다 (상태는 안 바뀜, 가스비 없음).
      //   ! 여기서 revert하면 커스텀 에러(NotPetOwner 등)로 throw되고, 지갑 창은 아예 뜨지 않는다.
      //     실패할 트랜잭션에 사용자가 서명하고 가스비만 날리는 일을 막는 핵심 단계다.
      setPhase("simulating");
      // * fn에 따라 인자 개수가 다르므로 두 갈래로 나눈다. 갈래 안에서 TS가 args.petId의 존재를 안다.
      //   account를 안 넘기면 wagmi가 지금 연결된 지갑 계정으로 시뮬레이션한다 (msg.sender = 내 주소).
      // ? 왜 ①②를 갈래마다 반복할까? `const { request } = 조건 ? 시뮬A : 시뮬B`로 합치면 request 타입이
      //   "feed/train용 | adopt/refill용" 유니온이 되고, writeContractAsync가 그 유니온을 받지 못해 타입 에러가 난다.
      //   갈래 안에서 바로 서명까지 하면 request 타입이 하나로 정해져서 통과한다.
      let txHash: Hash;
      if (args.fn === "feed" || args.fn === "train") {
        const { request } = await simulateContract(config, { ...petNft, functionName: args.fn, args: [args.petId] });
        // ② 서명: 시뮬레이션이 만들어 준 request(주소, ABI, 인자, 가스 추정치)를 그대로 지갑에 넘긴다.
        //   사용자가 "거절"하면 UserRejectedRequestError로 throw된다.
        setPhase("signing");
        txHash = await writeContractAsync(request);
      } else {
        const { request } = await simulateContract(config, { ...petNft, functionName: args.fn });
        setPhase("signing");
        txHash = await writeContractAsync(request);
      }
      setHash(txHash);

      // ③ 확정 대기: 트랜잭션이 블록에 들어갈 때까지 기다린다 (wagmi.ts의 pollingInterval 1초마다 확인).
      setPhase("confirming");
      const receipt = await waitForTransactionReceipt(config, { hash: txHash });
      // ! 블록에 들어갔어도 실행은 실패(reverted)일 수 있다. viem은 이때 throw하지 않으므로 직접 throw한다.
      //   (시뮬레이션 이후 그 사이에 상태가 바뀐 경우. 예: 다른 탭에서 먼저 충전함)
      if (receipt.status === "reverted") throw new Error("TX_REVERTED");

      // ④ 이벤트 해석: 영수증의 로그(raw 바이트)를 ABI로 읽어 { eventName, args } 객체로 만든다.
      //   ! 우리 PetNFT 주소에서 나온 로그만 거른다. 한 트랜잭션에 Energy의 Transfer 로그도 섞여 있고,
      //     이벤트 이름이 같은 다른 컨트랙트 로그를 우리 것으로 착각하면 안 되기 때문이다.
      //     주소 비교는 대소문자(체크섬) 차이가 있을 수 있어서 === 대신 isAddressEqual을 쓴다.
      const events = parseEventLogs({
        abi: petNft.abi,
        logs: receipt.logs.filter((l) => isAddressEqual(l.address, petNft.address)),
      });
      return { hash: txHash, events };
    },
    // ⑤ 성공하면 wagmi 읽기 캐시를 전부 버린다 → usePet, 헤더 EnergyBadge가 자동으로 다시 읽는다.
    //   * usePet의 staleTime(10초)이 남아 있어도 invalidate는 "지금 바로 낡음 처리 + 화면에 있으면 다시 요청"이다.
    //   ? 왜 특정 키만이 아니라 전부일까? 행동 하나가 펫(XP, 레벨)과 잔액(활동력) 둘 다 바꾸고,
    //     wagmi의 쿼리 키는 길고 복잡하다. 이 게임 규모에서는 전부 버려도 요청이 몇 개 안 된다.
    onSuccess: () => queryClient.invalidateQueries(),
    // 성공이든 실패든 끝나면 버튼을 원래대로
    onSettled: () => setPhase("idle"),
  });

  return { ...mutation, phase, hash };
}
