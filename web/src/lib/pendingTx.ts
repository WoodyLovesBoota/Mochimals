// * 확정 대기 중인 트랜잭션 기록 (새로고침 대응, usePetAction).
//   서명 직후 { hash, args }를 sessionStorage에 적고, 확정되면 지운다. 페이지가 다시 열리면 읽어서 이어서 기다린다.
//   ? 왜 localStorage가 아니라 sessionStorage일까?
//     sessionStorage는 탭마다 따로다. 다른 탭에서 연 같은 페이지가 남의 대기 상태를 이어받아 버튼을 잠그면 헷갈린다.
//     새로고침(같은 탭)에는 남아 있으니 이 목적에는 충분하다.
//   ! bigint(petId)는 JSON.stringify가 못 다룬다 (TypeError). 문자열로 바꿔 저장하고 읽을 때 되돌린다.
import { isHash, type Hash } from "viem";
import type { PetActionArgs } from "@/hooks/usePetAction";

const KEY = "silo-pets:pending-tx";

export type PendingTx = { hash: Hash; args: PetActionArgs };

// 저장 모양: petId만 문자열
type Stored = { hash: string; fn: PetActionArgs["fn"]; petId?: string };

export function savePending({ hash, args }: PendingTx): void {
  const stored: Stored = { hash, fn: args.fn, petId: "petId" in args ? args.petId.toString() : undefined };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // 시크릿 모드 등에서 저장이 막힐 수 있다. 저장 못 해도 행동 자체는 계속된다 (새로고침 대응만 빠짐).
  }
}

export function readPending(): PendingTx | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    // ! 저장소 값은 누구나 개발자 도구로 바꿀 수 있다. 모양이 이상하면 무시한다.
    if (!isHash(s.hash)) return null;
    if ((s.fn === "feed" || s.fn === "train") && s.petId && /^\d+$/.test(s.petId)) {
      return { hash: s.hash, args: { fn: s.fn, petId: BigInt(s.petId) } };
    }
    if (s.fn === "refill" || s.fn === "adopt") return { hash: s.hash, args: { fn: s.fn } };
    return null;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 위와 같은 이유로 무시
  }
}
