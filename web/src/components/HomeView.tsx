// * 홈 (5강, 리디자인 시안 01 / D1, 05 / D5, 04 / D4).
//   상태 네 가지:
//   ① 미연결            → 01: 큰 제목 + 펫 + 크림 시트(게임 소개, 진화 단계, "무료로 입양하기")
//   ② 연결됨 + 펫 없음  → 05: 흔들리는 알 + 크림 시트(입양하기, 진행 단계)
//   ③ 펫 1마리          → 그 펫 화면(/pet/{id})으로 바로 이동 (목록을 보여줄 이유가 없다)
//   ④ 펫 2마리 이상     → 04: 내 펫 목록 (MyPetList.tsx)
//   모바일은 아래 크림 시트, 데스크톱(900px~)은 오른쪽 440px 카드 (HomeView.module.scss의 grid-template-areas).
"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import { useMyPets } from "@/hooks/useMyPets";
import { usePetAction } from "@/hooks/usePetAction";
import { chain } from "@/lib/chain";
import { petNft } from "@/lib/contracts";
import { toErrorMessage } from "@/lib/errors";
import { getPetLook, STAGE_NAME, type Stage } from "@/lib/look";
import { BoltIcon, BowlIcon, DumbbellIcon, EggIcon, HeartIcon, PawIcon } from "./icons";
import { MyPetList } from "./MyPetList";
import { Notice } from "./Notice";
import { PetSprite } from "./PetSprite";
import { StatusCard } from "./StatusCard";
import { StepPills } from "./StepPills";
import styles from "./HomeView.module.scss";

// * 미리보기용 예시 DNA. 아무 uint32나 된다. 고정값이라 새로고침해도 같은 펫이 보인다.
//   (값을 바꾸면 미리보기 종·색이 바뀐다. 0x0003_0000대 = 종 값 0 → 북극곰)
const PREVIEW_DNA = 0x00030000;
const STAGES: Stage[] = [0, 1, 2, 3, 4];
// 단계가 시작되는 레벨 (look.ts의 stageFromLevel과 같은 구간)
const STAGE_LEVEL: Record<Stage, number> = { 0: 1, 1: 3, 2: 7, 3: 12, 4: 20 };

