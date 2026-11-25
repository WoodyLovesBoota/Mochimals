# 배포 가이드 (7강: Base Sepolia + Vercel)

컨트랙트를 Base Sepolia 테스트넷에, 웹을 Vercel에 올려서 다른 사람도 써 볼 수 있게 만드는 절차다.
로컬(anvil) 실행은 [README](../README.md) "실행: 로컬"을 본다.

## 배포하면 누가 무엇을 할 수 있나

주소만 알면 누구나 접속할 수 있다. 다만 직접 키우려면 사용자 쪽에 준비물이 필요하다.

| 하려는 것 | 필요한 것 |
| --- | --- |
| 구경 (홈 소개, 랭킹, 남의 펫 화면) | 브라우저만 |
| 입양, 밥, 훈련, 충전 | 지갑(MetaMask, Base/Coinbase 지갑 등) + **Base Sepolia 테스트 ETH** (가스비) |

- 테스트 ETH는 돈이 아니지만 faucet에서 받아야 해서 처음 오는 사람에게 가장 큰 장벽이다.
- 8강(선택) 가스비 대납을 붙이면 Coinbase Smart Wallet 사용자는 ETH 없이 플레이할 수 있다 ([SPEC.md](SPEC.md) 10장).

## 순서가 중요한 이유

`tokenURI`의 앞부분(`baseURI`)은 **컨트랙트를 배포할 때 정해지고, 바꾸는 함수가 없다**
([PetNFT.sol](../contracts/src/PetNFT.sol) 생성자). 배포 스크립트는 `APP_URL + "/api/pet/"`를 넣는다.
그래서 **웹 주소를 먼저 정하고**, 그 주소로 컨트랙트를 배포한 뒤, 컨트랙트 주소를 웹 env에 넣는다.

```
① Vercel 주소 확보 → ② 준비물 → ③ 컨트랙트 배포(APP_URL=웹 주소) → ④ 웹 env 설정 후 배포 → ⑤ 확인
```

## ① 웹 주소 정하기

- Vercel에서 프로젝트 이름을 정하면 `https://<프로젝트 이름>.vercel.app`이 된다. 이름이 비어 있는지 먼저 확인한다.
- 커스텀 도메인을 쓸 거면 그 도메인을 `APP_URL`로 쓴다. 나중에 도메인을 바꾸면 컨트랙트를 다시 배포해야 한다.

## ② 준비물 (한 번만)

| 준비물 | 어디서 | 쓰는 곳 |
| --- | --- | --- |
| 배포용 지갑 + Base Sepolia 테스트 ETH | Base Sepolia faucet (Coinbase Developer Platform 등) | 컨트랙트 배포 가스비 |
| RPC 주소 (API 키 포함) | Alchemy 등에서 Base Sepolia 앱 생성 | 배포 명령, `NEXT_PUBLIC_RPC_URL` |
| WalletConnect(Reown) 프로젝트 ID | Reown 대시보드 | `NEXT_PUBLIC_WC_PROJECT_ID`. 없으면 휴대폰 지갑(QR) 연결이 안 된다 |
| Foundry keystore | `cast wallet import <이름> --interactive` | 배포 명령의 `--account`. 개인키를 명령줄·파일·채팅에 쓰지 않는다 |

- 공개 RPC도 동작은 하지만 요청 제한이 빡빡하다. 랭킹(서버)과 여러 사용자의 폴링이 겹치면 막힐 수 있다.
- RPC 키, 프로젝트 ID는 git·문서·채팅에 쓰지 않는다. 비밀번호 관리자에 두고 Vercel 환경 변수에만 넣는다.

## ③ 컨트랙트 배포

```bash
cd contracts
forge test                                   # 33개 통과 확인

APP_URL=https://<웹 주소> forge script script/Deploy.s.sol \
  --rpc-url <Base Sepolia RPC 주소> \
  --account <keystore 이름> \
  --broadcast
```

출력에서 세 줄을 적어 둔다.

