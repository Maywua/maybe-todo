import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimationEvent as ReactAnimationEvent } from "react";
import HomeHeader from "./components/HomeHeader";
import NoteCard from "./components/NoteCard";
import NoteModal from "./components/NoteModal";
import SettingsView from "./components/SettingsView";
import SortHeader from "./components/SortHeader";
import Toast from "./components/Toast";
import TrashView from "./components/TrashView";
import WindowControls from "./components/WindowControls";
import Logo from "./components/Logo";
import { useColumnCount } from "./hooks/useColumnCount";
import {
  deleteNoteForever,
  emptyTrash,
  getNote,
  listAllSummaries,
  listSummaries,
  listTrashedSummaries,
  purgeExpired,
  quitApp,
  reorderNotes,
  restoreNote,
  toSummary,
} from "./lib/repo";
import { loadSettings, saveSettings, type Settings } from "./lib/settings";
import type { Note, NoteSummary, NoteType, View } from "./types";

type ModalState =
  | { mode: "new"; type: NoteType }
  | { mode: "edit"; id: string };

const byOrder = (left: NoteSummary, right: NoteSummary) =>
  left.order - right.order || left.createdAt - right.createdAt;

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
  const [view, setView] = useState<View>("home");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalNote, setModalNote] = useState<Note | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [animateList, setAnimateList] = useState(() => !listHasAnimated);
  const [sortItems, setSortItems] = useState<NoteSummary[] | null>(null);
  const [sortSaving, setSortSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    edge: "before" | "after";
  } | null>(null);

  const toastTimer = useRef<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pageSize = settings.pageSize;

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

  const sorting = sortItems !== null;

  useEffect(() => {
    if (sorting || loading || !hasMore || pageError) return;
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
  }, [hasMore, loadMore, loading, pageError, sorting, summaries.length]);

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

  const openTrash = useCallback(() => {
    setView("trash");
    void loadTrash(true);
  }, [loadTrash]);

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

  const openSettings = useCallback(() => {
    setView("settings");
  }, []);

  const startSort = useCallback(async () => {
    if (summaries.length < 2 && !hasMore) return;
    try {
      const all = await listAllSummaries();
      if (all.length < 2) return;
      setSortItems(all);
      setDragId(null);
      setDropTarget(null);
    } catch {
      showToast("排序加载失败，请重试");
    }
  }, [hasMore, showToast, summaries.length]);

  const cancelSort = useCallback(() => {
    setSortItems(null);
    setDragId(null);
    setDropTarget(null);
  }, []);

  const saveSort = useCallback(async () => {
    if (!sortItems || sortSaving) return;
    setSortSaving(true);
    try {
      const ordered = sortItems.map((note, index) => ({
        ...note,
        order: index,
      }));
      await reorderNotes(ordered.map((note) => note.id));
      setSummaries(ordered.slice(0, pageSize));
      setNextCursor(
        ordered.length > pageSize ? ordered[pageSize - 1].id : null,
      );
      setHasMore(ordered.length > pageSize);
      setSortItems(null);
      setDragId(null);
      setDropTarget(null);
      showToast("排序已保存");
    } catch {
      showToast("排序保存失败，请重试");
    } finally {
      setSortSaving(false);
    }
  }, [pageSize, showToast, sortItems, sortSaving]);

  const handleSortDragStart = useCallback(
    (id: string) => {
      if (sortSaving) return;
      setDragId(id);
      setDropTarget(null);
    },
    [sortSaving],
  );

  const handleSortDragOver = useCallback(
    (id: string, edge: "before" | "after") => {
      if (!sortItems || sortSaving || !dragId || dragId === id) return;
      setDropTarget((current) =>
        current?.id === id && current.edge === edge
          ? current
          : { id, edge },
      );
    },
    [dragId, sortItems, sortSaving],
  );

  const handleSortDrop = useCallback(() => {
    if (!sortItems || sortSaving || !dragId || !dropTarget) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    if (dragId === dropTarget.id) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    const ids = sortItems.map((note) => note.id);
    const from = ids.indexOf(dragId);
    if (from === -1) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    const [moved] = ids.splice(from, 1);
    let insertAt = ids.indexOf(dropTarget.id);
    if (insertAt === -1) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    if (dropTarget.edge === "after") insertAt += 1;
    ids.splice(insertAt, 0, moved);
    const byId = new Map(sortItems.map((note) => [note.id, note]));
    setSortItems(ids.map((id) => byId.get(id) as NoteSummary));
    setDragId(null);
    setDropTarget(null);
  }, [dragId, dropTarget, sortItems, sortSaving]);

  const handleSortDragEnd = useCallback(() => {
    setDragId(null);
    setDropTarget(null);
  }, []);

  const openNew = useCallback((type: NoteType) => {
    setModalNote(null);
    setModal({ mode: "new", type });
  }, []);

  const openEdit = useCallback(
    async (id: string) => {
      try {
        const note = await getNote(id);
        setModalNote(note);
        setModal({ mode: "edit", id });
      } catch {
        showToast("便签读取失败，请重试");
      }
    },
    [showToast],
  );

  const columnCount = useColumnCount();
  const displayNotes = sortItems ?? summaries;
  const columns: NoteSummary[][] = Array.from(
    { length: columnCount },
    () => [] as NoteSummary[],
  );
  displayNotes.forEach((note, index) => {
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
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      {!booted && <Splash />}

      {view === "home" ? (
        <>
          {sorting ? (
            <SortHeader
              saving={sortSaving}
              onCancel={cancelSort}
              onSave={() => void saveSort()}
            />
          ) : (
            <HomeHeader
              onNew={openNew}
              onOpenTrash={openTrash}
              onOpenSettings={openSettings}
              onStartSort={() => void startSort()}
              canSort={summaries.length >= 2 || hasMore}
              onExit={() => void handleExit()}
              blocked={modal !== null}
            />
          )}

          <main className="app-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8">
            {loading ? (
              <ListSkeleton columnCount={columnCount} />
            ) : error ? (
              <ErrorState message={error} onRetry={() => void loadFirstPage()} />
            ) : displayNotes.length === 0 ? (
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
                          sorting={sorting}
                          dragging={dragId === note.id}
                          dropEdge={
                            dropTarget?.id === note.id
                              ? dropTarget.edge
                              : null
                          }
                          onOpen={() => void openEdit(note.id)}
                          onDragStart={handleSortDragStart}
                          onDragEnd={handleSortDragEnd}
                          onDragOver={handleSortDragOver}
                          onDrop={handleSortDrop}
                        />
                      ))}
                    </ul>
                  ))}
                </div>
                {!sorting && (hasMore || pageError) && (
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
        </>
      ) : view === "settings" ? (
        <SettingsView
          settings={settings}
          onChange={updateSettings}
          onToast={showToast}
          onBack={() => setView("home")}
        />
      ) : (
        <TrashView
          notes={trashed}
          loading={trashLoading}
          loadingMore={trashLoadingMore}
          hasMore={trashHasMore}
          error={trashError}
          onLoadMore={loadMoreTrash}
          onRetry={() => void loadTrash(true)}
          onBack={() => setView("home")}
          onRestore={(id) => void handleRestore(id)}
          onDeleteForever={(id) => void handleDeleteForever(id)}
          onEmptyTrash={() => void handleEmptyTrash()}
        />
      )}

      {modal && (modal.mode === "new" || modalNote) && (
        <NoteModal
          mode={modal.mode}
          type={modal.mode === "new" ? modal.type : modalNote!.type}
          note={modal.mode === "new" ? null : modalNote}
          panelStyle={settings.panelStyle}
          onClose={() => {
            setModal(null);
            setModalNote(null);
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
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
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
              className="animate-pulse rounded-2xl border border-sticky-edge/60 bg-sticky/50"
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
