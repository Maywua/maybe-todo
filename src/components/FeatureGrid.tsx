const features = [
  {
    title: "本地优先",
    body: "数据先落在本机,断网也能写。同步是以后的事。",
    icon: (
      <>
        <path d="M2.5 3.5h11v3h-11z" />
        <path d="M2.5 8.5h11v3h-11z" />
        <path d="M4.8 5h.01M4.8 10h.01" />
      </>
    ),
  },
  {
    title: "键盘友好",
    body: "⌘K 聚焦,↵ 记录;桌面端之后会加全局唤起。",
    icon: (
      <>
        <rect x="2" y="5" width="12" height="7" rx="1.6" />
        <path d="M4.6 7.6h.01M7 7.6h.01M9.4 7.6h.01M11.8 7.6h.01M5 10.4h6" />
      </>
    ),
  },
  {
    title: "三端同构",
    body: "一份 React 代码,Web、Tauri 桌面、Capacitor 移动。",
    icon: (
      <>
        <path d="M8 2.5 14 5.5 8 8.5 2 5.5z" />
        <path d="M2 8.5l6 3 6-3" />
        <path d="M2 11.3l6 3 6-3" />
      </>
    ),
  },
];

export default function FeatureGrid() {
  return (
    <section className="grid gap-3 pb-4 sm:grid-cols-3">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="rounded-2xl border border-line/80 bg-card/60 p-4 transition hover:border-line hover:bg-card"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-paper text-accent">
            <svg
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {feature.icon}
            </svg>
          </span>
          <h3 className="mt-3 text-[14px] font-medium tracking-tight">
            {feature.title}
          </h3>
          <p className="mt-1 text-[12.5px] leading-6 text-muted">
            {feature.body}
          </p>
        </article>
      ))}
    </section>
  );
}
