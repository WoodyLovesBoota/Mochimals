// * 아트 세트 결과(ArtOutput)를 완성된 SVG 문자열 하나로 합친다.
//   화면(PetSprite)과 NFT 이미지 API(/api/pet/[id]/image.png)가 같은 함수를 쓴다.
//   ! SPEC 11장: "게임 화면과 NFT 이미지가 같은 코드에서 나와야 한다". 그래서 레이어를 겹치는 규칙을 한 곳에만 둔다.
import type { ArtOutput } from "./types";

/** layers 결과를 <svg> 안쪽 내용으로. 레이어마다 <g data-layer="이름">으로 감싸 뒤에서 앞 순서로 겹친다 */
export function layersToInner(layers: Extract<ArtOutput, { kind: "layers" }>["layers"]): string {
  return layers.map((l) => `<g data-layer="${l.name}">${l.svg}</g>`).join("");
}

/**
 * 완성된 SVG 문서 문자열 (서버 이미지 변환용).
 * @param background 배경색. 주면 400×400 사각형을 맨 뒤에 깐다 (마켓에서 투명 배경이 어둡게 보이지 않게)
 */
export function layersToSvg(layers: Extract<ArtOutput, { kind: "layers" }>["layers"], background?: string): string {
  // 아트 좌표는 항상 400×400 (SPEC 6-2 앵커)
  const bg = background ? `<rect width="400" height="400" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${bg}${layersToInner(layers)}</svg>`;
}
