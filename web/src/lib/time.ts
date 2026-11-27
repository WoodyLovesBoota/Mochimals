// * 배고픔 시각 계산 (4강). 순수 함수라 테스트하기 쉽다 (time.test.ts).
//   ! 배고픈지 "판정"은 항상 컨트랙트 isHungry를 따른다 (SPEC 8장). 여기는 "남은 시간 표시"용 계산만 한다.

// * PetNFT.HUNGRY_AFTER = 1 days (초). 컨트랙트 상수와 같아야 한다.
//   ? 왜 컨트랙트에서 읽지 않을까? constant라 배포 후 절대 안 바뀌고, 읽으면 RPC 요청만 늘어난다.
export const HUNGRY_AFTER_SEC = 24 * 60 * 60;

/**
 * 배고파지는 시각 (밀리초, Date.now()와 같은 단위).
 * ! 컨트랙트는 `block.timestamp > lastFedAt + 1 days`라서 딱 24시간째(같은 초)는 아직 안 배고프다.
 *   24시간 + 1초부터 배고프다. 그래서 +1을 한다.
 * @param lastFedAt 컨트랙트 값 (유닉스 "초", bigint)
 */
export function hungryAtMs(lastFedAt: bigint): number {
  // bigint 초 → number 밀리초. 유닉스 초는 약 17억이라 Number로 바꿔도 정확하다 (2^53보다 훨씬 작다).
  return (Number(lastFedAt) + HUNGRY_AFTER_SEC + 1) * 1000;
}

/**
 * 남은 시간을 짧은 한국어로. 화면 문구 "배고파지기까지 3시간"에 쓴다.
 * @returns 0 이하면 null (이미 배고플 시각)
 * 예: 3시간 20분 → "3시간 20분", 45분 → "45분", 30초 → "under 1 min"
 */
export function formatRemaining(ms: number): string | null {
  if (ms <= 0) return null;
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return "under 1 min";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * * 남은 시간을 시계 모양 "HH:MM"으로. HUD의 배고픔 알약("23:57 남음")에 쓴다 (리디자인 시안 02).
 *   분 단위로 버린다 (1분마다 갱신하는 useHungerTimer와 맞춘다).
 * @returns 0 이하면 null (이미 배고플 시각)
 * 예: 23시간 57분 → "23:57", 5분 → "00:05", 30초 → "00:00"
 */
export function formatClock(ms: number): string | null {
  if (ms <= 0) return null;
  const totalMin = Math.floor(ms / 60_000);
  // padStart(2, "0"): 한 자리면 앞에 0을 붙인다 (5 → "05")
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
