// * NFT 이미지(next/og)에 쓸 Jua 글꼴을 구글 폰트에서 받아 온다.
//   ? next/og의 기본 글꼴은 영문뿐이라 "배고파요…" 같은 한글이 네모로 나온다. 그래서 글꼴 파일을 직접 넘긴다.
//   * text= 파라미터: 구글이 "이 글자들만" 담은 작은 글꼴 파일을 만들어 준다 (한글 글꼴 전체는 수 MB).
import "server-only";

// 같은 글자 묶음은 서버 메모리에 한 번만 받아 둔다 (요청마다 구글에 가지 않게)
const cache = new Map<string, Promise<ArrayBuffer | null>>();

/** @returns 글꼴 파일 바이트. 받지 못하면 null (그때는 기본 글꼴로 그린다) */
export function loadJua(text: string): Promise<ArrayBuffer | null> {
  const key = [...new Set(text)].sort().join("");
  let hit = cache.get(key);
  if (!hit) {
    hit = fetchFont(key).catch(() => null);
    cache.set(key, hit);
  }
  return hit;
}

async function fetchFont(text: string): Promise<ArrayBuffer | null> {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Jua&text=${encodeURIComponent(text)}`).then((r) =>
    r.text(),
  );
  // CSS 안의 src: url(...) format('truetype') 에서 주소만 꺼낸다
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) return null;
  const res = await fetch(url);
  return res.ok ? res.arrayBuffer() : null;
}
