const pad = (value: number) => String(value).padStart(2, "0");

/** 界面展示格式：YY-MM-DD HH:mm（本地时区）。 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getFullYear()).slice(-2)}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const segmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("zh-CN", { granularity: "grapheme" })
    : null;

export function graphemes(value: string): string[] {
  if (!segmenter) return Array.from(value);
  return Array.from(segmenter.segment(value), (part) => part.segment);
}

export function graphemeLength(value: string): number {
  return graphemes(value).length;
}

export function cutGraphemes(value: string, max: number): string {
  const parts = graphemes(value);
  return parts.length <= max ? value : parts.slice(0, max).join("");
}

export function daysUntilPurge(trashedAt: number): number {
  const deadline = trashedAt + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
}
