# Mochimals 리디자인

Claude Design 캔버스("Mochimals — Game UI", 모바일 01–16 / 데스크톱 D1–D16 / NFT 페이지)를 실제 화면으로 옮긴 기록이다.
1단계(토큰·글꼴·RainbowKit 테마·헤더/HUD·`/pet/[id]` 기본)와 2단계(나머지 보드 전부)를 끝냈다.

## 토큰

색·글꼴·간격은 전부 [globals.scss](../web/src/app/globals.scss)의 CSS 변수에만 있다. 컴포넌트에는 색 값을 쓰지 않는다.
예외 하나: NFT 이미지는 `next/og`(satori)가 CSS 변수를 못 읽어서 [styles/tokens.ts](../web/src/styles/tokens.ts)에 같은 값의 사본을 둔다. 색을 바꿀 때는 두 곳을 같이 고친다.

| 이름 | 값 | 쓰임 |
| --- | --- | --- |
| `--ink` | #2D2645 | 글자, 레벨 링, 어두운 배지 |
| `--panel` / `--panel-edge` / `--panel-depth` | #FFFAF0 / #EADFCB / #DCCDB0 | 크림 패널, 테두리 2px, 아래 두께 그림자 |
| `--muted` | #655C7C | 보조 글자 |
| `--lime` / `--amber` / `--blue` / `--pink` / `--red` / `--grey` | 면 색 | 두툼한 버튼. 각각 `-depth` 짝이 있다 |
| `--purple`, `--ribbon`, `--gold`/`--silver`/`--bronze` 등 | | 칭호 아이콘, 리본 제목, 랭킹 메달 (2단계에서 시안에 나온 색을 추가) |

두툼한 버튼은 [styles/_ui.scss](../web/src/styles/_ui.scss)의 `chunky(tone)` mixin: `background: var(--tone)` + `box-shadow: 0 5px 0 var(--tone-depth)`. 비활성은 grey 짝.

글꼴은 [layout.tsx](../web/src/app/layout.tsx)의 `next/font`: 라틴·숫자는 Bricolage Grotesque(가변, opsz 12–96, wght 500–800), 한글은 Pretendard Variable(unicode-range로 한글만). 스택은 `'Bricolage Grotesque', 'Pretendard', sans-serif` 하나(`--font-sans`)이고 `--font-display`·`--font-body`·`--font-mono`가 모두 이걸 가리킨다. 제목·버튼·숫자는 굵기 800 + 자간 -0.015em(`ui.display`), 본문은 600, 주소는 고정폭 글꼴 없이 `tabular-nums`(`ui.mono`).

화면 폭 기준은 900px 하나 ([_breakpoints.scss](../web/src/styles/_breakpoints.scss)의 `desktop` / `mobile` mixin). 900px 미만 = HUD + 아래 탭 바, 이상 = 위쪽 내비 + 오른쪽 패널 + 아래 행동 트레이.

## 에셋

[web/public/game/](../web/public/game/)에 받아 두었다.

| 파일 | 쓰임 |
| --- | --- |
| `scene-mobile-day.png`, `scene-desktop-day.png` | 기본 장면 배경 (layout `.shell`), NFT 이미지 배경 |
| `scene-mobile-night.png`, `scene-desktop-night.png` | 부화·진화 연출, 404 (`data-scene="night"`) |
| `placeholder-*.png` | 시안의 펫 오려낸 그림. **화면에서 쓰지 않는다.** 펫은 기존 아트 파이프라인(`ACTIVE_ART_SET` → `PetSprite`)으로 그린다 |

## 보드 → 코드

