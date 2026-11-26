// * 구경 카드 (리디자인 시안 11 / D11): 남의 펫을 볼 때 행동 버튼 대신 나온다.
//   내 펫이 없는 사람(미연결 포함) → "나도 모치를 키워볼래요?" + 입양 / 이미 펫이 있는 사람 → 내 펫으로 가는 버튼.
//   모바일은 화면 아래 시트, 데스크톱은 오른쪽 패널 맨 위 (PetPanel이 flat으로 넣는다).
"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount } from "wagmi";
import { EggIcon, PawIcon, TrophyIcon } from "./icons";
import { useMyPetIds, usePetsHref } from "./nav";
import styles from "./VisitorCard.module.scss";

export function VisitorCard({ className, flat = false }: { className?: string; flat?: boolean }) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const myPets = useMyPetIds();
  const hasPets = !!myPets && myPets.length > 0;
  // "내 펫" 메뉴와 같은 주소 (1마리면 그 펫, 아니면 홈 목록)
  const petsHref = usePetsHref();

  return (
    <section className={`${flat ? styles.flat : styles.sheet} ${className ?? ""}`} aria-label="구경 안내">
      {!flat && <span className={styles.grabber} aria-hidden />}
      <h2 className={styles.title}>{hasPets ? "다른 집사의 펫이에요" : "나도 모치를 키워볼래요?"}</h2>
      <p className={styles.desc}>
        {hasPets
          ? "구경만 할 수 있어요. 내 펫도 돌봐 주세요."
          : "다른 집사의 펫은 구경만 할 수 있어요. 입양은 무료예요."}
      </p>
      {hasPets ? (
        <Link href={petsHref} className={styles.primary}>
          <PawIcon size={24} />내 펫 보러 가기
        </Link>
      ) : isConnected ? (
        // 연결됨 + 펫 없음 → 홈(입양 화면)으로
        <Link href="/" className={styles.primary}>
          <EggIcon size={24} />
          무료로 입양하기
        </Link>
      ) : (
        // 미연결 → 지갑 연결부터 (연결되면 홈에서 입양)
        <button type="button" className={styles.primary} onClick={openConnectModal}>
          <EggIcon size={24} />
          무료로 입양하기
        </button>
      )}
      {/* 데스크톱 패널(flat)에는 랭킹 버튼이 없다 (위쪽 메뉴에 있음, 시안 D11) */}
      {!flat && (
        <Link href="/ranking" className={styles.secondary}>
          <TrophyIcon size={24} />
          랭킹 더 보기
        </Link>
      )}
    </section>
  );
}
