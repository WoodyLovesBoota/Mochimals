// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// OpenZeppelin(OZ)의 검증된 ERC20 구현을 가져온다.
// ERC20 = 잔액(balanceOf), 전송(transfer), 승인(approve) 등을 정한 "토큰 표준"이다.
// 직접 짜면 버그가 나기 쉬우니, 업계에서는 거의 항상 OZ를 상속해서 필요한 부분만 바꾼다.
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Energy (활동력 토큰)
/// @notice 펫에게 밥을 주거나 훈련시킬 때 쓰는 포인트다.
///         - 소수점이 없다 (decimals = 0). 화면에 보이는 "3"이 실제 값 3이다.
///         - 사용자끼리 주고받을 수 없다 (발행과 소각만 된다).
///         - 발행과 소각은 오직 PetNFT 컨트랙트만 할 수 있다.
/// @dev 이 컨트랙트는 사람이 직접 배포하지 않는다.
///      PetNFT의 생성자가 `new Energy()`로 만든다. 그래서 msg.sender가 PetNFT 주소가 된다.
contract Energy is ERC20 {
    /// @notice 이 토큰을 발행·소각할 수 있는 유일한 주소 (= PetNFT 컨트랙트 주소)
    /// @dev `immutable`은 생성자에서 한 번만 정하고 이후 절대 못 바꾸는 값이다.
    ///      바꾸는 함수 자체가 없으므로 "권한을 남에게 넘기는" 사고가 원천적으로 불가능하다.
    ///      또 storage가 아니라 바이트코드에 박혀서 읽을 때 가스가 거의 안 든다.
    address public immutable game;

    // ---------- 커스텀 에러 ----------
    // `revert OnlyGame()`처럼 쓴다. 문자열 에러(require(..., "only game"))보다 가스가 싸고,
    // 프론트에서 viem이 ABI를 보고 에러 "이름"을 정확히 꺼낼 수 있다 (lib/errors.ts에서 활용).

    /// @notice PetNFT가 아닌 주소가 mint/burn을 부르면 발생
    error OnlyGame();
    /// @notice 사용자 간 전송(transfer, transferFrom)을 시도하면 발생
    error NonTransferable();

    /// @dev ERC20("이름", "심볼")로 부모 생성자를 부른다. 지갑 앱에 "Pet Energy (ENERGY)"로 보인다.
    constructor() ERC20("Pet Energy", "ENERGY") {
        // 이 컨트랙트를 배포한 주체를 game으로 기록한다.
        // PetNFT 생성자 안에서 `new Energy()`가 실행되므로 msg.sender = PetNFT 주소.
        game = msg.sender;
    }

    /// @dev modifier는 함수 앞에 끼워 넣는 검사 코드다.
    ///      `_;` 자리에 원래 함수 본문이 들어간다고 생각하면 된다.
    modifier onlyGame() {
        if (msg.sender != game) revert OnlyGame();
        _;
    }

    /// @notice 소수점 자리수. 기본값 18을 0으로 바꾼다.
    /// @dev ETH처럼 decimals 18이면 "1 토큰"이 내부적으로 1_000_000_000_000_000_000이다.
    ///      우리는 0이라서 내부 값 = 화면 값이다. 프론트에서 formatUnits가 필요 없다.
    ///      `pure`는 상태를 읽지도 않는 함수라는 뜻이다 (상수만 돌려줌).
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// @notice `to`에게 활동력 `amount`만큼 새로 발행한다.
    /// @dev PetNFT가 입양(adopt) 때와 충전(refill) 때 부른다.
    function mint(address to, uint256 amount) external onlyGame {
        _mint(to, amount);
    }

    /// @notice `from`의 활동력 `amount`만큼을 소각(없앰)한다.
    /// @dev PetNFT가 밥 주기(feed), 훈련(train) 때 부른다.
    ///      일반 ERC20 같으면 "사용자가 approve → 컨트랙트가 transferFrom" 두 번의 트랜잭션이 필요하지만,
    ///      여기서는 game 권한으로 바로 소각하므로 사용자는 approve 없이 행동 1번 = 트랜잭션 1번이다.
    function burn(address from, uint256 amount) external onlyGame {
        // * 잔액이 모자라면 OZ의 _burn → _update 안에서
        // ERC20InsufficientBalance(from, 잔액, 필요량) 에러로 revert된다.
        // 그래서 여기서 잔액을 따로 검사할 필요가 없다.
        _burn(from, amount);
    }

    /// @dev OZ 5.x에서는 mint, burn, transfer가 전부 결국 이 `_update` 하나를 거친다.
    ///        - mint     : from = 0 주소, to = 받는 사람
    ///        - burn     : from = 잃는 사람, to = 0 주소
    ///        - transfer : from = 보내는 사람, to = 받는 사람 (둘 다 0이 아님)
    ///      그러므로 "둘 다 0이 아닌 경우"만 막으면 전송만 정확히 막힌다.
    ///      (이런 토큰을 흔히 Soulbound 토큰이라고 부른다.)
    function _update(address from, address to, uint256 value) internal override {
        // ! 보안 핵심: 이 한 줄이 사용자 간 전송을 전부 막는다
        if (from != address(0) && to != address(0)) revert NonTransferable();
        // 검사를 통과하면 OZ의 원래 로직(잔액 증감, Transfer 이벤트 발생)을 그대로 실행한다.
        super._update(from, to, value);
    }
}
