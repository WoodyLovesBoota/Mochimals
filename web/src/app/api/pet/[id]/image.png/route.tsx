// * NFT 이미지 PNG 800×800 (6강, SPEC 11장, 리디자인 시안 "NFT 페이지"). GET /api/pet/7/image.png
//   게임 화면과 같은 코드로 그린다: getPetLook → ACTIVE_ART_SET.render → art/compose.ts의 layersToSvg.
//   리디자인: 장면 그림 배경 + 펫 + 왼쪽 위 로고 알약 + 오른쪽 위 레벨 링 + 왼쪽 아래 이름판 (+ 배고프면 말풍선)
//   ? PNG 변환은 무엇으로? SPEC은 @resvg/resvg-js나 sharp를 예로 들지만, Next.js에 들어 있는 next/og(ImageResponse)를 썼다.
//     ImageResponse는 내부에서 satori + resvg로 JSX를 PNG로 만든다. 패키지를 더 설치하지 않아도 되고 Vercel에서 그대로 돈다.
//   ! satori는 브라우저가 아니다: CSS 변수, conic-gradient, ::after가 안 된다. 색은 styles/tokens.ts, 링은 SVG 원으로 그린다.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { ACTIVE_ART_SET } from "@/art";
import { layersToSvg } from "@/art/compose";
import { levelProgress } from "@/lib/look";
import { appUrl, readPetForMetadata } from "@/lib/metadata";
import { loadJua } from "@/lib/ogFont";
import { TOKENS as T } from "@/styles/tokens";

const SIZE = 800;
// 펫 그림 크기. 아트는 400×400 좌표에 둘레 여백이 있어서, 시안의 펫(430px)과 같은 크기로 보이게 더 크게 그린다
const PET = 620;

export async function GET(_: Request, { params }: RouteContext<"/api/pet/[id]/image.png">) {
  const { id: raw } = await params;
  if (!/^\d+$/.test(raw)) return new Response("Not Found", { status: 404 });
  const pet = await readPetForMetadata(BigInt(raw));
  if (!pet) return new Response("Not Found", { status: 404 });

  const out = ACTIVE_ART_SET.render(pet.look);
  // * 두 종류의 아트 출력 모두 지원 (SPEC 6장):
  //   layers → SVG 문자열을 data URI로 / image → 이미지를 서버가 직접 받아 data URI로 (상대 경로면 APP_URL 기준)
  //   ! image 주소를 <img src>에 그대로 주면 next/og가 SSRF 보호로 localhost·사설 IP 주소를 막는다
  //     ("Image source resolves to a blocked address"). 그래서 직접 받아 넣는다. 장면 그림도 같은 이유로 직접 받는다.
  const petSrc =
    out.kind === "layers"
      ? `data:image/svg+xml;utf8,${encodeURIComponent(layersToSvg(out.layers))}`
      : await toDataUri(new URL(out.src, appUrl() + "/"));
  // 장면 그림 (모바일 낮 장면, 시안 NFT 보드와 같은 그림). 못 읽으면 단색 바탕
  const scene = await sceneDataUri();

  const level = Number(pet.level);
  const name = `Mochi #${pet.id}`;
  const { current, needed } = levelProgress(pet.xp);
  const percent = needed === 0 ? 100 : Math.floor((current / needed) * 100);
  const bubble = pet.hungry ? "Hungry…" : null;

  // Jua 글꼴: 이 그림에 쓰이는 글자만 받는다
  const font = await loadJua(`Mochimals Lv${level}${name}${bubble ?? ""}`);

  return new ImageResponse(
    <div
      style={{
        width: SIZE,
        height: SIZE,
        display: "flex",
        position: "relative",
        backgroundColor: T.fallbackBg,
        // * 시안: center 85% → 세로 그림의 아래쪽(길과 꽃밭)이 보이게
        ...(scene && {
          backgroundImage: `url(${scene})`,
          backgroundSize: "800px 1731px", // 780×1688 그림을 폭 800에 맞춘 크기
          backgroundPosition: "0px -780px",
        }),
        fontFamily: font ? "Jua" : undefined,
        color: T.ink,
      }}
    >
      {/* 펫 (발이 바닥에서 약 120px 위) */}
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse 안에서는 next/image를 쓸 수 없다 */}
      <img
        src={petSrc}
        width={PET}
        height={PET}
        alt=""
        style={{ position: "absolute", left: (SIZE - PET) / 2, bottom: 46 }}
      />

      {/* 배고픔 말풍선 (시안 NFT · 배고픔 상태) */}
      {bubble && (
        <div
          style={{
            position: "absolute",
            right: 120,
            top: 190,
            display: "flex",
            padding: "10px 16px",
            borderRadius: 18,
            background: T.white,
            boxShadow: `0 4px 0 ${T.panelDepth}`,
            fontSize: 26,
          }}
        >
          {bubble}
        </div>
      )}

      {/* 로고 알약 */}
      <div
        style={{
          position: "absolute",
          left: 36,
          top: 36,
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 60,
          padding: "0 22px 0 12px",
          borderRadius: 999,
          background: T.panel,
          border: `3px solid ${T.panelEdge}`,
          boxShadow: `0 4px 0 ${T.panelDepth}`,
          fontSize: 28,
        }}
      >
        <Logo />
        Mochimals
      </div>

      {/* 레벨 링 (conic-gradient 대신 SVG 원 두 개: 바탕 원 + 진행 호) */}
      <div style={{ position: "absolute", right: 36, top: 30, display: "flex", width: 92, height: 92 }}>
        <svg width="92" height="92" viewBox="0 0 92 92" style={{ position: "absolute", left: 0, top: 0 }}>
          <circle cx="46" cy="49" r="46" fill={T.panelDepth} />
          <circle cx="46" cy="46" r="47" fill={T.panelEdge} />
          <circle cx="46" cy="46" r="43.5" fill="none" stroke={T.ringEmpty} strokeWidth="5" />
          {/* 진행 호: 둘레 2πr 중 percent만큼만 칠하고, 12시부터 시작하도록 -90도 회전 */}
          <circle
            cx="46"
            cy="46"
            r="43.5"
            fill="none"
            stroke={T.lime}
            strokeWidth="5"
            strokeDasharray={`${(2 * Math.PI * 43.5 * percent) / 100} 1000`}
            transform="rotate(-90 46 46)"
          />
          <circle cx="46" cy="46" r="41" fill={T.ink} />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 92,
            height: 92,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 12, color: T.lime }}>Lv</span>
          <span style={{ fontSize: 33, color: T.white }}>{level}</span>
        </div>
      </div>

      {/* 이름판 */}
      <div
        style={{
          position: "absolute",
          left: 36,
          bottom: 36,
          display: "flex",
          padding: "10px 26px",
          borderRadius: 22,
          background: T.panel,
          border: `3px solid ${T.panelEdge}`,
          boxShadow: `0 5px 0 ${T.panelDepth}`,
          fontSize: 40,
        }}
      >
        {name}
      </div>
    </div>,
    {
      width: SIZE,
      height: SIZE,
      fonts: font ? [{ name: "Jua", data: font, weight: 400, style: "normal" }] : undefined,
      // 이미지 주소에 ?v=버전이 붙어 있어서 길게 캐시해도 아트 교체 때 문제없다. 레벨이 바뀌면 단계 이미지가 달라지니 1분만.
      headers: { "Cache-Control": "s-maxage=60" },
    },
  );
}

