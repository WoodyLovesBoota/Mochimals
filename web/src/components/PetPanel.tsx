// * 펫 정보 패널 (리디자인 시안 D2 오른쪽 380px 카드). 모바일에서는 "펫 정보" 버튼을 누르면 아래 시트로 같은 내용이 뜬다.
//   상태(경험치·활동력·배고픔) → 해금(지금 것 + 다음 것) → 정보(주인·토큰) → OpenSea / Basescan
//   (예전 PetStats의 수치 표시를 이 패널이 이어받았다)
"use client";

import { useNow } from "@/hooks/useNow";
import type { PetState } from "@/hooks/usePet";
import { chain } from "@/lib/chain";
import { basescanNftUrl, openseaUrl, shortAddress, tokenNo } from "@/lib/links";
import { getPetLook, levelProgress, SPECIES_NAME, STAGE_NAME, type Stage } from "@/lib/look";
import { formatRemaining, hungryAtMs } from "@/lib/time";
import { UNLOCKS } from "@/lib/unlocks";
import { BoltIcon, CheckIcon, ExternalIcon, HeartIcon, StarIcon } from "./icons";
import { UnlockIcon } from "./UnlockIcon";
import { VisitorCard } from "./VisitorCard";
import styles from "./PetPanel.module.scss";

// PetNFT.MAX_ENERGY = 10. 칸 수를 정한다 (constant라 컨트랙트에서 읽지 않는다. time.ts의 HUNGRY_AFTER와 같은 이유)
const MAX_ENERGY = 10;

type Props = {
  petId: string;
  pet: PetState;
  isOwner: boolean;
  hungryInMs: number;
  /** "전체 보기 ›"를 누르면 해금 목록 시트를 연다 */
  onOpenUnlocks: () => void;
  /** true면 카드 테두리·그림자 없이 (모바일 시트 안에 넣을 때. 시트가 이미 카드다) */
  flat?: boolean;
  className?: string;
};

