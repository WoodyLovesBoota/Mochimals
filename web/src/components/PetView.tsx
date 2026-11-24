// * 내 펫 화면 본문 (4강). usePet으로 읽고, PetSprite로 그린다.
//   이번 교시: 펫 카드(그림, 이름, 레벨, 칩), 로딩/에러, 주인 여부.
//   다음 교시: XP 바, 활동력 10칸, 배고픔까지 남은 시간 → 행동 버튼 → 연출.
"use client";

import { useMemo } from "react";
import { BaseError, ContractFunctionRevertedError, isAddressEqual } from "viem";
import { useAccount } from "wagmi";
import { ACTIVE_ART_SET } from "@/art";
import { usePet, type PetState } from "@/hooks/usePet";
import {
  COLOR_NAME,
  getPetLook,
  PERSONALITY_NAME,
  SPECIES_NAME,
  STAGE_NAME,
  type Emotion,
  type Stage,
} from "@/lib/look";
import { PetSprite } from "./PetSprite";
import styles from "./PetView.module.scss";

type Props = { petId: string };

export function PetView({ petId }: Props) {
  // useMemo: 렌더마다 BigInt를 새로 만들 필요는 없지만, 그보다 "같은 값"을 훅에 넘긴다는 의도를 드러낸다.
  //   bigint는 원시값이라 매번 새로 만들어도 === 비교가 같아서 쿼리 키는 바뀌지 않는다.
  const id = useMemo(() => BigInt(petId), [petId]);
  const { address } = useAccount();
  const { data: pet, isPending, error } = usePet(id, address);

  // ① 로딩: 첫 읽기 전. (다시 읽는 중에는 isPending이 아니라 isFetching이라, 옛 데이터가 계속 보인다)
  if (isPending) return <main className={styles.main}>불러오는 중…</main>;

  // ② 에러: 없는 펫이면 ownerOf가 revert한다 (usePet 46줄 allowFailure: false).
  if (error) {
    return (
      <main className={styles.main}>
        <p>{isNonexistent(error) ? `Mochi #${petId}는 아직 없는 펫이에요` : "펫을 불러오지 못했어요"}</p>
      </main>
    );
  }

  // ③ 주인 여부. 연결 안 됐으면 false.
  //   ! 주소는 === 로 비교하지 않는다. 체크섬 형식(0xAbC…)과 소문자(0xabc…)가 섞이면 같은 주소인데 false가 된다.
  const isOwner = !!address && isAddressEqual(address, pet.owner);

  return (
    <main className={styles.main}>
      <PetCard petId={petId} pet={pet} isOwner={isOwner} />
      {/* SPEC 12장: 주인이 아니면 버튼 없이 읽기 전용 */}
      {!isOwner && <p className={styles.readonly}>다른 집사의 펫이에요. 구경만 할 수 있어요</p>}
    </main>
  );
}

// 펫 카드: 무대(그림) + 이름/레벨 + 칩
function PetCard({ petId, pet, isOwner }: { petId: string; pet: PetState; isOwner: boolean }) {
  // * 표정. SPEC 5장 우선순위 중 컨트랙트 값으로 정해지는 두 가지만 여기서 정한다.
  //   excited(레벨업 직후), happy(밥 먹은 직후)는 행동 결과가 필요해서 연출 교시에서 더한다.
  const emotion = pickEmotion(pet, isOwner);
  // stage는 uint8이라 이미 number다 (usePet 17줄). getPetLook이 0~4를 검사한다.
  const look = getPetLook({ dna: pet.dna, stage: pet.stage, emotion });
  const stage = look.stage as Stage;
  // ? 왜 hatched를 따로 둘까? SPEC 5장: "부화(Lv 3) 전까지 종을 보여주지 않는다".
  //   dna에는 이미 종이 들어 있지만, 알(stage 0)일 때 화면 글자로는 감춘다.
  const hatched = stage > 0;

  return (
    <section className={styles.card}>
      {/* * 무대 배경색은 CSS 변수로 넘긴다. 색 코드를 scss에 쓰지 않고, 아트 세트가 정한 값을 그대로 쓴다.
            background가 없는 아트 세트면 scss의 기본값(var(--color-stage-fallback))을 쓴다. */}
      <div
        className={styles.stage}
        style={{ "--stage-bg": ACTIVE_ART_SET.background?.(look) } as React.CSSProperties}
      >
        <PetSprite look={look} size={280} className={styles.sprite} />
      </div>

      <div className={styles.info}>
        <div className={styles.titleRow}>
          {/* SPEC 12장: 이름은 Mochi #id (이름 짓기 기능은 없다) */}
          <h1 className={styles.name}>Mochi #{petId}</h1>
          {/* level은 uint256 → bigint. 화면 표시 직전에만 글자로 바꾼다 (SPEC 8장) */}
          <span className={styles.level}>Lv {pet.level.toString()}</span>
        </div>
        <ul className={styles.chips}>
          <li>{STAGE_NAME[stage]}</li>
          <li>{hatched ? SPECIES_NAME[look.species] : "???"}</li>
          {hatched && <li>{PERSONALITY_NAME[look.personality]}</li>}
          {hatched && <li>{COLOR_NAME[look.color]}</li>}
        </ul>
      </div>
    </section>
  );
}

/**
 * SPEC 5장 표정 우선순위 중 컨트랙트 값으로 정하는 부분: hungry → sleepy → idle.
 * ? sleepy(활동력 0)는 왜 주인일 때만일까? pet.energy는 "펫 주인"이 아니라 "지금 보는 사람"의 잔액이다 (usePet 41줄).
 *   남의 펫을 구경하는데 내 활동력이 0이라고 그 펫이 졸면 이상하다.
 */
function pickEmotion(pet: PetState, isOwner: boolean): Emotion {
  if (pet.hungry) return "hungry";
  if (isOwner && pet.energy === 0n) return "sleepy";
  return "idle";
}

// 없는 펫 번호인지: ownerOf가 OZ의 ERC721NonexistentToken으로 revert했는지 본다 (errors.ts와 같은 walk 방식)
function isNonexistent(error: Error): boolean {
  if (!(error instanceof BaseError)) return false;
  const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
  return reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName === "ERC721NonexistentToken";
}
