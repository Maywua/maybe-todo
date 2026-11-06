export type PanelStyle = "card" | "drawer" | "window";

export interface Settings {
  pageSize: number;
  panelStyle: PanelStyle;
}

export const PAGE_SIZE_OPTIONS = [20, 40, 60] as const;

export const PANEL_STYLE_OPTIONS: ReadonlyArray<{
  value: PanelStyle;
  label: string;
  hint: string;
}> = [
  { value: "card", label: "卡片", hint: "底部弹出" },
  { value: "drawer", label: "抽屉", hint: "右侧滑出" },
  { value: "window", label: "窗口", hint: "居中淡入" },
];

export const DEFAULT_SETTINGS: Settings = {
  pageSize: 20,
  panelStyle: "card",
};

const STORAGE_KEY = "maybe-todo.settings.v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    const value = parsed as { pageSize?: unknown; panelStyle?: unknown };
    const pageSize =
      typeof value.pageSize === "number" &&
      PAGE_SIZE_OPTIONS.includes(
        value.pageSize as (typeof PAGE_SIZE_OPTIONS)[number],
      )
        ? value.pageSize
        : DEFAULT_SETTINGS.pageSize;
    const panelStyle = PANEL_STYLE_OPTIONS.some(
      (option) => option.value === value.panelStyle,
    )
      ? (value.panelStyle as PanelStyle)
      : DEFAULT_SETTINGS.panelStyle;
    return { pageSize, panelStyle };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 设置写入失败不应影响主流程。
  }
}
