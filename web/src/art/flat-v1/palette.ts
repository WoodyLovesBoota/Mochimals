// * flat-v1 아트 세트의 색과 모양 설정. svg/generate.py의 상수와 SPECIES 표를 그대로 옮겼다.
// ! 좌표와 색 값은 바꾸지 않는다 (SPEC 6-1). 바꾸면 기준 SVG 비교 테스트(flat-v1.test.ts)가 실패한다.
import type { Color, ItemId, Species } from "@/lib/look";

// ---- 앵커: 모든 아트 세트가 지키는 좌표 약속 (SPEC 6-2) ----
export const ANCHORS = {
  canvas: 400,
  groundY: 352, // 바닥선
  centerX: 200,
  sprout: [200, 92], // 새싹 뿌리
  face: [200, 210], // 얼굴 중심
  handR: [344, 246], // 오른손 그립 (아이템을 쥐는 점)
  bubble: [330, 96], // 말풍선 꼬리
} as const;

/** 단계별 크기 (바닥선 중심 기준 확대). 알(0)은 확대하지 않는다 */
export const STAGE_SCALE: Partial<Record<number, number>> = { 1: 0.78, 2: 0.86, 3: 0.95, 4: 0.95 };

// ---- 공통 색 ----
export const INK = "#2A2D3A"; // 코, 입
export const EYE = "#16171F"; // 눈
export const BLUSH = "#FFB1C2"; // 볼터치
export const LEAF = "#6CC46E"; // 새싹 잎
export const LEAF_D = "#4AA75A"; // 새싹 잎 (어두운 쪽), 줄기

// ---- 몸 윤곽 path ----
/** 아기(stage 1) 몸: 둥근 모찌 */
export const BLOB =
  "M200 84 C292 84 332 146 332 218 C332 292 288 332 200 332 C112 332 68 292 68 218 C68 146 108 84 200 84 Z";
/** 어린이 이상 몸: 아래가 조금 넓은 배 모양 */
export const PEAR =
  "M200 92 C290 92 328 150 332 214 C338 292 300 344 200 344 C100 344 62 292 68 214 C72 150 110 92 200 92 Z";

// ---- 종별 팔레트 ----
export type EarType = "round" | "round_dark" | "fox" | "none" | "fin" | "pig" | "frog";
export type NoseType = "bear" | "none" | "snout" | "dots";

/** 종 하나의 색과 모양. ?가 붙은 항목은 그 종에만 있는 특징이다 */
export type SpeciesPalette = {
  base: string; // 몸 기본색
  shade: string; // 몸 그림자색 (면 두 톤 규칙)
  limb: string; // 팔다리
  limb_shade: string;
  ears: EarType;
  ear_in: string | null; // 귀 안쪽 색 (없으면 null)
  muzzle: string | null; // 주둥이 색
  muzzle_big?: boolean;
  nose: NoseType;
  pad: string | null; // 젤리 발바닥
  bg: string; // 카드 무대 배경색 (SPEC 12장)
  egg_spot: string; // 알 무늬 색 (부화 전 종 힌트)
  item: ItemId;
  belly?: string; // 배 무늬
  patches?: boolean; // 판다 눈 무늬, 어깨 무늬
  spots?: boolean; // 고래상어 점무늬
  mask?: string; // 나무늘보 얼굴 마스크
  stripes?: string; // 나무늘보 눈 줄무늬
  eye_up?: boolean; // 개구리: 눈이 머리 위에
  mouth_w?: number; // 입 너비 배율
};

type SpeciesDef = SpeciesPalette & { name: string; alt: Partial<SpeciesPalette> };

