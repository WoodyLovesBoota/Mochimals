// * 디자인 토큰의 JS 사본. CSS 변수를 쓸 수 없는 곳(NFT 이미지를 그리는 next/og)에서만 쓴다.
//   ! 값은 app/globals.scss의 :root와 똑같아야 한다. 색을 바꿀 때는 두 곳을 같이 고친다.
//   ? 왜 CSS 변수를 못 쓸까? next/og(satori)는 브라우저가 아니라서 var(--ink) 같은 CSS 변수를 계산하지 않는다.
export const TOKENS = {
  ink: "#2D2645",
  panel: "#FFFAF0",
  panelEdge: "#EADFCB",
  panelDepth: "#DCCDB0",
  white: "#FFFFFF",
  lime: "#B8EE3A",
  logoLeaf: "#6DBA4A",
  ringEmpty: "rgba(255,255,255,0.75)",
  // 아트 세트에 배경색이 없을 때 (장면 그림을 못 받았을 때의 바탕)
  fallbackBg: "#A6D97F",
} as const;
