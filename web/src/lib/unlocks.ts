// * 레벨별 해금표 (SPEC 12장 표). 컨트랙트에는 없다. 레벨만 보고 화면이 정한다.
//   ? 왜 컨트랙트에 안 넣을까? 해금은 "보여주는 방식"이라 그림처럼 바뀔 수 있다.
//     레벨은 체인에 있으니, 해금은 레벨에서 언제든 다시 계산할 수 있다 (SPEC 14장: 레벨·단계 저장 추가 금지와 같은 생각).
//   SPEC: "액세서리와 배경은 해금된 것 중 최신 것을 자동 적용". 이번 범위에서 액세서리는 그림 없이 이름만 보여준다.


/** 해금 배경 id. globals.scss의 장면 변수(--scene-m-<id>)와 이름이 같다 */
export type BackgroundId = "field" | "sunset" | "night" | "crystal";

/** 랭킹 테두리 */
export type RankBorder = "silver" | "gold";

/**
 * 해금 종류. 화면이 아이콘과 색을 고를 때만 쓴다 (리디자인 시안 16 해금 목록).
 * evolve=반짝(라임), accessory=셔츠(호박), background=산(파랑), title=별(보라), egg/motion=하트(분홍), rank=트로피
 */
export type UnlockKind = "evolve" | "accessory" | "background" | "title" | "egg" | "motion" | "rank";

/** 해금 한 줄. 화면 목록에 보여줄 이름(label)과, 실제로 화면에 적용할 값(있으면)을 같이 둔다 */
export type Unlock = {
  level: number;
  /** 화면 문구. 리디자인 시안 16의 표기("분류 · 이름")를 따른다 */
  label: string;
  kind: UnlockKind;
  /** 이 해금이 바꾸는 것 (화면 적용용). 이름만 보여주는 해금(액세서리, 진화 등)은 없다 */
  effect?:
    | { kind: "background"; id: BackgroundId }
    | { kind: "title"; title: string }
    | { kind: "border"; border: RankBorder }
    | { kind: "dance" };
};

// * SPEC 12장 표를 옮긴 것. 문구는 리디자인 시안 16 표기로 바꿨다 (시안이 우선: "액세서리: 리본" → "Accessory · Ribbon"). 한 레벨에 해금이 둘이면 두 줄로 쓴다 (Lv 10, 12, 20).
//   순서: 레벨 오름차순. 아래 함수들은 이 순서를 믿는다 ("최신 것" = 조건에 맞는 마지막 줄).
export const UNLOCKS: readonly Unlock[] = [
  { level: 1, label: "Adoption · Basic background", kind: "background" },
  { level: 2, label: "Egg cracks", kind: "egg" },
  { level: 3, label: "Hatch · Species revealed", kind: "evolve" },
  { level: 4, label: "Title · Sprout Keeper", kind: "title", effect: { kind: "title", title: "Sprout Keeper" } },
  { level: 5, label: "Accessory · Ribbon", kind: "accessory" },
  { level: 6, label: "Background · Meadow", kind: "background", effect: { kind: "background", id: "field" } },
  { level: 7, label: "Evolution · Kid", kind: "evolve" },
  { level: 8, label: "Accessory · Scarf", kind: "accessory" },
  { level: 9, label: "Title · Trusty Keeper", kind: "title", effect: { kind: "title", title: "Trusty Keeper" } },
  { level: 10, label: "Background · Sunset Hill", kind: "background", effect: { kind: "background", id: "sunset" } },
  { level: 10, label: "Silver ranking border", kind: "rank", effect: { kind: "border", border: "silver" } },
  { level: 11, label: "Accessory · Hat", kind: "accessory" },
  { level: 12, label: "Evolution · Adult", kind: "evolve" },
  { level: 12, label: "Species signature item", kind: "accessory" },
  { level: 13, label: "Title · Skilled Keeper", kind: "title", effect: { kind: "title", title: "Skilled Keeper" } },
  { level: 14, label: "Background · Night Sky", kind: "background", effect: { kind: "background", id: "night" } },
  { level: 15, label: "Accessory · Cape", kind: "accessory" },
  { level: 16, label: "Special move · Dance", kind: "motion", effect: { kind: "dance" } },
  { level: 17, label: "Background · Crystal Cave", kind: "background", effect: { kind: "background", id: "crystal" } },
  { level: 18, label: "Title · Veteran Keeper", kind: "title", effect: { kind: "title", title: "Veteran Keeper" } },
  { level: 19, label: "Accessory · Star Crown", kind: "accessory" },
  { level: 20, label: "Awakening", kind: "evolve" },
  { level: 20, label: "Title · Legendary Keeper", kind: "title", effect: { kind: "title", title: "Legendary Keeper" } },
  { level: 20, label: "Gold ranking border", kind: "rank", effect: { kind: "border", border: "gold" } },
];

