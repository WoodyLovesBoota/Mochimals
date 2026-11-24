// * flat-v1 레이어 함수들. svg/generate.py의 L_* 함수와 layers()를 한 줄씩 그대로 옮겼다.
//   각 함수는 400×400 캔버스 좌표의 SVG 조각 "문자열"을 돌려준다 (React 요소가 아니다).
//   ? 왜 문자열일까? 같은 결과를 화면(<PetSprite>)과 서버 이미지 API(6강, PNG 변환)가 같이 쓰기 때문이다.
//
// ! 좌표, 색, 계산 순서를 바꾸지 않는다. Python과 같은 순서로 계산해야 소수점 결과까지 같아진다.
//   flat-v1.test.ts가 svg/ 폴더의 기준 SVG 104개와 문자열을 비교한다.
//
// 이름 규칙: Python과 대응시키려고 L_ears 같은 원래 이름을 그대로 쓴다.
// 인자 k: SVG 안 id(clipPath)의 앞부분. 펫 인스턴스마다 달라야 한다 (types.ts RenderOptions 참고).
import type { Color, Emotion, Mark, Species } from "@/lib/look";
import type { LayerName } from "../types";
import { ANCHORS, BLOB, BLUSH, EYE, INK, LEAF, LEAF_D, PEAR, palette, type SpeciesPalette } from "./palette";

// =====================================================================
// 도형 도우미
// =====================================================================

/** 타원을 path로. (cx-rx, cy)에서 시작해 반원 두 개(a 명령)로 그린다 */
function ell(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
}

/**
 * * 면 두 톤 규칙의 핵심: 그림자색으로 모양 전체를 칠하고, 그 위에 기본색 타원을 "모양 안에서만" 겹친다.
 *   clipPath = 가위. 기본색 타원이 모양 밖으로 삐져나간 부분을 잘라낸다.
 *   결과: 가장자리 한쪽에만 그림자가 남아 입체감이 생긴다 (그라데이션 없이).
 */
function shaded(d: string, base: string, shade: string, k: string, hx: number, hy: number, hrx: number, hry: number): string {
  return (
    `<clipPath id="c${k}"><path d="${d}"/></clipPath><path d="${d}" fill="${shade}"/>` +
    `<ellipse cx="${hx}" cy="${hy}" rx="${hrx}" ry="${hry}" fill="${base}" clip-path="url(#c${k})"/>`
  );
}

/** 4갈래 반짝이 별 */
function star(x: number, y: number, r: number, fill = "#FFC93C"): string {
  return (
    `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} ` +
    `L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z" fill="${fill}"/>`
  );
}

/** Python의 f"{v:.1f}" (소수 첫째 자리까지) */
const f1 = (v: number) => v.toFixed(1);

// =====================================================================
// 레이어
// =====================================================================

