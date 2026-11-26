# 컨트랙트 ↔ 프론트엔드 연결

> 지시서(SPEC)가 아니라 **실제로 구현한 코드**를 기준으로 쓴다. 코드가 바뀌면 이 문서도 같이 고친다.
> 줄 번호는 이 문서를 마지막으로 고친 커밋 기준이다.

마지막 갱신: 2026-11-25 (6강 메타데이터 API까지, 배포 전)

## 한눈에 보기

```
contracts/src/*.sol
   │ forge build
   ▼
contracts/out/{PetNFT,Energy}.sol/*.json      (ABI가 들어 있는 빌드 결과)
   │ pnpm wagmi   (web/wagmi.config.ts)
   ▼
web/src/generated.ts                          petNftAbi, energyAbi  (as const)
   │
   │        contracts/script/Deploy.s.sol 실행 → 콘솔에 주소 3개 출력
   │                         │ 손으로 복사
   │                         ▼
   │                  web/.env.local  NEXT_PUBLIC_PET_NFT_ADDRESS / ENERGY_ADDRESS / DEPLOY_BLOCK
   ▼                         ▼
web/src/lib/contracts.ts   petNft = { address, abi },  energy = { address, abi }
   │
   ▼
컴포넌트·훅에서  useReadContract({ ...energy, functionName: "balanceOf", args: [me] })
```

두 갈래가 만나는 곳이 `lib/contracts.ts`다. **ABI는 코드 생성으로, 주소는 env로** 들어온다.

## 1. ABI: Solidity → TypeScript

| 파일 | 하는 일 |
| --- | --- |
| [web/wagmi.config.ts](../web/wagmi.config.ts) | `@wagmi/cli` 설정. 13줄 `out: "src/generated.ts"`, 20줄 `include`로 PetNFT와 Energy만 가져온다. 23줄 `forge: { build: true }`라서 `pnpm wagmi` 한 번이 `forge build`까지 돌린다 |
| [web/src/generated.ts](../web/src/generated.ts) | 생성 결과. 손으로 고치지 않는다. `energyAbi`(5줄), `petNftAbi`(196줄) |

- 왜 JSON을 그냥 import하지 않는가: 생성된 ABI 끝에 `as const`가 붙어서, wagmi가 함수 이름·인자·반환 타입을 글자 그대로 안다. `functionName: "fedd"` 오타나 `args`에 문자열을 넣는 실수가 타입 에러가 된다.
- **컨트랙트를 고치면 반드시 `pnpm wagmi`를 다시 돌린다.** 안 그러면 프론트는 옛 ABI로 호출한다.

## 2. 주소: 배포 스크립트 → env

[contracts/script/Deploy.s.sol](../contracts/script/Deploy.s.sol) 43~46줄이 env에 붙일 세 줄을 그대로 찍는다.

| env | 값의 출처 | 쓰는 곳 |
| --- | --- | --- |
| `NEXT_PUBLIC_PET_NFT_ADDRESS` | `address(nft)` | `contracts.ts` 20줄 |
| `NEXT_PUBLIC_ENERGY_ADDRESS` | `address(nft.energy())` (PetNFT 생성자가 `new Energy()`로 같이 배포) | `contracts.ts` 21줄 |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | `block.number` | `contracts.ts` 24줄. 지금은 쓰는 곳이 없다 (11장: 내 펫 찾기를 ownerOf 방식으로 바꿈) |

anvil을 새로 켜고 0번 키로 처음 배포하면 주소가 항상 같다 (주소 = 배포자 + nonce). 그래서 [PROGRESS.md](PROGRESS.md)의 env 블록을 그대로 붙여도 된다.

## 3. `lib/contracts.ts`: 주소 + ABI 묶음

[web/src/lib/contracts.ts](../web/src/lib/contracts.ts)

