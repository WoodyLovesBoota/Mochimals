// ! 지갑 연결 상태와 컨트랙트 읽기 훅을 쓰므로 클라이언트 컴포넌트다.
"use client";

import { MAX_ENERGY, useEnergy } from "@/hooks/useEnergy";
import { BoltIcon } from "./icons";
import styles from "./EnergyBadge.module.scss";

// * 활동력 알약 "4/10". 잔액 읽기는 useEnergy 훅 (Energy.balanceOf).
//   SPEC 12장: "모든 화면 헤더에 ConnectButton과 활동력 표시"
export function EnergyBadge() {
  const balance = useEnergy();

  // 연결 안 됐거나 아직 못 읽었으면 아무것도 안 보여준다
  if (balance === undefined) return null;

  return (
    // * 반환값은 bigint다 (uint256은 JS number 범위를 넘을 수 있어서). decimals가 0이라 그대로 글자로 바꾼다.
    //   aria-label: 화면 글자 "4/10"만으로는 스크린리더가 뜻을 모르니 문장으로 읽어 준다
    <span className={styles.badge} role="img" aria-label={`Energy ${balance} / ${MAX_ENERGY}`}>
      {/* 호박색 동그라미 안의 번개 (시안: 28px 원, 아래 안쪽 그림자) */}
      <span className={styles.icon}>
        <BoltIcon size={16} />
      </span>
      {/* "활동력" 글자는 데스크톱에서만 (시안 D2 "활동력 4/10", 모바일 02는 "4/10") */}
      <span className={styles.label}>Energy</span>
      {balance.toString()}
      <span className={styles.max}>/{MAX_ENERGY}</span>
    </span>
  );
}
