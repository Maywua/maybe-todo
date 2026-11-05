import { useEffect, useRef, useState } from "react";

/**
 * 悬停展开、点击外部或按 Esc 关闭的小菜单。
 * 菜单本身放在同一个容器里，鼠标从按钮移到菜单项时不会触发关闭。
 */
export function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimer = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => clearTimer, []);

  const hoverProps = {
    onMouseEnter: () => {
      clearTimer();
      setOpen(true);
    },
    onMouseLeave: () => {
      clearTimer();
      closeTimer.current = window.setTimeout(() => setOpen(false), 180);
    },
  };

  return { open, setOpen, ref, hoverProps };
}