| 줄 | 내용 |
| --- | --- |
| 8~16 | `readAddress`: env가 비었거나 주소 형식이 아니면 **앱 시작 때 바로 throw**. 빈 주소로 호출하면 "결과가 전부 0" 같은 헷갈리는 증상만 나오기 때문이다 |
| 20~21 | `process.env.NEXT_PUBLIC_XXX`를 **글자 그대로** 쓴다. Next.js는 빌드할 때 이 글자를 값으로 바꿔 넣는다. `process.env[name]`처럼 변수로 꺼내면 브라우저에서 `undefined`다 |
| 29~31 | Energy ABI에서 `type: "error"` 항목만 골라낸다 |
| 33~40 | `petNft.abi = [...petNftAbi, ...energyErrors]`. `train()`에서 활동력이 모자라면 revert는 Energy 안(OZ `_burn`)에서 `ERC20InsufficientBalance`로 난다. 이 에러 정의가 PetNFT ABI에는 없으므로 합쳐 두어야 viem이 이름을 읽는다 (4강 `lib/errors.ts`에서 문구로 바꿀 때 필요) |
| 42 | `energy = { address, abi }` |

쓰는 법: 훅에 `{ ...petNft, functionName, args }`처럼 펼친다. 이 파일은 클라이언트 전용 코드를 import하지 않으므로 서버 컴포넌트(랭킹, 메타데이터 API)에서도 쓸 수 있다.

## 4. 체인·지갑 설정: 세 파일로 나눈 이유

| 파일 | 어디서 쓰나 | 내용 |
| --- | --- | --- |
| [web/src/lib/chain.ts](../web/src/lib/chain.ts) | 서버 + 클라이언트 | 16~28줄 `NEXT_PUBLIC_CHAIN_ID`로 체인 선택 (31337 anvil / 84532 Base Sepolia / 8453 Base). 32줄 `transports`(RPC), 38줄 `storage`(쿠키) |
| [web/src/lib/wagmi.ts](../web/src/lib/wagmi.ts) | 클라이언트만 (`providers.tsx`) | 20~48줄 RainbowKit `getDefaultConfig`. 지갑 목록, `pollingInterval: 4_000` (SPEC은 1초, Alchemy 무료 플랜 초당 한도 때문에 4초로 늘림). 52~56줄 `Register`로 config 타입을 앱 전체에 등록 |
| [web/src/lib/wagmiServer.ts](../web/src/lib/wagmiServer.ts) | 서버만 (`layout.tsx`) | 9~14줄 지갑 없는 `createConfig`. 쿠키 복원에만 쓴다 |

SPEC은 `wagmi.ts` 하나지만, RainbowKit의 `getDefaultConfig`는 서버에서 부르면 빌드가 실패해서 나눴다. 공통 부분(체인, RPC, storage)은 `chain.ts` 하나에서 가져오므로 서버·클라이언트 설정이 어긋나지 않는다.

## 5. 새로고침해도 연결 유지 (쿠키 복원)

1. 지갑을 연결하면 wagmi가 상태를 `wagmi.store` 쿠키에 저장한다 (`chain.ts` 38줄 `cookieStorage`).
2. 다음 요청 때 브라우저가 쿠키를 서버로 보낸다.
3. 서버 컴포넌트 [layout.tsx](../web/src/app/layout.tsx) 44줄 `cookieToInitialState(serverConfig, cookie)`가 쿠키를 wagmi 상태로 바꾼다.
4. 55줄 `<Providers initialState>` → [providers.tsx](../web/src/app/providers.tsx) 32줄 `WagmiProvider initialState`로 넘긴다. 첫 HTML부터 "연결됨"으로 그려져 깜빡임이 없다.

대가: 44줄에서 `headers()`를 읽으므로 모든 페이지가 요청마다 렌더링된다. 그래서 [next.config.ts](../web/next.config.ts)에서 `cacheComponents`를 껐다.

Provider 순서 (`providers.tsx` 32~36줄): `WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider`. wagmi의 읽기 결과는 TanStack Query 캐시(29줄 `queryClient`)에 저장된다. **행동 후 화면을 갱신할 때 이 캐시를 무효화한다** (4강).

