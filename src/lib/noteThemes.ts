export type NoteTheme = "yellow" | "blue";

export interface NoteThemeColors {
  /** 应用根背景。 */
  appBackground: string;
  /** 便签卡片、详情内容区的底色。 */
  background: string;
  /** 便签边框。 */
  edge: string;
  /** 详情窗口外壳，比 background 更浅。 */
  window: string;
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
export const NOTE_THEMES: Record<NoteTheme, NoteThemeDefinition> = {
  yellow: {
    value: "yellow",
    label: "黄色",
    hint: "暖色便签",
    colors: {
      appBackground: "#f6f2e9",
      background: "#f8e7a6",
      edge: "#e6cd80",
      window: "#fdf3c7",
    },
  },
  blue: {
    value: "blue",
    label: "蓝色",
    hint: "雾蓝便签",
    colors: {
      appBackground: "#edf2f6",
      background: "#d7e8f2",
      edge: "#a8c8da",
      window: "#edf7fc",
    },
  },
};

export const NOTE_THEME_OPTIONS = Object.values(NOTE_THEMES);

export function isNoteTheme(value: unknown): value is NoteTheme {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(NOTE_THEMES, value)
  );
}
