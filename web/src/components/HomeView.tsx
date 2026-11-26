// * 홈 / 입양 화면 (5강, SPEC 12장 화면 표 "홈 / 입양").
//   상태 세 가지:
//   ① 미연결: 게임 소개, 진화 단계 미리보기, "지갑 연결"
//   ② 연결됨 + 펫 없음: 흔들리는 알과 "입양하기"
//   ③ 펫 있음: 내 펫 목록 → 누르면 내 펫 화면으로
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Address } from "viem";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import { useMyPets } from "@/hooks/useMyPets";
import { usePet } from "@/hooks/usePet";
import { usePetAction } from "@/hooks/usePetAction";
import { chain } from "@/lib/chain";
import { petNft } from "@/lib/contracts";
import { toErrorMessage } from "@/lib/errors";
import { getPetLook, STAGE_NAME, type Stage } from "@/lib/look";
import styles from "./HomeView.module.scss";
import { PetSprite } from "./PetSprite";
import { PetThumb } from "./PetThumb";

// * 진화 미리보기용 예시 DNA. 아무 uint32나 된다. 고정값이라 새로고침해도 같은 펫이 보인다.
//   (값을 바꾸면 미리보기 종·색이 바뀐다. 0x0003_0000대 = 종 값 0 → 북극곰)
const PREVIEW_DNA = 0x00030000;
const STAGES: Stage[] = [0, 1, 2, 3, 4];

export function HomeView() {
  const { address, isConnected } = useAccount();
  // * 이미 입양한 지갑인지. 펫을 남에게 보내면 "펫 0마리 + 입양 불가"가 될 수 있다 (컨트랙트: 지갑당 입양 1번).
  //   AdoptPanel이 버튼 대신 안내를 보여주는 데 쓰고, 아래 useMyPets의 다시 찾기 조건으로도 쓴다.
  const { data: adopted } = useReadContract({
    ...petNft,
    functionName: "hasAdopted",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  // 입양했는데 펫이 안 보이면 5초마다 다시 찾는다 (입양 직후 RPC 노드 지연 대비, useMyPets 주석)
  const myPets = useMyPets(address, { pollWhileEmpty: !!adopted });

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Silo Pets</h1>
        <p className={styles.lead}>펫을 입양하고, 밥을 주고, 훈련시켜 진화시키는 온체인 육성 게임</p>
      </section>

      {/* ① 미연결 */}
      {!isConnected && (
        <>
          <EvolutionPreview />
          <ul className={styles.rules}>
            <li>입양은 무료예요. 지갑마다 한 번, 활동력 10을 같이 받아요.</li>
            <li>밥(활동력 1)은 +10, 훈련(활동력 3)은 +40 경험치. 24시간 굶기면 훈련 효과가 반으로 줄어요.</li>
            <li>Lv 3에 부화하고, Lv 7·12·20에 진화해요. 펫 그림과 NFT 이미지가 같이 바뀌어요.</li>
          </ul>
          <ConnectButton label="지갑 연결" />
        </>
      )}

      {/* 연결됨: 내 펫을 찾는 중 → ② 또는 ③ */}
      {isConnected && address && (
        <>
          {myPets.isPending && <p className={styles.muted}>내 펫을 찾는 중…</p>}
          {myPets.error && <p className={styles.muted}>내 펫을 불러오지 못했어요. 새로고침해 주세요</p>}
          {myPets.data && myPets.data.length === 0 && <AdoptPanel adopted={!!adopted} />}
          {myPets.data && myPets.data.length > 0 && <MyPetList ids={myPets.data} viewer={address} />}
        </>
      )}
    </main>
  );
}

/** 진화 단계 미리보기: 같은 DNA를 단계만 바꿔 다섯 번 그린다 (SPEC 6-3) */
function EvolutionPreview() {
  return (
    <ol className={styles.preview} aria-label="진화 단계">
      {STAGES.map((stage) => (
        <li key={stage}>
          <PetSprite look={getPetLook({ dna: PREVIEW_DNA, stage, emotion: "idle" })} size={88} />
          <span>{STAGE_NAME[stage]}</span>
        </li>
      ))}
    </ol>
  );
}

/** ② 펫이 없을 때: 흔들리는 알 + 입양하기 */
function AdoptPanel({ adopted }: { adopted: boolean }) {
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

  // 잘못된 네트워크: PetActions와 같은 처리 (지갑 체인 ≠ 앱 체인이면 전환 버튼만)
  if (chainId !== chain.id) {
    return (
      <button className={styles.adopt} disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
        {switching ? "지갑에서 확인" : `${chain.name}로 전환`}
      </button>
    );
  }

  const busy = action.phase !== "idle";
  const label = {
    idle: "입양하기",
    simulating: "확인 중",
    signing: "지갑에서 확인",
    confirming: "부화장으로 가는 중…",
  }[action.phase];
  const errorText = action.error ? toErrorMessage(action.error) : null;

  return (
    <section className={styles.adoptPanel}>
      {/* 흔들리는 알. 종은 입양 순간 DNA로 정해지니 아직 모른다 → 미리보기 DNA의 알 그림 */}
      <div className={styles.wobble}>
        <PetSprite look={getPetLook({ dna: PREVIEW_DNA, stage: 0, emotion: "idle" })} size={200} />
      </div>
      {adopted ? (
        <p className={styles.muted}>이미 입양한 지갑이에요. 펫을 다른 지갑으로 보냈다면 그 지갑에서 볼 수 있어요</p>
      ) : (
        <>
          <button className={styles.adopt} disabled={busy} onClick={() => action.mutate({ fn: "adopt" })}>
            {busy && action.phase === "confirming" && <span className={styles.spinner} aria-hidden />}
            {label}
          </button>
          <p className={styles.muted}>무료예요. 가스비만 들어요</p>
        </>
      )}
      {errorText && (
        <p className={styles.error} role="alert">
          {errorText}
        </p>
      )}
    </section>
  );
}

/** ③ 내 펫 목록. 보통 1마리지만 선물받거나 사면 여러 마리다 */
function MyPetList({ ids, viewer }: { ids: bigint[]; viewer: Address }) {
  return (
    <section className={styles.myPets}>
      <h2 className={styles.sectionTitle}>내 펫</h2>
      <ul className={styles.petList}>
        {ids.map((id) => (
          <li key={id.toString()}>
            <MyPetItem id={id} viewer={viewer} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MyPetItem({ id, viewer }: { id: bigint; viewer: Address }) {
  const { data: pet } = usePet(id, viewer);
  return (
    <Link href={`/pet/${id}`} className={styles.petLink}>
      {pet ? (
        <PetThumb
          look={getPetLook({ dna: pet.dna, stage: pet.stage, emotion: pet.hungry ? "hungry" : "idle" })}
          size={72}
        />
      ) : (
        <span className={styles.thumbPlaceholder} />
      )}
      <span className={styles.petName}>Mochi #{id.toString()}</span>
      {pet && <span className={styles.petLevel}>Lv {pet.level.toString()}</span>}
      <span className={styles.go}>보러 가기 →</span>
    </Link>
  );
}