## 6. 읽기: 브라우저 (wagmi 훅)

[web/src/components/EnergyBadge.tsx](../web/src/components/EnergyBadge.tsx) — 헤더(데스크톱)와 펫 HUD(모바일)의 활동력 알약 "4/10".

| 줄 | 내용 |
| --- | --- |
| 16 | `useAccount()`로 연결된 주소 |
| 21~30 | `useReadContract({ ...energy, functionName: "balanceOf", args })`. 가스비·서명 없는 view 호출 |
| 26, 29 | 주소가 없으면 `args: undefined` + `enabled: false`로 요청 자체를 안 보낸다 |
| 50 | 반환값은 `bigint`. Energy의 decimals가 0이라 `toString()`만 한다. 분모 10은 `MAX_ENERGY` 상수 |

지갑 버튼은 [AccountButton.tsx](../web/src/components/AccountButton.tsx): RainbowKit `ConnectButton.Custom`으로 연결 상태(`account`, `chain.unsupported`)와 창 여는 함수만 받아 모양을 직접 그린다. 모달 색은 [rainbowTheme.ts](../web/src/lib/rainbowTheme.ts)가 CSS 토큰(`var(--lime)`)으로 넣는다.

행동 후 갱신: 아래 `usePetAction`의 `confirm`이 캐시 전체를 무효화하므로 이 값도 다시 읽힌다.

[web/src/hooks/usePet.ts](../web/src/hooks/usePet.ts) — 펫 화면 읽기 (4강).

| 줄 | 내용 |
| --- | --- |
| 11~21 | `PetState` 결과 타입. uint64/uint256은 `bigint`, uint32/uint8은 `number` (viem은 48비트 이하만 number) |
| 35~45 | `useReadContracts`의 contracts 6개 = multicall 1번. **같은 블록 기준**이라 XP와 레벨이 어긋나지 않는다 |
| 31~33 | ! anvil에서는 multicall이 안 된다 (viem `foundry` 체인에 multicall3 주소 없음). wagmi `readContracts`가 에러를 잡고 6번 따로 읽기로 바꾼다. 동작은 하지만 같은 블록 보장은 없다. Base / Base Sepolia는 multicall3가 있다 |
| 44 | 미연결이면 `zeroAddress`. 배열 길이·순서를 고정해야 select에서 자리로 꺼낼 수 있다 |
| 49 | `allowFailure: false`. 없는 펫이면 `ownerOf`가 revert해서 결과 전체가 error |
| 53 | `staleTime: 10_000`. 10초 동안 다시 요청하지 않는다 (행동 후에는 무효화로 강제 갱신) |
| 56~59 | `select`로 튜플 → `PetState` 객체. `pets()`는 struct를 `[xp, lastFedAt, bornAt, dna]` 튜플로 준다 |

## 7. 쓰기: `usePetAction`

[web/src/hooks/usePetAction.ts](../web/src/hooks/usePetAction.ts) — 입양·밥·훈련·충전이 전부 이 훅 하나를 지난다.

