# Silo Pets 구현 지시서

> 이 파일은 처음 받은 지시서 원문이다. 설계는 확정됐으므로 규칙, 수치, 컨트랙트 인터페이스는 바꾸지 않는다.
> 진행 상황은 [PROGRESS.md](PROGRESS.md), 작업 방식은 저장소 루트의 [CLAUDE.md](../CLAUDE.md)를 본다.
> 아트 zip(`silo-pets-art.zip`)의 내용은 저장소의 `svg/` 폴더에 풀려 있다.

이 문서 하나로 Silo Pets를 처음부터 끝까지 구현한다. 설계는 확정됐으므로 규칙, 수치, 컨트랙트 인터페이스는 바꾸지 않는다. 문서에 없는 세부 사항은 가장 단순한 쪽으로 정하고, 정한 내용을 README의 "결정 사항"에 한 줄씩 적는다.

같이 전달되는 파일: `silo-pets-art.zip` (펫 그림 생성 스크립트 `generate.py`, 앵커 `anchors.json`, 기준 이미지 SVG 100여 장).

## 0. 무엇을 만드는가

지갑을 연결해 무료로 펫 NFT를 입양하고, 활동력(ENERGY 토큰)을 써서 밥을 주고 훈련시켜 키우는 웹 게임이다. 펫이 성장하면 NFT 이미지와 속성이 실제로 바뀌고(다이내믹 NFT), 경험치 순으로 랭킹을 매긴다. 웹3 회사 지원용 포트폴리오이며, 보여주려는 것은 "프론트와 웹3의 연동을 제대로 안다"는 점이다.

완료 기준은 13장에 있다.

## 1. 스택과 버전

| 역할 | 선택 | 비고 |
| --- | --- | --- |
| 컨트랙트 | Solidity ^0.8.24, Foundry, OpenZeppelin Contracts 5.x | |
| 프레임워크 | Next.js (App Router), TypeScript strict | |
| 체인 클라이언트 | viem 2.x | |
| React 바인딩 | wagmi 2.x (2.16 이상) | 3.x 금지. RainbowKit 2.x가 wagmi ^2를 요구한다 |
| 지갑 UI | RainbowKit 2.x | |
| 서버 상태 | TanStack Query 5.x | |
| 애니메이션 | Motion (`motion/react`) | |
| 스타일 | Tailwind CSS | |
| 체인 | Base Sepolia (chainId 84532) | 메인넷 전환은 env만 바꾸면 되게 |
| ABI 생성 | `@wagmi/cli` + foundry 플러그인 | `as const` ABI를 `web/src/generated.ts`로 |

## 2. 저장소 구조

```
silo-pets/
├─ contracts/                 # Foundry 프로젝트
│  ├─ src/Energy.sol
│  ├─ src/PetNFT.sol
│  ├─ test/PetNFT.t.sol
│  └─ script/Deploy.s.sol
├─ web/                       # Next.js 앱
│  ├─ src/app/
│  │  ├─ layout.tsx, providers.tsx
│  │  ├─ page.tsx                      # 홈 / 입양
│  │  ├─ pet/[id]/page.tsx             # 내 펫 (남의 펫이면 읽기 전용)
│  │  ├─ ranking/page.tsx
│  │  └─ api/
│  │     ├─ pet/[id]/route.ts          # 메타데이터 JSON
│  │     ├─ pet/[id]/image.png/route.ts
│  │     └─ paymaster/route.ts         # 선택 (10장)
│  ├─ src/lib/
│  │  ├─ wagmi.ts, contracts.ts, publicClient.ts
│  │  ├─ look.ts                       # decodeDna, getPetLook, 레벨 계산 (순수 함수)
│  │  ├─ unlocks.ts                    # 레벨별 해금표
│  │  └─ errors.ts                     # 컨트랙트 에러 → 화면 문구
│  ├─ src/art/
│  │  ├─ types.ts                      # PetLook, ArtSet, ArtOutput
│  │  ├─ index.ts                      # ACTIVE_ART_SET
│  │  └─ flat-v1/                      # generate.py를 TS로 옮긴 아트 세트
│  ├─ src/hooks/                       # usePet, useMyPets, usePetAction, useRanking
│  └─ src/components/                  # PetSprite, PetCard, ActionButtons, RankingList ...
└─ README.md
```

## 3. 게임 규칙 (변경 금지)

| 행동 | 활동력 | 경험치 | 효과 |
| --- | --- | --- | --- |
| 입양 | 0 | - | 지갑당 1회 무료. 펫 1마리 + 활동력 10 지급 |
| 밥 주기 | 1 | +10 | 마지막 식사 시각 갱신 (배고픔 해제) |
| 훈련 | 3 | +40 (배고프면 +20) | |
| 충전 | 잔액 0일 때만 | - | 활동력 10 무료 지급 |

- 배고픔: 마지막 식사 후 24시간이 지나면 배고픔. 저장하지 않고 `lastFedAt`으로 계산한다.
- 레벨: 레벨 L 도달에 필요한 누적 XP = `10 × (L−1) × (L+3)`. 역산식 `L = floor(sqrt(xp/10 + 4)) − 1`, 최대 20.
- 단계: 알 Lv 1~2 (stage 0), 아기 3~6 (1), 어린이 7~11 (2), 어른 12~19 (3), 각성 20 (4).
- 활동력 토큰: decimals 0, 사용자 간 전송 불가, PetNFT만 발행·소각. approve 없이 행동 1번 = 트랜잭션 1번.
- 펫 NFT는 일반 ERC721이라 거래 가능. 행동 권한은 현재 `ownerOf` 기준.
- 랭킹: XP 내림차순, 동점이면 petId 오름차순. 펫 기준이며 현재 주인 주소를 함께 표시.

