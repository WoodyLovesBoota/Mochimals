// * 내 펫 화면 본문 (4강, 리디자인 시안 02 / D2). usePet으로 읽고 아래 조각들에 나눠 준다.
//
//   모바일 (~900px)                       데스크톱 (900px~)
//   ┌─────────────────────┐               ┌──────────────────────────────┬──────────┐
//   │ PetHud (링·이름·활동력·계정)│        │ PetHud                        │ PetPanel │
//   │ 해금 알림         [옆 버튼]│          │ 해금 알림                     │ (상태·해금│
//   │        PetCard (펫)        │          │          PetCard (펫)         │  ·정보)  │
//   │ PetActions (밥 | 훈련)     │          │     PetActions (트레이)       │          │
//   └─────────────────────┘ + 탭 바     └──────────────────────────────┴──────────┘
//
//   이 파일이 직접 하는 일: 로딩/에러, 주인 여부, 연출 상태(usePetEffect) 보관, 진화 연출(EvolveOverlay), 시트 열고 닫기.
"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useMemo, useState } from "react";
import { BaseError, ContractFunctionRevertedError, isAddressEqual } from "viem";
import { useAccount } from "wagmi";
import { useHungerTimer } from "@/hooks/useHungerTimer";
import { usePet, type PetState } from "@/hooks/usePet";
import { usePetEffect } from "@/hooks/usePetEffect";
import { STAGE_NAME, type Stage } from "@/lib/look";
import { currentTitle, unlocksAt, unlockToast } from "@/lib/unlocks";
import { EvolveOverlay } from "./EvolveOverlay";
import { GiftIcon, InfoIcon, ShareIcon, SparkleIcon } from "./icons";
import { PetActions } from "./PetActions";
import { PetCard } from "./PetCard";
import { PetHud } from "./PetHud";
import { PetPanel } from "./PetPanel";
import { Sheet } from "./Sheet";
import { UnlockList } from "./UnlockList";
import styles from "./PetView.module.scss";

type Props = { petId: string };

export function PetView({ petId }: Props) {
  // useMemo: 렌더마다 BigInt를 새로 만들 필요는 없지만, 그보다 "같은 값"을 훅에 넘긴다는 의도를 드러낸다.
  //   bigint는 원시값이라 매번 새로 만들어도 === 비교가 같아서 쿼리 키는 바뀌지 않는다.
  const id = useMemo(() => BigInt(petId), [petId]);
  const { address } = useAccount();
  // refetch: 캐시를 무시하고 지금 다시 읽는다. 배고파지는 순간(useHungerTimer)에 부른다.
  const { data: pet, isPending, error, refetch } = usePet(id, address);

  // ① 로딩: 첫 읽기 전. (다시 읽는 중에는 isPending이 아니라 isFetching이라, 옛 데이터가 계속 보인다)
  //   TODO 2단계: 시안 12의 로딩 모양으로
  if (isPending) return <main className={styles.message}>불러오는 중…</main>;

  // ② 에러: 없는 펫이면 ownerOf가 revert한다 (usePet 49줄 allowFailure: false).
  //   TODO 2단계: 시안 12의 404·에러 화면으로
  if (error) {
    return (
      <main className={styles.message}>
        <p>{isNonexistent(error) ? `Mochi #${petId}는 아직 없는 펫이에요` : "펫을 불러오지 못했어요"}</p>
      </main>
    );
  }

  // ③ 주인 여부. 연결 안 됐으면 false.
  //   ! 주소는 === 로 비교하지 않는다. 체크섬 형식(0xAbC…)과 소문자(0xabc…)가 섞이면 같은 주소인데 false가 된다.
  const isOwner = !!address && isAddressEqual(address, pet.owner);

  return <PetScreen petId={petId} id={id} pet={pet} isOwner={isOwner} onHungry={() => void refetch()} />;
}

/**
 * 데이터가 다 있을 때의 화면.
 * ? 왜 PetView에서 나눴을까? 훅(useHungerTimer, usePetEffect, useState)은 조건문(로딩 중이면 return) 뒤에서 부를 수 없다
 *   (React 훅 규칙: 렌더마다 같은 순서로 호출). pet이 확실히 있는 이 컴포넌트에서 부르면 조건 없이 부를 수 있다.
 */
