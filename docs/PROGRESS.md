# 강의 진도표

> 다음 세션을 시작할 때 Claude는 이 파일부터 읽고 "다음 할 일"에서 이어간다.
> 한 강이 끝날 때마다 이 파일을 갱신하고 같이 커밋한다.

마지막 갱신: 2026-11-25 (6강까지 개발, 설명 전)

## 현재 위치

**6강(메타데이터 API)까지 개발 끝, 7강 Base Sepolia 배포 직전.** 2026-11-25에 수강생 요청으로 "강의 방식(부분 설명 + 확인 질문)"을 멈추고 4강 7교시 4부부터 배포 직전까지 한 번에 개발했다. **설명은 아직 안 했다** — 다음 세션은 정리 설명부터 한다.

이전까지: 1강 컨트랙트, 2강 Next.js/wagmi/RainbowKit/쿠키 복원/ABI 생성, 3강 `look.ts`·`flat-v1`·`PetSprite`, 4강 1~6교시(`usePet`, `usePetAction`, `errors.ts`, `/pet/[id]`, `PetStats`, `PetActions`)와 7교시 1~3부(`effects.ts`, `usePetEffect`, XP 숫자, 레벨업)는 강의로 진행했다.

## 다음 할 일

1. **한 번에 몰아서 개발한 부분 정리 설명** (수강생이 원한 방식: 끝까지 개발 → 설명은 한 번에). 순서 제안:
   - 4강 마무리: 진화/부화 `EvolveOverlay`, 배고픔 말풍선과 축 처짐, 해금 `lib/unlocks.ts` + `UnlockList` + 새 해금 카드, `PetCard` 분리
   - 새로고침 대응: `lib/pendingTx.ts` + `usePetAction`의 `confirm`/`resume`/`onDone`/`resumeIf`, RainbowKit 최근 트랜잭션
   - 5강: `useMyPets`(Transfer 로그 + ownerOf, 범위 반으로 나누기), `HomeView`(입양, Adopted 이벤트로 이동), `lib/ranking.ts` + `unstable_cache`, `RankingList`(LevelUp 구독 피드)
   - 6강: `lib/metadata.ts`, `/api/pet/[id]`, `/api/pet/[id]/image.png`(next/og), `art/compose.ts`, `art/dummy`
   - 근거 문서: [contract-frontend.md](contract-frontend.md) 7~14장, README "결정 사항"
2. **7강: Base Sepolia 배포** (수강생이 직접): faucet ETH → `cast wallet import`로 keystore → `APP_URL=… forge script … --account …` → Vercel 환경 변수 → 배포. README "실행: Base Sepolia"에 절차가 있다. 배포 뒤 `/api/pet/1`과 OpenSea 테스트넷에서 이미지 확인.
3. 8강(선택): 가스비 대납 (SPEC 10장).

정한 것·알게 된 것 (설명 때 짚을 것):
- SPEC과 다르게 한 것은 README "결정 사항"에 모았다. 이번에 더한 것: 랭킹은 페이지 ISR 대신 `unstable_cache`(layout의 쿠키 읽기로 모든 페이지가 동적이라 `revalidate`가 안 걸린다. 빌드 출력 ƒ로 확인), PNG는 `next/og`(설치 없음), `kind: "image"` 아트는 data URI로(next/og의 SSRF 차단), 홈은 자동 이동 대신 내 펫 목록.
- anvil에는 multicall3가 없어서 viem 직접 호출(서버, useMyPets)은 `lib/readMany.ts`로 따로 읽기.
- vitest에는 `@/` 별칭 설정이 없다. 테스트 파일은 상대 경로로 import한다.
- 개발 중 브라우저 확인: Playwright에 anvil 계정으로 바로 서명하는 EIP-1193 테스트 지갑을 주입해서 입양·밥·훈련·레벨업·부화·충전·새로고침 이어받기·전송받은 펫·랭킹 피드·NFT 이미지를 실제로 눌러 확인했다 (코드에는 넣지 않았다).
- 수강생은 손계산 확인 질문을 원하지 않는다. 개념·설계 질문만 내고, 답을 바로 원하면 알려준다.

## 끝낸 것

