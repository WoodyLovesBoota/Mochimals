// * 서버용 wagmi 설정: 지갑(커넥터) 없이 체인, RPC, 저장소만 있다.
//   지금 쓰는 곳은 layout.tsx의 cookieToInitialState 하나뿐이다.
//   ? cookieToInitialState는 config에서 무엇을 쓸까? wagmi 소스(@wagmi/core utils/cookie.js)를 보면
//     `${config.storage.key}.store` 쿠키 이름을 만드는 데 storage만 쓴다.
//     그래서 클라이언트 config(wagmi.ts)와 storage만 같으면(chain.ts에서 같은 걸 가져온다) 결과가 같다.
import { createConfig } from "wagmi";
import { chain, storage, transports } from "./chain";

export const serverConfig = createConfig({
  chains: [chain],
  transports,
  storage,
  ssr: true,
});
