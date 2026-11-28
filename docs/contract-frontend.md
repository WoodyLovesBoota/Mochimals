# Contract ↔ Frontend Integration

> Written against the **actually implemented code**, not the spec (SPEC). When the code changes, update this document along with it.
> Line numbers refer to the commit that last modified this document.

Last updated: 2026-11-25 (through Lesson 6, metadata API; before deployment)

## At a glance

```
contracts/src/*.sol
   │ forge build
   ▼
contracts/out/{PetNFT,Energy}.sol/*.json      (build output containing the ABI)
   │ pnpm wagmi   (web/wagmi.config.ts)
   ▼
web/src/generated.ts                          petNftAbi, energyAbi  (as const)
   │
   │        run contracts/script/Deploy.s.sol → prints 3 addresses to the console
   │                         │ copy by hand
   │                         ▼
   │                  web/.env.local  NEXT_PUBLIC_PET_NFT_ADDRESS / ENERGY_ADDRESS / DEPLOY_BLOCK
   ▼                         ▼
web/src/lib/contracts.ts   petNft = { address, abi },  energy = { address, abi }
   │
   ▼
in components/hooks:  useReadContract({ ...energy, functionName: "balanceOf", args: [me] })
```

The two branches meet in `lib/contracts.ts`. **The ABI comes in via code generation, the addresses via env.**

## 1. ABI: Solidity → TypeScript

| File                                            | What it does                                                                                                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [web/wagmi.config.ts](../web/wagmi.config.ts)   | `@wagmi/cli` config. Line 13 `out: "src/generated.ts"`; line 20 `include` pulls in only PetNFT and Energy. Line 23 `forge: { build: true }` means a single `pnpm wagmi` also runs `forge build` |
| [web/src/generated.ts](../web/src/generated.ts) | Generated output. Do not edit by hand. `energyAbi` (line 5), `petNftAbi` (line 196)                                                                                                             |

- Why not just import the JSON: the generated ABI ends with `as const`, so wagmi knows function names, arguments, and return types literally. A typo like `functionName: "fedd"` or passing a string in `args` becomes a type error.
- **Whenever you change a contract, rerun `pnpm wagmi`.** Otherwise the frontend calls with the old ABI.

## 2. Addresses: deploy script → env

Lines 43–46 of [contracts/script/Deploy.s.sol](../contracts/script/Deploy.s.sol) print the three lines to paste into env verbatim.

