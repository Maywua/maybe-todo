import { inTauri } from "../lib/runtime";
import WindowControls from "./WindowControls";

interface Props {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export default function SortHeader({ saving, onCancel, onSave }: Props) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-line/70 bg-[var(--app-bg)]">
      <div
        className={
          inTauri
            ? "flex h-14 w-full items-center gap-1"
            : "mx-auto flex h-14 max-w-5xl items-center gap-1 px-4"
        }
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="cursor-pointer rounded-xl px-3 py-1.5 text-[12.5px] text-muted transition hover:bg-ink/5 hover:text-ink disabled:cursor-default disabled:text-muted/30 disabled:hover:bg-transparent"
        >
          取消
        </button>
        <div
          data-tauri-drag-region
          className="flex h-full min-w-0 flex-1 items-center justify-center"
        >
          <span className="pointer-events-none text-[13px] font-semibold tracking-tight text-ink/75">
            排序模式
          </span>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="cursor-pointer rounded-xl px-3 py-1.5 text-[12.5px] font-medium text-accent transition hover:bg-accent-soft/60 disabled:cursor-default disabled:text-muted/30 disabled:hover:bg-transparent"
        >
          {saving ? "保存中…" : "保存"}
        </button>
        <WindowControls />
      </div>
    </header>
  );
}
