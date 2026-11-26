// * 아래에서 올라오는 시트 (시안 14·15·16의 크림 시트 모양). 모바일 "펫 정보", "해금 목록"에 쓴다.
//   데스크톱에서는 화면 가운데 카드로 뜬다.
//   ? 왜 <div> 대신 <dialog>일까? showModal()로 열면 브라우저가 알아서
//     ① 뒤 화면을 못 누르게 막고 ② 키보드 포커스를 시트 안에 가두고 ③ Esc로 닫아 준다. 직접 만들면 버그가 많은 부분이다.
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";
import styles from "./Sheet.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // * open prop ↔ 실제 dialog 상태 맞추기. <dialog open>속성으로 열면 "모달"이 아니라서 showModal()을 직접 부른다.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-label={title}
      // Esc나 close()로 닫히면 부모 상태도 닫힘으로 맞춘다
      onClose={onClose}
      // * 바깥(어두운 막)을 누르면 닫기. 막을 누르면 클릭 대상이 dialog 자신이다 (안쪽 내용을 누르면 그 자식이 대상)
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.body}>
        <span className={styles.grabber} aria-hidden />
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <CloseIcon size={20} />
          </button>
        </div>
        {/* 닫혀 있을 때는 내용을 그리지 않는다 (안 보이는 패널이 타이머·읽기를 돌리지 않게) */}
        {open && children}
      </div>
    </dialog>
  );
}
