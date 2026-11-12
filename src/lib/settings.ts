import { isNoteTheme, type NoteTheme } from "./noteThemes";

export type PanelStyle = "card" | "drawer" | "window";
export type ColorMode = "light" | "dark";
export type BackgroundStyle = "none" | "paper" | "ruled" | "grid";

export interface Settings {
  pageSize: number;
  panelStyle: PanelStyle;
  noteTheme: NoteTheme;
  colorMode: ColorMode;
  backgroundStyle: BackgroundStyle;
}

export const PAGE_SIZE_OPTIONS = [20, 40, 60] as const;

export const PANEL_STYLE_OPTIONS: ReadonlyArray<{
  value: PanelStyle;
  label: string;
  hint: string;
}> = [
  { value: "card", label: "卡片", hint: "底部弹出" },
  { value: "drawer", label: "抽屉", hint: "右侧滑出" },
  { value: "window", label: "窗口", hint: "居中翻页" },
];

export const BACKGROUND_OPTIONS: ReadonlyArray<{
  value: BackgroundStyle;
  label: string;
  hint: string;
}> = [
  { value: "none", label: "无", hint: "纯色的幻想" },
  { value: "paper", label: "纸孔", hint: "装订的回忆" },
  { value: "ruled", label: "横条纹", hint: "手写的从前" },
  { value: "grid", label: "方格纸", hint: "整齐的课业" },
];

export const DEFAULT_SETTINGS: Settings = {
  pageSize: 20,
  panelStyle: "card",
  noteTheme: "yellow",
  colorMode: "light",
  backgroundStyle: "paper",
};

const STORAGE_KEY = "maybe-todo.settings.v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    const value = parsed as {
      pageSize?: unknown;
      panelStyle?: unknown;
      noteTheme?: unknown;
      colorMode?: unknown;
      backgroundStyle?: unknown;
    };
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
    const noteTheme = isNoteTheme(value.noteTheme)
      ? value.noteTheme
      : DEFAULT_SETTINGS.noteTheme;
    const colorMode: ColorMode =
      value.colorMode === "dark" ? "dark" : "light";
    const backgroundStyle = BACKGROUND_OPTIONS.some(
      (option) => option.value === value.backgroundStyle,
    )
      ? (value.backgroundStyle as BackgroundStyle)
      : DEFAULT_SETTINGS.backgroundStyle;
    return {
      pageSize,
      panelStyle,
      noteTheme,
      colorMode,
      backgroundStyle,
    };
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
