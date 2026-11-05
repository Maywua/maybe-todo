import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimationEvent as ReactAnimationEvent } from "react";
import HomeHeader from "./components/HomeHeader";
import NoteCard from "./components/NoteCard";
import NoteModal from "./components/NoteModal";
import SortHeader from "./components/SortHeader";
import TrashView from "./components/TrashView";
import WindowControls from "./components/WindowControls";
import Logo from "./components/Logo";
import { useColumnCount } from "./hooks/useColumnCount";
import {
  deleteNoteForever,
  emptyTrash,
  listNotes,
  listTrashed,
  purgeExpired,
  quitApp,
  reorderNotes,
  restoreNote,
} from "./lib/repo";
import type { Note, NoteType, View } from "./types";

type ModalState =
  | { mode: "new"; type: NoteType }
  | { mode: "edit"; id: string };

const sortNotes = (notes: Note[]) =>
  [...notes].sort(
    (left, right) => left.order - right.order || left.createdAt - right.createdAt,
  );

let listHasAnimated = false;

export default function App() {
  const [booted, setBooted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [trashed, setTrashed] = useState<Note[]>([]);
  const [view, setView] = useState<View>("home");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [animateList, setAnimateList] = useState(() => !listHasAnimated);
  const [sorting, setSorting] = useState(false);
  const [sortSaving, setSortSaving] = useState(false);
  const [sortSnapshot, setSortSnapshot] = useState<Note[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    edge: "before" | "after";
  } | null>(null);

  const toastTimer = useRef<number | null>(null);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await purgeExpired();
      const [nextNotes, nextTrashed] = await Promise.all([
        listNotes(),
        listTrashed(),
      ]);
      setNotes(nextNotes);
      setTrashed(nextTrashed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void load();
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
  }, [load]);

  const handleSaved = useCallback((saved: Note) => {
    setNotes((previous) => {
      const exists = previous.some((note) => note.id === saved.id);
      const next = exists
        ? previous.map((note) => (note.id === saved.id ? saved : note))
        : [...previous, saved];
      return sortNotes(next);
    });
  }, []);

  const handleTrashed = useCallback(
    (id: string) => {
      setNotes((previous) => previous.filter((note) => note.id !== id));
      setModal(null);
      showToast("已移入回收站");
      void listTrashed().then(setTrashed).catch(() => undefined);
    },
    [showToast],
  );

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        const restored = await restoreNote(id);
        setTrashed((previous) => previous.filter((note) => note.id !== id));
        setNotes((previous) =>
          sortNotes([
            ...previous.filter((note) => note.id !== restored.id),
            restored,
          ]),
        );
        showToast("已恢复");
      } catch {
        showToast("恢复失败，请重试");
      }
    },
    [showToast],
  );

  const handleDeleteForever = useCallback(
    async (id: string) => {
      try {
        await deleteNoteForever(id);
        setTrashed((previous) => previous.filter((note) => note.id !== id));
        showToast("已彻底删除");
      } catch {
        showToast("删除失败，请重试");
      }
    },
    [showToast],
  );

  const handleEmptyTrash = useCallback(async () => {
    try {
      await emptyTrash();
      setTrashed([]);
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

  const startSort = useCallback(() => {
    if (notes.length < 2) return;
    setSortSnapshot(notes);
    setDragId(null);
    setDropTarget(null);
    setSorting(true);
  }, [notes]);

  const cancelSort = useCallback(() => {
    if (sortSnapshot) setNotes(sortSnapshot);
    setSortSnapshot(null);
    setSorting(false);
    setDragId(null);
    setDropTarget(null);
  }, [sortSnapshot]);

  const saveSort = useCallback(async () => {
    if (sortSaving) return;
    setSortSaving(true);
    try {
      const ids = notes.map((note) => note.id);
      await reorderNotes(ids);
      setNotes((previous) =>
        previous.map((note, index) => ({ ...note, order: index })),
      );
      setSortSnapshot(null);
      setSorting(false);
      setDragId(null);
      setDropTarget(null);
      showToast("排序已保存");
    } catch {
      showToast("排序保存失败，请重试");
    } finally {
      setSortSaving(false);
    }
  }, [notes, showToast, sortSaving]);

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
      if (!sorting || sortSaving || !dragId || dragId === id) return;
      setDropTarget((current) =>
        current?.id === id && current.edge === edge
          ? current
          : { id, edge },
      );
    },
    [dragId, sortSaving, sorting],
  );

  const handleSortDrop = useCallback(() => {
    if (!sorting || sortSaving || !dragId || !dropTarget) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    if (dragId === dropTarget.id) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    const ids = notes.map((note) => note.id);
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
    const byId = new Map(notes.map((note) => [note.id, note]));
    setNotes(ids.map((id) => byId.get(id) as Note));
    setDragId(null);
    setDropTarget(null);
  }, [dragId, dropTarget, notes, sortSaving, sorting]);

  const handleSortDragEnd = useCallback(() => {
    setDragId(null);
    setDropTarget(null);
  }, []);

  const openNew = useCallback((type: NoteType) => {
    setModal({ mode: "new", type });
  }, []);

  const openEdit = useCallback((id: string) => {
    setModal({ mode: "edit", id });
  }, []);

  const editingNote =
    modal?.mode === "edit"
      ? (notes.find((note) => note.id === modal.id) ?? null)
      : null;

  const columnCount = useColumnCount();

  // 瀑布流：按顺序轮转分配到各列，列内卡片高度各自独立。
  const columns: Note[][] = Array.from(
    { length: columnCount },
    () => [] as Note[],
  );
  notes.forEach((note, index) => {
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
    <div className="min-h-screen bg-paper text-ink">
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
              onOpenTrash={() => setView("trash")}
              onStartSort={startSort}
              canSort={notes.length >= 2}
              onExit={() => void handleExit()}
              blocked={modal !== null}
            />
          )}

          <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8">
            {loading ? (
              <ListSkeleton columnCount={columnCount} />
            ) : error ? (
              <ErrorState message={error} onRetry={() => void load()} />
            ) : notes.length === 0 ? (
              <EmptyHome onNew={openNew} />
            ) : (
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
                        onOpen={() => openEdit(note.id)}
                        onDragStart={handleSortDragStart}
                        onDragEnd={handleSortDragEnd}
                        onDragOver={handleSortDragOver}
                        onDrop={handleSortDrop}
                      />
                    ))}
                  </ul>
                ))}
              </div>
            )}
          </main>
        </>
      ) : (
        <TrashView
          notes={trashed}
          onBack={() => setView("home")}
          onRestore={(id) => void handleRestore(id)}
          onDeleteForever={(id) => void handleDeleteForever(id)}
          onEmptyTrash={() => void handleEmptyTrash()}
        />
      )}

      {modal && (modal.mode === "new" || editingNote) && (
        <NoteModal
          mode={modal.mode}
          type={modal.mode === "new" ? modal.type : (editingNote as Note).type}
          note={editingNote}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onTrashed={handleTrashed}
          onToast={showToast}
        />
      )}

      {toast && (
        <div
          role="status"
          className="animate-pop fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper shadow-[0_16px_40px_-16px_rgba(27,26,22,0.7)]"
        >
          {toast}
        </div>
      )}
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

function EmptyHome({
  onNew,
}: {
  onNew: (type: NoteType) => void;
}) {
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
