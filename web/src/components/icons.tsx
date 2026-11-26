// * 아이콘 모음 (리디자인 시안의 SVG를 그대로 옮긴 것). 이모지 아이콘(⚡🔒)은 쓰지 않는다 (완료 기준 5번).
//   ! 색은 대부분 currentColor다 → 부모의 CSS color를 따라간다. 컴포넌트 scss에서 color만 바꾸면 된다.
//     로고처럼 여러 색이 필요한 것은 style의 fill에 토큰 변수(var(--lime))를 넣는다.
//     (fill="var(--x)" 속성은 브라우저마다 다르게 동작해서, CSS인 style로 준다)
//   aria-hidden: 장식이다. 뜻은 옆 글자나 버튼의 aria-label이 전한다.
import type { SVGProps } from "react";

type IconProps = { size?: number } & Omit<SVGProps<SVGSVGElement>, "width" | "height">;

/** 공통 틀: 24×24 좌표, 크기만 바꾼다 */
function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false} {...rest}>
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------
// 탭·내비
// ---------------------------------------------------------------
export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 11.5L12 4l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 20z" fill="currentColor" />
    </Svg>
  );
}

/** 발바닥 = 내 펫 */
export function PawIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="16" rx="5" ry="4.2" fill="currentColor" />
      <circle cx="6" cy="10" r="2.2" fill="currentColor" />
      <circle cx="18" cy="10" r="2.2" fill="currentColor" />
      <circle cx="9.3" cy="6.3" r="2.2" fill="currentColor" />
      <circle cx="14.7" cy="6.3" r="2.2" fill="currentColor" />
    </Svg>
  );
}

/** 트로피 = 랭킹 */
export function TrophyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="currentColor" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="10.5" y="13" width="3" height="4" fill="currentColor" />
      <rect x="7" y="17" width="10" height="3.5" rx="1.2" fill="currentColor" />
    </Svg>
  );
}

export function WalletIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="5.5" width="19" height="14" rx="3" fill="currentColor" />
      <rect x="14" y="10.5" width="7.5" height="4.5" rx="2" fill="currentColor" opacity="0.25" />
    </Svg>
  );
}

// ---------------------------------------------------------------
// 게임 수치
// ---------------------------------------------------------------
/** 번개 = 활동력 */
export function BoltIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.5 2L4.5 13.5h6.5l-1.5 8.5 9.5-12h-7z" fill="currentColor" />
    </Svg>
  );
}

/** 하트 = 배고픔 */
export function HeartIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21z"
        fill="currentColor"
      />
    </Svg>
  );
}

/** 별 = 경험치 */
export function StarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="currentColor" />
    </Svg>
  );
}

/** 반짝 = 해금·진화 */
export function SparkleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M12 2c.9 5.6 3.4 8.1 10 10-6.6 1.9-9.1 4.4-10 10-.9-5.6-3.4-8.1-10-10 6.6-1.9 9.1-4.4 10-10z"
        fill="currentColor"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------
// 행동
// ---------------------------------------------------------------
/** 밥그릇 = 밥 주기 */
export function BowlIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 11h18a9 9 0 0 1-18 0z" fill="currentColor" />
      <path
        d="M8.5 7.5c0-1.4 1.2-1.8 1.2-3.2M13.5 7.5c0-1.4 1.2-1.8 1.2-3.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** 아령 = 훈련 */
export function DumbbellIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="8" width="4" height="8" rx="1.5" fill="currentColor" />
      <rect x="18" y="8" width="4" height="8" rx="1.5" fill="currentColor" />
      <rect x="5" y="6" width="3.5" height="12" rx="1.5" fill="currentColor" />
      <rect x="15.5" y="6" width="3.5" height="12" rx="1.5" fill="currentColor" />
      <rect x="8" y="10.5" width="8" height="3" rx="1" fill="currentColor" />
    </Svg>
  );
}

