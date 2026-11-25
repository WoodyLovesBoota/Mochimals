// * 해금 목록 (SPEC 12장 내 펫 화면 "해금 목록"). lib/unlocks.ts의 표를 레벨과 비교해 열림/잠김으로 보여준다.
//   <details>: 브라우저 기본 접기/펴기. JS 상태 없이 열고 닫을 수 있고, 키보드·스크린리더 지원도 기본으로 된다.
import { UNLOCKS } from "@/lib/unlocks";
import styles from "./UnlockList.module.scss";

export function UnlockList({ level }: { level: number }) {
  const opened = UNLOCKS.filter((u) => u.level <= level).length;
  // 다음에 열릴 레벨 (최대 레벨이면 undefined)
  const next = UNLOCKS.find((u) => u.level > level)?.level;

  return (
    <details className={styles.box}>
      <summary className={styles.summary}>
        해금 목록{" "}
        <span className={styles.count}>
          {opened}/{UNLOCKS.length}
        </span>
      </summary>
      <ul className={styles.list}>
        {UNLOCKS.map((u) => {
          const open = u.level <= level;
          return (
            // key: 같은 레벨에 여러 줄이 있어서 레벨 + 이름으로 만든다
            <li
              key={`${u.level}-${u.label}`}
              className={open ? styles.open : u.level === next ? styles.next : styles.locked}
            >
              <span className={styles.lv}>Lv {u.level}</span>
              <span>{u.label}</span>
              {/* 글자로도 상태를 알린다 (색만으로 구분하지 않기: 색약 사용자 고려) */}
              <span className={styles.state}>{open ? "✓" : u.level === next ? "다음" : "🔒"}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
