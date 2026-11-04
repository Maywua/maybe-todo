import { useEffect, useRef, useState } from "react";
import FeatureGrid from "./components/FeatureGrid";
import Logo from "./components/Logo";
import StatusCard from "./components/StatusCard";
import { useNotes } from "./hooks/useNotes";
import { inTauri } from "./lib/runtime";

export default function App() {
  const { notes, add, toggle, remove } = useNotes();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    add(text);
    setDraft("");
  };

  const openCount = notes.filter((note) => !note.done).length;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="bg-dots absolute inset-x-0 top-0 h-[560px]" />
        <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-accent/[0.07] blur-3xl" />
        <div className="absolute -right-32 top-24 size-[420px] rounded-full bg-leaf/[0.06] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 lg:px-10">
        <header className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight">
                Maybe Todo
              </p>
              <p className="text-[11px] text-muted">v0.1.0 · 预览</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line bg-card/70 px-3 py-1.5 text-[12px] text-muted backdrop-blur">
            <span
              className={`size-1.5 rounded-full ${inTauri ? "bg-leaf" : "bg-accent"}`}
            />
            {inTauri ? "Tauri 桌面端" : "浏览器预览"}
          </div>
        </header>

        <main className="grid flex-1 items-start gap-12 py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16 lg:py-14">
          <section className="animate-rise">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
              <span className="h-px w-6 bg-line" />
              本地优先 · 无账号 · 打开就写
            </p>

            <h1 className="mt-6 text-[clamp(2.75rem,6vw,4.25rem)] font-semibold leading-[1.03] tracking-[-0.045em]">
              先记下来,
              <br />
              <span className="text-muted">再决定。</span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-7 text-muted">
              Maybe Todo 是一个很轻的便签与待办工具。想到什么先扔进来,
              做完的勾掉,不确定的就先留着——反正它不会催你。
            </p>

            <form
              onSubmit={submit}
              className="mt-8 flex items-center gap-2 rounded-2xl border border-line bg-card p-2 pl-4 shadow-[0_18px_40px_-28px_rgba(27,26,22,0.45)] transition focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10"
            >
              <svg
                viewBox="0 0 16 16"
                className="size-4 shrink-0 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11.5 2.5 13.5 4.5 6 12H4v-2z" />
              </svg>
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                placeholder="现在脑子里有什么?"
                aria-label="记一条"
                className="min-w-0 flex-1 bg-transparent py-2 text-[14px] outline-none placeholder:text-muted/60"
              />
              <kbd className="mr-1 hidden rounded-md border border-line bg-paper px-1.5 py-0.5 text-[10px] text-muted sm:block">
                ↵
              </kbd>
              <button
                type="submit"
                className="rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-ink/85 active:scale-[0.98]"
              >
                记下
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-[12px] text-muted">
              <span>{openCount > 0 ? `${openCount} 件待定` : "都处理完了"}</span>
              <span>{notes.length} 条记录</span>
            </div>

            {notes.length === 0 ? (
              <p className="mt-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">
                还没有一条记录 —— 在上面写点什么试试。
              </p>
            ) : (
              <ul className="mt-1 max-h-[268px] space-y-0.5 overflow-y-auto pr-1">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-card/80"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(note.id)}
                      aria-label={note.done ? "标记为未完成" : "标记为完成"}
                      className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[6px] border transition ${
                        note.done
                          ? "border-leaf bg-leaf text-paper"
                          : "border-line bg-card text-transparent hover:border-leaf/60"
                      }`}
                    >
                      <svg
                        viewBox="0 0 12 12"
                        className="size-2.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2.2 6.4 4.8 9 9.8 3.4" />
                      </svg>
                    </button>

                    <span
                      className={`min-w-0 flex-1 pt-px text-[14px] leading-6 ${
                        note.done
                          ? "text-muted line-through decoration-line"
                          : ""
                      }`}
                    >
                      {note.text}
                    </span>

                    <button
                      type="button"
                      onClick={() => remove(note.id)}
                      aria-label="删除这条"
                      className="mt-1 shrink-0 text-muted/50 opacity-0 transition hover:text-accent group-hover:opacity-100"
                    >
                      <svg
                        viewBox="0 0 12 12"
                        className="size-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      >
                        <path d="M3 3l6 6M9 3 3 9" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="animate-rise [animation-delay:120ms] lg:pt-4">
            <StatusCard />
          </aside>
        </main>

        <FeatureGrid />

        <footer className="flex flex-col gap-1.5 border-t border-line/80 py-6 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>React 19 · TypeScript · Vite · Tauri 2 · Tailwind CSS 4</p>
          <p>下一步:接入 SQLite 持久化与多端同步 →</p>
        </footer>
      </div>
    </div>
  );
}
