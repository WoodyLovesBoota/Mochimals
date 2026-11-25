// * 펫 카드: 무대(그림 + 연출) + 이름·레벨·칭호·칩 (4강). PetView에서 분리했다 (SPEC 2장 구조의 PetCard).
//   이 파일이 그리는 연출: XP 숫자, 레벨업(튀기·배지·별), 새 해금 카드, 배고픔(축 처짐·말풍선), 춤(Lv 16).
//   진화/부화는 화면 전체를 덮어서 PetView가 따로 그린다 (EvolveOverlay).
"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { ACTIVE_ART_SET } from "@/art";
import type { PetState } from "@/hooks/usePet";
import type { usePetEffect } from "@/hooks/usePetEffect";
import {
  COLOR_NAME,
  getPetLook,
  PERSONALITY_NAME,
  SPECIES_NAME,
  STAGE_NAME,
  type Emotion,
  type Stage,
} from "@/lib/look";
import { canDance, currentBackground, currentTitle, unlocksAt } from "@/lib/unlocks";
import { LevelUpBadge, StarBurst } from "./LevelUpFx";
import styles from "./PetCard.module.scss";
import { PetSprite } from "./PetSprite";

type Props = {
  petId: string;
  pet: PetState;
  isOwner: boolean;
  /** usePetEffect()의 반환값. ReturnType으로 타입을 따로 선언하지 않고 훅에서 가져온다 */
  fx: ReturnType<typeof usePetEffect>;
};

