// * DNA 해석기: 컨트랙트에 저장된 숫자(dna, xp)를 "펫이 어떻게 생겼는지(PetLook)"로 바꾼다.
//   SPEC 5장. 해석은 이 파일 한 곳에서만 한다. 화면(PetSprite)과 메타데이터 API(6강)가 같은 함수를 쓴다.
//
//   체인 ──(dna, xp)──▶ look.ts ──(PetLook)──▶ 아트 세트(art/) ──▶ 그림
//   ! 이 파일은 그림(SVG 좌표, 색 코드)을 전혀 모른다. 그림을 통째로 바꿔도 이 파일은 그대로다 (SPEC 6장).
//   ! 순수 함수만 둔다 (React, wagmi, 브라우저 API를 쓰지 않는다). 그래서 서버, 브라우저, 테스트 어디서나 돈다.

// =====================================================================
// 타입
// =====================================================================

export type Species = "polar" | "panda" | "fennec" | "sloth" | "pig" | "frog" | "whale";
export type Emotion = "idle" | "happy" | "hungry" | "sleepy" | "excited";
export type Color = "base" | "alt" | "shiny";
export type Mark = "none" | "freckles" | "star" | "heart";
export type Personality = "active" | "calm" | "foodie" | "shy";
export type ItemId = "fish" | "bamboo" | "cactus" | "mug" | "wand" | "apple" | "lotus";
/** 성장 단계: 0 알, 1 아기, 2 어린이, 3 어른, 4 각성 (컨트랙트 stageOf와 같은 번호) */
export type Stage = 0 | 1 | 2 | 3 | 4;

/** 아트 세트가 그림을 그리는 데 필요한 전부. 아트 세트는 이것만 보고 그린다. */
export type PetLook = {
  species: Species;
  stage: Stage;
  emotion: Emotion;
  color: Color;
  mark: Mark;
  personality: Personality;
  item: ItemId | null;
};

// =====================================================================
// 화면 표시용 한국어 이름
// =====================================================================

export const SPECIES_NAME: Record<Species, string> = {
  polar: "북극곰",
  panda: "판다",
  fennec: "사막여우",
  sloth: "나무늘보",
  pig: "돼지",
  frog: "개구리",
  whale: "고래상어",
};

export const PERSONALITY_NAME: Record<Personality, string> = {
  active: "활발",
  calm: "느긋",
  foodie: "먹보",
  shy: "수줍음",
};

export const COLOR_NAME: Record<Color, string> = {
  base: "기본",
  alt: "변종",
  shiny: "반짝이",
};

export const STAGE_NAME: Record<Stage, string> = {
  0: "알",
  1: "아기",
  2: "어린이",
  3: "어른",
  4: "각성",
};

// =====================================================================
// DNA 해석 (SPEC 5장 표)
// =====================================================================
//   uint32 dna (32비트)
//   ┌────────┬────────┬────────────────┬─────────────────────────────────┐
//   │ 28~31  │ 24~27  │     16~23      │              0~15               │
//   │  표식   │  성격   │       색        │               종                │
//   └────────┴────────┴────────────────┴─────────────────────────────────┘
//
// ! JS 비트 연산의 함정: &, |, >> 는 숫자를 "부호 있는 32비트 정수"로 바꿔서 계산한다.
//   dna가 2^31(= 0x80000000) 이상이면 맨 앞 비트가 1이라 음수로 취급된다.
//     0xF0000000 >> 28  = -1   (부호 비트가 복사되어 채워진다)
//     0xF0000000 >>> 28 = 15   (부호 없는 시프트: 0으로 채운다)  ← 우리가 원하는 것
//   ? 아래 코드는 시프트 뒤에 항상 & 0x3, & 0xff 마스크를 붙인다. 마스크는 아래 비트만 남기므로
//     사실 여기서는 >>를 써도 결과가 같다 ((0x91000000 >> 28) & 3 = 1 = (0x91000000 >>> 28) & 3).
//     그래도 SPEC대로 >>>를 쓴다. 나중에 누가 마스크를 빼거나 넓히면 >>는 곧바로 음수를 만들기 때문이다.

