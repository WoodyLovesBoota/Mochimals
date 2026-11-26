// * 바깥 링크 주소 (OpenSea, Basescan)와 짧은 표기. 펫 화면 정보 패널, 행동 버튼의 트랜잭션 링크가 쓴다.
//   체인별로 주소가 다르다: Base 본넷 / Base Sepolia 테스트넷 / anvil(로컬, 탐색기 없음).
import { base, baseSepolia } from "wagmi/chains";
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
 * OpenSea 상세 페이지. 테스트넷은 testnets.opensea.io를 쓴다.
 * ? 체인 이름(base, base_sepolia)은 OpenSea가 정한 글자다. 다른 체인(anvil)은 OpenSea에 없어서 undefined.
 */
export function openseaUrl(petId: bigint | string): string | undefined {
  if (chain.id === base.id) return `https://opensea.io/assets/base/${petNft.address}/${petId}`;
  if (chain.id === baseSepolia.id) return `https://testnets.opensea.io/assets/base_sepolia/${petNft.address}/${petId}`;
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
