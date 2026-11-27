// * 진화·부화 연출 (4강 7교시 4부, 리디자인 시안 08 / D8 부화, 09 / D9 진화).
//   화면 전체를 밤 장면으로 덮는다: ① 흔들림(1.8초) → ② 공개: 리본 "부화!"/"진화!" + 새 모습 + "New unlocks" 카드 + "Nice!"
//   닫기: "Nice!", 오른쪽 위 "Skip", Esc. (공개 뒤에는 저절로 닫히지 않는다: 카드를 읽을 시간을 준다)
//   ! 동작 줄이기: MotionConfig(PetView)가 transform을 건너뛰어 흔들림·튀어나옴 없이 페이드만 남는다. 빛줄기·색종이도 멈춘다.
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { openseaUrl } from "@/lib/links";
import { getPetLook, SPECIES_NAME, STAGE_NAME, type Stage } from "@/lib/look";
import { unlocksAt } from "@/lib/unlocks";
import { Burst, Confetti } from "./Confetti";
import { ChevronRightIcon, ExternalIcon, HeartIcon, SparkleIcon } from "./icons";
import { PetSprite } from "./PetSprite";
import { Ribbon } from "./Ribbon";
import { UnlockIcon } from "./UnlockIcon";
import styles from "./EvolveOverlay.module.scss";

// 흔들림이 끝나고 새 모습이 나오는 시각 (SPEC 12장: 진화 연출 3초 중 앞부분)
const REVEAL_AT = 1_800;

type Props = {
  dna: number;
  from: Stage;
  to: Stage;
  /** 지금 레벨 (그 레벨에서 함께 열린 해금을 카드에 보여준다) */
  level: number;
  petId: string;
  /** "Nice!"·Skip·Esc → usePetEffect.clear("evolve") */
  onDone: () => void;
};

export function EvolveOverlay({ dna, from, to, level, petId, onDone }: Props) {
  const [revealed, setRevealed] = useState(false);
  const skipRef = useRef<HTMLButtonElement>(null);
  const hatch = from === 0; // 알에서 나오면 부화

  const before = getPetLook({ dna, stage: from, emotion: "idle" });
  const after = getPetLook({ dna, stage: to, emotion: "excited" });
  const species = SPECIES_NAME[after.species];

  // onDone을 ref로 (부모가 렌더마다 새 함수를 넘겨도 Esc 리스너를 다시 걸지 않게)
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  // ① → ② 공개 타이머
  useEffect(() => {
    const reveal = setTimeout(() => setRevealed(true), REVEAL_AT);
    return () => clearTimeout(reveal);
  }, []);

  // * 키보드: 열리자마자 "Skip"에 포커스 (Enter/Space로 바로 닫을 수 있게) + Esc로 닫기
  useEffect(() => {
    skipRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") doneRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 공개 문구 (시안: "개구리가 태어났어요!", "어린이가 됐어요!")
  const title = hatch ? `A ${species} was born!` : to === 4 ? "Awakened!" : `Evolved into ${STAGE_NAME[to]}!`;

  // * "New unlocks" 카드의 줄. 부화는 시안 그대로 두 줄, 진화는 새 모습 + 같은 레벨의 다른 해금
  const items: { key: string; icon: React.ReactNode; label: string }[] = hatch
    ? [
        { key: "species", icon: <Chip tone="lime" icon={<SparkleIcon size={18} />} />, label: `Species revealed · ${species}` },
        { key: "face", icon: <Chip tone="pink" icon={<HeartIcon size={18} />} />, label: "Now shows emotions" },
      ]
    : [
        { key: "look", icon: <Chip tone="lime" icon={<SparkleIcon size={18} />} />, label: `${STAGE_NAME[to]} look` },
        ...unlocksAt(level)
          .filter((u) => u.kind !== "evolve")
          .map((u) => ({ key: u.label, icon: <UnlockIcon kind={u.kind} />, label: u.label })),
      ];
  const opensea = openseaUrl(petId);

  return (
    <motion.div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={hatch ? "Hatch" : "Evolution"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Burst size={620} />
      {revealed && <Confetti />}

      <button ref={skipRef} type="button" className={styles.skip} onClick={() => doneRef.current()}>
        Skip
      </button>

      {/* 리본: 공개 뒤에 튀어나온다 */}
      <div className={styles.ribbonSlot}>
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
            >
              <Ribbon as="p" size="lg">
                {hatch ? "Hatch!" : "Evolve!"}
              </Ribbon>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.stage}>
        {/* * mode="wait": 이전 요소의 exit가 끝난 뒤에 다음 요소가 들어온다 (겹치지 않게) */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="before"
              className={styles.silhouette}
              initial={{ scale: 1 }}
              animate={
                hatch ? { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1, 1.1] } : { scale: [1, 1.08, 1, 1.15, 1.3] }
              }
              exit={{ opacity: 0, scale: 1.5, transition: { duration: 0.25 } }}
              transition={{ duration: REVEAL_AT / 1000 - 0.2, ease: "easeInOut" }}
            >
              <PetSprite look={before} size={320} className={styles.sprite} />
            </motion.div>
          ) : (
            <motion.div
              key="after"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <PetSprite look={after} size={320} className={styles.sprite} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.bottom}>
        {/* 공개 문구. role="status"로 스크린리더가 읽는다 */}
        <p className={styles.title} role="status">
          {revealed ? title : hatch ? "The egg is wobbling…" : "It's starting to glow…"}
        </p>

        <AnimatePresence>
          {revealed && (
            <motion.div
              className={styles.reveal}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              {/* 단계 알약: "알 › 아기 · 개구리" / "아기 › 어린이" */}
              <div className={styles.stages}>
                <span className={styles.stageFrom}>{STAGE_NAME[from]}</span>
                <ChevronRightIcon size={18} />
                <span className={styles.stageTo}>{hatch ? `${STAGE_NAME[to]} · ${species}` : STAGE_NAME[to]}</span>
              </div>

              <div className={styles.card}>
                <span className={styles.cardTitle}>New unlocks</span>
                <ul className={styles.items}>
                  {items.map((it) => (
                    <li key={it.key}>
                      {it.icon}
                      {it.label}
                    </li>
                  ))}
                </ul>
                {opensea && (
                  <a className={styles.nft} href={opensea} target="_blank" rel="noreferrer">
                    The NFT image has been updated too · OpenSea <ExternalIcon size={12} />
                  </a>
                )}
              </div>

              <button type="button" className={styles.ok} onClick={() => doneRef.current()}>
                Nice!
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* 화면 낭독용: 진화 단계 문장 */}
      <span className={styles.srOnly}>
        {hatch ? `Hatched into a ${species}` : `Evolved into ${STAGE_NAME[to]}`}
      </span>
    </motion.div>
  );
}

function Chip({ tone, icon }: { tone: "lime" | "pink"; icon: React.ReactNode }) {
  return <span className={tone === "lime" ? styles.chipLime : styles.chipPink}>{icon}</span>;
}
