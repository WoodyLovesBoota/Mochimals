// * 404 (리디자인 시안 12 / D12): 없는 펫 번호, 없는 주소. 밤 장면 + 큰 "404" + 물음표 단 알 + 크림 시트.
//   app/not-found.tsx(없는 주소)와 PetView(없는 펫 번호)가 같이 쓴다.
//   data-scene="night": layout.module.scss의 .shell이 :has()로 보고 장면을 밤하늘로 바꾼다 (Lv 14 해금 장면과 같은 그림).
import Link from "next/link";
import { getPetLook } from "@/lib/look";
import { HomeIcon, QuestionIcon, TrophyIcon } from "./icons";
import { PetSprite } from "./PetSprite";
import styles from "./NotFoundView.module.scss";

// 홈 미리보기와 같은 예시 DNA (알 그림만 쓴다)
const EGG = getPetLook({ dna: 0x00030000, stage: 0, emotion: "idle" });

export function NotFoundView({ title = "Page not found" }: { title?: string }) {
  return (
    <main className={styles.main} data-scene="night">
      <div className={styles.art} aria-hidden>
        <span className={styles.big}>404</span>
        <span className={styles.eggCircle}>
          <PetSprite look={EGG} size={140} className={styles.egg} />
        </span>
        <span className={styles.question}>
          <QuestionIcon size={26} />
        </span>
      </div>

      <section className={styles.sheet}>
        <span className={styles.grabber} aria-hidden />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.desc}>Check the number again or look it up in the ranking</p>
        <div className={styles.buttons}>
          <Link href="/ranking" className={styles.primary}>
            <TrophyIcon size={24} />
            View ranking
          </Link>
          <Link href="/" className={styles.secondary}>
            <HomeIcon size={24} />
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
