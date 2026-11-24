// Next.js 설정 파일. `pnpm dev`, `pnpm build`가 시작할 때 이 파일을 읽는다.
// `import type`은 타입만 가져온다는 뜻이다. 실행 코드에는 아무것도 남지 않는다.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ! create-next-app은 `cacheComponents: true`, `partialPrefetching: true`를 넣어 준다. 이 프로젝트는 둘 다 껐다.
  //   * Cache Components는 Next.js 16의 새 캐시 방식이다. 켜면 아래 두 가지가 SPEC과 맞지 않는다.
  //     1. 루트 layout에서 쿠키를 읽어 지갑 연결 상태를 복원하려면(SPEC 7-2), 모든 페이지를 <Suspense>로 감싸야 한다.
  //     2. 랭킹 화면의 `export const revalidate = 30`(SPEC 12장) 같은 route segment config가 아예 사라진다.
  //   그래서 Next.js 15까지와 같은 "이전 캐시 모델"로 쓴다. (문서: node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md)
  //   partialPrefetching은 Cache Components 전용 기능이라 같이 뺐다.

  // ! 서버 번들에서 뺄 패키지 (Node.js가 실행할 때 직접 require한다).
  //   RainbowKit → wagmi baseAccount 커넥터 → @base-org/account → @coinbase/cdp-sdk 순으로 딸려 오는 패키지다.
  //   cdp-sdk는 결제 기능(x402)용 패키지를 "있으면 쓰는" 선택 의존성으로 두고 함수 안에서 동적 import한다.
  //   그런데 번들러(Turbopack)는 빌드할 때 그 import 경로를 미리 찾으려다 "Module not found"로 빌드를 멈춘다.
  //   번들에서 빼면 Node.js가 실제로 그 함수를 부를 때만 import를 시도한다. 우리는 x402를 쓰지 않으므로 문제가 없다.
  serverExternalPackages: ["@coinbase/cdp-sdk"],
};

export default nextConfig;