| 줄 | 단계 | 내용 |
| --- | --- | --- |
| 17 | | `ActionPhase` = `idle / simulating / signing / confirming`. 버튼 문구용 (`isPending`만으로는 "지갑에서 확인"과 "처리 중"을 못 나눈다) |
| 30, 35 | | 옵션 `onDone(result, args)`: 끝나면(다시 읽기까지 끝난 뒤) 부른다. `resumeIf(args)`: 새로고침 뒤 이어받을 행동 고르기 |
| 72~90 | ① 시뮬레이션 ② 서명 | `simulateContract` → `writeContractAsync(request)`. revert하면 ①에서 커스텀 에러로 throw되고 **지갑 창이 뜨지 않는다**. 갈래마다 ①②를 같이 하는 건 request 타입 유니온 문제 때문 |
| 93 | | 서명 직후 `savePending({ hash, args })` → sessionStorage ([pendingTx.ts](../web/src/lib/pendingTx.ts)) |
| 94 | | RainbowKit `addRecentTransaction`: 헤더 계정 버튼 스피너, 계정 창 최근 목록 (`providers.tsx`의 `showRecentTransactions`) |
| 154~181 | ③④⑤ `confirm` | `waitForTransactionReceipt` → `status === "reverted"`면 `TX_REVERTED`(viem은 throw하지 않음) → `parseEvents` → `await invalidateQueries()`. 일반 흐름과 이어받기가 같이 쓴다 |
| 174, 185 | 노드 따라잡기 | 확정 블록 다음 블록이 보일 때까지 최대 4초 기다린 뒤 다시 읽는다. RPC가 여러 노드에 나눠 보내서 확정 직후 옛 값을 줄 수 있기 때문 (Base Sepolia 첫 입양에서 "이미 입양함 + 펫 0마리"). anvil은 건너뛴다 |
| 201 | ④ 이벤트 | `parseEventLogs`. PetNFT 주소의 로그만 (`isAddressEqual`). Energy의 Transfer 로그가 섞여 있다 |
| 101 | ⑥ onDone | 연출(PetActions), 입양 후 이동(HomeView) |
| 103 | | `onSettled`: 단계 되돌리기 + 기록 지우기 |
| 115~141 | 이어받기 | 페이지가 열릴 때 기록을 읽어 `resumeIf`가 참이면 ③부터 기다린다. 버튼이 잠겨서 두 번 누르기(충전 → `StillHasEnergy` revert로 가스비만 날림)를 막는다. `resumingRef`는 개발 모드 StrictMode의 effect 두 번 실행 방지 |
| 145 | | `pendingArgs` = 이어받은 행동 또는 `mutation.variables` → 어떤 버튼이 눌렸는지 |

[pendingTx.ts](../web/src/lib/pendingTx.ts): 키 `silo-pets:pending-tx`(10줄). `petId`는 bigint라 JSON이 못 다뤄 문자열로 저장한다(18줄). 읽을 때 `isHash` 등으로 모양을 검사한다(32줄). sessionStorage라 탭마다 따로다.

## 8. 에러: Solidity `error` → 화면 문구

[web/src/lib/errors.ts](../web/src/lib/errors.ts) — `toErrorMessage(error)`.

| 줄 | 내용 |
| --- | --- |
| 10~15 | 에러 이름 → 문구 표. 이름은 Solidity `error NotPetOwner();` 그대로 |
| 28 | viem 에러(`BaseError`)는 원인을 `cause`로 겹겹이 감싼다. `walk`로 사슬을 따라 내려간다 |
| 30 | `UserRejectedRequestError`(지갑 거절) → `null`. 문구 없이 버튼만 되돌린다 |
| 34~39 | `ContractFunctionRevertedError`의 `data.errorName`. ABI에 그 에러 정의가 있어야 이름이 나온다 |
| 43 | `TX_REVERTED`, 네트워크 에러 등 나머지 → 기본 문구 |

[errors.test.ts](../web/src/lib/errors.test.ts)의 세 번째 테스트가 `contracts.ts` 39줄(Energy 에러 합치기)이 없으면 `ERC20InsufficientBalance`가 기본 문구로 떨어지는 것을 보여준다.

## 9. 화면에서 쓰는 곳: 내 펫 화면

