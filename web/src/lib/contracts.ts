// * 컨트랙트 "주소 + ABI" 묶음. 훅에서 `{ ...petNft, functionName: "feed", args: [id] }`처럼 펼쳐서 쓴다.
//   ABI는 src/generated.ts(@wagmi/cli가 forge 결과에서 생성), 주소는 env(배포 스크립트 출력값)에서 온다.
//   이 파일은 서버와 클라이언트 둘 다 import할 수 있다 (RainbowKit 등 클라이언트 전용 코드를 쓰지 않는다).
import { getAddress, isAddress, type Address } from "viem";
import { energyAbi, petNftAbi } from "@/generated";

// env에서 주소를 읽고, 비었거나 형식이 틀리면 바로 에러를 낸다.
function readAddress(name: string, value: string | undefined): Address {
  // ! 주소가 비어 있으면 viem이 0x0000...(빈 주소)로 호출하는 일이 생길 수 있다.
  //   그러면 "조회 결과가 전부 0" 같은 헷갈리는 증상만 보인다. 그래서 시작할 때 크게 터뜨린다.
  if (!value || !isAddress(value)) {
    throw new Error(`${name}가 올바른 주소가 아니다: "${value ?? ""}". web/.env.local을 확인하라.`);
  }
  // getAddress: 대소문자가 섞인 체크섬 형식(0x5FbD...)으로 맞춘다
  return getAddress(value);
}

// ! process.env.NEXT_PUBLIC_XXX는 "글자 그대로" 써야 빌드할 때 값으로 바뀐다.
//   process.env[name]처럼 변수로 꺼내면 브라우저 코드에서는 undefined가 된다. 그래서 인자로 직접 넘긴다.
export const PET_NFT_ADDRESS = readAddress("NEXT_PUBLIC_PET_NFT_ADDRESS", process.env.NEXT_PUBLIC_PET_NFT_ADDRESS);
export const ENERGY_ADDRESS = readAddress("NEXT_PUBLIC_ENERGY_ADDRESS", process.env.NEXT_PUBLIC_ENERGY_ADDRESS);

// * 이벤트를 찾기 시작할 블록 (getLogs fromBlock). 0부터 찾으면 RPC가 느리거나 거부한다.
export const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "0");

// * Energy ABI 중 에러만 골라낸다.
//   x는 ABI 항목(함수, 이벤트, 에러 ...)의 유니온 타입이다. `x is Extract<...>`는 타입 가드라서
//   filter 결과의 타입이 "에러 항목만"으로 좁혀진다. (TS의 filter((x): x is T => ...) 패턴)
const energyErrors = energyAbi.filter(
  (x): x is Extract<(typeof energyAbi)[number], { type: "error" }> => x.type === "error",
);

export const petNft = {
  address: PET_NFT_ADDRESS,
  // ! 왜 Energy의 에러를 PetNFT ABI에 합칠까?
  //   train()을 불렀는데 활동력이 부족하면, 실제 revert는 PetNFT 안에서 부른 Energy.burn → OZ _burn에서 난다.
  //   그 에러(ERC20InsufficientBalance)는 PetNFT ABI에는 없고 Energy ABI에만 있다.
  //   합쳐 두지 않으면 viem이 에러 이름을 못 읽고 "알 수 없는 에러"로만 보여준다 (lib/errors.ts에서 문구로 바꿀 때 필요).
  abi: [...petNftAbi, ...energyErrors],
} as const;

export const energy = { address: ENERGY_ADDRESS, abi: energyAbi } as const;
