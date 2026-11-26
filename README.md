# Silo Pets

지갑을 연결해 무료로 펫 NFT를 입양하고, 활동력(ENERGY 토큰)으로 밥을 주고 훈련시켜 키우는 다이내믹 NFT 웹 게임.
펫이 자라면 NFT 이미지와 속성이 실제로 바뀌고, 경험치 순으로 랭킹을 매긴다.

## 기능

- **입양**: 지갑마다 1번, 무료. DNA(종·색·성격·무늬)는 입양 블록에서 정해진다. 활동력 10을 같이 받는다.
- **돌보기**: 밥(활동력 1, +10 XP, 배고픔 해제), 훈련(활동력 3, +40 XP, 배고프면 +20), 활동력이 0이면 무료 충전 +10.
- **성장**: Lv 3 부화, Lv 7·12·20 진화. 레벨별 해금(칭호, 배경, 춤, 랭킹 테두리).
- **연출**: XP 숫자, 레벨업(튀기·배지·별), 진화/부화 화면, 배고픔 말풍선. OS의 "동작 줄이기"를 켜면 페이드만.
- **랭킹**: XP 순위, 내 펫 강조, 다른 지갑의 레벨업 실시간 피드.
- **NFT 메타데이터**: `tokenURI` → `/api/pet/<id>` JSON과 800px PNG. 게임 화면과 같은 코드로 그린다.

## 스택

| 역할 | 선택 |
| --- | --- |
| 컨트랙트 | Solidity ^0.8.24, Foundry, OpenZeppelin Contracts 5.4 |
| 프론트 | Next.js 16 (App Router), TypeScript strict, CSS Modules + SCSS |
| 체인 연동 | viem 2, wagmi 2, RainbowKit 2, TanStack Query 5 |
| 애니메이션 | Motion (`motion/react`) |
| 체인 | 로컬 anvil(31337) / Base Sepolia(84532) / Base(8453). env 하나로 바꾼다 |

## 아키텍처 요약

```
            읽기 (가스비 없음)                              쓰기 (지갑 서명)
브라우저 ── wagmi 훅 ──────────► RPC ◄──── 지갑 ◄── usePetAction: 시뮬레이션 → 서명 → 확정 → 이벤트 → 다시 읽기
서버    ── viem publicClient ──► RPC         (랭킹, 메타데이터 API)
```

- **읽기는 RPC로 바로, 쓰기는 지갑을 거친다.** 자체 백엔드 DB나 인덱서는 없다. 랭킹·레벨·배고픔은 전부 체인 값에서 계산한다.
- **모든 쓰기는 `usePetAction` 하나를 지난다.** 서명 전에 시뮬레이션해서 실패할 행동은 지갑 창을 띄우지 않는다. 확정 뒤 영수증 이벤트(`Fed`/`Trained`/`LevelUp`/`Adopted`)로 연출을 정한다.
- **그림은 세 겹으로 분리한다.** 체인(dna, xp) → 해석(`lib/look.ts`의 `getPetLook`) → 아트 세트(`art/*`의 `render`). `art/index.ts`의 `ACTIVE_ART_SET` 한 줄로 전체 그림을 바꾼다 (`art/dummy`로 확인).

자세한 연결 설명은 [docs/contract-frontend.md](docs/contract-frontend.md), 원래 지시서는 [docs/SPEC.md](docs/SPEC.md).

## 저장소 구조

| 폴더 | 내용 |
| --- | --- |
| `contracts/` | Foundry 프로젝트 (`Energy.sol`, `PetNFT.sol`, 테스트, 배포 스크립트) |
| `web/` | Next.js 앱 |
| `svg/` | 아트 원본 (`generate.py`, `anchors.json`, 기준 SVG). flat-v1 포팅의 정답지 |
| `docs/` | 지시서, 연결 설명, 진도표 |

## 실행: 로컬 (anvil)

