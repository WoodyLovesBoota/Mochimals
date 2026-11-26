// * 위쪽 내비(데스크톱)와 아래 탭 바(모바일)가 같이 쓰는 메뉴 정의.
//   두 곳의 링크·활성 규칙을 한 곳에 둬서, 메뉴를 바꿀 때 한 번만 고치게 한다.
"use client";

import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useMyPets } from "@/hooks/useMyPets";

export type NavKey = "home" | "pets" | "ranking";

export type NavItem = { key: NavKey; label: string; href: string; active: boolean };

/**
 * 메뉴 세 개와 지금 활성인 것.
 * ? "내 펫" 링크는 어디로? 펫이 딱 한 마리면 그 펫 화면(/pet/{id})으로 바로 간다.
 *   0마리(입양 전)나 2마리 이상이면 홈(/)으로 간다. 홈이 입양 화면이나 내 펫 목록을 보여준다.
 */
export function useNavItems(): NavItem[] {
  const pathname = usePathname();
  const myPets = useMyPetIds();
  const petsHref = myPets?.length === 1 ? `/pet/${myPets[0]}` : "/";
  // 홈(/)이 내 펫 목록을 보여주는 중이면(2마리 이상, 시안 04) "홈"이 아니라 "내 펫"이 켜진다
  const homeIsList = pathname === "/" && !!myPets && myPets.length >= 2;

  return [
    { key: "home", label: "홈", href: "/", active: pathname === "/" && !homeIsList },
    // 펫 화면(/pet/…)에 있으면 "내 펫"이 켜진다 (남의 펫을 구경할 때도 같은 화면이라 켜 둔다)
    { key: "pets", label: "내 펫", href: petsHref, active: pathname.startsWith("/pet/") || homeIsList },
    { key: "ranking", label: "랭킹", href: "/ranking", active: pathname.startsWith("/ranking") },
  ];
}

/** 지금 지갑의 펫 번호 목록 (연결 안 됐거나 읽는 중이면 undefined). react-query 캐시를 같이 쓴다 */
export function useMyPetIds(): bigint[] | undefined {
  const { address } = useAccount();
  // useMyPets는 react-query 캐시를 쓰므로, 홈·펫 화면에서 이미 읽었다면 요청이 다시 나가지 않는다
  return useMyPets(address).data;
}
