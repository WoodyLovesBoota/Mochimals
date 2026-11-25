// ! "use client": 이 파일은 브라우저에서 실행되는 클라이언트 컴포넌트다.
//   Provider들은 React Context와 useState를 쓰는데, 이건 서버 컴포넌트에서 쓸 수 없다.
//   그래서 Provider만 이 파일에 모으고, layout.tsx(서버 컴포넌트)가 이걸 감싸서 쓴다.
"use client";

// RainbowKit 지갑 선택 창, ConnectButton의 기본 스타일
import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, type State } from "wagmi";
import { config } from "@/lib/wagmi";

type Props = {
  children: ReactNode;
  // 서버(layout.tsx)가 쿠키에서 복원한 연결 상태. 쿠키가 없으면 undefined.
  initialState: State | undefined;
};

// * Provider 3겹. 바깥부터 순서가 중요하다.
//   WagmiProvider       : 체인, 지갑 연결 상태 (가장 바깥. 나머지가 이걸 쓴다)
//   QueryClientProvider : TanStack Query 캐시. wagmi의 읽기 훅(useReadContract 등)이 결과를 여기에 저장한다
//   RainbowKitProvider  : 지갑 선택 창 UI. wagmi 연결 상태와 Query를 둘 다 쓰므로 가장 안쪽
export function Providers({ children, initialState }: Props) {
  // ? 왜 `const queryClient = new QueryClient()`를 컴포넌트 밖에 안 둘까?
  //   서버에서 모듈 변수로 두면 "모든 사용자의 요청"이 캐시 하나를 공유해 남의 데이터가 섞일 수 있다.
  //   useState의 초기화 함수로 만들면 컴포넌트(= 요청, 브라우저 탭)마다 한 번만 만들어진다.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {/* locale: 지갑 선택 창 문구를 한국어로 (SPEC: UI 문구는 한국어) */}
        {/* showRecentTransactions: usePetAction이 addRecentTransaction으로 넣은 트랜잭션을 계정 버튼 스피너와 계정 창 목록으로 보여준다 */}
        <RainbowKitProvider locale="ko-KR" showRecentTransactions>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
