import { describe, expect, it } from "vitest";
import { toPetEffect, type PetEvent } from "./effects";

// 가짜 이벤트 만들기. 실제 parseEventLogs 결과에서 eventName/args만 남긴 모양이다.
const fed = (xp: bigint): PetEvent => ({ eventName: "Fed", args: { petId: 1n, xp } });
const trained = (xpGained: bigint, xp: bigint): PetEvent => ({
  eventName: "Trained",
  args: { petId: 1n, xpGained, xp },
});
const levelUp = (level: bigint): PetEvent => ({ eventName: "LevelUp", args: { petId: 1n, level } });
// 행동마다 항상 같이 나오는 ERC-4906 이벤트 (연출과 무관)
const metadata: PetEvent = { eventName: "MetadataUpdate", args: { _tokenId: 1n } };

describe("toPetEffect", () => {
  it("연출할 이벤트가 없으면 null (충전)", () => {
    expect(toPetEffect([{ eventName: "Refilled", args: {} }])).toBeNull();
    expect(toPetEffect([])).toBeNull();
  });

  it("밥: +10, happy 10초, 레벨업 없음", () => {
    expect(toPetEffect([fed(30n), metadata])).toEqual({
      xpGained: 10,
      levelUp: null,
      evolve: null,
      emotion: { name: "happy", ms: 10_000 },
    });
  });

  it("훈련: 이벤트의 xpGained를 쓴다 (배고프면 20), 표정 없음", () => {
    expect(toPetEffect([trained(20n, 20n), metadata])).toEqual({
      xpGained: 20,
      levelUp: null,
      evolve: null,
      emotion: null,
    });
  });

  it("레벨업, 단계 그대로 (Lv 4 → 5, 아기 유지): excited 3초", () => {
    const effect = toPetEffect([trained(40n, 160n), levelUp(5n), metadata]);
    expect(effect?.levelUp).toBe(5);
    expect(effect?.evolve).toBeNull();
    expect(effect?.emotion).toEqual({ name: "excited", ms: 3_000 });
  });

  it("밥으로 레벨업하면 happy보다 excited가 우선", () => {
    expect(toPetEffect([fed(50n), levelUp(2n)])?.emotion?.name).toBe("excited");
  });

  it("부화: Lv 3 도달 → 단계 0 → 1", () => {
    expect(toPetEffect([trained(40n, 120n), levelUp(3n)])?.evolve).toEqual({ from: 0, to: 1 });
  });

  it("진화 경계: Lv 7(어린이), 12(어른), 20(각성)", () => {
    expect(toPetEffect([levelUp(7n)])?.evolve).toEqual({ from: 1, to: 2 });
    expect(toPetEffect([levelUp(12n)])?.evolve).toEqual({ from: 2, to: 3 });
    expect(toPetEffect([levelUp(20n)])?.evolve).toEqual({ from: 3, to: 4 });
    // 경계 바로 다음은 단계 그대로
    expect(toPetEffect([levelUp(8n)])?.evolve).toBeNull();
  });
});
