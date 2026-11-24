# 강의 진도표

> 다음 세션을 시작할 때 Claude는 이 파일부터 읽고 "다음 할 일"에서 이어간다.
> 한 강이 끝날 때마다 이 파일을 갱신하고 같이 커밋한다.

마지막 갱신: 2026-11-24

## 현재 위치

**2강 (기반) 진행 중.** Next.js 16 앱, wagmi/RainbowKit 설정, 쿠키로 연결 상태 복원, ABI 생성(@wagmi/cli), 헤더 활동력 표시까지 끝났다. 수강생이 MetaMask로 anvil에 연결하는 것까지 확인했다. 스타일은 Tailwind를 걷어내고 CSS Modules + SCSS로 바꿨다. 다음은 3강이다.

## 다음 할 일

1. **3강: 해석과 아트** ([SPEC.md](SPEC.md) 13장 3번). `look.ts`(단위 테스트 포함), `flat-v1` 포팅, `PetSprite`.
   - 지시서와 다르게 구현한 것 (버전 차이 때문, 동작은 같음): `cacheComponents` 끔(SPEC의 `revalidate`와 layout 쿠키 읽기 때문), wagmi 설정을 `chain.ts`/`wagmi.ts`(클라이언트, RainbowKit)/`wagmiServer.ts`(서버, 쿠키 복원용)로 나눔(`getDefaultConfig`가 클라이언트 전용), `coinbaseWallet` 대신 RainbowKit `base` 지갑(deprecated 대체), 체인을 `NEXT_PUBLIC_CHAIN_ID`로 선택(31337 anvil / 84532 / 8453), `serverExternalPackages: ["@coinbase/cdp-sdk"]`(x402 선택 의존성 빌드 에러).
   - **스타일: Tailwind를 쓰지 않는다** (수강생 결정, 2026-11-24, "유지보수가 너무 힘들다"). SPEC 1장의 Tailwind 대신 CSS Modules + SCSS. 규칙: 디자인 토큰은 `src/app/globals.scss`의 `:root` CSS 변수(`--color-ink` 등, SPEC 12장 UI 톤), 화면 폭 기준은 `src/styles/_breakpoints.scss` mixin(`@include bp.sm`), 컴포넌트 스타일은 컴포넌트 옆 `X.module.scss`. 컴포넌트에 색 코드를 직접 쓰지 않는다.
   - `web/.env.example`은 수강생 결정으로 지웠다 (SPEC 7-1은 커밋하라고 함). env 목록은 아래 "개발 환경"에 있다.
2. 이후 13장 순서: 4강 내 펫 화면 → 5강 홈/입양·랭킹 → 6강 메타데이터 API → 7강 Base Sepolia 배포 → 8강(선택) 가스비 대납.

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

## 개발 환경 (기기를 바꿨을 때)

```bash
# 1. 저장소 받기 (submodule까지 같이)
git clone --recurse-submodules https://github.com/WoodyLovesBoota/Mochimals.git
cd Mochimals
# 이미 clone했는데 contracts/lib가 비어 있으면:
git submodule update --init --recursive

# 2. Foundry 설치 (수강생이 직접 설치한다)
curl -L https://foundry.paradigm.xyz | bash
# 설치 스크립트가 PATH를 안 넣어주는 경우가 있었다. 그러면 직접 추가:
echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
foundryup

# 3. 확인
cd contracts
forge build
forge test        # 현재 33 passed
```

```bash
# 4. 프론트 (web)
cd web
pnpm install
# web/.env.local을 직접 만든다 (커밋하지 않음). 필요한 값:
#   NEXT_PUBLIC_CHAIN_ID=31337            # 31337 anvil, 84532 Base Sepolia, 8453 Base
#   NEXT_PUBLIC_RPC_URL=                  # 비우면 체인 내장 RPC (anvil = 127.0.0.1:8545)
#   NEXT_PUBLIC_WC_PROJECT_ID=            # 비우면 RainbowKit 개발용 예제 ID
#   NEXT_PUBLIC_PET_NFT_ADDRESS=          # Deploy.s.sol 출력값
#   NEXT_PUBLIC_ENERGY_ADDRESS=           # Deploy.s.sol 출력값
#   NEXT_PUBLIC_DEPLOY_BLOCK=             # Deploy.s.sol 출력값
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
#   PAYMASTER_URL=                        # 선택, 서버 전용
pnpm wagmi        # 컨트랙트를 고쳤을 때 ABI 다시 생성 (forge 필요)
pnpm dev
```

로컬 지갑: anvil을 띄우고 MetaMask에 네트워크(RPC `http://127.0.0.1:8545`, 체인 ID 31337)를 추가한 뒤, anvil 0번 테스트 키를 가져온다. anvil을 재시작하면 체인이 초기화되므로 다시 배포하고, MetaMask에서 "활동 탭 데이터 지우기"를 한다.

VSCode 확장: Solidity (Nomic Foundation), Better Comments. 저장소를 열면 추천 알림이 뜬다 (`.vscode/extensions.json`).

## 아직 안 만든 문서

- `docs/contract-frontend.md`: 컨트랙트 ↔ 프론트엔드 연결 설명. 프론트 코드가 생기는 2강부터 실제 구현 코드를 기준으로 작성한다.
