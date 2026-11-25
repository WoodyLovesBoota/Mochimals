// * 레벨업 연출의 장식 두 가지: "Lv 5!" 배지와 별 파티클 (4강 7교시 3부, SPEC 12장 연출 표 "레벨업 1.5초").
//   펫이 통통 튀는 건 그림을 감싼 PetCard가 맡는다 (그림 요소를 직접 움직여야 해서).
//   이 파일은 무대(.stage) 위에 겹쳐 그리는 것만 있다. 무대가 position: relative라 absolute로 띄운다.
"use client";

import { motion } from "motion/react";
import styles from "./LevelUpFx.module.scss";

// 레벨업 연출 전체 길이 (SPEC 12장: 1.5초)
export const LEVEL_UP_SECONDS = 1.5;

/**
 * "Lv 5!" 배지. 튀어나와서 잠시 머물다 사라진다.
 * @param onDone 다 끝나면 부른다 → usePetEffect.clear("levelUp") → 배지와 별이 DOM에서 빠진다
 */
export function LevelUpBadge({ level, onDone }: { level: number; onDone: () => void }) {
  return (
    <motion.div
      className={styles.badge}
      // * 키프레임: 배열을 주면 값이 그 순서대로 바뀐다. times는 각 값에 도착하는 시점(0~1, 전체 길이 기준 비율).
      //   opacity: 0 → 1(0.15초) → 1 유지 → 0(마지막 0.3초). scale: 작게 시작해 살짝 크게 튀었다가 1로.
      //   ? reduced-motion이면? scale은 transform이라 Motion이 건너뛰고, opacity만 남는다 → "페이드만" (PetView MotionConfig)
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.15, 1, 1] }}
      transition={{ duration: LEVEL_UP_SECONDS, times: [0, 0.1, 0.8, 1] }}
      onAnimationComplete={onDone}
      // * role="status": 화면 장식이지만 "레벨이 올랐다"는 정보는 스크린리더에도 알려준다 (alert보다 덜 끼어드는 방식)
      role="status"
    >
      Lv {level}!
    </motion.div>
  );
}

// 별 개수와 날아가는 거리(px)
const STAR_COUNT = 8;
const STAR_DISTANCE = 110;

// * 별마다 방향(각도)을 미리 계산해 둔다. 컴포넌트 밖 상수라 렌더마다 다시 계산하지 않는다.
//   각도 i × 45°로 8방향에 고르게 뿌린다. cos/sin으로 (x, y) 끝점을 구한다 (화면 y는 아래가 +라서 위쪽 별은 y가 음수).
const STARS = Array.from({ length: STAR_COUNT }, (_, i) => {
  const angle = (i / STAR_COUNT) * Math.PI * 2;
  return { x: Math.cos(angle) * STAR_DISTANCE, y: Math.sin(angle) * STAR_DISTANCE };
});

/** 별 파티클: 펫 가운데에서 8방향으로 퍼지며 사라진다. 배지와 같이 나타나고 같이 빠진다 (끝 처리는 배지가 한다). */
export function StarBurst() {
  return (
    // aria-hidden: 순수 장식. 스크린리더에는 배지의 role="status"만 읽힌다
    <div className={styles.burst} aria-hidden>
      {STARS.map((s, i) => (
        <motion.span
          key={i}
          className={styles.star}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          // reduced-motion이면 x/y/scale은 건너뛰고 opacity만: 가운데에서 그대로 흐려진다
          animate={{ x: s.x, y: s.y, opacity: 0, scale: 1 }}
          // 별은 배지보다 조금 빨리(1.2초) 끝난다. ease "easeOut": 처음에 빠르게 튀어 나가고 끝에서 느려진다
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          ★
        </motion.span>
      ))}
    </div>
  );
}
