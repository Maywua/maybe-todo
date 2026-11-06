import type { DragEvent as ReactDragEvent } from "react";
import type { NoteSummary } from "../types";
import { GripIcon } from "./icons";

interface Props {
  note: NoteSummary;
  sorting: boolean;
  dragging: boolean;
  dropEdge: "before" | "after" | null;
  onOpen: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string, edge: "before" | "after") => void;
  onDrop: () => void;
}

export default function NoteCard({
  note,
  sorting,
  dragging,
  dropEdge,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: Props) {
  const title = note.title.trim() || "未命名";
  const content = note.summary.trim();

  const handleDragStart = (event: ReactDragEvent<HTMLButtonElement>) => {
    if (!sorting) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", note.id);
    try {
      event.dataTransfer.setDragImage(event.currentTarget, 24, 24);
    } catch {
      // 某些浏览器/测试环境下没有真实拖拽会话，忽略拖拽预览即可。
    }
    onDragStart(note.id);
  };

  const handleDragOver = (event: ReactDragEvent<HTMLButtonElement>) => {
    if (!sorting) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const edge = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    onDragOver(note.id, edge);
  };

  return (
    <li className="relative">
      {dropEdge && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 right-0 z-10 h-[3px] rounded-full bg-accent ${
            dropEdge === "before" ? "-top-1.5" : "-bottom-1.5"
          }`}
        />
      )}
      <button
        type="button"
        draggable={sorting}
        onClick={() => {
          if (!sorting) onOpen();
        }}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDrop={(event) => {
          if (!sorting) return;
          event.preventDefault();
          onDrop();
        }}
        title={title}
        className={`group relative block w-full rounded-2xl border border-sticky-edge bg-sticky p-4 text-left shadow-[0_1px_2px_rgba(27,26,22,0.06)] transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          sorting
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-18px_rgba(27,26,22,0.45)]"
        } ${dragging ? "opacity-40" : ""}`}
      >
        {sorting && (
          <span className="pointer-events-none absolute right-2.5 top-2.5 text-ink/30">
            <GripIcon className="size-4" />
          </span>
        )}
        <span
          className={`line-clamp-2 block text-[15px] font-medium leading-6 ${
            sorting ? "pr-5" : ""
          }`}
        >
          {title}
        </span>
        <span className="mt-2 line-clamp-5 block min-h-[40px] whitespace-pre-line text-[13px] leading-6 text-ink/60">
          {content}
        </span>
      </button>
    </li>
  );
}