| 보드 | 코드 |
| --- | --- |
| 공통 헤더·탭 바 | [Header.tsx](../web/src/components/Header.tsx), [TabBar.tsx](../web/src/components/TabBar.tsx), [AccountButton.tsx](../web/src/components/AccountButton.tsx), [EnergyBadge.tsx](../web/src/components/EnergyBadge.tsx), 메뉴 [nav.ts](../web/src/components/nav.ts) |
| 01 / D1 홈(미연결), 05 / D5 입양 | [HomeView.tsx](../web/src/components/HomeView.tsx) (`Intro`, `Adopt`) |
| 04 / D4 내 펫 목록 | [MyPetList.tsx](../web/src/components/MyPetList.tsx). 펫이 2마리 이상일 때만. 1마리면 `/pet/{id}`로 바로 이동 |
| 02 / D2 내 펫 | [PetView.tsx](../web/src/components/PetView.tsx) → [PetHud.tsx](../web/src/components/PetHud.tsx), [PetCard.tsx](../web/src/components/PetCard.tsx), [PetActions.tsx](../web/src/components/PetActions.tsx), [PetPanel.tsx](../web/src/components/PetPanel.tsx) |
| 06 / D6 진행 중 | PetView 알림 줄 [Notice.tsx](../web/src/components/Notice.tsx) + [StepPills.tsx](../web/src/components/StepPills.tsx), 누른 버튼 안 스피너·"확정 중…"·해시 링크(PetActions) |
| 07 / D7 레벨업 | [LevelUpOverlay.tsx](../web/src/components/LevelUpOverlay.tsx), [Confetti.tsx](../web/src/components/Confetti.tsx), [Ribbon.tsx](../web/src/components/Ribbon.tsx) |
| 08 / D8 부화, 09 / D9 진화 | [EvolveOverlay.tsx](../web/src/components/EvolveOverlay.tsx) |
| 10 / D10 배고픔·활동력 0·실패 | PetView 알림 줄(분홍·빨강), PetActions 충전 버튼(호박색 한 줄) + 회색 "활동력 N 필요" |
| 11 / D11 구경 | PetHud 구경 모드, [VisitorCard.tsx](../web/src/components/VisitorCard.tsx), PetPanel 구경 모드 |
| 12 / D12 404·로딩·에러·빈 | [NotFoundView.tsx](../web/src/components/NotFoundView.tsx) (+ `app/not-found.tsx`), [StatusCard.tsx](../web/src/components/StatusCard.tsx) |
| 13 / D13 잘못된 네트워크 | [WrongNetworkSheet.tsx](../web/src/components/WrongNetworkSheet.tsx) (layout에 한 번), 헤더 빨간 "네트워크 확인" |
| 14·15 / D14·D15 지갑·계정 | RainbowKit 테마 [rainbowTheme.ts](../web/src/lib/rainbowTheme.ts) |
| 16 / D16 해금 목록 | [Sheet.tsx](../web/src/components/Sheet.tsx) + [UnlockList.tsx](../web/src/components/UnlockList.tsx) (데스크톱 720px 두 줄) |
| 03 / D3 랭킹 | [RankingList.tsx](../web/src/components/RankingList.tsx) |
| NFT 페이지 | [api/pet/[id]/image.png/route.tsx](../web/src/app/api/pet/[id]/image.png/route.tsx) |

## 시안과 다르게 한 것

- **배고픔·실패(10)에도 모바일 옆 버튼(해금·정보·공유)을 남긴다.** 시안에는 없지만, 배고픈 동안 해금 목록·정보를 못 여는 건 기능 손실이다. 진행 중(06)·레벨업(07)에는 숨긴다.
- **레벨업에도 "건너뛰기"를 넣었다** (완료 기준 4번). 시안 07에는 없다. 2.6초 뒤 저절로 닫힌다.
- **부화·진화는 "좋아요!"를 누를 때까지 열려 있다** (시안 08·09의 버튼). 예전에는 3.2초 뒤 저절로 닫혔다.
- **입양 진행 단계(05의 "누른 뒤 버튼 상태")는 누른 뒤에만** 보여준다. 시안의 안내 문구("이미 입양한 지갑이면…")는 설계 메모라 화면에 넣지 않고, 실제로 이미 입양한 지갑일 때 그 문구를 보여준다.
- **구경(11)에서 이미 펫이 있는 사람**에게는 "나도 모치를 키워볼래요?" 대신 "다른 집사의 펫이에요" + "내 펫 보러 가기".
- **404(12)의 "같은 틀을 쓰는 상태" 묶음**은 설계 메모라 404 화면에는 넣지 않고, 로딩·에러·빈 상태가 실제로 나오는 곳(펫 화면, 홈, 랭킹)에서 `StatusCard`로 쓴다.
- **D10 패널의 배고픔 줄**은 시안 그대로 "배고파지기까지 · 2시간 14분째"다 (배고파진 뒤 지난 시간).
- **랭킹 실시간 소식**: 시안의 소식 종류(레벨업 파랑, 진화 라임, 칭호 보라) 중 컨트랙트 이벤트로 알 수 있는 레벨업·진화 두 가지만.
- **해금 문구**를 시안 표기("액세서리 · 리본")로 바꿨다 ([unlocks.ts](../web/src/lib/unlocks.ts)). 부화 줄은 시안대로 "부화 · 종 공개" (예전 "표정 시작"은 부화 연출 카드에 "표정이 생겨요"로 남았다).

## 레벨별 장면 (해금 배경)

해금 배경은 화면 전체 장면이 된다 (2026-11-26 결정). [lib/unlocks.ts](../web/src/lib/unlocks.ts)의 `sceneFor(level)`가 장면 id를 고른다.

