// * 홈 / 입양 (SPEC 12장). 화면은 지갑 상태에 따라 바뀌므로 내용은 전부 클라이언트 컴포넌트(HomeView)가 그린다.
//   이 파일은 서버 컴포넌트로 남겨 두고 HomeView만 감싼다 (페이지 파일 자체는 서버에서 가볍게 렌더).
import { HomeView } from "@/components/HomeView";

export default function Home() {
  return <HomeView />;
}