레벨표 (누적 XP): 1=0, 2=50, 3=120, 4=210, 5=320, 6=450, 7=600, 8=770, 9=960, 10=1170, 11=1400, 12=1650, 13=1920, 14=2210, 15=2520, 16=2850, 17=3200, 18=3570, 19=3960, 20=4370.

## 4. 컨트랙트 (이 코드를 그대로 쓴다)

### 4-1. `contracts/src/Energy.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Energy is ERC20 {
    address public immutable game; // 배포한 PetNFT 주소

    error OnlyGame();
    error NonTransferable();

    constructor() ERC20("Pet Energy", "ENERGY") {
        game = msg.sender;
    }

    modifier onlyGame() {
        if (msg.sender != game) revert OnlyGame();
        _;
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function mint(address to, uint256 amount) external onlyGame {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyGame {
        _burn(from, amount); // 잔액 부족이면 ERC20InsufficientBalance로 revert
    }

    // 발행(from=0)과 소각(to=0)만 허용, 사용자 간 전송은 막음
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) revert NonTransferable();
        super._update(from, to, value);
    }
}
```

### 4-2. `contracts/src/PetNFT.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Energy} from "./Energy.sol";

contract PetNFT is ERC721, IERC4906 {
    uint256 public constant MAX_ENERGY = 10;
    uint256 public constant FEED_COST = 1;
    uint256 public constant FEED_XP = 10;
    uint256 public constant TRAIN_COST = 3;
    uint256 public constant TRAIN_XP = 40;
    uint256 public constant HUNGRY_AFTER = 1 days;
    uint256 public constant MAX_LEVEL = 20;

    struct Pet {
        uint64 xp;
        uint64 lastFedAt;
        uint64 bornAt;
        uint32 dna; // 종, 색, 성격, 특징 (5장)
    }

    Energy public immutable energy;
    address public immutable admin; // 권한은 메타데이터 새로고침 하나뿐
    string private baseURI; // 예: "https://silo-pets.app/api/pet/"
    uint256 public totalSupply;
    mapping(uint256 => Pet) public pets;
    mapping(address => bool) public hasAdopted;

    event Adopted(address indexed owner, uint256 indexed petId, uint32 dna);
    event Fed(uint256 indexed petId, uint256 xp);
    event Trained(uint256 indexed petId, uint256 xpGained, uint256 xp);
    event LevelUp(uint256 indexed petId, uint256 level);
    event Refilled(address indexed player, uint256 amount);

    error AlreadyAdopted();
    error NotPetOwner();
    error StillHasEnergy();
    error NotAdmin();

    constructor(string memory baseURI_) ERC721("Silo Pet", "PET") {
        energy = new Energy(); // 발행 권한이 이 컨트랙트로 고정됨
        admin = msg.sender;
        baseURI = baseURI_;
    }

    // ---------- 쓰기 ----------

    function adopt() external returns (uint256 petId) {
        if (hasAdopted[msg.sender]) revert AlreadyAdopted();
        hasAdopted[msg.sender] = true;

        petId = ++totalSupply;
        uint32 dna = uint32(uint256(keccak256(abi.encode(msg.sender, petId, block.prevrandao))));
        pets[petId] = Pet(0, uint64(block.timestamp), uint64(block.timestamp), dna);

        _mint(msg.sender, petId);
        energy.mint(msg.sender, MAX_ENERGY);
        emit Adopted(msg.sender, petId, dna);
    }

    function feed(uint256 petId) external {
        _spend(petId, FEED_COST);
        Pet storage p = pets[petId];
        p.lastFedAt = uint64(block.timestamp);
        _gainXp(petId, FEED_XP);
        emit Fed(petId, p.xp);
    }

    function train(uint256 petId) external {
        _spend(petId, TRAIN_COST);
        uint256 gained = isHungry(petId) ? TRAIN_XP / 2 : TRAIN_XP;
        _gainXp(petId, gained);
        emit Trained(petId, gained, pets[petId].xp);
    }

    // 나중에 유료 충전, 쿨타임을 붙일 자리
    function refill() external {
        if (energy.balanceOf(msg.sender) != 0) revert StillHasEnergy();
        energy.mint(msg.sender, MAX_ENERGY);
        emit Refilled(msg.sender, MAX_ENERGY);
    }

    // 아트 세트를 바꾼 뒤 마켓에 전체 이미지 새로고침 요청 (ERC-4906)
    function refreshAllMetadata() external {
        if (msg.sender != admin) revert NotAdmin();
        emit BatchMetadataUpdate(0, type(uint256).max);
    }

    // ---------- 읽기 ----------

    // 레벨 L까지 필요한 누적 XP = 10 × (L-1) × (L+3)  →  L = sqrt(xp/10 + 4) - 1
    function levelOf(uint256 petId) public view returns (uint256) {
        uint256 lv = Math.sqrt(pets[petId].xp / 10 + 4) - 1;
        return lv > MAX_LEVEL ? MAX_LEVEL : lv;
    }

    function stageOf(uint256 petId) public view returns (uint8) {
        uint256 lv = levelOf(petId);
        if (lv < 3) return 0;  // 알 (1~2)
        if (lv < 7) return 1;  // 아기 (3~6)
        if (lv < 12) return 2; // 어린이 (7~11)
        if (lv < 20) return 3; // 어른 (12~19)
        return 4;              // 각성 (20)
    }

    function isHungry(uint256 petId) public view returns (bool) {
        return block.timestamp > pets[petId].lastFedAt + HUNGRY_AFTER;
    }

    // ---------- 내부 ----------

    function _spend(uint256 petId, uint256 cost) private {
        if (ownerOf(petId) != msg.sender) revert NotPetOwner(); // 없는 펫이면 여기서 revert
        energy.burn(msg.sender, cost);
    }

    function _gainXp(uint256 petId, uint256 amount) private {
        uint256 before = levelOf(petId);
        pets[petId].xp += uint64(amount);
        uint256 afterLv = levelOf(petId);
        if (afterLv > before) emit LevelUp(petId, afterLv);
        emit MetadataUpdate(petId); // 마켓에 메타데이터 새로고침 요청 (ERC-4906)
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI; // tokenURI(7) = ".../api/pet/7"
    }

    function supportsInterface(bytes4 id) public view override(ERC721, IERC165) returns (bool) {
        return id == bytes4(0x49064906) || super.supportsInterface(id);
    }
}
```

이 코드는 설계 단계에서 컴파일해보지 않았다. 컴파일 에러가 나면 동작과 외부 인터페이스(함수, 이벤트, 에러 이름과 인자)를 유지한 채 고친다.

### 4-3. 테스트 (`forge test`로 전부 통과해야 함)

- 입양: 펫 1마리 민팅, 활동력 10 지급, `Adopted` 이벤트, 같은 지갑 재입양은 `AlreadyAdopted`.
- 밥: 활동력 1 소각, XP +10, `lastFedAt` 갱신, 주인이 아니면 `NotPetOwner`.
- 훈련: 활동력 3 소각, XP +40. `vm.warp`로 24시간 뒤에는 +20. 밥을 주면 다시 +40.
- 활동력 부족: 잔액 2에서 훈련하면 `ERC20InsufficientBalance`.
- 충전: 잔액이 0이 아니면 `StillHasEnergy`, 0이면 10 지급.
- 전송 금지: `energy.transfer`는 `NonTransferable`. PetNFT가 아닌 주소의 `mint`/`burn`은 `OnlyGame`.
- 레벨: 3장 레벨표의 경계값마다 `levelOf` 확인 (예: XP 110 → 2, 120 → 3, 4370 → 20, 그 이상도 20). `stageOf` 경계(Lv 2/3, 6/7, 11/12, 19/20).
- 이벤트: 레벨이 오르는 훈련에서 `LevelUp`, `MetadataUpdate`, `Trained`가 이 순서로 나온다.
- 거래: 펫을 다른 주소로 `transferFrom`하면 새 주인만 행동할 수 있다.
- 관리자: `refreshAllMetadata`는 admin만, `BatchMetadataUpdate(0, max)` 발생.
- `supportsInterface(0x49064906)`와 ERC721 인터페이스가 true.

### 4-4. 배포

`script/Deploy.s.sol`은 `PetNFT`를 `baseURI = "<앱 주소>/api/pet/"`로 배포하고, PetNFT 주소, `petNft.energy()` 주소, 배포 블록 번호를 출력한다. 이 세 값이 프론트 env로 들어간다. 로컬 개발은 anvil에 배포해 쓴다.

## 5. DNA와 외형 해석 (`web/src/lib/look.ts`)

`uint32 dna` 하나에 네 가지가 들어 있다. 컨트랙트는 숫자만 저장하고 해석은 이 파일 한 곳에서만 한다. 화면과 메타데이터 API가 같은 함수를 쓴다.

| 비트 | 계산 | 항목 | 값 |
| --- | --- | --- | --- |
| 0~15 | `(dna & 0xFFFF) % 100` | 종 | 0~15 polar, 16~25 panda, 26~41 fennec, 42~57 sloth, 58~73 pig, 74~89 frog, 90~99 whale |
| 16~23 | `(((dna >>> 16) & 0xFF) * 100) >> 8` | 색 | 0~79 base, 80~97 alt, 98~99 shiny |
| 24~27 | `(dna >>> 24) & 0x3` | 성격 | 0 활발, 1 느긋, 2 먹보, 3 수줍음 |
| 28~31 | `(dna >>> 28) & 0x3` | 표식 | 0 none, 1 freckles, 2 star, 3 heart |

주의: JS에서는 부호 없는 시프트 `>>>`를 쓴다. `>>`는 dna가 2^31 이상일 때 음수가 된다. 색은 `% 100`을 쓰지 않는다 (8비트라 치우침이 생겨 반짝이 확률이 틀어진다).

```ts
export type Species = 'polar' | 'panda' | 'fennec' | 'sloth' | 'pig' | 'frog' | 'whale'
export type Emotion = 'idle' | 'happy' | 'hungry' | 'sleepy' | 'excited'
export type Color = 'base' | 'alt' | 'shiny'
export type Mark = 'none' | 'freckles' | 'star' | 'heart'
export type Personality = 'active' | 'calm' | 'foodie' | 'shy'
export type ItemId = 'fish' | 'bamboo' | 'cactus' | 'mug' | 'wand' | 'apple' | 'lotus'