export function PetPanel({ petId, pet, isOwner, hungryInMs, onOpenUnlocks, flat = false, className }: Props) {
  // 배고픈 지 얼마나 됐는지 (1분마다 갱신)
  const now = useNow();
  const { current, needed } = levelProgress(pet.xp);
  const percent = needed === 0 ? 100 : Math.floor((current / needed) * 100);
  const level = Number(pet.level);

  // * 해금: 열린 것 중 마지막 줄(✓) + 다음에 열릴 줄("다음"). 시안 D2는 이 두 줄만 보여준다.
  const opened = UNLOCKS.filter((u) => u.level <= level);
  const latest = opened.at(-1); // at(-1): 배열의 마지막 요소
  const next = UNLOCKS.find((u) => u.level > level);

  const opensea = openseaUrl(petId);
  const basescan = basescanNftUrl(petId);
  const links = (opensea || basescan) && (
    <div className={styles.links}>
      {opensea && (
        <a className={styles.linkBtn} href={opensea} target="_blank" rel="noreferrer">
          <ExternalIcon size={24} />
          OpenSea
        </a>
      )}
      {basescan && (
        <a className={styles.linkBtn} href={basescan} target="_blank" rel="noreferrer">
          <ExternalIcon size={24} />
          Basescan
        </a>
      )}
    </div>
  );

  // * 구경 모드 (시안 D11): 입양 권유 + 이 펫 정보만. 상태·해금은 주인에게만 의미가 있다
  if (!isOwner) {
    const look = getPetLook({ dna: pet.dna, stage: pet.stage, emotion: "idle" });
    // 부화 전에는 종을 숨긴다 (SPEC 5장)
    const shape = [STAGE_NAME[pet.stage as Stage], pet.stage > 0 ? SPECIES_NAME[look.species] : null]
      .filter(Boolean)
      .join(" · ");
    return (
      <section className={`${flat ? styles.flat : styles.panel} ${className ?? ""}`} aria-label="펫 정보">
        {/* 모바일 시트(flat)에서는 구경 카드가 화면 아래에 이미 있어서 빼고 정보만 */}
        {!flat && (
          <>
            <VisitorCard flat />
            <hr className={styles.divider} />
          </>
        )}
        <h2 className={styles.heading}>Mochi #{petId} 정보</h2>
        <dl className={styles.info}>
          <div className={styles.infoRow}>
            <dt>주인</dt>
            <dd className={styles.mono}>{shortAddress(pet.owner)}</dd>
          </div>
          <div className={styles.infoRow}>
            <dt>모습</dt>
            <dd className={styles.plain}>{shape}</dd>
          </div>
          <div className={styles.infoRow}>
            <dt>토큰</dt>
            <dd className={styles.mono}>
              {tokenNo(petId)} · {chain.name}
            </dd>
          </div>
        </dl>
        {links}
      </section>
    );
  }

  return (
    <section className={`${flat ? styles.flat : styles.panel} ${className ?? ""}`} aria-label="펫 상태">
      <h2 className={styles.heading}>상태</h2>

      {/* ① 경험치 */}
      <div className={styles.stat}>
        <span className={styles.chipLime}>
          <StarIcon size={20} />
        </span>
        <div className={styles.statBody}>
          <div className={styles.statHead}>
            <span className={styles.statLabel}>경험치</span>
            <span className={styles.statValue}>
              {needed === 0 ? (
                "MAX"
              ) : (
                <>
                  {current}
                  <span className={styles.dim}>/{needed}</span>
                </>
              )}
            </span>
          </div>
          <span
            className={styles.xpTrack}
            role="progressbar"
            aria-label="다음 레벨까지 경험치"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span className={styles.xpFill} style={{ width: `${percent}%` }} />
          </span>
        </div>
      </div>

      {/* ② 활동력 10칸. pet.energy는 "보는 사람"의 잔액이라 주인일 때만 보여준다 (usePet 44줄) */}
      {isOwner && (
        <div className={styles.stat}>
          <span className={styles.chipAmber}>
            <BoltIcon size={20} />
          </span>
          <div className={styles.statBody}>
            <div className={styles.statHead}>
              <span className={styles.statLabel}>활동력</span>
              <span className={styles.statValue}>
                {pet.energy.toString()}
                <span className={styles.dim}>/{MAX_ENERGY}</span>
              </span>
            </div>
            <div className={styles.cells} role="img" aria-label={`활동력 ${pet.energy} / ${MAX_ENERGY}`}>
              {/* Array.from({ length: 10 }, (_, i) => i): [0, 1, ..., 9]. i가 잔액보다 작으면 채운 칸 */}
              {Array.from({ length: MAX_ENERGY }, (_, i) => (
                <span key={i} className={BigInt(i) < pet.energy ? styles.cellOn : styles.cell} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ③ 배고픔 */}
      <div className={styles.stat}>
        <span className={styles.chipPink}>
          <HeartIcon size={20} />
        </span>
        {/* 시안 D10: 배고프면 같은 줄에 "2시간 14분째" (배고파진 뒤 지난 시간) */}
        <span className={styles.statLabelGrow}>배고파지기까지</span>
        <span className={pet.hungry ? styles.statValueHungry : styles.statValue}>
          {pet.hungry
            ? (() => {
                // 배고파진 뒤 지난 시간. 0 이하(블록 시각과 내 시계가 조금 어긋날 때)면 "방금"
                const since = formatRemaining(now - hungryAtMs(pet.lastFedAt));
                return since ? `${since}째` : "방금";
              })()
            : `${formatRemaining(hungryInMs) ?? "곧"} 남음`}
        </span>
      </div>

      <hr className={styles.divider} />

      {/* 해금 요약 */}
      <div className={styles.sectionHead}>
        <h2 className={styles.heading}>해금</h2>
        <button type="button" className={styles.more} onClick={onOpenUnlocks}>
          {opened.length}/{UNLOCKS.length} · 전체 보기 ›
        </button>
      </div>
      <ul className={styles.unlocks}>
        {latest && (
          <li className={styles.unlockRow}>
            <span className={styles.unlockLv}>Lv {latest.level}</span>
            <UnlockIcon kind={latest.kind} />
            <span className={styles.unlockLabel}>{latest.label}</span>
            {/* 글자로도 상태를 알린다 (색만으로 구분하지 않기) */}
            <span className={styles.done} role="img" aria-label="열림">
              <CheckIcon size={18} />
            </span>
          </li>
        )}
        {next && (
          <li className={styles.unlockRowNext}>
            <span className={styles.unlockLv}>Lv {next.level}</span>
            <UnlockIcon kind={next.kind} />
            <span className={styles.unlockLabel}>{next.label}</span>
            <span className={styles.nextTag}>다음</span>
          </li>
        )}
      </ul>

      <hr className={styles.divider} />

      <h2 className={styles.heading}>정보</h2>
      <dl className={styles.info}>
        <div className={styles.infoRow}>
          <dt>주인</dt>
          <dd className={styles.mono}>{shortAddress(pet.owner)}</dd>
        </div>
        <div className={styles.infoRow}>
          <dt>토큰</dt>
          <dd className={styles.mono}>
            {tokenNo(petId)} · {chain.name}
          </dd>
        </div>
      </dl>

      {/* 바깥 링크. 탐색기·마켓이 없는 체인(anvil)이면 버튼을 숨긴다 */}
      {links}
    </section>
  );
}