| env                           | Source of the value                                                                      | Used in                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_PET_NFT_ADDRESS` | `address(nft)`                                                                           | `contracts.ts` line 20                                                                                  |
| `NEXT_PUBLIC_ENERGY_ADDRESS`  | `address(nft.energy())` (the PetNFT constructor deploys it alongside via `new Energy()`) | `contracts.ts` line 21                                                                                  |
| `NEXT_PUBLIC_DEPLOY_BLOCK`    | `block.number`                                                                           | `contracts.ts` line 24. Currently unused (Section 11: finding my pets switched to the ownerOf approach) |

If you start a fresh anvil and deploy first with key #0, the addresses are always the same (address = deployer + nonce).

## 3. `lib/contracts.ts`: address + ABI bundle

[web/src/lib/contracts.ts](../web/src/lib/contracts.ts)

| Lines | Content                                                                                                                                                                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8~16  | `readAddress`: if the env is empty or not in address format, **throw immediately at app startup**. Calling with an empty address only produces confusing symptoms like "every result is 0"                                                                                                                                            |
| 20~21 | Uses `process.env.NEXT_PUBLIC_XXX` **literally**. Next.js replaces this exact text with the value at build time. If you pull it out via a variable like `process.env[name]`, it is `undefined` in the browser                                                                                                                         |
| 29~31 | Picks out only the `type: "error"` entries from the Energy ABI                                                                                                                                                                                                                                                                        |
| 33~40 | `petNft.abi = [...petNftAbi, ...energyErrors]`. When `train()` runs short of energy, the revert happens inside Energy (OZ `_burn`) as `ERC20InsufficientBalance`. That error definition is not in the PetNFT ABI, so it must be merged for viem to read the name (needed when converting it to a message in Lesson 4 `lib/errors.ts`) |
| 42    | `energy = { address, abi }`                                                                                                                                                                                                                                                                                                           |

Usage: spread it into a hook like `{ ...petNft, functionName, args }`. This file doesn't import any client-only code, so it can also be used in server components (ranking, metadata API).

## 4. Chain/wallet config: why it's split into three files

| File                                                        | Where it's used               | Content                                                                                                                                                                                                                                      |
| ----------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [web/src/lib/chain.ts](../web/src/lib/chain.ts)             | Server + client               | Lines 16–28 select the chain via `NEXT_PUBLIC_CHAIN_ID` (31337 anvil / 84532 Base Sepolia / 8453 Base). Line 32 `transports` (RPC), line 38 `storage` (cookie)                                                                               |
| [web/src/lib/wagmi.ts](../web/src/lib/wagmi.ts)             | Client only (`providers.tsx`) | Lines 20–48 RainbowKit `getDefaultConfig`. Wallet list, `pollingInterval: 4_000` (SPEC says 1 second; raised to 4 seconds because of the Alchemy free plan's per-second limit). Lines 52–56 register the config type app-wide via `Register` |
| [web/src/lib/wagmiServer.ts](../web/src/lib/wagmiServer.ts) | Server only (`layout.tsx`)    | Lines 9–14 a wallet-less `createConfig`. Used only for cookie restoration                                                                                                                                                                    |

SPEC has a single `wagmi.ts`, but RainbowKit's `getDefaultConfig` breaks the build when called on the server, so it was split. The shared parts (chain, RPC, storage) all come from `chain.ts`, so the server and client configs never drift apart.

## 5. Staying connected across refreshes (cookie restoration)

1. When a wallet connects, wagmi saves its state to the `wagmi.store` cookie (`chain.ts` line 38 `cookieStorage`).
2. On the next request, the browser sends the cookie to the server.
3. In the server component [layout.tsx](../web/src/app/layout.tsx), line 44 `cookieToInitialState(serverConfig, cookie)` converts the cookie into wagmi state.
4. Line 55 `<Providers initialState>` → passes it to `WagmiProvider initialState` at line 32 of [providers.tsx](../web/src/app/providers.tsx). The very first HTML is rendered as "connected", so there's no flicker.

Trade-off: line 44 reads `headers()`, so every page is rendered per request. That's why `cacheComponents` is turned off in [next.config.ts](../web/next.config.ts).

Provider order (`providers.tsx` lines 32–36): `WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider`. wagmi's read results are stored in the TanStack Query cache (line 29 `queryClient`). **To refresh the screen after an action, invalidate this cache** (Lesson 4).

## 6. Reading: browser (wagmi hooks)

[web/src/hooks/useEnergy.ts](../web/src/hooks/useEnergy.ts) — energy of the current wallet. Shared by the header pill ([EnergyBadge.tsx](../web/src/components/EnergyBadge.tsx) "4/10") and the my-pets list hint ("지금 4/10" ("now 4/10")).

| Lines                                                       | Content                                                                                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 13                                                          | Connected address via `useAccount()`                                                                                          |
| 18~27                                                       | `useReadContract({ ...energy, functionName: "balanceOf", args })`. A view call with no gas fee or signature                   |
| 23, 26                                                      | With no address, `args: undefined` + `enabled: false` so no request is sent at all                                            |
| [EnergyBadge.tsx](../web/src/components/EnergyBadge.tsx) 26 | The return value is a `bigint`. Energy's decimals is 0, so just `toString()`. The denominator 10 is the `MAX_ENERGY` constant |

The wallet button is [AccountButton.tsx](../web/src/components/AccountButton.tsx): it uses RainbowKit `ConnectButton.Custom` to receive only the connection state (`account`, `chain.unsupported`) and the functions that open the modals, and draws the look itself. Modal colors are injected by [rainbowTheme.ts](../web/src/lib/rainbowTheme.ts) as CSS tokens (`var(--lime)`).

Wrong network is [WrongNetworkSheet.tsx](../web/src/components/WrongNetworkSheet.tsx) line 31: if `useAccount().chainId` differs from `chain.id`, it shows a sheet on any screen and switches via `useSwitchChain` (mounted once in layout).

Refresh after an action: `confirm` in `usePetAction` below invalidates the whole cache, so this value is re-read too.

[web/src/hooks/usePet.ts](../web/src/hooks/usePet.ts) — pet screen reads (Lesson 4).

| Lines | Content                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11~21 | `PetState` result type. uint64/uint256 are `bigint`, uint32/uint8 are `number` (viem uses number only for 48 bits or fewer)                                                                                                                             |
| 35~45 | 6 contracts in `useReadContracts` = 1 multicall. **Same-block basis**, so XP and level never disagree                                                                                                                                                   |
| 31~33 | ! Multicall doesn't work on anvil (the viem `foundry` chain has no multicall3 address). wagmi `readContracts` catches the error and falls back to 6 separate reads. It works, but without the same-block guarantee. Base / Base Sepolia have multicall3 |
| 44    | `zeroAddress` when not connected. The array length and order must be fixed so `select` can pull values out by position                                                                                                                                  |
| 49    | `allowFailure: false`. For a nonexistent pet, `ownerOf` reverts and the whole result is an error                                                                                                                                                        |
| 53    | `staleTime: 10_000`. No re-request for 10 seconds (after an action, invalidation forces a refresh)                                                                                                                                                      |
| 56~59 | `select` converts tuple → `PetState` object. `pets()` returns the struct as a `[xp, lastFedAt, bornAt, dna]` tuple                                                                                                                                      |

## 7. Writing: `usePetAction`

[web/src/hooks/usePetAction.ts](../web/src/hooks/usePetAction.ts) — adopt, feed, train, and recharge all go through this one hook.

| Lines    | Stage             | Content                                                                                                                                                                                                                                                                              |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 17       |                   | `ActionPhase` = `idle / simulating / signing / confirming`. For button labels (`isPending` alone can't distinguish "confirm in wallet" from "processing")                                                                                                                            |
| 30, 35   |                   | Option `onDone(result, args)`: called when finished (after the re-read is done too). `resumeIf(args)`: chooses which action to resume after a refresh                                                                                                                                |
| 72~90    | ① simulate ② sign | `simulateContract` → `writeContractAsync(request)`. If it would revert, ① throws with the custom error and **the wallet popup never opens**. ①② are done together per branch because of a request type union issue                                                                   |
| 93       |                   | Right after signing, `savePending({ hash, args })` → sessionStorage ([pendingTx.ts](../web/src/lib/pendingTx.ts))                                                                                                                                                                    |
| 94       |                   | RainbowKit `addRecentTransaction`: spinner on the header account button, recent list in the account modal (`showRecentTransactions` in `providers.tsx`)                                                                                                                              |
| 154~181  | ③④⑤ `confirm`     | `waitForTransactionReceipt` → if `status === "reverted"`, `TX_REVERTED` (viem doesn't throw) → `parseEvents` → `await invalidateQueries()`. Shared by the normal flow and the resume flow                                                                                            |
| 174, 185 | Node catch-up     | Waits up to 4 seconds until the block after the confirmed block is visible, then re-reads. The RPC spreads requests across multiple nodes, so it may return stale values right after confirmation (on the first Base Sepolia adoption: "already adopted + 0 pets"). Skipped on anvil |
| 201      | ④ events          | `parseEventLogs`. Only logs from the PetNFT address (`isAddressEqual`). Energy's Transfer logs are mixed in                                                                                                                                                                          |
| 101      | ⑥ onDone          | Effects (PetActions), navigation after adoption (HomeView)                                                                                                                                                                                                                           |
| 103      |                   | `onSettled`: reset the phase + clear the record                                                                                                                                                                                                                                      |
| 115~141  | Resume            | When the page opens, read the record and, if `resumeIf` is true, wait from ③. The button is locked, preventing a double press (recharge → `StillHasEnergy` revert, wasting only gas). `resumingRef` prevents the effect running twice under StrictMode in dev                        |
| 145      |                   | `pendingArgs` = the resumed action or `mutation.variables` → which button was pressed                                                                                                                                                                                                |

[pendingTx.ts](../web/src/lib/pendingTx.ts): key `silo-pets:pending-tx` (line 10). `petId` is a bigint, which JSON can't handle, so it's stored as a string (line 18). On read, the shape is validated with `isHash` etc. (line 32). It's sessionStorage, so it's separate per tab.

## 8. Errors: Solidity `error` → on-screen message

[web/src/lib/errors.ts](../web/src/lib/errors.ts) — `toErrorMessage(error)`.

| Lines | Content                                                                                                         |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| 10~15 | Error name → message table. Names match Solidity `error NotPetOwner();` exactly                                 |
| 28    | viem errors (`BaseError`) wrap the cause in layers of `cause`. `walk` follows the chain down                    |
| 30    | `UserRejectedRequestError` (wallet rejection) → `null`. Just reset the button, no message                       |
| 34~39 | `data.errorName` of `ContractFunctionRevertedError`. The name only appears if the ABI has that error definition |
| 43    | `TX_REVERTED`, network errors, and everything else → default message                                            |

The third test in [errors.test.ts](../web/src/lib/errors.test.ts) shows that without `contracts.ts` line 39 (merging Energy errors), `ERC20InsufficientBalance` falls through to the default message.

## 9. Where it's used on screen: my pet screen

| File                                                    | Lines    | Content                                                                                                                                                                                                                   |
| ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [pet/[id]/page.tsx](../web/src/app/pet/[id]/page.tsx)   | 17       | Server component. 404 unless an integer ≥ 1. Pet IDs start at 1 in the contract (`petId = ++totalSupply`)                                                                                                                 |
| [PetView.tsx](../web/src/components/PetView.tsx)        | 52       | `usePet(id, address)`. The viewer is the currently connected wallet                                                                                                                                                       |
|                                                         | 65       | Nonexistent pet: if `ownerOf` fails with the OZ error `ERC721NonexistentToken`, show the 404 screen (`isNonexistentToken`, [errors.ts](../web/src/lib/errors.ts))                                                         |
|                                                         | 80       | Ownership via `isAddressEqual(address, pet.owner)`. Otherwise visitor mode (mockup 11)                                                                                                                                    |
|                                                         | 108      | Calls `useHungerTimer` only once and passes the remaining time to the HUD ("23:57 남음" ("23:57 left")) and the panel ("23시간 57분 남음" ("23h 57m left"))                                                               |
| [usePet.ts](../web/src/hooks/usePet.ts)                 | 57       | A nonexistent-pet revert is not retried (straight to 404)                                                                                                                                                                 |
| [PetHud.tsx](../web/src/components/PetHud.tsx)          | 92~97    | Hunger pill: "배고파요" ("I'm hungry") if `pet.hungry` (contract `isHungry`), otherwise `formatClock`                                                                                                                     |
| [PetPanel.tsx](../web/src/components/PetPanel.tsx)      | 168      | Hunger row. The 10 energy cells show only for the owner (`pet.energy` is the viewer's balance)                                                                                                                            |
| [PetCard.tsx](../web/src/components/PetCard.tsx)        | 29, 117  | Expression: effect expression (excited/happy, Section 10) → hungry (`isHungry`) → sleepy (energy 0, owner only) → idle                                                                                                    |
|                                                         | 80       | Hunger speech bubble. Position is the art anchor (330, 96) → 82.5% / 24%                                                                                                                                                  |
| [useHungerTimer.ts](../web/src/hooks/useHungerTimer.ts) | 31~39    | One `refetch` at `lastFedAt + 24 hours + 1 second`. Instead of a per-block watch (SPEC Section 8)                                                                                                                         |
| [time.ts](../web/src/lib/time.ts)                       | 16       | `+ 1`: because the contract's `isHungry` uses a `>` comparison. The verdict always comes from the contract's `pet.hungry`; this only produces the remaining-time text                                                     |
| [PetView.tsx](../web/src/components/PetView.tsx)        | 103, 105 | PetView owns the write hook `usePetAction` (buttons and notice bar see the same state). `onDone` → effects, `resumeIf` → resume only this pet's feed/train or a recharge                                                  |
|                                                         | 126      | `pendingArgs.fn` → notice bar "훈련 기록 중 · 블록 확정을 기다려요" ("Recording training · waiting for block confirmation") + step pills (지갑 서명 → 블록 확정 → 반영 (wallet signature → block confirmation → applied)) |
|                                                         | 129      | `toErrorMessage(action.error)` → red notice. Wallet rejection is null, so no message                                                                                                                                      |
| [PetActions.tsx](../web/src/components/PetActions.tsx)  | 35, 49   | If the wallet's `chainId` differs from `chain.id`, a `useSwitchChain` switch button replaces the action buttons                                                                                                           |
|                                                         | 43~45    | Buttons enabled by balance (`pet.energy`, bigint): feed ≥1, train ≥3, recharge button at 0                                                                                                                                |
|                                                         | 62, 154  | While confirming, the pressed button shows a spinner + "확정 중…" ("Confirming…") + transaction link `txUrl(hash)` ([links.ts](../web/src/lib/links.ts); anvil has no explorer, so just the hash text)                    |

The OpenSea and Basescan links and the token number in the info panel are also built by [links.ts](../web/src/lib/links.ts) from `petNft.address` and the chain id. OpenSea closed its testnet site, so `openseaUrl`/`openseaCollectionUrl` exist only on Base mainnet; on Base Sepolia only Basescan shows, and anvil has neither (buttons hidden).

## 10. Effects: receipt events → screen

Flow: `usePetAction` ④ events → `onDone` → `toPetEffect(events)` → `usePetEffect.play` → `PetCard`/`EvolveOverlay` render with Motion.

| File                                                | Lines      | Content                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [effects.ts](../web/src/lib/effects.ts)             | 11~16      | `PetEvent`: only `eventName`/`args` from the `parseEventLogs` result. Names and argument names match the event declarations in `PetNFT.sol` (lines 105–113) exactly                                                                       |
|                                                     | 49         | XP number: `Trained.args.xpGained` (40, or 20 if hungry). `Fed` carries no gained amount, so the constant 10                                                                                                                              |
|                                                     | 53~60      | Compares the stage of `LevelUp.args.level` with that of `level − 1` to detect evolve/hatch. Assumes the contract raises only 1 level at a time (`_gainXp`)                                                                                |
|                                                     | 64         | Expression: level-up excited 3 s > feed happy 10 s (SPEC Section 5 priority)                                                                                                                                                              |
| [usePetEffect.ts](../web/src/hooks/usePetEffect.ts) | 17, 24, 30 | Keeps the effect number (key), expression, and newly unlocked card separate. So a training without an expression doesn't clear the happy timer                                                                                            |
|                                                     | 41         | On evolution, `levelUp` is cleared → only the evolution effect instead of the level-up badge                                                                                                                                              |
|                                                     | 67         | `clear(part)`: turns off only the finished piece (XP number, badge, evolution)                                                                                                                                                            |
| [PetView.tsx](../web/src/components/PetView.tsx)    | 141        | `MotionConfig reducedMotion="user"`: with reduced motion, skip transforms and only fade                                                                                                                                                   |
|                                                     | 226        | Level-up [LevelUpOverlay.tsx](../web/src/components/LevelUpOverlay.tsx): ribbon, big ring, +XP, reward pill ("Lv 8 보상 · 스카프를 받았어요!" ("Lv 8 reward · You got a scarf!")), closes on its own after 2.6 s, 건너뛰기 ("Skip") / Esc |
|                                                     | 274        | Evolve/hatch [EvolveOverlay.tsx](../web/src/components/EvolveOverlay.tsx) (night scene, 1.8 s shake → reveal card, "좋아요!" ("Great!") / 건너뛰기 ("Skip") / Esc)                                                                        |
|                                                     | 120        | New-unlock toast for 6 s (`unlockToast(level)`: "Lv 7 해금 · 어린이로 진화!" ("Lv 7 unlocked · Evolved into a child!"))                                                                                                                   |
| [PetCard.tsx](../web/src/components/PetCard.tsx)    | 93         | XP number `+10`/`+40` (omitted on level-up since LevelUpOverlay shows it big). `AnimatePresence` + effect-number key                                                                                                                      |
|                                                     | 39         | Level-up bounce (`useAnimate`)                                                                                                                                                                                                            |

## 11. Finding my pets: ownerOf for every pet (`useMyPets`)

[web/src/hooks/useMyPets.ts](../web/src/hooks/useMyPets.ts) — the home "my pets list".

| Lines | Content                                                                                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6~12  | Why the SPEC's Transfer log (`getLogs`) approach was dropped: the Base Sepolia RPC caps the range per call (Alchemy free: 10 blocks, `sepolia.base.org`: 200 blocks). About 40,000 blocks accumulate per day, so splitting the range meant thousands of requests and it stalled |
| 31    | Address in the query key. `usePetAction` invalidates the whole cache after an action, so it re-reads automatically after adoption                                                                                                                                               |
| 40~41 | `totalSupply` → pet IDs 1..N (no burning, so no gaps)                                                                                                                                                                                                                           |
| 44~53 | Reads `ownerOf` in batches of 200 (`readMany`; one multicall on Base chains) and keeps only IDs I own. **Gifted pets are included** and pets sent away drop out                                                                                                                 |

Home ([HomeView.tsx](../web/src/components/HomeView.tsx)): if `hasAdopted` is true but the result is empty, `pollWhileEmpty` searches again every 5 seconds (to cover node lag right after adoption).

The cost scales with the number of pets, not blocks. Once there are tens of thousands of pets, an indexer is the right tool (SPEC Section 14 excludes it from this scope).

[HomeView.tsx](../web/src/components/HomeView.tsx): line 41 uses `hasAdopted(me)` to warn up front about a "wallet that has already adopted" (one adoption per wallet). Line 46: if `useMyPets` returns 1 pet, navigate straight to that pet's screen; 2 or more shows [MyPetList.tsx](../web/src/components/MyPetList.tsx). Lines 183–184 navigate straight to `/pet/<id>` using `Adopted.args.petId` from the adoption receipt (faster than a log search). Line 187 resumes only adoption.

## 12. Reading on the server: `publicClient` + `readMany`

| File                                              | Content                                                                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [publicClient.ts](../web/src/lib/publicClient.ts) | Server-only viem `createPublicClient`. Chain is the same as `chain.ts`, but the RPC is the server-only `RPC_URL` (empty → chain's public RPC), not `NEXT_PUBLIC_RPC_URL`: that browser key has an origin allowlist, and server requests carry no Origin → rejected → metadata API 500. `import "server-only"` keeps it out of the client bundle                                                                   |
| [readMany.ts](../web/src/lib/readMany.ts)         | Line 12: if the chain has multicall3, a single `multicall`; line 21: otherwise (anvil), separate reads via `Promise.all`. wagmi hooks handle this automatically, but direct viem calls error out, hence this helper |

## 13. Ranking: read everything on the server and sort

| File                                                     | Lines  | Content                                                                                                                                                                                           |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ranking.ts](../web/src/lib/ranking.ts)                  | 32     | `totalSupply` → pet IDs 1..N (no burning, so no gaps)                                                                                                                                             |
|                                                          | 13, 41 | In batches of 200, interleaves `pets(i)` and `ownerOf(i)` and reads them back in the same order                                                                                                   |
|                                                          | 50     | Level and stage are computed with `levelFromXp`/`stageFromLevel` (same formula as the contract, Lesson 3 tests). Saves half the read requests                                                     |
|                                                          | 56     | XP descending, ties broken by ID ascending                                                                                                                                                        |
| [ranking/page.tsx](../web/src/app/ranking/page.tsx)      | 15     | `unstable_cache(..., { revalidate: 30 })`. SPEC uses page-level `revalidate = 30`, but layout reads cookies so every page is dynamic and it has no effect → cache the data for 30 seconds instead |
| [RankingList.tsx](../web/src/components/RankingList.tsx) | 55     | `useWatchContractEvent({ eventName: "LevelUp" })`: receives anyone's level-up via 4-second polling for a live feed                                                                                |
|                                                          | 67     | "진화" ("evolved") if the level-up changed the stage                                                                                                                                              |
|                                                          | 73     | Refreshes the list with `router.refresh()` (may lag up to 30 seconds because of the data cache)                                                                                                   |
|                                                          | 91, 93 | Highlights my pets; my highest rank goes in the bottom bar on mobile and the right-side card on desktop                                                                                           |

## 14. Metadata API: `tokenURI` → JSON → PNG

1. Contract `tokenURI(7)` = `baseURI + "7"`. `baseURI` is set at deploy time to `APP_URL + "/api/pet/"` ([Deploy.s.sol](../contracts/script/Deploy.s.sol)).
2. The marketplace reads `/api/pet/7` → follows the JSON's `image` to read `/api/pet/7/image.png?v=<art version>`.

| File                                                                                | Lines   | Content                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [metadata.ts](../web/src/lib/metadata.ts)                                           | 30      | Reads `totalSupply, pets, levelOf, stageOf, isHungry` in one go (`readMany`)                                                                                                                                                                                                    |
|                                                                                     | 37      | If the ID is outside 1..totalSupply, null → 404 (`pets(id)` doesn't revert for nonexistent IDs; it returns 0)                                                                                                                                                                   |
|                                                                                     | 40      | Image expression is only hungry or idle (SPEC Section 5)                                                                                                                                                                                                                        |
| [api/pet/[id]/route.ts](../web/src/app/api/pet/[id]/route.ts)                       | 17      | `?v=${ACTIVE_ART_SET.version}`: changing the art changes the URL, avoiding cached old images                                                                                                                                                                                    |
|                                                                                     | 29      | Species before hatching is `Unknown`                                                                                                                                                                                                                                            |
|                                                                                     | 37      | `s-maxage=60`: CDN reuses it for 60 seconds                                                                                                                                                                                                                                     |
| [api/pet/[id]/image.png/route.tsx](../web/src/app/api/pet/[id]/image.png/route.tsx) | 28~35   | Same `ACTIVE_ART_SET.render` as the screen + [compose.ts](../web/src/art/compose.ts) `layersToSvg` → `next/og` `ImageResponse` as an 800px PNG. `kind: "image"` art is fetched by the server itself and inlined as a data URI (because `next/og` blocks localhost URLs as SSRF) |
|                                                                                     | 37, 203 | Scene images are read directly as files from `public/game` (the server does not call itself via APP_URL)                                                                                                                                                                        |
|                                                                                     | 46      | The Jua font is fetched from Google Fonts only for the glyphs in this image ([ogFont.ts](../web/src/lib/ogFont.ts); falls back to the default font if the fetch fails)                                                                                                          |
|                                                                                     | 131     | Level ring: satori has no conic-gradient, so an SVG circle's `strokeDasharray` fills it by the XP ratio. Colors come from [tokens.ts](../web/src/styles/tokens.ts) (CSS variables can't be used)                                                                                |

When replacing the art: new art set → change `ACTIVE_ART_SET` in `art/index.ts` (bump version) → admin calls `refreshAllMetadata()` (asks marketplaces to refresh via ERC-4906 `BatchMetadataUpdate`). Verified that switching to [art/dummy](../web/src/art/dummy/index.ts) keeps the screens and image API working without modifying any other file.

## 15. Not built yet (add here when built)

- Lesson 7: Base Sepolia deployment (only env values change; code stays the same)
- Lesson 8 (optional): gas sponsorship (`useCapabilities` → `sendCalls` + paymaster)