export type PetLook = {
  species: Species; stage: 0 | 1 | 2 | 3 | 4; emotion: Emotion
  color: Color; mark: Mark; personality: Personality; item: ItemId | null
}

export function decodeDna(dna: number): { species: Species; color: Color; personality: Personality; mark: Mark }
export function getPetLook(input: { dna: number; stage: number; emotion: Emotion }): PetLook
export function xpForLevel(level: number): number          // 10 * (L-1) * (L+3)
export function levelProgress(xp: bigint): { level: number; current: number; needed: number } // XP 바용
```

- `item`: stage가 3 이상일 때만 종 고정 아이템. polar=fish, panda=bamboo, fennec=cactus, sloth=mug, whale=wand, pig=apple, frog=lotus. 그 외는 null.
- 종 한글 이름: 북극곰, 판다, 사막여우, 나무늘보, 고래상어, 돼지, 개구리. 확률은 판다와 고래상어 10%(희귀), 나머지 16%.
- 화면은 부화(Lv 3) 전까지 종을 보여주지 않는다. 알 무늬 색으로만 힌트를 준다.
- 이 파일은 단위 테스트를 둔다 (경계값: 종 15/16, 색 79/80/97/98에 해당하는 dna, dna = 0xFFFFFFFF).

표정 우선순위 (위에서부터 먼저 맞는 것):

| 표정 | 조건 | 출처 |
| --- | --- | --- |
| excited | 레벨업 직후 3초 | 내 트랜잭션 영수증의 `LevelUp` |
| happy | 밥 먹은 직후 10초 | 영수증의 `Fed` |
| hungry | `isHungry` true | 컨트랙트 |
| sleepy | 활동력 0 | `Energy.balanceOf` |
| idle | 그 외 | |

stage 4(각성)는 idle 대신 happy가 기본이다. 메타데이터 이미지는 hungry와 idle만 쓴다.

성격은 능력치가 아닌 꾸미기다. 모션과 말풍선만 달라진다.

| 성격 | 기본 모션 | 말풍선 예 |
| --- | --- | --- |
| 활발 | 자주 통통 뜀 | "놀자! 훈련하자!" |
| 느긋 | 천천히 숨쉬고 자주 하품 | "천천히 해도 돼…" |
| 먹보 | 밥 먹을 때 기쁨 연출이 두 배 | "밥… 밥 줄 시간 아니에요?" |
| 수줍음 | 눌러보면 볼이 빨개짐 | "……고마워" |

## 6. 아트 (교체 가능한 구조로 만든다)

그림은 나중에 통째로 바뀔 수 있다 (3D 검토 중). 그래서 화면 코드와 컨트랙트가 그림을 모르게 세 겹으로 나눈다. 이 분리가 이 프로젝트의 필수 요구사항이다.

| 겹 | 하는 일 | 그림을 바꿀 때 |
| --- | --- | --- |
| 체인 | `dna`, `xp`, `lastFedAt`만 저장 | 그대로 |
| 해석 `getPetLook()` | 숫자를 `PetLook`으로 | 그대로 |
| 아트 세트 `artSet.render()` | `PetLook`을 그림으로 | 이 겹만 교체 |

```ts
// web/src/art/types.ts
export type LayerName = 'fx_back' | 'ears' | 'sprout' | 'body' | 'pattern' | 'feet' | 'face' | 'mark' | 'item' | 'arms' | 'fx_front'
export type ArtOutput =
  | { kind: 'layers'; layers: { name: LayerName; svg: string }[] } // 뒤에서 앞 순서
  | { kind: 'image'; src: string }
