# Mochimals 리디자인

Claude Design 캔버스("Mochimals — Game UI", 모바일 01–16 / 데스크톱 D1–D16 / NFT 페이지)를 실제 화면으로 옮긴 기록이다.
진행 순서: **1단계** 토큰·글꼴·RainbowKit 테마·헤더/HUD·`/pet/[id]` 기본(02 / D2) → 리뷰 → **2단계** 나머지 보드.

## 토큰

색·글꼴·간격은 전부 [globals.scss](../web/src/app/globals.scss)의 CSS 변수에만 있다. 컴포넌트에는 색 값을 쓰지 않는다.

| 이름 | 값 | 쓰임 |
| --- | --- | --- |
| `--ink` | #2D2645 | 글자, 레벨 링, 어두운 배지 |
| `--panel` / `--panel-edge` / `--panel-depth` | #FFFAF0 / #EADFCB / #DCCDB0 | 크림 패널, 테두리 2px, 아래 두께 그림자 |
| `--muted` | #655C7C | 보조 글자 |
| `--lime` / `--amber` / `--blue` / `--pink` / `--red` / `--grey` | 면 색 | 두툼한 버튼. 각각 `-depth` 짝이 있다 |

두툼한 버튼은 [styles/_ui.scss](../web/src/styles/_ui.scss)의 `chunky(tone)` mixin: `background: var(--tone)` + `box-shadow: 0 5px 0 var(--tone-depth)`. 비활성은 grey 짝.

글꼴은 [layout.tsx](../web/src/app/layout.tsx)의 `next/font`: Jua(제목·버튼·숫자) `--font-display`, Noto Sans KR(본문) `--font-body`, JetBrains Mono(주소·해시) `--font-mono`.

화면 폭 기준은 900px 하나 ([_breakpoints.scss](../web/src/styles/_breakpoints.scss)의 `desktop` / `mobile` mixin). 900px 미만 = HUD + 아래 탭 바, 이상 = 위쪽 내비 + 오른쪽 패널 + 아래 행동 트레이.

## 에셋

[web/public/game/](../web/public/game/)에 받아 두었다.

| 파일 | 쓰임 |
| --- | --- |
| `scene-mobile-day.png`, `scene-desktop-day.png` | 기본 장면 배경 (layout `.shell`) |
| `scene-mobile-night.png`, `scene-desktop-night.png` | 부화·진화·404 보드 (2단계) |
| `placeholder-*.png` | 시안의 펫 오려낸 그림. **화면에서 쓰지 않는다.** 펫은 기존 아트 파이프라인(`ACTIVE_ART_SET` → `PetSprite`)으로 그린다 |

## 화면 대응 (1단계)

| 보드 | 코드 |
| --- | --- |
| 공통 헤더 01 / D1 / D2 | [Header.tsx](../web/src/components/Header.tsx), [AccountButton.tsx](../web/src/components/AccountButton.tsx), [EnergyBadge.tsx](../web/src/components/EnergyBadge.tsx), [TabBar.tsx](../web/src/components/TabBar.tsx) |
| 02 / D2 내 펫 | [PetView.tsx](../web/src/components/PetView.tsx) → [PetHud.tsx](../web/src/components/PetHud.tsx), [PetCard.tsx](../web/src/components/PetCard.tsx), [PetActions.tsx](../web/src/components/PetActions.tsx), [PetPanel.tsx](../web/src/components/PetPanel.tsx) (모바일은 "펫 정보" 시트) |
| 아이콘 | [icons.tsx](../web/src/components/icons.tsx) (시안 SVG, `currentColor`) |

## RainbowKit 차이 (14 / D14 지갑 연결, 15 / D15 계정 메뉴)

테마([rainbowTheme.ts](../web/src/lib/rainbowTheme.ts))로 색·모서리·글꼴·그림자만 바꿨다. 구조는 그대로라 아래는 맞출 수 없다.

- 지갑 연결: 시안은 모바일에서 아래 시트, RainbowKit은 가운데 모달이다.
- 지갑 연결: 시안의 "지갑이 처음이에요?" 초록 안내 카드 + "지갑 만들기 ›"가 없다. RainbowKit은 "이더리움 지갑에 처음 접하시나요? 더 알아보기" 한 줄이다. 문구도 RainbowKit 한국어 번역 그대로다.
- 지갑 연결: 지갑 줄이 흰 카드 + 두께 그림자 + "추천" 라임 딱지 모양이 아니다 (RainbowKit 목록 줄 모양 고정).
- 지갑 연결: `modalSize="compact"`로 좁은 창을 골랐다 (RainbowKit 옵션이며 마크업은 그대로). 원래 기본값은 `wide`.
- 계정 메뉴: 시안의 "Base · 펫 2마리 · 활동력 4" 줄, "최근 활동" 목록 모양(아이콘 상자 + 펫 이름), 빨간 "연결 해제" 두툼한 버튼을 그릴 수 없다. RainbowKit의 주소 복사·연결 해제 버튼과 최근 트랜잭션 목록이 대신한다.
- 계정 메뉴: 아바타는 RainbowKit이 주소별 그림을 그린다 (시안은 산호색 구슬). 헤더 버튼의 아바타만 시안대로 구슬이다.
- 글꼴: 모달 전체가 Jua 하나다. 주소를 JetBrains Mono로 따로 줄 수 없다.
- 그림자: `0 5px 0` 두께는 모달 카드에만 들어간다. 모달 안 버튼에는 테마 값이 없다.
- 링크 색: "더 알아보기"가 accentColor(라임)라 크림 바탕에서 대비가 낮다.

## 미결 (리뷰 때 정할 것)

- 해금 배경(Lv 6 들판 / 10 노을 / 14 밤하늘 / 17 수정 동굴): 펫 화면이 장면 그림으로 바뀌어 지금은 칠하지 않는다. 장면 그림을 바꿀지, 없앨지.
- 종·성격·색 칩: 예전 펫 카드에 있던 "어린이 · 돼지 · 활발 · 분홍" 칩이 02 / D2 보드에 없어서 뺐다. 정보 패널에 줄로 둘지.
- "내 펫" 메뉴 링크: 펫이 1마리면 `/pet/{id}`, 아니면 `/`.
