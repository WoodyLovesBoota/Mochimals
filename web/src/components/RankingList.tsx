// * 랭킹 목록 + 실시간 진화 피드 (5강, SPEC 12장 랭킹).
//   서버(app/ranking/page.tsx)가 정렬해 준 rows를 그리고, 브라우저에서만 할 수 있는 세 가지를 더한다:
//   ① 내 펫 행 강조 (지갑 주소 필요) ② 내 순위 고정 표시 ③ LevelUp 이벤트 구독 → 피드 + 목록 새로고침
"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { isAddressEqual, type Address } from "viem";
import { useAccount, useWatchContractEvent } from "wagmi";
import { petNft } from "@/lib/contracts";
import { getPetLook, SPECIES_NAME, stageFromLevel } from "@/lib/look";
import type { RankRow } from "@/lib/ranking";
import { rankBorder } from "@/lib/unlocks";
import { PetThumb } from "./PetThumb";
import styles from "./RankingList.module.scss";

// 피드에 남길 최대 줄 수
const FEED_MAX = 5;

type FeedItem = { key: string; text: string };

export function RankingList({ rows }: { rows: RankRow[] }) {
  const router = useRouter();
  const { address } = useAccount();
  const [feed, setFeed] = useState<FeedItem[]>([]);

  // 펫 번호 → 주인 주소 (피드 문구용). rows가 바뀔 때만 다시 만든다
  const ownerOf = useMemo(() => new Map(rows.map((r) => [r.id, r.owner])), [rows]);

  // * ③ LevelUp 구독. wagmi가 pollingInterval(1초)마다 새 로그를 확인해 onLogs로 넘긴다.
  //   ? 다른 사람의 레벨업도 오나? 그렇다. 필터가 "PetNFT의 LevelUp 전부"라서 누구의 펫이든 온다 (SPEC: 다른 지갑의 레벨업이 피드에 뜬다).
  useWatchContractEvent({
    ...petNft,
    eventName: "LevelUp",
    onLogs: (logs) => {
      const items = logs.map((log) => {
        const id = log.args.petId!.toString();
        const level = Number(log.args.level!);
        const owner = ownerOf.get(id);
        // 단계가 바뀐 레벨업이면 "진화", 아니면 "레벨업" (한 번에 1레벨만 오른다: effects.ts와 같은 가정)
        const evolved = stageFromLevel(level) !== stageFromLevel(level - 1);
        // 목록을 읽은 뒤 새로 입양된 펫이면 주인을 아직 모른다 → 주소 대신 펫 번호로 쓴다
        const who = owner ? `${shortAddress(owner)}의 모치` : `Mochi #${id}`;
        return {
          // 같은 블록에 여러 로그가 있을 수 있어서 해시 + 로그 위치로 고유 키를 만든다
          key: `${log.transactionHash}-${log.logIndex}`,
          text: `${who}가 Lv ${level}로 ${evolved ? "진화" : "레벨업"}!`,
        };
      });
      setFeed((prev) => [...items.reverse(), ...prev].slice(0, FEED_MAX));
      // * 목록 갱신: 서버 컴포넌트를 다시 렌더해 달라고 요청한다 (클라이언트 상태인 feed는 유지된다).
      //   ! revalidate = 30이라 30초 안에는 캐시된 옛 순위가 올 수 있다. 피드는 바로, 순위는 늦어도 30초 안에 맞춰진다.
      router.refresh();
    },
  });

  // ①② 내 펫 행들. 여러 마리면 가장 높은 순위가 고정 표시에 나온다 (rows가 이미 순위순)
  const isMine = (r: RankRow) => !!address && isAddressEqual(r.owner, address);
  const myBest = rows.find(isMine);

  if (rows.length === 0) return <p className={styles.muted}>아직 입양된 펫이 없어요. 첫 집사가 되어 보세요!</p>;

  return (
    <div className={styles.wrap}>
      {/* 실시간 진화 피드 (aria-live: 새 줄이 생기면 스크린리더가 읽는다) */}
      <ul className={styles.feed} aria-live="polite">
        <AnimatePresence initial={false}>
          {feed.map((f) => (
            <motion.li key={f.key} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              ✨ {f.text}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* ② 내 순위 고정 표시: 스크롤해도 위에 붙어 있다 (position: sticky) */}
      {myBest && (
        <Link href={`/pet/${myBest.id}`} className={styles.myRank}>
          내 펫 Mochi #{myBest.id} · <strong>{myBest.rank}위</strong> · Lv {myBest.level}
        </Link>
      )}

      <ol className={styles.list}>
        {rows.map((r) => (
          <li key={r.id}>
            <RankRowView row={r} mine={isMine(r)} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function RankRowView({ row, mine }: { row: RankRow; mine: boolean }) {
  const look = getPetLook({ dna: row.dna, stage: row.stage, emotion: "idle" });
  // 랭킹 테두리 (해금표: Lv 10 은색, Lv 20 금색)
  const border = rankBorder(row.level);
  const className = [styles.row, mine && styles.mine, border && styles[border]].filter(Boolean).join(" ");

  return (
    // 행 클릭 → 그 펫 화면 (SPEC). 남의 펫이면 읽기 전용으로 열린다
    <Link href={`/pet/${row.id}`} className={className}>
      <span className={styles.rank}>{row.rank}</span>
      {/* SPEC: 48px 펫 썸네일 */}
      <PetThumb look={look} size={48} />
      <span className={styles.name}>
        Mochi #{row.id}
        {mine && <span className={styles.meTag}>내 펫</span>}
      </span>
      {/* 부화 전(알)이면 종을 감춘다 (SPEC 5장) */}
      <span className={styles.meta}>
        {row.stage > 0 ? SPECIES_NAME[look.species] : "???"} · {shortAddress(row.owner)}
      </span>
      <span className={styles.level}>Lv {row.level}</span>
    </Link>
  );
}

/** 0x12ab…cdef → "0x12…ef" 처럼 줄인 주소 (SPEC 12장 "줄인 주소") */
function shortAddress(a: Address): string {
  return `${a.slice(0, 4)}…${a.slice(-2)}`;
}
