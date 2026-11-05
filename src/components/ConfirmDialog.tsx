import { useEffect } from "react";

interface Props {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  body,
  confirmLabel = "确认删除",
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="animate-pop w-full max-w-[360px] rounded-2xl border border-line bg-card p-5 shadow-[0_30px_70px_-30px_rgba(27,26,22,0.6)]"
      >
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-6 text-muted">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="cursor-pointer rounded-xl px-3.5 py-2 text-[13px] text-muted transition hover:bg-paper hover:text-ink"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-xl bg-accent px-3.5 py-2 text-[13px] font-medium text-paper transition hover:bg-accent/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
