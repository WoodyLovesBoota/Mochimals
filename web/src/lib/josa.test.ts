import { describe, expect, it } from "vitest";
import { euro, eulReul, iGa } from "./josa";

describe("josa", () => {
  it("이/가", () => {
    expect(iGa("개구리")).toBe("개구리가");
    expect(iGa("어른")).toBe("어른이");
  });
  it("을/를", () => {
    expect(eulReul("스카프")).toBe("스카프를");
    expect(eulReul("밤하늘")).toBe("밤하늘을");
  });
  it("으로/로", () => {
    expect(euro("어린이")).toBe("어린이로");
    expect(euro("어른")).toBe("어른으로");
    expect(euro("길")).toBe("길로");
  });
});
