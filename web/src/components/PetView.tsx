// * 내 펫 화면 본문 (4강, 리디자인 시안 02 / D2 기본, 06 진행 중, 07 레벨업, 08·09 부화·진화, 10 배고픔·실패, 11 구경, 16 해금 목록).
//
//   모바일 (~900px)                       데스크톱 (900px~)
//   ┌─────────────────────┐               ┌──────────────────────────────┬──────────┐
//   │ PetHud (링·이름·활동력·계정)│        │ PetHud                        │ PetPanel │
//   │ 알림 줄(진행·배고픔·실패) [옆 버튼]│  │ 알림 줄                       │ (상태·해금│
//   │        PetCard (펫)        │          │          PetCard (펫)         │  ·정보)  │
//   │ PetActions (밥 | 훈련)     │          │     PetActions (트레이)       │          │
//   └─────────────────────┘ + 탭 바     └──────────────────────────────┴──────────┘
//
//   이 파일이 직접 하는 일: 로딩/에러/없는 펫, 주인 여부, 쓰기 훅(usePetAction)과 연출 상태(usePetEffect) 보관,
//   알림 줄, 레벨업·진화 연출, 시트 열고 닫기.
"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useMemo, useState } from "react";
import { isAddressEqual } from "viem";
import { useAccount } from "wagmi";
import { useHungerTimer } from "@/hooks/useHungerTimer";
import { usePet, type PetState } from "@/hooks/usePet";
import { usePetAction, type PetActionArgs } from "@/hooks/usePetAction";
import { usePetEffect } from "@/hooks/usePetEffect";
import { toPetEffect } from "@/lib/effects";
import { isNonexistentToken, toErrorMessage } from "@/lib/errors";
import { STAGE_NAME, type Stage } from "@/lib/look";
import { currentTitle, sceneFor, unlocksAt, unlockToast } from "@/lib/unlocks";
import { EvolveOverlay } from "./EvolveOverlay";
import { CloseIcon, GiftIcon, HeartIcon, InfoIcon, ShareIcon, SparkleIcon } from "./icons";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { NotFoundView } from "./NotFoundView";
import { Notice } from "./Notice";
import { PetActions } from "./PetActions";
import { PetCard } from "./PetCard";
import { PetHud } from "./PetHud";
import { PetPanel } from "./PetPanel";
import { Sheet } from "./Sheet";
import { Spinner } from "./Spinner";
import { StatusCard } from "./StatusCard";
import { StepPills } from "./StepPills";
import { openedCount, UnlockList } from "./UnlockList";
import { VisitorCard } from "./VisitorCard";
import styles from "./PetView.module.scss";

type Props = { petId: string };

export function PetView({ petId }: Props) {
  // useMemo: 렌더마다 BigInt를 새로 만들 필요는 없지만, 그보다 "같은 값"을 훅에 넘긴다는 의도를 드러낸다.
  //   bigint는 원시값이라 매번 새로 만들어도 === 비교가 같아서 쿼리 키는 바뀌지 않는다.
  const id = useMemo(() => BigInt(petId), [petId]);
  const { address } = useAccount();
  // refetch: 캐시를 무시하고 지금 다시 읽는다. 배고파지는 순간(useHungerTimer)에 부른다.
  const { data: pet, isPending, error, refetch } = usePet(id, address);

  // ① 로딩: 첫 읽기 전 (시안 12 "불러오는 중"). 다시 읽는 중에는 isPending이 아니라 isFetching이라 옛 데이터가 계속 보인다
  if (isPending) {
    return (
      <main className={styles.message}>
        <StatusCard kind="loading" title="불러오는 중" detail={`Mochi #${petId}를 찾고 있어요`} />
      </main>
    );
  }

  // ② 에러: 없는 펫이면 ownerOf가 revert한다 (usePet의 allowFailure: false) → 시안 12 404 화면
  if (error) {
    if (isNonexistentToken(error)) return <NotFoundView title={`Mochi #${petId}는 아직 없어요`} />;
    return (
      <main className={styles.message}>
        <StatusCard
          kind="error"
          title="불러오지 못했어요"
          detail="네트워크를 확인하고 다시 시도해 주세요"
          onRetry={() => void refetch()}
        />
      </main>
    );
  }

  // ③ 주인 여부. 연결 안 됐으면 false.
  //   ! 주소는 === 로 비교하지 않는다. 체크섬 형식(0xAbC…)과 소문자(0xabc…)가 섞이면 같은 주소인데 false가 된다.
  const isOwner = !!address && isAddressEqual(address, pet.owner);

  return <PetScreen petId={petId} id={id} pet={pet} isOwner={isOwner} onHungry={() => void refetch()} />;
}

