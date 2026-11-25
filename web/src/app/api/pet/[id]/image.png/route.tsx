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
  //   layers → SVG 문자열을 data URI로 / image → 이미지를 서버가 직접 받아 data URI로 (상대 경로면 APP_URL 기준)
  //   ! image 주소를 <img src>에 그대로 주면 next/og가 SSRF 보호로 localhost·사설 IP 주소를 막는다
  //     ("Image source resolves to a blocked address"). 더미 세트(art/dummy)로 바꿔 확인하다 발견했다.
  //     직접 받아 넣으면 로컬에서도 배포에서도 같은 방식으로 동작한다.
  const src =
    out.kind === "layers"
      ? `data:image/svg+xml;utf8,${encodeURIComponent(layersToSvg(out.layers))}`
      : await toDataUri(new URL(out.src, appUrl() + "/"));

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

/** 이미지 주소를 받아 data URI로 바꾼다. 응답의 Content-Type을 그대로 쓴다 (svg, png 등) */
async function toDataUri(url: URL): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`아트 이미지를 받지 못했다: ${url} (${res.status})`);
  const type = res.headers.get("content-type") ?? "image/png";
  // Buffer: Node.js의 바이트 배열. base64 글자로 바꿔 data URI에 넣는다
  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return `data:${type};base64,${base64}`;
}
