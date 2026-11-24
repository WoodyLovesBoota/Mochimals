// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ERC721 = NFT 표준. "토큰 하나하나가 고유한 번호(tokenId)를 가지고, 주인이 한 명"인 토큰이다.
// ownerOf(id), transferFrom, approve 같은 기본 기능을 OZ가 이미 구현해 두었다.
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// ERC-4906 = "이 NFT의 메타데이터(이미지, 속성)가 바뀌었다"고 마켓(OpenSea 등)에 알리는 이벤트 표준.
// 우리 펫은 레벨업하면 외형이 바뀌므로 마켓이 캐시한 이미지를 새로고침하게 해야 한다.
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
// ERC-165 = "이 컨트랙트가 어떤 인터페이스를 지원하나요?"를 물어보는 표준 (supportsInterface).
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
// OZ의 수학 라이브러리. 여기서는 정수 제곱근 Math.sqrt만 쓴다 (레벨 계산).
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
// 1강-1에서 만든 활동력 토큰. 이 컨트랙트가 생성자에서 직접 배포한다.
import {Energy} from "./Energy.sol";

/// @title PetNFT (펫 NFT 겸 게임 본체)
/// @notice 펫 입양, 밥 주기, 훈련, 활동력 충전을 모두 이 컨트랙트가 처리한다.
///         펫 자체는 일반 ERC721이라 마켓에서 사고팔 수 있다.
/// @dev `is ERC721, IERC4906` = TypeScript의 `class PetNFT extends ERC721 implements IERC4906`과 비슷하다.
///      Solidity는 다중 상속이 되고, interface도 같은 `is`로 쓴다.
contract PetNFT is ERC721, IERC4906 {
    // =====================================================================
    // ① 상수 (게임 규칙 수치)
    // =====================================================================
    // * `constant`는 컴파일할 때 값이 코드에 그대로 박힌다. storage를 아예 안 쓴다.
    //   (immutable은 "생성자에서 한 번 정함", constant는 "소스 코드에 적힌 값 그대로")
    // * `public`을 붙이면 같은 이름의 읽기 함수가 자동으로 생긴다. 예: MAX_ENERGY() → 10
    //   프론트에서 이 값을 읽어 화면에 쓰면, 규칙 수치를 프론트에 하드코딩하지 않아도 된다.

    /// @notice 입양·충전 때 지급하는 활동력
    uint256 public constant MAX_ENERGY = 10;
    /// @notice 밥 주기 1번에 드는 활동력
    uint256 public constant FEED_COST = 1;
    /// @notice 밥 주기 1번에 얻는 경험치
    uint256 public constant FEED_XP = 10;
    /// @notice 훈련 1번에 드는 활동력
    uint256 public constant TRAIN_COST = 3;
    /// @notice 훈련 1번에 얻는 경험치 (배고프면 절반)
    uint256 public constant TRAIN_XP = 40;
    /// @notice 마지막 식사 후 이 시간이 지나면 배고픔
    /// @dev `1 days`는 Solidity 시간 단위 리터럴이다. 1 days = 86400 (초). 블록 시간은 초 단위다.
    uint256 public constant HUNGRY_AFTER = 1 days;
    /// @notice 최대 레벨
    uint256 public constant MAX_LEVEL = 20;

    // =====================================================================
    // ① struct (펫 한 마리의 데이터)
    // =====================================================================
    // * struct는 TypeScript의 `type Pet = { xp: bigint; ... }`와 같다.
    // ? 왜 uint256이 아니라 uint64, uint32로 잘게 나눴을까?
    //   EVM storage는 32바이트(256비트) "칸(slot)" 단위로 저장하고, 칸 하나를 새로 쓰는 데 약 2만 가스가 든다.
    //   64 + 64 + 64 + 32 = 224비트 ≤ 256비트라서 네 값이 **칸 하나**에 들어간다 (storage packing).
    //   전부 uint256이었다면 칸 4개 = 입양할 때 가스가 약 4배.
    //   uint64 최대값은 약 1.8 × 10^19 이라서 XP나 초 단위 시각을 담기엔 충분하다.
    struct Pet {
        uint64 xp; // 누적 경험치. 레벨은 저장하지 않고 xp로 계산한다 (levelOf)
        uint64 lastFedAt; // 마지막으로 밥 먹은 시각 (유닉스 초). 배고픔 계산에 쓴다
        uint64 bornAt; // 입양 시각 (유닉스 초)
        uint32 dna; // 종, 색, 성격, 특징을 정하는 난수 (SPEC 5장, 프론트 look.ts에서 해석)
    }

    // =====================================================================
    // ① 상태 변수 (블록체인에 영구 저장되는 값)
    // =====================================================================

    /// @notice 활동력 토큰 컨트랙트 주소
    /// @dev 생성자에서 `new Energy()`로 만들고 나면 바꿀 수 없다 (immutable).
    ///      프론트는 이 함수로 Energy 주소를 알아낸다. Energy 주소를 따로 설정할 필요가 없다.
    Energy public immutable energy;

    /// @notice 배포한 사람 주소
    /// @dev ! 관리자 권한은 refreshAllMetadata(마켓 이미지 새로고침 요청) 하나뿐이다.
    ///      펫을 뺏거나, 활동력을 찍어내거나, 규칙을 바꾸는 함수는 없다. 그래서 관리자를 믿을 필요가 거의 없다.
    address public immutable admin;

    /// @dev tokenURI의 앞부분. 예: "https://silo-pets.app/api/pet/" → tokenURI(7) = ".../api/pet/7"
    ///      `private`이라 자동 getter가 없다. 대신 ERC721의 tokenURI(id)로 완성된 주소를 읽는다.
    ///      string은 길이가 정해져 있지 않아 immutable이 될 수 없다. 그래서 일반 storage 변수다.
    string private baseURI;

    /// @notice 지금까지 입양된 펫 수 = 가장 최근 petId
    /// @dev petId는 1부터 시작한다 (adopt에서 `++totalSupply`). 0번 펫은 없다.
    uint256 public totalSupply;

    /// @notice petId → 펫 데이터
    /// @dev mapping은 TS의 `Map<number, Pet>`과 비슷하지만, 없는 키를 읽으면 에러 대신 "전부 0인 값"이 나온다.
    ///      `public` mapping의 자동 getter는 struct 필드를 튜플로 돌려준다: pets(1) → (xp, lastFedAt, bornAt, dna)
    mapping(uint256 => Pet) public pets;

    /// @notice 이 지갑이 이미 무료 입양을 했는지
    /// @dev ? 펫을 팔아서 지갑에 펫이 0마리가 되어도 true로 남는다. "지갑당 1회"라는 규칙 그대로다.
    mapping(address => bool) public hasAdopted;

    // =====================================================================
    // ① 이벤트 (프론트와 인덱서가 듣는 "로그")
    // =====================================================================
    // * 이벤트는 storage에 저장되지 않고 트랜잭션 영수증(receipt)의 로그로 남는다. storage보다 훨씬 싸다.
    //   컨트랙트 자신은 이벤트를 다시 읽을 수 없다. 오직 밖(프론트, 인덱서)에서 읽는 용도다.
    // * `indexed`가 붙은 인자는 "topic"에 들어가서 필터 검색이 된다.
    //   예: "owner가 내 주소인 Adopted 이벤트만 줘" (viem의 getLogs에서 args로 필터).
    //   indexed는 이벤트당 최대 3개까지다.

    /// @notice 입양 완료. dna는 프론트가 바로 외형을 그리는 데 쓴다.
    event Adopted(address indexed owner, uint256 indexed petId, uint32 dna);
    /// @notice 밥 주기 완료. xp는 밥 먹은 뒤의 누적 경험치
    event Fed(uint256 indexed petId, uint256 xp);
    /// @notice 훈련 완료. xpGained = 이번에 얻은 양(40 또는 20), xp = 누적 경험치
    event Trained(uint256 indexed petId, uint256 xpGained, uint256 xp);
    /// @notice 레벨이 올랐을 때. level = 새 레벨
    event LevelUp(uint256 indexed petId, uint256 level);
    /// @notice 활동력 무료 충전 완료
    event Refilled(address indexed player, uint256 amount);
    // ? MetadataUpdate, BatchMetadataUpdate 이벤트는 여기 없다. IERC4906 인터페이스 안에 선언되어 있어서 상속으로 받는다.

    // =====================================================================
    // ① 커스텀 에러
    // =====================================================================
    // Energy.sol과 같은 방식이다. 프론트는 ABI를 보고 에러 이름으로 메시지를 바꿔 보여준다.

    /// @notice 이미 입양한 지갑이 adopt를 또 부름
    error AlreadyAdopted();
    /// @notice 내 펫이 아닌데 밥 주기·훈련을 시도함
    error NotPetOwner();
    /// @notice 활동력이 남아 있는데 refill을 부름 (0일 때만 충전 가능)
    error StillHasEnergy();
    /// @notice admin이 아닌데 refreshAllMetadata를 부름
    error NotAdmin();

    // =====================================================================
    // 생성자
    // =====================================================================

    /// @param baseURI_ 메타데이터 API 주소의 앞부분 (끝에 "/" 포함)
    /// @dev `ERC721("Silo Pet", "PET")`은 부모 생성자 호출이다. TS의 `super("Silo Pet", "PET")`와 같다.
    ///      인자 이름 끝의 `_`는 상태 변수 baseURI와 이름이 겹치지 않게 하는 관례다.
    constructor(string memory baseURI_) ERC721("Silo Pet", "PET") {
        // ! 여기서 Energy를 배포하므로 Energy 입장에서 msg.sender = 이 PetNFT 주소다.
        //   그래서 Energy.game = PetNFT 주소로 고정되고, 다른 누구도 활동력을 발행할 수 없다.
        energy = new Energy();
        admin = msg.sender; // 이 PetNFT를 배포한 지갑 (배포 스크립트를 돌린 사람)
        baseURI = baseURI_;
    }

    // =====================================================================
    // ② 쓰기: 입양
    // =====================================================================

    /// @notice 펫 1마리를 무료로 입양하고 활동력 10을 받는다. 지갑당 1번만 된다.
    /// @return petId 새로 생긴 펫 번호
    /// @dev `returns (uint256 petId)`처럼 반환값에 이름을 붙이면, 그 이름의 변수에 값을 넣는 것만으로 반환된다.
    ///      (함수 끝에 `return petId;`를 따로 안 써도 된다)
    function adopt() external returns (uint256 petId) {
        // ! 검사 → 상태 변경 → 외부 호출 순서 (Checks-Effects-Interactions 패턴).
        //   hasAdopted를 먼저 true로 바꿔 두면, 아래 _mint 도중에 다시 adopt가 불려도(재진입) 여기서 막힌다.
        if (hasAdopted[msg.sender]) revert AlreadyAdopted();
        hasAdopted[msg.sender] = true;

        // * `++totalSupply`는 "먼저 1 올리고 그 값을 쓴다". 첫 펫은 1번이다.
        //   (`totalSupply++`였다면 첫 펫이 0번이 된다)
        petId = ++totalSupply;

        // * DNA 만들기: (입양자 주소, 펫 번호, 블록 난수)를 묶어 해시한 뒤 하위 32비트만 쓴다.
        //   - abi.encode(...)    : 여러 값을 바이트 하나로 이어 붙인다
        //   - keccak256(...)     : 32바이트 해시 (bytes32). 입력이 조금만 달라도 결과가 완전히 바뀐다
        //   - uint256(...)       : bytes32를 숫자로 본다
        //   - uint32(...)        : 아래 32비트만 남기고 잘라낸다
        // ! block.prevrandao는 검증자(validator)가 어느 정도 예측·조작할 수 있다.
        //   레어 외형에 큰돈이 걸린 게임이면 Chainlink VRF 같은 진짜 난수가 필요하다. 포트폴리오 게임이라 이걸로 충분하다.
        uint32 dna = uint32(uint256(keccak256(abi.encode(msg.sender, petId, block.prevrandao))));

        // Pet(xp, lastFedAt, bornAt, dna) 순서. 입양 순간에 밥을 먹은 것으로 친다 (그래서 바로 배고프지 않다).
        // block.timestamp는 uint256이라 uint64로 줄여서 넣는다.
        pets[petId] = Pet(0, uint64(block.timestamp), uint64(block.timestamp), dna);

        // OZ ERC721의 내부 함수. 주인을 기록하고 Transfer(0x0 → msg.sender, petId) 이벤트를 낸다.
        // ? safeMint가 아니라 _mint를 쓴다. 받는 쪽이 컨트랙트여도 onERC721Received를 확인하지 않는다.
        _mint(msg.sender, petId);
        // 활동력 10 지급. Energy.mint는 onlyGame이지만, 지금 msg.sender(Energy 입장) = 이 컨트랙트라 통과한다.
        energy.mint(msg.sender, MAX_ENERGY);
        emit Adopted(msg.sender, petId, dna);
    }

    // =====================================================================
    // ③ 쓰기: 밥 주기, 훈련, 충전
    // =====================================================================

    /// @notice 활동력 1을 써서 밥을 준다. 경험치 +10, 배고픔 해제.
    function feed(uint256 petId) external {
        // 주인 확인 + 활동력 1 소각. 실패하면 여기서 전체가 되돌려진다 (revert).
        _spend(petId, FEED_COST);
        // * `storage` 참조: pets[petId]를 복사하지 않고 "그 자리"를 가리킨다. p를 고치면 실제 저장값이 바뀐다.
        //   `memory`로 받았다면 복사본이라 고쳐도 저장되지 않는다. (TS의 객체 참조 vs 구조 분해 복사와 비슷)
        Pet storage p = pets[petId];
        p.lastFedAt = uint64(block.timestamp);
        _gainXp(petId, FEED_XP);
        // p는 storage 참조라서 _gainXp가 올린 xp가 p.xp에 이미 반영되어 있다.
        emit Fed(petId, p.xp);
    }

    /// @notice 활동력 3을 써서 훈련한다. 경험치 +40, 배고프면 +20.
    function train(uint256 petId) external {
        _spend(petId, TRAIN_COST);
        // 삼항 연산자는 TS와 똑같다. 40 / 2 = 20 (정수 나눗셈)
        // ? 훈련은 lastFedAt을 갱신하지 않는다. 배고픈 채로 계속 훈련하면 계속 +20이다.
        uint256 gained = isHungry(petId) ? TRAIN_XP / 2 : TRAIN_XP;
        _gainXp(petId, gained);
        emit Trained(petId, gained, pets[petId].xp);
    }

    /// @notice 활동력이 0일 때만 10을 무료로 다시 받는다.
    /// @dev 펫이 없어도 부를 수 있다. 하지만 입양하지 않은 지갑은 원래 잔액 0이라... 사실상 누구나 받을 수 있다.
    ///      ? 그래도 문제없을까? 활동력은 전송이 안 되고, 쓰려면 내 펫이 있어야 하니 남이 받아도 쓸 데가 없다.
    // TODO 나중에 유료 충전, 쿨타임을 붙일 자리
    function refill() external {
        if (energy.balanceOf(msg.sender) != 0) revert StillHasEnergy();
        energy.mint(msg.sender, MAX_ENERGY);
        emit Refilled(msg.sender, MAX_ENERGY);
    }

    /// @notice 아트 세트를 바꾼 뒤 마켓에 "모든 펫 이미지를 새로고침하라"고 알린다 (ERC-4906).
    /// @dev ! 관리자 전용. 이벤트만 내고 상태는 전혀 바꾸지 않는다.
    ///      (0, type(uint256).max) = "0번부터 가능한 최대 번호까지 전부"라는 뜻이다.
    function refreshAllMetadata() external {
        if (msg.sender != admin) revert NotAdmin();
        emit BatchMetadataUpdate(0, type(uint256).max);
    }

    // =====================================================================
    // ④ 읽기 (view = 상태를 읽기만 함. 프론트에서 부르면 가스비 없음)
    // =====================================================================

    /// @notice 펫의 현재 레벨 (1~20)
    /// @dev 레벨 L까지 필요한 누적 XP = 10 × (L-1) × (L+3)
    ///      이걸 L에 대해 풀면 → L = sqrt(xp/10 + 4) - 1  (정수 연산이라 소수점은 버림)
    ///      예: xp=0   → sqrt(0 + 4) - 1   = 2 - 1  = 1
    ///          xp=50  → sqrt(5 + 4) - 1   = 3 - 1  = 2
    ///          xp=119 → sqrt(11 + 4) - 1  = 3 - 1  = 2  (sqrt(15) = 3.87… → 3)
    ///          xp=120 → sqrt(12 + 4) - 1  = 4 - 1  = 3
    ///      `public`이라 밖에서도, 안에서도(_gainXp, stageOf) 부를 수 있다.
    function levelOf(uint256 petId) public view returns (uint256) {
        uint256 lv = Math.sqrt(pets[petId].xp / 10 + 4) - 1;
        // 경험치는 4370을 넘어도 계속 쌓이지만 레벨은 20에서 멈춘다.
        return lv > MAX_LEVEL ? MAX_LEVEL : lv;
    }

    /// @notice 성장 단계 0~4 (알, 아기, 어린이, 어른, 각성). 프론트가 외형을 고를 때 쓴다.
    function stageOf(uint256 petId) public view returns (uint8) {
        uint256 lv = levelOf(petId);
        // 위에서부터 차례로 검사하고, 맞으면 바로 return한다. 그래서 아래 줄은 "앞 조건이 전부 거짓"이라는 전제가 깔린다.
        if (lv < 3) return 0; // 알 (Lv 1~2)
        if (lv < 7) return 1; // 아기 (Lv 3~6)
        if (lv < 12) return 2; // 어린이 (Lv 7~11)
        if (lv < 20) return 3; // 어른 (Lv 12~19)
        return 4; // 각성 (Lv 20)
    }

    /// @notice 지금 배고픈지. 저장하지 않고 매번 시각으로 계산한다.
    /// @dev ? 왜 `bool hungry`를 저장하지 않을까? 블록체인은 "24시간 뒤에 자동으로 값을 바꾸는" 타이머가 없다.
    ///      누군가 트랜잭션을 보내야만 코드가 돈다. 그래서 "마지막 식사 시각"만 저장하고 읽을 때 계산한다.
    ///      딱 24시간째(같은 초)는 `>`라서 아직 안 배고프다. 24시간 + 1초부터 배고프다.
    function isHungry(uint256 petId) public view returns (bool) {
        return block.timestamp > pets[petId].lastFedAt + HUNGRY_AFTER;
    }

    // =====================================================================
    // ③ 내부 함수 (private = 이 컨트랙트 안에서만 부를 수 있음. 자식 컨트랙트도 못 부름)
    // =====================================================================

    /// @dev 행동 공통 처리: 주인 확인 → 활동력 소각
    function _spend(uint256 petId, uint256 cost) private {
        // ! 행동 권한은 "입양한 사람"이 아니라 "지금 주인(ownerOf)"이다. 펫을 팔면 권한도 같이 넘어간다.
        //   없는 petId면 OZ의 ownerOf가 ERC721NonexistentToken 에러로 먼저 revert한다.
        if (ownerOf(petId) != msg.sender) revert NotPetOwner();
        // 잔액이 cost보다 적으면 Energy(OZ ERC20)의 _burn이 ERC20InsufficientBalance로 revert한다.
        // * approve가 필요 없다. Energy.burn은 onlyGame이라 PetNFT가 바로 태울 수 있다. 그래서 행동 1번 = 트랜잭션 1번.
        energy.burn(msg.sender, cost);
    }

    /// @dev 경험치를 올리고, 레벨이 오르면 LevelUp, 항상 MetadataUpdate 이벤트를 낸다.
    function _gainXp(uint256 petId, uint256 amount) private {
        uint256 before = levelOf(petId); // 올리기 전 레벨
        pets[petId].xp += uint64(amount);
        uint256 afterLv = levelOf(petId); // 올린 뒤 레벨 (`after`는 Solidity 예약어라 afterLv로 이름 지었다)
        // ? 한 번에 2레벨 이상 오를 수 있을까? 지금 수치(+10, +40)로는 안 된다. 레벨 간격이 최소 50이라서.
        if (afterLv > before) emit LevelUp(petId, afterLv);
        // XP가 바뀌면 메타데이터(레벨, 이미지)가 바뀔 수 있으니 마켓에 새로고침 요청 (ERC-4906)
        emit MetadataUpdate(petId);
    }

    // =====================================================================
    // ⑤ ERC-4906과 tokenURI
    // =====================================================================

    /// @dev OZ ERC721의 tokenURI(id)는 `_baseURI() + id`를 돌려준다. 기본 _baseURI는 ""이라서 덮어쓴다.
    ///      `internal` = 이 컨트랙트와 자식에서만 부를 수 있다. `override` = 부모 함수를 덮어쓴다는 표시 (필수).
    function _baseURI() internal view override returns (string memory) {
        return baseURI; // tokenURI(7) = ".../api/pet/7"
    }

    /// @notice ERC-165: "이 인터페이스를 지원하나?"에 답한다.
    /// @dev 0x49064906 = ERC-4906의 인터페이스 ID. 마켓은 이 값이 true여야 MetadataUpdate 이벤트를 믿고 듣는다.
    ///      나머지(ERC721, ERC165 등)는 부모(super)에게 맡긴다.
    ///      `override(ERC721, IERC165)`: supportsInterface가 두 부모 경로에 다 있어서, 둘 다 덮어쓴다고 명시해야 한다.
    function supportsInterface(bytes4 id) public view override(ERC721, IERC165) returns (bool) {
        return id == bytes4(0x49064906) || super.supportsInterface(id);
    }
}
