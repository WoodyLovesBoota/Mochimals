// * 홈 화면 (임시). 5강에서 SPEC 12장의 "홈 / 입양" 화면(게임 소개, 진화 단계 미리보기, 입양하기)으로 새로 쓴다.
//   지금은 create-next-app 템플릿을 걷어내고 제목만 둔다.
import styles from "./page.module.scss";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Silo Pets</h1>
      <p className={styles.lead}>펫을 입양하고, 밥을 주고, 훈련시켜 진화시키는 온체인 육성 게임</p>
    </main>
  );
}
