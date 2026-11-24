// * 포팅 검증: TS가 만든 SVG가 svg/ 폴더의 기준 SVG(generate.py 출력)와 같은지 문자열로 비교한다.
//   SPEC 6-1은 "눈으로 봐서 같아야 한다"지만, 문자열이 같으면 그림도 확실히 같다.
//
//   비교 전에 맞추는 차이 딱 하나: 숫자 표기.
//   Python은 정수인 실수를 "18.0"으로, JS는 "18"로 쓴다. 값은 같으므로 "18.0" → "18"로 바꿔서 비교한다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Color, Emotion, Mark, Species } from "@/lib/look";
import { layers, type Layer } from "./layers";
import { SPECIES as FLAT_V1_SPECIES, STAGE_SCALE } from "./palette";

const SVG_DIR = join(__dirname, "../../../../svg");

/** generate.py의 compose() + svg() 그대로 (레이어마다 <g id="layer-이름">, 전체를 단계 확대로 감싼다) */
function pythonCompose(ls: Layer[], stage: number | null, bg?: string): string {
  let inner = ls.map((l) => `<g id="layer-${l.name}">${l.svg}</g>`).join("");
  const sc = stage === null ? undefined : STAGE_SCALE[stage];
  if (sc) inner = `<g transform="translate(200 352) scale(${sc}) translate(-200 -352)">${inner}</g>`;
  const b = bg ? `<rect width="400" height="400" rx="36" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${b}${inner}</svg>`;
}

/** "18.0" → "18" (Python과 JS의 숫자 표기 차이만 지운다) */
const normalize = (s: string) => s.replace(/(\d)\.0(?!\d)/g, "$1");

/**
 * 기준 SVG에는 그림과 상관없는 C2PA 출처 증명 데이터가 붙어 있다 (파일 배포 과정에서 들어간 서명).
 *   <svg ... xmlns:c2pa="http://c2pa.org/manifest"> 속성과 <metadata><c2pa:manifest>...</c2pa:manifest></metadata>
 * 화면에 아무것도 그리지 않으므로 떼어내고 비교한다.
 */
const stripC2pa = (s: string) => s.replace(/ xmlns:c2pa="[^"]*"/, "").replace(/<metadata>[\s\S]*?<\/metadata>/, "");

function expectSame(file: string, actual: string) {
  const expected = stripC2pa(readFileSync(join(SVG_DIR, file), "utf8"));
  expect(normalize(actual)).toBe(normalize(expected));
}

const SPECIES: Species[] = ["polar", "panda", "fennec", "sloth", "whale", "pig", "frog"];
const EMOTIONS: Emotion[] = ["idle", "happy", "hungry", "sleepy", "excited"];
const COLORS: Color[] = ["base", "alt", "shiny"];
const MARKS: Mark[] = ["none", "freckles", "star", "heart"];

// Python의 layers()는 mark를 face 뒤로 옮기는 과정에서 순서를 바꾼다. 그 "실제 반환 순서"가 SPEC 6-1의 순서다.
describe.each(SPECIES)("%s", (sp) => {
  it.each([0, 1, 2, 3, 4])("stage%i", (st) => {
    expectSame(`${sp}-stage${st}.svg`, pythonCompose(layers(sp, st), st));
  });

  // 표정 기준 이미지는 아기(1) 크기를 확대 없이 그린 것이다 (generate.py의 compose(..., None))
  it.each(EMOTIONS)("표정 %s", (emo) => {
    expectSame(`${sp}-${emo}.svg`, pythonCompose(layers(sp, 1, emo), null));
  });

  it.each(COLORS)("색 %s", (c) => {
    expectSame(`${sp}-color-${c}.svg`, pythonCompose(layers(sp, 3, "idle", c), 3));
  });

  // 대표 이미지: 아기, 확대 없음, 종별 무대 배경색 카드
  it("hero", () => {
    expectSame(`${sp}-hero.svg`, pythonCompose(layers(sp, 1), null, FLAT_V1_SPECIES[sp].bg));
  });
});

describe("fennec 표식", () => {
  it.each(MARKS)("%s", (m) => {
    expectSame(`fennec-mark-${m}.svg`, pythonCompose(layers("fennec", 1, "idle", "base", m), null));
  });
});
