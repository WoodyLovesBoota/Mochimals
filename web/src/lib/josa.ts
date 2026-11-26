// * 한국어 조사 고르기 (을/를, 이/가, 으로/로). 화면 문구에 펫 이름·단계 이름을 끼울 때 쓴다.
//   ? 한글 글자 코드 = 0xAC00 + (초성×21 + 중성)×28 + 종성. (코드 - 0xAC00) % 28 이 종성(받침) 번호다. 0 = 받침 없음.

/** 마지막 글자에 받침이 있는지. 한글이 아니면 false */
export function hasFinal(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/** 받침이 ㄹ인지 ("로"는 ㄹ 받침 뒤에서도 "로": "길로") */
function finalIsRieul(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 === 8;
}

/** 이/가: "개구리가", "어른이" */
export const iGa = (word: string) => word + (hasFinal(word) ? "이" : "가");
/** 을/를: "스카프를", "밤하늘을" */
export const eulReul = (word: string) => word + (hasFinal(word) ? "을" : "를");
/** 으로/로: "어린이로", "어른으로", "길로" */
export const euro = (word: string) => word + (hasFinal(word) && !finalIsRieul(word) ? "으로" : "로");
