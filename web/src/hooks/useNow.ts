// * 지금 시각(밀리초)을 주기마다 다시 주는 훅. "2시간 14분째"처럼 시간이 흐르는 글자에 쓴다.
//   ? 왜 렌더 중에 Date.now()를 바로 부르지 않을까? 렌더는 같은 입력이면 같은 결과여야 한다(순수 함수, React 규칙).
//     Date.now()는 부를 때마다 달라서, 언제 다시 그려지느냐에 따라 글자가 들쭉날쭉해진다. 상태로 두면 바뀌는 때가 분명하다.
"use client";

import { useEffect, useState } from "react";

export function useNow(intervalMs = 60_000): number {
  // useState의 초기화 함수는 처음 한 번만 불린다 (렌더마다 부르지 않는다)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
