// * 랭킹 데이터 (5강, SPEC 12장 "랭킹 데이터"). 서버 컴포넌트(app/ranking/page.tsx)에서만 부른다.
//   방법: totalSupply를 읽고 1번부터 끝까지 pets(i), ownerOf(i)를 200개씩 묶어 읽은 뒤 XP 순으로 정렬한다.
//   ? 왜 컨트랙트에 랭킹 배열을 안 둘까? 행동마다 정렬된 배열을 고치면 가스가 커진다 (SPEC 14장에서 금지).
//     읽기는 공짜이고, 서버가 30초마다 한 번만 읽어 모두에게 같은 결과를 준다 (revalidate = 30).
import "server-only";
import type { Address } from "viem";
import { petNft } from "./contracts";
import { levelFromXp, stageFromLevel } from "./look";
import { publicClient } from "./publicClient";
import { readMany } from "./readMany";

// 한 번에 묶어 읽을 펫 수 (SPEC: 200개씩). 요청 하나가 너무 커지면 RPC가 거절하거나 느려진다.
const CHUNK = 200;

/**
 * 랭킹 한 줄. 서버 → 클라이언트 컴포넌트로 넘기므로 직렬화하기 쉬운 값(문자열, 숫자)만 쓴다.
 * ? 왜 레벨·단계를 컨트랙트에서 읽지 않을까? levelOf/stageOf를 더 부르면 요청이 두 배가 된다.
 *   look.ts의 levelFromXp/stageFromLevel은 컨트랙트와 같은 식이고 테스트로 레벨표 전체를 대조했다 (3강).
 */
export type RankRow = {
  rank: number;
  id: string; // 펫 번호 (bigint → 문자열)
  owner: Address;
  xp: number; // uint64라 Number로 충분 (2^53 아래)
  level: number;
  stage: number;
  dna: number;
};

export async function getRanking(): Promise<RankRow[]> {
  // 펫 번호는 1부터 totalSupply까지 빈칸 없이 이어진다 (adopt의 petId = ++totalSupply, 소각 기능 없음)
  const total = await publicClient.readContract({ ...petNft, functionName: "totalSupply" });
  const ids = Array.from({ length: Number(total) }, (_, i) => BigInt(i + 1));

  const rows: Omit<RankRow, "rank">[] = [];
  for (let start = 0; start < ids.length; start += CHUNK) {
    const chunk = ids.slice(start, start + CHUNK);
    // * 한 묶음 안에서 [pets(1), ownerOf(1), pets(2), ownerOf(2), ...] 순서로 번갈아 넣는다 → 결과도 같은 순서
    const results = await readMany(
      publicClient,
      chunk.flatMap((id) => [
        { ...petNft, functionName: "pets", args: [id] } as const,
        { ...petNft, functionName: "ownerOf", args: [id] } as const,
      ]),
    );
    chunk.forEach((id, i) => {
      // pets(i)는 [xp, lastFedAt, bornAt, dna] 튜플. 결과 배열이 여러 타입의 묶음이라 여기서 모양을 알려준다
      const [xp, , , dna] = results[i * 2] as readonly [bigint, bigint, bigint, number];
      const owner = results[i * 2 + 1] as Address;
      const level = levelFromXp(xp);
      rows.push({ id: id.toString(), owner, xp: Number(xp), level, stage: stageFromLevel(level), dna });
    });
  }

  // * XP 내림차순. XP가 같으면 먼저 입양한(번호가 작은) 펫이 위 (순위가 새로고침마다 흔들리지 않게)
  rows.sort((a, b) => b.xp - a.xp || Number(a.id) - Number(b.id));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
