// * 랭킹 화면 본문 (5강, SPEC 12장, 리디자인 시안 03 / D3). 서버(page.tsx)가 읽은 순위표를 받아 그린다.
//   이 파일이 클라이언트인 이유: ① 내 펫 강조·내 순위 (지갑 주소) ② 실시간 레벨업 소식 (LevelUp 이벤트 구독)
//   모바일: 리본 → 최신 소식 한 줄 → 순위표 카드 → 아래 "내 순위" 막대
//   데스크톱: 왼쪽 [리본 + 순위표(열 나눔)] | 오른쪽 380px [내 펫 카드 + 실시간 소식 카드]
"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isAddressEqual } from "viem";
import { useAccount, useWatchContractEvent } from "wagmi";
import { petNft } from "@/lib/contracts";
import { tinyAddress } from "@/lib/links";
import { getPetLook, SPECIES_NAME, STAGE_NAME, stageFromLevel, type Stage } from "@/lib/look";
import type { RankRow } from "@/lib/ranking";
import { rankBorder, sceneFor } from "@/lib/unlocks";
import { ChevronRightIcon, PawIcon, SparkleIcon, StarIcon } from "./icons";
import { PetSprite } from "./PetSprite";
import { PetThumb } from "./PetThumb";
import { Ribbon } from "./Ribbon";
import { StatusCard } from "./StatusCard";
import styles from "./RankingList.module.scss";

// 실시간 소식은 최근 5개만
const FEED_MAX = 5;

type FeedItem = {
  key: string;
  id: string;
  level: number;
  evolved: boolean;
  owner?: string;
  /** 받은 시각 (Date.now). "방금", "3분 전" 표시용 */
  at: number;
};

