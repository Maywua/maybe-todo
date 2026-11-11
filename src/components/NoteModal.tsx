import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  createNote,
  setLocked as persistLocked,
  trashNote,
  updateNote,
} from "../lib/repo";
import {
  cutGraphemes,
  formatClock,
  formatRelativeTime,
  graphemeLength,
} from "../lib/format";
import { emptyContent, type Note, type NoteType } from "../types";
import type { PanelStyle } from "../lib/settings";
import { CloseIcon, LockIcon, MenuIcon } from "./icons";
import MenuPanel from "./MenuPanel";

type Status = "idle" | "saving" | "saved" | "error";

interface Props {
  mode: "new" | "edit";
  type: NoteType;
  note: Note | null;
  panelStyle?: PanelStyle;
  onClose: () => void;
  onClosing?: () => void;
  onSaved: (note: Note, created: boolean) => void;
  onTrashed: (id: string) => void;
  onToast: (message: string) => void;
}

export default function NoteModal({
  mode,
  type,
  note,
  panelStyle = "card",
  onClose,
  onClosing,
  onSaved,
  onTrashed,
  onToast,
}: Props) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [locked, setLocked] = useState(note?.isLocked ?? false);
  const [savedNote, setSavedNote] = useState<Note | null>(note);
  const [status, setStatus] = useState<Status>(note ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState<number | null>(note?.updatedAt ?? null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const savedRef = useRef<Note | null>(note);
  const titleRef = useRef(title);
  const timerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuCloseTimer = useRef<number | null>(null);
  const closingRef = useRef(false);
  const closeTimer = useRef<number | null>(null);

  const persistNow = useCallback(
    async (nextTitle: string): Promise<boolean> => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const normalized = nextTitle.trim();
      const current = savedRef.current;

      if (!current && normalized === "") {
        setStatus("idle");
        setError(null);
        return true;
      }
      if (current && normalized === current.title) {
        setStatus("saved");
        setError(null);
        return true;
      }

      setStatus("saving");
      setError(null);
      try {
        const saved = current
          ? await updateNote({
            id: current.id,
            title: normalized,
            content: current.content,
            completedAt: current.completedAt,
          })
          : await createNote({
            type,
            title: normalized,
            content: emptyContent(type),
          });
        const created = !current;
        savedRef.current = saved;
        setSavedNote(saved);
        setSavedAt(saved.updatedAt);
        setStatus("saved");
        onSaved(saved, created);
        return true;
      } catch (caught) {
        setStatus("error");
        setError(caught instanceof Error ? caught.message : String(caught));
        return false;
      }
    },
    [onSaved, type],
  );

  const chainRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const persist = useCallback(
    (nextTitle: string): Promise<boolean> => {
      const run = chainRef.current.then(
        () => persistNow(nextTitle),
        () => persistNow(nextTitle),
      );
      chainRef.current = run;
      return run;
    },
    [persistNow],
  );

  const close = useCallback(async () => {
    if (closingRef.current) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const ok = await persist(titleRef.current);
    if (!ok || closingRef.current) return;
    closingRef.current = true;
    onClosing?.();
    setMenuOpen(false);
    setClosing(true);
    closeTimer.current = window.setTimeout(() => onClose(), 180);
  }, [onClose, onClosing, persist]);

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    const clipped = cutGraphemes(value, 30);
    if (clipped !== value) onToast("标题最多 30 个字符");
    setTitle(clipped);
    titleRef.current = clipped;
    if (locked) return;

    if (!savedRef.current && clipped.trim() === "") {
      setStatus("idle");
      setError(null);
      return;
    }

    setStatus("saving");
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void persist(clipped);
    }, 500);
  };

  const handleLock = async () => {
    setMenuOpen(false);
    const current = savedRef.current;
    if (!current) return;

    if (!locked) {
      const ok = await persist(titleRef.current);
      if (!ok) return;
    }

    const target = savedRef.current;
    if (!target) return;
    try {
      const lockedSummary = await persistLocked(target.id, !locked);
      const updated: Note = { ...target, isLocked: lockedSummary.isLocked };
      savedRef.current = updated;
      setSavedNote(updated);
      setLocked(!locked);
      onSaved(updated, false);
    } catch (caught) {
      onToast("锁定失败，请重试");
      setError(caught instanceof Error ? caught.message : null);
    }
  };

  const handleDelete = async () => {
    if (closingRef.current) return;
    const current = savedRef.current;
    if (!current) return;
    setMenuOpen(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      await trashNote(current.id);
      closingRef.current = true;
      onClosing?.();
      setClosing(true);
      closeTimer.current = window.setTimeout(() => onTrashed(current.id), 180);
    } catch {
      onToast("删除失败，请重试");
    }
  };

  const clearMenuClose = () => {
    if (menuCloseTimer.current !== null) {
      window.clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }
  };

  const openMenu = () => {
    if (closingRef.current) return;
    clearMenuClose();
    setMenuOpen(true);
  };

  const closeMenuSoon = () => {
    clearMenuClose();
    menuCloseTimer.current = window.setTimeout(() => {
      menuCloseTimer.current = null;
      setMenuOpen(false);
    }, 160);
  };

  useEffect(
    () => () => {
      if (menuCloseTimer.current !== null) {
        window.clearTimeout(menuCloseTimer.current);
      }
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuOpen) {
        setMenuOpen(false);
        return;
      }
      event.preventDefault();
      void close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || nodes.length === 0) return;
    const focusable = Array.from(nodes).filter(
      (node) => node.offsetParent !== null,
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const count = graphemeLength(title);
  const showMenu = savedNote !== null;
  const isCard = panelStyle === "card";
  const isDrawer = panelStyle === "drawer";
  const overlayPosition = isCard
    ? "items-end justify-center p-0"
    : isDrawer
      ? "items-stretch justify-end p-0"
      : "items-center justify-center p-4";
  const dialogShape = isCard
    ? "h-[80vh] w-full max-w-[640px] rounded-t-3xl border-b-0"
    : isDrawer
      ? "h-full max-h-none w-full max-w-[640px] rounded-l-3xl border-r-0"
      : "h-[80vh] w-full max-w-[640px] rounded-3xl";
  const dialogAnimation = closing
    ? isCard
      ? "animate-sheet-out"
      : isDrawer
        ? "animate-drawer-out"
        : "animate-window-flip-out"
    : isCard
      ? "animate-sheet-in"
      : isDrawer
        ? "animate-drawer-in"
        : "animate-window-flip-in";

  return (
    <div
      className={`fixed inset-0 z-40 flex bg-[var(--overlay)] ${overlayPosition} ${
        closing ? "animate-fade-out pointer-events-none" : "animate-fade"
      }`}
      onMouseDown={(event) => {
        if (!closing && event.target === event.currentTarget) void close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "new" ? "新建便签" : "编辑便签"}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className={`flex flex-col overflow-hidden border border-[var(--note-edge)] bg-[var(--note-window)] shadow-[0_30px_80px_-30px_rgba(27,26,22,0.6)] ${dialogShape} ${dialogAnimation}`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between px-3">
          {showMenu ? (
            <div
              className="relative"
              ref={menuRef}
              onMouseEnter={openMenu}
              onMouseLeave={closeMenuSoon}
            >
              <button
                type="button"
                aria-label="便签功能菜单"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(event) => {
                  if (event.detail === 0) {
                    setMenuOpen((open) => !open);
                  } else {
                    openMenu();
                  }
                }}
                className="relative grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink"
              >
                <MenuIcon className="size-4" />
                {status === "saving" && (
                  <span className="absolute right-1 top-1 size-1.5 animate-pulse rounded-full bg-leaf" />
                )}
                {status === "error" && (
                  <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" />
                )}
              </button>
              <MenuPanel
                open={menuOpen}
                className="absolute left-0 top-9 z-20 w-48 rounded-xl border border-line p-1 shadow-[0_18px_40px_-20px_rgba(27,26,22,0.5)]"
              >
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={locked}
                  onClick={() => void handleLock()}
                  className="flex cursor-pointer w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-ink transition"
                >
                  <span>锁定</span>
                  <span
                    className={`relative h-4 w-7 rounded-full transition ${
                      locked ? "bg-ink" : "bg-line"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-3 rounded-full bg-card shadow-sm transition ${
                        locked ? "left-3.5" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleDelete()}
                  className="flex cursor-pointer w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] text-accent transition hover:bg-(--note-bg)"
                >
                  删除
                </button>
                <div className="my-1 h-px bg-line/80" />
                <div className="space-y-0.5 px-2.5 pb-1.5 pt-1 text-[10.5px] leading-5 text-muted/80">
                  <div>
                    {status === "saving" ? (
                      "保存中…"
                    ) : status === "error" ? (
                      <button
                        type="button"
                        onClick={() => void persist(titleRef.current)}
                        title={error ?? undefined}
                        className="cursor-pointer text-left text-accent underline-offset-2 hover:underline"
                      >
                        保存失败，点击重试
                      </button>
                    ) : savedAt !== null ? (
                      `已保存 ${formatClock(savedAt)}`
                    ) : (
                      "尚未保存"
                    )}
                  </div>
                  {savedNote && (
                    <>
                      <div>创建于 {formatRelativeTime(savedNote.createdAt)}</div>
                      <div>修改于 {formatRelativeTime(savedNote.updatedAt)}</div>
                    </>
                  )}
                </div>
              </MenuPanel>
            </div>
          ) : (
            <span className="size-8" />
          )}

          <div className="flex items-center gap-2">
            {locked && (
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <LockIcon className="size-3" />
                已锁定
              </span>
            )}
            <button
              type="button"
              onClick={() => void close()}
              aria-label="关闭"
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-7 pb-5">
          <div className="relative">
            <input
              autoFocus
              value={title}
              onChange={handleTitleChange}
              disabled={locked}
              placeholder="未命名"
              aria-label="便签标题"
              className="w-full bg-transparent py-1 pr-12 text-[22px] font-semibold leading-9 tracking-tight outline-none placeholder:text-muted/35 disabled:cursor-default"
            />
            {count >= 25 && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted/60">
                {count}/30
              </span>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-[var(--note-edge)] bg-[var(--note-bg)] px-5 py-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
              <span className="rounded-full border border-[var(--note-edge)] bg-[var(--note-window)] px-2 py-0.5 tracking-normal normal-case">
                {type === "text" ? "笔记" : "待办"}
              </span>
              <span>内容编辑 · 下一步接入</span>
            </div>
            <p className="mt-3 text-[12.5px] leading-6 text-muted/80">
              {type === "text"
                ? "正文区域暂未实现，当前版本先把标题与保存链路跑通。"
                : "清单区域暂未实现，当前版本先把标题与保存链路跑通。"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
