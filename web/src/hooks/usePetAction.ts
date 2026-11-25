// * 모든 쓰기 행동(입양, 밥, 훈련, 충전)이 지나가는 단 하나의 훅 (4강, SPEC 9장).
//   흐름: ① 시뮬레이션 → ② 지갑 서명 → ③ 블록 확정 대기 → ④ 이벤트 해석 → ⑤ 캐시 무효화(다시 읽기) → ⑥ onDone
//   + 새로고침 대응: 서명 직후 해시를 sessionStorage에 적어 두고, 페이지가 다시 열리면 ③부터 이어서 기다린다.
"use client";

import { useAddRecentTransaction } from "@rainbow-me/rainbowkit";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { isAddressEqual, parseEventLogs, type Hash } from "viem";
import { useConfig, useWriteContract, type Config } from "wagmi";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import { petNft } from "@/lib/contracts";
import { clearPending, readPending, savePending } from "@/lib/pendingTx";

// * 버튼에 보여줄 단계 (SPEC 12장 버튼 상태 표).
//   idle: 대기 / simulating: "확인 중" / signing: "지갑에서 확인" / confirming: "처리 중"
export type ActionPhase = "idle" | "simulating" | "signing" | "confirming";

// * 행동 종류. feed/train만 petId가 필요하다 (TS 판별 유니온: fn 값으로 타입이 갈린다).
export type PetActionArgs = { fn: "feed" | "train"; petId: bigint } | { fn: "refill" } | { fn: "adopt" };

// 행동 결과: 해시와 PetNFT 이벤트들 (④)
export type PetActionResult = { hash: Hash; events: ReturnType<typeof parseEvents> };

type Options = {
  /**
   * 행동이 끝나고(⑤ 다시 읽기까지 끝난 뒤) 부른다. 연출, 페이지 이동 등.
   * 새로고침 뒤 이어서 기다린 행동(resume)도 끝나면 똑같이 부른다. 그래서 mutate의 호출별 onSuccess가 아니라 여기에 둔다.
   */
  onDone?: (result: PetActionResult, args: PetActionArgs) => void;
  /**
   * 새로고침 뒤 이어서 기다릴 행동인지 고른다. 이 화면과 상관있는 행동만 이어받는다.
   * 예: 1번 펫 화면은 "1번 펫의 밥/훈련 또는 충전"만. 홈은 "입양"만. 안 주면 이어받지 않는다.
   */
  resumeIf?: (args: PetActionArgs) => boolean;
};

// 이어서 기다릴 때 최대 시간. 그 사이 확정이 안 되면(체인 재시작 등으로 해시가 사라짐) 포기하고 기록을 지운다.
const RESUME_TIMEOUT_MS = 120_000;

export function usePetAction({ onDone, resumeIf }: Options = {}) {
  // useConfig: providers.tsx의 WagmiProvider에 넣은 config. wagmi/actions 함수(훅이 아닌 것)에 넘긴다.
  const config = useConfig();
  const queryClient = useQueryClient();
  // writeContractAsync: 지갑에 서명을 요청하고, 사용자가 승인하면 트랜잭션 해시를 돌려준다.
  const { writeContractAsync } = useWriteContract();
  // * RainbowKit "최근 트랜잭션": 헤더 계정 버튼에 스피너, 계정 창에 목록이 뜬다. RainbowKit이 localStorage에 둬서
  //   새로고침해도 남는다. 표시만 해 준다 (우리 버튼 잠금이나 연출은 아래 sessionStorage 쪽이 맡는다).
  const addRecentTransaction = useAddRecentTransaction();

  // ? 왜 useMutation의 isPending만으로는 부족할까?
  //   isPending은 "진행 중 / 아님" 두 가지뿐이다. 버튼은 "지갑에서 확인"과 "처리 중"을 구분해야 하므로 단계를 따로 둔다.
  const [phase, setPhase] = useState<ActionPhase>("idle");
  // 확정 대기 중에 오래 걸리면 Basescan 링크를 보여주기 위해 해시를 기억한다.
  const [hash, setHash] = useState<Hash>();
  // 새로고침 뒤 이어받은 행동. useMutation 밖에서 기다리므로 variables 대신 이걸로 "누른 버튼"을 알린다.
  const [resumed, setResumed] = useState<PetActionArgs>();

  // * onDone을 ref로 들고 있는다. 부모가 매 렌더 새 함수를 넘겨도, 오래 걸리는 비동기 흐름 끝에서는 "가장 최신" 함수를 부른다.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const mutation = useMutation({
    mutationFn: async (args: PetActionArgs): Promise<PetActionResult> => {
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
      // * 서명 직후 기록: 지금 새로고침하면 트랜잭션은 계속 처리되지만 이 함수의 상태(phase, hash)는 사라진다.
      //   해시를 남겨 두면 다시 열린 페이지가 ③부터 이어서 기다린다 (아래 resume).
      savePending({ hash: txHash, args });
      addRecentTransaction({ hash: txHash, description: DESCRIPTION[args.fn] });

      // ③ 확정 대기 ~ ⑤ 다시 읽기: 이어서 기다리기와 같은 코드라 함수로 뺐다
      setPhase("confirming");
      return await confirm(config, queryClient, txHash);
    },
    // ⑥ 끝: 연출, 페이지 이동 (부모가 준 onDone)
    onSuccess: (result, args) => onDoneRef.current?.(result, args),
    // 성공이든 실패든 끝나면 버튼을 원래대로. 기록도 지운다 (실패한 트랜잭션을 이어서 기다릴 필요는 없다)
    onSettled: () => {
      setPhase("idle");
      clearPending();
    },
  });

  // * 이어서 기다리기 (새로고침 대응). 페이지가 열릴 때 한 번, 기록이 있고 이 화면과 상관있으면 ③부터 다시 기다린다.
  //   ! 버튼 잠금이 핵심이다: 이게 없으면 새로고침 뒤 활동력이 아직 0으로 보여서 충전을 또 누르고,
  //     두 번째 충전은 StillHasEnergy로 revert해 가스비만 날린다 (PROGRESS.md 4강 TODO 배경).
  const resumeIfRef = useRef(resumeIf);
  // ! 개발 모드의 React StrictMode는 effect를 일부러 두 번 실행한다 (마운트 → 정리 → 마운트).
  //   막지 않으면 같은 해시를 두 번 기다리고 onDone(연출)도 두 번 불린다. 한 번만 이어받게 표시해 둔다.
  const resumingRef = useRef(false);
  const resume = useCallback(async () => {
    if (resumingRef.current) return;
    const pending = readPending();
    if (!pending || !resumeIfRef.current?.(pending.args)) return;
    resumingRef.current = true;
    setResumed(pending.args);
    setHash(pending.hash);
    setPhase("confirming");
    try {
      const result = await confirm(config, queryClient, pending.hash, RESUME_TIMEOUT_MS);
      onDoneRef.current?.(result, pending.args);
    } catch {
      // 실패(revert)나 시간 초과: 연출 없이 조용히 끝낸다. 화면 값은 다시 읽어서 실제 상태로 맞춘다.
      void queryClient.invalidateQueries();
    } finally {
      clearPending();
      setPhase("idle");
      setResumed(undefined);
      resumingRef.current = false;
    }
  }, [config, queryClient]);
  useEffect(() => {
    // sessionStorage는 브라우저에만 있어서 effect 안(클라이언트에서 마운트된 뒤)에서 읽는다.
    // 비동기 함수라서 setState가 effect 본문에서 바로 일어나지 않는다 (렌더 중 연쇄 갱신 아님).
    void resume();
  }, [resume]);

  // * 지금 진행 중인 행동의 인자 (어떤 버튼이 눌렸는지). 이어받은 행동이면 그것, 아니면 mutate 인자.
  const busy = phase !== "idle";
  const pendingArgs = busy ? (resumed ?? mutation.variables) : undefined;

  return { ...mutation, phase, hash, pendingArgs };
}

