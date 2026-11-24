// * 클라이언트용 wagmi 설정: chain.ts의 공통 설정에 RainbowKit 지갑 목록을 더한다.
//   ! 이 파일은 RainbowKit(클라이언트 전용)을 쓰므로 클라이언트 컴포넌트(providers.tsx)에서만 import한다.
//     서버 컴포넌트에서 import하면 빌드할 때
//     "Attempted to call getDefaultConfig() from the server" 에러가 난다. 서버는 wagmiServer.ts를 쓴다.
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  // RainbowKit 지갑 목록의 `base`는 체인 이름 `base`와 겹쳐서 별명을 붙인다.
  base as baseAccountWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { chain, storage, transports } from "./chain";

// ? WalletConnect(Reown) 프로젝트 ID. 비어 있으면 RainbowKit이 에러를 던진다.
//   "YOUR_PROJECT_ID"를 넣으면 RainbowKit이 개발용 예제 ID로 바꿔 준다. 로컬 개발은 이걸로 충분하고,
//   7강 배포 전에 https://cloud.reown.com 에서 진짜 ID를 받아 env에 넣는다.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "YOUR_PROJECT_ID";

export const config = getDefaultConfig({
  appName: "Silo Pets",
  projectId,
  // * 튜플 [chain] 하나만 둔다. 지갑이 다른 체인에 있으면 RainbowKit이 "잘못된 네트워크"로 표시한다.
  chains: [chain],
  wallets: [
    {
      groupName: "추천",
      wallets: [
        // * Base Account: 확장 프로그램 없이 패스키(지문, Face ID)로 스마트 지갑을 만든다.
        //   SPEC의 `coinbaseWallet.preference = 'smartWalletOnly'`와 같은 역할이다.
        //   RainbowKit 2.2에서 coinbaseWallet이 deprecated되고 이 `base` 지갑으로 바뀌었다.
        baseAccountWallet,
        metaMaskWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  transports,
  // * 새 블록, 트랜잭션 확정 등을 1초마다 확인한다 (기본 4초). Base 블록 시간이 2초라서 빠르게 맞춘다.
  pollingInterval: 1_000,
  storage,
  // * 서버에서도 렌더링한다는 표시. 서버에서는 지갑에 접근하지 않고, 브라우저에서 hydrate한 뒤 다시 연결한다.
  ssr: true,
});

// * 타입 등록: 이 config를 앱 전체의 기본 config로 알려 준다.
//   그러면 useReadContract 같은 훅이 "우리 체인 ID"를 타입으로 알고, 잘못된 chainId를 넣으면 타입 에러가 난다.
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
