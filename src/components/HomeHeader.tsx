import { useEffect } from "react";
import type { ReactNode } from "react";
import { useMenu } from "../hooks/useMenu";
import { inTauri } from "../lib/runtime";
import type { NoteType } from "../types";
import MenuPanel from "./MenuPanel";
import { MenuIcon, NoteIcon, PlusIcon, TodoIcon } from "./icons";
import WindowControls from "./WindowControls";

interface Props {
  onNew: (type: NoteType) => void;
  onOpenPanel: () => void;
  blocked: boolean;
}

export default function HomeHeader({ onNew, onOpenPanel, blocked }: Props) {
  const add = useMenu();

  useEffect(() => {
    if (blocked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        add.setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [add.setOpen, blocked]);

  const handleAddClick = () => {
    add.setOpen(false);
    onNew("text");
  };

  const addControl = (
    <div className="relative" ref={add.ref} {...add.hoverProps}>
      <button
        type="button"
        aria-label="新建笔记"
        title="新建笔记"
        onClick={handleAddClick}
        className="grid size-9 cursor-pointer place-items-center rounded-xl text-ink/65 transition hover:text-ink"
      >
        <PlusIcon className="size-5" />
      </button>
      <MenuPanel
        open={add.open}
        align={inTauri ? "left" : "right"}
        className={`absolute top-11 z-40 w-36 rounded-xl border border-line p-1 shadow-[0_18px_40px_-20px_rgba(27,26,22,0.5)] ${
          inTauri ? "left-0" : "right-0"
        }`}
      >
        <MenuItem
          icon={<NoteIcon className="size-4" />}
          onClick={() => {
            add.setOpen(false);
            onNew("text");
          }}
        >
          新建笔记
        </MenuItem>
        <MenuItem
          icon={<TodoIcon className="size-4" />}
          onClick={() => {
            add.setOpen(false);
            onNew("todo");
          }}
        >
          新建待办
        </MenuItem>
      </MenuPanel>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 shrink-0 bg-transparent">
      <div
        className={
          inTauri
            ? "flex h-14 w-full items-center gap-1 px-4"
            : "mx-auto flex h-14 max-w-5xl items-center gap-1 px-4"
        }
      >
        <button
          type="button"
          aria-label="功能菜单"
          aria-haspopup="dialog"
          onClick={onOpenPanel}
          className="grid size-9 cursor-pointer place-items-center rounded-xl hover:text-ink"
        >
          <MenuIcon className="size-5" />
        </button>

        {inTauri && addControl}

        <div
          data-tauri-drag-region
          className="h-full min-w-0 flex-1"
          aria-hidden="true"
        />

        {!inTauri && addControl}

        <WindowControls />
      </div>
    </header>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition hover:bg-(--note-bg)"
    >
      {icon && (
        <span className="grid size-4 shrink-0 place-items-center text-muted">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
