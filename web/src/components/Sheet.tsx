// * 아래에서 올라오는 시트 (시안 14·15·16의 크림 시트 모양). 모바일 "펫 정보", "해금 목록"에 쓴다.
//   데스크톱에서는 화면 가운데 카드로 뜬다.
//   ? 왜 <div> 대신 <dialog>일까? showModal()로 열면 브라우저가 알아서
//     ① 뒤 화면을 못 누르게 막고 ② 키보드 포커스를 시트 안에 가두고 ③ Esc로 닫아 준다. 직접 만들면 버그가 많은 부분이다.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CloseIcon } from "./icons";
import styles from "./Sheet.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 제목 옆 작은 글자 (예: 해금 목록 "7/24") */
  titleSuffix?: ReactNode;
  /** 데스크톱에서 넓은 카드 (720px, 시안 D16 해금 목록) */
  wide?: boolean;
  /** 제목 위 큰 아이콘 (시안 13 빨간 고리) */
  icon?: ReactNode;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, titleSuffix, wide = false, icon, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // * 내용을 그릴지. open이 false가 돼도 "닫히는 연출"이 끝날 때까지는 내용을 남겨 둬야 한다.
  //   (안 그러면 내용이 먼저 사라져 빈 시트가 쪼그라들며 내려간다)
  //   열릴 때는 렌더 중에 바로 true로 맞추고 (React 공식 "prop이 바뀔 때 상태 고치기" 패턴), 닫힘 연출이 끝나면 false.
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);

  // * 지금 open prop을 이벤트 처리기에서 읽기 위한 ref (아래 onClose 참고)
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // * open prop ↔ 실제 dialog 상태 맞추기. <dialog open>속성으로 열면 "모달"이 아니라서 showModal()을 직접 부른다.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      // 닫히는 도중에 다시 열렸으면 닫힘 연출을 취소한다 (rise 애니메이션이 다시 튼다)
      dialog.removeAttribute("data-closing");
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;

    // * 닫기: close()는 dialog를 즉시 숨겨서 CSS로 사라지는 연출을 줄 틈이 없다.
    //   그래서 ① data-closing 속성을 붙여 내려가는 애니메이션(Sheet.module.scss)을 틀고
    //   ② 그 애니메이션이 끝난 뒤에 진짜 close()를 부른다.
    dialog.setAttribute("data-closing", "");
    let cancelled = false; // 연출 도중 다시 열리거나 컴포넌트가 사라지면 close()를 부르지 않는다
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      dialog.removeAttribute("data-closing");
      dialog.close();
      setRendered(false);
    };
    // ? getAnimations(): 이 요소에 지금 걸린 애니메이션 목록. 부르는 순간 브라우저가 스타일을 계산하므로
    //   방금 붙인 data-closing의 애니메이션도 들어 있다. 각 애니메이션의 finished(Promise)를 기다린다.
    //   (subtree를 안 켜서 안쪽 스피너 같은 무한 애니메이션은 기다리지 않는다)
    const animations = dialog.getAnimations();
    Promise.all(animations.map((a) => a.finished)).then(finish, finish);
    // ! 안전장치: 애니메이션이 없거나(브라우저 설정 등) finished가 안 오면 0.4초 뒤에 그냥 닫는다
    const timer = setTimeout(finish, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.sheet} ${wide ? styles.wide : ""}`}
      aria-label={title}
      // * Esc: 브라우저가 바로 닫기 전에 cancel 이벤트가 온다. 기본 동작(즉시 닫기)을 막고
      //   부모에게 "닫아 줘"라고만 알린다 → open=false → 위 effect가 닫힘 연출을 튼 뒤 닫는다.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // * 브라우저가 연출 없이 직접 닫은 경우(예: cancel을 막지 못한 두 번째 Esc)에만 부모 상태를 맞춘다.
      //   ! 우리가 effect에서 close()를 부른 경우(openRef가 false)에는 부르지 않는다.
      //     close 이벤트는 나중에(비동기로) 와서, 그사이 부모가 다른 시트를 열었으면 (예: 펫 정보 → 해금 목록 "See all")
      //     그 시트까지 닫아 버린다.
      onClose={() => {
        if (openRef.current) onClose();
      }}
      // * 바깥(어두운 막)을 누르면 닫기. 막을 누르면 클릭 대상이 dialog 자신이다 (안쪽 내용을 누르면 그 자식이 대상)
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.body}>
        <span className={styles.grabber} aria-hidden />
        {icon}
        <div className={styles.head}>
          <h2 className={styles.title}>
            {title}
            {titleSuffix && <span className={styles.suffix}>{titleSuffix}</span>}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </div>
        {/* 닫혀 있을 때는 내용을 그리지 않는다 (안 보이는 패널이 타이머·읽기를 돌리지 않게).
            단 닫히는 연출 동안(rendered)은 남겨 둔다 */}
        {(open || rendered) && children}
      </div>
    </dialog>
  );
}
