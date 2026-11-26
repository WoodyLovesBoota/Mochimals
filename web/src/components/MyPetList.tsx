// * 내 펫 목록 (리디자인 시안 04 / D4). 펫이 2마리 이상일 때만 홈이 보여준다 (1마리면 바로 그 펫 화면으로).
//   모바일: 가로 카드 세로로 쌓기 / 데스크톱: 세로 카드 가로로 + "마켓에서 데려오기" 점선 카드
"use client";

import Link from "next/link";
import type { Address } from "viem";
import { MAX_ENERGY, useEnergy } from "@/hooks/useEnergy";
import { useHungerTimer } from "@/hooks/useHungerTimer";
import { usePet, type PetState } from "@/hooks/usePet";
import { openseaCollectionUrl } from "@/lib/links";
import { getPetLook, levelProgress, SPECIES_NAME, STAGE_NAME, type Stage } from "@/lib/look";
import { formatClock } from "@/lib/time";
import { currentTitle, sceneFor } from "@/lib/unlocks";
import { BoltIcon, EggIcon, ExternalIcon, HeartIcon, PawIcon } from "./icons";
import { LevelRing } from "./LevelRing";
import { Notice } from "./Notice";
import { PetSprite } from "./PetSprite";
import { Ribbon } from "./Ribbon";
import styles from "./MyPetList.module.scss";

export function MyPetList({ ids, viewer }: { ids: bigint[]; viewer: Address }) {
  const energy = useEnergy();
  const market = openseaCollectionUrl();

  return (
    <main className={styles.main}>
      <Ribbon>내 펫 {ids.length}마리</Ribbon>

      <ul className={styles.list}>
        {ids.map((id) => (
          <li key={id.toString()}>
            <MyPetCard id={id} viewer={viewer} />
          </li>
        ))}
        {/* 데스크톱 전용 점선 카드: 마켓에서 다른 모치를 데려오기 (OpenSea가 없는 체인이면 숨김) */}
        {market && (
          <li className={styles.marketItem}>
            <a className={styles.market} href={market} target="_blank" rel="noreferrer">
              <span className={styles.marketIcon}>
                <EggIcon size={32} />
              </span>
              <strong>마켓에서 데려오기</strong>
              <span>
                OpenSea <ExternalIcon size={12} />
              </span>
            </a>
          </li>
        )}
      </ul>

      {/* 활동력은 지갑 단위라 모든 펫이 나눠 쓴다 (SPEC: Energy는 지갑의 ERC-20 잔액) */}
      <Notice
        icon={
          <span className={styles.boltChip}>
            <BoltIcon size={16} />
          </span>
        }
      >
        활동력은 내 펫 모두가 같이 써요
        {energy !== undefined && (
          <span className={styles.desktopOnly}>
            {" "}
            · 지금 {energy.toString()}/{MAX_ENERGY}
          </span>
        )}
      </Notice>
    </main>
  );
}

function MyPetCard({ id, viewer }: { id: bigint; viewer: Address }) {
  const { data: pet, refetch } = usePet(id, viewer);
  if (!pet) return <div className={styles.cardLoading} aria-busy />;
  return <MyPetCardBody id={id} pet={pet} onHungry={() => void refetch()} />;
}

function MyPetCardBody({ id, pet, onHungry }: { id: bigint; pet: PetState; onHungry: () => void }) {
  // 카드마다 배고픔 시계 (1분마다 갱신, 배고파지는 순간 다시 읽기)
  const hungryInMs = useHungerTimer(pet.lastFedAt, pet.hungry, onHungry);
  const look = getPetLook({ dna: pet.dna, stage: pet.stage, emotion: pet.hungry ? "hungry" : "idle" });
  const level = Number(pet.level);
  const { current, needed } = levelProgress(pet.xp);
  const percent = needed === 0 ? 100 : Math.floor((current / needed) * 100);
  // "어린이 · 돼지 · 새싹 집사" (부화 전에는 종을 숨긴다, SPEC 5장)
  const meta = [STAGE_NAME[pet.stage as Stage], pet.stage > 0 ? SPECIES_NAME[look.species] : null, currentTitle(level)]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        {/* 장면 그림 위의 펫 + (데스크톱) 레벨 링 */}
        {/* 카드 장면도 펫 레벨의 장면 (화면 배경과 같은 토큰). 값은 변수 이름뿐이라 색은 globals.scss에만 있다 */}
        <div
          className={styles.scene}
          style={
            {
              "--card-scene-m": `var(--scene-m-${sceneFor(level)})`,
              "--card-scene-d": `var(--scene-d-${sceneFor(level)})`,
            } as React.CSSProperties
          }
        >
          <PetSprite look={look} size={240} className={styles.sprite} />
          <LevelRing level={level} percent={percent} size={54} className={styles.ring} />
        </div>
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <h2 className={styles.name}>Mochi #{id.toString()}</h2>
            <span className={styles.lv}>Lv {level}</span>
            {/* 데스크톱은 이름 옆에 배고픔 알약 */}
            <HungerPill hungry={pet.hungry} ms={hungryInMs} className={styles.hungerDesktop} />
          </div>
          <p className={styles.meta}>{meta}</p>
          <span
            className={styles.track}
            role="progressbar"
            aria-label="다음 레벨까지 경험치"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span className={styles.fill} style={{ width: `${percent}%` }} />
          </span>
          <HungerPill hungry={pet.hungry} ms={hungryInMs} className={styles.hungerMobile} />
        </div>
      </div>
      {/* 배고프면 호박색 버튼 (밥 먼저 주라는 뜻), 아니면 라임 */}
      <Link href={`/pet/${id}`} className={pet.hungry ? styles.goHungry : styles.go}>
        <PawIcon size={24} />
        돌보러 가기
      </Link>
    </article>
  );
}

function HungerPill({ hungry, ms, className }: { hungry: boolean; ms: number; className: string }) {
  return (
    <span className={`${hungry ? styles.pillHungry : styles.pill} ${className}`}>
      <span className={styles.heart}>
        <HeartIcon size={14} />
      </span>
      {hungry ? "배고파요" : `${formatClock(ms) ?? "곧"} 남음`}
    </span>
  );
}
