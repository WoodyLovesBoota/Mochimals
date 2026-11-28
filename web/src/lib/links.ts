// * 바깥 링크 주소 (OpenSea, Basescan)와 짧은 표기. 펫 화면 정보 패널, 행동 버튼의 트랜잭션 링크가 쓴다.
//   체인별로 주소가 다르다: Base 본넷 / Base Sepolia 테스트넷 / anvil(로컬, 탐색기 없음).
import { base } from "wagmi/chains";
import { chain } from "./chain";
import { petNft } from "./contracts";

/** 블록 탐색기(Basescan) 기본 주소. anvil처럼 탐색기가 없으면 undefined → 링크를 숨긴다 */
export const explorerUrl: string | undefined = chain.blockExplorers?.default.url;

/** 트랜잭션 상세 페이지 */
export function txUrl(hash: string): string | undefined {
  return explorerUrl && `${explorerUrl}/tx/${hash}`;
}

/** NFT 한 개의 Basescan 페이지 (/nft/컨트랙트/번호) */
export function basescanNftUrl(petId: bigint | string): string | undefined {
  return explorerUrl && `${explorerUrl}/nft/${petNft.address}/${petId}`;
}

/**
 * OpenSea 상세 페이지. Base 본넷에서만 주소가 있다.
 * ! OpenSea는 테스트넷 사이트(testnets.opensea.io)를 닫았다. 그래서 Base Sepolia·anvil에서는 undefined
 *   → 이 값을 쓰는 버튼(정보 패널, 진화 화면, 내 펫 목록의 마켓 카드)이 전부 숨겨진다.
 *   테스트넷에서 NFT 이미지를 확인하려면 Basescan(basescanNftUrl)을 쓴다.
 * ? 체인 이름 "base"는 OpenSea가 정한 글자다.
 */
export function openseaUrl(petId: bigint | string): string | undefined {
  if (chain.id === base.id) return `https://opensea.io/assets/base/${petNft.address}/${petId}`;
  return undefined;
}

/** 주소 줄임: 0x70997970…79C8 → "0x70…79C8" (시안 표기: 앞 4글자 + … + 뒤 4글자) */
export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** 해시 줄임: 0x0d4e…77f3 (앞 6글자 + … + 뒤 4글자) */
export function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/** 토큰 번호 네 자리: 2 → "#0002" (시안 정보 패널) */
export function tokenNo(petId: bigint | string): string {
  return `#${String(petId).padStart(4, "0")}`;
}

/** OpenSea 컬렉션 페이지 (내 펫 목록의 "마켓에서 데려오기"). openseaUrl과 같은 이유로 Base 본넷에서만 있다 */
export function openseaCollectionUrl(): string | undefined {
  if (chain.id === base.id) return `https://opensea.io/assets/base/${petNft.address}`;
  return undefined;
}

/** 랭킹·구경 화면의 짧은 주소: 0x70…C8 (앞 4글자 + … + 뒤 2글자, SPEC 12장 "줄인 주소") */
export function tinyAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-2)}`;
}