/** 정확히 이 레벨에서 새로 열리는 것 (레벨업 연출의 "새 해금 카드"용) */
export function unlocksAt(level: number): Unlock[] {
  return UNLOCKS.filter((u) => u.level === level);
}

/**
 * 해금된 것 중 kind가 맞는 마지막(=가장 높은 레벨) effect.
 * ? 제네릭 K: kind 값으로 effect 타입을 좁혀서 돌려준다. latest(5, "title")이면 반환 타입이 { kind: "title"; title } | null.
 */
function latest<K extends NonNullable<Unlock["effect"]>["kind"]>(
  level: number,
  kind: K,
): Extract<NonNullable<Unlock["effect"]>, { kind: K }> | null {
  let found: Extract<NonNullable<Unlock["effect"]>, { kind: K }> | null = null;
  for (const u of UNLOCKS) {
    if (u.level > level) break; // 레벨 오름차순이라 여기서 멈춰도 된다
    if (u.effect?.kind === kind) found = u.effect as Extract<NonNullable<Unlock["effect"]>, { kind: K }>;
  }
  return found;
}

/**
 * 장면 id: 해금 배경 넷 + Lv 1~5의 기본 장면. globals.scss의 --scene-m-<id> / --scene-d-<id>와 이름이 같다.
 */
export type SceneId = BackgroundId | "base";

/** * 지금 레벨의 장면 (펫 화면 배경). 배경 해금 전(Lv 1~5)이면 "base" */
export function sceneFor(level: number): SceneId {
  return currentBackground(level) ?? "base";
}

/** 지금 적용할 배경. 없으면 null (Lv 1~5) */
export function currentBackground(level: number): BackgroundId | null {
  return latest(level, "background")?.id ?? null;
}

/** 지금 칭호. Lv 4 전에는 null */
export function currentTitle(level: number): string | null {
  return latest(level, "title")?.title ?? null;
}

/** 랭킹 테두리. Lv 10 은색, Lv 20 금색 */
export function rankBorder(level: number): RankBorder | null {
  return latest(level, "border")?.border ?? null;
}

/** 춤 모션 해금 여부 (Lv 16) */
export function canDance(level: number): boolean {
  return latest(level, "dance") !== null;
}

/**
 * * 레벨업 직후 알림 문구 (시안 02 "Lv 7 해금 · 어린이로 진화!").
 *   진화는 "어린이로 진화!"처럼 문장으로, 나머지는 이름을 " · "로 잇는다.
 */
export function unlockToast(level: number): string | null {
  const list = unlocksAt(level);
  if (list.length === 0) return null;
  const parts = list.map((u) => {
    // "Evolution · Kid" → "어린이로 진화!", "Evolution · Adult" → "어른으로 진화!" (조사는 lib/josa.ts)
    if (u.kind === "evolve" && u.label.startsWith("Evolution · ")) {
      return `Evolved into ${u.label.slice("Evolution · ".length)}!`;
    }
    return u.label;
  });
  return `Lv ${level} unlocked · ${parts.join(" · ")}`;
}

/**
 * * 레벨업 연출의 보상 알약 문구 (시안 07 "Lv 8 보상 · 스카프를 받았어요!").
 *   "분류 · 이름"이면 이름만 쓴다 ("Accessory · Scarf" → "스카프"). 여러 개면 쉼표로 잇는다.
 * @returns 이 레벨에 해금이 없으면 null
 */
export function unlockReward(level: number): string | null {
  const names = unlocksAt(level).map((u) => u.label.split(" · ").at(-1)!);
  if (names.length === 0) return null;
  const last = names.at(-1)!;
  // 을/를: 받침 있으면 "을", 없으면 "를"
  // 을/를: 마지막 이름의 받침으로 고른다 (lib/josa.ts)
  return `Lv ${level} reward · You got ${names
    .slice(0, -1)
    .map((n) => n + ", ")
    .join("")}${last}!`;
}
