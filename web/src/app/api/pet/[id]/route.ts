// * NFT 메타데이터 JSON (6강, SPEC 11장). GET /api/pet/7
//   ERC-721 메타데이터 표준 모양: name, description, image, attributes.
//   마켓은 attributes를 "속성" 표로 보여주고, display_type: "number"면 숫자 막대로 보여준다.
import { ACTIVE_ART_SET } from "@/art";
import { appUrl, readPetForMetadata, STAGES_EN } from "@/lib/metadata";

export async function GET(_: Request, { params }: RouteContext<"/api/pet/[id]">) {
  const { id: raw } = await params;
  // 숫자가 아닌 id는 BigInt가 throw하므로 먼저 거른다 → 404
  if (!/^\d+$/.test(raw)) return new Response("Not Found", { status: 404 });
  const pet = await readPetForMetadata(BigInt(raw));
  if (!pet) return new Response("Not Found", { status: 404 });

  const { id, xp, level, stage, hungry, look } = pet;
  // * 이미지 주소에 아트 세트 버전(?v=)을 붙인다. 아트를 바꾸면 version이 올라 주소가 달라지고,
  //   마켓·CDN이 캐시해 둔 옛 이미지 대신 새 이미지를 받아 간다 (SPEC 11장 "아트를 교체할 때").
  const image = `${appUrl()}/api/pet/${id}/image.png?v=${ACTIVE_ART_SET.version}`;

  return Response.json(
    {
      name: `Mochi #${id}`,
      description: "Mochimals에서 키우는 온체인 펫. 밥 주고 훈련하면 진화해요.",
      image,
      attributes: [
        { trait_type: "Level", value: Number(level), display_type: "number" },
        { trait_type: "Stage", value: STAGES_EN[stage] },
        { trait_type: "XP", value: Number(xp) },
        // 부화 전에는 종을 숨긴다 (SPEC 5장: 화면도 Lv 3 전까지 종을 안 보여준다)
        { trait_type: "Species", value: stage === 0 ? "Unknown" : look.species },
        { trait_type: "Color", value: look.color },
        { trait_type: "Personality", value: look.personality },
        { trait_type: "Mark", value: look.mark },
        { trait_type: "Hungry", value: hungry ? "Yes" : "No" },
      ],
    },
    // * s-maxage=60: CDN(Vercel)이 60초 동안 이 응답을 재사용한다. 마켓이 자주 불러도 RPC는 1분에 한 번만 읽는다.
    { headers: { "Cache-Control": "s-maxage=60" } },
  );
}