/** 새싹: 단계마다 잎이 늘고 각성에서 꽃이 핀다. 반짝이 펫은 금색 잎 */
function L_sprout(x: number, y: number, stage: number, shiny = false): string {
  const [leaf, leafD] = shiny ? ["#FFD24D", "#E8B730"] : [LEAF, LEAF_D];
  const h = [10, 18, 24, 28, 32][stage];
  const ty = y - h;
  const s = [`<path d="M${x} ${y} L${x} ${ty}" stroke="${LEAF_D}" stroke-width="6" stroke-linecap="round"/>`];
  if (stage === 0) s.push(`<circle cx="${x}" cy="${ty - 4}" r="7" fill="${leaf}"/>`); // 봉오리
  if (stage >= 1)
    s.push(`<path d="M${x} ${ty} C${x + 10} ${ty - 20} ${x + 34} ${ty - 22} ${x + 42} ${ty - 12} C${x + 30} ${ty + 4} ${x + 12} ${ty + 4} ${x} ${ty} Z" fill="${leaf}"/>`);
  if (stage >= 2)
    s.push(`<path d="M${x} ${ty + 2} C${x - 10} ${ty - 18} ${x - 32} ${ty - 20} ${x - 40} ${ty - 10} C${x - 28} ${ty + 6} ${x - 12} ${ty + 6} ${x} ${ty + 2} Z" fill="${leafD}"/>`);
  if (stage >= 3)
    s.push(`<path d="M${x} ${ty} C${x - 8} ${ty - 16} ${x - 4} ${ty - 30} ${x + 4} ${ty - 34} C${x + 12} ${ty - 22} ${x + 8} ${ty - 8} ${x} ${ty} Z" fill="${leaf}"/>`);
  if (stage >= 4) {
    const fy = ty - 34;
    for (const [dx, dy] of [[0, -11], [10, -3], [6, 9], [-6, 9], [-10, -3]]) {
      s.push(`<circle cx="${x + 4 + dx}" cy="${fy + dy}" r="8" fill="#FFB3C7"/>`);
    }
    s.push(`<circle cx="${x + 4}" cy="${fy}" r="6" fill="#FFD66B"/>`);
  }
  return s.join("");
}

/** 귀 (종마다 모양이 다르다). y, r = 귀 중심 높이와 크기 */
function L_ears(sp: SpeciesPalette, k: string, y: number, r: number): string {
  const t = sp.ears;
  const o: string[] = [];
  if (t === "none") return "";
  if (t === "fin") {
    // 고래상어 등지느러미
    const d = "M124 128 C128 86 150 50 178 40 C176 70 184 96 198 112 Z";
    return shaded(d, sp.base, sp.shade, k + "fin", 150, 70, 30, 60);
  }
  if (t === "frog") {
    // 개구리 눈두덩 (흰 원 위에 눈이 올라간다)
    ([138, 262] as const).forEach((x, i) => {
      o.push(shaded(ell(x, 122, 42, 40), sp.base, sp.shade, `${k}fb${i}`, x - 4, 116, 40, 38));
      o.push(`<circle cx="${x}" cy="122" r="25" fill="#FFFFFF"/>`);
    });
    return o.join("");
  }
  // 좌우 한 쌍. s = -1(왼쪽), 1(오른쪽)
  ([[200 - 84, -1], [200 + 84, 1]] as const).forEach(([x0, s], i) => {
    let x: number = x0;
    if (t === "round" || t === "round_dark") {
      const [col, sh] = t === "round_dark" ? [sp.limb, sp.limb_shade] : [sp.base, sp.shade];
      o.push(shaded(ell(x, y, r, r), col, sh, `${k}e${i}`, x - r * 0.15, y - r * 0.15, r * 0.95, r * 0.95));
      if (sp.ear_in) o.push(`<circle cx="${x}" cy="${y + 2}" r="${r * 0.52}" fill="${sp.ear_in}"/>`);
    } else if (t === "fox") {
      x = 200 + s * 70;
      const A = [x + s * r, y + 1.4 * r];
      const B = [x + s * 0.7 * r, y - 2.2 * r];
      const C = [x - s * 1.3 * r, y + 0.7 * r];
      const d = `M${A[0]} ${A[1]} Q${x + s * 1.4 * r} ${y - 0.6 * r} ${B[0]} ${B[1]} Q${x - s * 0.5 * r} ${y - 0.9 * r} ${C[0]} ${C[1]} Z`;
      o.push(shaded(d, sp.base, sp.shade, `${k}fx${i}`, x - s * 10, y - 10, r * 1.2, r * 2));
      // 귀 안쪽: 같은 삼각형을 무게중심 기준으로 55% 축소
      const cx_ = (A[0] + B[0] + C[0]) / 3;
      const cy_ = (A[1] + B[1] + C[1]) / 3 + 6;
      o.push(`<path d="${d}" fill="${sp.ear_in}" transform="translate(${cx_} ${cy_}) scale(.55) translate(${-cx_} ${-cy_})"/>`);
    } else if (t === "pig") {
      x = 200 + s * 74;
      const d = `M${x + s * 1.0 * r} ${y + 0.9 * r} Q${x + s * 1.5 * r} ${y - 0.6 * r} ${x + s * 1.1 * r} ${y - 1.3 * r} Q${x} ${y - 0.7 * r} ${x - s * 1.1 * r} ${y + 0.5 * r} Z`;
      o.push(`<path d="${d}" fill="${sp.base}"/>`);
      o.push(`<path d="${d}" fill="${sp.ear_in}" transform="translate(${x + s * 8} ${y}) scale(.55) translate(${-x - s * 8} ${-y})"/>`);
    }
  });
  return o.join("");
}

