// * 지금 쓰는 아트 세트. 그림을 통째로 바꿀 때 이 한 줄만 바꾼다 (SPEC 6장).
//   화면(PetSprite)과 이미지 API는 ACTIVE_ART_SET.render()만 부르고, flat-v1을 직접 import하지 않는다.
import { flatV1 } from "./flat-v1";
import type { ArtSet } from "./types";

export const ACTIVE_ART_SET: ArtSet = flatV1;
