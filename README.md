# Mochimals

A dynamic NFT web game: connect a wallet to adopt a pet NFT for free, then raise it by feeding and training it with energy (the ENERGY token).
As the pet grows, its NFT image and attributes actually change, and pets are ranked by XP.

## Features

- **Adopt**: Once per wallet, free. The DNA (species, color, personality, pattern) is determined by the adoption block. You also receive 10 energy.
- **Care**: Feed (1 energy, +10 XP, clears hunger), train (3 energy, +40 XP, +20 if hungry), and a free +10 refill when energy is 0.
- **Growth**: Hatches at Lv 3, evolves at Lv 7, 12 and 20. Per-level unlocks (titles, backgrounds, dances, ranking frames).
- **Effects**: XP numbers, level-up (bounce, badge, stars), evolution/hatching screens, hunger speech bubble. With the OS "Reduce motion" setting on, only fades are used.
- **Ranking**: XP leaderboard, highlighting of your own pet, and a live feed of level-ups from other wallets.
- **NFT metadata**: `tokenURI` → `/api/pet/<id>` JSON and an 800px PNG. Drawn with the same code as the game screen.

## Stack

| Role | Choice |
| --- | --- |
| Contracts | Solidity ^0.8.24, Foundry, OpenZeppelin Contracts 5.4 |
| Frontend | Next.js 16 (App Router), TypeScript strict, CSS Modules + SCSS |
| Chain integration | viem 2, wagmi 2, RainbowKit 2, TanStack Query 5 |
| Animation | Motion (`motion/react`) |
| Chain | Local anvil (31337) / Base Sepolia (84532) / Base (8453). Switched with a single env var |

## Architecture overview

```
            Reads (no gas)                                  Writes (wallet signature)
Browser ── wagmi hooks ────────► RPC ◄──── Wallet ◄── usePetAction: simulate → sign → confirm → events → re-read
Server  ── viem publicClient ──► RPC         (ranking, metadata API)
```

- **Reads go straight to RPC; writes go through the wallet.** There is no custom backend DB or indexer. Ranking, level and hunger are all computed from on-chain values.
- **Every write goes through a single `usePetAction`.** It simulates before signing, so an action that would fail never opens the wallet prompt. After confirmation, the receipt events (`Fed`/`Trained`/`LevelUp`/`Adopted`) determine which effects to play.
- **Rendering is split into three layers.** Chain (dna, xp) → interpretation (`getPetLook` in `lib/look.ts`) → art set (`render` in `art/*`). A single line, `ACTIVE_ART_SET` in `art/index.ts`, swaps all artwork (verify with `art/dummy`).

For a detailed explanation of the wiring, see [docs/contract-frontend.md](docs/contract-frontend.md).

## Repository layout

| Folder | Contents |
| --- | --- |
| `contracts/` | Foundry project (`Energy.sol`, `PetNFT.sol`, tests, deploy script) |
| `web/` | Next.js app |
| `svg/` | Art sources (`generate.py`, `anchors.json`, reference SVGs). The ground truth for the flat-v1 port |
| `docs/` | Spec, wiring explanation, progress log |

## Running: local (anvil)

