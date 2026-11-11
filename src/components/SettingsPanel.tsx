import { NOTE_THEME_OPTIONS, type NoteTheme } from "../lib/noteThemes";
import { inTauri } from "../lib/runtime";
import {
  PAGE_SIZE_OPTIONS,
  PANEL_STYLE_OPTIONS,
  type PanelStyle,
  type Settings,
} from "../lib/settings";

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onToast: (message: string) => void;
}

export default function SettingsPanel({
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

  const choosePageSize = (pageSize: number) => {
    if (pageSize === settings.pageSize) return;
    onChange({ ...settings, pageSize });
    onToast(`每页便签数已设为 ${pageSize} 条`);
  };

  const choosePanelStyle = (panelStyle: PanelStyle) => {
    if (panelStyle === settings.panelStyle) return;
    onChange({ ...settings, panelStyle });
    const label = PANEL_STYLE_OPTIONS.find(
      (option) => option.value === panelStyle,
    )?.label;
    onToast(`便签打开方式已切换为${label ?? panelStyle}`);
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
      <div className="flex flex-col gap-3">
        <section className="rounded-2xl border border-line bg-card/65 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[14px] font-medium">暗色模式</h2>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                使用固定的深色背景；便签主题仅在亮色模式下生效。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="暗色模式"
              onClick={toggleColorMode}
              className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${
                isDark ? "bg-(--theme-dark)" : "bg-line"
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-paper shadow-sm transition ${
                  isDark ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card/65 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[14px] font-medium">每页便签数</h2>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                决定首页和回收站每次加载的数量，滚动到底部会继续加载。
              </p>
            </div>
            <div
              role="radiogroup"
              aria-label="每页便签数"
              className="flex shrink-0 gap-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((size) => {
                const active = size === settings.pageSize;
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => choosePageSize(size)}
                    className={`cursor-pointer rounded-xl border px-3 py-1.5 text-[12.5px] transition ${
                      active
                        ? "bg-(--theme-dark) text-paper"
                        : "border-line bg-paper text-ink/70 hover:border-accent/40 hover:text-ink"
                    }`}
                  >
                    {size} 条
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card/65 p-5">
          <h2 className="text-[14px] font-medium">打开便签方式</h2>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            选择便签详情出现的位置和打开、关闭动画。
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
                  className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                    active
                      ? "bg-(--theme-dark) text-paper"
                      : "border-line bg-paper text-ink/75 hover:border-accent/40 hover:text-ink"
                  }`}
                >
                  <span className="block text-[12.5px] font-medium">
                    {option.label}
                  </span>
                  <span
                    className={`mt-1 block text-[11px] ${
                      active ? "text-paper/60" : "text-muted"
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
          <h2 className="text-[14px] font-medium">便签配色</h2>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            {isDark
              ? "暗色模式下固定使用深色便签，切回亮色模式后才能切换主题。"
              : "首页便签和便签详情窗口会一起切换配色。"}
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
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    isDark
                      ? "cursor-default border-line bg-paper text-ink/40 opacity-50"
                      : active
                        ? "cursor-pointer bg-(--theme-dark) text-paper"
                        : "cursor-pointer border-line bg-paper text-ink/75 hover:border-accent/40 hover:text-ink"
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
                      className={`mt-0.5 block text-[11px] ${
                        active ? "text-paper/60" : "text-muted"
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
          <h2 className="text-[14px] font-medium">数据</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Row
              label="存储方式"
              value={inTauri ? "本地数据库" : "浏览器本地存储"}
            />
            <Row label="回收站保留" value="30 天" />
            <Row label="网络同步" value="未开启" />
          </div>
          <p className="mt-4 border-t border-line/70 pt-3 text-[11.5px] leading-5 text-muted">
            便签、待办和设置都只保存在本机，不会上传到服务器。
          </p>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12.5px] text-ink/70">{label}</span>
      <span className="text-[12.5px] text-muted">{value}</span>
    </div>
  );
}
