// * NFT 이미지 PNG 800×800 (6강, SPEC 11장). GET /api/pet/7/image.png
//   게임 화면과 같은 코드로 그린다: getPetLook → ACTIVE_ART_SET.render → art/compose.ts의 layersToSvg.
//   ? PNG 변환은 무엇으로? SPEC은 @resvg/resvg-js나 sharp를 예로 들지만, Next.js에 들어 있는 next/og(ImageResponse)를 썼다.
//     ImageResponse는 내부에서 satori + resvg로 JSX를 PNG로 만든다. 패키지를 더 설치하지 않아도 되고 Vercel에서 그대로 돈다.
//     SVG는 <img src="data:image/svg+xml,...">로 넣는다 → resvg가 SVG를 그대로 그린다.
import { ImageResponse } from "next/og";
import { ACTIVE_ART_SET } from "@/art";
import { layersToSvg } from "@/art/compose";
import { appUrl, readPetForMetadata } from "@/lib/metadata";

const SIZE = 800;

export async function GET(_: Request, { params }: RouteContext<"/api/pet/[id]/image.png">) {
  const { id: raw } = await params;
  if (!/^\d+$/.test(raw)) return new Response("Not Found", { status: 404 });
  const pet = await readPetForMetadata(BigInt(raw));
  if (!pet) return new Response("Not Found", { status: 404 });

  const out = ACTIVE_ART_SET.render(pet.look);
  // 배경: 화면의 펫 카드 무대와 같은 아트 세트 배경색 (해금 배경 그라데이션은 화면 연출이라 NFT에는 넣지 않는다)
  const background = ACTIVE_ART_SET.background?.(pet.look) ?? "#f1f2f5";

  // * 두 종류의 아트 출력 모두 지원 (SPEC 6장):
  //   layers → SVG 문자열을 data URI로 / image → 그 이미지 주소 (상대 경로면 APP_URL을 붙여 절대 주소로)
  const src =
    out.kind === "layers"
      ? `data:image/svg+xml;utf8,${encodeURIComponent(layersToSvg(out.layers))}`
      : new URL(out.src, appUrl() + "/").toString();

  return new ImageResponse(
    <div style={{ width: SIZE, height: SIZE, display: "flex", background }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse 안에서는 next/image를 쓸 수 없다 */}
      <img src={src} width={SIZE} height={SIZE} alt="" />
    </div>,
    {
      width: SIZE,
      height: SIZE,
      // 이미지 주소에 ?v=버전이 붙어 있어서 길게 캐시해도 아트 교체 때 문제없다. 레벨이 바뀌면 단계 이미지가 달라지니 1분만.
      headers: { "Cache-Control": "s-maxage=60" },
    },
  );
}
