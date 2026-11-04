import { useEffect, useState } from "react";
import { getAppInfo, inTauri, type AppInfo } from "../lib/runtime";

type Status = "checking" | "ready" | "error" | "web";

const dotStyles: Record<Status, string> = {
  checking: "bg-accent animate-pulse",
  ready: "bg-leaf",
  error: "bg-accent",
  web: "bg-muted/50",
};

const statusText: Record<Status, string> = {
  checking: "检测中",
  ready: "Rust 已连接",
  error: "Rust 未连接",
  web: "Web 预览",
};

export default function StatusCard() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [status, setStatus] = useState<Status>(inTauri ? "checking" : "web");

  useEffect(() => {
    if (!inTauri) return;
    let alive = true;
    getAppInfo()
      .then((data) => {
        if (!alive) return;
        setInfo(data);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const rustValue =
    status === "ready"
      ? "已连接"
      : status === "error"
        ? "未连接"
        : status === "checking"
          ? "连接中…"
          : "预览模式";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-card p-6 shadow-[0_40px_80px_-56px_rgba(27,26,22,0.55)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium tracking-wide text-muted">
          运行状态
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className={`size-1.5 rounded-full ${dotStyles[status]}`} />
          {statusText[status]}
        </span>
      </div>

      <dl className="mt-5 space-y-3 text-[13px]">
        <Row label="运行时" value={inTauri ? "Tauri · WebView" : "浏览器 · Web"} />
        <Row label="Rust 核心" value={rustValue} />
        <Row label="数据存储" value="localStorage · 本机" />
        <Row label="版本" value={info?.version ?? "0.1.0"} />
      </dl>

      <div className="my-5 h-px bg-line/80" />

      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
        已就绪
      </p>
      <ul className="mt-3 space-y-2.5 text-[13px]">
        <ReadyItem>React 19 组件渲染</ReadyItem>
        <ReadyItem>Tailwind CSS v4 样式管线</ReadyItem>
        <ReadyItem muted={!inTauri}>
          Tauri IPC 通道{inTauri ? "" : "(桌面端可用)"}
        </ReadyItem>
      </ul>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {["React", "TypeScript", "Vite", "Tauri 2", "Tailwind 4"].map(
          (tag) => (
            <span
              key={tag}
              className="rounded-full border border-line bg-paper/70 px-2.5 py-1 text-[11px] text-muted"
            >
              {tag}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ReadyItem({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-2 ${muted ? "text-muted/70" : "text-ink"}`}
    >
      <svg
        viewBox="0 0 12 12"
        className={`size-3 shrink-0 ${muted ? "text-muted/50" : "text-leaf"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 6.4 4.6 9 10 3.4" />
      </svg>
      {children}
    </li>
  );
}