| 파일 | 줄 | 내용 |
| --- | --- | --- |
| [pet/[id]/page.tsx](../web/src/app/pet/[id]/page.tsx) | 17 | 서버 컴포넌트. 1 이상 정수가 아니면 404. 펫 번호는 컨트랙트에서 1부터 (`petId = ++totalSupply`) |
| [PetView.tsx](../web/src/components/PetView.tsx) | 41 | `usePet(id, address)`. viewer는 지금 연결된 지갑 |
| | 52, 189 | 없는 펫: `ownerOf`의 OZ 에러 `ERC721NonexistentToken`을 `walk`로 찾는다 (`isNonexistent`) |
| | 59 | 주인 여부 `isAddressEqual(address, pet.owner)` |
| | 74 | `useHungerTimer`를 한 번만 부르고 남은 시간을 HUD("23:57 남음")와 패널("23시간 57분 남음")에 나눠 준다 |
| [PetHud.tsx](../web/src/components/PetHud.tsx) | 79~84 | 배고픔 알약: `pet.hungry`(컨트랙트 `isHungry`)면 "배고파요", 아니면 `formatClock` |
| [PetPanel.tsx](../web/src/components/PetPanel.tsx) | 109~111 | 배고픔 줄. 활동력 10칸은 주인일 때만 (`pet.energy`는 보는 사람의 잔액) |
| [PetCard.tsx](../web/src/components/PetCard.tsx) | 29, 125 | 표정: 연출 표정(excited/happy, 10장) → hungry(`isHungry`) → sleepy(활동력 0, 주인일 때만) → idle |
| | 80 | 배고픔 말풍선. 위치는 아트 앵커 (330, 96) → 82.5% / 24% |
| [useHungerTimer.ts](../web/src/hooks/useHungerTimer.ts) | 31~39 | `lastFedAt + 24시간 + 1초`에 `refetch` 1회. 블록마다 읽는 watch 대신 (SPEC 8장) |
| [time.ts](../web/src/lib/time.ts) | 16 | `+ 1`: 컨트랙트 `isHungry`가 `>` 비교라서. 판정은 항상 컨트랙트 `pet.hungry`, 여기는 남은 시간 글자만 |
| [PetActions.tsx](../web/src/components/PetActions.tsx) | 43, 58 | 지갑 `chainId`가 `chain.id`와 다르면 행동 버튼 대신 `useSwitchChain` 전환 버튼 |
| | 34, 36 | `onDone` → 연출, `resumeIf` → 이 펫의 밥/훈련 또는 충전만 이어받기 |
| | 49 | `pendingArgs.fn` → 누른 버튼만 "확인 중 / 지갑에서 확인 / 처리 중" |
| | 52~54 | 잔액(`pet.energy`, bigint)으로 버튼 활성: 밥 ≥1, 훈련 ≥3, 0이면 충전 버튼 |
| | 76 | `toErrorMessage(action.error)`. 지갑 거절은 null이라 문구 없음 |
| | 79 | 확정 대기 중 트랜잭션 링크 `txUrl(hash)` ([links.ts](../web/src/lib/links.ts), anvil은 탐색기가 없어 안 보임) |

정보 패널의 OpenSea·Basescan 링크와 토큰 번호도 [links.ts](../web/src/lib/links.ts)가 `petNft.address`와 체인 id로 만든다 (anvil은 둘 다 없음 → 버튼 숨김).

## 10. 연출: 영수증 이벤트 → 화면

흐름: `usePetAction` ④ 이벤트 → `onDone` → `toPetEffect(events)` → `usePetEffect.play` → `PetCard`/`EvolveOverlay`가 Motion으로 그린다.