export const SPECIES: Record<Species, SpeciesDef> = {
  polar: {
    name: "Polar Bear", base: "#FBFDFF", shade: "#D3E0F0", limb: "#FBFDFF", limb_shade: "#D3E0F0", ears: "round", ear_in: "#FFC7D3",
    muzzle: "#F4F8FD", nose: "bear", pad: "#FFB8C6", bg: "#E6F0FB", egg_spot: "#CFE0F5", item: "fish",
    alt: { base: "#FFF6E8", shade: "#EADBC2", limb: "#FFF6E8", limb_shade: "#EADBC2", muzzle: "#FFFBF3" },
  },
  panda: {
    name: "Panda", base: "#FFFFFF", shade: "#ECE7E0", limb: "#353543", limb_shade: "#26262F", ears: "round_dark", ear_in: null,
    muzzle: "#FFFFFF", nose: "bear", pad: "#5A5363", bg: "#E5F4E3", egg_spot: "#353543", item: "bamboo", patches: true,
    alt: { limb: "#8B6A55", limb_shade: "#6F5343", egg_spot: "#8B6A55", pad: "#6F5343" },
  },
  fennec: {
    name: "Fennec Fox", base: "#F7B877", shade: "#E39A5B", limb: "#E8A161", limb_shade: "#CF8649", ears: "fox", ear_in: "#FFE6CC",
    muzzle: "#FFF4E6", muzzle_big: true, nose: "bear", pad: "#FFB8C6", bg: "#FDF0DF", egg_spot: "#E39A5B", item: "cactus", belly: "#FFF1DE",
    alt: { base: "#F4E6D0", shade: "#DFCBAD", limb: "#E6D2B0", limb_shade: "#CDB792", egg_spot: "#DFCBAD" },
  },
  sloth: {
    name: "Sloth", base: "#D6BB98", shade: "#BCA07D", limb: "#A88763", limb_shade: "#8E7050", ears: "none", ear_in: null,
    muzzle: null, mask: "#F3E6D2", stripes: "#8A6A52", nose: "bear", pad: "#8E7050", bg: "#F1ECE2", egg_spot: "#A88763", item: "mug",
    alt: { base: "#CFC6BC", shade: "#B4AA9E", limb: "#958A7E", limb_shade: "#7C7267", egg_spot: "#958A7E" },
  },
  whale: {
    name: "Whale Shark", base: "#7FA8D6", shade: "#6590C2", limb: "#6F99CB", limb_shade: "#5A82B5", ears: "fin", ear_in: null,
    muzzle: null, nose: "none", mouth_w: 1.8, pad: null, bg: "#E3F1FB", egg_spot: "#FFFFFF", item: "wand", belly: "#EAF3FC", spots: true,
    alt: { base: "#9C9EE0", shade: "#8083C9", limb: "#8E91D6", limb_shade: "#7376BE" },
  },
  pig: {
    name: "Pig", base: "#FFD0D8", shade: "#F4AEBB", limb: "#FFC0CB", limb_shade: "#EE9EAD", ears: "pig", ear_in: "#F4AEBB",
    muzzle: null, nose: "snout", pad: "#F48FA3", bg: "#FFEFF2", egg_spot: "#F4AEBB", item: "apple",
    alt: { base: "#F2E3D5", shade: "#E1C9B5", limb: "#EAD6C4", limb_shade: "#D6BDA6", egg_spot: "#C9A98E" },
  },
  frog: {
    name: "Frog", base: "#9ADB72", shade: "#78C056", limb: "#86CF62", limb_shade: "#6BB34C", ears: "frog", ear_in: null,
    muzzle: null, nose: "dots", eye_up: true, mouth_w: 1.6, pad: null, bg: "#EAF7E0", egg_spot: "#6BB34C", item: "lotus", belly: "#E6F6C6",
    alt: { base: "#FFD36B", shade: "#F0B94A", limb: "#FFC94D", limb_shade: "#E8AD3A", egg_spot: "#E8AD3A" },
  },
};

/** 종 + 색 → 실제로 쓸 팔레트. alt면 alt 값으로 덮어쓴다. shiny는 기본색 그대로 + 반짝이 효과(layers.ts) */
export function palette(species: Species, color: Color): SpeciesPalette {
  const { alt, ...sp } = SPECIES[species];
  return color === "alt" ? { ...sp, ...alt } : sp;
}
