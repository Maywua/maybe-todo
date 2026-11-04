const features = [
  {
    title: "本地优先",
    body: "数据先落在本机,断网也能写。同步是以后的事。",
    icon: (
      <path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v6H3z" />
    ),
  },
  {
    title: "键盘友好",
    body: "⌘K 聚焦,↵ 记录;桌面端之后会加全局唤起。",
    icon: <path d="M2 6h8M2 10h5M8 3l2 3-2 3" />,
  },
  {
    title: "三端同构",
    body: "一份 React 代码,Web、Tauri 桌面、Capacitor 移动。",
    icon: (
      <path d="M3 4h10v7H3zM5 14h6M8 11v3" />
    ),
  },
];

export default function FeatureGrid() {
  return (
    <section className="grid gap-3 pb-4 sm:grid-cols-3">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="rounded-2xl border border-line/80 bg-card/60 p-5 transition hover:border-line hover:bg-card"
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
