// * 펫 화면 왼쪽 위 HUD (리디자인 시안 02 / D2).
//   1줄: 레벨 링 + 이름판 (모바일은 오른쪽 끝에 활동력·계정 — 모바일 펫 화면은 헤더가 숨겨져서 여기서 그린다)
//   2줄: XP 알약 + 배고픔 알약
"use client";

import type { PetState } from "@/hooks/usePet";
import { tinyAddress } from "@/lib/links";
import { levelProgress } from "@/lib/look";
import { formatClock } from "@/lib/time";
import { AccountButton } from "./AccountButton";
import { EnergyBadge } from "./EnergyBadge";
import { EyeIcon, HeartIcon } from "./icons";
import { LevelRing } from "./LevelRing";
import styles from "./PetHud.module.scss";

type Props = {
  petId: string;
  pet: PetState;
  /** 이름판 아랫줄. 칭호(Lv 4~)가 있으면 칭호, 없으면 단계 이름 */
  subtitle: string;
  /** 배고파지기까지 남은 밀리초 (useHungerTimer) */
  hungryInMs: number;
  /** false면 구경 모드 (시안 11): 이름판 아랫줄 "0x70…C8 님의 펫", 배고픔 대신 "구경 중" */
  isOwner: boolean;
};

export function PetHud({ petId, pet, subtitle, hungryInMs, isOwner }: Props) {
  // * XP: 이번 레벨 구간에서 얼마나 찼는지. look.ts의 levelProgress가 컨트랙트 levelOf와 같은 식을 쓴다.
  //   예: xp 70 → Lv 2(50부터), Lv 3은 120 → current 20 / needed 70 → 28%
  const { current, needed } = levelProgress(pet.xp);
  // 최대 레벨이면 needed = 0 → 가득 찬 막대
  const percent = needed === 0 ? 100 : Math.floor((current / needed) * 100);
  const level = Number(pet.level);

  return (
    <div className={styles.hud}>
      <div className={styles.topRow}>
        <div className={styles.identity}>
          <LevelRing level={level} percent={percent} className={styles.ring} />
          {/* 이름판. SPEC 12장: 이름은 Mochi #id (이름 짓기 기능은 없다) */}
          <div className={styles.nameplate}>
            <h1 className={styles.name}>Mochi #{petId}</h1>
            <p className={styles.subtitle}>{isOwner ? subtitle : `${tinyAddress(pet.owner)}'s pet`}</p>
          </div>
        </div>
        {/* 모바일에서만 (데스크톱은 위쪽 헤더에 같은 것이 있다) */}
        <div className={styles.mobileActions}>
          <EnergyBadge />
          <AccountButton compact />
        </div>
      </div>

      <div className={styles.pills}>
        {/* 구경 모드: 맨 앞에 "구경 중" (시안 11) */}
        {!isOwner && (
          <span className={styles.pill}>
            <span className={styles.eye}>
              <EyeIcon size={14} />
            </span>
            <span className={styles.pillText}>Visiting</span>
          </span>
        )}
        {/* ① XP 알약: "XP" 딱지 + 70px 막대 + 0/170 */}
        <span className={styles.pill}>
          <span className={styles.xpTag}>XP</span>
          {/* * role="progressbar" + aria-value*: 스크린리더가 "28퍼센트"처럼 읽는다 (span만 두면 아무것도 안 읽힌다) */}
          <span
            className={styles.xpTrack}
            role="progressbar"
            aria-label="XP to next level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            {/* 너비는 값이라 style로, 색은 scss 토큰으로 */}
            <span className={styles.xpFill} style={{ width: `${percent}%` }} />
          </span>
          <span className={styles.pillText}>
            {needed === 0 ? (
              "MAX"
            ) : (
              <>
                {current}
                <span className={styles.dim}>/{needed}</span>
              </>
            )}
          </span>
        </span>

        {/* ② 배고픔 알약 (주인만). 판정은 컨트랙트 isHungry, 남은 시간 글자만 lastFedAt으로 계산 (SPEC 8장) */}
        {isOwner && (
          <span className={pet.hungry ? styles.pillHungry : styles.pill}>
            <span className={styles.heart}>
              <HeartIcon size={14} />
            </span>
            <span className={styles.pillText}>
              {pet.hungry ? "Hungry" : `${formatClock(hungryInMs) ?? "soon"} left`}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