/** 몸 (아기는 BLOB, 그 이상은 PEAR). 머리와 몸은 한 덩어리다 */
function L_body(sp: SpeciesPalette, k: string, stage: number): string {
  const d = stage === 1 ? BLOB : PEAR;
  return shaded(d, sp.base, sp.shade, k + "body", 186, stage > 1 ? 198 : 196, stage > 1 ? 138 : 136, stage > 1 ? 132 : 128);
}

/** 몸 위 무늬 (배, 고래상어 점, 판다 어깨). 몸 모양 밖으로 안 나가게 clipPath로 자른다 */
function L_pattern(sp: SpeciesPalette, k: string, stage: number): string {
  const d = stage === 1 ? BLOB : PEAR;
  const o: string[] = [];
  if (sp.belly) o.push(`<ellipse cx="200" cy="${stage > 1 ? 318 : 306}" rx="96" ry="64" fill="${sp.belly}"/>`);
  if (sp.spots) {
    const spots = [[120, 160, 7], [152, 128, 6], [262, 132, 7], [292, 166, 6], [100, 204, 5], [306, 206, 6], [236, 112, 5], [88, 248, 6], [316, 250, 5]];
    for (const [x, y, r] of spots) o.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" opacity=".9"/>`);
  }
  if (sp.patches && stage >= 3)
    o.push(`<ellipse cx="72" cy="290" rx="40" ry="70" fill="${sp.limb}"/><ellipse cx="328" cy="290" rx="40" ry="70" fill="${sp.limb}"/>`);
  if (o.length === 0) return "";
  return `<clipPath id="p${k}"><path d="${d}"/></clipPath><g clip-path="url(#p${k})">${o.join("")}</g>`;
}

/** 표식 (DNA 28~31비트): 주근깨, 별, 하트 */
function L_mark(mark: Mark, cx = 200, cy = 210): string {
  if (mark === "freckles") {
    const o: string[] = [];
    for (const sx of [-1, 1])
      for (const [dx, dy] of [[-8, 0], [0, 7], [8, 1]])
        o.push(`<circle cx="${cx + sx * (74 + dx)}" cy="${cy + 18 + dy}" r="2.6" fill="#C98A6B"/>`);
    return o.join("");
  }
  if (mark === "star") return star(cx, cy - 62, 11, "#FFD24D");
  if (mark === "heart") {
    const x = cx + 74;
    const y = cy + 22;
    return `<path d="M${x} ${y + 5} c-7 -7 -13 2 -5 8 l5 5 l5 -5 c8 -6 2 -15 -5 -8 z" fill="#FF6F8E"/>`;
  }
  return "";
}

