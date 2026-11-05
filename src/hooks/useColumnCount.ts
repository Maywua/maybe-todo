import { useEffect, useState } from "react";

/** 页面宽度阈值：>= 1024 四列，>= 768 三列，其余两列。 */
export const COLUMN_BREAKPOINTS = [1024, 768] as const;

function resolveColumnCount(width: number): number {
  if (width >= COLUMN_BREAKPOINTS[0]) return 4;
  if (width >= COLUMN_BREAKPOINTS[1]) return 3;
  return 2;
}

export function useColumnCount(): number {
  const [count, setCount] = useState(() =>
    typeof window === "undefined" ? 4 : resolveColumnCount(window.innerWidth),
  );

  useEffect(() => {
    const update = () => setCount(resolveColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}
