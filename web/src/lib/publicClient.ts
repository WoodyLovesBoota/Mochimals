// * 서버 전용 읽기 클라이언트 (SPEC 7-2 "서버용 publicClient"). 랭킹 페이지와 메타데이터 API가 쓴다.
//   지갑이 없는 곳(서버)에서 체인을 읽을 때는 wagmi 훅 대신 viem의 PublicClient를 바로 쓴다.
//   체인은 브라우저 쪽과 같은 env를 쓴다 (chain.ts). 그래서 서버와 화면이 같은 체인을 본다.
import "server-only"; // ! 클라이언트 컴포넌트에서 import하면 빌드 에러로 막는다 (서버 전용 코드가 번들에 섞이지 않게)
import { createPublicClient, http } from "viem";
import { chain } from "./chain";

// ! 서버는 NEXT_PUBLIC_RPC_URL을 쓰지 않는다.
//   NEXT_PUBLIC_RPC_URL은 브라우저 번들에 그대로 박혀서 누구나 볼 수 있다. 그래서 그 키(Alchemy 등)에는
//   "허용 도메인(Origin) 목록"을 걸어 둔다. 브라우저 요청에는 Origin 헤더가 붙어서 통과하지만,
//   서버(Vercel 함수)가 보내는 요청에는 Origin이 없어서 "Unspecified origin not on whitelist"로 거절된다.
//   → 메타데이터 API가 500 → Basescan·마켓이 NFT 이미지를 못 가져온다 (실제로 겪은 버그).
// * 그래서 서버는 서버 전용 env RPC_URL(NEXT_PUBLIC_ 없음 → 번들에 안 들어감)을 쓴다.
//   비어 있으면 체인의 기본 공개 RPC (Base Sepolia는 https://sepolia.base.org, anvil은 http://127.0.0.1:8545).
//   ? 공개 RPC는 요청 수 제한이 있다. 괜찮을까? 메타데이터는 CDN이 60초 캐시하고(route.ts), 랭킹도 요청이 적어서 충분하다.
//     더 필요하면 도메인 제한 없는 키를 하나 더 만들어 RPC_URL에 넣는다.
export const publicClient = createPublicClient({
  chain,
  transport: http(process.env.RPC_URL || undefined),
});
