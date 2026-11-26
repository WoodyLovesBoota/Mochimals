// * 레벨업 연출 (리디자인 시안 07 / D7). 펫 무대 위에 겹친다 (PetView의 .stageWrap 안, position: absolute).
//   리본 "레벨 업!" → 큰 레벨 링 → "+40 XP" → 보상 알약 "Lv 8 보상 · 스카프를 받았어요!" + 빛줄기·색종이.
//   진화가 아닌 레벨업일 때만 뜬다 (진화면 EvolveOverlay). 2.6초 뒤 저절로 닫히고, "건너뛰기"·Esc로 바로 닫을 수 있다.
//   ! 동작 줄이기: MotionConfig(PetView)가 transform을 건너뛰어 페이드만 남고, 색종이·빛줄기 CSS 애니메이션도 멈춘다.
"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { unlockReward } from "@/lib/unlocks";
import { Burst, Confetti } from "./Confetti";
import { ChevronRightIcon, ShirtIcon } from "./icons";
import { LevelRing } from "./LevelRing";
import { Ribbon } from "./Ribbon";
import styles from "./LevelUpOverlay.module.scss";

// 레벨업 연출 길이 (SPEC 12장은 1.5초. 리디자인에서 리본·보상을 읽을 시간을 더 줬다)
const LEVEL_UP_MS = 2_600;

type Props = {
  level: number;
  /** 이번 행동으로 얻은 XP (+10 / +40 / +20). 없으면 숨김 */
  xpGained: number | null;
  /** 보상 알약을 누르면 해금 목록 시트를 연다 */
  onOpenUnlocks: () => void;
  /** 끝났거나 건너뛰었을 때 → usePetEffect.clear("levelUp") */
  onDone: () => void;
};

export function LevelUpOverlay({ level, xpGained, onOpenUnlocks, onDone }: Props) {
  const reward = unlockReward(level);

  // * onDone을 ref에 담는다. 부모가 렌더마다 새 함수(() => fx.clear(...))를 넘겨도 타이머가 다시 걸리지 않게.
  //   (useEffect 의존성에 onDone을 넣으면 부모가 다시 그릴 때마다 2.6초가 처음부터 다시 센다)
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  // 저절로 닫기 + Esc로 닫기 (처음 한 번만 건다)
  useEffect(() => {
    const timer = setTimeout(() => doneRef.current(), LEVEL_UP_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") doneRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    // * 이 상자에는 z-index를 주지 않는다 (쌓임 맥락을 만들지 않게).
    //   그래야 빛줄기(.back, z-index 0)는 펫(무대, z-index 1) 뒤로, 리본·링·보상(.front, z-index 2)은 앞으로 갈 수 있다.
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="status"
      aria-label={`레벨 업! Lv ${level}`}
    >
      <motion.div
        className={styles.back}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Burst size={560} />
      </motion.div>
      <div className={styles.front}>
        <Confetti />

        <button type="button" className={styles.skip} onClick={onDone}>
          건너뛰기
        </button>

        <div className={styles.top}>
          {/* 리본·링은 위에서 톡 튀어나온다 (동작 줄이기면 scale 없이 페이드) */}
          <motion.div
            initial={{ scale: 0.6, y: -12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 16 }}
          >
            <Ribbon as="p">레벨 업!</Ribbon>
          </motion.div>
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: [0.5, 1.15, 1] }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <LevelRing level={level} percent={0} size={92} />
          </motion.div>
        </div>

        {xpGained !== null && (
          <motion.span
            className={styles.xp}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            aria-hidden
          >
            +{xpGained} XP
          </motion.span>
        )}

        {reward && (
          <motion.button
            type="button"
            className={styles.reward}
            onClick={onOpenUnlocks}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <span className={styles.rewardIcon}>
              <ShirtIcon size={18} />
            </span>
            <span className={styles.rewardText}>{reward}</span>
            <ChevronRightIcon size={16} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
