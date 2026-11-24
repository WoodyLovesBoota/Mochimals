// ! ConnectButton은 클릭, 상태 같은 브라우저 기능을 쓰므로 클라이언트 컴포넌트여야 한다.
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { EnergyBadge } from "./EnergyBadge";

// * 모든 화면 위에 붙는 헤더 (SPEC 12장: 헤더에 ConnectButton과 활동력 표시).
//   Tailwind 클래스는 T1 수업에서 하나씩 읽는다.
export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-black/10 px-4 py-3">
      <span className="text-lg font-bold">Silo Pets</span>
      <div className="flex items-center gap-3">
        <EnergyBadge />
        {/* RainbowKit이 만든 버튼. 미연결이면 "지갑 연결", 연결되면 주소·잔액·네트워크를 보여준다 */}
        <ConnectButton />
      </div>
    </header>
  );
}
