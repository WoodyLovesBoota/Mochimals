# 컨트랙트 ↔ 프론트엔드 연결

> 지시서(SPEC)가 아니라 **실제로 구현한 코드**를 기준으로 쓴다. 코드가 바뀌면 이 문서도 같이 고친다.
> 줄 번호는 이 문서를 마지막으로 고친 커밋 기준이다.

마지막 갱신: 2026-11-24 (4강 시작 전, 2~3강 코드 기준)

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
| `NEXT_PUBLIC_DEPLOY_BLOCK` | `block.number` | `contracts.ts` 24줄. 내 펫 찾기(`getLogs`)의 `fromBlock` (5강) |

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
| [web/src/lib/wagmi.ts](../web/src/lib/wagmi.ts) | 클라이언트만 (`providers.tsx`) | 20~45줄 RainbowKit `getDefaultConfig`. 지갑 목록, 41줄 `pollingInterval: 1_000`. 49~53줄 `Register`로 config 타입을 앱 전체에 등록 |
| [web/src/lib/wagmiServer.ts](../web/src/lib/wagmiServer.ts) | 서버만 (`layout.tsx`) | 9~14줄 지갑 없는 `createConfig`. 쿠키 복원에만 쓴다 |

SPEC은 `wagmi.ts` 하나지만, RainbowKit의 `getDefaultConfig`는 서버에서 부르면 빌드가 실패해서 나눴다. 공통 부분(체인, RPC, storage)은 `chain.ts` 하나에서 가져오므로 서버·클라이언트 설정이 어긋나지 않는다.

## 5. 새로고침해도 연결 유지 (쿠키 복원)

1. 지갑을 연결하면 wagmi가 상태를 `wagmi.store` 쿠키에 저장한다 (`chain.ts` 38줄 `cookieStorage`).
2. 다음 요청 때 브라우저가 쿠키를 서버로 보낸다.
3. 서버 컴포넌트 [layout.tsx](../web/src/app/layout.tsx) 44줄 `cookieToInitialState(serverConfig, cookie)`가 쿠키를 wagmi 상태로 바꾼다.
4. 55줄 `<Providers initialState>` → [providers.tsx](../web/src/app/providers.tsx) 32줄 `WagmiProvider initialState`로 넘긴다. 첫 HTML부터 "연결됨"으로 그려져 깜빡임이 없다.

대가: 44줄에서 `headers()`를 읽으므로 모든 페이지가 요청마다 렌더링된다. 그래서 [next.config.ts](../web/next.config.ts)에서 `cacheComponents`를 껐다.

Provider 순서 (`providers.tsx` 32~36줄): `WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider`. wagmi의 읽기 결과는 TanStack Query 캐시(29줄 `queryClient`)에 저장된다. **행동 후 화면을 갱신할 때 이 캐시를 무효화한다** (4강).

## 6. 읽기: 지금 있는 것

[web/src/components/EnergyBadge.tsx](../web/src/components/EnergyBadge.tsx) — 헤더의 활동력.

| 줄 | 내용 |
| --- | --- |
| 12 | `useAccount()`로 연결된 주소 |
| 17~26 | `useReadContract({ ...energy, functionName: "balanceOf", args })`. 가스비·서명 없는 view 호출 |
| 22, 25 | 주소가 없으면 `args: undefined` + `enabled: false`로 요청 자체를 안 보낸다 |
| 36 | 반환값은 `bigint`. Energy의 decimals가 0이라 `toString()`만 한다 |

