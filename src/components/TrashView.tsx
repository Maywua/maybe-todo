import { useState } from "react";
import type { Note } from "../types";
import { daysUntilPurge, formatDateTime } from "../lib/format";
import { previewOf } from "../lib/preview";
import { ArrowLeftIcon, LockIcon } from "./icons";
import ConfirmDialog from "./ConfirmDialog";
import WindowControls from "./WindowControls";

interface Props {
  notes: Note[];
  onBack: () => void;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onEmptyTrash: () => void;
}

interface Confirmation {
  title: string;
  body: string;
  confirmLabel: string;
  action: () => void;
}

export default function TrashView({
  notes,
  onBack,
  onRestore,
  onDeleteForever,
  onEmptyTrash,
}: Props) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const askDelete = (note: Note) => {
    setConfirmation({
      title: "彻底删除这条便签？",
      body: `「${note.title.trim() || "未命名"}」将被永久删除，无法恢复。`,
      confirmLabel: "彻底删除",
      action: () => onDeleteForever(note.id),
    });
  };

  const askEmpty = () => {
    setConfirmation({
      title: "清空回收站？",
      body: `共 ${notes.length} 条便签将被永久删除，无法恢复。`,
      confirmLabel: "清空回收站",
      action: onEmptyTrash,
    });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
          <button
            type="button"
            aria-label="返回首页"
            onClick={onBack}
            className="grid size-9 cursor-pointer place-items-center rounded-xl text-ink/65 transition hover:bg-ink/5 hover:text-ink"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <div
            data-tauri-drag-region
            className="flex h-full min-w-0 flex-1 items-center justify-center"
          >
            <span className="pointer-events-none text-[13px] font-semibold tracking-tight text-ink/75">
              回收站
            </span>
          </div>
          <button
            type="button"
            onClick={askEmpty}
            disabled={notes.length === 0}
            className="cursor-pointer rounded-xl px-3 py-1.5 text-[12.5px] text-accent transition hover:bg-accent-soft/60 disabled:cursor-default disabled:text-muted/30 disabled:hover:bg-transparent"
          >
            清空
          </button>
          <WindowControls />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-6">
        {notes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-sticky text-ink/40">
              <ArrowLeftIcon className="size-5" />
            </div>
            <p className="mt-4 text-[15px] font-medium">回收站是空的</p>
            <p className="mt-1 text-[13px] text-muted">
              删除的便签会在这里保留 30 天。
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-5 cursor-pointer rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-ink/85"
            >
              返回首页
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((note) => {
              const trashedAt = note.trashedAt ?? Date.now();
              return (
                <li
                  key={note.id}
                  className="rounded-2xl border border-line bg-card/70 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[14px] font-medium text-ink/80">
                        {note.title.trim() || "未命名"}
                        {note.isLocked && (
                          <LockIcon className="size-3 shrink-0 text-ink/30" />
                        )}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[12.5px] text-muted">
                        {previewOf(note) || "（空内容）"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted/70">
                        删除于 {formatDateTime(trashedAt)} ·{" "}
                        {daysUntilPurge(trashedAt)} 天后彻底删除
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onRestore(note.id)}
                        className="cursor-pointer rounded-lg px-2 py-1 text-[12px] text-ink/70 transition hover:bg-paper hover:text-ink"
                      >
                        恢复
                      </button>
                      <button
                        type="button"
                        onClick={() => askDelete(note)}
                        className="cursor-pointer rounded-lg px-2 py-1 text-[12px] text-accent transition hover:bg-accent-soft/60"
                      >
                        彻底删除
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          body={confirmation.body}
          confirmLabel={confirmation.confirmLabel}
          onConfirm={() => {
            const action = confirmation.action;
            setConfirmation(null);
            action();
          }}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </div>
  );
}
