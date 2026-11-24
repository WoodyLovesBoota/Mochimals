// Next.js 설정 파일. `pnpm dev`, `pnpm build`가 시작할 때 이 파일을 읽는다.
// `import type`은 타입만 가져온다는 뜻이다. 실행 코드에는 아무것도 남지 않는다.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // * Cache Components: 페이지를 "미리 만들어 둘 수 있는 부분(정적 껍데기)"과
  //   "요청마다 새로 만드는 부분(동적)"으로 나눠서, 껍데기를 먼저 보내고 나머지를 스트리밍한다.
  //   `"use cache"` 지시어로 컴포넌트나 함수 단위 캐시를 켤 수 있다.
  // ? 랭킹 화면(SPEC 12장의 30초 갱신)을 만들 때 이 기능과 어떻게 맞출지 다시 본다.
  cacheComponents: true,
  // * <Link>가 화면에 보이면 다음 페이지를 통째로가 아니라 "껍데기"만 미리 받아 둔다 (Cache Components 전용).
  partialPrefetching: true,
  // * Turbopack: Next.js의 번들러 (webpack 대체). `pnpm dev`가 기본으로 이걸 쓴다.
  turbopack: {
    rules: {
      // * 모든 .css 파일을 Tailwind 로더에 먼저 통과시킨다.
      //   그래서 globals.css의 `@import "tailwindcss"`가 실제 유틸리티 클래스 CSS로 바뀐다.
      //   (Next.js 공식 문서는 postcss.config.mjs + @tailwindcss/postcss 방식을 안내한다.
      //    이 프로젝트는 create-next-app이 만든 Turbopack 전용 로더 방식이라 postcss 설정 파일이 없다.)
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
