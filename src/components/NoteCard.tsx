import type { PanelStyle } from "../lib/settings";
import type { NoteSummary } from "../types";

interface Props {
  note: NoteSummary;
  active: boolean;
  panelStyle: PanelStyle;
  onOpen: () => void;
}

export default function NoteCard({
  note,
  active,
  panelStyle,
  onOpen,
}: Props) {
  const title = note.title.trim() || "未命名";
  const content = note.summary.trim();
  const isWindow = panelStyle === "window";
  const animationClass = isWindow
    ? "note-flip"
    : `note-swap ${
        panelStyle === "drawer"
          ? "note-swap-horizontal"
          : "note-swap-vertical"
      }`;
  const frontClass = isWindow ? "note-flip-front" : "note-swap-front";
  const backClass = isWindow ? "note-flip-back" : "note-swap-back";
  const faceShape = isWindow
    ? "rounded-2xl border border-[var(--note-edge)]"
    : "";

  return (
    <li
      className={`note-stack relative isolate ${
        active ? "is-active" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="note-stack-layer absolute inset-0 rounded-2xl border border-[var(--note-edge)]"
      />
      <div className="note-stack-card relative z-10">
        <div
          className={`${animationClass} ${active ? "is-active" : ""}`}
        >
          <button
            type="button"
            onClick={onOpen}
            title={title}
            className={`${frontClass} ${faceShape} block w-full cursor-pointer bg-[var(--note-bg)] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50`}
          >
            <span className="line-clamp-2 block text-[15px] font-medium leading-6">
              {title}
            </span>
            <span className="mt-2 line-clamp-5 block min-h-[40px] whitespace-pre-line text-[13px] leading-6 text-ink/60">
              {content}
            </span>
          </button>

          <div
            aria-hidden="true"
            className={`${backClass} ${faceShape} pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden bg-[var(--note-window)] p-4`}
          >
            <span className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] text-ink/45">
              <span className="size-1.5 rounded-full bg-[var(--note-edge)]" />
              编辑中
            </span>
            <span className="line-clamp-3 text-[15px] font-medium leading-6">
              {title}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