```
NEXT_PUBLIC_PET_NFT_ADDRESS=0x...
NEXT_PUBLIC_ENERGY_ADDRESS=0x...
NEXT_PUBLIC_DEPLOY_BLOCK=...
```

`baseURI:` 줄이 `https://<웹 주소>/api/pet/`인지 확인한다. 틀렸으면 다시 배포한다 (새 주소가 나온다).

## ④ Vercel 배포

1. GitHub 저장소를 Vercel에 연결한다.
2. **Root Directory를 `web`** 으로 둔다 (저장소 루트에는 `contracts/`도 있다).
3. 환경 변수를 넣는다 (Production, Preview 둘 다).

| 이름 | 값 |
| --- | --- |
| `NEXT_PUBLIC_CHAIN_ID` | `84532` |
| `NEXT_PUBLIC_RPC_URL` | ②의 RPC 주소 |
| `NEXT_PUBLIC_WC_PROJECT_ID` | ②의 프로젝트 ID |
| `NEXT_PUBLIC_PET_NFT_ADDRESS` | ③ 출력 |
| `NEXT_PUBLIC_ENERGY_ADDRESS` | ③ 출력 |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | ③ 출력 |
| `NEXT_PUBLIC_APP_URL` | `https://<웹 주소>` (끝에 `/` 없이) |
| `PAYMASTER_URL` | 비움 (8강에서 사용) |

4. 배포한다.

- `NEXT_PUBLIC_` 값은 **빌드할 때 코드에 박힌다**. 값을 바꾸면 Vercel에서 다시 배포해야 반영된다.
- 주소 env가 비었거나 형식이 틀리면 `lib/contracts.ts`가 빌드 중에 에러를 낸다 (일부러 그렇게 만들었다).

## ⑤ 확인

| 확인 | 방법 |
| --- | --- |
| 연결과 체인 | 지갑 연결 → Base Sepolia가 아니면 "Base Sepolia로 전환" 버튼이 나온다 |
| 처음부터 끝까지 | 새 지갑으로 입양 → 밥 → 훈련 → 활동력 0 → 충전 → 레벨업 연출 (SPEC 13장 완료 기준) |
| 에러 문구 | 지갑에서 거절, 활동력 부족, 남의 펫 화면 |
| 새로고침 | 연결과 내 펫이 유지된다. 확정 대기 중 새로고침하면 "처리 중"으로 이어진다 |
| 메타데이터 | `https://<웹 주소>/api/pet/1` JSON, `image`의 PNG가 화면의 펫과 같다 |
| 랭킹 피드 | 다른 지갑으로 레벨업 → 랭킹 화면에 피드가 뜬다 (순위는 최대 30초 늦게 바뀐다) |
| 탐색기 | 처리 중 "탐색기에서 확인하기" 링크가 Basescan(Sepolia)으로 간다 |
| 개발 페이지 | `/dev/art`가 404 |

## 문제가 생기면

| 증상 | 확인할 것 |
| --- | --- |
| 빌드 실패 "올바른 주소가 아니다" | Vercel env의 주소 값, Root Directory가 `web`인지 |
| 내 펫이 안 보임 | `NEXT_PUBLIC_DEPLOY_BLOCK`이 배포 블록인지 (너무 크면 입양 로그를 못 찾는다) |
| 랭킹 "불러오지 못했어요" | `NEXT_PUBLIC_RPC_URL`, RPC 요청 한도 |
| 휴대폰 지갑 연결 안 됨 | `NEXT_PUBLIC_WC_PROJECT_ID`, Reown 대시보드의 허용 도메인 |
| 마켓의 이미지가 안 바뀜 | 마켓 캐시. 아트를 바꿨다면 `ArtSet.version`을 올리고 admin이 `refreshAllMetadata()` 호출 |

## 다음

- 8강(선택): 가스비 대납 ([SPEC.md](SPEC.md) 10장). `PAYMASTER_URL`을 채우고 `/api/paymaster`를 만든다.
