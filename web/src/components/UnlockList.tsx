// * 해금 목록 (SPEC 12장 내 펫 화면 "해금 목록", 리디자인 시안 16 / D16). 시트 안에 들어간다 (PetView).
//   보라 진행 막대 + 24줄: 열림(✓) / 다음(노랑 줄 + "다음") / 잠김(회색 아이콘 + 자물쇠). 데스크톱은 두 줄로 나눈다.
import { UNLOCKS } from "@/lib/unlocks";
import { CheckIcon, LockIcon } from "./icons";
import { UnlockIcon } from "./UnlockIcon";
import styles from "./UnlockList.module.scss";

/** 열린 개수 (시트 제목 옆 "7/24"에도 쓴다) */
export function openedCount(level: number): number {
  return UNLOCKS.filter((u) => u.level <= level).length;
}

export function UnlockList({ level }: { level: number }) {
  const opened = openedCount(level);
  // 다음에 열릴 레벨 (최대 레벨이면 undefined)
  const next = UNLOCKS.find((u) => u.level > level)?.level;
  const percent = Math.round((opened / UNLOCKS.length) * 100);

  return (
    <div className={styles.wrap}>
      <span
        className={styles.track}
        role="progressbar"
        aria-label="Unlock progress"
        aria-valuemin={0}
        aria-valuemax={UNLOCKS.length}
        aria-valuenow={opened}
      >
        <span className={styles.fill} style={{ width: `${percent}%` }} />
      </span>
      <ul className={styles.list}>
        {UNLOCKS.map((u) => {
          const open = u.level <= level;
          const isNext = u.level === next;
          return (
            // key: 같은 레벨에 여러 줄이 있어서 레벨 + 이름으로 만든다
            <li key={`${u.level}-${u.label}`} className={open ? styles.open : isNext ? styles.next : styles.locked}>
              <span className={styles.lv}>Lv {u.level}</span>
              <UnlockIcon kind={u.kind} locked={!open && !isNext} />
              <span className={styles.label}>{u.label}</span>
              {/* 글자로도 상태를 알린다 (색만으로 구분하지 않기: 색약 사용자 고려) */}
              {open ? (
                <span className={styles.done} role="img" aria-label="Unlocked">
                  <CheckIcon size={18} />
                </span>
              ) : isNext ? (
                <span className={styles.nextTag}>Next</span>
              ) : (
                <span className={styles.lock} role="img" aria-label="Locked">
                  <LockIcon size={18} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
