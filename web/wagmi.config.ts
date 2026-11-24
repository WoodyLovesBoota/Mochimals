// * @wagmi/cli 설정: 컨트랙트 ABI를 TypeScript 파일로 만들어 준다.
//   실행: `pnpm wagmi` (= wagmi generate)
//   결과: src/generated.ts 에 `export const petNftAbi = [...] as const` 같은 코드가 생긴다.
//
// ? 왜 ABI JSON을 그냥 import하지 않고 TS로 만들까?
//   `as const`가 붙어야 viem/wagmi가 ABI 안의 함수 이름, 인자 타입, 반환 타입을 "글자 그대로" 알 수 있다.
//   그래야 functionName: "fedd" 같은 오타나 인자 타입 실수가 컴파일할 때 잡힌다.
//   JSON import는 타입이 그냥 string[]처럼 넓어져서 이 검사가 사라진다.
import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/generated.ts",
  plugins: [
    foundry({
      // Foundry 프로젝트 위치 (web 폴더 기준)
      project: "../contracts",
      // * 필요한 컨트랙트만 가져온다. 안 정하면 forge-std, OpenZeppelin의 수많은 ABI까지 다 딸려 온다.
      //   contracts/out/PetNFT.sol/PetNFT.json → petNftAbi, contracts/out/Energy.sol/Energy.json → energyAbi
      include: ["PetNFT.sol/**", "Energy.sol/**"],
      // * 생성하기 전에 forge build를 먼저 돌린다. 컨트랙트를 고치고 `pnpm wagmi`만 다시 하면 ABI가 따라온다.
      //   ! forge가 PATH에 있어야 한다 (1강에서 설치한 Foundry).
      forge: { build: true },
    }),
  ],
});
