// * 레벨별 해금표 (SPEC 12장 표). 컨트랙트에는 없다. 레벨만 보고 화면이 정한다.
//   ? 왜 컨트랙트에 안 넣을까? 해금은 "보여주는 방식"이라 그림처럼 바뀔 수 있다.
//     레벨은 체인에 있으니, 해금은 레벨에서 언제든 다시 계산할 수 있다 (SPEC 14장: 레벨·단계 저장 추가 금지와 같은 생각).
//   SPEC: "액세서리와 배경은 해금된 것 중 최신 것을 자동 적용". 이번 범위에서 액세서리는 그림 없이 이름만 보여준다.

/** 해금 배경 id. globals.scss의 --bg-<id> CSS 변수와 이름이 같다 */
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

// * SPEC 12장 표를 옮긴 것. 문구는 리디자인 시안 16 표기로 바꿨다 (시안이 우선: "액세서리: 리본" → "액세서리 · 리본"). 한 레벨에 해금이 둘이면 두 줄로 쓴다 (Lv 10, 12, 20).
//   순서: 레벨 오름차순. 아래 함수들은 이 순서를 믿는다 ("최신 것" = 조건에 맞는 마지막 줄).
export const UNLOCKS: readonly Unlock[] = [
  { level: 1, label: "입양 · 기본 배경", kind: "background" },
  { level: 2, label: "알에 금이 감", kind: "egg" },
  { level: 3, label: "부화 · 종 공개", kind: "evolve" },
  { level: 4, label: "칭호 · 새싹 집사", kind: "title", effect: { kind: "title", title: "새싹 집사" } },
  { level: 5, label: "액세서리 · 리본", kind: "accessory" },
  { level: 6, label: "배경 · 들판", kind: "background", effect: { kind: "background", id: "field" } },
  { level: 7, label: "진화 · 어린이", kind: "evolve" },
  { level: 8, label: "액세서리 · 스카프", kind: "accessory" },
  { level: 9, label: "칭호 · 든든한 집사", kind: "title", effect: { kind: "title", title: "든든한 집사" } },
  { level: 10, label: "배경 · 노을 언덕", kind: "background", effect: { kind: "background", id: "sunset" } },
  { level: 10, label: "랭킹 은색 테두리", kind: "rank", effect: { kind: "border", border: "silver" } },
  { level: 11, label: "액세서리 · 모자", kind: "accessory" },
  { level: 12, label: "진화 · 어른", kind: "evolve" },
  { level: 12, label: "종 시그니처 아이템", kind: "accessory" },
  { level: 13, label: "칭호 · 숙련 집사", kind: "title", effect: { kind: "title", title: "숙련 집사" } },
  { level: 14, label: "배경 · 밤하늘", kind: "background", effect: { kind: "background", id: "night" } },
  { level: 15, label: "액세서리 · 망토", kind: "accessory" },
  { level: 16, label: "특수 모션 · 춤", kind: "motion", effect: { kind: "dance" } },
  { level: 17, label: "배경 · 수정 동굴", kind: "background", effect: { kind: "background", id: "crystal" } },
  { level: 18, label: "칭호 · 베테랑 집사", kind: "title", effect: { kind: "title", title: "베테랑 집사" } },
  { level: 19, label: "액세서리 · 별 왕관", kind: "accessory" },
  { level: 20, label: "각성", kind: "evolve" },
  { level: 20, label: "칭호 · 전설의 집사", kind: "title", effect: { kind: "title", title: "전설의 집사" } },
  { level: 20, label: "랭킹 금색 테두리", kind: "rank", effect: { kind: "border", border: "gold" } },
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

/** 지금 적용할 배경. 없으면 null → 아트 세트의 종별 기본 배경 */
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
    // "진화 · 어린이" → "어린이로 진화!", "진화 · 어른" → "어른으로 진화!"
    // ? 조사 "로/으로"는 마지막 글자의 받침으로 정한다. 한글 글자 코드 = 0xAC00 + (초성×21 + 중성)×28 + 종성 이라서
    //   (코드 - 0xAC00) % 28 이 종성 번호다. 0 = 받침 없음, 8 = ㄹ (ㄹ 받침은 "로": "길로")
    if (u.kind === "evolve" && u.label.startsWith("진화 · ")) {
      const name = u.label.slice("진화 · ".length);
      const code = name.charCodeAt(name.length - 1) - 0xac00;
      const hasFinal = code >= 0 && code % 28 !== 0 && code % 28 !== 8; // 받침 있음 (ㄹ 받침(8)은 "로")
      return `${name}${hasFinal ? "으로" : "로"} 진화!`;
    }
    return u.label;
  });
  return `Lv ${level} 해금 · ${parts.join(" · ")}`;
}