// 알림 줄 문구에 쓰는 행동 이름
const ACTION_NAME: Record<PetActionArgs["fn"], string> = { feed: "밥", train: "훈련", refill: "충전", adopt: "입양" };
// 시안 06의 진행 단계
const TX_STEPS = ["지갑 서명", "블록 확정", "반영"] as const;

/**
 * 데이터가 다 있을 때의 화면.
 * ? 왜 PetView에서 나눴을까? 훅(useHungerTimer, usePetEffect, useState)은 조건문(로딩 중이면 return) 뒤에서 부를 수 없다
 *   (React 훅 규칙: 렌더마다 같은 순서로 호출). pet이 확실히 있는 이 컴포넌트에서 부르면 조건 없이 부를 수 있다.
 */
function PetScreen(props: { petId: string; id: bigint; pet: PetState; isOwner: boolean; onHungry: () => void }) {
  const { petId, id, pet, isOwner, onHungry } = props;
  // * 연출 상태 (XP 숫자, 레벨업, 진화, 새 해금 알림)
  const fx = usePetEffect();
  // * 쓰기 훅. 버튼(PetActions)과 알림 줄(진행 중·실패)이 같은 상태를 봐야 해서 여기서 만든다.
  const action = usePetAction({
    // * 행동이 끝나면(다시 읽기까지 끝난 뒤) 이벤트를 연출 데이터로 바꿔 튼다.
    //   usePetAction의 confirm이 invalidateQueries를 await한 뒤라, 연출이 시작될 때 화면 수치는 이미 새 값이다.
    onDone: ({ events }) => fx.play(toPetEffect(events)),
    // 새로고침 뒤 이어받을 행동: 이 펫의 밥/훈련, 또는 충전 (충전은 지갑 단위라 어느 펫 화면에서든)
    resumeIf: (a) => a.fn === "refill" || ((a.fn === "feed" || a.fn === "train") && a.petId === id),
  });
  // 배고파지기까지 남은 밀리초. HUD("23:57 남음")와 패널("23시간 57분 남음")이 같은 값을 쓴다
  const hungryInMs = useHungerTimer(pet.lastFedAt, pet.hungry, onHungry);
  // 지금 열린 시트 (모바일 "펫 정보" / 어디서나 "해금 목록")
  const [sheet, setSheet] = useState<"info" | "unlocks" | null>(null);

  const level = Number(pet.level);
  // 이름판 아랫줄: 칭호(Lv 4~)가 있으면 칭호, 없으면 단계 이름 ("알", "아기")
  const subtitle = currentTitle(level) ?? STAGE_NAME[pet.stage as Stage];
  // 진화/부화 연출 (EvolveOverlay). 단계가 바뀐 레벨업일 때만 effects.ts가 evolve를 채운다.
  const evolve = fx.current?.effect.evolve ?? null;
  // 레벨업 연출 (LevelUpOverlay). 단계 그대로일 때만 (진화면 usePetEffect가 levelUp을 비운다)
  const levelUp = fx.current?.effect.levelUp ?? null;
  // 새 해금 알림 (레벨업 직후 6초, usePetEffect의 unlock). 레벨업 연출 중에는 연출 안의 보상 알약이 대신한다
  const toast = fx.unlock && levelUp === null ? unlockToast(fx.unlock.level) : null;
  // 해금 버튼의 빨간 숫자 = 방금 열린 해금 개수 (알림이 떠 있는 동안만)
  const newUnlocks = fx.unlock ? unlocksAt(fx.unlock.level).length : 0;

  // 진행 중 (시안 06): 확인·서명 = 1단계, 블록 확정 = 2단계
  const busy = isOwner && action.phase !== "idle";
  const pressed = action.pendingArgs?.fn;
  const step = action.phase === "confirming" ? 1 : 0;
  // 실패 문구. 지갑 거절이면 null (errors.ts) → 알림 없음. 다음 행동을 누르면 useMutation이 error를 지운다
  const errorText = isOwner && action.error ? toErrorMessage(action.error) : null;

  // * 모바일 옆 버튼은 진행 중·레벨업 연출 중에만 숨긴다 (시안 06·07에는 옆 버튼이 없다).
  //   ? 시안 10(배고픔·실패)에도 없지만, 배고픈 동안 해금 목록·정보를 못 여는 건 기능 손실이라 남겨 둔다 (알림은 옆 버튼 폭만큼 좁아진다)
  const showSide = isOwner && !busy && levelUp === null;

  const panelProps = { petId, pet, isOwner, hungryInMs, onOpenUnlocks: () => setSheet("unlocks") };

  return (
    // * MotionConfig reducedMotion="user": OS의 "동작 줄이기"(prefers-reduced-motion)가 켜져 있으면
    //   Motion이 위치·크기·회전(transform) 애니메이션을 건너뛰고 opacity 같은 나머지만 튼다.
    //   SPEC 12장 "prefers-reduced-motion이면 페이드만"을 컴포넌트마다 분기하지 않고 여기 한 줄로 처리한다.
    <MotionConfig reducedMotion="user">
      {/* data-fit: 데스크톱에서 화면 높이에 맞춘다 (layout.module.scss의 .shell:has([data-fit]))
          data-scene: 레벨별 장면 (해금 배경, lib/unlocks.ts sceneFor). 화면 전체 배경은 layout의 .shell이 이걸 보고 바꾼다 */}
      <main className={styles.main} data-fit data-scene={sceneFor(level)}>
        <div className={styles.play}>
          <PetHud petId={petId} pet={pet} subtitle={subtitle} hungryInMs={hungryInMs} isOwner={isOwner} />

          {/* * 알림 줄 (시안 02 해금, 06 진행 중, 10 배고픔·실패). 자리는 늘 비워 둬서 떴다 사라질 때 펫이 들썩이지 않는다 */}
          <div className={showSide ? styles.noticesNarrow : styles.notices}>
            {busy && pressed && (
              <>
                <Notice icon={<Spinner size={22} />} trailing={<span className={styles.stepCount}>{step + 1}/3</span>}>
                  {action.phase === "confirming"
                    ? `${ACTION_NAME[pressed]} 기록 중 · 블록 확정을 기다려요`
                    : `${ACTION_NAME[pressed]} · 지갑에서 서명을 기다려요`}
                </Notice>
                <StepPills steps={TX_STEPS} active={step} />
              </>
            )}
            {!busy && isOwner && pet.hungry && (
              <Notice
                tone="hungry"
                icon={
                  <span className={styles.chipPink}>
                    <HeartIcon size={16} />
                  </span>
                }
              >
                배고파서 훈련 효과가 절반이에요
              </Notice>
            )}
            {!busy && errorText && (
              <Notice
                tone="error"
                role="alert"
                icon={
                  <span className={styles.errorIcon}>
                    <CloseIcon size={14} />
                  </span>
                }
              >
                {errorText}
              </Notice>
            )}
            <AnimatePresence>
              {!busy && toast && (
                <motion.div
                  key={fx.unlock?.key}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Notice
                    icon={
                      <span className={styles.chipLime}>
                        <SparkleIcon size={16} />
                      </span>
                    }
                    onClick={() => setSheet("unlocks")}
                  >
                    {toast}
                  </Notice>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 모바일 오른쪽 옆 버튼 3개 (데스크톱은 오른쪽 패널이 같은 일을 한다) */}
          <div className={styles.side} hidden={!showSide}>
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

          <div className={styles.stageWrap}>
            <PetCard pet={pet} isOwner={isOwner} fx={fx} className={styles.stage} />
            {/* * 레벨업 연출 (시안 07): 무대 위에 리본·큰 링·+XP·보상 알약을 겹친다 */}
            <AnimatePresence>
              {levelUp !== null && (
                <LevelUpOverlay
                  key={fx.current?.key}
                  level={levelUp}
                  xpGained={fx.current?.effect.xpGained ?? null}
                  onOpenUnlocks={() => setSheet("unlocks")}
                  onDone={() => fx.clear("levelUp")}
                />
              )}
            </AnimatePresence>
          </div>

          {/* SPEC 12장: 주인이면 행동 버튼, 아니면 구경 카드 (시안 11) */}
          {isOwner ? (
            <div className={styles.tray}>
              <PetActions petId={id} pet={pet} action={action} />
            </div>
          ) : (
            <VisitorCard className={styles.visitorMobile} />
          )}
        </div>

        {/* 데스크톱 오른쪽 패널 (모바일에서는 CSS로 숨기고 "펫 정보" 시트로 연다) */}
        <PetPanel {...panelProps} className={styles.panel} />
      </main>

      <Sheet open={sheet === "info"} onClose={() => setSheet(null)} title={`Mochi #${petId}`}>
        <PetPanel {...panelProps} flat />
      </Sheet>
      {/* 시안 16 / D16 해금 목록: 데스크톱은 720px 두 줄 */}
      <Sheet
        open={sheet === "unlocks"}
        onClose={() => setSheet(null)}
        title="해금 목록"
        titleSuffix={
          <>
            {openedCount(level)}
            <span className={styles.dim}>/24</span>
          </>
        }
        wide
      >
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
          level={level}
          petId={petId}
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
