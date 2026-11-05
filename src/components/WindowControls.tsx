import { useEffect, useState } from "react";
import { inTauri } from "../lib/runtime";
import {
  closeWindow,
  isWindowMaximized,
  minimizeWindow,
  toggleWindowMaximize,
} from "../lib/window";
import {
  CloseIcon,
  MaximizeIcon,
  MinimizeIcon,
  RestoreIcon,
} from "./icons";

export default function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!inTauri) return;
    let alive = true;
    const sync = () => {
      void isWindowMaximized()
        .then((value) => {
          if (alive) setMaximized(value);
        })
        .catch(() => undefined);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => {
      alive = false;
      window.removeEventListener("resize", sync);
    };
  }, []);

  if (!inTauri) return null;

  return (
    <div className="ml-1 flex items-center border-l border-line/70 pl-1">
      <button
        type="button"
        aria-label="最小化窗口"
        title="最小化"
        onClick={() => void minimizeWindow()}
        className="grid h-9 w-[42px] cursor-pointer place-items-center rounded-lg text-ink/55 transition hover:bg-ink/5 hover:text-ink"
      >
        <MinimizeIcon className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={maximized ? "还原窗口" : "最大化窗口"}
        title={maximized ? "还原窗口" : "最大化"}
        onClick={() => {
          void toggleWindowMaximize().then(setMaximized);
        }}
        className="grid h-9 w-[42px] cursor-pointer place-items-center rounded-lg text-ink/55 transition hover:bg-ink/5 hover:text-ink"
      >
        {maximized ? (
          <RestoreIcon className="size-3.5" />
        ) : (
          <MaximizeIcon className="size-3.5" />
        )}
      </button>
      <button
        type="button"
        aria-label="关闭窗口"
        title="关闭"
        onClick={() => void closeWindow()}
        className="grid h-9 w-[42px] cursor-pointer place-items-center rounded-lg text-ink/55 transition hover:bg-[#c42b1c] hover:text-white"
      >
        <CloseIcon className="size-3.5" />
      </button>
    </div>
  );
}