/** 얼굴: 무늬, 볼, 주둥이, 눈(표정별), 코, 입(표정별) */
function L_face(sp: SpeciesPalette, emotion: Emotion, cx = 200, cy = 210): string {
  const o: string[] = [];
  const up = sp.eye_up;
  const [ex, ey] = up ? [62, cy - 88] : [40, cy]; // 눈 간격, 눈 높이 (개구리는 머리 위)
  if (sp.mask) {
    o.push(`<ellipse cx="${cx}" cy="${cy + 12}" rx="104" ry="62" fill="${sp.mask}"/>`);
    for (const sx of [-1, 1]) {
      const x = cx + sx * 44;
      o.push(`<ellipse cx="${x}" cy="${cy + 6}" rx="30" ry="16" transform="rotate(${sx * -16} ${x} ${cy + 6})" fill="${sp.stripes}"/>`);
    }
  }
  if (sp.patches) {
    for (const [sx, rot] of [[-1, 24], [1, -24]]) {
      const x = cx + sx * 42;
      o.push(`<ellipse cx="${x}" cy="${cy + 4}" rx="28" ry="36" transform="rotate(${rot} ${x} ${cy + 4})" fill="${sp.limb}"/>`);
    }
  }
  for (const sx of [-1, 1]) o.push(`<ellipse cx="${cx + sx * 74}" cy="${cy + 26}" rx="17" ry="10" fill="${BLUSH}" opacity=".85"/>`);
  const mzY = cy + 24;
  if (sp.muzzle) {
    const [rx, ry] = sp.muzzle_big ? [46, 30] : [34, 23];
    o.push(`<ellipse cx="${cx}" cy="${mzY + (sp.muzzle_big ? 4 : 0)}" rx="${rx}" ry="${ry}" fill="${sp.muzzle}"/>`);
  }
  // (Python 원본의 `ecol = '#FFFFFF' if sp.get('mask') and False else EYE`는 항상 EYE다)
  const ecol = EYE;
  for (const sx of [-1, 1]) {
    const x = cx + sx * ex;
    const y = ey;
    if (emotion === "idle") {
      o.push(`<ellipse cx="${x}" cy="${y}" rx="12" ry="16" fill="${ecol}"/><circle cx="${x - 4}" cy="${y - 6}" r="5" fill="#fff"/><circle cx="${x + 4}" cy="${y + 6}" r="2.2" fill="#fff"/>`);
    } else if (emotion === "happy") {
      o.push(`<path d="M${x - 12} ${y + 4} Q${x} ${y - 14} ${x + 12} ${y + 4}" stroke="${EYE}" stroke-width="6" fill="none" stroke-linecap="round"/>`);
    } else if (emotion === "hungry") {
      o.push(`<ellipse cx="${x}" cy="${y + 3}" rx="12" ry="13" fill="${EYE}"/><circle cx="${x - 3}" cy="${y - 2}" r="5" fill="#fff"/>`);
      o.push(`<path d="M${x - sx * 14} ${y - 20} L${x + sx * 8} ${y - 14}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`);
    } else if (emotion === "sleepy") {
      o.push(`<path d="M${x - 12} ${y + 2} Q${x} ${y + 10} ${x + 12} ${y + 2}" stroke="${EYE}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    } else if (emotion === "excited") {
      // 별 모양 눈: 꼭짓점 10개 (바깥 15, 안쪽 6.8 반지름을 번갈아)
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? 15 : 6.8;
        pts.push(`${f1(x + rr * Math.cos(a))},${f1(y + rr * Math.sin(a))}`);
      }
      o.push(`<polygon points="${pts.join(" ")}" fill="#FFC93C" stroke="${EYE}" stroke-width="2.5" stroke-linejoin="round"/>`);
    }
  }
  const n = sp.nose;
  if (n === "bear") {
    o.push(`<rect x="${cx - 10}" y="${mzY - 14}" width="20" height="12" rx="6" fill="${INK}"/>`);
  } else if (n === "snout") {
    o.push(`<ellipse cx="${cx}" cy="${mzY - 6}" rx="28" ry="19" fill="#FFA9B9"/><ellipse cx="${cx - 9}" cy="${mzY - 6}" rx="4.5" ry="7" fill="#D9727F"/><ellipse cx="${cx + 9}" cy="${mzY - 6}" rx="4.5" ry="7" fill="#D9727F"/>`);
  } else if (n === "dots") {
    o.push(`<circle cx="${cx - 8}" cy="${mzY - 12}" r="3" fill="${INK}" opacity=".6"/><circle cx="${cx + 8}" cy="${mzY - 12}" r="3" fill="${INK}" opacity=".6"/>`);
  }
  const w = sp.mouth_w ?? 1.0;
  const my = mzY + (n === "snout" ? 14 : 2);
  if (emotion === "idle" || emotion === "sleepy") {
    if (w > 1) {
      o.push(`<path d="M${cx - 12 * w} ${my - 2} Q${cx} ${my + 10} ${cx + 12 * w} ${my - 2}" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
    } else {
      o.push(`<path d="M${cx - 10} ${my} Q${cx - 5} ${my + 7} ${cx} ${my} Q${cx + 5} ${my + 7} ${cx + 10} ${my}" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
    }
  } else if (emotion === "happy" || emotion === "excited") {
    o.push(`<path d="M${cx - 11 * w} ${my} Q${cx} ${my + 20} ${cx + 11 * w} ${my} Z" fill="#E2566E"/>`);
    o.push(`<path d="M${cx - 6} ${my + 8} Q${cx} ${my + 3} ${cx + 6} ${my + 8} Q${cx} ${my + 14} ${cx - 6} ${my + 8} Z" fill="#FF97A8"/>`);
  } else if (emotion === "hungry") {
    o.push(`<ellipse cx="${cx}" cy="${my + 5}" rx="6" ry="7" fill="${INK}"/>`);
  }
  return o.join("");
}

/** 발. 어른(3) 이상은 크고 젤리 발바닥이 있다 */
function L_feet(sp: SpeciesPalette, k: string, stage: number): string {
  const o: string[] = [];
  if (stage === 1) {
    ([150, 250] as const).forEach((x, i) => {
      o.push(shaded(ell(x, 330, 32, 17), sp.limb, sp.limb_shade, `${k}f${i}`, x - 4, 324, 30, 15));
    });
    return o.join("");
  }
  const big = stage >= 3;
  ([146, 254] as const).forEach((x, i) => {
    const [rx, ry] = big ? [38, 21] : [32, 17];
    o.push(shaded(ell(x, 338, rx, ry), sp.limb, sp.limb_shade, `${k}p${i}`, x - 4, 333, rx - 2, ry - 2));
    if (big && sp.pad) {
      o.push(`<ellipse cx="${x}" cy="341" rx="12" ry="8" fill="${sp.pad}"/>`);
      for (const dx of [-13, 0, 13]) o.push(`<circle cx="${x + dx}" cy="${329 + (dx ? 4 : 0)}" r="4.2" fill="${sp.pad}"/>`);
    }
  });
  return o.join("");
}

function arm(sp: SpeciesPalette, x: number, y: number, rx: number, ry: number, rot: number): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="${sp.limb}"/>`;
}

/** 왼팔. 각성(4)은 번쩍 든다 */
function L_arm_l(sp: SpeciesPalette, stage: number): string {
  if (stage === 1) return arm(sp, 84, 262, 17, 25, 20);
  if (stage === 4) return arm(sp, 70, 196, 19, 32, 40);
  return arm(sp, 80, 266, stage === 3 ? 19 : 18, stage === 3 ? 32 : 28, 20);
}

/** 오른팔. 어린이(2)는 손을 흔들고, 어른 이상은 아이템을 쥔다 */
function L_arm_r(sp: SpeciesPalette, stage: number): string {
  if (stage === 1) return arm(sp, 316, 262, 17, 25, -20);
  if (stage === 2) return arm(sp, 326, 214, 18, 28, -35); // 손 흔들기
  return arm(sp, 330, 268, 20, 32, -38); // 아이템을 쥔 팔 (팔 위쪽이 그립을 덮는다)
}

/** 아이템 그림. (0,0) = 손 그립. 돌려주는 [svg, 기울기(도)] */
function item_svg(item: string): [string, number] {
  if (item === "bamboo")
    return [
      '<rect x="-10" y="-140" width="20" height="170" rx="10" fill="#7CCB6B"/>' +
        '<rect x="-12" y="-96" width="24" height="6" rx="3" fill="#4AA75A"/><rect x="-12" y="-42" width="24" height="6" rx="3" fill="#4AA75A"/>' +
        '<path d="M8 -128 C28 -146 54 -146 64 -136 C48 -118 24 -116 8 -128 Z" fill="#6CC46E"/>' +
        '<path d="M-8 -112 C-26 -126 -46 -124 -54 -114 C-40 -100 -20 -100 -8 -112 Z" fill="#4AA75A"/>',
      -6,
    ];
  if (item === "fish")
    return [
      '<path d="M-16 14 L0 -8 L16 14 Z" fill="#6FA9DE"/>' +
        '<ellipse cx="0" cy="-50" rx="24" ry="44" fill="#8EC3F0"/><ellipse cx="7" cy="-44" rx="11" ry="30" fill="#CFE6FA"/>' +
        '<path d="M-24 -48 L-38 -38 L-24 -30 Z" fill="#6FA9DE"/><circle cx="-6" cy="-78" r="4.5" fill="#16171F"/>',
      12,
    ];
  if (item === "cactus")
    return [
      '<rect x="-14" y="-108" width="28" height="74" rx="14" fill="#6CC46E"/>' +
        '<rect x="-36" y="-88" width="14" height="32" rx="7" fill="#6CC46E"/><rect x="-28" y="-66" width="16" height="12" rx="6" fill="#6CC46E"/>' +
        '<rect x="22" y="-78" width="14" height="26" rx="7" fill="#4AA75A"/><rect x="12" y="-60" width="16" height="12" rx="6" fill="#4AA75A"/>' +
        '<circle cx="0" cy="-110" r="8" fill="#FF9DB4"/>' +
        '<path d="M-26 -34 L26 -34 L20 10 L-20 10 Z" fill="#E8865A"/><rect x="-30" y="-44" width="60" height="13" rx="5" fill="#D9734A"/>',
      0,
    ];
  if (item === "mug")
    return [
      '<path d="M-6 -70 q-8 -10 0 -20 q8 -10 0 -20" stroke="#C9CED8" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M10 -70 q-8 -10 0 -20" stroke="#C9CED8" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<circle cx="26" cy="-30" r="13" stroke="#FFC94D" stroke-width="8" fill="none"/>' +
        '<rect x="-26" y="-60" width="52" height="64" rx="12" fill="#FFD66B"/><ellipse cx="0" cy="-56" rx="21" ry="5" fill="#9A6542"/>' +
        '<circle cx="-8" cy="-26" r="5" fill="#FFFFFF" opacity=".7"/>',
      0,
    ];
  if (item === "wand")
    return [
      '<path d="M0 14 L0 -84" stroke="#FF9DB4" stroke-width="9" stroke-linecap="round"/>' +
        '<circle cx="0" cy="-104" r="21" stroke="#FF9DB4" stroke-width="7" fill="#E4F4FF" fill-opacity=".8"/>' +
        '<circle cx="34" cy="-140" r="14" fill="#EAF7FF" stroke="#9FD4FF" stroke-width="3"/><circle cx="12" cy="-170" r="9" fill="#EAF7FF" stroke="#9FD4FF" stroke-width="3"/>' +
        '<circle cx="46" cy="-178" r="6" fill="#EAF7FF" stroke="#9FD4FF" stroke-width="3"/><circle cx="29" cy="-145" r="3" fill="#fff"/>',
      -10,
    ];
  if (item === "apple")
    return [
      '<path d="M0 -58 C-34 -76 -48 -40 -40 -18 C-32 6 -12 8 0 2 C12 8 32 6 40 -18 C48 -40 34 -76 0 -58 Z" fill="#FF6B6B"/>' +
        '<ellipse cx="-18" cy="-36" rx="7" ry="11" fill="#FF9B9B"/>' +
        '<path d="M0 -58 L4 -74" stroke="#8A5A3C" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M4 -70 C14 -84 30 -84 36 -76 C26 -64 12 -64 4 -70 Z" fill="#6CC46E"/>',
      0,
    ];
  if (item === "lotus")
    return [
      '<path d="M0 14 L0 -112" stroke="#4AA75A" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M-52 -104 Q0 -164 52 -104 Q28 -114 6 -104 L0 -114 L-6 -104 Q-28 -114 -52 -104 Z" fill="#5BBF68"/>' +
        '<path d="M0 -112 L-24 -140 M0 -112 L0 -150 M0 -112 L24 -140" stroke="#3E9A4F" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="-30" cy="-108" r="5" fill="#FFB3C7"/>',
      -8,
    ];
  return ["", 0];
}

/** 아이템: 어른(3) 이상만. 오른손 그립 앵커로 옮겨서 그린다 */
function L_item(sp: SpeciesPalette, stage: number): string {
  if (stage < 3) return "";
  const [body, rot] = item_svg(sp.item);
  const [gx, gy] = ANCHORS.handR;
  return `<g transform="translate(${gx} ${gy}) rotate(${rot}) scale(1.15)">${body}</g>`;
}

/** 뒤 효과: 각성의 빛 원과 빛살, 바닥 그림자 */
function L_fx_back(stage: number): string {
  const o: string[] = [];
  if (stage === 4) {
    o.push('<circle cx="200" cy="214" r="176" fill="#FFF4CC"/><circle cx="200" cy="214" r="150" fill="#FFEBA8" opacity=".6"/>');
    for (let a = 0; a < 12; a++) {
      const ang = (a * Math.PI) / 6;
      o.push(`<line x1="${f1(200 + 158 * Math.cos(ang))}" y1="${f1(214 + 158 * Math.sin(ang))}" x2="${f1(200 + 172 * Math.cos(ang))}" y2="${f1(214 + 172 * Math.sin(ang))}" stroke="#FFD24D" stroke-width="5" stroke-linecap="round"/>`);
    }
  }
  o.push(`<ellipse cx="200" cy="${stage > 1 ? 350 : 344}" rx="${stage > 1 ? 124 : 118}" ry="12" fill="#1C2A44" opacity=".08"/>`);
  return o.join("");
}

/** 앞 효과: 표정별 연출(zz, 땀방울, 별, 하트), 각성 별, 반짝이 */
function L_fx_front(emotion: Emotion, stage: number, shiny: boolean, x = 200, y = 210): string {
  const o: string[] = [];
  if (emotion === "sleepy")
    o.push(`<text x="${x + 90}" y="${y - 40}" font-family="Arial" font-weight="700" font-size="30" fill="#8FA3C8">z</text><text x="${x + 112}" y="${y - 66}" font-family="Arial" font-weight="700" font-size="22" fill="#8FA3C8">z</text>`);
  if (emotion === "hungry") o.push(`<path d="M${x + 104} ${y - 50} q10 16 0 22 q-10 -6 0 -22 Z" fill="#8CC8FF"/>`);
  if (emotion === "excited") for (const [dx, dy, r] of [[-118, -40, 9], [116, -58, 11], [128, 10, 7]]) o.push(star(x + dx, y + dy, r));
  if (emotion === "happy")
    for (const [dx, dy] of [[-120, -30], [118, -44]])
      o.push(`<path d="M${x + dx} ${y + dy + 6} c-8 -8 -14 2 -6 8 l6 6 l6 -6 c8 -6 2 -16 -6 -8 z" fill="#FF8FA6"/>`);
  if (stage === 4) for (const [sx, sy, r] of [[60, 110, 12], [348, 96, 10], [40, 300, 8], [362, 300, 9]]) o.push(star(sx, sy, r));
  if (shiny)
    for (const [sx, sy, r] of [[96, 150, 8], [300, 120, 6], [330, 210, 7], [84, 240, 5]]) {
      o.push(star(sx, sy, r, "#FFFFFF"));
      o.push(star(sx, sy, r * 0.55, "#FFE27A"));
    }
  return o.join("");
}

// =====================================================================
// layers(): 레이어를 순서대로 모은다
// =====================================================================

export type Layer = { name: LayerName; svg: string };

/**
 * generate.py의 layers()와 같다. 단계 확대(STAGE_SCALE)는 하기 전 좌표다.
 * @param k id 앞부분. 생략하면 Python과 같은 규칙(종+단계+표정+색+표식)으로 만든다 (기준 SVG 비교용)
 */
export function layers(
  species: Species,
  stage: number,
  emotion: Emotion = "idle",
  color: Color = "base",
  mark: Mark = "none",
  k?: string,
): Layer[] {
  k = k || `${species}${stage}${emotion}${color}${mark}`;
  const sp = palette(species, color);
  const shiny = color === "shiny";
  if (stage === 4 && emotion === "idle") emotion = "happy";

  // ---- 알 (stage 0): 레이어 4개뿐 ----
  if (stage === 0) {
    const egg = "M200 110 C258 110 296 190 296 252 C296 308 254 338 200 338 C146 338 104 308 104 252 C104 190 142 110 200 110 Z";
    const spot = sp.egg_spot; // 알 무늬 색 = 종 힌트
    const body =
      shaded(egg, sp.base, sp.shade, k + "egg", 186, 220, 104, 120) +
      `<clipPath id="ce${k}"><path d="${egg}"/></clipPath><g clip-path="url(#ce${k})">` +
      `<circle cx="150" cy="196" r="26" fill="${spot}"/><circle cx="252" cy="262" r="30" fill="${spot}"/>` +
      `<circle cx="176" cy="300" r="14" fill="${spot}"/><circle cx="232" cy="176" r="9" fill="${spot}"/></g>`;
    return [
      { name: "fx_back", svg: '<ellipse cx="200" cy="344" rx="90" ry="10" fill="#1C2A44" opacity=".08"/>' },
      { name: "sprout", svg: L_sprout(200, 112, 0, shiny) },
      { name: "body", svg: body },
      { name: "fx_front", svg: L_fx_front("idle", 0, shiny, 200, 240) },
    ];
  }

  const fy = stage === 1 ? 212 : 210; // 얼굴 중심 y
  const [ey, er] = stage === 1 ? [110, 34] : [108, stage === 2 ? 36 : 38]; // 귀 높이, 크기
  // * 뒤에서 앞 순서. mark는 face 바로 뒤(위)에 둬서 얼굴 무늬에 가려지지 않게 한다.
  //   팔(arms)이 아이템(item)보다 앞이라 손에 쥔 것처럼 보인다. (SPEC 6-1)
  return [
    { name: "fx_back", svg: L_fx_back(stage) },
    { name: "ears", svg: L_ears(sp, k, ey, er) },
    { name: "sprout", svg: L_sprout(200, stage === 1 ? 86 : 92, stage, shiny) },
    { name: "body", svg: L_body(sp, k, stage) },
    { name: "pattern", svg: L_pattern(sp, k, stage) },
    { name: "feet", svg: L_feet(sp, k, stage) },
    { name: "face", svg: L_face(sp, emotion, 200, fy) },
    { name: "mark", svg: L_mark(mark, 200, fy) },
    { name: "item", svg: L_item(sp, stage) },
    { name: "arms", svg: L_arm_l(sp, stage) + L_arm_r(sp, stage) },
    { name: "fx_front", svg: L_fx_front(emotion, stage, shiny, 200, fy) },
  ];
}
