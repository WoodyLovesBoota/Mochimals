// * 행동 결과 이벤트 → "어떤 연출을 틀지" 데이터로 바꾸는 순수 함수 (4강 7교시, SPEC 12장 연출 표).
//   usePetAction이 돌려주는 events(parseEventLogs 결과)를 받아서, 화면이 바로 쓸 수 있는 PetEffect 하나로 만든다.
//   ? 왜 컴포넌트 안에서 바로 하지 않고 따로 뺄까?
//     "레벨업인데 단계가 바뀌었나?", "부화인가?" 같은 판단은 그림(Motion)과 상관없는 규칙이다.
//     순수 함수로 빼면 브라우저 없이 vitest로 경우를 전부 검사할 수 있다 (look.ts, time.ts와 같은 방식).
import { stageFromLevel, type Stage } from "./look";

// * 우리가 보는 이벤트만 좁힌 타입. parseEventLogs 결과는 이보다 넓지만(블록 번호, 로그 위치 등)
//   여기서 필요한 건 eventName과 args뿐이다. 이렇게 좁히면 테스트에서 가짜 이벤트를 쉽게 만들 수 있다.
//   eventName 값과 args 이름은 PetNFT.sol의 event 선언(105~113줄)과 같다.
export type PetEvent =
  | { eventName: "Fed"; args: { petId: bigint; xp: bigint } }
  | { eventName: "Trained"; args: { petId: bigint; xpGained: bigint; xp: bigint } }
  | { eventName: "LevelUp"; args: { petId: bigint; level: bigint } }
  // 그 외 이벤트(Adopted, Refilled, MetadataUpdate 등)는 연출에 안 쓴다. 이름만 맞으면 통과시키고 무시한다.
  | { eventName: string; args?: unknown };

// * 화면이 받는 연출 데이터. 없는 연출은 null.
export type PetEffect = {
  // 펫 위로 떠오르는 +숫자 (SPEC: XP 획득, 0.6초)
  xpGained: number | null;
  // 새 레벨. LevelUp 이벤트가 있을 때만 (SPEC: 레벨업, 1.5초)
  levelUp: number | null;
  // 단계가 바뀌었으면 { from, to } (SPEC: 진화 3초). to === 1이면 부화(알 → 아기)다.
  evolve: { from: Stage; to: Stage } | null;
  // 표정을 잠시 바꾼다 (SPEC 5장 표정 우선순위의 excited/happy). ms는 유지 시간.
  emotion: { name: "excited" | "happy"; ms: number } | null;
};

// PetNFT.FEED_XP. Fed 이벤트에는 "얻은 양"이 없고 "누적 XP"만 있어서 상수로 쓴다 (PetActions의 FEED_XP와 같은 값).
// ? 왜 Fed에는 xpGained가 없을까? 밥은 항상 +10이라 컨트랙트가 굳이 싣지 않았다. 훈련은 배고픔에 따라 40/20이라 싣는다.
const FEED_XP = 10;

// SPEC 5장: 레벨업 직후 excited 3초, 밥 먹은 직후 happy 10초
const EXCITED_MS = 3_000;
const HAPPY_MS = 10_000;

export function toPetEffect(events: readonly PetEvent[]): PetEffect | null {
  // * find + 이름 비교로 원하는 이벤트를 꺼낸다. 판별 유니온이라 eventName을 확인하면 TS가 args 모양을 안다.
  //   다만 마지막 갈래가 eventName: string이라 자동으로 좁혀지지 않으므로, 타입 가드 함수(is…)를 쓴다.
  const fed = events.find(isFed);
  const trained = events.find(isTrained);
  const levelUp = events.find(isLevelUp);

  // 연출할 게 없는 행동 (충전, 입양): null → 화면은 아무것도 안 튼다
  if (!fed && !trained && !levelUp) return null;

  // XP 숫자: 훈련이면 이벤트의 xpGained, 밥이면 상수 10
  const xpGained = trained ? Number(trained.args.xpGained) : fed ? FEED_XP : null;

  // * 레벨과 단계. 컨트랙트 _gainXp(PetNFT.sol 286줄)는 한 번에 1레벨만 오른다 (레벨 간격 최소 50 > 최대 획득 40).
  //   그래서 "이전 레벨 = 새 레벨 − 1"로 놓고 단계를 비교하면 된다. 읽기 전 상태를 따로 기억할 필요가 없다.
  //   ? 수치가 바뀌어 한 번에 2레벨이 오르면? 이 가정이 깨진다. 그때는 행동 전 pet.level을 넘겨받도록 바꿔야 한다.
  const newLevel = levelUp ? Number(levelUp.args.level) : null;
  let evolve: PetEffect["evolve"] = null;
  if (newLevel !== null) {
    const from = stageFromLevel(newLevel - 1);
    const to = stageFromLevel(newLevel);
    if (from !== to) evolve = { from, to };
  }

  // * 표정: 레벨업(excited)이 밥(happy)보다 우선. 밥으로 레벨업하면 excited 3초만 준다.
  //   SPEC 5장 우선순위 "excited > happy > hungry > sleepy > idle"과 같은 순서다.
  const emotion: PetEffect["emotion"] =
    newLevel !== null ? { name: "excited", ms: EXCITED_MS } : fed ? { name: "happy", ms: HAPPY_MS } : null;

  return { xpGained, levelUp: newLevel, evolve, emotion };
}

// 타입 가드: true를 돌려주면 TS가 e를 그 갈래 타입으로 좁힌다 (`e is …`)
function isFed(e: PetEvent): e is Extract<PetEvent, { eventName: "Fed" }> {
  return e.eventName === "Fed";
}
function isTrained(e: PetEvent): e is Extract<PetEvent, { eventName: "Trained" }> {
  return e.eventName === "Trained";
}
function isLevelUp(e: PetEvent): e is Extract<PetEvent, { eventName: "LevelUp" }> {
  return e.eventName === "LevelUp";
}
