// * 더미 아트 세트 (SPEC 13장 완료 기준: "ACTIVE_ART_SET을 더미 아트 세트(kind: 'image')로 바꿔도
//   다른 파일 수정 없이 앱이 동작한다. 이를 확인하는 더미 세트를 art/dummy/에 하나 둔다").
//   그림 대신 public/art/dummy/stage-<단계>.svg 이미지 주소를 돌려준다. 3D 렌더 PNG로 바꿀 때의 모양과 같다.
//   확인 방법: art/index.ts의 ACTIVE_ART_SET을 dummy로 바꾸고 화면(/pet/1)과 /api/pet/1/image.png를 본다.
import type { PetLook } from "@/lib/look";
import type { ArtOutput, ArtSet } from "../types";

export const dummy: ArtSet = {
  id: "dummy",
  version: 1,
  render(look: PetLook): ArtOutput {
    // * 상대 주소. 화면은 그대로 <img src>로 쓰고, 이미지 API는 APP_URL을 붙여 절대 주소로 바꾼다 (image.png/route.tsx)
    return { kind: "image", src: `/art/dummy/stage-${look.stage}.svg` };
  },
  // background는 일부러 안 둔다: 선택 메서드가 없어도 화면이 기본 배경으로 동작하는지까지 확인한다
};
