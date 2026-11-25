// * 서버 전용 읽기 클라이언트 (SPEC 7-2 "서버용 publicClient"). 랭킹 페이지와 메타데이터 API가 쓴다.
//   지갑이 없는 곳(서버)에서 체인을 읽을 때는 wagmi 훅 대신 viem의 PublicClient를 바로 쓴다.
//   체인과 RPC 주소는 브라우저 쪽과 같은 env를 쓴다 (chain.ts). 그래서 서버와 화면이 같은 체인을 본다.
import "server-only"; // ! 클라이언트 컴포넌트에서 import하면 빌드 에러로 막는다 (서버 전용 코드가 번들에 섞이지 않게)
import { createPublicClient, http } from "viem";
import { chain } from "./chain";

export const publicClient = createPublicClient({
  chain,
  // RPC 주소가 비어 있으면 체인의 기본 공개 RPC (anvil은 http://127.0.0.1:8545)
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
});
