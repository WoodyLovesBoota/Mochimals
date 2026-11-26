// * 행동(usePetAction)이 실패했을 때 던져진 에러를 화면 문구로 바꾼다 (4강, SPEC 9장 에러 표).
//   순수 함수라서 React, wagmi 없이 단위 테스트할 수 있다 (errors.test.ts).
//   ! 이 파일은 contracts.ts를 import하지 않는다. contracts.ts는 env 주소가 없으면 throw하므로
//     테스트에서 import하면 터진다. 에러 이름만 보면 되니 ABI도 필요 없다.
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

// * 커스텀 에러 이름 → 화면 문구. 이름은 Solidity의 `error NotPetOwner();` 그대로다.
//   ERC20InsufficientBalance는 PetNFT가 아니라 Energy(OZ ERC20)의 에러다.
//   contracts.ts 39줄에서 Energy 에러를 PetNFT ABI에 합쳐 둔 덕분에 viem이 이 이름을 읽는다.
const MESSAGES: Record<string, string> = {
  ERC20InsufficientBalance: "활동력이 부족해요. 충전하고 다시 해보세요",
  StillHasEnergy: "활동력을 다 쓴 뒤에 충전할 수 있어요",
  AlreadyAdopted: "이미 입양한 지갑이에요",
  NotPetOwner: "이 펫의 주인만 돌볼 수 있어요",
};

// TX_REVERTED(블록에 들어갔지만 실패)와 그 밖의 모든 에러
const FALLBACK = "처리하지 못했어요. 다시 시도해주세요";

/**
 * @returns 화면에 보여줄 문구. 사용자가 지갑에서 "거절"했으면 null (문구 없이 버튼만 되돌린다).
 */
export function toErrorMessage(error: unknown): string | null {
  // * viem 에러는 BaseError를 상속하고, 원인 에러를 cause로 겹겹이 감싼다.
  //   예: ContractFunctionExecutionError → (cause) ContractFunctionRevertedError
  //   그래서 바깥 에러의 message만 보면 "Execution reverted..." 같은 영어 덩어리뿐이고,
  //   walk로 cause 사슬을 따라 내려가며 원하는 종류를 찾는다.
  if (error instanceof BaseError) {
    // ① 지갑에서 거절 (EIP-1193 에러 코드 4001). 사용자가 일부러 한 거라 문구를 안 띄운다.
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return null;

    // ② 컨트랙트 revert: 시뮬레이션 단계(usePetAction ①)에서 잡힌다.
    //   walk(조건)은 조건에 맞는 첫 에러를 돌려주고, 없으면 null이다.
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      // ? data.errorName은 언제 비어 있을까? ABI에 없는 에러라 디코딩을 못 했을 때다.
      //   contracts.ts에서 Energy 에러를 합치지 않았다면 ERC20InsufficientBalance가 여기서 undefined가 된다.
      const name = reverted.data?.errorName;
      if (name && name in MESSAGES) return MESSAGES[name];
    }
  }
  // ③ 나머지: usePetAction의 throw new Error("TX_REVERTED"), 네트워크 끊김, RPC 에러 등
  return FALLBACK;
}

/**
 * * 없는 펫 번호인지: ownerOf가 OZ의 ERC721NonexistentToken으로 revert했는지 본다 (위 toErrorMessage와 같은 walk 방식).
 *   펫 화면이 404를 띄울지, usePet이 다시 시도하지 않을지 판단하는 데 쓴다.
 */
export function isNonexistentToken(error: unknown): boolean {
  if (!(error instanceof BaseError)) return false;
  const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
  return reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName === "ERC721NonexistentToken";
}