Requirements: Node.js 22 or later, pnpm, [Foundry](https://book.getfoundry.sh/getting-started/installation), MetaMask.

```bash
git clone --recurse-submodules https://github.com/WoodyLovesBoota/Mochimals.git
cd Mochimals

# Terminal 1: local chain (resets when stopped)
anvil

# Terminal 2: deploy (every time anvil starts). Test key #0 is a key published by anvil
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Terminal 3: frontend
cd web
pnpm install
# Create .env.local following the env table below
pnpm dev                  # http://localhost:3000
```

MetaMask: add a network (RPC `http://127.0.0.1:8545`, chain ID `31337`) → import an account with anvil key #0. If you restarted anvil, use MetaMask's "Clear activity tab data".

## Running: Base Sepolia

For the detailed steps, prerequisites, checklist and troubleshooting, see [docs/DEPLOY.md](docs/DEPLOY.md). Summary:

1. Prepare a deployer wallet funded with test ETH (Base Sepolia faucet).
2. Deploy: `APP_URL` is the web address you will deploy to (it becomes the prefix of `tokenURI`).
   ```bash
   cd contracts
   APP_URL=https://<deployment address> forge script script/Deploy.s.sol \
     --rpc-url <Base Sepolia RPC> --account <foundry keystore name> --broadcast
   ```
   The private key is never written on the command line or in a file; use a keystore created with `cast wallet import`.
3. Put the three printed values (`NEXT_PUBLIC_PET_NFT_ADDRESS`, `NEXT_PUBLIC_ENERGY_ADDRESS`, `NEXT_PUBLIC_DEPLOY_BLOCK`) and the env vars below into Vercel's environment variables, then deploy.

## Environment variables (`web/.env.local`)

| Name | Example (local) | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_CHAIN_ID` | `31337` | 31337 anvil / 84532 Base Sepolia / 8453 Base |
| `NEXT_PUBLIC_RPC_URL` | (empty) | RPC URL. If empty, the chain's default public RPC. For Base Sepolia, Alchemy or similar |
| `NEXT_PUBLIC_WC_PROJECT_ID` | (empty) | WalletConnect (Reown) project ID. If empty, only WalletConnect wallets stop working |
| `NEXT_PUBLIC_PET_NFT_ADDRESS` | `0x5FbD…0aa3` | Deploy output |
| `NEXT_PUBLIC_ENERGY_ADDRESS` | `0xa16E…d2be` | Deploy output (`petNft.energy()`) |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | `0` | Deploy output. Currently unused in code (finding your pets switched to the ownerOf approach). Kept for when log search is used later |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Absolute image URL in the metadata JSON |
| `RPC_URL` | (empty) | Optional, server-only. RPC for the metadata API and ranking. If empty, the chain's default public RPC. Do not reuse a browser key with an origin allowlist: server requests have no Origin and get rejected |
| `PAYMASTER_URL` | (empty) | Optional, server-only. Gas sponsorship (not implemented yet) |

Real keys (RPC key, WalletConnect ID, Paymaster URL) are never written in git, chat or docs.

## Tests

```bash
cd contracts && forge test            # 33 contract tests
cd web && pnpm test                   # 176 tests: look, art comparison, error messages, time, effects, unlocks, dummy art
cd web && pnpm lint && npx tsc --noEmit && pnpm build
```

## Decisions

Things not in the spec, or decided differently from it. Most are due to library version differences; behavior is the same.

- The repository root corresponds to `silo-pets/` in the spec. The art zip is used as extracted into `svg/`.
- Styling uses **CSS Modules + SCSS** instead of Tailwind. Design tokens are CSS variables in `globals.scss`; screen widths are in `styles/_breakpoints.scss`.
- There is no `web/.env.example`. The table in this README serves as the env list.
- The wagmi config is split into `chain.ts` (shared) / `wagmi.ts` (browser, RainbowKit) / `wagmiServer.ts` (server, cookie restore). `getDefaultConfig` does not work on the server.
- RainbowKit's `base` wallet instead of `coinbaseWallet` (replacement for the deprecated one). The chain is selected by `NEXT_PUBLIC_CHAIN_ID`.
- Next.js `cacheComponents` is turned off (because the layout reads cookies to restore the connection state).
- **30-second ranking cache**: instead of page-level `revalidate = 30`, the data is cached for 30 seconds with `unstable_cache`. Because the layout reads cookies, every page is dynamic, so page ISR does not apply.
- **PNG conversion**: instead of `@resvg/resvg-js`/`sharp`, uses `next/og` (`ImageResponse`, satori + resvg internally), which ships with Next.js. For `kind: "image"` art, the server fetches the image and embeds it as a data URI (`next/og` blocks localhost URLs).
- Because anvil has no multicall3, multiple reads on the server and in `useMyPets` are turned into separate reads by `lib/readMany.ts`. On Base-family chains it is a single multicall.
- Two optional features were added to `ArtSet`: `render(look, { idPrefix })` (prevents SVG id collisions when several pets are on one page) and `background?(look)` (stage background color).
- When you have pets, the home page does not auto-redirect; it shows **your pet list** instead. You can have multiple pets, and you need to be able to return home via the logo.
- Handling a refresh while awaiting confirmation: the hash is stored in sessionStorage right after signing, and when the page reopens it resumes waiting (buttons locked, effects restored). RainbowKit recent transactions are also enabled.
- The "new unlock" notice from the level-up effect is shown below the HUD for 6 seconds. Unlocked backgrounds (Lv 6/10/14/17) become the scene for the entire pet screen (day/night artwork + color tint). The NFT image uses the day scene only.
- **Redesign (Mochimals)**: the service was renamed from Silo Pets → Mochimals (screens, `<title>`, OG, NFT metadata description). The contract's ERC-721 name `"Silo Pet"` is a deployed value, so it is left as-is.
- Level and stage in the ranking are computed from XP rather than read separately from the contract (`look.ts`; tests guarantee it uses the same formula as the contract).
- `/dev/art` (the art preview page) returns 404 in production builds.
- **Finding your pets**: instead of the Transfer log search (`getLogs`) in the original spec, `ownerOf` is read for 1..totalSupply in batches of 200. Base Sepolia RPCs restrict the `getLogs` range (Alchemy free tier 10 blocks, public RPC 200 blocks), so once blocks piled up after deployment the search never finished. This approach scales with the number of pets, so an indexer will be needed once there are tens of thousands.
- **4-second polling**: 4 seconds (the wagmi default) instead of the original spec's `pollingInterval: 1_000`. Just leaving a tab open exceeded the Alchemy free plan's requests-per-second limit. Base blocks are 2 seconds, so confirmations and the level-up feed are only a few seconds late.
