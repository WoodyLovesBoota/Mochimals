// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Test: assertEq, vm(치트코드) 같은 테스트 도구. Vm: vm.getRecordedLogs()가 돌려주는 Log 타입이 여기 있다.
import {Energy} from "../src/Energy.sol";
import {PetNFT} from "../src/PetNFT.sol";
import {Test, Vm} from "forge-std/Test.sol";
// OZ가 던지는 표준 에러들. ERC20 잔액 부족, ERC721 없는 토큰 등.
import {IERC20Errors, IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
// ERC-4906 이벤트(MetadataUpdate, BatchMetadataUpdate)를 기대값으로 emit하려면 선언이 필요하다.
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @notice PetNFT 전체 흐름 테스트 (SPEC 4-3 항목 전부 + 수업에서 나온 함정).
/// @dev Energy.t.sol과 달리 여기서는 진짜 구조 그대로 테스트한다.
///      테스트 컨트랙트가 PetNFT를 배포 → PetNFT 생성자가 Energy를 배포.
///      그래서 Energy.game = PetNFT 주소이고, PetNFT.admin = 이 테스트 컨트랙트 주소다.
///
/// * 실행: contracts 폴더에서 `forge test --match-contract PetNFTTest -vv`
contract PetNFTTest is Test {
    PetNFT nft;
    Energy energy;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    string constant BASE = "https://silo-pets.app/api/pet/";

    // * 시작 시각을 현실적인 값으로 고정한다. forge 테스트의 기본 block.timestamp는 1이라서,
    //   "시각 - 24시간" 같은 계산을 하면 음수가 되어 터질 수 있다. 2026년 근처 값으로 맞춰 둔다.
    uint256 constant START = 1_790_000_000;

    function setUp() public {
        // ! vm.warp(t): 블록 시각(block.timestamp)을 t로 바꾼다. 시간 여행 치트코드.
        vm.warp(START);
        nft = new PetNFT(BASE); // admin = address(this)
        energy = nft.energy(); // PetNFT가 만든 Energy 주소를 받아온다
    }

    // =====================================================================
    // 도우미 함수
    // =====================================================================

    /// @dev `who`가 입양하고 petId를 돌려준다. vm.prank로 "다음 호출 1번"의 msg.sender를 who로 바꾼다.
    function _adopt(address who) internal returns (uint256) {
        vm.prank(who);
        return nft.adopt();
    }

    /// @dev 펫의 xp만 원하는 값으로 바꾼다. 레벨 경계값을 테스트하려고 훈련을 100번씩 돌리지 않기 위함이다.
    ///      ! vm.store(컨트랙트, 슬롯, 값): storage 칸을 강제로 덮어쓴다. 테스트에서만 가능한 치트코드.
    ///      * 슬롯 계산:
    ///        - `forge inspect PetNFT storageLayout`을 보면 pets mapping은 슬롯 8번이다.
    ///          (0~5번은 OZ ERC721의 _name, _symbol, _owners, _balances, _tokenApprovals, _operatorApprovals,
    ///           6번 baseURI, 7번 totalSupply. energy와 admin은 immutable이라 storage에 없다.)
    ///        - mapping 값의 위치 = keccak256(abi.encode(키, mapping 슬롯 번호))
    ///        - Pet은 칸 하나에 4개 필드가 packing되어 있고, 첫 필드 xp가 **가장 아래 64비트**에 있다.
    ///          그래서 아래 64비트만 지우고(& ~mask) 새 xp를 넣는다(| xp). 나머지 필드(lastFedAt 등)는 그대로 둔다.
    function _setXp(uint256 petId, uint64 xp) internal {
        bytes32 slot = keccak256(abi.encode(petId, uint256(8)));
        uint256 word = uint256(vm.load(address(nft), slot)); // 현재 칸 값 읽기
        uint256 mask = type(uint64).max; // 아래 64비트가 전부 1인 값
        word = (word & ~mask) | uint256(xp);
        vm.store(address(nft), slot, bytes32(word));
    }

    /// @dev `who`의 활동력을 0이 될 때까지 쓴다 (훈련 3번 = 9, 밥 1번 = 1). 입양 직후(10) 기준.
    function _drainEnergy(address who, uint256 petId) internal {
        vm.startPrank(who); // ! startPrank ~ stopPrank 사이의 "모든" 호출이 who로 실행된다
        nft.train(petId);
        nft.train(petId);
        nft.train(petId);
        nft.feed(petId);
        vm.stopPrank();
    }

    // =====================================================================
    // ① 입양
    // =====================================================================

    function test_adopt_mintsPetAndEnergy() public {
        uint256 id = _adopt(alice);

        assertEq(id, 1); // 첫 펫은 1번 (++totalSupply)
        assertEq(nft.totalSupply(), 1);
        assertEq(nft.ownerOf(id), alice);
        assertEq(nft.balanceOf(alice), 1); // ERC721의 balanceOf = 가진 NFT 개수
        assertEq(energy.balanceOf(alice), 10); // 활동력 10 지급
        assertTrue(nft.hasAdopted(alice));

        // public mapping의 getter는 struct 필드를 튜플로 돌려준다. 안 쓰는 칸은 비워 둔다.
        (uint64 xp, uint64 lastFedAt, uint64 bornAt,) = nft.pets(id);
        assertEq(xp, 0);
        assertEq(lastFedAt, START); // 입양 순간에 밥 먹은 것으로 친다
        assertEq(bornAt, START);
        assertFalse(nft.isHungry(id));
    }

    function test_adopt_emitsAdopted() public {
        // 컨트랙트와 똑같은 식으로 DNA를 미리 계산해 둔다. 같은 블록이라 prevrandao도 같다.
        uint32 dna = uint32(uint256(keccak256(abi.encode(alice, uint256(1), block.prevrandao))));

        // ! vm.expectEmit(주소): "바로 다음 호출 중에, 이 주소가 아래와 똑같은 이벤트를 내야 한다"
        //   순서: ① expectEmit ② 기대하는 이벤트를 직접 emit ③ 실제 호출
        //   indexed 인자(topic)와 나머지 데이터까지 전부 비교한다.
        vm.expectEmit(address(nft));
        emit PetNFT.Adopted(alice, 1, dna);
        _adopt(alice);
    }

    function test_adopt_twice_reverts() public {
        _adopt(alice);
        vm.prank(alice);
        vm.expectRevert(PetNFT.AlreadyAdopted.selector);
        nft.adopt();
    }

    function test_adopt_differentWallets_getSequentialIds() public {
        assertEq(_adopt(alice), 1);
        assertEq(_adopt(bob), 2);
        assertEq(nft.totalSupply(), 2);
    }

    // =====================================================================
    // ② 밥 주기, 훈련, 배고픔 (vm.warp)
    // =====================================================================

    function test_feed_burnsEnergy_addsXp_updatesLastFedAt() public {
        uint256 id = _adopt(alice);
        vm.warp(START + 1 hours); // 1시간 뒤에 밥을 준다

        // * Fed 이벤트의 xp 값까지 확인한다. feed 안의 `Pet storage p`를 `memory`로 바꾸면
        //   이 이벤트가 xp=0으로 나와서 이 테스트가 실패한다 (1강-3 ③에서 실험한 버그).
        vm.expectEmit(address(nft));
        emit PetNFT.Fed(id, 10);
        vm.prank(alice);
        nft.feed(id);

        assertEq(energy.balanceOf(alice), 9); // 10 - 1
        (uint64 xp, uint64 lastFedAt,,) = nft.pets(id);
        assertEq(xp, 10);
        // ! lastFedAt이 "밥 준 시각"으로 바뀌었는지. memory 버그면 START 그대로라 여기서도 걸린다.
        assertEq(lastFedAt, START + 1 hours);
    }

    function test_feed_revertsIfNotOwner() public {
        uint256 id = _adopt(alice);
        vm.prank(bob);
        vm.expectRevert(PetNFT.NotPetOwner.selector);
        nft.feed(id);
    }

    function test_feed_revertsIfPetDoesNotExist() public {
        // 없는 펫은 NotPetOwner보다 먼저 OZ ownerOf에서 터진다. 에러 인자(tokenId)까지 맞춘다.
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999));
        nft.feed(999);
    }

    function test_train_burns3_adds40() public {
        uint256 id = _adopt(alice);
        vm.prank(alice);
        nft.train(id);

        assertEq(energy.balanceOf(alice), 7); // 10 - 3
        (uint64 xp,,,) = nft.pets(id);
        assertEq(xp, 40);
    }

    function test_hungry_boundary() public {
        uint256 id = _adopt(alice);

        // 딱 24시간째: lastFedAt + 86400 > lastFedAt + 86400 → false
        vm.warp(START + 1 days);
        assertFalse(nft.isHungry(id));

        // 24시간 + 1초: lastFedAt + 86401 > lastFedAt + 86400 → true
        vm.warp(START + 1 days + 1);
        assertTrue(nft.isHungry(id));
    }

    function test_train_whenHungry_gives20_thenFeedRestores40() public {
        uint256 id = _adopt(alice);
        vm.warp(START + 1 days + 1); // 배고파짐

        vm.startPrank(alice);
        nft.train(id); // 배고픔 → +20
        (uint64 xp,,,) = nft.pets(id);
        assertEq(xp, 20);

        nft.feed(id); // +10, 배고픔 해제
        assertFalse(nft.isHungry(id));

        nft.train(id); // 다시 +40
        vm.stopPrank();

        (xp,,,) = nft.pets(id);
        assertEq(xp, 20 + 10 + 40);
    }

    function test_train_emitsTrainedWithGained() public {
        uint256 id = _adopt(alice);
        vm.warp(START + 1 days + 1);

        vm.expectEmit(address(nft));
        emit PetNFT.Trained(id, 20, 20); // (petId, 이번에 얻은 양, 누적)
        vm.prank(alice);
        nft.train(id);
    }

    // =====================================================================
    // ③ 활동력: 부족, 충전, 전송 금지
    // =====================================================================

    function test_train_revertsOnInsufficientEnergy() public {
        uint256 id = _adopt(alice);
        // 10 - 3 - 3 - 1 - 1 = 2
        vm.startPrank(alice);
        nft.train(id);
        nft.train(id);
        nft.feed(id);
        nft.feed(id);
        assertEq(energy.balanceOf(alice), 2);

        // ERC20InsufficientBalance(누구, 현재 잔액, 필요한 양)
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, 2, 3));
        nft.train(id);
        vm.stopPrank();

        // revert된 호출은 아무것도 바꾸지 않는다. 잔액도 xp도 그대로다.
        assertEq(energy.balanceOf(alice), 2);
        (uint64 xp,,,) = nft.pets(id);
        assertEq(xp, 40 + 40 + 10 + 10);
    }

    function test_refill_revertsIfStillHasEnergy() public {
        _adopt(alice); // 잔액 10
        vm.prank(alice);
        vm.expectRevert(PetNFT.StillHasEnergy.selector);
        nft.refill();
    }

    function test_refill_givesTenWhenZero() public {
        uint256 id = _adopt(alice);
        _drainEnergy(alice, id);
        assertEq(energy.balanceOf(alice), 0);

        vm.expectEmit(address(nft));
        emit PetNFT.Refilled(alice, 10);
        vm.prank(alice);
        nft.refill();

        assertEq(energy.balanceOf(alice), 10);
    }

    function test_energy_transfer_reverts() public {
        _adopt(alice);
        vm.prank(alice);
        vm.expectRevert(Energy.NonTransferable.selector);
        energy.transfer(bob, 1);
    }

    function test_energy_mintBurn_onlyGame() public {
        _adopt(alice);

        // 사람이 직접 부르면 막힌다
        vm.prank(alice);
        vm.expectRevert(Energy.OnlyGame.selector);
        energy.mint(alice, 100);

        // admin(이 테스트 컨트랙트)이라도 PetNFT가 아니면 막힌다
        vm.expectRevert(Energy.OnlyGame.selector);
        energy.burn(alice, 1);
    }

    // =====================================================================
    // ④ 레벨과 성장 단계 (vm.store로 xp 직접 설정)
    // =====================================================================

    function test_setXp_helperKeepsOtherFields() public {
        // 도우미가 다른 필드를 망가뜨리지 않는지 먼저 확인한다. 이게 틀리면 아래 레벨 테스트도 다 의미가 없다.
        uint256 id = _adopt(alice);
        (, uint64 fedBefore, uint64 bornBefore, uint32 dnaBefore) = nft.pets(id);

        _setXp(id, 1234);

        (uint64 xp, uint64 fed, uint64 born, uint32 dna) = nft.pets(id);
        assertEq(xp, 1234);
        assertEq(fed, fedBefore);
        assertEq(born, bornBefore);
        assertEq(dna, dnaBefore);
    }

    function test_levelOf_tableBoundaries() public {
        uint256 id = _adopt(alice);

        // 3장 레벨표 전체: 레벨 L의 문턱 xp = 10 × (L-1) × (L+3)
        for (uint64 L = 1; L <= 20; L++) {
            uint64 need = 10 * (L - 1) * (L + 3);

            _setXp(id, need); // 문턱 정확히 → L
            assertEq(nft.levelOf(id), L);

            if (L > 1) {
                _setXp(id, need - 1); // 문턱 1 모자람 → L-1
                assertEq(nft.levelOf(id), L - 1);
            }
        }
    }

    function test_levelOf_examplesAndCap() public {
        uint256 id = _adopt(alice);

        _setXp(id, 110);
        assertEq(nft.levelOf(id), 2);
        _setXp(id, 120);
        assertEq(nft.levelOf(id), 3);
        _setXp(id, 1649); // sqrt(164 + 4) - 1 = 12 - 1
        assertEq(nft.levelOf(id), 11);
        _setXp(id, 1650); // sqrt(165 + 4) - 1 = 13 - 1
        assertEq(nft.levelOf(id), 12);
        _setXp(id, 4370);
        assertEq(nft.levelOf(id), 20);
        _setXp(id, 1_000_000); // 그 이상도 20에서 멈춘다
        assertEq(nft.levelOf(id), 20);
    }

    function test_stageOf_boundaries() public {
        uint256 id = _adopt(alice);

        // (xp, 기대 stage) 쌍. 각 xp는 해당 레벨의 문턱이다.
        _setXp(id, 50); // Lv 2
        assertEq(nft.stageOf(id), 0); // 알
        _setXp(id, 120); // Lv 3
        assertEq(nft.stageOf(id), 1); // 아기
        _setXp(id, 450); // Lv 6
        assertEq(nft.stageOf(id), 1);
        _setXp(id, 600); // Lv 7
        assertEq(nft.stageOf(id), 2); // 어린이
        _setXp(id, 1400); // Lv 11
        assertEq(nft.stageOf(id), 2);
        _setXp(id, 1650); // Lv 12
        assertEq(nft.stageOf(id), 3); // 어른
        _setXp(id, 3960); // Lv 19
        assertEq(nft.stageOf(id), 3);
        _setXp(id, 4370); // Lv 20
        assertEq(nft.stageOf(id), 4); // 각성
    }

    // =====================================================================
    // ⑤ 이벤트 순서, 거래, 관리자, 인터페이스
    // =====================================================================

    function test_levelUpTrain_eventOrder() public {
        uint256 id = _adopt(alice);
        vm.prank(alice);
        nft.feed(id); // xp 10 (Lv 1)

        // ! vm.recordLogs(): 이후 나오는 모든 이벤트를 녹화한다. getRecordedLogs()로 꺼낸다.
        vm.recordLogs();
        vm.prank(alice);
        nft.train(id); // xp 50 → Lv 2
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // 녹화에는 Energy의 Transfer(소각) 이벤트도 섞여 있다. PetNFT가 낸 것만 순서대로 골라낸다.
        // topics[0] = 이벤트 시그니처의 keccak256 해시 (이벤트 "이름표")
        bytes32[3] memory got;
        uint256 n;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(nft)) got[n++] = logs[i].topics[0];
        }

        assertEq(n, 3);
        assertEq(got[0], PetNFT.LevelUp.selector); // _gainXp의 LevelUp
        assertEq(got[1], IERC4906.MetadataUpdate.selector); // _gainXp의 MetadataUpdate
        assertEq(got[2], PetNFT.Trained.selector); // train 마지막 줄의 Trained
    }

    function test_noLevelUp_noLevelUpEvent() public {
        uint256 id = _adopt(alice);
        vm.recordLogs();
        vm.prank(alice);
        nft.feed(id); // xp 10, 여전히 Lv 1
        Vm.Log[] memory logs = vm.getRecordedLogs();

        for (uint256 i = 0; i < logs.length; i++) {
            assertTrue(logs[i].topics[0] != PetNFT.LevelUp.selector);
        }
    }

    function test_transfer_newOwnerCanAct_oldOwnerCannot() public {
        uint256 id = _adopt(alice);

        // 펫은 일반 ERC721이라 거래(전송)가 된다
        vm.prank(alice);
        nft.transferFrom(alice, bob, id);
        assertEq(nft.ownerOf(id), bob);

        // 옛 주인은 활동력이 남아 있어도 이제 못 한다
        vm.prank(alice);
        vm.expectRevert(PetNFT.NotPetOwner.selector);
        nft.feed(id);

        // 새 주인 bob은 입양을 안 해서 활동력이 0이다 → 충전 후 행동
        vm.startPrank(bob);
        nft.refill();
        nft.feed(id);
        vm.stopPrank();

        (uint64 xp,,,) = nft.pets(id);
        assertEq(xp, 10);
        assertEq(energy.balanceOf(bob), 9);
    }

    function test_refreshAllMetadata_onlyAdmin() public {
        vm.prank(alice);
        vm.expectRevert(PetNFT.NotAdmin.selector);
        nft.refreshAllMetadata();

        // admin = 배포한 이 테스트 컨트랙트. prank 없이 부르면 msg.sender = address(this)
        vm.expectEmit(address(nft));
        emit IERC4906.BatchMetadataUpdate(0, type(uint256).max);
        nft.refreshAllMetadata();
    }

    function test_supportsInterface() public view {
        assertTrue(nft.supportsInterface(bytes4(0x49064906))); // ERC-4906
        assertTrue(nft.supportsInterface(type(IERC721).interfaceId)); // ERC-721
        assertTrue(nft.supportsInterface(type(IERC721Metadata).interfaceId)); // name, symbol, tokenURI
        assertTrue(nft.supportsInterface(type(IERC165).interfaceId)); // ERC-165 자신
        assertFalse(nft.supportsInterface(bytes4(0xffffffff))); // ERC-165 규칙상 항상 false여야 하는 값
    }

    function test_tokenURI() public {
        uint256 id = _adopt(alice);
        assertEq(nft.tokenURI(id), "https://silo-pets.app/api/pet/1");
        assertEq(nft.name(), "Silo Pet");
        assertEq(nft.symbol(), "PET");
    }
}