필요한 것: Node.js 22 이상, pnpm, [Foundry](https://book.getfoundry.sh/getting-started/installation), MetaMask.

```bash
git clone --recurse-submodules https://github.com/WoodyLovesBoota/Mochimals.git
cd Mochimals

# 터미널 1: 로컬 체인 (끄면 초기화된다)
anvil

# 터미널 2: 배포 (anvil을 켤 때마다). 0번 테스트 키는 anvil이 공개한 키다
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# 터미널 3: 프론트
cd web
pnpm install
# .env.local을 아래 env 표대로 만든다 (로컬용은 docs/PROGRESS.md "env 옮기기"에 그대로 붙일 블록이 있다)
pnpm dev                  # http://localhost:3000
```

MetaMask: 네트워크 추가(RPC `http://127.0.0.1:8545`, 체인 ID `31337`) → anvil 0번 키로 계정 가져오기. anvil을 다시 켰으면 MetaMask "활동 탭 데이터 지우기".

## 실행: Base Sepolia

자세한 순서, 준비물, 확인 목록, 문제 해결은 [docs/DEPLOY.md](docs/DEPLOY.md). 요약:

1. 테스트 ETH가 있는 배포용 지갑을 준비한다 (Base Sepolia faucet).
2. 배포: `APP_URL`은 배포할 웹 주소 (`tokenURI`의 앞부분이 된다).
   ```bash
   cd contracts
   APP_URL=https://<배포 주소> forge script script/Deploy.s.sol \
     --rpc-url <Base Sepolia RPC> --account <foundry keystore 이름> --broadcast
   ```
   개인키는 명령줄이나 파일에 쓰지 않고 `cast wallet import`로 만든 keystore를 쓴다.
3. 출력된 세 값(`NEXT_PUBLIC_PET_NFT_ADDRESS`, `NEXT_PUBLIC_ENERGY_ADDRESS`, `NEXT_PUBLIC_DEPLOY_BLOCK`)과 아래 env를 Vercel 환경 변수에 넣고 배포한다.

## 환경 변수 (`web/.env.local`)

| 이름 | 예 (로컬) | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_CHAIN_ID` | `31337` | 31337 anvil / 84532 Base Sepolia / 8453 Base |
| `NEXT_PUBLIC_RPC_URL` | (비움) | RPC 주소. 비우면 체인 기본 공개 RPC. Base Sepolia는 Alchemy 등 |
| `NEXT_PUBLIC_WC_PROJECT_ID` | (비움) | WalletConnect(Reown) 프로젝트 ID. 비우면 WalletConnect 지갑만 안 된다 |
| `NEXT_PUBLIC_PET_NFT_ADDRESS` | `0x5FbD…0aa3` | 배포 출력 |
| `NEXT_PUBLIC_ENERGY_ADDRESS` | `0xa16E…d2be` | 배포 출력 (`petNft.energy()`) |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | `0` | 배포 출력. 지금은 코드에서 쓰지 않는다 (내 펫 찾기를 ownerOf 방식으로 바꿈). 나중에 로그 검색을 쓸 때를 위해 남겨 둔다 |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | 메타데이터 JSON의 이미지 절대 주소 |
| `PAYMASTER_URL` | (비움) | 선택, 서버 전용. 가스비 대납 (아직 구현 안 함) |

실제 키(RPC 키, WalletConnect ID, Paymaster URL)는 git, 채팅, 문서에 쓰지 않는다.

## 테스트

```bash
cd contracts && forge test            # 컨트랙트 33개
cd web && pnpm test                   # look·아트 비교·에러 문구·시간·연출·해금·더미 아트 176개
cd web && pnpm lint && npx tsc --noEmit && pnpm build
```

## 결정 사항

지시서에 없거나 지시서와 다르게 정한 것. 대부분 라이브러리 버전 차이 때문이고 동작은 같다.

- 저장소 루트가 지시서의 `silo-pets/`에 해당한다. 아트 zip은 `svg/`에 풀어 둔 그대로 쓴다.
- 스타일은 Tailwind 대신 **CSS Modules + SCSS**. 디자인 토큰은 `globals.scss`의 CSS 변수, 화면 폭은 `styles/_breakpoints.scss`.
- `web/.env.example`은 두지 않는다. env 목록은 이 README의 표가 대신한다.
- wagmi 설정을 `chain.ts`(공통) / `wagmi.ts`(브라우저, RainbowKit) / `wagmiServer.ts`(서버, 쿠키 복원)로 나눴다. `getDefaultConfig`가 서버에서 동작하지 않는다.
- `coinbaseWallet` 대신 RainbowKit의 `base` 지갑 (deprecated 대체). 체인은 `NEXT_PUBLIC_CHAIN_ID`로 고른다.
- Next.js `cacheComponents`는 끈다 (layout이 쿠키를 읽어 연결 상태를 복원하기 때문).
- **랭킹 30초 캐시**: 페이지 `revalidate = 30` 대신 `unstable_cache`로 데이터를 30초 캐시한다. layout의 쿠키 읽기 때문에 모든 페이지가 동적이라 페이지 ISR이 걸리지 않는다.
- **PNG 변환**: `@resvg/resvg-js`/`sharp` 대신 Next.js에 들어 있는 `next/og`(`ImageResponse`, 내부 satori + resvg). `kind: "image"` 아트는 서버가 받아 data URI로 넣는다 (`next/og`가 localhost 주소를 막음).
- multicall3가 없는 anvil을 위해 서버·`useMyPets`의 여러 읽기는 `lib/readMany.ts`가 따로 읽기로 바꾼다. Base 계열에서는 multicall 한 번이다.
- `ArtSet`에 선택 기능 두 개를 더했다: `render(look, { idPrefix })`(한 페이지 여러 펫의 SVG id 충돌 방지), `background?(look)`(무대 배경색).
- 홈에서 펫이 있으면 자동으로 이동하지 않고 **내 펫 목록**을 보여준다. 펫은 여러 마리일 수 있고, 로고(홈)로 돌아올 수 있어야 해서다.
- 확정 대기 중 새로고침 대응: 서명 직후 해시를 sessionStorage에 두고, 페이지가 다시 열리면 이어서 기다린다(버튼 잠금, 연출 복원). RainbowKit 최근 트랜잭션도 켰다.
- 레벨업 연출의 "새 해금 카드"는 6초 동안 카드 아래에 띄운다. 해금 배경(Lv 6/10/14/17)은 화면 무대에만 쓰고 NFT 이미지는 종별 기본 배경을 쓴다.
- 랭킹의 레벨·단계는 컨트랙트에서 따로 읽지 않고 XP에서 계산한다 (`look.ts`, 컨트랙트와 같은 식이 테스트로 보장됨).
- `/dev/art`(아트 확인 페이지)는 production 빌드에서 404.
- **내 펫 찾기**: SPEC 8장의 Transfer 로그 검색(`getLogs`) 대신 1..totalSupply의 `ownerOf`를 200개씩 묶어 읽는다. Base Sepolia RPC가 `getLogs` 범위를 막아서(Alchemy 무료 10블록, 공개 RPC 200블록) 배포 뒤 블록이 쌓이자 끝나지 않았다. 펫 수에 비례하는 방식이라 펫이 수만 마리가 되면 인덱서가 필요하다.