| 강 | 내용 | 커밋 |
| --- | --- | --- |
| 0 | 저장소 기본 설정, 아트 원본(`svg/`) 커밋 | `4ead41d` |
| 1-1 | Foundry 프로젝트, OpenZeppelin 5.4.0 설치, `Energy.sol` (주석 포함) | `c61c9f0` |
| - | `forge fmt` 포매터 설정, VSCode 저장 시 자동 정리 | `e235e40` |
| - | 주석 색, Better Comments 태그 (`! ? * TODO`) | `8a2f82e` |
| 1-2 | `test/Energy.t.sol` 테스트 7개 (전부 통과) | `ebc8051` |
| 1-3 | `src/PetNFT.sol` (지시서 코드 그대로, 주석 포함, 컴파일 에러 없음) | `3592cef` |
| 1-4 | `test/PetNFT.t.sol` 테스트 26개 (SPEC 4-3 전부 + 경계값, memory 버그 검출). 수업은 건너뜀 | `b85759a` |
| 1-5 | `script/Deploy.s.sol` (APP_URL env, env용 세 값 출력), anvil 배포 실습 | `13fda77` |
| 2 | Next.js 16 앱 생성 (pnpm) | `f618f53` |
| 2 | wagmi, RainbowKit, Provider, 헤더 ConnectButton, 쿠키 복원 | `fdfc471` |
| 2 | `@wagmi/cli` ABI 생성, `lib/contracts.ts`, 헤더 활동력 | `8979762` |
| 2 | Tailwind 제거, CSS Modules + SCSS 전환 | `69b730e` |
| 3 | `lib/look.ts` + 테스트 36개 | `4914d00` |
| 3 | `art/flat-v1` 포팅 + 기준 SVG 비교 테스트 102개 | `8ea4d00` |
| 3 | `PetSprite`, `/dev/art` | `bc465d8` |
| 4 | `docs/contract-frontend.md` 작성 (밀린 숙제) | `59f5967` |
| 4-1 | `usePet` | `d533d39` |
| 4-2 | `usePetAction` | `876f689` |
| 4-3 | `lib/errors.ts` + 테스트 | `f376822` |
| 4-4 | `/pet/[id]`, `PetView`, `ArtSet.background` | `5fbd235` |
| 4-5 | `PetStats`, `useHungerTimer`, `lib/time.ts` | `43f5a58` |
| 4-6 | `PetActions` | `0181105` |
| 4-7 | 연출 1부 `lib/effects.ts` + 테스트 | `cee6f08` |
| 4-7 | 연출 2부 `usePetEffect`, XP 숫자, Motion 설치 | `712d965` |
| 4-7 | 연출 3부 레벨업 (튀기, 배지, 별) | `b470b62` |
| 4-7 | 연출 4부 진화/부화 `EvolveOverlay` (설명 전) | `70f38cd` |
| 4 | `lib/unlocks.ts` + 테스트 (설명 전) | `6f5d214` |
| 4-7 | 연출 5부 배고픔, 해금 적용, `PetCard` 분리 (설명 전) | `343509d` |
| 4 | 새로고침 대응 (설명 전) | `a722945` |
| 5 | 홈/입양, `useMyPets`, `readMany`, `publicClient` (설명 전) | `0f712f8` |
| 5 | 랭킹 (설명 전) | `bb039de` |
| 6 | 메타데이터 API JSON + PNG (설명 전) | `bd7bf43` |
| 6 | 더미 아트, `/dev/art` 막기, 랭킹 캐시 (설명 전) | `f57538a` |

## 수강생 기록 (수업 수준을 맞추기 위한 메모)

- 프론트엔드 개발자. Solidity와 Foundry는 이번이 처음이다. 지시서 내용은 모르는 상태에서 시작했다.
- 설명은 **실제 저장소 코드의 줄 번호를 짚으면서** 해야 한다. 지시서만 보고 설명하면 안 된다.
- TypeScript 비유(클래스, `readonly`, `super`, 미들웨어)가 잘 통한다.
- 확인 질문 결과:
  - Q. Energy의 `game`은 누구인가 → 정답 (PetNFT. `msg.sender`는 바로 직전 호출자)
  - Q. `immutable`을 빼면? → 절반 정답. "나중에 못 바꾸게"는 맞았고, 가스 차이(바이트코드에 박힘 vs storage 읽기)는 몰랐다.
  - Q. `onlyGame`을 지우면? → 정답 (아무나 무한 발행, 랭킹 붕괴)
  - Q. `&&`를 `||`로 바꾸면? → **오답.** `if (조건) revert`의 조건을 "통과 조건"으로 거꾸로 읽었다. 실제로는 mint, burn, transfer가 전부 막힌다. 테스트로 직접 확인시켰다 (5개 FAIL).
  - Q. FAIL 원인 → 결론은 맞았지만 터진 줄을 잘못 짚었다 (burn이 아니라 첫 줄 mint). 에러 이름과 가스로 위치를 읽는 법을 가르쳤다.
  - Q. `vm.prank` 한 줄을 지우면? → 정답 (테스트 컨트랙트가 game이라 burn이 성공해서 expectRevert가 실패)
  - 4강: 수강생이 확인 질문 대신 "답 설명하고 ㄱㄱ"를 택해서 1~5교시 질문은 답을 바로 설명했다. 대신 좋은 질문을 스스로 했다: "확정 대기 중 새로고침하면?" → 업계 방식(지갑에 맡김 / 해시 저장 후 이어서 기다리기 / 인덱서)까지 설명, 4강 끝나고 하기로 함. UX 변화를 구체적으로 묻는 편이라 "바뀌는 것 / 안 바뀌는 것" 표가 잘 통했다.
