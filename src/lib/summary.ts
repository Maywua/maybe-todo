import type { NoteContent, NoteType } from "../types";

const SUMMARY_LINES = 5;
const SUMMARY_LIMIT = 600;

/** 和 Rust 端 summarize() 保持一致：笔记前 5 行，待办前 5 条。 */
export function summarizeContent(
  type: NoteType,
  content: NoteContent,
): string {
  const lines: string[] = [];

  if (type === "todo") {
    for (const item of (content.items ?? []).slice(0, SUMMARY_LINES)) {
      const text = item.text.trim();
      if (!text) continue;
      lines.push(`${item.done ? "✓" : "·"} ${text}`);
    }
  } else {
    for (const line of (content.text ?? "").split(/\r?\n/).slice(0, SUMMARY_LINES)) {
      lines.push(line.trimEnd());
    }
  }

  const joined = lines.join("\n");
  return joined.length > SUMMARY_LIMIT
    ? `${joined.slice(0, SUMMARY_LIMIT)}…`
    : joined;
}