export function HomeView() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  // * 이미 입양한 지갑인지. 펫을 남에게 보내면 "펫 0마리 + 입양 불가"가 될 수 있다 (컨트랙트: 지갑당 입양 1번).
  const { data: adopted } = useReadContract({
    ...petNft,
    functionName: "hasAdopted",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  // 입양했는데 펫이 안 보이면 5초마다 다시 찾는다 (입양 직후 RPC 노드 지연 대비, useMyPets 주석)
  const myPets = useMyPets(address, { pollWhileEmpty: !!adopted });
  const ids = myPets.data;

  // ③ 펫이 딱 한 마리면 바로 그 펫 화면으로. replace: 뒤로 가기에 홈이 끼지 않게 (뒤로 가면 다시 이동되는 고리 방지)
  const onlyOne = ids?.length === 1 ? ids[0] : null;
  useEffect(() => {
    if (onlyOne !== null) router.replace(`/pet/${onlyOne}`);
  }, [onlyOne, router]);

  // ① 미연결
  if (!isConnected || !address) return <Intro />;

  // 연결됨: 내 펫을 찾는 중 / 실패 (시안 12의 "같은 틀" 카드)
  if (myPets.isPending || onlyOne !== null) {
    return (
      <main className={styles.center}>
        <StatusCard kind="loading" title="불러오는 중" detail="내 펫을 찾고 있어요" />
      </main>
    );
  }
  if (myPets.error || !ids) {
    return (
      <main className={styles.center}>
        <StatusCard
          kind="error"
          title="불러오지 못했어요"
          detail="네트워크를 확인해 주세요"
          onRetry={() => void myPets.refetch()}
        />
      </main>
    );
  }

  // ② 펫 없음 → 입양, ④ 2마리 이상 → 목록
  return ids.length === 0 ? <Adopt adopted={!!adopted} /> : <MyPetList ids={ids} viewer={address} />;
}

// =====================================================================
// ① 01 / D1 미연결
// =====================================================================
function Intro() {
  // openConnectModal: RainbowKit 지갑 선택 창을 여는 함수 (연결돼 있으면 undefined)
  const { openConnectModal } = useConnectModal();

  return (
    <main className={styles.home}>
      <div className={styles.hero}>
        <h1 className={styles.logo}>Mochimals</h1>
        <p className={styles.tagline}>밥 주고 훈련하면 진화하는 온체인 펫</p>
      </div>

      <div className={styles.scene}>
        <div className={styles.petWrap}>
          <p className={styles.bubble}>같이 놀자!</p>
          <PetSprite
            look={getPetLook({ dna: PREVIEW_DNA, stage: 1, emotion: "happy" })}
            size={320}
            className={styles.pet}
          />
        </div>
      </div>

      <section className={styles.sheet} aria-labelledby="intro-title">
        <span className={styles.grabber} aria-hidden />
        <h2 id="intro-title" className={styles.sheetTitle}>
          모치를 입양해서 키워 보세요
        </h2>
        {/* 데스크톱에서만 보이는 설명 (시안 D1) */}
        <p className={styles.sheetDesc}>
          밥 주고 훈련할수록 레벨이 오르고, 다섯 번 모습이 바뀌어요. 성장 기록은 전부 체인에 남아요.
        </p>

        {/* 규칙 세 칸 (예전 홈의 규칙 목록을 시안의 카드로) */}
        <ul className={styles.rules}>
          <li>
            <span className={styles.chipAmber}>
              <BowlIcon size={20} />
            </span>
            <strong>밥 +10</strong>
            <span>활동력 1</span>
          </li>
          <li>
            <span className={styles.chipBlue}>
              <DumbbellIcon size={20} />
            </span>
            <strong>훈련 +40</strong>
            <span>활동력 3</span>
          </li>
          <li>
            <span className={styles.chipPink}>
              <HeartIcon size={20} />
            </span>
            <strong>24시간</strong>
            <span>굶으면 배고파요</span>
          </li>
        </ul>

        {/* 진화 단계 미리보기: 같은 DNA를 단계만 바꿔 다섯 번 그린다 (SPEC 6-3) */}
        <ol className={styles.stages} aria-label="진화 단계">
          {STAGES.map((stage) => (
            <li key={stage}>
              <span className={stage === 4 ? styles.stageThumbGold : styles.stageThumb}>
                <PetSprite look={getPetLook({ dna: PREVIEW_DNA, stage, emotion: "idle" })} size={50} />
              </span>
              <strong>{STAGE_NAME[stage]}</strong>
              <span>Lv {STAGE_LEVEL[stage]}</span>
            </li>
          ))}
        </ol>

        {/* * 미연결 상태의 입양 버튼 = 지갑 연결 창 열기. 연결되면 홈이 ② 입양 화면으로 바뀐다 */}
        <button type="button" className={styles.cta} onClick={openConnectModal}>
          <EggIcon size={24} />
          무료로 입양하기
        </button>
        <a className={styles.help} href="https://ethereum.org/ko/wallets/" target="_blank" rel="noreferrer">
          지갑이 처음이에요? ›
        </a>
      </section>
    </main>
  );
}

// =====================================================================
// ② 05 / D5 입양
// =====================================================================
const ADOPT_STEPS = ["지갑 확인", "블록 확정", "부화장 이동"] as const;

function Adopt({ adopted }: { adopted: boolean }) {
  const router = useRouter();
  const { chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();

  const action = usePetAction({
    // * 입양 영수증의 Adopted 이벤트에서 새 펫 번호를 바로 꺼낸다 (SPEC 8장 "입양 직후에는 영수증의 Adopted에서").
    //   ? 왜 useMyPets를 다시 읽어 찾지 않을까? 모든 펫의 ownerOf를 읽어야 하고 RPC 노드 지연도 탈 수 있다. 방금 받은 영수증에 답이 이미 있다.
    onDone: ({ events }) => {
      const adoptedEvent = events.find((e) => e.eventName === "Adopted");
      if (adoptedEvent?.eventName === "Adopted") router.push(`/pet/${adoptedEvent.args.petId}`);
    },
    // 새로고침 뒤 이어받기: 홈에서는 입양만
    resumeIf: (a) => a.fn === "adopt",
  });

  const wrongNetwork = chainId !== chain.id;
  const busy = action.phase !== "idle";
  // 진행 단계: 확인·서명 = 0, 블록 확정 = 1 (확정이 끝나면 바로 펫 화면으로 이동하니 2는 이동 중에 잠깐)
  const step = action.phase === "confirming" ? 1 : 0;
  const label = {
    idle: "입양하기",
    simulating: "확인 중…",
    signing: "지갑에서 확인해 주세요",
    confirming: "부화장으로 가는 중…",
  }[action.phase];
  const errorText = action.error ? toErrorMessage(action.error) : null;

  return (
    <main className={styles.homeWide}>
      <div className={styles.scene}>
        {/* 뒤의 노란 빛 + 기울어진 흰 원 안의 알 + 말풍선 (시안 05) */}
        <div className={styles.eggWrap}>
          <span className={styles.glow} aria-hidden />
          <span className={styles.eggCircle}>
            <PetSprite
              look={getPetLook({ dna: PREVIEW_DNA, stage: 0, emotion: "idle" })}
              size={170}
              className={styles.egg}
            />
          </span>
          <p className={styles.bubbleEgg}>알이 흔들려요!</p>
        </div>
      </div>

      <section className={styles.sheet} aria-labelledby="adopt-title">
        <span className={styles.grabber} aria-hidden />
        <h1 id="adopt-title" className={styles.sheetTitle}>
          알 하나를 받을 수 있어요
        </h1>
        <p className={styles.sheetSub}>어떤 종이 나올지는 Lv 3에 부화할 때 알 수 있어요</p>

        <ul className={styles.facts}>
          <li>
            <span className={styles.factLime}>
              <EggIcon size={14} />
            </span>
            무료 · 가스비만
          </li>
          <li>
            <span className={styles.factAmber}>
              <BoltIcon size={14} />
            </span>
            활동력 +10
          </li>
          <li>
            <span className={styles.factBlue}>
              <PawIcon size={14} />
            </span>
            지갑당 1마리
          </li>
        </ul>

        {adopted ? (
          <Notice
            icon={
              <span className={styles.factBlue}>
                <PawIcon size={14} />
              </span>
            }
          >
            이미 입양한 지갑이에요. 펫을 다른 지갑으로 보냈다면 그 지갑에서 볼 수 있어요
          </Notice>
        ) : wrongNetwork ? (
          // 잘못된 네트워크: 지갑 체인 ≠ 앱 체인이면 전환 버튼만 (시안 13의 전환 시트도 같이 뜬다)
          <button className={styles.cta} disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
            {switching ? "지갑에서 확인해 주세요" : `${chain.name}로 전환`}
          </button>
        ) : (
          <>
            <button
              className={styles.cta}
              disabled={busy}
              aria-busy={busy}
              onClick={() => action.mutate({ fn: "adopt" })}
            >
              {!busy && <EggIcon size={24} />}
              {label}
            </button>
            {/* 누른 뒤에만 진행 단계를 보여준다 (시안의 "누른 뒤 버튼 상태") */}
            {busy && <StepPills steps={ADOPT_STEPS} active={step} stretch />}
          </>
        )}

        {errorText && (
          <p className={styles.error} role="alert">
            {errorText}
          </p>
        )}
      </section>
    </main>
  );
}
