import { describe, expect, it } from "vitest";
import { formatClock, formatRemaining, hungryAtMs } from "./time";

describe("hungryAtMs", () => {
  it("lastFedAt + 24시간 + 1초 (컨트랙트의 > 비교와 맞춤)", () => {
    // lastFedAt = 1000초 → 1000 + 86400 + 1 = 87401초 = 87_401_000ms
    expect(hungryAtMs(1000n)).toBe(87_401_000);
  });
});

describe("formatRemaining", () => {
  it("0 이하면 null", () => {
    expect(formatRemaining(0)).toBeNull();
    expect(formatRemaining(-5)).toBeNull();
  });
  it("1분 미만", () => {
    expect(formatRemaining(30_000)).toBe("1분 미만");
  });
  it("분만", () => {
    expect(formatRemaining(45 * 60_000)).toBe("45분");
  });
  it("시간과 분 (초는 버림)", () => {
    expect(formatRemaining((3 * 60 + 20) * 60_000 + 59_000)).toBe("3시간 20분");
  });
  it("딱 떨어지는 시간", () => {
    expect(formatRemaining(24 * 3_600_000)).toBe("24시간");
  });
});

describe("formatClock", () => {
  const min = 60_000;
  it("시:분 두 자리씩", () => {
    expect(formatClock((23 * 60 + 57) * min)).toBe("23:57");
    expect(formatClock(5 * min)).toBe("00:05");
  });
  it("1분 미만은 00:00, 0 이하는 null", () => {
    expect(formatClock(30_000)).toBe("00:00");
    expect(formatClock(0)).toBeNull();
  });
});
