# Silo Pets

지갑을 연결해 무료로 펫 NFT를 입양하고, 활동력(ENERGY)으로 밥을 주고 훈련시켜 키우는 다이내믹 NFT 웹 게임.

> 실행 방법, env 설명, 아키텍처 요약은 구현이 진행되면서 채운다.

## 저장소 구조

| 폴더 | 내용 |
| --- | --- |
| `contracts/` | Foundry 프로젝트 (Energy, PetNFT) |
| `web/` | Next.js 앱 |
| `svg/` | 아트 원본 (`generate.py`, `anchors.json`, 기준 SVG). flat-v1 포팅의 정답지 |
| `docs/` | 컨트랙트 ↔ 프론트엔드 연결 설명 문서 |

## 결정 사항

- 저장소 루트가 지시서의 `silo-pets/`에 해당한다. 아트 zip은 `svg/`에 풀어 둔 그대로 쓴다.
