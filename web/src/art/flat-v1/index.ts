// * flat-v1 아트 세트: PetLook → 레이어 SVG 조각들.
//   화면과 이미지 API는 이 객체의 render()만 부른다. 종별 분기와 좌표는 전부 이 폴더 안에 있다.
import type { PetLook } from "@/lib/look";
import type { ArtOutput, ArtSet, RenderOptions } from "../types";
import { layers } from "./layers";
import { STAGE_SCALE } from "./palette";

export const flatV1: ArtSet = {
  id: "flat-v1",
  version: 1,
  render(look: PetLook, options?: RenderOptions): ArtOutput {
    // id 앞부분. 생략하면 Python과 같은 규칙으로 만든다 (한 페이지에 같은 펫이 둘이면 겹치니 PetSprite는 항상 넘긴다)
    const k = options?.idPrefix || `${look.species}${look.stage}${look.emotion}${look.color}${look.mark}`;
    // ? look.item은 쓰지 않는다. flat-v1은 종별 아이템을 palette에서 정하고, 어른(3) 이상에서만 그린다.
    //   look.ts의 item 규칙(stage >= 3, 종 고정)과 같다. 성격(personality)은 그림이 아니라 모션·말풍선용이다.
    const ls = layers(look.species, look.stage, look.emotion, look.color, look.mark, k);

    // * 단계별 크기: 바닥선 중심(200, 352)을 기준으로 확대한다.
    //   translate(200 352) → scale → translate(-200 -352) = "그 점을 고정하고 키우기"
    //   Python은 전체를 한 번 감쌌지만, ArtOutput은 레이어 목록이라 레이어마다 같은 변환을 씌운다 (보이는 결과는 같다).
    const sc = STAGE_SCALE[look.stage];
    const wrap = (svg: string) => (sc ? `<g transform="translate(200 352) scale(${sc}) translate(-200 -352)">${svg}</g>` : svg);

    return {
      kind: "layers",
      // 빈 레이어(예: 귀 없는 나무늘보의 ears)는 뺀다
      layers: ls.filter((l) => l.svg !== "").map((l) => ({ name: l.name, svg: wrap(l.svg) })),
    };
  },
};

// 종별 무대 배경색 (카드 뒤 색, SPEC 12장). 아트 세트마다 다를 수 있어 여기서 내보낸다.
export { SPECIES as FLAT_V1_SPECIES } from "./palette";
