// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// (import 순서는 forge fmt의 sort_imports가 알파벳순으로 정렬한다)
import {PetNFT} from "../src/PetNFT.sol";
// Script: 배포용 스크립트의 부모. Test처럼 vm(치트코드)과 console을 쓸 수 있다.
import {Script, console} from "forge-std/Script.sol";

/// @title Deploy (PetNFT 배포 스크립트)
/// @notice PetNFT 하나만 배포한다. Energy는 PetNFT 생성자가 `new Energy()`로 같이 배포한다.
///         끝나면 프론트 env(web/.env.local)에 넣을 세 값을 출력한다.
/// @dev * 스크립트는 "Solidity로 쓰는 배포 자동화"다. JS로 치면 hardhat의 deploy.ts 같은 것.
///      * 흐름: forge script가 run()을 먼저 로컬에서 시뮬레이션한다.
///        `--broadcast`를 붙이면 vm.startBroadcast() ~ vm.stopBroadcast() 사이의 호출을
///        실제 트랜잭션으로 만들어 체인(anvil, Base Sepolia)에 보낸다. 안 붙이면 시뮬레이션만 한다.
///
/// 실행 예 (contracts 폴더에서):
///   로컬 anvil:   forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --private-key <anvil 0번 키> --broadcast
///   시뮬레이션:   forge script script/Deploy.s.sol
contract Deploy is Script {
    function run() external returns (PetNFT nft) {
        // * 메타데이터 API 주소. 환경 변수 APP_URL이 있으면 그걸 쓰고, 없으면 로컬 Next.js 주소를 쓴다.
        //   vm.envOr(이름, 기본값): 환경 변수를 읽되, 없으면 기본값. (process.env.APP_URL ?? "..." 와 같다)
        //   ? 왜 env로 받을까? 로컬(localhost:3000)과 Base Sepolia(실제 도메인)의 주소가 달라서다.
        string memory appUrl = vm.envOr("APP_URL", string("http://localhost:3000"));
        // string.concat: 문자열 이어 붙이기 (TS의 `${appUrl}/api/pet/`)
        // ! 끝의 "/"가 중요하다. tokenURI(7) = baseURI + "7" 이라서, "/"가 없으면 ".../api/pet7"이 된다.
        string memory baseURI = string.concat(appUrl, "/api/pet/");

        // ! startBroadcast ~ stopBroadcast 사이의 호출만 실제 트랜잭션이 된다.
        //   보내는 지갑은 명령줄의 --private-key(또는 --account)로 정한다. 이 지갑이 PetNFT.admin이 된다.
        vm.startBroadcast();
        nft = new PetNFT(baseURI);
        vm.stopBroadcast();

        // * 프론트 env에 넣을 세 값 (SPEC 7-1).
        //   - PET_NFT_ADDRESS: 방금 배포한 PetNFT
        //   - ENERGY_ADDRESS : PetNFT가 생성자에서 만든 Energy. 따로 배포하지 않았으니 nft.energy()로 읽는다
        //   - DEPLOY_BLOCK   : 프론트가 이벤트(getLogs)를 이 블록부터 찾는다. 0부터 찾으면 RPC가 느리거나 거부한다.
        // ? block.number는 스크립트가 시뮬레이션한 시점의 블록이다. 실제 배포 트랜잭션은 그다음 블록에 들어갈 수 있다.
        //   시작 블록이 실제보다 1~2 이르면 빈 블록을 조금 더 훑을 뿐 문제가 없다. 늦으면 이벤트를 놓치므로 이쪽이 안전하다.
        console.log("baseURI:", baseURI);
        console.log("--- web/.env.local ---");
        console.log("NEXT_PUBLIC_PET_NFT_ADDRESS=%s", address(nft));
        console.log("NEXT_PUBLIC_ENERGY_ADDRESS=%s", address(nft.energy()));
        console.log("NEXT_PUBLIC_DEPLOY_BLOCK=%s", block.number);
    }
}
