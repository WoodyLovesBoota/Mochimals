// * toErrorMessage 단위 테스트. 실제 체인 없이, viem이 던지는 것과 같은 모양의 에러를 직접 만들어 넣는다.
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  TransactionExecutionError,
  UnauthorizedProviderError,
  UserRejectedRequestError,
} from "viem";
import { describe, expect, it } from "vitest";
import { energyAbi, petNftAbi } from "../generated";
import { toErrorMessage } from "./errors";

// contracts.ts의 petNft.abi와 같은 조합 (PetNFT ABI + Energy 에러). contracts.ts는 env가 필요해서 직접 만든다.
const energyErrors = energyAbi.filter((x) => x.type === "error");
const abi = [...petNftAbi, ...energyErrors];

// * simulateContract가 revert를 만났을 때 던지는 에러를 흉내 낸다.
//   바깥: ContractFunctionExecutionError, 안쪽(cause): ContractFunctionRevertedError(에러 데이터 포함)
function revertError(errorName: string, args?: readonly unknown[], useAbi: readonly unknown[] = abi) {
  // encodeErrorResult: 에러 이름과 인자를 revert 데이터(0x + 4바이트 selector + 인자)로 인코딩한다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = encodeErrorResult({ abi: abi as any, errorName, args } as any);
  const cause = new ContractFunctionRevertedError({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: useAbi as any,
    data,
    functionName: "train",
  });
  // * args: [1n]은 train(petId=1)이라는 뜻. 에러 메시지에 "train(1)"처럼 호출 모양을 찍을 때 쓴다 (없으면 viem이 터진다).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ContractFunctionExecutionError(cause, { abi: useAbi as any, functionName: "train", args: [1n] });
}

describe("toErrorMessage", () => {
  it("커스텀 에러 이름을 문구로 바꾼다", () => {
    expect(toErrorMessage(revertError("NotPetOwner"))).toBe("이 펫의 주인만 돌볼 수 있어요");
    expect(toErrorMessage(revertError("StillHasEnergy"))).toBe("활동력을 다 쓴 뒤에 충전할 수 있어요");
    expect(toErrorMessage(revertError("AlreadyAdopted"))).toBe("이미 입양한 지갑이에요");
  });

  it("Energy의 ERC20InsufficientBalance도 읽는다 (Energy 에러를 ABI에 합쳤기 때문)", () => {
    const err = revertError("ERC20InsufficientBalance", ["0x0000000000000000000000000000000000000001", 1n, 3n]);
    expect(toErrorMessage(err)).toBe("활동력이 부족해요. 충전하고 다시 해보세요");
  });

  // ? contracts.ts 39줄의 "Energy 에러 합치기"를 빼면 어떻게 되는지 보여주는 테스트
  it("ABI에 Energy 에러가 없으면 이름을 못 읽고 기본 문구가 된다", () => {
    const err = revertError(
      "ERC20InsufficientBalance",
      ["0x0000000000000000000000000000000000000001", 1n, 3n],
      petNftAbi, // ← Energy 에러를 안 합친 ABI로 해석
    );
    expect(toErrorMessage(err)).toBe("처리하지 못했어요. 다시 시도해주세요");
  });

  it("지갑에서 거절하면 null (문구 없이 버튼만 되돌림)", () => {
    expect(toErrorMessage(new UserRejectedRequestError(new Error("User rejected")))).toBeNull();
  });

  // * 2026-11-26 Base Sepolia에서 실제로 난 에러와 같은 사슬:
  //   ContractFunctionExecutionError → TransactionExecutionError → UnauthorizedProviderError (코드 4100)
  it("지갑 권한이 풀렸으면(4100) 다시 연결하라는 문구", () => {
    const inner = new TransactionExecutionError(new UnauthorizedProviderError(new Error("not authorized")), {
      account: "0x0000000000000000000000000000000000000001",
      chain: undefined,
    } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = new ContractFunctionExecutionError(inner, { abi: abi as any, functionName: "train", args: [1n] });
    expect(toErrorMessage(err)).toBe("지갑 연결이 풀렸어요. 다시 연결해 주세요");
  });

  it("TX_REVERTED와 알 수 없는 에러는 기본 문구", () => {
    expect(toErrorMessage(new Error("TX_REVERTED"))).toBe("처리하지 못했어요. 다시 시도해주세요");
    expect(toErrorMessage("이상한 값")).toBe("처리하지 못했어요. 다시 시도해주세요");
  });
});
