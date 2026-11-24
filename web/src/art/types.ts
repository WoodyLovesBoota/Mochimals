// * 아트 세트 인터페이스 (SPEC 6장). 화면 코드는 이 타입만 알고, 실제 그림은 모른다.
//
//   체인 ──▶ look.ts(getPetLook) ──PetLook──▶ ArtSet.render() ──ArtOutput──▶ <PetSprite>
//                                              ↑ 이 겹만 갈아 끼우면 그림 전체가 바뀐다 (art/index.ts 한 줄)
import type { PetLook } from "@/lib/look";

/** 레이어 이름. 뒤에서 앞 순서로 겹친다 (SPEC 6-1의 순서) */
export type LayerName =
  | "fx_back"
  | "ears"
  | "sprout"
  | "body"
  | "pattern"
  | "feet"
  | "face"
  | "mark"
  | "item"
  | "arms"
  | "fx_front";

/**
 * 아트 세트가 돌려주는 그림.
 * - layers: 400×400 좌표의 SVG 조각들. <svg viewBox="0 0 400 400"> 하나 안에 순서대로 겹친다
 * - image : 완성된 이미지 주소 (예: 3D 렌더 PNG). <img>로 그린다
 * 화면(PetSprite)은 두 가지를 모두 지원해야 한다.
 */
export type ArtOutput =
  | { kind: "layers"; layers: { name: LayerName; svg: string }[] }
  | { kind: "image"; src: string };

export type RenderOptions = {
  /**
   * SVG 안의 id(clipPath 등) 앞에 붙일 고유 문자열.
   * ! 한 페이지에 펫이 여러 마리(랭킹 화면)면 id가 겹쳐서 다른 펫의 clipPath로 잘리는 버그가 생긴다.
   *   PetSprite가 React useId()로 인스턴스마다 다른 값을 넘긴다.
   * (SPEC 6장의 render(look)에 선택 인자를 더한 것이다. 안 넘겨도 동작한다.)
   */
  idPrefix?: string;
};

export interface ArtSet {
  /** 아트 세트 이름. 메타데이터, 캐시 키 등에 쓴다 */
  id: string;
  /** 같은 세트 안에서 그림이 바뀌면 올린다 (마켓 새로고침 판단용) */
  version: number;
  render(look: PetLook, options?: RenderOptions): ArtOutput;
}
