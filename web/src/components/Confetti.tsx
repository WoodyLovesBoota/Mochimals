// * 색종이 + 빛줄기 + 노란 빛 (시안 07·08·09 배경 장식). 레벨업·부화·진화 연출이 같이 쓴다.
//   ! 장식이라 aria-hidden. 동작 줄이기면 CSS가 회전·낙하를 멈추고 그대로 둔다 (Confetti.module.scss).
import styles from "./Confetti.module.scss";

const COLORS = ["lime", "amber", "blue", "pink", "purple", "white"] as const;
const COUNT = 26;

// * 조각 위치·크기·색을 "고정된 의사난수"로 만든다.
//   ? Math.random()을 쓰지 않는 이유: 서버 HTML과 브라우저 첫 화면이 달라지면 React가 hydration 경고를 낸다.
//     i에서 계산한 값은 어디서 그려도 같다.
const PIECES = Array.from({ length: COUNT }, (_, i) => {
  const r = (n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1; // 0~1
  return {
    left: `${Math.round(r(1) * 96)}%`,
    top: `${Math.round(r(2) * 70)}%`,
    w: 6 + Math.round(r(3) * 6),
    round: r(4) > 0.6, // 동그라미 / 길쭉한 조각
    rotate: Math.round(r(5) * 180),
    color: COLORS[i % COLORS.length],
    delay: `${(r(6) * 0.6).toFixed(2)}s`,
  };
});

export function Burst({ size = 520 }: { size?: number }) {
  return (
    <div className={styles.burst} style={{ "--burst": `${size}px` } as React.CSSProperties} aria-hidden>
      <span className={styles.rays} />
      <span className={styles.glow} />
    </div>
  );
}

export function Confetti() {
  return (
    <div className={styles.confetti} aria-hidden>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={`${styles.piece} ${styles[p.color]}`}
          style={{
            left: p.left,
            top: p.top,
            width: p.w,
            height: p.round ? p.w : Math.max(3, Math.round(p.w / 2)),
            borderRadius: p.round ? "50%" : 2,
            rotate: `${p.rotate}deg`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
