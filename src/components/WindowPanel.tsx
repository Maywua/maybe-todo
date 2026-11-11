import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PanelStyle } from "../lib/settings";
import { CloseIcon } from "./icons";

interface Props {
  title: string;
  panelStyle: PanelStyle;
  onClose: () => void;
  actions?: ReactNode;
  sidebar?: ReactNode;
  topNav?: ReactNode;
  widthClass?: string;
  children: ReactNode;
}

const CLOSE_MS = 180;

export default function WindowPanel({
  title,
  panelStyle,
  onClose,
  actions,
  sidebar,
  topNav,
  widthClass = "max-w-[760px]",
  children,
}: Props) {
  const [activeStyle] = useState(panelStyle);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="alertdialog"]')) return;
      event.preventDefault();
      requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  const overlayPosition =
    activeStyle === "card"
      ? "items-end justify-center p-0"
      : activeStyle === "drawer"
        ? "items-stretch justify-end p-0"
        : "items-center justify-center p-4";

  const dialogShape =
    activeStyle === "card"
      ? `${widthClass} h-[80vh] rounded-t-3xl border-b-0`
      : activeStyle === "drawer"
        ? `${widthClass} h-full max-h-none rounded-l-3xl border-r-0`
        : `${widthClass} h-[80vh] rounded-3xl`;

  const dialogAnimation = closing
    ? activeStyle === "card"
      ? "animate-sheet-out"
      : activeStyle === "drawer"
        ? "animate-drawer-out"
        : "animate-window-flip-out"
    : activeStyle === "card"
      ? "animate-sheet-in"
      : activeStyle === "drawer"
        ? "animate-drawer-in"
        : "animate-window-flip-in";

  return (
    <div
      className={`fixed inset-0 z-40 flex bg-ink/25 ${overlayPosition} ${
        closing ? "animate-fade-out" : "animate-fade"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`flex w-full flex-col overflow-hidden border border-line bg-card shadow-[0_30px_80px_-30px_rgba(27,26,22,0.6)] outline-none ${dialogShape} ${dialogAnimation}`}
      >
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line/70 px-3">
          <span className="text-[13px] font-semibold tracking-tight text-ink/80">
            {title}
          </span>
          <div className="min-w-0 flex-1" />
          {actions}
          <button
            type="button"
            aria-label={`关闭${title}`}
            onClick={requestClose}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          {sidebar}
          <div className="flex min-w-0 flex-1 flex-col">
            {topNav}
            <div className="app-scroll min-h-0 flex-1 overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