| 레벨 | id | 장면 |
| --- | --- | --- |
| 1~5 | `base` | 낮 장면 + 크림빛 덧칠 (흐린 아침) |
| 6~9 | `field` | 낮 장면 그대로 (들판) |
| 10~13 | `sunset` | 낮 장면 + 주황→자주 덧칠 (노을 언덕) |
| 14~16 | `night` | 밤 장면 그대로 (밤하늘, 404와 같은 그림) |
| 17~20 | `crystal` | 밤 장면 + 보라·하늘색 덧칠 (수정 동굴) |

- 값은 [globals.scss](../web/src/app/globals.scss)의 `--scene-m-<id>`(모바일 세로) / `--scene-d-<id>`(데스크톱 가로). 한 값이 `덧칠, 그림` 두 겹이다.
- ? 원본 그림이 낮·밤 두 장뿐이라 노을·수정 동굴·기본은 덧칠로 만들었다. 전용 PNG가 생기면 `public/game/`에 넣고 그 토큰의 `url()`만 바꾸면 된다 (덧칠은 `--tint-none`).
- 적용: 펫 화면은 `<main data-scene>` → [layout.module.scss](../web/src/app/layout.module.scss)의 `.shell:has([data-scene=…])`가 화면 전체 배경을 바꾼다. 내 펫 목록 카드·랭킹 "내 펫" 카드도 그 펫 레벨의 장면을 쓴다.
- NFT 이미지는 시안대로 낮 장면 하나다 (레벨 장면을 넣지 않았다).

## RainbowKit 차이 (14 / D14 지갑 연결, 15 / D15 계정 메뉴)

테마로 색·모서리·글꼴·그림자만 바꿨다. 구조는 그대로라 아래는 맞출 수 없다.

- 지갑 연결: 시안은 모바일에서 아래 시트, RainbowKit은 가운데 모달이다.
- 지갑 연결: 시안의 "지갑이 처음이에요?" 초록 안내 카드 + "지갑 만들기 ›"가 없다. RainbowKit은 "이더리움 지갑에 처음 접하시나요? 더 알아보기" 한 줄이다. 문구도 RainbowKit 한국어 번역 그대로다.
- 지갑 연결: 지갑 줄이 흰 카드 + 두께 그림자 + "추천" 라임 딱지 모양이 아니다 (RainbowKit 목록 줄 모양 고정). 그룹 이름("설치됨", "추천")이 accentColor(라임)라 크림 바탕에서 대비가 낮다.
- 지갑 연결: `modalSize="compact"`로 좁은 창을 골랐다 (RainbowKit 옵션이며 마크업은 그대로). 원래 기본값은 `wide`.
- 계정 메뉴: 시안의 "Base · 펫 2마리 · 활동력 4" 줄, "최근 활동" 목록 모양(아이콘 상자 + 펫 이름), 빨간 "연결 해제" 두툼한 버튼을 그릴 수 없다. RainbowKit의 잔액 줄, 주소 복사·연결 해제 버튼, 최근 트랜잭션 목록이 대신한다.
- 계정 메뉴: 아바타는 RainbowKit이 주소별 그림을 그린다 (시안은 산호색 구슬). 헤더 버튼의 아바타만 시안대로 구슬이다.
- 글꼴: 모달 전체가 `--font-display` 스택 하나다. 주소에 고정폭 글꼴을 쓰지 않기로 했으므로 차이는 없다.
- 그림자: `0 5px 0` 두께는 모달 카드와 계정 메뉴 버튼에만 들어간다. 지갑 목록 줄에는 테마 값이 없다.

## 미결 (정할 것)

- 종·성격·색 칩: 02 / D2 보드에 없어서 뺐다. 종은 내 펫 목록(04)과 구경 패널(D11)에만 나온다.
- 컨트랙트 ERC-721 이름 `"Silo Pet"`: 이미 배포된 값이라 그대로다.
- 레벨업 보상 알약의 아이콘은 셔츠 하나다 (시안 07 그대로). 칭호·배경 레벨에서도 셔츠가 나온다.

## 확인 방법

로컬 anvil에 배포하고 Playwright로 EIP-6963 테스트 지갑을 주입해 390×844 / 1440×900에서 각 상태를 찍어 보드와 비교했다 (코드에는 넣지 않았다).
진행 중(06)은 anvil `evm_setAutomine false`로 블록을 멈춰서, 실패(10)는 `eth_sendTransaction`을 일부러 실패시켜서 재현했다.
동작 줄이기(prefers-reduced-motion): Playwright `emulateMedia({ reducedMotion: "reduce" })`로 레벨업을 띄워 리본 transform이 없고 빛줄기·색종이 CSS 애니메이션이 `none`인 것, "건너뛰기"로 닫히는 것을 확인했다. Motion은 `MotionConfig reducedMotion="user"`, CSS 애니메이션은 각 scss의 `@media (prefers-reduced-motion: reduce)`가 맡는다.