- 앞으로 주의할 점: 조건문을 읽을 때 **경우별 표를 그려 값을 대입하는 연습**을 계속 시킨다.
  수강생은 계산 문제를 건너뛰고 감으로 답하는 경향이 있다. 1강-4에서는 표를 수강생이 직접 채우게 하거나, 테스트를 먼저 예측시키고 실행해서 맞춰보게 한다.

## 개발 환경 (새 기기에서 처음부터)

필요한 것: git, Node.js 22 이상, MetaMask(브라우저 확장). 아래 순서대로 실행한다.

```bash
# ---------- 1. 저장소 받기 (submodule까지 같이) ----------
git clone --recurse-submodules https://github.com/WoodyLovesBoota/Mochimals.git
cd Mochimals
# 이미 clone했는데 contracts/lib가 비어 있으면:
git submodule update --init --recursive

# ---------- 2. 도구 설치 (한 번만) ----------
# Foundry (forge, anvil, cast)
curl -L https://foundry.paradigm.xyz | bash
# 설치 스크립트가 PATH를 안 넣어주는 경우가 있었다. 그러면 직접 추가:
echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
foundryup
# pnpm
npm install -g pnpm

# ---------- 3. 컨트랙트 확인 ----------
cd contracts
forge build
forge test                 # 33 passed
cd ..

# ---------- 4. 프론트 의존성 ----------
cd web
pnpm install
pnpm test                  # 176 passed
cd ..
```

```bash
# ---------- 5. 실행 (터미널 3개) ----------
# 터미널 1: 로컬 체인
anvil

# 터미널 2: 배포 (anvil을 켤 때마다 매번. anvil은 끄면 초기화된다)
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# 터미널 3: 프론트 (.env.local을 먼저 만든다. 아래 "env 옮기기")
cd web
pnpm dev                   # http://localhost:3000 , 아트 확인 http://localhost:3000/dev/art
```

자주 쓰는 명령:

| 명령 (위치) | 하는 일 |
| --- | --- |
| `forge test` (contracts) | 컨트랙트 테스트 |
| `pnpm wagmi` (web) | 컨트랙트를 고친 뒤 ABI(`src/generated.ts`) 다시 생성. forge 필요 |
| `pnpm test` (web) | look.ts, 아트 비교 테스트 |
| `pnpm lint`, `npx tsc --noEmit` (web) | 린트, 타입 검사 |
| `pnpm build` (web) | 배포용 빌드 확인 |

### env 옮기기

`web/.env.local`은 git에 올리지 않는다 (`.gitignore`). 새 기기에서는 파일을 직접 만든다.

**로컬 개발(anvil)용은 아래 내용을 그대로 붙이면 된다.** 새로 띄운 anvil에 0번 키로 처음 배포하면 주소가 항상 같기 때문이다 (배포 주소 = 배포자 주소 + nonce로 정해진다). 비밀값도 없다.

```bash
cat > web/.env.local <<'ENV'
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_WC_PROJECT_ID=
NEXT_PUBLIC_PET_NFT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_ENERGY_ADDRESS=0xa16E02E87b7454126E5E10d957A927A7F5B5d2be
NEXT_PUBLIC_DEPLOY_BLOCK=0
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYMASTER_URL=
ENV
```

- 배포 출력의 주소가 위와 다르면(배포 전에 anvil에서 다른 트랜잭션을 보낸 경우) 출력값으로 바꾼다.
- 7강부터 생기는 실제 값(`NEXT_PUBLIC_RPC_URL`의 Alchemy 키, `NEXT_PUBLIC_WC_PROJECT_ID`, `PAYMASTER_URL`)은 git, 채팅, 문서에 쓰지 않는다. 비밀번호 관리자(1Password 등)에 넣어 두고 새 기기에서 붙인다. 배포 서버(Vercel)에는 Vercel 환경 변수 설정에 넣는다.

### MetaMask (기기마다 한 번)

1. 네트워크 추가: RPC `http://127.0.0.1:8545`, 체인 ID `31337`, 통화 기호 `ETH`
2. 계정 가져오기: 위 배포 명령의 anvil 0번 테스트 키 (`0xac09…ff80`, 주소 `0xf39F…2266`). 공개된 테스트 키라 실제 자산을 넣으면 안 된다.
3. anvil을 재시작했으면 MetaMask 설정 → 고급 → "활동 탭 데이터 지우기" (nonce 오류 방지)

VSCode 확장: Solidity (Nomic Foundation), Better Comments. 저장소를 열면 추천 알림이 뜬다 (`.vscode/extensions.json`).