/** 물방울(알) = 입양 */
export function EggIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5c4.2 0 7.5 7 7.5 11.5a7.5 7.5 0 0 1-15 0C4.5 9.5 7.8 2.5 12 2.5z" fill="currentColor" />
    </Svg>
  );
}

// ---------------------------------------------------------------
// 펫 화면 옆 버튼
// ---------------------------------------------------------------
/** 선물 상자 = 해금 목록 */
export function GiftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="9" width="18" height="4" rx="1" fill="currentColor" />
      <rect x="4.5" y="13" width="15" height="8" rx="1" fill="currentColor" />
      <path d="M12 9c-2-4.5-6.5-4.5-6.5-2S9 9 12 9zm0 0c2-4.5 6.5-4.5 6.5-2S15 9 12 9z" fill="currentColor" />
    </Svg>
  );
}

/** 정보 (i). ? 시안은 원과 i를 같은 색으로 칠해 i가 안 보였다. i는 패널색으로 파서 보이게 했다 */
export function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.5" fill="currentColor" />
      <rect x="10.7" y="10.5" width="2.6" height="7" rx="1.3" style={{ fill: "var(--panel)" }} />
      <circle cx="12" cy="7.3" r="1.6" style={{ fill: "var(--panel)" }} />
    </Svg>
  );
}

export function ShareIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M12 3v11M7.5 7.5L12 3l4.5 4.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M5 12v7.5h14V12"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** 산 = 배경 해금 */
export function MountainIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 20l7-11 4 6 3-4 6 9z" fill="currentColor" />
    </Svg>
  );
}

/** 눈 = 구경 중 (시안 11). 눈동자는 잉크색 */
export function EyeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" fill="currentColor" />
      <circle cx="12" cy="12" r="3.2" style={{ fill: "var(--ink)" }} />
    </Svg>
  );
}

/** 끊어진 고리 = 잘못된 네트워크 (시안 13) */
export function ChainIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="8.5" width="10" height="7" rx="3.5" stroke="currentColor" strokeWidth="2.6" fill="none" />
      <rect x="11.5" y="8.5" width="10" height="7" rx="3.5" stroke="currentColor" strokeWidth="2.6" fill="none" />
    </Svg>
  );
}

/** 물음표 (시안 12 404) */
export function QuestionIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="18.5" r="1.8" fill="currentColor" />
    </Svg>
  );
}

/** 셔츠 = 액세서리 해금 */
export function ShirtIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 3l4 2.5L16 3l5 3.5-2.5 4L16 9v12H8V9l-2.5 1.5L3 6.5z" fill="currentColor" />
    </Svg>
  );
}

// ---------------------------------------------------------------
// 공통
// ---------------------------------------------------------------
export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** 바깥 링크 (OpenSea, Basescan) */
export function ExternalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** 자물쇠 = 잠긴 해금 */
export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="10.5" width="14" height="10.5" rx="2.5" fill="currentColor" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="2.6" fill="none" />
    </Svg>
  );
}

/**
 * * 로고 (모치 얼굴 + 새싹). 28×28 좌표. 여러 색이라 토큰 변수를 style로 넣는다.
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden focusable={false}>
      <path
        d="M14 9c-1.2-3.2-3.9-4.4-6.6-3.8.6 2.8 3.3 4.2 6.6 3.8zM14 9c1.2-3.2 3.9-4.4 6.6-3.8-.6 2.8-3.3 4.2-6.6 3.8z"
        style={{ fill: "var(--logo-leaf)" }}
      />
      <rect x="2" y="9" width="24" height="18" rx="9" style={{ fill: "var(--lime)" }} />
      <rect x="2" y="9" width="24" height="18" rx="9" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="2" />
      <circle cx="10" cy="17.5" r="1.9" style={{ fill: "var(--ink)" }} />
      <circle cx="18" cy="17.5" r="1.9" style={{ fill: "var(--ink)" }} />
      <path
        d="M12.4 21q1.6 1.3 3.2 0"
        style={{ stroke: "var(--ink)" }}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