/** 로고 (components/icons.tsx의 LogoMark와 같은 그림, 색만 토큰 값으로) */
function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 28 28">
      <path
        d="M14 9c-1.2-3.2-3.9-4.4-6.6-3.8.6 2.8 3.3 4.2 6.6 3.8zM14 9c1.2-3.2 3.9-4.4 6.6-3.8-.6 2.8-3.3 4.2-6.6 3.8z"
        fill={T.logoLeaf}
      />
      <rect x="2" y="9" width="24" height="18" rx="9" fill={T.lime} stroke={T.ink} strokeWidth="2" />
      <circle cx="10" cy="17.5" r="1.9" fill={T.ink} />
      <circle cx="18" cy="17.5" r="1.9" fill={T.ink} />
      <path d="M12.4 21q1.6 1.3 3.2 0" stroke={T.ink} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 장면 그림을 public 폴더에서 바로 읽는다 (HTTP로 자기 자신을 부르지 않는다: APP_URL이 다른 서버를 가리켜도 동작).
 * ? process.cwd(): Next.js 서버가 실행된 폴더(= web/). 경로가 고정 문자열이라 배포 빌드가 이 파일을 함께 싣는다.
 */
async function sceneDataUri(): Promise<string | null> {
  try {
    const file = await readFile(path.join(process.cwd(), "public/game/scene-mobile-day.png"));
    return `data:image/png;base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

/** 이미지 주소를 받아 data URI로 바꾼다. 응답의 Content-Type을 그대로 쓴다 (svg, png 등) */
async function toDataUri(url: URL): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`이미지를 받지 못했다: ${url} (${res.status})`);
  const type = res.headers.get("content-type") ?? "image/png";
  // Buffer: Node.js의 바이트 배열. base64 글자로 바꿔 data URI에 넣는다
  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return `data:${type};base64,${base64}`;
}
