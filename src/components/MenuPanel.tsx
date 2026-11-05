import { useEffect, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  open: boolean;
  align?: "left" | "right";
  className: string;
  children: ReactNode;
}

const EXIT_MS = 210;

export default function MenuPanel({
  open,
  align = "left",
  className,
  children,
}: Props) {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    setExpanded(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    // 等 closed 状态先绘制一帧，下一帧再切到 open，过渡才会真正发生。
    const frame = window.requestAnimationFrame(() => setExpanded(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <div
      role="menu"
      data-state={expanded ? "open" : "closed"}
      data-align={align}
      className={`menu-panel ${className}`}
    >
      {children}
    </div>
  );
}
