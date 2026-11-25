// * 개발용 아트 확인 페이지: http://localhost:3000/dev/art
//   7종 × 5단계, 표정, 색을 한눈에 본다. svg/ 폴더의 기준 이미지와 눈으로 비교하는 용도다 (SPEC 6-1 검증).
//   ? 한 페이지에 펫이 수십 마리라서 clipPath id가 겹치지 않는지(PetSprite의 useId)도 여기서 확인된다.
// ! 배포(production)에서는 404로 막는다 (아래 notFound). 개발 서버(pnpm dev)에서만 보인다.
import { notFound } from "next/navigation";
import { PetSprite } from "@/components/PetSprite";
import {
  getPetLook,
  SPECIES_NAME,
  STAGE_NAME,
  type Color,
  type Emotion,
  type PetLook,
  type Species,
  type Stage,
} from "@/lib/look";
import styles from "./page.module.scss";

const SPECIES = Object.keys(SPECIES_NAME) as Species[];
const STAGES: Stage[] = [0, 1, 2, 3, 4];
const EMOTIONS: Emotion[] = ["idle", "happy", "hungry", "sleepy", "excited"];
const COLORS: Color[] = ["base", "alt", "shiny"];

// 화면 확인용으로 PetLook을 직접 만든다 (실제 화면은 getPetLook(dna)으로 만든다)
function look(species: Species, stage: Stage, emotion: Emotion = "idle", color: Color = "base"): PetLook {
  // item, 각성 표정 규칙은 getPetLook과 같게 맞추려고 dna 0(polar)으로 만든 뒤 종·색만 바꾼다
  const base = getPetLook({ dna: 0, stage, emotion });
  return { ...base, species, color };
}

export default function ArtDevPage() {
  // * NODE_ENV는 next dev에서 "development", next build/start에서 "production"이다. 빌드 때 값이 박혀서 production 번들에는 이 페이지 내용이 사실상 빠진다.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className={styles.main}>
      <h1>아트 확인 (flat-v1)</h1>

      <h2>종 × 단계</h2>
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${STAGES.length + 1}, auto)` }}>
        <span />
        {STAGES.map((s) => (
          <span key={s} className={styles.head}>
            {STAGE_NAME[s]}
          </span>
        ))}
        {SPECIES.map((sp) => (
          <Row key={sp} label={SPECIES_NAME[sp]}>
            {STAGES.map((st) => (
              <PetSprite key={st} look={look(sp, st)} size={120} />
            ))}
          </Row>
        ))}
      </div>

      <h2>표정 (아기)</h2>
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${EMOTIONS.length + 1}, auto)` }}>
        <span />
        {EMOTIONS.map((e) => (
          <span key={e} className={styles.head}>
            {e}
          </span>
        ))}
        {SPECIES.map((sp) => (
          <Row key={sp} label={SPECIES_NAME[sp]}>
            {EMOTIONS.map((e) => (
              <PetSprite key={e} look={look(sp, 1, e)} size={120} />
            ))}
          </Row>
        ))}
      </div>

      <h2>색 (어른)</h2>
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${COLORS.length + 1}, auto)` }}>
        <span />
        {COLORS.map((c) => (
          <span key={c} className={styles.head}>
            {c}
          </span>
        ))}
        {SPECIES.map((sp) => (
          <Row key={sp} label={SPECIES_NAME[sp]}>
            {COLORS.map((c) => (
              <PetSprite key={c} look={look(sp, 3, "idle", c)} size={120} />
            ))}
          </Row>
        ))}
      </div>
    </main>
  );
}

/** 표의 한 줄: 맨 앞에 이름, 그 뒤에 그림들. grid 안에서 칸만 채우도록 Fragment로 돌려준다 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className={styles.head}>{label}</span>
      {children}
    </>
  );
}
