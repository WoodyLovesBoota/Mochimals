// * 내 펫 화면 /pet/[id] (4강, SPEC 12장).
//   이 파일은 서버 컴포넌트다. URL의 id만 검사하고, 실제 화면은 클라이언트 컴포넌트 PetView가 그린다.
//   ? 왜 둘로 나눌까? 펫 데이터는 "지금 연결된 지갑"(주인인지, 내 활동력)에 따라 달라지는데,
//     지갑은 브라우저에만 있다. 그래서 읽기와 그리기는 클라이언트(usePet)에서 하고,
//     서버는 "숫자가 아닌 id면 404" 같은 지갑과 상관없는 일만 한다.
import { notFound } from "next/navigation";
import { PetView } from "@/components/PetView";

// * PageProps<"/pet/[id]">: Next.js가 라우트 경로를 보고 만들어 주는 타입 (next typegen).
//   ! Next.js 15부터 params는 Promise다. await해야 값이 나온다.
export default async function PetPage({ params }: PageProps<"/pet/[id]">) {
  const { id } = await params;

  // ! 1 이상의 정수만 받는다. "abc", "-1", "1.5", "0"은 404.
  //   BigInt("abc")는 throw하고, BigInt("")는 0n이 되는 등 예외가 많아서 정규식으로 먼저 거른다.
  //   (펫 번호는 컨트랙트에서 1부터 시작한다: PetNFT.adopt의 `petId = ++totalSupply`)
  if (!/^[1-9]\d*$/.test(id)) notFound();

  // ? 왜 bigint가 아니라 문자열로 넘길까? 서버 → 클라이언트 props는 직렬화되어 전달된다.
  //   React는 bigint도 넘길 수 있지만, 문자열이 어디서나 안전하고 디버깅할 때 보기도 쉽다.
  return <PetView petId={id} />;
}
