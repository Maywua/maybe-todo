import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnimationEvent as ReactAnimationEvent,
  CSSProperties,
} from "react";
import HomeBackdrop from "./components/HomeBackdrop";
import HomeHeader from "./components/HomeHeader";
import NoteCard from "./components/NoteCard";
import NoteModal from "./components/NoteModal";
import AboutPanel from "./components/AboutPanel";
import AppearancePanel from "./components/AppearancePanel";
import PanelSidebar, {
  PanelTopNav,
  type PanelTab,
} from "./components/PanelSidebar";
import SettingsPanel from "./components/SettingsPanel";
import Toast from "./components/Toast";
import TrashPanel from "./components/TrashPanel";
import WindowPanel from "./components/WindowPanel";
import WindowControls from "./components/WindowControls";
import Logo from "./components/Logo";
import { useColumnCount } from "./hooks/useColumnCount";
import {
  deleteNoteForever,
  emptyTrash,
  getNote,
  listSummaries,
  listTrashedSummaries,
  purgeExpired,
  quitApp,
  restoreNote,
  toSummary,
} from "./lib/repo";
import { loadSettings, saveSettings, type Settings } from "./lib/settings";
import { DARK_MODE_COLORS, NOTE_THEMES } from "./lib/noteThemes";
import type { Note, NoteSummary, NoteType } from "./types";

type ModalState =
  | { mode: "new"; type: NoteType }
  | { mode: "edit"; id: string };

const byOrder = (left: NoteSummary, right: NoteSummary) =>
  left.order - right.order || left.createdAt - right.createdAt;

const PANEL_TAB_ORDER: PanelTab[] = [
  "settings",
  "appearance",
  "trash",
  "about",
];

const mergeSummaries = (
  current: NoteSummary[],
  incoming: NoteSummary[],
): NoteSummary[] => {
  const seen = new Set(current.map((note) => note.id));
  const next = [...current];
  for (const note of incoming) {
    if (!seen.has(note.id)) {
      seen.add(note.id);
      next.push(note);
    }
  }
  return next;
};

let listHasAnimated = false;

