// * 랭킹 화면 (5강, SPEC 12장). 서버 컴포넌트: 체인을 서버에서 읽어 HTML로 보내고, 30초 동안 같은 결과를 재사용한다.
//   내 펫 강조·고정 표시와 실시간 진화 피드는 지갑 주소와 구독이 필요해서 클라이언트 컴포넌트(RankingList)가 한다.
import type { Metadata } from "next";
import { RankingList } from "@/components/RankingList";
import { getRanking, type RankRow } from "@/lib/ranking";
import styles from "./page.module.scss";

// * ISR: 이 페이지 결과를 30초 동안 캐시한다 (SPEC). 그동안 오는 요청은 RPC를 다시 부르지 않는다.
//   30초가 지난 뒤 첫 요청은 옛 결과를 바로 받고, 그 뒤에서 새로 읽어 캐시를 바꾼다.
export const revalidate = 30;

export const metadata: Metadata = { title: "랭킹 · Silo Pets" };

export default async function RankingPage() {
  // ! RPC가 죽었거나 (anvil을 껐거나) 빌드 시점에 체인이 없으면 읽기가 실패한다.
  //   페이지 전체를 에러로 만들지 않고 안내 문구를 보여준다. 30초 뒤 다시 시도된다.
  let rows: RankRow[] | null = null;
  try {
    rows = await getRanking();
  } catch {
    rows = null;
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>랭킹</h1>
      {rows ? (
        <RankingList rows={rows} />
      ) : (
        <p className={styles.muted}>랭킹을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요</p>
      )}
    </main>
  );
}