행동 후 갱신: 아래 `usePetAction`의 `onSuccess`가 캐시 전체를 무효화하므로 이 값도 다시 읽힌다.

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
| 14 | | `ActionPhase` = `idle / simulating / signing / confirming`. 버튼 문구용 (`isPending`만으로는 "지갑에서 확인"과 "처리 중"을 못 나눈다) |
| 37~53 | ① 시뮬레이션 | `simulateContract`. revert하면 여기서 커스텀 에러로 throw되고 **지갑 창이 뜨지 않는다** |
| 43~53 | ② 서명 | `writeContractAsync(request)` → 해시. 거절하면 `UserRejectedRequestError`. 갈래마다 ①②를 같이 하는 건 request 타입 유니온 문제 때문 |
| 58~62 | ③ 확정 | `waitForTransactionReceipt`. `status === "reverted"`는 viem이 throw하지 않으므로 직접 `TX_REVERTED` |
| 68~71 | ④ 이벤트 | `parseEventLogs`. PetNFT 주소의 로그만 (`isAddressEqual`). Energy의 Transfer 로그가 섞여 있다 |
| 78 | ⑤ 무효화 | `invalidateQueries()` 전체. `usePet`, `EnergyBadge`가 다시 읽는다 |
| 83 | | `{ ...mutation, phase, hash }`. `mutation.variables.fn`으로 어떤 버튼이 눌렸는지 안다 |

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
| [PetView.tsx](../web/src/components/PetView.tsx) | 36 | `usePet(id, address)`. viewer는 지금 연결된 지갑 |
| | 44~50, 192 | 없는 펫: `ownerOf`의 OZ 에러 `ERC721NonexistentToken`을 `walk`로 찾는다 (`isNonexistent`) |
| | 54 | 주인 여부 `isAddressEqual(address, pet.owner)` |
| | 81, 185 | 표정: 연출 표정(excited/happy, 10장) → hungry(`isHungry`) → sleepy(활동력 0, 주인일 때만) → idle |
| [useHungerTimer.ts](../web/src/hooks/useHungerTimer.ts) | 31~39 | `lastFedAt + 24시간 + 1초`에 `refetch` 1회. 블록마다 읽는 watch 대신 (SPEC 8장) |
| [time.ts](../web/src/lib/time.ts) | 16 | `+ 1`: 컨트랙트 `isHungry`가 `>` 비교라서. 판정은 항상 컨트랙트 `pet.hungry`, 여기는 남은 시간 글자만 |
| [PetActions.tsx](../web/src/components/PetActions.tsx) | 39, 55 | 지갑 `chainId`가 `chain.id`와 다르면 행동 버튼 대신 `useSwitchChain` 전환 버튼 |
| | 45~46 | `usePetAction`의 `phase` + `variables.fn` → 누른 버튼만 "확인 중 / 지갑에서 확인 / 처리 중" |
| | 49~51 | 잔액(`pet.energy`, bigint)으로 버튼 활성: 밥 ≥1, 훈련 ≥3, 0이면 충전 버튼 |
| | 67 | `toErrorMessage(action.error)`. 지갑 거절은 null이라 문구 없음 |
| | 117 | 확정 대기 중 `blockExplorers.default.url/tx/<hash>` 링크 (anvil은 탐색기가 없어 안 보임) |

## 10. 연출: 영수증 이벤트 → 화면

흐름: `usePetAction` ④ 이벤트 → `PetActions`의 `mutate(args, { onSuccess })` → `toPetEffect(events)` → `usePetEffect.play` → `PetCard`가 Motion으로 그린다.

| 파일 | 줄 | 내용 |
| --- | --- | --- |
| [effects.ts](../web/src/lib/effects.ts) | 11~16 | `PetEvent`: `parseEventLogs` 결과에서 `eventName`/`args`만. 이름과 인자 이름은 `PetNFT.sol` event 선언(105~113줄) 그대로 |
| | 49 | XP 숫자: `Trained.args.xpGained`(40 또는 배고프면 20). `Fed`에는 얻은 양이 없어서 상수 10 |
| | 53~60 | `LevelUp.args.level`과 `level − 1`의 단계를 비교해 진화/부화 판정. 컨트랙트가 한 번에 1레벨만 올린다는 가정 (`_gainXp`) |
| | 64 | 표정: 레벨업 excited 3초 > 밥 happy 10초 (SPEC 5장 우선순위) |
| [PetActions.tsx](../web/src/components/PetActions.tsx) | 33~36 | 호출별 `onSuccess`. 훅의 `onSuccess`(무효화, 다시 읽기 대기)가 먼저 끝나므로 연출 시작 때 수치는 이미 새 값 |
| [usePetEffect.ts](../web/src/hooks/usePetEffect.ts) | 14, 21 | 연출 번호(key)와 표정 상태를 따로 둔다. 표정 없는 훈련이 happy 타이머를 지우지 않게 |
| [PetView.tsx](../web/src/components/PetView.tsx) | 60 | `MotionConfig reducedMotion="user"`: 동작 줄이기면 transform을 건너뛰고 페이드만 |
| | 133~150 | XP 숫자 `+10`/`+40`. `AnimatePresence` + 연출 번호 key |
| | 86, 92~105 | 레벨업(단계 그대로일 때만): `useAnimate`로 펫 통통 튀기. 연출 번호가 바뀔 때 한 번. 동작 줄이기면 생략 |
| | 154~159 | 레벨업 배지 `Lv N!`(영수증 `LevelUp.level`)와 별 파티클 ([LevelUpFx.tsx](../web/src/components/LevelUpFx.tsx)). 배지가 끝나면 `clear("levelUp")` |

## 11. 아직 없는 것 (만들면 여기에 추가)

- 4강: 진화/부화 연출 (`effect.evolve`), 레벨업 때 새 해금 카드 (`lib/unlocks.ts`)
- 5강: `useMyPets`(`Transfer` 로그 + `ownerOf`), 입양 후 `Adopted` 이벤트에서 petId, 랭킹 서버 읽기
- 6강: 메타데이터 API (`tokenURI` → `/api/pet/[id]`)