function PetScreen(props: { petId: string; id: bigint; pet: PetState; isOwner: boolean; onHungry: () => void }) {
  const { petId, id, pet, isOwner, onHungry } = props;
  // * 연출 상태 (XP 숫자, 레벨업, 진화, 새 해금 알림)
  const fx = usePetEffect();
  // 배고파지기까지 남은 밀리초. HUD("23:57 남음")와 패널("23시간 57분 남음")이 같은 값을 쓴다
  const hungryInMs = useHungerTimer(pet.lastFedAt, pet.hungry, onHungry);
  // 지금 열린 시트 (모바일 "펫 정보" / 어디서나 "해금 목록")
  const [sheet, setSheet] = useState<"info" | "unlocks" | null>(null);

  const level = Number(pet.level);
  // 이름판 아랫줄: 칭호(Lv 4~)가 있으면 칭호, 없으면 단계 이름 ("알", "아기")
  const subtitle = currentTitle(level) ?? STAGE_NAME[pet.stage as Stage];
  // 진화/부화 연출 (EvolveOverlay). 단계가 바뀐 레벨업일 때만 effects.ts가 evolve를 채운다.
  const evolve = fx.current?.effect.evolve ?? null;
  // 새 해금 알림 (레벨업 직후 6초, usePetEffect의 unlock)
  const toast = fx.unlock ? unlockToast(fx.unlock.level) : null;
  // 해금 버튼의 빨간 숫자 = 방금 열린 해금 개수 (알림이 떠 있는 동안만)
  const newUnlocks = fx.unlock ? unlocksAt(fx.unlock.level).length : 0;

  const panelProps = { petId, pet, isOwner, hungryInMs, onOpenUnlocks: () => setSheet("unlocks") };

  return (
    // * MotionConfig reducedMotion="user": OS의 "동작 줄이기"(prefers-reduced-motion)가 켜져 있으면
    //   Motion이 위치·크기·회전(transform) 애니메이션을 건너뛰고 opacity 같은 나머지만 튼다.
    //   SPEC 12장 "prefers-reduced-motion이면 페이드만"을 컴포넌트마다 분기하지 않고 여기 한 줄로 처리한다.
    <MotionConfig reducedMotion="user">
      <main className={styles.main}>
        <div className={styles.play}>
          <PetHud petId={petId} pet={pet} subtitle={subtitle} hungryInMs={hungryInMs} />

          {/* 새 해금 알림 (시안 02 "Lv 7 해금 · 어린이로 진화!"). role="status": 스크린리더가 끼어들지 않고 읽는다 */}
          <div className={styles.toastSlot}>
            <AnimatePresence>
              {toast && (
                <motion.p
                  key={fx.unlock?.key}
                  className={styles.toast}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="status"
                >
                  <span className={styles.toastIcon}>
                    <SparkleIcon size={16} />
                  </span>
                  {toast}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* 모바일 오른쪽 옆 버튼 3개 (데스크톱은 오른쪽 패널이 같은 일을 한다) */}
          <div className={styles.side}>
            <button type="button" className={styles.sideBtn} aria-label="해금 목록" onClick={() => setSheet("unlocks")}>
              <GiftIcon size={24} />
              {newUnlocks > 0 && <span className={styles.badge}>{newUnlocks}</span>}
            </button>
            <button type="button" className={styles.sideBtn} aria-label="펫 정보" onClick={() => setSheet("info")}>
              <InfoIcon size={24} />
            </button>
            <button type="button" className={styles.sideBtn} aria-label="공유" onClick={() => void share(petId)}>
              <ShareIcon size={24} />
            </button>
          </div>

          <PetCard pet={pet} isOwner={isOwner} fx={fx} className={styles.stage} />

          {/* SPEC 12장: 주인이면 행동 버튼, 아니면 버튼 없이 읽기 전용. TODO 2단계: 시안 11 구경 화면 */}
          {isOwner ? (
            <div className={styles.tray}>
              <PetActions petId={id} pet={pet} onEffect={fx.play} />
            </div>
          ) : (
            <p className={styles.readonly}>다른 집사의 펫이에요. 구경만 할 수 있어요</p>
          )}
        </div>

        {/* 데스크톱 오른쪽 패널 (모바일에서는 CSS로 숨기고 "펫 정보" 시트로 연다) */}
        <PetPanel {...panelProps} className={styles.panel} />
      </main>

      <Sheet open={sheet === "info"} onClose={() => setSheet(null)} title={`Mochi #${petId}`}>
        <PetPanel {...panelProps} flat />
      </Sheet>
      {/* TODO 2단계: 시안 16 / D16 해금 목록 모양으로 */}
      <Sheet open={sheet === "unlocks"} onClose={() => setSheet(null)} title="해금 목록">
        <UnlockList level={level} />
      </Sheet>

      {/* * 진화/부화: 화면 전체를 덮는 연출 (position: fixed). 무대 안에 두지 않는 이유는
            overflow: hidden이나 움직이는(transform) 조상 안에 있으면 fixed가 화면 기준이 아니게 되기 때문이다.
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

/**
 * 공유: 휴대폰은 OS 공유 창(navigator.share), 없으면 주소를 클립보드에 복사한다.
 * ? 사용자가 공유 창을 닫으면 share()가 AbortError로 실패한다. 실패가 아니라 "취소"라서 조용히 넘긴다.
 */
async function share(petId: string) {
  const url = window.location.href;
  try {
    if (navigator.share) await navigator.share({ title: `Mochi #${petId} · Mochimals`, url });
    else await navigator.clipboard.writeText(url);
  } catch {
    // 취소 또는 권한 없음: 할 일 없음
  }
}

// 없는 펫 번호인지: ownerOf가 OZ의 ERC721NonexistentToken으로 revert했는지 본다 (errors.ts와 같은 walk 방식)
function isNonexistent(error: Error): boolean {
  if (!(error instanceof BaseError)) return false;
  const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
  return reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName === "ERC721NonexistentToken";
}