export default function App() {
  const [booted, setBooted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<NoteSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [trashed, setTrashed] = useState<NoteSummary[]>([]);
  const [trashCursor, setTrashCursor] = useState<string | null>(null);
  const [trashHasMore, setTrashHasMore] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashLoadingMore, setTrashLoadingMore] = useState(false);
  const [trashError, setTrashError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("settings");
  const [panelDirection, setPanelDirection] = useState<"up" | "down">("down");
  const panelContentRef = useRef<HTMLDivElement | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalNote, setModalNote] = useState<Note | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [animateList, setAnimateList] = useState(() => !listHasAnimated);

  const toastTimer = useRef<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pageSize = settings.pageSize;
  const theme = NOTE_THEMES[settings.noteTheme];
  const themeStyle =
    settings.colorMode === "dark"
      ? ({
          "--app-bg": DARK_MODE_COLORS.appBackground,
          "--note-bg": DARK_MODE_COLORS.noteBackground,
          "--note-edge": DARK_MODE_COLORS.noteEdge,
          "--note-window": DARK_MODE_COLORS.noteWindow,
          "--theme-dark": DARK_MODE_COLORS.themeDark,
          "--color-paper": DARK_MODE_COLORS.appBackground,
          "--color-card": DARK_MODE_COLORS.card,
          "--color-line": DARK_MODE_COLORS.line,
          "--color-ink": DARK_MODE_COLORS.ink,
          "--color-muted": DARK_MODE_COLORS.muted,
          "--color-accent": DARK_MODE_COLORS.accent,
          "--color-accent-soft": DARK_MODE_COLORS.accentSoft,
          "--color-leaf": DARK_MODE_COLORS.leaf,
          "--overlay": DARK_MODE_COLORS.overlay,
          "--backdrop-dot": `color-mix(in srgb, ${DARK_MODE_COLORS.muted} 22%, transparent)`,
          "--backdrop-line": `color-mix(in srgb, ${DARK_MODE_COLORS.muted} 16%, transparent)`,
          "--backdrop-glow": `color-mix(in srgb, ${DARK_MODE_COLORS.noteBackground} 80%, transparent)`,
        } as CSSProperties)
      : ({
          "--app-bg": theme.colors.appBackground,
          "--note-bg": theme.colors.background,
          "--note-edge": theme.colors.edge,
          "--note-window": theme.colors.window,
          "--theme-dark": theme.colors.dark,
          "--color-paper": theme.colors.appBackground,
          "--color-card": `color-mix(in srgb, ${theme.colors.appBackground} 30%, white)`,
          "--color-line": `color-mix(in srgb, ${theme.colors.edge} 35%, ${theme.colors.appBackground})`,
          "--overlay": "rgb(27 26 22 / 0.25)",
          "--backdrop-dot": `color-mix(in srgb, ${theme.colors.edge} 52%, transparent)`,
          "--backdrop-line": `color-mix(in srgb, ${theme.colors.edge} 40%, transparent)`,
          "--backdrop-glow": `color-mix(in srgb, ${theme.colors.background} 55%, transparent)`,
        } as CSSProperties);

  useEffect(() => {
    document.documentElement.style.colorScheme = settings.colorMode;
  }, [settings.colorMode]);

  useEffect(() => {
    const content = panelContentRef.current;
    if (!content) return;
    const scroller = content.closest(".app-scroll");
    if (scroller instanceof HTMLElement) scroller.scrollTop = 0;
  }, [panelTab]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPageError(null);
    try {
      await purgeExpired();
      const page = await listSummaries(null, pageSize);
      setSummaries(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    let alive = true;
    void loadFirstPage();
    const timers = [
      window.setTimeout(() => {
        if (alive) setBooted(true);
      }, 300),
      window.setTimeout(() => {
        if (alive) setBooted(true);
      }, 3500),
    ];
    return () => {
      alive = false;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    setPageError(null);
    try {
      const page = await listSummaries(nextCursor, pageSize);
      setSummaries((previous) => mergeSummaries(previous, page.items));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      setPageError("加载更多失败，点击重试");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, nextCursor, pageSize]);

  useEffect(() => {
    if (loading || !hasMore || pageError) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading, pageError, summaries.length]);

  const loadTrash = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setTrashLoading(true);
        setTrashError(null);
      } else {
        if (trashLoadingMore || trashLoading || !trashHasMore || !trashCursor) {
          return;
        }
        setTrashLoadingMore(true);
      }
      try {
        const page = await listTrashedSummaries(
          reset ? null : trashCursor,
          pageSize,
        );
        setTrashed((previous) =>
          reset ? page.items : mergeSummaries(previous, page.items),
        );
        setTrashCursor(page.nextCursor);
        setTrashHasMore(page.hasMore);
      } catch {
        setTrashError("回收站加载失败，点击重试");
      } finally {
        if (reset) setTrashLoading(false);
        else setTrashLoadingMore(false);
      }
    },
    [pageSize, trashCursor, trashHasMore, trashLoading, trashLoadingMore],
  );

  const loadMoreTrash = useCallback(() => {
    void loadTrash(false);
  }, [loadTrash]);

  const handleSaved = useCallback((saved: Note) => {
    const summary = toSummary(saved);
    setSummaries((previous) => {
      const exists = previous.some((note) => note.id === summary.id);
      if (exists) {
        return previous.map((note) =>
          note.id === summary.id ? summary : note,
        );
      }
      return [summary, ...previous];
    });
  }, []);

  const handleTrashed = useCallback(
    (id: string) => {
      const remaining = summaries.filter((note) => note.id !== id);
      setSummaries(remaining);
      if (id === nextCursor) {
        setNextCursor(remaining[remaining.length - 1]?.id ?? null);
        if (remaining.length === 0) void loadFirstPage();
      }
      setModal(null);
      setModalNote(null);
      setActiveNoteId(null);
      showToast("已移入回收站");
    },
    [loadFirstPage, nextCursor, showToast, summaries],
  );

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        const restored = await restoreNote(id);
        const remaining = trashed.filter((note) => note.id !== id);
        setTrashed(remaining);
        if (id === trashCursor) {
          setTrashCursor(remaining[remaining.length - 1]?.id ?? null);
        }
        setSummaries((previous) => {
          if (previous.some((note) => note.id === restored.id)) {
            return previous;
          }
          return [...previous, restored].sort(byOrder);
        });
        showToast("已恢复");
      } catch {
        showToast("恢复失败，请重试");
      }
    },
    [showToast, trashCursor, trashed],
  );

  const handleDeleteForever = useCallback(
    async (id: string) => {
      try {
        await deleteNoteForever(id);
        const remaining = trashed.filter((note) => note.id !== id);
        setTrashed(remaining);
        if (id === trashCursor) {
          setTrashCursor(remaining[remaining.length - 1]?.id ?? null);
        }
        showToast("已彻底删除");
      } catch {
        showToast("删除失败，请重试");
      }
    },
    [showToast, trashCursor, trashed],
  );

  const handleEmptyTrash = useCallback(async () => {
    try {
      await emptyTrash();
      setTrashed([]);
      setTrashHasMore(false);
      setTrashCursor(null);
      showToast("回收站已清空");
    } catch {
      showToast("清空失败，请重试");
    }
  }, [showToast]);

  const handleExit = useCallback(async () => {
    try {
      await quitApp();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "退出失败");
    }
  }, [showToast]);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const openPanel = useCallback(() => {
    setPanelTab("settings");
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setPanelTab("settings");
    setTrashed([]);
    setTrashCursor(null);
    setTrashHasMore(false);
    setTrashError(null);
  }, []);

  const selectPanelTab = useCallback(
    (tab: PanelTab) => {
      if (tab === panelTab) return;
      const from = PANEL_TAB_ORDER.indexOf(panelTab);
      const to = PANEL_TAB_ORDER.indexOf(tab);
      setPanelDirection(to > from ? "down" : "up");
      setPanelTab(tab);
      if (tab === "trash") {
        setTrashed([]);
        setTrashCursor(null);
        setTrashHasMore(false);
        setTrashError(null);
        void loadTrash(true);
      } else {
        setTrashed([]);
        setTrashCursor(null);
        setTrashHasMore(false);
        setTrashError(null);
      }
    },
    [loadTrash, panelTab],
  );

  const openNew = useCallback((type: NoteType) => {
    setActiveNoteId(null);
    setModalNote(null);
    setModal({ mode: "new", type });
  }, []);

  const openEdit = useCallback(
    async (id: string) => {
      try {
        const note = await getNote(id);
        setModalNote(note);
        setActiveNoteId(id);
        setModal({ mode: "edit", id });
      } catch {
        showToast("便签读取失败，请重试");
      }
    },
    [showToast],
  );

  const columnCount = useColumnCount();
  const columns: NoteSummary[][] = Array.from(
    { length: columnCount },
    () => [] as NoteSummary[],
  );
  summaries.forEach((note, index) => {
    columns[index % columnCount].push(note);
  });

  const handleListAnimationEnd = (
    event: ReactAnimationEvent<HTMLDivElement>,
  ) => {
    if (event.target !== event.currentTarget) return;
    listHasAnimated = true;
    setAnimateList(false);
  };

  return (
    <div
      data-note-theme={settings.noteTheme}
      data-color-mode={settings.colorMode}
      style={themeStyle}
      className="flex h-screen flex-col overflow-hidden bg-[var(--app-bg)] text-ink"
    >
      {!booted && <Splash />}

      {settings.backgroundStyle !== "none" && (
        <HomeBackdrop variant={settings.backgroundStyle} />
      )}

      <HomeHeader
        onNew={openNew}
        onOpenPanel={openPanel}
        blocked={modal !== null || panelOpen}
      />

      <main className="app-scroll relative z-10 min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8">
          {loading ? (
            <ListSkeleton columnCount={columnCount} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void loadFirstPage()} />
          ) : summaries.length === 0 ? (
            <EmptyHome onNew={openNew} />
          ) : (
            <>
              <div
                className={`flex items-start gap-3 ${
                  booted && animateList ? "animate-list-in" : ""
                }`}
                onAnimationEnd={handleListAnimationEnd}
              >
                {columns.map((column, columnIndex) => (
                  <ul
                    key={columnIndex}
                    className="flex min-w-0 flex-1 flex-col gap-3"
                  >
                    {column.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        active={activeNoteId === note.id}
                        panelStyle={settings.panelStyle}
                        onOpen={() => void openEdit(note.id)}
                      />
                    ))}
                  </ul>
                ))}
              </div>
              {(hasMore || pageError) && (
                <div
                  ref={sentinelRef}
                  className="flex h-8 items-center justify-center"
                >
                  {pageError ? (
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      className="cursor-pointer text-[12px] text-accent underline-offset-2 hover:underline"
                    >
                      加载失败，点击重试
                    </button>
                  ) : loadingMore ? (
                    <span
                      aria-label="加载中"
                      className="size-3.5 animate-spin rounded-full border-2 border-line border-t-accent"
                    />
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {panelOpen && (
        <WindowPanel
          title="菜单"
          panelStyle={settings.panelStyle}
          widthClass="max-w-[1000px]"
          onClose={closePanel}
          sidebar={
            <PanelSidebar
              active={panelTab}
              onSelect={selectPanelTab}
              onExit={() => void handleExit()}
            />
          }
          topNav={
            <PanelTopNav
              active={panelTab}
              onSelect={selectPanelTab}
              onExit={() => void handleExit()}
            />
          }
        >
          <div
            key={panelTab}
            ref={panelContentRef}
            className={
              panelDirection === "down" ? "animate-tab-down" : "animate-tab-up"
            }
          >
            {panelTab === "settings" ? (
              <SettingsPanel
                settings={settings}
                onChange={updateSettings}
                onToast={showToast}
              />
            ) : panelTab === "appearance" ? (
              <AppearancePanel
                settings={settings}
                onChange={updateSettings}
                onToast={showToast}
              />
            ) : panelTab === "trash" ? (
              <TrashPanel
                notes={trashed}
                loading={trashLoading}
                loadingMore={trashLoadingMore}
                hasMore={trashHasMore}
                error={trashError}
                onLoadMore={loadMoreTrash}
                onRetry={() => void loadTrash(true)}
                onClose={closePanel}
                onRestore={(id) => void handleRestore(id)}
                onDeleteForever={(id) => void handleDeleteForever(id)}
                onEmptyTrash={() => void handleEmptyTrash()}
              />
            ) : (
              <AboutPanel />
            )}
          </div>
        </WindowPanel>
      )}

      {modal && (modal.mode === "new" || modalNote) && (
        <NoteModal
          mode={modal.mode}
          type={modal.mode === "new" ? modal.type : modalNote!.type}
          note={modal.mode === "new" ? null : modalNote}
          panelStyle={settings.panelStyle}
          onClosing={() => setActiveNoteId(null)}
          onClose={() => {
            setModal(null);
            setModalNote(null);
            setActiveNoteId(null);
          }}
          onSaved={handleSaved}
          onTrashed={handleTrashed}
          onToast={showToast}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}

function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--app-bg)]">
      <div data-tauri-drag-region className="h-10 shrink-0" aria-hidden="true" />
      <div className="absolute right-2 top-1">
        <WindowControls />
      </div>
      <div className="grid flex-1 place-items-center">
        <div className="animate-fade flex flex-col items-center gap-4">
          <Logo className="size-12 rounded-2xl" />
          <p className="text-[14px] font-semibold tracking-tight">Maybe Todo</p>
        </div>
      </div>
    </div>
  );
}

function ListSkeleton({ columnCount }: { columnCount: number }) {
  const heights = [136, 104, 120, 96];
  const columns = Array.from({ length: columnCount }, (_, columnIndex) =>
    Array.from(
      { length: columnIndex % 2 === 0 ? 3 : 2 },
      (_, row) => heights[(columnIndex + row) % heights.length],
    ),
  );

  return (
    <div className="flex items-start gap-3" aria-hidden="true">
      {columns.map((columnHeights, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col gap-3">
          {columnHeights.map((height, row) => (
            <div
              key={row}
              style={{ height }}
              className="animate-pulse rounded-2xl border border-[var(--note-edge)] bg-[var(--note-bg)]"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-line bg-card/70 px-6 py-12 text-center">
      <p className="text-[15px] font-medium">便签读取失败</p>
      <p className="mx-auto mt-2 max-w-md break-words text-[12.5px] leading-6 text-muted">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 cursor-pointer rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-ink/85"
      >
        重试
      </button>
    </div>
  );
}

function EmptyHome({ onNew }: { onNew: (type: NoteType) => void }) {
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-dashed border-line px-6 py-14 text-center">
      <p className="text-[14px] font-medium">先记下来，再决定</p>
      <p className="mt-1 text-[12.5px] text-muted">
        还没有一条便签。新建一条，从一句话开始。
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onNew("text")}
          className="cursor-pointer rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-ink/85"
        >
          新建笔记
        </button>
        <button
          type="button"
          onClick={() => onNew("todo")}
          className="cursor-pointer rounded-xl border border-line bg-card px-4 py-2 text-[13px] text-ink/75 transition hover:border-accent/40 hover:text-ink"
        >
          新建待办
        </button>
      </div>
    </div>
  );
}