export function RankingList({ rows }: { rows: RankRow[] | null }) {
  const router = useRouter();
  const { address } = useAccount();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  // "3분 전" 글자를 30초마다 다시 그리기 위한 현재 시각
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // 펫 번호 → 주인 (소식 줄에 주소를 보여주려고). 랭킹에 없는 새 펫이면 주소 없이
  const ownerOf = useMemo(() => new Map((rows ?? []).map((r) => [r.id, r.owner])), [rows]);

  // * 실시간 소식: PetNFT의 LevelUp 이벤트를 구독한다 (wagmi가 pollingInterval마다 새 로그를 확인).
  //   새 레벨업이 오면 router.refresh()로 서버 랭킹을 다시 받는다 (30초 캐시라 바로 안 바뀔 수 있다).
  useWatchContractEvent({
    ...petNft,
    eventName: "LevelUp",
    onLogs: (logs) => {
      const items = logs.map((log): FeedItem => {
        const id = log.args.petId!.toString();
        const level = Number(log.args.level!);
        return {
          key: `${log.transactionHash}-${log.logIndex}`,
          id,
          level,
          // 단계가 바뀐 레벨업 = 진화 (effects.ts와 같은 판단)
          evolved: stageFromLevel(level) !== stageFromLevel(level - 1),
          owner: ownerOf.get(id),
          at: Date.now(),
        };
      });
      setFeed((prev) => [...items.reverse(), ...prev].slice(0, FEED_MAX));
      router.refresh();
    },
  });

  // 서버가 체인을 못 읽었을 때 (page.tsx가 null을 넘긴다)
  if (!rows) {
    return (
      <main className={styles.center}>
        <StatusCard
          kind="error"
          title="Couldn't load"
          detail="Couldn't read the ranking"
          onRetry={() => router.refresh()}
        />
      </main>
    );
  }

  const isMine = (r: RankRow) => !!address && isAddressEqual(r.owner, address);
  // 내 펫 중 가장 높은 순위 (rows는 순위순이라 처음 찾은 것)
  const myBest = rows.find(isMine);
  const latest = feed[0];

  return (
    <main className={styles.main}>
      <div className={styles.left}>
        <Ribbon>Level Ranking</Ribbon>

        {/* 모바일: 최신 소식 한 줄 (aria-live: 새 소식이 오면 스크린리더가 읽는다) */}
        <div className={styles.latest} aria-live="polite">
          <span className={styles.liveDot} aria-hidden />
          <span className={styles.latestText}>
            {latest ? <FeedText item={latest} /> : "Waiting for level-up news"}
          </span>
          {latest && <span className={styles.ago}>{ago(latest.at, now)}</span>}
        </div>

        <section className={styles.board} aria-labelledby="season-title">
          <div className={styles.boardHead}>
            <h2 id="season-title" className={styles.boardTitle}>
              This season
            </h2>
            <span className={styles.boardNote}>
              Updates every 30s<span className={styles.desktopOnly}> · Silver border from Lv 10, gold at Lv 20</span>
            </span>
          </div>
          {rows.length === 0 ? (
            <StatusCard
              kind="empty"
              title="No pets adopted yet"
              detail="Be the first keeper!"
              action={{ href: "/", label: "Adopt" }}
            />
          ) : (
            <ol className={styles.list}>
              {rows.map((r) => (
                <li key={r.id}>
                  <RankRowView row={r} mine={isMine(r)} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <aside className={styles.right}>
        {/* 데스크톱: 내 펫 카드 */}
        {myBest && <MyRankCard row={myBest} topLevel={rows[0].level} />}
        {/* 데스크톱: 실시간 소식 카드 */}
        <section className={styles.feedCard} aria-labelledby="feed-title">
          <div className={styles.feedHead}>
            <h2 id="feed-title" className={styles.boardTitle}>
              Live feed
            </h2>
            <span className={styles.liveDot} aria-hidden />
          </div>
          {feed.length === 0 ? (
            <p className={styles.feedEmpty}>Level-ups show up here as they happen</p>
          ) : (
            <ul className={styles.feedList}>
              <AnimatePresence initial={false}>
                {feed.map((f) => (
                  <motion.li
                    key={f.key}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className={f.evolved ? styles.feedChipLime : styles.feedChipBlue}>
                      {f.evolved ? <SparkleIcon size={18} /> : <StarIcon size={18} />}
                    </span>
                    <span className={styles.feedBody}>
                      <span className={styles.feedLine}>
                        Mochi #{f.id}{" "}
                        <span>
                          {f.evolved
                            ? `evolved into ${STAGE_NAME[stageFromLevel(f.level) as Stage]}`
                            : `reached Lv ${f.level}`}
                        </span>
                      </span>
                      <span className={styles.feedMeta}>
                        {f.owner ? `${tinyAddress(f.owner)} · ` : ""}
                        {ago(f.at, now)}
                      </span>
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </aside>

      {/* 모바일: 화면 아래 "내 순위" 라임 막대 (탭 바 위) */}
      {myBest && (
        <Link href={`/pet/${myBest.id}`} className={styles.myBar}>
          <PetThumb look={getPetLook({ dna: myBest.dna, stage: myBest.stage as Stage, emotion: "idle" })} size={40} />
          <span className={styles.myBarText}>
            My rank #{myBest.rank} · Mochi #{myBest.id}
          </span>
          <span className={styles.myBarLv}>Lv {myBest.level}</span>
          <ChevronRightIcon size={18} />
        </Link>
      )}
    </main>
  );
}

/** 최신 소식 한 줄: "0x14…55의 모치가 Lv 2가 됐어요" / 진화면 "…가 어린이로 진화했어요" */
function FeedText({ item }: { item: FeedItem }) {
  const who = item.owner ? (
    <>
      <span className={styles.mono}>{tinyAddress(item.owner)}</span>&apos;s Mochi
    </>
  ) : (
    `Mochi #${item.id}`
  );
  return (
    <>
      {who}{" "}
      {item.evolved
        ? `evolved into ${STAGE_NAME[stageFromLevel(item.level) as Stage]}`
        : `reached Lv ${item.level}`}
    </>
  );
}

function RankRowView({ row, mine }: { row: RankRow; mine: boolean }) {
  const look = getPetLook({ dna: row.dna, stage: row.stage as Stage, emotion: "idle" });
  // 해금 테두리: Lv 10 은색, Lv 20 금색 (lib/unlocks.ts)
  const border = rankBorder(row.level);
  const className = [styles.row, mine && styles.mine, border && styles[border]].filter(Boolean).join(" ");
  // 1·2·3위 메달 색
  const medal =
    row.rank === 1 ? styles.gold : row.rank === 2 ? styles.silverMedal : row.rank === 3 ? styles.bronze : "";
  // 부화 전(알)이면 종을 감춘다 (SPEC 5장)
  const species = row.stage > 0 ? SPECIES_NAME[look.species] : "???";

  return (
    <Link href={`/pet/${row.id}`} className={className}>
      <span className={`${styles.rank} ${medal}`}>{row.rank}</span>
      <PetThumb look={look} size={46} />
      <span className={styles.nameCol}>
        <span className={styles.name}>
          Mochi #{row.id}
          {mine && <span className={styles.meTag}>My pet</span>}
        </span>
        {/* 모바일: 종 · 주소를 이름 아래 한 줄로 */}
        <span className={styles.metaMobile}>
          {species} · <span className={styles.mono}>{tinyAddress(row.owner)}</span>
        </span>
      </span>
      {/* 데스크톱: 종, 주소를 각각 열로 */}
      <span className={styles.speciesCol}>{species}</span>
      <span className={styles.addrCol}>{tinyAddress(row.owner)}</span>
      <span className={styles.level}>Lv {row.level}</span>
    </Link>
  );
}

/** 데스크톱 오른쪽 "내 펫" 카드: 장면 + 펫 + 순위 + 1위까지 남은 레벨 */
function MyRankCard({ row, topLevel }: { row: RankRow; topLevel: number }) {
  const look = getPetLook({ dna: row.dna, stage: row.stage as Stage, emotion: "happy" });
  const gap = topLevel - row.level;
  const note =
    row.rank === 1 ? "You're #1! Hold your spot" : gap > 0 ? `${gap} level${gap === 1 ? "" : "s"} behind #1` : "Same level as #1";
  return (
    <section className={styles.myCard} aria-label="My rank">
      {/* 내 펫 레벨의 장면 (globals.scss 장면 토큰) */}
      <div
        className={styles.myScene}
        style={{ "--card-scene": `var(--scene-d-${sceneFor(row.level)})` } as React.CSSProperties}
      >
        <PetSprite look={look} size={200} className={styles.mySprite} />
      </div>
      <div className={styles.myHead}>
        <span className={styles.myName}>Mochi #{row.id}</span>
        <span className={styles.myRank}>#{row.rank}</span>
      </div>
      <p className={styles.myNote}>{note}</p>
      <Link href={`/pet/${row.id}`} className={styles.myGo}>
        <PawIcon size={24} />
        Go take care
      </Link>
    </section>
  );
}

/** 받은 시각 → "방금" / "3분 전" / "2시간 전" */
function ago(at: number, now: number): string {
  const min = Math.floor((now - at) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}