/** 종 구간표. 종 값(0~99)이 `max` 이하인 첫 줄의 종이다. 구간 크기 = 확률(%) */
const SPECIES_RANGES: { max: number; species: Species }[] = [
  { max: 15, species: "polar" }, //  0~15 → 16%
  { max: 25, species: "panda" }, // 16~25 → 10% (희귀)
  { max: 41, species: "fennec" }, // 26~41 → 16%
  { max: 57, species: "sloth" }, // 42~57 → 16%
  { max: 73, species: "pig" }, // 58~73 → 16%
  { max: 89, species: "frog" }, // 74~89 → 16%
  { max: 99, species: "whale" }, // 90~99 → 10% (희귀)
];

const PERSONALITIES: Personality[] = ["active", "calm", "foodie", "shy"];
const MARKS: Mark[] = ["none", "freckles", "star", "heart"];

/** 어른(stage 3) 이상이 손에 드는 종별 시그니처 아이템 */
const SPECIES_ITEM: Record<Species, ItemId> = {
  polar: "fish",
  panda: "bamboo",
  fennec: "cactus",
  sloth: "mug",
  whale: "wand",
  pig: "apple",
  frog: "lotus",
};

/** dna가 uint32 범위의 정수인지 확인한다. 아니면 에러 (잘못된 값으로 엉뚱한 펫을 그리지 않게) */
function assertDna(dna: number): void {
  if (!Number.isInteger(dna) || dna < 0 || dna > 0xffffffff) {
    throw new Error(`dna는 0 ~ 0xFFFFFFFF 정수여야 한다: ${dna}`);
  }
}

/** 0~15비트 → 종 */
function decodeSpecies(dna: number): Species {
  // * dna & 0xFFFF: 아래 16비트만 남긴다 (0~65535). % 100 → 0~99
  // ? 65536은 100으로 나누어떨어지지 않아서 0~35가 아주 약간(656번 vs 655번) 더 자주 나온다. 0.15% 차이라 SPEC대로 둔다.
  const v = (dna & 0xffff) % 100;
  // SPECIES_RANGES의 마지막 max가 99라서 find는 항상 찾는다. `!`는 "undefined 아님"을 TS에 알려 준다.
  return SPECIES_RANGES.find((r) => v <= r.max)!.species;
}

/** 16~23비트 → 색 */
function decodeColor(dna: number): Color {
  // * byte = 0~255. (byte * 100) >> 8 은 "byte / 256 * 100"을 정수로 한 것 → 0~99
  // ! % 100을 쓰면 안 된다. 256은 100으로 안 나누어떨어져서 0~55가 두 배 가까이 자주 나온다
  //   (0~55: 3번씩, 56~99: 2번씩). 그러면 98~99(반짝이) 확률이 2/256로 틀어진다.
  //   >> 8 방식은 256칸을 100칸에 고르게 펴서, 반짝이가 정확히 5/256(약 2%)이다.
  const byte = (dna >>> 16) & 0xff;
  const v = (byte * 100) >> 8;
  if (v <= 79) return "base"; // 0~79  → 205/256 (80.1%)
  if (v <= 97) return "alt"; // 80~97 →  46/256 (18.0%)
  return "shiny"; // 98~99 →   5/256 ( 2.0%)
}

/** dna 하나를 종, 색, 성격, 표식으로 나눈다 */
export function decodeDna(dna: number): {
  species: Species;
  color: Color;
  personality: Personality;
  mark: Mark;
} {
  assertDna(dna);
  return {
    species: decodeSpecies(dna),
    color: decodeColor(dna),
    // * 24~27비트 중 아래 2비트만 쓴다 (& 0x3 → 0~3). 나머지 2비트는 나중을 위해 비워 둔다.
    personality: PERSONALITIES[(dna >>> 24) & 0x3],
    mark: MARKS[(dna >>> 28) & 0x3],
  };
}

