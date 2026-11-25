// * 연출 상태를 들고 있는 훅 (4강 7교시).
//   PetActions가 행동을 끝내면 play(effect)를 부르고, PetView/PetCard는 여기서 "지금 틀 연출"을 읽는다.
//   판단 규칙(레벨업인가, 진화인가)은 lib/effects.ts가 이미 끝냈다. 이 훅은 "언제 켜고 언제 끄는지"만 맡는다.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PetEffect } from "@/lib/effects";
import type { Emotion } from "@/lib/look";

// 새 해금 카드를 보여주는 시간
const UNLOCK_CARD_MS = 6_000;

export function usePetEffect() {
  // * 지금 재생 중인 연출과 그 번호(key).
  //   ? 왜 번호가 필요할까? 밥을 두 번 연달아 주면 두 번 다 { xpGained: 10, ... }로 내용이 같다.
  //     React(그리고 Motion의 AnimatePresence)는 key가 바뀌어야 "새 요소"로 보고 애니메이션을 처음부터 다시 튼다.
  const [current, setCurrent] = useState<{ key: number; effect: PetEffect } | null>(null);
  const nextKey = useRef(0);

  // * 표정 덮어쓰기 (excited 3초 / happy 10초). null이면 PetView의 기본 규칙(hungry → sleepy → idle)을 쓴다.
  //   ! current와 따로 둔다. 같이 두면 "밥(happy 10초) → 2초 뒤 훈련(표정 없음)"에서
  //     훈련 연출이 current를 바꾸면서 happy 타이머를 지워 버리고, 새 타이머는 안 걸려서 happy가 영원히 남는다.
  //     표정이 있는 연출만 이 상태를 건드리면, 표정 없는 훈련은 happy 타이머를 그대로 둔다.
  const [emotion, setEmotion] = useState<{ key: number; name: Emotion; ms: number } | null>(null);

  // * 새 해금 카드 (SPEC 12장 레벨업 연출의 "새 해금 카드"). 올라간 레벨을 기억하고 6초 뒤 지운다.
  //   표정과 같은 이유로 따로 둔다. 레벨업 배지(1.5초)보다 길게 둬야 글자를 읽을 수 있고,
  //   진화 연출(3초)이 화면을 덮는 동안에도 사라지지 않아야 하기 때문이다.
  //   진화든 아니든 레벨이 오르면 띄운다 (Lv 7 "진화 (어린이)"도 해금표의 한 줄이다).
  const [unlock, setUnlock] = useState<{ key: number; level: number } | null>(null);

  const play = useCallback((effect: PetEffect | null) => {
    // 충전처럼 연출할 게 없으면 아무것도 안 한다
    if (!effect) return;
    nextKey.current += 1;
    const key = nextKey.current;
    // * 진화면 레벨업 배지는 띄우지 않는다 (SPEC 12장: 레벨업 연출은 "단계 그대로"일 때, 단계가 바뀌면 진화 연출).
    //   ? 왜 화면에서 `evolve === null`로 거르지 않고 여기서 levelUp을 지울까?
    //     진화 연출이 끝나면 clear("evolve")로 evolve가 null이 된다. 화면에서 거르면 그 순간 조건이 참이 되어
    //     뒤늦게 레벨업 배지가 튀어나온다. 시작할 때 한 번 정해 두면 그런 일이 없다.
    setCurrent({ key, effect: effect.evolve ? { ...effect, levelUp: null } : effect });
    if (effect.emotion) setEmotion({ key, ...effect.emotion });
    // effect.levelUp은 진화일 때 위에서 null로 바꾼 값이 아니라 원래 값이다 (effect는 인자 그대로)
    if (effect.levelUp !== null) setUnlock({ key, level: effect.levelUp });
  }, []);

  // * 표정 끄기 타이머. emotion이 새 객체가 될 때마다(= 표정 있는 새 연출) 이전 타이머를 지우고 새로 건다.
  //   ! cleanup의 clearTimeout이 없으면: 밥(10초) 직후 레벨업(3초)했을 때 밥 타이머가 남아 있다가 엉뚱한 순간에 표정을 지운다.
  //     페이지를 떠난 뒤에도 타이머가 돌아 없는 컴포넌트의 상태를 바꾸려 한다.
  //   key가 객체에 들어 있어서, 밥을 연달아 주면 내용이 같아도 새 객체 → 10초가 다시 시작한다.
  useEffect(() => {
    if (!emotion) return;
    const timer = setTimeout(() => setEmotion(null), emotion.ms);
    return () => clearTimeout(timer);
  }, [emotion]);

  // 새 해금 카드 끄기 타이머 (표정 타이머와 같은 방식)
  useEffect(() => {
    if (!unlock) return;
    const timer = setTimeout(() => setUnlock(null), UNLOCK_CARD_MS);
    return () => clearTimeout(timer);
  }, [unlock]);

  // * 한 번짜리 연출 조각(XP 숫자, 레벨업 배지, 진화 연출)이 끝났을 때 부른다 (Motion의 onAnimationComplete에서).
  //   그 조각만 null로 바꾸고 나머지는 둔다. 다음 렌더에서 그 요소가 사라진다 (AnimatePresence가 exit를 튼다).
  //   key는 그대로라서 표정 타이머나 다른 조각에는 영향이 없다.
  const clear = useCallback((part: "xpGained" | "levelUp" | "evolve") => {
    setCurrent((c) => (c ? { ...c, effect: { ...c.effect, [part]: null } } : c));
  }, []);

  return { current, emotion: emotion?.name ?? null, unlock, play, clear };
}
