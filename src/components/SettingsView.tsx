import { inTauri } from "../lib/runtime";
import {
  PAGE_SIZE_OPTIONS,
  PANEL_STYLE_OPTIONS,
  type PanelStyle,
  type Settings,
} from "../lib/settings";
import { ArrowLeftIcon } from "./icons";
import WindowControls from "./WindowControls";

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onToast: (message: string) => void;
  onBack: () => void;
}

export default function SettingsView({
  settings,
  onChange,
  onToast,
  onBack,
}: Props) {
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

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 border-b border-line/70 bg-paper">
        <div
          className={
            inTauri
              ? "flex h-14 w-full items-center gap-1"
              : "mx-auto flex h-14 max-w-5xl items-center gap-1 px-4"
          }
        >
          <button
            type="button"
            aria-label="返回首页"
            onClick={onBack}
            className="grid size-9 cursor-pointer place-items-center rounded-xl text-ink/65 transition hover:bg-ink/5 hover:text-ink"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <div
            data-tauri-drag-region
            className="flex h-full min-w-0 flex-1 items-center justify-center"
          >
            <span className="pointer-events-none text-[13px] font-semibold tracking-tight text-ink/75">
              设置
            </span>
          </div>
          <WindowControls />
        </div>
      </header>

      <main className="app-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-8">
          <div className="mb-6">
            <h1 className="text-[22px] font-semibold tracking-tight">设置</h1>
            <p className="mt-1 text-[12.5px] text-muted">
              调整便签的显示方式。所有更改会立即生效并保存在本机。
            </p>
          </div>

          <div className="flex flex-col gap-3">
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
                            ? "border-ink bg-ink text-paper"
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
                          ? "border-ink bg-ink text-paper"
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

            <section className="rounded-2xl border border-line bg-card/65 p-5">
              <h2 className="text-[14px] font-medium">关于</h2>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-medium">Maybe Todo</p>
                  <p className="mt-1 text-[11.5px] text-muted">
                    本地优先的便签与待办
                  </p>
                </div>
                <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">
                  v0.1.0
                </span>
              </div>
            </section>
          </div>
        </div>
      </main>
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