/**
 * ③ 확정 대기 → ④ 이벤트 해석 → ⑤ 캐시 무효화. 일반 흐름과 이어서 기다리기가 같이 쓴다.
 * @param timeout 이어서 기다릴 때만 준다. 일반 흐름은 방금 보낸 트랜잭션이라 시간 제한 없이 기다린다.
 */
async function confirm(
  config: Config,
  queryClient: ReturnType<typeof useQueryClient>,
  txHash: Hash,
  timeout?: number,
): Promise<PetActionResult> {
  // ③ 확정 대기: 트랜잭션이 블록에 들어갈 때까지 기다린다 (wagmi.ts의 pollingInterval 1초마다 확인).
  const receipt = await waitForTransactionReceipt(config, { hash: txHash, timeout });
  // ! 블록에 들어갔어도 실행은 실패(reverted)일 수 있다. viem은 이때 throw하지 않으므로 직접 throw한다.
  //   (시뮬레이션 이후 그 사이에 상태가 바뀐 경우. 예: 다른 탭에서 먼저 충전함)
  if (receipt.status === "reverted") throw new Error("TX_REVERTED");

  const events = parseEvents(receipt.logs);

  // ⑤ 성공하면 wagmi 읽기 캐시를 전부 버린다 → usePet, 헤더 EnergyBadge가 자동으로 다시 읽는다.
  //   * await: 다시 읽기가 끝난 뒤에 onDone(연출)을 부른다. 그래서 연출이 시작될 때 화면 수치는 이미 새 값이다.
  //   ? 왜 특정 키만이 아니라 전부일까? 행동 하나가 펫(XP, 레벨)과 잔액(활동력) 둘 다 바꾸고,
  //     wagmi의 쿼리 키는 길고 복잡하다. 이 게임 규모에서는 전부 버려도 요청이 몇 개 안 된다.
  await queryClient.invalidateQueries();
  return { hash: txHash, events };
}

/**
 * ④ 이벤트 해석: 영수증의 로그(raw 바이트)를 ABI로 읽어 { eventName, args } 객체로 만든다.
 * ! 우리 PetNFT 주소에서 나온 로그만 거른다. 한 트랜잭션에 Energy의 Transfer 로그도 섞여 있고,
 *   이벤트 이름이 같은 다른 컨트랙트 로그를 우리 것으로 착각하면 안 되기 때문이다.
 *   주소 비교는 대소문자(체크섬) 차이가 있을 수 있어서 === 대신 isAddressEqual을 쓴다.
 */
function parseEvents(logs: Parameters<typeof parseEventLogs>[0]["logs"]) {
  return parseEventLogs({
    abi: petNft.abi,
    logs: logs.filter((l) => l.address && isAddressEqual(l.address, petNft.address)),
  });
}

// RainbowKit 최근 트랜잭션 목록에 보일 설명
const DESCRIPTION: Record<PetActionArgs["fn"], string> = {
  adopt: "펫 입양",
  feed: "밥 주기",
  train: "훈련",
  refill: "활동력 충전",
};