export interface ArtSet { id: string; version: number; render(look: PetLook): ArtOutput }

// web/src/art/index.ts
export const ACTIVE_ART_SET: ArtSet = flatV1 // 이 한 줄만 바꾸면 전체 교체
```

- `<PetSprite look={look} size={n} />`와 이미지 API 라우트는 `ACTIVE_ART_SET.render()`만 부른다. 컴포넌트 어디에도 종별 분기나 SVG 좌표를 직접 쓰지 않는다.
- `kind: 'layers'`면 레이어들을 하나의 `<svg viewBox="0 0 400 400">` 안에 순서대로 겹친다. `kind: 'image'`면 `<img>`로 그린다. 둘 다 지원한다.

### 6-1. `flat-v1` 아트 세트

`silo-pets-art.zip`의 `generate.py`가 원본이다. 이 파일의 `layers(species, stage, emotion, color, mark)` 함수와 그 아래 `L_*` 함수들, `SPECIES` 팔레트, `item_svg`, `STAGE_SCALE`을 TypeScript로 그대로 옮겨 `web/src/art/flat-v1/`에 둔다. 좌표와 색 값은 바꾸지 않는다.

- 검증: zip의 기준 SVG(`<종>-stage0..4.svg`, `<종>-<표정>.svg`, `<종>-color-*.svg`, `fennec-mark-*.svg`)와 TS 출력이 눈으로 봐서 같아야 한다. `python3 generate.py`로 기준 이미지를 다시 만들 수 있다.
- `clipPath` id는 한 페이지에 펫이 여러 마리 있어도 겹치지 않게 인스턴스마다 고유하게 만든다 (랭킹 화면).
- 스타일 규칙: 외곽선 없음, 면 두 톤(기본색 + 그림자 한 톤), 그라데이션 없음. 머리와 몸은 모든 단계에서 한 덩어리.
- 레이어 순서 (뒤에서 앞): fx_back, ears, sprout, body, pattern, feet, face, mark, item, arms, fx_front. generate.py의 `LAYER_ORDER` 상수가 아니라 `layers()` 함수가 실제로 돌려주는 이 순서를 따른다. 팔이 아이템 위에 있어야 손에 쥔 것처럼 보인다.

### 6-2. 앵커 (모든 아트 세트가 지키는 좌표 약속)

| 앵커 | 값 |
| --- | --- |
| 캔버스 | 400 × 400, 바닥선 y = 352, 중심 x = 200 |
| 새싹 뿌리 | (200, 92) |
| 얼굴 중심 | (200, 210) |
| 오른손 그립 | (344, 246) |
| 말풍선 꼬리 | (330, 96) |
| 단계별 크기 | 아기 0.78, 어린이 0.86, 어른과 각성 0.95 (바닥선 중심 기준 확대) |

말풍선, 레벨업 이펙트 같은 UI 요소는 이 앵커 기준으로 배치한다.

### 6-3. 성장 단계 외형

| 단계 | 몸 | 새싹 | 바뀌는 것 |
| --- | --- | --- | --- |
| 알 | 알 하나 | 봉오리 | 종을 암시하는 무늬, 가끔 흔들림 |
| 아기 | 모찌 78% | 한 잎 | 부화, 짧은 팔다리, 표정 시작 |
| 어린이 | 모찌 86% | 두 잎 | 한 손 흔들기 |
| 어른 | 모찌 95% | 세 잎 | 오른손에 종 시그니처 아이템, 젤리 발바닥 |
| 각성 | 어른과 같음 | 꽃 | 왼팔 번쩍, 뒤에 빛 원과 반짝이, 기본 표정 기쁨 |

## 7. 프론트 설정

### 7-1. 환경 변수 (`web/.env.local`)

```
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=            # Alchemy 등 Base Sepolia RPC
NEXT_PUBLIC_WC_PROJECT_ID=      # WalletConnect(Reown) 프로젝트 ID
NEXT_PUBLIC_PET_NFT_ADDRESS=
NEXT_PUBLIC_ENERGY_ADDRESS=     # petNft.energy()
NEXT_PUBLIC_DEPLOY_BLOCK=       # getLogs 시작 블록
NEXT_PUBLIC_APP_URL=            # 메타데이터 이미지 URL에 사용
PAYMASTER_URL=                  # 선택, 서버 전용 (10장)
```

`.env.example`을 커밋하고 실제 값은 커밋하지 않는다.

### 7-2. `lib/wagmi.ts`, `lib/contracts.ts`

```ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { coinbaseWallet, metaMaskWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { cookieStorage, createStorage, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

coinbaseWallet.preference = 'smartWalletOnly' // 확장 프로그램 없이 패스키로 지갑 생성

export const config = getDefaultConfig({
  appName: 'Silo Pets',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: [baseSepolia],
  wallets: [{ groupName: '추천', wallets: [coinbaseWallet, metaMaskWallet, rainbowWallet, walletConnectWallet] }],
  transports: { [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL) },
  pollingInterval: 1_000,
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
})

// Energy의 커스텀 에러(ERC20InsufficientBalance)는 PetNFT 호출 안에서 터지므로 ABI를 합쳐야 해석된다
export const petNft = { address: PET_NFT_ADDRESS, abi: [...petNftAbi, ...energyAbi.filter((x) => x.type === 'error')] } as const
export const energy = { address: ENERGY_ADDRESS, abi: energyAbi } as const
```

- `app/providers.tsx`(클라이언트 컴포넌트): `WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider`. `layout.tsx`가 쿠키를 읽어 `cookieToInitialState(config, cookie)`로 초기 상태를 넘겨, 새로고침 시 연결 상태 깜빡임이 없게 한다.
- 헤더: `<ConnectButton />`과 활동력 표시.
- 서버용 `publicClient`(`lib/publicClient.ts`)는 같은 RPC로 `createPublicClient`.
- 설치된 라이브러리 버전에서 API 이름이 다르면 (예: `useSendCalls`의 import 경로) 해당 버전 문서를 따르고 동작은 유지한다.

## 8. 읽기

```ts
export function usePet(petId: bigint, owner?: Address) {
  return useReadContracts({
    contracts: [
      { ...petNft, functionName: 'pets', args: [petId] },     // [xp, lastFedAt, bornAt, dna]
      { ...petNft, functionName: 'levelOf', args: [petId] },
      { ...petNft, functionName: 'stageOf', args: [petId] },
      { ...petNft, functionName: 'isHungry', args: [petId] },
      { ...petNft, functionName: 'ownerOf', args: [petId] },
      { ...energy, functionName: 'balanceOf', args: [owner ?? zeroAddress] },
    ],
    allowFailure: false,
    query: { staleTime: 10_000 },
  })
}
```

- 값 여러 개는 항상 multicall 하나로 읽는다 (같은 블록 기준이라 XP와 레벨이 어긋나지 않는다).
- `uint64`/`uint256`은 bigint로 온다. 화면 표시 직전에만 `Number()`로 바꾼다. 활동력은 decimals 0이라 `formatUnits`가 필요 없다.
- 블록마다 다시 읽는 `watch`는 쓰지 않는다. 다시 읽는 때: 행동 확정 후 무효화, 창 포커스, 그리고 `lastFedAt + 24시간` 시각에 맞춘 타이머 1회 (배고픔 전환).
- 배고픔 판정은 컨트랙트의 `isHungry`를 따르고, "배고파지기까지 3시간" 표시만 `lastFedAt`으로 계산한다.
- 주소 비교는 `isAddressEqual`.

내 펫 찾기 (`useMyPets`): 펫은 거래되므로 한 지갑이 0마리 또는 여러 마리일 수 있다. 처음부터 목록으로 다룬다.

```ts
const logs = await publicClient.getLogs({
  address: petNft.address,
  event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
  args: { to: me },
  fromBlock: DEPLOY_BLOCK,
})
const ids = [...new Set(logs.map((l) => l.args.tokenId!))]
const owners = await publicClient.multicall({
  contracts: ids.map((id) => ({ ...petNft, functionName: 'ownerOf', args: [id] })),
  allowFailure: false,
})
const myPets = ids.filter((_, i) => isAddressEqual(owners[i], me))
```

RPC가 `getLogs` 블록 범위를 제한하면 범위를 나눠 조회한다. 입양 직후에는 영수증의 `Adopted` 이벤트에서 petId를 바로 얻는다.

## 9. 쓰기 (모든 행동이 같은 흐름)

```ts
export function usePetAction() {
  const config = useConfig()
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()

  return useMutation({
    mutationFn: async (args: { fn: 'feed' | 'train'; petId: bigint } | { fn: 'refill' } | { fn: 'adopt' }) => {
      // 1. 서명 전에 실행해보기. 실패하면 커스텀 에러로 throw
      const { request } = await simulateContract(config, {
        ...petNft,
        functionName: args.fn,
        args: 'petId' in args ? [args.petId] : [],
      })
      // 2. 지갑 서명 요청. 돌아오는 것은 해시
      const hash = await writeContractAsync(request)
      // 3. 확정 대기
      const receipt = await waitForTransactionReceipt(config, { hash })
      // 블록에 들어가도 실패일 수 있고 viem은 이때 throw하지 않는다
      if (receipt.status === 'reverted') throw new Error('TX_REVERTED')
      // 4. 우리 컨트랙트 로그만 해석
      return parseEventLogs({
        abi: petNft.abi,
        logs: receipt.logs.filter((l) => isAddressEqual(l.address, petNft.address)),
      })
    },
    onSuccess: (events) => {
      // LevelUp이 있으면 연출, 단계가 바뀌었으면 진화 연출
      queryClient.invalidateQueries()
    },
  })
}
```

버튼 상태는 단계별로 드러낸다: 확인 중(시뮬레이션) → "지갑에서 확인"(서명 대기) → "처리 중"(확정 대기, 해시가 있으므로 오래 걸리면 Basescan 링크 표시) → 연출. 대기 중에는 모든 행동 버튼을 막는다.

에러는 `BaseError.walk`로 커스텀 에러 이름을 꺼내 문구로 바꾼다 (`lib/errors.ts`).

| 에러 | 화면 문구 |
| --- | --- |
| `ERC20InsufficientBalance` | 활동력이 부족해요. 충전하고 다시 해보세요 |
| `StillHasEnergy` | 활동력을 다 쓴 뒤에 충전할 수 있어요 |
| `AlreadyAdopted` | 이미 입양한 지갑이에요 |
| `NotPetOwner` | 이 펫의 주인만 돌볼 수 있어요 |
| `UserRejectedRequestError` | (문구 없이 버튼만 되돌림) |
| `TX_REVERTED`, 그 외 | 처리하지 못했어요. 다시 시도해주세요 |

연결된 체인이 Base Sepolia가 아니면 행동 버튼을 막고 `useSwitchChain` 전환 버튼을 보여준다.

## 10. 가스비 대납 (선택, 마지막에 구현)

Coinbase Smart Wallet으로 연결했고 `useCapabilities()`가 해당 체인의 `paymasterService.supported`를 true로 주면 EIP-5792 경로를 쓴다. 아니면 9장의 일반 경로 그대로다.

```ts
const { id } = await sendCallsAsync({
  calls: [{ ...petNft, functionName: 'train', args: [petId] }],
  capabilities: { paymasterService: { url: `${location.origin}/api/paymaster` } },
})
const { receipts } = await waitForCallsStatus(config, { id })
const logs = receipts?.flatMap((r) => r.logs) ?? []
// 이후는 9장과 같다: PetNFT 주소로 걸러 parseEventLogs → 연출 → 무효화
```

`/api/paymaster`는 `PAYMASTER_URL`로 요청을 전달하되, 호출 대상이 PetNFT의 `adopt`/`feed`/`train`/`refill`일 때만 통과시킨다. `PAYMASTER_URL`이 없으면 이 기능 전체를 꺼둔다 (앱은 정상 동작해야 한다).

## 11. 메타데이터 API

`tokenURI(7)` = `<APP_URL>/api/pet/7`.

```ts
// app/api/pet/[id]/route.ts
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = BigInt((await params).id)
  const [pet, level, stage, hungry] = await publicClient.multicall({
    contracts: [
      { ...petNft, functionName: 'pets', args: [id] },
      { ...petNft, functionName: 'levelOf', args: [id] },
      { ...petNft, functionName: 'stageOf', args: [id] },
      { ...petNft, functionName: 'isHungry', args: [id] },
    ],
    allowFailure: false,
  })
  const look = getPetLook({ dna: pet[3], stage, emotion: hungry ? 'hungry' : 'idle' })
  const v = ACTIVE_ART_SET.version
  return Response.json({
    name: `Mochi #${id}`,
    description: 'Silo Pets에서 키우는 모치',
    image: `${APP_URL}/api/pet/${id}/image.png?v=${v}`,
    attributes: [
      { trait_type: 'Level', value: Number(level), display_type: 'number' },
      { trait_type: 'Stage', value: STAGES[stage] },      // Egg, Baby, Kid, Adult, Awakened
      { trait_type: 'XP', value: Number(pet[0]) },
      { trait_type: 'Species', value: stage === 0 ? 'Unknown' : look.species }, // 부화 전에는 숨김
      { trait_type: 'Color', value: look.color },
      { trait_type: 'Personality', value: look.personality },
      { trait_type: 'Mark', value: look.mark },
      { trait_type: 'Hungry', value: hungry ? 'Yes' : 'No' },
    ],
  }, { headers: { 'Cache-Control': 's-maxage=60' } })
}
```

- 없는 펫 ID면 404.
- `image.png/route.ts`는 같은 `look`으로 `ACTIVE_ART_SET.render()`를 불러 SVG를 조립하고 PNG(800×800)로 변환해 돌려준다 (`@resvg/resvg-js` 또는 `sharp`). 게임 화면과 NFT 이미지가 같은 코드에서 나와야 한다.
- 아트를 교체할 때: 새 아트 세트 추가 → `ACTIVE_ART_SET` 변경(version 증가로 이미지 URL이 바뀜) → admin이 `refreshAllMetadata()` 호출.

## 12. 화면

화면은 세 개이고 모두 헤더에 `ConnectButton`과 활동력 표시가 있다. UI 문구는 한국어.

| 화면 | 경로 | 보이는 것 | 주요 동작 |
| --- | --- | --- | --- |
| 홈 / 입양 | `/` | 미연결: 게임 소개, 진화 단계 미리보기, "지갑 연결". 연결됨 + 펫 없음: 흔들리는 알과 "입양하기". 펫 있음: 내 펫으로 이동 | 입양 후 내 펫 화면으로 |
| 내 펫 | `/pet/[id]` | 펫, 이름(`Mochi #id`), 레벨 배지, 종·성격·색 칩, XP 바, 활동력 10칸, 배고픔까지 남은 시간, 해금 목록 | 밥 주기, 훈련, 충전, 연출. 주인이 아니면 버튼 없이 읽기 전용 |
| 랭킹 | `/ranking` | 순위, 48px 펫 썸네일, 이름, 종, 줄인 주소, 레벨. 내 펫 행 강조와 고정 표시. 실시간 진화 피드 | 행 클릭 시 해당 펫 화면 |

내 펫 화면 버튼 상태:

| 상태 | 밥 주기 | 훈련 | 충전 |
| --- | --- | --- | --- |
| 활동력 3 이상 | 활성 | 활성 (배고프면 "XP 절반" 표시) | 숨김 |
| 활동력 1~2 | 활성 | 비활성 ("활동력 3 필요") | 숨김 |
| 활동력 0 | 비활성 | 비활성 | 강조 ("무료 충전 +10") |
| 지갑 서명 대기 | 누른 버튼만 "지갑에서 확인", 나머지 비활성 | | |
| 확정 대기 | 누른 버튼만 스피너와 "처리 중", 나머지 비활성 | | |
| 잘못된 네트워크 | 전부 비활성, "Base Sepolia로 전환" 버튼 | | |

버튼 보조 문구: 밥 주기 "활동력 1 · +10", 훈련 "활동력 3 · +40" (배고프면 "+20 (배고픔)").

연출 (Motion으로, `prefers-reduced-motion`이면 페이드만):

| 상황 | 감지 | 연출 | 길이 |
| --- | --- | --- | --- |
| XP 획득 | `Fed` / `Trained` | 펫 위로 +10 / +40 숫자, XP 바가 차오름 | 0.6초 |
| 레벨업 | `LevelUp`, 단계 그대로 | 펫이 통통 튀고 별 파티클, "Lv 5!" 배지, 새 해금 카드 | 1.5초 |
| 진화 | `LevelUp` 후 단계 바뀜 | 화면이 어두워지고 펫이 흰 실루엣으로 빛나며 커진 뒤 새 모습과 단계 이름 공개 | 3초, 건너뛰기 가능 |
| 부화 | Lv 3 도달 (진화의 특수한 경우) | 알이 깨지며 종 공개 | 3초 |
| 배고픔 | `isHungry` | 펫이 축 처지고 "배고파요…" 말풍선 | 상시 |
| 활동력 0 | 잔액 0 | 졸린 표정, 충전 버튼 강조 | 상시 |

랭킹 데이터: 서버 컴포넌트에서 `totalSupply`를 읽고 1번부터 끝까지 `pets(i)`, `ownerOf(i)`를 multicall(200개씩 나눠)로 읽어 정렬한다. `revalidate = 30`. 클라이언트는 `useWatchContractEvent`로 `LevelUp`을 구독해 "0x12…ab의 모치가 Lv 12로 진화!" 피드를 띄우고 `router.refresh()`로 목록을 갱신한다.

레벨별 해금 (`lib/unlocks.ts`, 컨트랙트에 없음. 레벨만 보고 정하며, 액세서리와 배경은 해금된 것 중 최신 것을 자동 적용):

| Lv | 해금 | Lv | 해금 |
| --- | --- | --- | --- |
| 1 | 입양, 기본 배경 | 11 | 액세서리: 모자 |
| 2 | 알에 금이 감 | 12 | 진화(어른), 종 시그니처 아이템 |
| 3 | 부화(종 공개), 표정 시작 | 13 | 칭호 "숙련 집사" |
| 4 | 칭호 "새싹 집사" | 14 | 배경: 밤하늘 |
| 5 | 액세서리: 리본 | 15 | 액세서리: 망토 |
| 6 | 배경: 들판 | 16 | 특수 모션: 춤 |
| 7 | 진화(어린이) | 17 | 배경: 수정 동굴 |
| 8 | 액세서리: 스카프 | 18 | 칭호 "베테랑 집사" |
| 9 | 칭호 "든든한 집사" | 19 | 액세서리: 별 왕관 |
| 10 | 배경: 노을 언덕, 랭킹 은색 테두리 | 20 | 각성, 칭호 "전설의 집사", 랭킹 금색 테두리 |

이번 범위에서 배경은 CSS 그라데이션으로, 칭호와 테두리는 텍스트와 스타일로 구현한다. 액세서리 그림(리본, 스카프, 모자, 망토, 별 왕관)은 아트에 없으므로 해금 목록에 이름만 보여주고 펫에 그리지는 않는다.

UI 톤: 흰 배경, 둥근 카드(radius 24~28px), 본문색 `#22252F`, 보조 `#6B7080`, 활동력 칸 `#FFC93C`, XP 바 초록 `#3FAF5E`, 주 버튼 `#22252F`, 밥 버튼 `#FFF0E0`/`#B85C00`. 펫 카드 무대 배경은 종별 `bg` 색(generate.py의 `SPECIES[*].bg`).

## 13. 구현 순서와 완료 기준

1. **컨트랙트**: 4장 코드, 테스트, 배포 스크립트. `forge test` 전부 통과.
2. **기반**: Next.js 앱, wagmi 설정, ABI 생성, anvil 배포 주소로 지갑 연결까지.
3. **해석과 아트**: `look.ts`(단위 테스트 포함), `flat-v1` 포팅, `PetSprite`. 기준 SVG와 비교 확인.
4. **내 펫 화면**: 읽기 훅, 행동 훅, 버튼 상태, 에러 문구, 연출.
5. **홈 / 입양**과 **랭킹**.
6. **메타데이터 API**와 PNG 라우트.
7. **Base Sepolia 배포**와 env 정리, README.
8. (선택) 가스비 대납.

완료 기준:

- 새 지갑으로 연결 → 입양 → 밥 → 훈련 → 활동력 0 → 충전 → 레벨업 연출까지 끊김 없이 된다.
- 활동력 부족, 주인 아님, 지갑 취소, 잘못된 네트워크에서 표의 문구와 상태가 나온다. 시뮬레이션에서 실패하는 행동은 지갑 창이 뜨지 않는다.
- 새로고침해도 연결과 내 펫이 유지된다. 다른 주소에서 전송받은 펫도 내 펫으로 보인다.
- `/api/pet/<id>`가 올바른 JSON을 주고 이미지가 화면의 펫과 같다. 레벨이 단계 경계를 넘으면 이미지가 바뀐다.
- 랭킹이 XP 순으로 나오고 다른 지갑의 레벨업이 피드에 뜬다.
- `ACTIVE_ART_SET`을 더미 아트 세트(`kind: 'image'`)로 바꿔도 다른 파일 수정 없이 앱이 동작한다. 이를 확인하는 더미 세트를 `art/dummy/`에 하나 둔다.
- `forge test`, `tsc --noEmit`, lint, `look.ts` 단위 테스트 통과.
- README: 실행 방법(anvil 로컬, Base Sepolia), env 설명, 아키텍처 요약(읽기는 RPC로 바로, 쓰기는 지갑을 거침), 결정 사항.

## 14. 하지 않는 것

- 유료 충전, 충전 쿨타임, 펫 이름 짓기, 액세서리 직접 고르기, 아이템 장착(`equip`), Chainlink VRF, 인덱서(Ponder), 완전 온체인 SVG, 서버 로그인(SIWE), 자체 백엔드 DB.
- 컨트랙트에 랭킹 배열이나 레벨, 단계, 배고픔 저장을 추가하지 않는다 (전부 계산).
- 업그레이드 가능한 프록시를 쓰지 않는다.
- 개인키, API 키를 저장소에 커밋하지 않는다.
