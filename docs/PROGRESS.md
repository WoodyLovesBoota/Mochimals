# 강의 진도표

> 다음 세션을 시작할 때 Claude는 이 파일부터 읽고 "다음 할 일"에서 이어간다.
> 한 강이 끝날 때마다 이 파일을 갱신하고 같이 커밋한다.

마지막 갱신: 2026-11-24

## 현재 위치

**3강 (해석과 아트) 끝.** 2강: Next.js 16 앱, wagmi/RainbowKit 설정, 쿠키로 연결 상태 복원, ABI 생성(@wagmi/cli), 헤더 활동력 표시까지 끝났다. 수강생이 MetaMask로 anvil에 연결하는 것까지 확인했다. 스타일은 Tailwind를 걷어내고 CSS Modules + SCSS로 바꿨다. 3강: `lib/look.ts`(DNA 해석, 레벨) + 테스트, `art/flat-v1`(generate.py 포팅, 기준 SVG 102개 문자열 비교 테스트), `PetSprite`, 개발용 `/dev/art` 페이지. 다음은 4강(내 펫 화면)이다.

## 다음 할 일

1. **4강: 내 펫 화면** ([SPEC.md](SPEC.md) 13장 4번, 12장 화면/버튼 상태/연출). 읽기 훅(usePet), 행동 훅(usePetAction: 시뮬레이션 → 서명 → 확정 → 다시 읽기), 버튼 상태, `lib/errors.ts` 에러 문구, Motion 연출. EnergyBadge의 TODO(행동 후 잔액 갱신)도 여기서 처리한다.
   - 3강에서 정한 것: `ArtSet.render(look, { idPrefix })` 선택 인자 추가(SPEC 6장 인터페이스 + clipPath id 충돌 방지), vitest 사용(`pnpm test`), tsconfig target ES2020(bigint 리터럴). `/dev/art`는 7강 배포 전에 지우거나 막는다.
   - 수강생은 손계산 확인 질문을 원하지 않는다. 개념·설계 질문만 내고, 답을 바로 원하면 알려준다.
   - 지시서와 다르게 구현한 것 (버전 차이 때문, 동작은 같음): `cacheComponents` 끔(SPEC의 `revalidate`와 layout 쿠키 읽기 때문), wagmi 설정을 `chain.ts`/`wagmi.ts`(클라이언트, RainbowKit)/`wagmiServer.ts`(서버, 쿠키 복원용)로 나눔(`getDefaultConfig`가 클라이언트 전용), `coinbaseWallet` 대신 RainbowKit `base` 지갑(deprecated 대체), 체인을 `NEXT_PUBLIC_CHAIN_ID`로 선택(31337 anvil / 84532 / 8453), `serverExternalPackages: ["@coinbase/cdp-sdk"]`(x402 선택 의존성 빌드 에러).
   - **스타일: Tailwind를 쓰지 않는다** (수강생 결정, 2026-11-24, "유지보수가 너무 힘들다"). SPEC 1장의 Tailwind 대신 CSS Modules + SCSS. 규칙: 디자인 토큰은 `src/app/globals.scss`의 `:root` CSS 변수(`--color-ink` 등, SPEC 12장 UI 톤), 화면 폭 기준은 `src/styles/_breakpoints.scss` mixin(`@include bp.sm`), 컴포넌트 스타일은 컴포넌트 옆 `X.module.scss`. 컴포넌트에 색 코드를 직접 쓰지 않는다.
   - `web/.env.example`은 수강생 결정으로 지웠다 (SPEC 7-1은 커밋하라고 함). env 목록은 아래 "개발 환경"에 있다.
   - **4강 진행 중 (2026-11-24)**: `docs/contract-frontend.md` 작성, `hooks/usePet.ts`, `hooks/usePetAction.ts` 끝. 다음은 `lib/errors.ts` → 내 펫 화면 → 버튼 상태 → 연출.
   - **TODO 4강 끝나고 (수강생 결정)**: 확정 대기 중 새로고침 대응. ① RainbowKit `showRecentTransactions` + `useAddRecentTransaction` (헤더 스피너, 계정 모달 최근 트랜잭션, localStorage 유지. 표시만 해줌) ② 서명 직후 `{ hash, fn, petId }`를 sessionStorage에 저장하고 `usePetAction`이 페이지 로드 때 이어서 기다리기 (버튼 잠금, 두 번 누르기 방지, 레벨업 연출 복원). 배경: 새로고침해도 트랜잭션은 취소되지 않지만 `phase`/`hash`는 사라져서, 충전을 두 번 누르면 두 번째가 `StillHasEnergy`로 revert해 가스비만 날린다.
2. 이후 13장 순서: 5강 홈/입양·랭킹 → 6강 메타데이터 API → 7강 Base Sepolia 배포 → 8강(선택) 가스비 대납.

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
pnpm test                  # 138 passed (look.ts 36 + 아트 비교 102)
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

## 아직 안 만든 문서

- `docs/contract-frontend.md`: 컨트랙트 ↔ 프론트엔드 연결 설명. **CLAUDE.md 작업 방식 2번에 따라 2강부터 써야 했는데 아직 안 썼다.** 4강 시작 전에 지금까지의 실제 코드(chain.ts, wagmi.ts, wagmiServer.ts, contracts.ts, generated.ts, EnergyBadge의 balanceOf 읽기, 쿠키 복원) 기준으로 먼저 작성한다.
