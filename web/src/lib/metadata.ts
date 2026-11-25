// * NFT 메타데이터 (6강, SPEC 11장). 마켓(OpenSea 등)이 tokenURI로 읽어 가는 JSON과 그 이미지에 쓸 데이터.
//   컨트랙트의 tokenURI(7) = "<APP_URL>/api/pet/7" (PetNFT의 baseURI + 번호). 그 주소에 이 JSON을 돌려준다.
//   JSON 라우트와 이미지 라우트가 같은 읽기 함수(readPetForMetadata)를 써서, 둘이 서로 다른 상태를 보지 않게 한다.
import "server-only";
import { petNft } from "./contracts";
import { getPetLook, type PetLook } from "./look";
import { publicClient } from "./publicClient";
import { readMany } from "./readMany";

/** 마켓에 보일 단계 이름 (SPEC 11장: 영어) */
export const STAGES_EN = ["Egg", "Baby", "Kid", "Adult", "Awakened"] as const;

export type MetadataPet = {
  id: bigint;
  xp: bigint;
  level: bigint;
  stage: number;
  hungry: boolean;
  /** 메타데이터 이미지는 hungry와 idle만 쓴다 (SPEC 5장) */
  look: PetLook;
};

/**
 * 펫 하나를 읽는다. 없는 번호면 null → 라우트가 404.
 * ? 왜 ownerOf로 존재를 확인하지 않을까? pets(id)는 없는 번호여도 revert하지 않고 0을 돌려준다.
 *   번호가 1 ~ totalSupply 안인지 보는 게 가장 싸다 (펫은 소각되지 않아 번호가 빈칸 없이 이어진다).
 */
export async function readPetForMetadata(id: bigint): Promise<MetadataPet | null> {
  // * SPEC 11장 코드의 multicall 네 개 + 존재 확인용 totalSupply를 한 번에
  const [total, pet, level, stage, hungry] = await readMany(publicClient, [
    { ...petNft, functionName: "totalSupply" },
    { ...petNft, functionName: "pets", args: [id] },
    { ...petNft, functionName: "levelOf", args: [id] },
    { ...petNft, functionName: "stageOf", args: [id] },
    { ...petNft, functionName: "isHungry", args: [id] },
  ] as const);
  if (id < 1n || id > total) return null;

  const [xp, , , dna] = pet;
  const look = getPetLook({ dna, stage, emotion: hungry ? "hungry" : "idle" });
  return { id, xp, level, stage, hungry, look };
}

/** APP_URL (끝의 / 제거). 이미지 주소처럼 마켓이 따라갈 절대 주소를 만들 때 쓴다 */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
