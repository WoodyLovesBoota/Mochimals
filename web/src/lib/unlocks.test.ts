import { describe, expect, it } from "vitest";
import {
  canDance,
  currentBackground,
  currentTitle,
  rankBorder,
  sceneFor,
  UNLOCKS,
  unlockReward,
  unlocksAt,
  unlockToast,
} from "./unlocks";

describe("UNLOCKS 표", () => {
  it("레벨 오름차순이다 (latest가 이 순서를 믿는다)", () => {
    const levels = UNLOCKS.map((u) => u.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });
  it("1~20 모든 레벨에 해금이 하나 이상 있다", () => {
    for (let lv = 1; lv <= 20; lv++) expect(unlocksAt(lv).length).toBeGreaterThan(0);
  });
});

describe("unlocksAt", () => {
  it("Lv 10은 배경과 은색 테두리 두 가지", () => {
    expect(unlocksAt(10).map((u) => u.label)).toEqual(["배경 · 노을 언덕", "랭킹 은색 테두리"]);
  });
});

describe("currentBackground: 해금된 것 중 최신", () => {
  it.each([
    [5, null],
    [6, "field"],
    [9, "field"],
    [10, "sunset"],
    [14, "night"],
    [17, "crystal"],
    [20, "crystal"],
  ])("Lv %i → %s", (level, expected) => {
    expect(currentBackground(level)).toBe(expected);
  });
});

describe("currentTitle", () => {
  it.each([
    [3, null],
    [4, "새싹 집사"],
    [12, "든든한 집사"],
    [13, "숙련 집사"],
    [18, "베테랑 집사"],
    [20, "전설의 집사"],
  ])("Lv %i → %s", (level, expected) => {
    expect(currentTitle(level)).toBe(expected);
  });
});

describe("rankBorder, canDance", () => {
  it("테두리: 9 없음, 10 은색, 19 은색, 20 금색", () => {
    expect(rankBorder(9)).toBeNull();
    expect(rankBorder(10)).toBe("silver");
    expect(rankBorder(19)).toBe("silver");
    expect(rankBorder(20)).toBe("gold");
  });
  it("춤: 16부터", () => {
    expect(canDance(15)).toBe(false);
    expect(canDance(16)).toBe(true);
  });
});

describe("unlockToast", () => {
  it("진화는 문장으로, 조사는 받침에 맞게", () => {
    expect(unlockToast(7)).toBe("Lv 7 해금 · 어린이로 진화!");
    expect(unlockToast(12)).toBe("Lv 12 해금 · 어른으로 진화! · 종 시그니처 아이템");
  });
  it("해금이 없는 레벨은 null", () => {
    expect(unlockToast(21)).toBeNull();
  });
});

describe("unlockReward", () => {
  it("이름만, 조사는 받침에 맞게", () => {
    expect(unlockReward(8)).toBe("Lv 8 보상 · 스카프를 받았어요!");
    expect(unlockReward(14)).toBe("Lv 14 보상 · 밤하늘을 받았어요!");
  });
  it("해금이 없으면 null", () => {
    expect(unlockReward(21)).toBeNull();
  });
});

describe("sceneFor: 레벨별 장면", () => {
  it.each([
    [1, "base"],
    [5, "base"],
    [6, "field"],
    [10, "sunset"],
    [14, "night"],
    [17, "crystal"],
    [20, "crystal"],
  ])("Lv %i → %s", (level, expected) => {
    expect(sceneFor(level)).toBe(expected);
  });
});
