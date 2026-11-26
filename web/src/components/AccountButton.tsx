// * 지갑 버튼 (헤더 오른쪽 끝). RainbowKit의 ConnectButton.Custom으로 "모양만" 우리가 그린다.
//   ? ConnectButton.Custom: RainbowKit이 연결 상태(account, chain)와 창 여는 함수(openConnectModal 등)를 넘겨주고,
//     버튼 마크업은 우리가 정하는 방식이다. 지갑 연결 로직·모달은 RainbowKit 그대로 쓴다 (구조 변경 없음).
//   상태 세 가지 (시안 01 / 02 / D2):
//     연결 전      → 라임 두툼한 버튼 "지갑 연결"
//     잘못된 체인  → 빨간 두툼한 버튼 "네트워크 확인" (체인 전환 창을 연다)
//     연결됨       → 크림 알약 + 아바타 구슬 (+ 데스크톱은 주소)
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletIcon } from "./icons";
import styles from "./AccountButton.module.scss";

type Props = {
  /** true면 아바타만 (모바일 HUD). false면 넓은 화면에서 주소까지 */
  compact?: boolean;
};

export function AccountButton({ compact = false }: Props) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        // * mounted: 브라우저에서 RainbowKit 준비가 끝났는지. 서버 HTML과 첫 화면이 달라 깜빡이지 않게,
        //   준비 전에는 자리만 잡고 숨긴다 (RainbowKit 문서의 권장 방식).
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div className={styles.wrap} aria-hidden={!ready} data-ready={ready}>
            {!connected ? (
              <button type="button" className={styles.connect} onClick={openConnectModal}>
                {/* 시안: 데스크톱만 지갑 아이콘이 있다 (모바일 01은 글자만) */}
                <WalletIcon size={24} className={styles.connectIcon} />
                지갑 연결
              </button>
            ) : chain.unsupported ? (
              <button type="button" className={styles.wrong} onClick={openChainModal}>
                네트워크 확인
              </button>
            ) : (
              <button
                type="button"
                className={compact ? styles.avatarOnly : styles.account}
                onClick={openAccountModal}
                aria-label={`계정 ${account.displayName}`}
              >
                {/* 아바타 구슬. 시안은 주소별 그림 대신 한 가지 그라데이션 (--avatar 토큰) */}
                <span className={styles.avatar} aria-hidden />
                {/* displayName: RainbowKit이 줄인 주소(0x70…79C8) 또는 ENS 이름 */}
                {!compact && <span className={styles.address}>{account.displayName}</span>}
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