export function PetCard({ petId, pet, isOwner, fx }: Props) {
  // * 표정. SPEC 5장 우선순위: excited > happy (연출 훅이 잠시 덮어씀) > hungry > sleepy > idle (컨트랙트 값)
  //   ?? : 왼쪽이 null/undefined일 때만 오른쪽을 쓴다. 연출 표정이 없으면 기본 규칙으로.
  const emotion = fx.emotion ?? pickEmotion(pet, isOwner);
  const xpGained = fx.current?.effect.xpGained ?? null;
  // * 레벨업 연출 (배지, 별, 튀기). 단계가 바뀐 레벨업이면 usePetEffect.play가 levelUp을 비워서 여기 안 온다.
  //   그때는 진화 연출(EvolveOverlay, PetView)이 대신 튼다 (SPEC 12장: 레벨업은 "단계 그대로"일 때).
  const levelUp = fx.current?.effect.levelUp ?? null;

  // * 펫 통통 튀기. scope = 움직일 요소에 붙일 ref, animate = 그 요소를 명령형으로 움직이는 함수.
  //   ? 왜 <motion.div animate={...}>가 아니라 useAnimate일까?
  //     animate prop은 "값이 바뀔 때만" 다시 튼다. 키프레임 배열이 매번 같으면 두 번째 레벨업에서는 안 튄다.
  //     useAnimate는 "이 연출 번호가 왔을 때 한 번 틀어라"를 useEffect로 직접 부를 수 있다.
  const [scope, animate] = useAnimate<HTMLDivElement>();
  // ! useAnimate로 직접 부르는 애니메이션은 <motion.*> 요소가 아니라서, MotionConfig reducedMotion에 기대지 않고 직접 확인한다.
  //   동작 줄이기를 켠 사람에게는 튀기를 아예 생략한다 (배지와 별의 페이드는 그대로 나온다).
  const reduceMotion = useReducedMotion();
  const fxKey = fx.current?.key;
  useEffect(() => {
    if (levelUp === null || reduceMotion) return;
    // y: 위로 크게 한 번, 작게 한 번 튀고 제자리 (px). 1.5초 중 앞 0.8초만 쓴다.
    animate(scope.current, { y: [0, -36, 0, -12, 0] }, { duration: 0.8, ease: "easeOut" });
    // levelUp은 일부러 의존성에서 뺀다: 배지가 끝나 clear("levelUp")로 null이 될 때 다시 돌 필요가 없다.
    //   "새 연출 번호(fxKey)가 왔을 때 한 번"이 의도다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fxKey]);

  // stage는 uint8이라 이미 number다 (usePet 17줄). getPetLook이 0~4를 검사한다.
  const look = getPetLook({ dna: pet.dna, stage: pet.stage, emotion });
  const stage = look.stage as Stage;
  // ? 왜 hatched를 따로 둘까? SPEC 5장: "부화(Lv 3) 전까지 종을 보여주지 않는다".
  //   dna에는 이미 종이 들어 있지만, 알(stage 0)일 때 화면 글자로는 감춘다.
  const hatched = stage > 0;

  // * 해금 적용 (lib/unlocks.ts). level은 bigint라 화면 계산 직전에 Number로 바꾼다 (최대 20이라 안전).
  const level = Number(pet.level);
  const title = currentTitle(level);
  // 배경: 해금 배경이 있으면 globals.scss의 그라데이션 변수, 없으면 아트 세트의 종별 색 (Lv 1 "기본 배경")
  const bgId = currentBackground(level);
  const stageBg = bgId ? `var(--bg-${bgId})` : ACTIVE_ART_SET.background?.(look);
  // 춤(Lv 16): 배고플 때는 안 춘다 (축 처짐과 겹치면 이상하다)
  const dancing = canDance(level) && !pet.hungry;

  // 그림 감싸는 div의 클래스: 배고프면 축 처짐, 춤 해금이면 흔들흔들 (둘 다 CSS 애니메이션, PetCard.module.scss)
  const spriteMotion = pet.hungry ? styles.droop : dancing ? styles.dance : "";

  return (
    <section className={styles.card}>
      {/* * 무대 배경은 CSS 변수로 넘긴다. 색 코드를 scss에 쓰지 않고, 아트 세트나 해금 토큰이 정한 값을 그대로 쓴다.
            값이 undefined면 scss의 기본값(var(--color-stage-fallback))을 쓴다. */}
      <div className={styles.stage} style={{ "--stage-bg": stageBg } as React.CSSProperties}>
        {/* 튀기 대상. PetSprite 자체가 아니라 감싼 div를 움직인다 (PetSprite는 그림만 알고 연출은 모르게).
            position: relative라서 말풍선을 그림 좌표 기준으로 띄울 수 있다. */}
        <div ref={scope} className={styles.spriteBox}>
          <div className={spriteMotion}>
            <PetSprite look={look} size={280} className={styles.sprite} />
          </div>

          {/* * 배고픔 말풍선 (SPEC 12장: 상시). 위치는 아트 앵커 "말풍선 꼬리 (330, 96)" (SPEC 6-2).
                400×400 좌표를 %로 바꿔 그림 크기가 바뀌어도 같은 자리에 붙는다: 330/400 = 82.5%, 96/400 = 24% */}
          {pet.hungry && (
            <p className={styles.bubble} role="status">
              배고파요…
            </p>
          )}
        </div>

        {/* * XP 숫자 (SPEC 12장: 펫 위로 +10 / +40, 0.6초).
              AnimatePresence: 자식이 사라질 때 exit 애니메이션을 끝까지 튼 뒤에 DOM에서 뺀다.
              key가 연출 번호라서, 밥을 연달아 주면 새 숫자가 처음부터 다시 떠오른다 (usePetEffect의 current.key). */}
        <AnimatePresence>
          {xpGained !== null && (
            <motion.span
              key={fx.current?.key}
              className={styles.xpFloat}
              // initial → animate: 아래에서 나타나 위로 떠오른다. reduced-motion이면 y는 건너뛰고 opacity만 바뀐다.
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: -24 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              // 다 떠오르면 숫자를 지운다 → AnimatePresence가 exit(페이드 아웃)를 튼다
              onAnimationComplete={() => fx.clear("xpGained")}
              aria-hidden // 화면 장식. 수치 변화는 XP 바(aria-valuenow)로 전달된다
            >
              +{xpGained}
            </motion.span>
          )}
        </AnimatePresence>

        {/* * 레벨업 배지 + 별 (LevelUpFx.tsx). 배지 애니메이션이 끝나면 clear("levelUp") → 둘 다 빠진다.
              fragment(<>)에는 key를 줄 수 없어서 두 요소에 각각 key를 준다. */}
        {levelUp !== null && (
          <>
            <StarBurst key={`stars-${fxKey}`} />
            <LevelUpBadge key={`badge-${fxKey}`} level={levelUp} onDone={() => fx.clear("levelUp")} />
          </>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.titleRow}>
          <div>
            {/* SPEC 12장: 이름은 Mochi #id (이름 짓기 기능은 없다) */}
            <h1 className={styles.name}>Mochi #{petId}</h1>
            {/* 칭호 (Lv 4부터, 해금표). SPEC: "칭호는 텍스트로" */}
            {title && <p className={styles.petTitle}>{title}</p>}
          </div>
          {/* level은 uint256 → bigint. 화면 표시 직전에만 글자로 바꾼다 (SPEC 8장) */}
          <span className={styles.level}>Lv {pet.level.toString()}</span>
        </div>
        <ul className={styles.chips}>
          <li>{STAGE_NAME[stage]}</li>
          <li>{hatched ? SPECIES_NAME[look.species] : "???"}</li>
          {hatched && <li>{PERSONALITY_NAME[look.personality]}</li>}
          {hatched && <li>{COLOR_NAME[look.color]}</li>}
        </ul>

        {/* * 새 해금 카드 (레벨업 직후 6초, usePetEffect의 unlock). 올라간 레벨에서 열린 것들을 보여준다. */}
        <AnimatePresence>
          {fx.unlock && (
            <motion.div
              key={fx.unlock.key}
              className={styles.unlockCard}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
            >
              <strong>Lv {fx.unlock.level} 해금</strong>
              <span>
                {unlocksAt(fx.unlock.level)
                  .map((u) => u.label)
                  .join(" · ")}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/**
 * SPEC 5장 표정 우선순위 중 컨트랙트 값으로 정하는 부분: hungry → sleepy → idle.
 * ? sleepy(활동력 0)는 왜 주인일 때만일까? pet.energy는 "펫 주인"이 아니라 "지금 보는 사람"의 잔액이다 (usePet 44줄).
 *   남의 펫을 구경하는데 내 활동력이 0이라고 그 펫이 졸면 이상하다.
 */
function pickEmotion(pet: PetState, isOwner: boolean): Emotion {
  if (pet.hungry) return "hungry";
  if (isOwner && pet.energy === 0n) return "sleepy";
  return "idle";
}
