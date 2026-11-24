// * 펫 카드 아래 수치: XP 바, 활동력 10칸, 배고픔까지 남은 시간 (4강, SPEC 12장 "내 펫" 화면).
"use client";

import { useHungerTimer } from "@/hooks/useHungerTimer";
import type { PetState } from "@/hooks/usePet";
import { levelProgress } from "@/lib/look";
import { formatRemaining } from "@/lib/time";
import styles from "./PetStats.module.scss";

// PetNFT.MAX_ENERGY = 10. 칸 수를 정한다 (constant라 컨트랙트에서 읽지 않는다. time.ts의 HUNGRY_AFTER와 같은 이유)
const MAX_ENERGY = 10;

type Props = {
  pet: PetState;
  isOwner: boolean;
  /** 배고파지는 순간 부를 함수. PetView가 usePet의 refetch를 넘긴다 */
  onHungry: () => void;
};

export function PetStats({ pet, isOwner, onHungry }: Props) {
  // ? 왜 PetView가 아니라 여기서 부를까? 훅은 조건문(로딩 중이면 return) 뒤에서 부를 수 없다 (React 훅 규칙).
  //   PetView는 pet이 아직 없을 때 먼저 return하므로, pet이 확실히 있는 이 컴포넌트에서 부른다.
  const hungryInMs = useHungerTimer(pet.lastFedAt, pet.hungry, onHungry);

  // * XP 바: 이번 레벨 구간에서 얼마나 찼는지. look.ts의 levelProgress가 컨트랙트 levelOf와 같은 식을 쓴다.
  //   예: xp 70 → Lv 2(50부터), Lv 3은 120 → current 20 / needed 70 → 29%
  const { current, needed } = levelProgress(pet.xp);
  // 최대 레벨이면 needed = 0 → 가득 찬 바
  const percent = needed === 0 ? 100 : Math.floor((current / needed) * 100);

  return (
    <section className={styles.stats}>
      {/* ① XP 바 */}
      <div className={styles.row}>
        <span className={styles.label}>XP</span>
        {/* * role="progressbar" + aria-value*: 스크린리더가 "29퍼센트"처럼 읽는다 (div만 두면 아무것도 안 읽힌다) */}
        <div
          className={styles.xpTrack}
          role="progressbar"
          aria-label="다음 레벨까지 경험치"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          {/* 너비는 값이라 style로, 색은 scss 토큰으로 */}
          <div className={styles.xpFill} style={{ width: `${percent}%` }} />
        </div>
        <span className={styles.value}>{needed === 0 ? "MAX" : `${current} / ${needed}`}</span>
      </div>

      {/* ② 활동력 10칸. pet.energy는 "보는 사람"의 잔액이라 주인일 때만 보여준다 (usePet 44줄) */}
      {isOwner && (
        <div className={styles.row}>
          <span className={styles.label}>활동력</span>
          <div className={styles.cells} role="img" aria-label={`활동력 ${pet.energy} / ${MAX_ENERGY}`}>
            {/* Array.from({ length: 10 }, (_, i) => i): [0, 1, ..., 9]. i가 잔액보다 작으면 채운 칸 */}
            {Array.from({ length: MAX_ENERGY }, (_, i) => (
              <span key={i} className={BigInt(i) < pet.energy ? styles.cellOn : styles.cell} />
            ))}
          </div>
          <span className={styles.value}>{pet.energy.toString()}</span>
        </div>
      )}

      {/* ③ 배고픔: 판정은 컨트랙트 isHungry, 남은 시간 글자만 lastFedAt으로 계산 (SPEC 8장) */}
      <p className={pet.hungry ? styles.hungry : styles.full}>
        {pet.hungry ? "배고파요… 밥을 주면 다시 배불러요" : `배고파지기까지 ${formatRemaining(hungryInMs) ?? "곧"}`}
      </p>
    </section>
  );
}
