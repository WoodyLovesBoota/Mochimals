// ! useId(훅)를 쓰므로 클라이언트 컴포넌트다. 서버 컴포넌트(랭킹 페이지 등) 안에 넣어도 된다.
"use client";

import { useId } from "react";
import { ACTIVE_ART_SET } from "@/art";
import { layersToInner } from "@/art/compose";
import type { PetLook } from "@/lib/look";
import styles from "./PetSprite.module.scss";

type Props = {
  look: PetLook;
  /** 가로세로 픽셀 (정사각형). 랭킹 썸네일 48, 내 펫 화면 280 등 */
  size: number;
  className?: string;
};

/**
 * * 펫 그림 하나. 어떤 아트 세트든 ACTIVE_ART_SET.render()의 결과만 보고 그린다 (SPEC 6장).
 *   ! 이 파일에는 종별 분기("판다면 ...")나 SVG 좌표를 절대 쓰지 않는다. 그건 아트 세트의 일이다.
 */
export function PetSprite({ look, size, className }: Props) {
  // * 인스턴스마다 다른 id. 랭킹처럼 한 페이지에 펫이 여러 마리여도 clipPath id가 겹치지 않는다.
  //   React useId()는 "_r_1_" 같은 값을 준다. SVG url(#...)에서 문제가 될 수 있는 글자는 지워서 쓴다.
  const idPrefix = "pet" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const out = ACTIVE_ART_SET.render(look, { idPrefix });
  const label = "펫 그림"; // 스크린리더용. 종 이름 등은 부모가 글자로 따로 보여준다

  // 이미지 세트 (예: 3D 렌더 PNG)
  if (out.kind === "image") {
    return (
      // ? next/image가 아니라 <img>를 쓰는 이유: 아트 세트가 어떤 주소(외부 CDN 등)를 줄지 모르고,
      //   next/image는 외부 주소마다 next.config 허용 목록이 필요하다. 크기가 정해진 작은 그림이라 최적화 이득도 적다.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={out.src} width={size} height={size} alt={label} className={`${styles.sprite} ${className ?? ""}`} />
    );
  }

  // 레이어 세트 (flat-v1): 레이어 SVG 조각을 순서대로 이어 붙여 <svg> 하나에 넣는다 (뒤 → 앞)
  // ! dangerouslySetInnerHTML: 문자열을 HTML로 그대로 넣는다. 사용자 입력이 들어가면 XSS 위험이 있다.
  //   여기 문자열은 우리 아트 세트 코드가 숫자(dna, stage)로만 만든 것이라 안전하다.
  //   아트 세트에 사용자 입력(예: 펫 이름)을 절대 넘기지 않는다.
  // 레이어 합치기는 NFT 이미지 API와 같은 함수를 쓴다 (art/compose.ts)
  const inner = layersToInner(out.layers);
  return (
    <svg
      viewBox="0 0 400 400" // 아트 좌표는 항상 400×400 (SPEC 6-2 앵커). size만큼 줄이거나 키워서 보여준다
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={`${styles.sprite} ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
