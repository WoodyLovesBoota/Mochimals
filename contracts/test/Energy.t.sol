// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// forge-std의 Test를 상속하면 assertEq, vm(치트코드) 같은 테스트 도구를 쓸 수 있다.
import {Test} from "forge-std/Test.sol";
// OZ ERC20이 잔액 부족 때 던지는 에러가 이 인터페이스에 정의돼 있다.
import {Energy} from "../src/Energy.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

/// @notice Energy 토큰 단독 테스트.
/// @dev 실제 게임에서는 PetNFT가 Energy를 배포하지만, 여기서는 "테스트 컨트랙트 자신"이 배포한다.
///      그러면 Energy.game = 이 테스트 컨트랙트 주소가 되어, 테스트가 PetNFT 역할을 대신할 수 있다.
///      (PetNFT를 통한 전체 흐름은 PetNFT.t.sol에서 따로 검증한다.)
///
/// * 실행: contracts 폴더에서 `forge test --match-contract EnergyTest -vv`
/// * 규칙: 이름이 `test`로 시작하는 함수 하나하나가 테스트 1개다. 각 테스트 전에 setUp()이 새로 실행된다.
contract EnergyTest is Test {
    Energy energy;

    // makeAddr("alice")는 이름에서 만든 가짜 주소를 돌려주고, 로그에 "alice"라고 이름표도 붙여준다.
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    /// @dev 매 테스트마다 새 Energy를 배포한다. 테스트끼리 상태가 섞이지 않는다.
    function setUp() public {
        energy = new Energy(); // msg.sender = 이 테스트 컨트랙트 → game = address(this)
    }

    // ---------------------------------------------------------------
    // 기본 정보
    // ---------------------------------------------------------------

    function test_metadata() public view {
        assertEq(energy.name(), "Pet Energy");
        assertEq(energy.symbol(), "ENERGY");
        assertEq(energy.decimals(), 0); // 소수점 없음
        assertEq(energy.game(), address(this)); // 배포한 주체가 game
    }

    // ---------------------------------------------------------------
    // 발행과 소각: game만 가능
    // ---------------------------------------------------------------

    function test_gameCanMintAndBurn() public {
        energy.mint(alice, 10); // 이 테스트 컨트랙트가 game이므로 성공
        assertEq(energy.balanceOf(alice), 10);

        energy.burn(alice, 3);
        assertEq(energy.balanceOf(alice), 7);
        assertEq(energy.totalSupply(), 7); // 소각된 만큼 총발행량도 줄어든다
    }

    function test_mint_revertsIfNotGame() public {
        // ! vm.prank(x): "바로 다음 호출 1번"의 msg.sender를 x로 바꾼다
        vm.prank(alice);
        // ! vm.expectRevert(에러): "바로 다음 호출"이 이 에러로 실패해야 테스트 통과
        vm.expectRevert(Energy.OnlyGame.selector);
        energy.mint(alice, 10);
    }

    function test_burn_revertsIfNotGame() public {
        energy.mint(alice, 10);

        vm.prank(alice); // 자기 토큰이라도 game이 아니면 못 태운다
        vm.expectRevert(Energy.OnlyGame.selector);
        energy.burn(alice, 1);
    }

    // ---------------------------------------------------------------
    // Q1: 잔액보다 많이 태우면?
    // ---------------------------------------------------------------

    function test_burn_revertsOnInsufficientBalance() public {
        energy.mint(alice, 2);

        // * Energy.burn에는 잔액 검사가 없지만, OZ 내부(_update)가 이 에러로 막는다.
        //   에러에 인자가 있으면 abi.encodeWithSelector(선택자, 인자들...)로 "인자까지" 정확히 맞춰야 한다.
        //   ERC20InsufficientBalance(누구, 현재 잔액, 필요한 양)
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, 2, 3));
        energy.burn(alice, 3);
    }

    // ---------------------------------------------------------------
    // Q2: 사용자 간 전송 금지
    // ---------------------------------------------------------------

    function test_transfer_reverts() public {
        energy.mint(alice, 10);

        vm.prank(alice);
        vm.expectRevert(Energy.NonTransferable.selector);
        energy.transfer(bob, 1);
    }

    function test_transferFrom_reverts() public {
        energy.mint(alice, 10);

        // approve는 "허락"만 기록할 뿐 토큰이 움직이지 않으므로 _update를 거치지 않아 성공한다.
        vm.prank(alice);
        energy.approve(bob, 5);

        // 하지만 실제로 옮기는 순간 _update에서 막힌다.
        vm.prank(bob);
        vm.expectRevert(Energy.NonTransferable.selector);
        energy.transferFrom(alice, bob, 1);
    }
}
