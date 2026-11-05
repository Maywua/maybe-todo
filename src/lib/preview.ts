import type { Note } from "../types";

export function previewOf(note: Note): string {
  if (note.type === "text") {
    const text = (note.content.text ?? "").trim();
    return text.split("\n")[0]?.trim() ?? "";
  }
  const items = note.content.items ?? [];
  if (items.length === 0) return "";
  const undone = items.filter((item) => !item.done);
  if (undone.length === 0) return "已完成";
  return undone
    .slice(0, 2)
    .map((item) => `· ${item.text}`)
    .join("  ");
}

/** 卡片内容：展示多行正文 / 子项，由内容长度决定卡片高度。 */
export function contentOf(note: Note): string {
  if (note.type === "text") {
    return (note.content.text ?? "").trim();
  }
  const items = note.content.items ?? [];
  return items
    .map((item) => `${item.done ? "✓" : "·"} ${item.text}`)
    .join("\n");
}

export function progressOf(note: Note): string | null {
  if (note.type !== "todo") return null;
  const items = note.content.items ?? [];
  if (items.length === 0) return null;
  const done = items.filter((item) => item.done).length;
  return done === items.length ? "已完成" : `${done}/${items.length}`;
}
