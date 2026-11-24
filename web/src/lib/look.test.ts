// * look.ts 단위 테스트 (SPEC 5장: 경계값 종 15/16, 색 79/80/97/98, dna = 0xFFFFFFFF)
//   실행: web 폴더에서 `pnpm test`
//   vitest는 Jest와 문법이 거의 같다. describe = 묶음, it = 테스트 하나, expect(실제).toBe(기대).
import { describe, expect, it } from "vitest";
import {
  decodeDna,
  getPetLook,
  levelFromXp,
  levelProgress,
  stageFromLevel,
  xpForLevel,
  type Species,
} from "./look";

// 색 바이트(16~23비트)만 b로 채운 dna. 나머지 비트가 0이라 종은 polar, 성격 active, 표식 none이다.
const withColorByte = (b: number) => b << 16;

describe("decodeDna: 종 (0~15비트, % 100)", () => {
  // [아래 16비트 값, 기대 종] — 구간 경계마다 양쪽을 다 본다
  const cases: [number, Species][] = [
    [0, "polar"],
    [15, "polar"],
    [16, "panda"], // SPEC 경계값 15/16
    [25, "panda"],
    [26, "fennec"],
    [41, "fennec"],
    [42, "sloth"],
    [57, "sloth"],
    [58, "pig"],
    [73, "pig"],
    [74, "frog"],
    [89, "frog"],
    [90, "whale"],
    [99, "whale"],
    [100, "polar"], // 100 % 100 = 0
    [0xffff, "fennec"], // 65535 % 100 = 35
  ];
  it.each(cases)("아래 16비트 %i → %s", (low16, species) => {
    expect(decodeDna(low16).species).toBe(species);
  });

  it("위쪽 비트는 종에 영향이 없다", () => {
    // 16비트 위를 전부 1로 채워도 아래 16비트가 16이면 panda
    expect(decodeDna(0xffff0000 + 16).species).toBe("panda");
  });

  it("확률: 판다·고래상어는 약 10%, 나머지는 약 16%", () => {
    // 아래 16비트가 가질 수 있는 65536가지를 전부 세어 본다
    const count: Record<string, number> = {};
    for (let v = 0; v <= 0xffff; v++) {
      const s = decodeDna(v).species;
      count[s] = (count[s] ?? 0) + 1;
    }
    expect(count.panda / 65536).toBeCloseTo(0.1, 2);
    expect(count.whale / 65536).toBeCloseTo(0.1, 2);
    expect(count.polar / 65536).toBeCloseTo(0.16, 2);
  });
});

describe("decodeDna: 색 (16~23비트, (byte*100)>>8)", () => {
  // 계산: byte 204 → 20400>>8 = 79, byte 205 → 20500>>8 = 80, byte 250 → 97, byte 251 → 98
  it.each([
    [0, "base"],
    [204, "base"], // 색 값 79
    [205, "alt"], // 색 값 80  (SPEC 경계값 79/80)
    [250, "alt"], // 색 값 97
    [251, "shiny"], // 색 값 98 (SPEC 경계값 97/98)
    [255, "shiny"], // 색 값 99
  ] as const)("색 바이트 %i → %s", (byte, color) => {
    expect(decodeDna(withColorByte(byte)).color).toBe(color);
  });

  it("확률: 반짝이는 정확히 5/256", () => {
    let shiny = 0;
    for (let b = 0; b <= 255; b++) if (decodeDna(withColorByte(b)).color === "shiny") shiny++;
    expect(shiny).toBe(5);
  });
});

describe("decodeDna: 성격, 표식, 최댓값", () => {
  it("dna = 0xFFFFFFFF (모든 비트 1)", () => {
    expect(decodeDna(0xffffffff)).toEqual({
      species: "fennec", // 65535 % 100 = 35
      color: "shiny", // byte 255 → 99
      personality: "shy", // 0xF & 3 = 3
      mark: "heart", // 0xF & 3 = 3
    });
  });

  it("2^31 이상(맨 앞 비트 1)이어도 바르게 읽는다", () => {
    // 0x91000000: 28~31비트 = 9 → 9 & 3 = 1 (freckles), 24~27비트 = 1 → calm
    // (마스크 & 3이 있어서 >>를 써도 같은 값이 나온다. look.ts 주석 참고)
    expect(decodeDna(0x91000000).mark).toBe("freckles");
    expect(decodeDna(0x91000000).personality).toBe("calm"); // 24~27비트 = 1
  });

  it("범위 밖이나 정수가 아닌 dna는 에러", () => {
    expect(() => decodeDna(-1)).toThrow();
    expect(() => decodeDna(0x100000000)).toThrow();
    expect(() => decodeDna(1.5)).toThrow();
  });
});

describe("getPetLook", () => {
  it("아이템은 어른(3) 이상만", () => {
    // dna 0 → polar → fish
    expect(getPetLook({ dna: 0, stage: 2, emotion: "idle" }).item).toBeNull();
    expect(getPetLook({ dna: 0, stage: 3, emotion: "idle" }).item).toBe("fish");
    expect(getPetLook({ dna: 0, stage: 4, emotion: "idle" }).item).toBe("fish");
  });

  it("각성(4)은 idle 대신 happy, 다른 표정은 그대로", () => {
    expect(getPetLook({ dna: 0, stage: 4, emotion: "idle" }).emotion).toBe("happy");
    expect(getPetLook({ dna: 0, stage: 4, emotion: "hungry" }).emotion).toBe("hungry");
    expect(getPetLook({ dna: 0, stage: 3, emotion: "idle" }).emotion).toBe("idle");
  });

  it("stage가 0~4가 아니면 에러", () => {
    expect(() => getPetLook({ dna: 0, stage: 5, emotion: "idle" })).toThrow();
  });
});

describe("레벨 (컨트랙트 PetNFT.levelOf와 같아야 한다)", () => {
  // SPEC 3장 레벨표 (누적 XP)
  const TABLE = [
    0, 50, 120, 210, 320, 450, 600, 770, 960, 1170, 1400, 1650, 1920, 2210, 2520, 2850, 3200, 3570, 3960, 4370,
  ];

  it("xpForLevel이 레벨표와 같다", () => {
    TABLE.forEach((xp, i) => expect(xpForLevel(i + 1)).toBe(xp));
  });

  it("각 문턱에서 레벨 L, 1 모자라면 L-1 (1강 test_levelOf_tableBoundaries와 같은 검사)", () => {
    for (let L = 1; L <= 20; L++) {
      const need = BigInt(xpForLevel(L));
      expect(levelFromXp(need)).toBe(L);
      if (L > 1) expect(levelFromXp(need - 1n)).toBe(L - 1);
    }
  });

  it("4370 이상은 20에서 멈춘다", () => {
    expect(levelFromXp(1_000_000n)).toBe(20);
  });

  it("levelProgress: XP 바 값", () => {
    expect(levelProgress(0n)).toEqual({ level: 1, current: 0, needed: 50 });
    expect(levelProgress(70n)).toEqual({ level: 2, current: 20, needed: 70 }); // 50~120 구간
    expect(levelProgress(4370n)).toEqual({ level: 20, current: 0, needed: 0 }); // 최대 레벨
  });

  it("stageFromLevel: PetNFT.stageOf 경계 (2/3, 6/7, 11/12, 19/20)", () => {
    expect([2, 3, 6, 7, 11, 12, 19, 20].map(stageFromLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });
});
