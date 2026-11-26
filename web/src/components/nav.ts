// * 위쪽 내비(데스크톱)와 아래 탭 바(모바일)가 같이 쓰는 메뉴 정의.
//   두 곳의 링크·활성 규칙을 한 곳에 둬서, 메뉴를 바꿀 때 한 번만 고치게 한다.
"use client";

import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useMyPets } from "@/hooks/useMyPets";

// "홈" 메뉴는 없다 (회원에게 홈 = 내 펫이라 중복). 홈은 로고 링크로 간다
export type NavKey = "pets" | "ranking";

export type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  active: boolean;
};

/**
 * 지금 보여 줄 메뉴와 활성 상태.
 * * 회원/비회원으로 분기한다.
 *   - 비회원(지갑 미연결, 또는 연결했지만 펫 0마리): 메뉴 없음([]). 홈이 소개·입양 화면 하나뿐이라 갈 곳이 없다.
 *   - 회원(펫 1마리 이상): "내 펫" + "랭킹" 두 개. "홈"은 뺀다.
 *     ? 왜 홈을 빼나? 회원이 홈(/)에 가면 1마리는 그 펫 화면으로 바로 넘어가고(HomeView의 router.replace),
 *       2마리 이상은 내 펫 목록이 뜬다. 즉 홈 = 내 펫이라 메뉴가 중복된다. (로고를 누르면 여전히 홈으로 간다)
 */
export function useNavItems(): NavItem[] {
  const pathname = usePathname();
  const myPets = useMyPetIds();
  const petsHref = usePetsHref();
  // ! 읽는 중(undefined)도 비회원처럼 메뉴를 숨긴다. 회원으로 확인되면 그때 나타난다 (잘못된 메뉴가 잠깐 보이는 것보다 낫다)
  if (!myPets || myPets.length === 0) return [];

  // 홈(/)이 내 펫 목록을 보여주는 중이면(2마리 이상, 시안 04) "내 펫"이 켜진다
  const homeIsList = pathname === "/" && myPets.length >= 2;
  return [
    // 펫 화면(/pet/…)에 있으면 "내 펫"이 켜진다 (남의 펫을 구경할 때도 같은 화면이라 켜 둔다)
    {
      key: "pets",
      label: "내 펫",
      href: petsHref,
      active: pathname.startsWith("/pet/") || homeIsList,
    },
    {
      key: "ranking",
      label: "랭킹",
      href: "/ranking",
      active: pathname.startsWith("/ranking"),
    },
  ];
}

/**
 * "내 펫"으로 가는 주소. 메뉴와 구경 카드(VisitorCard)가 같이 쓴다.
 * ? 펫이 딱 한 마리면 그 펫 화면(/pet/{id})으로 바로 간다. 0마리나 2마리 이상이면 홈(/)으로 간다.
 *   홈이 입양 화면이나 내 펫 목록을 보여준다.
 */
export function usePetsHref(): string {
  const myPets = useMyPetIds();
  return myPets?.length === 1 ? `/pet/${myPets[0]}` : "/";
}

/** 지금 지갑의 펫 번호 목록 (연결 안 됐거나 읽는 중이면 undefined). react-query 캐시를 같이 쓴다 */
export function useMyPetIds(): bigint[] | undefined {
  const { address } = useAccount();
  // useMyPets는 react-query 캐시를 쓰므로, 홈·펫 화면에서 이미 읽었다면 요청이 다시 나가지 않는다
  return useMyPets(address).data;
}
