export type NoteTheme = "yellow" | "blue" | "green" | "cyan";

export interface NoteThemeColors {
  /** 应用根背景。 */
  appBackground: string;
  /** 便签卡片、详情内容区的底色。 */
  background: string;
  /** 便签边框。 */
  edge: string;
  /** 详情窗口外壳，比 background 更浅。 */
  window: string;
  /** 主题深色，用于选中项等深色面。 */
  dark: string;
}

export interface NoteThemeDefinition {
  value: NoteTheme;
  label: string;
  hint: string;
  colors: NoteThemeColors;
}

/**
 * 便签主题唯一配置入口。
 * 调整颜色后，首页卡片、悬停纸片、详情窗口和设置页色块会一起变化。
 */
export const NOTE_THEMES: Record<NoteTheme, NoteThemeDefinition> = {  yellow: {
    value: "yellow",
    label: "黄色",
    hint: "阳光慵懒倚靠在窗沿的某个午后",
    colors: {
      appBackground: "#f6f2e9",
      background: "#f8e7a6",
      edge: "#e6cd80",
      window: "#fdf3c7",
      dark: "#dab16a",
    },
  },
  blue: {
    value: "blue",
    label: "蓝色",
    hint: "浪花是天空泛起的涟漪",
    colors: {
      appBackground: "#edf2f6",
      background: "#d7e8f2",
      edge: "#a8c8da",
      window: "#edf7fc",
      dark: "#3598da",
    },
  },
  green: {
    value: "green",
    label: "绿色",
    hint: "藏于万千世界的一叶",
    colors: {
      appBackground: "#eef4ec",
      background: "#dcebd2",
      edge: "#a9c99e",
      window: "#f2f9ee",
      dark: "#4f9166",
    },
  },
  cyan: {
    value: "cyan",
    label: "青色",
    hint: "万紫千红中一抹宁静的色彩",
    colors: {
      appBackground: "#eaf2f3",
      background: "#d4eaec",
      edge: "#9cc7cc",
      window: "#f0f9fa",
      dark: "#3196a3",
    },
  },
};

export const NOTE_THEME_OPTIONS = Object.values(NOTE_THEMES);

export interface DarkModeColors {
  appBackground: string;
  card: string;
  line: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  leaf: string;
  noteBackground: string;
  noteEdge: string;
  noteWindow: string;
  themeDark: string;
  overlay: string;
}

/** 暗色模式独立配色，不读取便签主题。 */
export const DARK_MODE_COLORS: DarkModeColors = {
  appBackground: "#151412",
  card: "#201e1a",
  line: "#3a352d",
  ink: "#eee8dc",
  muted: "#a49b8b",
  accent: "#d08a52",
  accentSoft: "#3b2b1e",
  leaf: "#83a88a",
  noteBackground: "#2a2621",
  noteEdge: "#4a4339",
  noteWindow: "#332f28",
  themeDark: "#d0ac74",
  overlay: "rgb(0 0 0 / 0.62)",
};

export function isNoteTheme(value: unknown): value is NoteTheme {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(NOTE_THEMES, value)
  );
}
