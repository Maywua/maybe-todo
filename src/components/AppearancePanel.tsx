import { NOTE_THEME_OPTIONS, type NoteTheme } from "../lib/noteThemes";
import {
  BACKGROUND_OPTIONS,
  PANEL_STYLE_OPTIONS,
  type BackgroundStyle,
  type PanelStyle,
  type Settings,
} from "../lib/settings";

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onToast: (message: string) => void;
}

export default function AppearancePanel({
  settings,
  onChange,
  onToast,
}: Props) {
  const isDark = settings.colorMode === "dark";

  const toggleColorMode = () => {
    const colorMode = isDark ? "light" : "dark";
    onChange({ ...settings, colorMode });
    onToast(colorMode === "dark" ? "已切换到暗色模式" : "已切换到亮色模式");
  };

  const choosePanelStyle = (panelStyle: PanelStyle) => {
    if (panelStyle === settings.panelStyle) return;
    onChange({ ...settings, panelStyle });
    const label = PANEL_STYLE_OPTIONS.find(
      (option) => option.value === panelStyle,
    )?.label;
    onToast(`便签打开方式已切换为${label ?? panelStyle}`);
  };

  const chooseBackground = (backgroundStyle: BackgroundStyle) => {
    if (backgroundStyle === settings.backgroundStyle) return;
    onChange({ ...settings, backgroundStyle });
    const label = BACKGROUND_OPTIONS.find(
      (option) => option.value === backgroundStyle,
    )?.label;
    onToast(`首页背景已切换为${label ?? backgroundStyle}`);
  };

  const chooseNoteTheme = (noteTheme: NoteTheme) => {
    if (isDark || noteTheme === settings.noteTheme) return;
    onChange({ ...settings, noteTheme });
    const label = NOTE_THEME_OPTIONS.find(
      (option) => option.value === noteTheme,
    )?.label;
    onToast(`便签配色已切换为${label ?? noteTheme}`);
  };

  return (
    <div className="px-5 py-5">
      <p className="mb-5 text-[12.5px] leading-5 text-muted">
        调整明暗模式、便签打开方式、首页背景和配色。
      </p>

      <div className="flex flex-col gap-3">
        <section className="rounded-2xl border border-line bg-card/65 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[14px] font-medium">暗色模式</h2>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                使用固定的深色主题。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="暗色模式"
              onClick={toggleColorMode}
              className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${isDark ? "bg-(--theme-dark)" : "bg-line"
                }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-paper shadow-sm transition ${isDark ? "left-[22px]" : "left-0.5"
                  }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card/65 p-5">
          <h2 className="text-[14px] font-medium">打开方式</h2>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            设置窗口打开的位置及打开、关闭动画。
          </p>
          <div
            role="radiogroup"
            aria-label="打开便签方式"
            className="mt-4 grid gap-2 sm:grid-cols-3"
          >
            {PANEL_STYLE_OPTIONS.map((option) => {
              const active = option.value === settings.panelStyle;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choosePanelStyle(option.value)}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition ${active
                      ? "bg-(--theme-dark) text-paper"
                      : "border-line bg-paper text-ink/75 hover:text-ink"
                    }`}
                >
                  <span className="block text-[12.5px] font-medium">
                    {option.label}
                  </span>
                  <span
                    className={`mt-1 block text-[11px] ${active ? "text-paper/60" : "text-muted"
                      }`}
                  >
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card/65 p-5">
          <h2 className="text-[14px] font-medium">主题配色</h2>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            {isDark
              ? "暗色模式下无法切换主题。"
              : "切换系统所使用的主题配色。"}
          </p>
          <div
            role="radiogroup"
            aria-label="便签配色"
            className="mt-4 grid gap-2 sm:grid-cols-2"
          >
            {NOTE_THEME_OPTIONS.map((option) => {
              const selected = option.value === settings.noteTheme;
              const active = selected && !isDark;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={isDark}
                  disabled={isDark}
                  title={isDark ? "暗色模式下不可切换主题" : undefined}
                  onClick={() => chooseNoteTheme(option.value)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${isDark
                      ? "cursor-default border-line bg-paper text-ink/40 opacity-50"
                      : active
                        ? "cursor-pointer bg-(--theme-dark) text-paper"
                        : "cursor-pointer border-line bg-paper text-ink/75 hover:text-ink"
                    }`}
                >
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-lg border p-1"
                    style={{
                      backgroundColor: option.colors.background,
                      borderColor: option.colors.edge,
                    }}
                  >
                    <span
                      className="block size-full rounded-[4px]"
                      style={{ backgroundColor: option.colors.window }}
                    />
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-medium">
                      {option.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-[11px] ${active ? "text-paper/60" : "text-muted"
                        }`}
                    >
                      {option.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card/65 p-5">
          <h2 className="text-[14px] font-medium">背景</h2>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            首页的底纹装饰。
          </p>
          <div
            role="radiogroup"
            aria-label="首页背景"
            className="mt-4 grid gap-2 sm:grid-cols-2"
          >
            {BACKGROUND_OPTIONS.map((option) => {
              const active = option.value === settings.backgroundStyle;
              const previewStyle =
                option.value === "paper"
                  ? {
                    backgroundImage:
                      "radial-gradient(circle at 18% 18%, var(--backdrop-glow), transparent 58%), radial-gradient(circle, var(--backdrop-dot) 1px, transparent 1.4px)",
                    backgroundSize: "auto, 8px 8px",
                  }
                  : option.value === "ruled"
                    ? {
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, transparent 0, transparent 6px, var(--backdrop-line) 6px, var(--backdrop-line) 7px)",
                    }
                    : option.value === "grid"
                      ? {
                        backgroundImage:
                          "linear-gradient(to right, var(--backdrop-line) 1px, transparent 1px), linear-gradient(to bottom, var(--backdrop-line) 1px, transparent 1px)",
                        backgroundSize: "8px 8px",
                      }
                      : undefined;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseBackground(option.value)}
                  className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-2.5 text-left transition ${active
                      ? "bg-(--theme-dark) text-paper"
                      : "border-line bg-paper text-ink/75 hover:text-ink"
                    }`}
                >
                  <span
                    aria-hidden="true"
                    className="relative block h-14 w-full overflow-hidden rounded-lg border border-line/60 bg-paper"
                    style={previewStyle}
                  />
                  <span className="flex items-center justify-between gap-2 px-0.5">
                    <span className="text-[12.5px] font-medium">
                      {option.label}
                    </span>
                    <span
                      className={`text-[11px] ${active ? "text-paper/60" : "text-muted"
                        }`}
                    >
                      {option.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