// =====================================================================
// PetLook 만들기
// =====================================================================

/**
 * 컨트랙트 값 + 화면 상태 → 그림에 필요한 PetLook.
 * @param stage 컨트랙트 stageOf 결과 (0~4)
 * @param emotion 화면이 정한 표정 (SPEC 5장 표정 우선순위는 4강 훅에서 정한다)
 */
export function getPetLook(input: { dna: number; stage: number; emotion: Emotion }): PetLook {
  const { species, color, personality, mark } = decodeDna(input.dna);
  if (!Number.isInteger(input.stage) || input.stage < 0 || input.stage > 4) {
    throw new Error(`stage는 0~4여야 한다: ${input.stage}`);
  }
  const stage = input.stage as Stage;

  return {
    species,
    stage,
    // * 각성(stage 4)은 기본 표정이 기쁨이다. 다른 표정(배고픔 등)이 정해졌으면 그걸 따른다.
    emotion: stage === 4 && input.emotion === "idle" ? "happy" : input.emotion,
    color,
    mark,
    personality,
    // * 어른(3), 각성(4)만 아이템을 든다
    item: stage >= 3 ? SPECIES_ITEM[species] : null,
  };
}

// =====================================================================
// 레벨 (컨트랙트 levelOf와 같은 식)
// =====================================================================

export const MAX_LEVEL = 20;

/** 레벨 L에 도달하는 데 필요한 누적 XP = 10 × (L−1) × (L+3). 1강 PetNFT.levelOf의 역산 전 식 */
export function xpForLevel(level: number): number {
  return 10 * (level - 1) * (level + 3);
}

/** 누적 XP → 레벨. PetNFT.levelOf와 같은 결과여야 한다 (테스트로 레벨표 전체를 대조한다). */
export function levelFromXp(xp: bigint): number {
  // * 컨트랙트: sqrt(xp / 10 + 4) - 1 (전부 정수 연산, 나눗셈과 제곱근 모두 버림)
  //   xp / 10n 은 bigint 정수 나눗셈이라 컨트랙트와 똑같이 버린다.
  //   ? Math.sqrt는 소수 연산이라 오차가 걱정될 수 있다. xp/10+4가 완전제곱수면 Math.sqrt가 정확한 정수를 돌려주고,
  //     XP는 많아야 수만 단위라 2^53(소수로 정확히 표현되는 정수 한계)보다 훨씬 작다. 그래서 floor 결과가 정확하다.
  const lv = Math.floor(Math.sqrt(Number(xp / 10n) + 4)) - 1;
  return Math.min(lv, MAX_LEVEL);
}

/**
 * XP 바 표시용.
 * @returns level 현재 레벨, current 이번 레벨에서 쌓은 XP, needed 다음 레벨까지 이번 레벨 구간의 전체 XP
 *          최대 레벨이면 needed = 0 (화면은 XP 바를 가득 찬 것으로 그린다)
 * 예: xp 70 → Lv 2(50부터), Lv 3은 120 → { level: 2, current: 20, needed: 70 }
 */
export function levelProgress(xp: bigint): { level: number; current: number; needed: number } {
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const current = Number(xp) - start;
  if (level >= MAX_LEVEL) return { level, current, needed: 0 };
  return { level, current, needed: xpForLevel(level + 1) - start };
}

/** 레벨 → 성장 단계. PetNFT.stageOf와 같은 구간 */
export function stageFromLevel(level: number): Stage {
  if (level < 3) return 0; // 알 (Lv 1~2)
  if (level < 7) return 1; // 아기 (Lv 3~6)
  if (level < 12) return 2; // 어린이 (Lv 7~11)
  if (level < 20) return 3; // 어른 (Lv 12~19)
  return 4; // 각성 (Lv 20)
}
