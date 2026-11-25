// * 랭킹 화면 (5강, SPEC 12장). 서버 컴포넌트: 체인을 서버에서 읽어 HTML로 보내고, 30초 동안 같은 데이터를 재사용한다.
//   내 펫 강조·고정 표시와 실시간 진화 피드는 지갑 주소와 구독이 필요해서 클라이언트 컴포넌트(RankingList)가 한다.
import type { Metadata } from "next";
import { RankingList } from "@/components/RankingList";
import { unstable_cache } from "next/cache";
import { petNft } from "@/lib/contracts";
import { getRanking, type RankRow } from "@/lib/ranking";
import styles from "./page.module.scss";

// * SPEC은 `export const revalidate = 30`(ISR)이지만 이 앱에서는 효과가 없다.
//   layout.tsx가 쿠키(headers())를 읽어서 모든 페이지가 요청마다 렌더되는 동적 페이지가 되기 때문이다 (빌드 출력의 ƒ 표시).
//   그래서 페이지 대신 "데이터"를 30초 캐시한다: unstable_cache로 getRanking 결과를 서버에 보관하고,
//   30초 동안은 RPC를 다시 부르지 않는다. 사용자가 보는 효과(30초마다 갱신, RPC 부담 감소)는 SPEC과 같다.
//   ? 캐시 키 "ranking"에 컨트랙트 주소를 넣는 이유: anvil을 다시 배포하거나 체인을 바꾸면 다른 랭킹이어야 한다.
const getRankingCached = unstable_cache(getRanking, ["ranking", petNft.address], { revalidate: 30 });

export const metadata: Metadata = { title: "랭킹 · Silo Pets" };

export default async function RankingPage() {
  // ! RPC가 죽었거나 (anvil을 껐거나) 빌드 시점에 체인이 없으면 읽기가 실패한다.
  //   페이지 전체를 에러로 만들지 않고 안내 문구를 보여준다. 실패한 결과는 캐시되지 않아 다음 요청에서 다시 시도한다.
  let rows: RankRow[] | null = null;
  try {
    rows = await getRankingCached();
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
