import { describe, expect, it } from "vitest";
import { getPetLook } from "../../lib/look"; // vitest에는 @/ 별칭 설정이 없어서 상대 경로
import { dummy } from ".";

describe("dummy 아트 세트", () => {
  it("모든 단계에서 kind: image와 단계별 주소를 돌려준다", () => {
    for (const stage of [0, 1, 2, 3, 4]) {
      const out = dummy.render(getPetLook({ dna: 123, stage, emotion: "idle" }));
      expect(out).toEqual({ kind: "image", src: `/art/dummy/stage-${stage}.svg` });
    }
  });
  it("background가 없다 (선택 메서드)", () => {
    expect(dummy.background).toBeUndefined();
  });
});
