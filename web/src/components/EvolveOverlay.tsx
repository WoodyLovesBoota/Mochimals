// * 진화·부화 연출 (4강 7교시 4부, SPEC 12장 연출 표).
//   진화: 화면이 어두워지고 → 펫이 흰 실루엣으로 빛나며 커진 뒤 → 새 모습과 단계 이름 공개. 3초, 건너뛰기 가능.
//   부화: 진화의 특수한 경우 (알 → 아기). 알이 흔들리다 깨지며 종을 공개한다.
//   ! 이 컴포넌트가 뜰 때 화면 뒤의 펫 카드는 이미 새 단계다 (usePetAction의 무효화가 먼저 끝났기 때문, PetActions 33~36줄).
//     그래서 "이전 모습"은 from 단계로 다시 그려서 보여준다. dna가 같으면 종·색·무늬는 같고 단계만 다르다.
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { getPetLook, SPECIES_NAME, STAGE_NAME, type Stage } from "@/lib/look";
import styles from "./EvolveOverlay.module.scss";
import { PetSprite } from "./PetSprite";

// * 시간표 (ms). 전체 3초 (SPEC). 공개 시점까지는 이전 모습, 그 뒤는 새 모습.
const REVEAL_AT = 1_800;
const DONE_AT = 3_200; // 공개 문구를 읽을 시간을 조금 더 준다 (3초 + 마지막 페이드)

type Props = {
  dna: number;
  from: Stage;
  to: Stage;
  /** 끝났거나 건너뛰었을 때. usePetEffect.clear("evolve")로 연결된다 */
  onDone: () => void;
};

export function EvolveOverlay({ dna, from, to, onDone }: Props) {
  // false: 이전 모습이 빛나는 중 / true: 새 모습 공개
  const [revealed, setRevealed] = useState(false);
  const skipRef = useRef<HTMLButtonElement>(null);
  const hatch = from === 0; // 알에서 나오면 부화

  // 이전/새 모습. 표정: 이전은 idle(실루엣이라 안 보임), 새 모습은 excited (레벨업 직후 표정과 맞춤)
  const before = getPetLook({ dna, stage: from, emotion: "idle" });
  const after = getPetLook({ dna, stage: to, emotion: "excited" });

  // * 시간표대로 진행. 타이머 두 개를 걸고, 건너뛰기나 페이지 이동으로 사라지면 cleanup에서 지운다.
  useEffect(() => {
    const reveal = setTimeout(() => setRevealed(true), REVEAL_AT);
    const done = setTimeout(onDone, DONE_AT);
    return () => {
      clearTimeout(reveal);
      clearTimeout(done);
    };
    // onDone은 부모가 매 렌더 새로 만드는 함수일 수 있다. 의존성에 넣으면 렌더마다 타이머가 처음부터 다시 걸린다.
    //   "처음 떴을 때 한 번"이 의도라서 빈 배열로 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // * 접근성: 뜨자마자 건너뛰기 버튼에 포커스 → 키보드 사용자가 Enter로 바로 건너뛸 수 있다. Esc도 건너뛰기.
  useEffect(() => {
    skipRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  // 공개 문구. 부화면 종 이름(SPEC: "알이 깨지며 종 공개"), 진화면 새 단계 이름
  const title = hatch ? `${SPECIES_NAME[after.species]} 탄생!` : `${STAGE_NAME[to]}(으)로 진화!`;

  return (
    // * 어두운 배경이 서서히 깔린다. position: fixed라 화면 전체를 덮는다.
    //   role="dialog" + aria-modal: 보조기기에 "지금은 이 창만 보라"고 알린다.
    <motion.div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={hatch ? "부화" : "진화"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.stage}>
        {/* * mode="wait": 이전 요소의 exit가 끝난 뒤에 다음 요소가 들어온다 (겹치지 않게) */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="before"
              // * 흰 실루엣: CSS filter로 그림을 검게(brightness 0) 만든 뒤 뒤집어(invert) 흰색으로, 둘레에 빛(drop-shadow)
              className={styles.silhouette}
              initial={{ scale: 1 }}
              // 부화: 알이 좌우로 흔들린다 (rotate 키프레임). 진화: 숨 쉬듯 커지며 빛난다.
              //   reduced-motion이면 scale/rotate는 건너뛰고 아래 exit의 opacity만 남는다
              animate={
                hatch ? { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1, 1.1] } : { scale: [1, 1.08, 1, 1.15, 1.3] }
              }
              // ! exit에 transition을 따로 주지 않으면 아래 transition(1.6초)을 그대로 써서, 공개 문구가 먼저 뜨고
              //   이전 모습이 한참 늦게 사라진다 (mode="wait"라 새 모습도 그만큼 늦게 나온다). 짧게 터지듯 사라지게 한다.
              exit={{ opacity: 0, scale: 1.5, transition: { duration: 0.25 } }}
              transition={{ duration: REVEAL_AT / 1000 - 0.2, ease: "easeInOut" }}
            >
              <PetSprite look={before} size={240} />
            </motion.div>
          ) : (
            <motion.div
              key="after"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <PetSprite look={after} size={240} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 공개 문구: 새 모습과 같이 나타난다. role="status"로 스크린리더가 읽는다 */}
      <p className={styles.title} role="status">
        {revealed ? title : hatch ? "알이 흔들려요…" : "몸이 빛나기 시작했어요…"}
      </p>

      <button ref={skipRef} className={styles.skip} onClick={onDone}>
        건너뛰기
      </button>
    </motion.div>
  );
}