| 파일 | 줄 | 내용 |
| --- | --- | --- |
| [effects.ts](../web/src/lib/effects.ts) | 11~16 | `PetEvent`: `parseEventLogs` 결과에서 `eventName`/`args`만. 이름과 인자 이름은 `PetNFT.sol` event 선언(105~113줄) 그대로 |
| | 49 | XP 숫자: `Trained.args.xpGained`(40 또는 배고프면 20). `Fed`에는 얻은 양이 없어서 상수 10 |
| | 53~60 | `LevelUp.args.level`과 `level − 1`의 단계를 비교해 진화/부화 판정. 컨트랙트가 한 번에 1레벨만 올린다는 가정 (`_gainXp`) |
| | 64 | 표정: 레벨업 excited 3초 > 밥 happy 10초 (SPEC 5장 우선순위) |
| [usePetEffect.ts](../web/src/hooks/usePetEffect.ts) | 17, 24, 30 | 연출 번호(key), 표정, 새 해금 카드를 따로 둔다. 표정 없는 훈련이 happy 타이머를 지우지 않게 |
| | 41 | 진화면 `levelUp`을 비운다 → 레벨업 배지 대신 진화 연출만 |
| | 67 | `clear(part)`: 끝난 조각(XP 숫자, 배지, 진화)만 끈다 |
| [PetView.tsx](../web/src/components/PetView.tsx) | 94 | `MotionConfig reducedMotion="user"`: 동작 줄이기면 transform을 건너뛰고 페이드만 |
| | 162 | 진화/부화 `EvolveOverlay` (화면 전체, 3초, 건너뛰기·Esc) |
| | 84, 102 | 새 해금 알림 6초 (`unlockToast(level)`: "Lv 7 해금 · 어린이로 진화!") |
| [PetCard.tsx](../web/src/components/PetCard.tsx) | 92 | XP 숫자 `+10`/`+40`. `AnimatePresence` + 연출 번호 key |
| | 39, 112 | 레벨업: `useAnimate` 튀기 + 배지·별 ([LevelUpFx.tsx](../web/src/components/LevelUpFx.tsx)) |

## 11. 내 펫 찾기: 모든 펫의 ownerOf (`useMyPets`)

[web/src/hooks/useMyPets.ts](../web/src/hooks/useMyPets.ts) — 홈의 "내 펫 목록".

| 줄 | 내용 |
| --- | --- |
| 6~12 | 왜 SPEC의 Transfer 로그(`getLogs`) 방식을 버렸나: Base Sepolia RPC가 한 번의 범위를 막는다 (Alchemy 무료 10블록, `sepolia.base.org` 200블록). 블록은 하루 약 4만 개씩 쌓여서 범위를 나눠 부르면 요청이 수천 개가 되고 멈췄다 |
| 31 | 쿼리 키에 주소. `usePetAction`이 행동 뒤 캐시 전체를 무효화하므로 입양 뒤 자동으로 다시 읽는다 |
| 40~41 | `totalSupply` → 펫 번호 1..N (소각이 없어 빈칸 없음) |
| 44~53 | 200개씩 `ownerOf`를 묶어 읽고(`readMany`, Base 계열은 multicall 1번) 주인이 나인 번호만. **선물받은 펫도 들어오고** 보낸 펫은 빠진다 |

홈([HomeView.tsx](../web/src/components/HomeView.tsx))은 `hasAdopted`가 true인데 결과가 비어 있으면 `pollWhileEmpty`로 5초마다 다시 찾는다 (입양 직후 노드 지연 대비).

비용은 블록 수가 아니라 펫 수에 비례한다. 펫이 수만 마리가 되면 인덱서가 맞다 (SPEC 14장에서 이번 범위는 제외).

[HomeView.tsx](../web/src/components/HomeView.tsx): 88줄 `hasAdopted(me)`로 "이미 입양한 지갑"을 미리 안내(지갑당 입양 1번). 93~95줄 입양 영수증의 `Adopted.args.petId`로 바로 `/pet/<id>` 이동(로그 검색보다 빠르다). 98줄 입양만 이어받기.

## 12. 서버에서 읽기: `publicClient` + `readMany`

| 파일 | 내용 |
| --- | --- |
| [publicClient.ts](../web/src/lib/publicClient.ts) | 서버 전용 viem `createPublicClient`. 체인과 RPC는 `chain.ts`·env와 같다. `import "server-only"`로 클라이언트 번들에 못 들어가게 막는다 |
| [readMany.ts](../web/src/lib/readMany.ts) | 12줄: 체인에 multicall3가 있으면 `multicall` 한 번, 21줄: 없으면(anvil) `Promise.all`로 따로. wagmi 훅은 이걸 알아서 하지만 viem 직접 호출은 에러가 나서 만들었다 |

## 13. 랭킹: 서버에서 전부 읽고 정렬

