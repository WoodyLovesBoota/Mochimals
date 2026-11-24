// * 서버와 클라이언트가 같이 쓰는 wagmi 공통 설정: 체인, RPC, 저장소.
//   ! 이 파일에서는 RainbowKit을 import하지 않는다. RainbowKit은 클라이언트 전용이라
//     서버 컴포넌트(layout.tsx)가 이 파일을 import할 수 없게 되기 때문이다.
import { cookieStorage, createStorage, http } from "wagmi";
import { base, baseSepolia, foundry, type Chain } from "wagmi/chains";

// =====================================================================
// 체인 고르기 (env 하나로 전환)
// =====================================================================
// * SPEC은 Base Sepolia를 쓰지만 "메인넷 전환은 env만 바꾸면 되게" 하라고 한다.
//   2강에서는 내 컴퓨터의 anvil(foundry 체인, 31337)에 연결해야 하므로 세 체인을 표로 둔다.
//   | NEXT_PUBLIC_CHAIN_ID | 체인          | 용도                |
//   | 31337                | foundry       | 로컬 anvil (2강~6강) |
//   | 84532                | baseSepolia   | 테스트넷 (7강)       |
//   | 8453                 | base          | 메인넷 (나중에)      |
const CHAINS: Record<number, Chain> = {
  [foundry.id]: foundry,
  [baseSepolia.id]: baseSepolia,
  [base.id]: base,
};

// * NEXT_PUBLIC_ 으로 시작하는 env만 브라우저 코드에 들어간다 (빌드할 때 값이 문자열로 박힌다).
//   접두사가 없는 env는 서버에서만 읽을 수 있다. 비밀값(PAYMASTER_URL 등)은 절대 NEXT_PUBLIC_을 붙이지 않는다.
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? baseSepolia.id);
const found = CHAINS[chainId];
// ! 지원하지 않는 체인 ID면 앱이 엉뚱한 체인에 붙지 않도록 시작할 때 바로 멈춘다.
if (!found) throw new Error(`지원하지 않는 NEXT_PUBLIC_CHAIN_ID: ${process.env.NEXT_PUBLIC_CHAIN_ID}`);
export const chain: Chain = found;

// * transports: 체인별로 "어느 RPC 서버에 물어볼지". http(undefined)면 체인에 내장된 공개 RPC를 쓴다.
//   foundry 체인의 내장 RPC는 http://127.0.0.1:8545 (anvil 기본 주소)다.
export const transports = { [chain.id]: http(process.env.NEXT_PUBLIC_RPC_URL || undefined) };

// * 연결 상태(어느 지갑, 어느 계정)를 쿠키에 저장한다.
//   localStorage는 서버가 못 읽지만 쿠키는 요청마다 서버로 오므로,
//   layout.tsx가 서버에서 미리 "연결됨" 상태로 그릴 수 있다 → 새로고침해도 깜빡임이 없다.
//   쿠키 이름은 "<key>.store" = "wagmi.store" 다 (key 기본값 "wagmi").
export const storage = createStorage({ storage: cookieStorage });
