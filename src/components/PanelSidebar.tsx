import type { ReactNode } from "react";
import {
  InfoIcon,
  PowerIcon,
  SettingsIcon,
  TrashIcon,
} from "./icons";

export type PanelTab = "settings" | "trash" | "about";

interface Props {
  active: PanelTab;
  onSelect: (tab: PanelTab) => void;
  onExit: () => void;
}

const items: Array<{
  id: PanelTab;
  label: string;
  icon: ReactNode;
}> = [
  { id: "settings", label: "设置", icon: <SettingsIcon className="size-4" /> },
  { id: "trash", label: "回收站", icon: <TrashIcon className="size-4" /> },
  { id: "about", label: "关于", icon: <InfoIcon className="size-4" /> },
];

export default function PanelSidebar({ active, onSelect, onExit }: Props) {
  return (
    <aside className="hidden w-40 shrink-0 flex-col border-r border-line/70 p-2 md:flex">
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelect(item.id)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition ${
                selected
                  ? "bg-(--theme-dark) text-paper"
                  : "text-ink/70 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              <span
                className={`grid size-4 shrink-0 place-items-center ${
                  selected ? "text-paper/70" : "text-muted"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line/70 pt-2">
        <button
          type="button"
          onClick={onExit}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-muted transition hover:bg-ink/5 hover:text-ink"
        >
          <span className="grid size-4 shrink-0 place-items-center">
            <PowerIcon className="size-4" />
          </span>
          退出
        </button>
      </div>
    </aside>
  );
}

export function PanelTopNav({ active, onSelect, onExit }: Props) {
  return (
    <div className="flex w-full shrink-0 items-center gap-0.5 border-b border-line/70 px-5 py-2 md:hidden">
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            title={item.label}
            aria-current={selected ? "page" : undefined}
            onClick={() => onSelect(item.id)}
            className={`grid size-8 cursor-pointer place-items-center rounded-lg transition ${
              selected
                ? "bg-(--theme-dark) text-paper"
                : "text-muted hover:bg-ink/5 hover:text-ink"
            }`}
          >
            {item.icon}
          </button>
        );
      })}
    </div>
  );
}