| 파일 | 줄 | 내용 |
| --- | --- | --- |
| [ranking.ts](../web/src/lib/ranking.ts) | 32 | `totalSupply` → 펫 번호 1..N (소각이 없어 빈칸 없음) |
| | 13, 41 | 200개씩 묶어 `pets(i)`, `ownerOf(i)`를 번갈아 넣고 같은 순서로 꺼낸다 |
| | 50 | 레벨·단계는 `levelFromXp`/`stageFromLevel`로 계산 (컨트랙트와 같은 식, 3강 테스트). 읽기 요청 절반 절약 |
| | 56 | XP 내림차순, 같으면 번호 오름차순 |
| [ranking/page.tsx](../web/src/app/ranking/page.tsx) | 15 | `unstable_cache(..., { revalidate: 30 })`. SPEC은 페이지 `revalidate = 30`이지만 layout이 쿠키를 읽어 모든 페이지가 동적이라 효과가 없다 → 데이터를 30초 캐시 |
| [RankingList.tsx](../web/src/components/RankingList.tsx) | 34 | `useWatchContractEvent({ eventName: "LevelUp" })`: 누구의 레벨업이든 4초 폴링으로 받아 피드 |
| | 43 | 단계가 바뀐 레벨업이면 "진화" |
| | 55 | `router.refresh()`로 목록 갱신 (데이터 캐시 때문에 최대 30초 늦을 수 있음) |
| | 61 | 내 펫 강조, 가장 높은 내 순위를 sticky로 고정 표시 |

## 14. 메타데이터 API: `tokenURI` → JSON → PNG

1. 컨트랙트 `tokenURI(7)` = `baseURI + "7"`. `baseURI`는 배포 때 `APP_URL + "/api/pet/"` ([Deploy.s.sol](../contracts/script/Deploy.s.sol)).
2. 마켓이 `/api/pet/7`을 읽는다 → JSON의 `image`를 따라 `/api/pet/7/image.png?v=<아트 버전>`을 읽는다.

| 파일 | 줄 | 내용 |
| --- | --- | --- |
| [metadata.ts](../web/src/lib/metadata.ts) | 30 | `totalSupply, pets, levelOf, stageOf, isHungry`를 한 번에 (`readMany`) |
| | 37 | 번호가 1..totalSupply 밖이면 null → 404 (`pets(id)`는 없는 번호도 revert하지 않고 0을 준다) |
| | 40 | 이미지 표정은 hungry 또는 idle만 (SPEC 5장) |
| [api/pet/[id]/route.ts](../web/src/app/api/pet/[id]/route.ts) | 17 | `?v=${ACTIVE_ART_SET.version}`: 아트를 바꾸면 주소가 달라져 캐시된 옛 이미지를 피한다 |
| | 29 | 부화 전 종은 `Unknown` |
| | 37 | `s-maxage=60`: CDN이 60초 재사용 |
| [api/pet/[id]/image.png/route.tsx](../web/src/app/api/pet/[id]/image.png/route.tsx) | 19, 30 | 화면과 같은 `ACTIVE_ART_SET.render` + [compose.ts](../web/src/art/compose.ts) `layersToSvg` → `next/og` `ImageResponse`로 800px PNG |
| | 31, 48 | `kind: "image"` 아트는 서버가 직접 받아 data URI로 넣는다 (`next/og`가 localhost 주소를 SSRF로 막기 때문) |

아트를 교체할 때: 새 아트 세트 → `art/index.ts`의 `ACTIVE_ART_SET` 변경(version 증가) → admin이 `refreshAllMetadata()` 호출 (ERC-4906 `BatchMetadataUpdate`로 마켓에 새로고침 요청). [art/dummy](../web/src/art/dummy/index.ts)로 바꿔도 다른 파일 수정 없이 화면과 이미지 API가 동작하는 것을 확인했다.

## 15. 아직 없는 것 (만들면 여기에 추가)

- 7강: Base Sepolia 배포 (env 값만 바뀐다. 코드는 그대로)
- 8강(선택): 가스비 대납 (`useCapabilities` → `sendCalls` + paymaster)
