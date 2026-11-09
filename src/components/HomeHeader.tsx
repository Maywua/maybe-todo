import { useEffect } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useMenu } from "../hooks/useMenu";
import { inTauri } from "../lib/runtime";
import type { NoteType } from "../types";
import MenuPanel from "./MenuPanel";
import {
  HomeIcon,
  InfoIcon,
  MenuIcon,
  PlusIcon,
  PowerIcon,
  SettingsIcon,
  SortIcon,
  TrashIcon,
} from "./icons";
import WindowControls from "./WindowControls";

interface Props {
  onNew: (type: NoteType) => void;
  onOpenTrash: () => void;
  onOpenSettings: () => void;
  onStartSort: () => void;
  canSort: boolean;
  onExit: () => void;
  blocked: boolean;
}

export default function HomeHeader({
  onNew,
  onOpenTrash,
  onOpenSettings,
  onStartSort,
  canSort,
  onExit,
  blocked,
}: Props) {
  const nav = useMenu();
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

  useEffect(() => {
    if (nav.open) add.setOpen(false);
  }, [nav.open, add.setOpen]);

  useEffect(() => {
    if (add.open) nav.setOpen(false);
  }, [add.open, nav.setOpen]);

  const handleClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    menu: ReturnType<typeof useMenu>,
  ) => {
    // 鼠标点击只负责打开；键盘 Enter/Space（detail 为 0）才做开合。
    if (event.detail === 0) {
      menu.setOpen((open) => !open);
    } else {
      menu.setOpen(true);
    }
  };

  const addControl = (
    <div className="relative" ref={add.ref} {...add.hoverProps}>
      <button
        type="button"
        aria-label="添加便签"
        aria-haspopup="menu"
        aria-expanded={add.open}
        onClick={(event) => handleClick(event, add)}
        className="grid size-9 cursor-pointer place-items-center rounded-xl text-ink/65 transition hover:bg-ink/5 hover:text-ink"
      >
        <PlusIcon className="size-5" />
      </button>
      <MenuPanel
        open={add.open}
        align={inTauri ? "left" : "right"}
        className={`absolute top-11 z-40 w-36 rounded-xl border border-line bg-card p-1 shadow-[0_18px_40px_-20px_rgba(27,26,22,0.5)] ${
          inTauri ? "left-0" : "right-0"
        }`}
      >
        <MenuItem
          onClick={() => {
            add.setOpen(false);
            onNew("text");
          }}
        >
          新建笔记
        </MenuItem>
        <MenuItem
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
    <header className="sticky top-0 z-30 shrink-0 border-b border-line/70 bg-[var(--app-bg)]">
      <div
        className={
          inTauri
            ? "flex h-14 w-full items-center gap-1"
            : "mx-auto flex h-14 max-w-5xl items-center gap-1 px-4"
        }
      >
        <div className="relative" ref={nav.ref} {...nav.hoverProps}>
          <button
            type="button"
            aria-label="功能菜单"
            aria-haspopup="menu"
            aria-expanded={nav.open}
            onClick={(event) => handleClick(event, nav)}
            className="grid size-9 cursor-pointer place-items-center rounded-xl text-ink/65 transition hover:bg-ink/5 hover:text-ink"
          >
            <MenuIcon className="size-5" />
          </button>
          <MenuPanel
            open={nav.open}
            className="absolute left-0 top-11 z-40 w-44 rounded-xl border border-line bg-card p-1 shadow-[0_18px_40px_-20px_rgba(27,26,22,0.5)]"
          >
            <MenuItem
              icon={<HomeIcon className="size-4" />}
              disabled
              title="当前已在首页"
            >
              首页
            </MenuItem>
            <MenuItem
              icon={<SettingsIcon className="size-4" />}
              onClick={() => {
                nav.setOpen(false);
                onOpenSettings();
              }}
            >
              设置
            </MenuItem>
            <MenuItem
              icon={<TrashIcon className="size-4" />}
              onClick={() => {
                nav.setOpen(false);
                onOpenTrash();
              }}
            >
              回收站
            </MenuItem>
            <MenuItem
              icon={<SortIcon className="size-4" />}
              disabled={!canSort}
              title={canSort ? undefined : "至少需要两条便签"}
              onClick={() => {
                nav.setOpen(false);
                onStartSort();
              }}
            >
              排序
            </MenuItem>
            <MenuItem
              icon={<InfoIcon className="size-4" />}
              disabled
              title="v1 暂未提供"
            >
              关于
            </MenuItem>
            <div className="my-1 h-px bg-line/80" />
            <MenuItem
              icon={<PowerIcon className="size-4" />}
              onClick={() => {
                nav.setOpen(false);
                onExit();
              }}
            >
              退出
            </MenuItem>
          </MenuPanel>
        </div>

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
  disabled = false,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
        disabled
          ? "cursor-default text-muted/35"
          : "cursor-pointer text-ink hover:bg-paper"
      }`}
    >
      {icon && (
        <span
          className={`grid size-4 shrink-0 place-items-center ${
            disabled ? "text-muted/35" : "text-muted"
          }`}
        >
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
