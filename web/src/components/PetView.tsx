// * 내 펫 화면 본문 (4강). usePet으로 읽고 아래 조각들에 나눠 준다.
//   PetCard(그림, 이름, 연출) → PetStats(수치) → PetActions(행동 버튼, 주인만) → UnlockList(해금 목록)
//   이 파일이 직접 하는 일: 로딩/에러, 주인 여부, 연출 상태(usePetEffect) 보관, 진화 연출(EvolveOverlay).
"use client";

import { MotionConfig } from "motion/react";
import { useMemo } from "react";
import { BaseError, ContractFunctionRevertedError, isAddressEqual } from "viem";
import { useAccount } from "wagmi";
import { usePet } from "@/hooks/usePet";
import { usePetEffect } from "@/hooks/usePetEffect";
import { EvolveOverlay } from "./EvolveOverlay";
import { PetActions } from "./PetActions";
import { PetCard } from "./PetCard";
import { PetStats } from "./PetStats";
import { UnlockList } from "./UnlockList";
import styles from "./PetView.module.scss";

type Props = { petId: string };

export function PetView({ petId }: Props) {
  // useMemo: 렌더마다 BigInt를 새로 만들 필요는 없지만, 그보다 "같은 값"을 훅에 넘긴다는 의도를 드러낸다.
  //   bigint는 원시값이라 매번 새로 만들어도 === 비교가 같아서 쿼리 키는 바뀌지 않는다.
  const id = useMemo(() => BigInt(petId), [petId]);
  const { address } = useAccount();
  // refetch: 캐시를 무시하고 지금 다시 읽는다. 배고파지는 순간(PetStats의 타이머)에 부른다.
  const { data: pet, isPending, error, refetch } = usePet(id, address);
  // * 연출 상태. 훅은 조건문(로딩/에러 return)보다 위에서 불러야 한다 (React 훅 규칙: 렌더마다 같은 순서로 호출).
  const fx = usePetEffect();

  // ① 로딩: 첫 읽기 전. (다시 읽는 중에는 isPending이 아니라 isFetching이라, 옛 데이터가 계속 보인다)
  if (isPending) return <main className={styles.main}>불러오는 중…</main>;

  // ② 에러: 없는 펫이면 ownerOf가 revert한다 (usePet 49줄 allowFailure: false).
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
  // 진화/부화 연출 (EvolveOverlay). 단계가 바뀐 레벨업일 때만 effects.ts가 evolve를 채운다.
  const evolve = fx.current?.effect.evolve ?? null;

  return (
    // * MotionConfig reducedMotion="user": OS의 "동작 줄이기"(prefers-reduced-motion)가 켜져 있으면
    //   Motion이 위치·크기·회전(transform) 애니메이션을 건너뛰고 opacity 같은 나머지만 튼다.
    //   SPEC 12장 "prefers-reduced-motion이면 페이드만"을 컴포넌트마다 분기하지 않고 여기 한 줄로 처리한다.
    <MotionConfig reducedMotion="user">
      <main className={styles.main}>
        <PetCard petId={petId} pet={pet} isOwner={isOwner} fx={fx} />
        {/* refetch는 Promise를 돌려주지만 타이머는 결과를 기다리지 않는다. () => void로 감싸서 넘긴다 */}
        <PetStats pet={pet} isOwner={isOwner} onHungry={() => void refetch()} />
        {/* SPEC 12장: 주인이면 행동 버튼, 아니면 버튼 없이 읽기 전용 */}
        {isOwner ? (
          <PetActions petId={id} pet={pet} onEffect={fx.play} />
        ) : (
          <p className={styles.readonly}>다른 집사의 펫이에요. 구경만 할 수 있어요</p>
        )}
        {/* SPEC 12장 내 펫 화면 "해금 목록" */}
        <UnlockList level={Number(pet.level)} />
      </main>
      {/* * 진화/부화: 화면 전체를 덮는 연출 (position: fixed). 카드 안에 두지 않는 이유는
            카드의 overflow: hidden이나 움직이는(transform) 조상 안에 있으면 fixed가 화면 기준이 아니게 되기 때문이다.
            key: 연속으로 진화할 일은 없지만, 새 연출이면 타이머를 처음부터 다시 걸도록 연출 번호를 준다. */}
      {evolve && (
        <EvolveOverlay
          key={fx.current?.key}
          dna={pet.dna}
          from={evolve.from}
          to={evolve.to}
          onDone={() => fx.clear("evolve")}
        />
      )}
    </MotionConfig>
  );
}

// 없는 펫 번호인지: ownerOf가 OZ의 ERC721NonexistentToken으로 revert했는지 본다 (errors.ts와 같은 walk 방식)
function isNonexistent(error: Error): boolean {
  if (!(error instanceof BaseError)) return false;
  const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
  return reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName === "ERC721NonexistentToken";
}
