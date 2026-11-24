// * 배고픔까지 남은 시간 + "배고파지는 순간 다시 읽기" (4강, SPEC 8장).
//   SPEC 8장: 블록마다 다시 읽는 watch는 쓰지 않는다. 대신 lastFedAt + 24시간 시각에 맞춘 타이머 1회로 다시 읽는다.
"use client";

import { useEffect, useState } from "react";
import { hungryAtMs } from "@/lib/time";

/**
 * @param lastFedAt 컨트랙트 값 (유닉스 초)
 * @param hungry    컨트랙트 isHungry. 이미 배고프면 타이머가 필요 없다
 * @param onHungry  배고파지는 시각에 한 번 부른다 (보통 usePet의 refetch)
 * @returns 남은 밀리초 (1분마다 갱신). 이미 배고프면 0
 */
export function useHungerTimer(lastFedAt: bigint, hungry: boolean, onHungry: () => void): number {
  const at = hungryAtMs(lastFedAt);
  // * 지금 시각을 state로 둔다. 렌더 중에 Date.now()를 직접 부르면 서버와 브라우저의 값이 달라
  //   hydration 경고가 나거나, 같은 렌더 안에서 값이 바뀔 수 있다.
  const [now, setNow] = useState(() => Date.now());

  // ① 남은 시간 표시: 1분마다 now를 갱신한다 (표시가 "분" 단위라 1초마다 할 필요가 없다)
  useEffect(() => {
    if (hungry) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    // * cleanup: 컴포넌트가 사라지거나 값이 바뀌면 이전 타이머를 지운다. 안 지우면 타이머가 계속 쌓인다.
    return () => clearInterval(t);
  }, [hungry]);

  // ② 배고파지는 순간 다시 읽기: 타이머 1회
  useEffect(() => {
    if (hungry) return;
    const delay = at - Date.now();
    // ? 이미 시각이 지났는데 hungry가 false면? 화면의 데이터가 낡았다는 뜻이라 바로 다시 읽는다.
    if (delay <= 0) {
      onHungry();
      return;
    }
    // ! setTimeout의 최대 지연은 약 24.8일(2^31 - 1 ms)이다. 넘으면 즉시 실행돼 버린다.
    //   배고픔까지는 최대 24시간이라 안전하다.
    const t = setTimeout(onHungry, delay);
    return () => clearTimeout(t);
    // ? onHungry를 의존성에서 뺀 이유: 부모가 렌더마다 새 함수를 넘기면 타이머가 매번 다시 걸린다.
    //   값(at, hungry)이 바뀔 때만 다시 걸면 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, hungry]);

  return hungry ? 0 : Math.max(0, at - now);
}
