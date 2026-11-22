# 강의 진도표

> 다음 세션을 시작할 때 Claude는 이 파일부터 읽고 "다음 할 일"에서 이어간다.
> 한 강이 끝날 때마다 이 파일을 갱신하고 같이 커밋한다.

마지막 갱신: 2026-11-22

## 현재 위치

**1강 (컨트랙트) 진행 중.** Energy.sol 수업과 Energy 단독 테스트까지 끝났다. 다음은 PetNFT.sol이다.

## 다음 할 일

1. **1강-3: PetNFT.sol 수업**
   - `contracts/src/PetNFT.sol`을 지시서([SPEC.md](SPEC.md) 4-2) 코드 그대로, 아주 자세한 주석을 달아 작성한다.
   - `forge build`로 컴파일을 확인한다. 에러가 나면 외부 인터페이스(함수, 이벤트, 에러 이름과 인자)는 유지한 채 고친다.
   - 한 번에 다 설명하지 말고 나눠서 수업한다. 예: ① 상수, struct, 상태 변수, 이벤트, 에러 ② adopt와 DNA ③ feed, train, refill과 `_spend`, `_gainXp` ④ levelOf, stageOf, isHungry ⑤ ERC-4906과 tokenURI
   - 각 부분마다 실제 줄 번호를 짚고 확인 질문을 1~2개 낸다.
2. **1강-4: PetNFT 테스트** (`contracts/test/PetNFT.t.sol`, SPEC 4-3의 항목 전부). `vm.warp`, `vm.expectEmit`, 이벤트 순서 검증을 새로 가르친다.
3. **1강-5: 배포 스크립트** (`contracts/script/Deploy.s.sol`, SPEC 4-4)와 anvil 로컬 배포 실습.
4. 그다음 2강(Next.js, wagmi)부터 [SPEC.md](SPEC.md) 13장 순서대로 진행한다.

## 끝낸 것

| 강 | 내용 | 커밋 |
| --- | --- | --- |
| 0 | 저장소 기본 설정, 아트 원본(`svg/`) 커밋 | `4ead41d` |
| 1-1 | Foundry 프로젝트, OpenZeppelin 5.4.0 설치, `Energy.sol` (주석 포함) | `c61c9f0` |
| - | `forge fmt` 포매터 설정, VSCode 저장 시 자동 정리 | `e235e40` |
| - | 주석 색, Better Comments 태그 (`! ? * TODO`) | `8a2f82e` |
| 1-2 | `test/Energy.t.sol` 테스트 7개 (전부 통과) | `ebc8051` |

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
forge test        # 현재 7 passed
```

VSCode 확장: Solidity (Nomic Foundation), Better Comments. 저장소를 열면 추천 알림이 뜬다 (`.vscode/extensions.json`).

## 아직 안 만든 문서

- `docs/contract-frontend.md`: 컨트랙트 ↔ 프론트엔드 연결 설명. 프론트 코드가 생기는 2강부터 실제 구현 코드를 기준으로 작성한다.
